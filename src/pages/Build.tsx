import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ADDRS, ABI, PART_NAMES, TIERS } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { num } from "../lib/format";
import { RigSlots } from "../components/RigSlots";
import { GradeBadge } from "../components/GradeBadge";
import { RigArt } from "../components/RigArt";
import { PartIcon } from "../components/PartIcon";
import { logAction } from "../lib/history";
import { trackTx } from "../lib/tx";

const partC = new Contract(ADDRS.part, ABI.part as unknown as string[], readProvider);
const circC = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], readProvider);
const tapeC = new Contract(ADDRS.tape, ABI.tape as unknown as string[], readProvider);

const TIER_COLOR = ["#7FE0D6", "#00E5A0", "#FFD54D"];
const GRADE = (h: number) => (h >= 240 ? "S" : h >= 160 ? "A" : h >= 80 ? "B" : "C");

export function Build() {
  const { t, account, signer, toast } = useApp();
  const [counts, setCounts] = useState<number[]>([]);
  const [tiers, setTiers] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [fee, setFee] = useState<bigint>(0n);
  const [base, setBase] = useState<number[]>([]);
  const [mult, setMult] = useState<number[]>([1, 3, 8]);
  const [n, setN] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ k: "ok" | "err" | "info"; s: string } | null>(null);
  const [bal, setBal] = useState<bigint>(0n);
  const [oneByOne, setOneByOne] = useState(false);   // 逐台发送：钱包预览能算准
  const [fly, setFly] = useState<{ type: number; tier: number; x: number; y: number; key: number } | null>(null);
  const [born, setBorn] = useState<{ id: number; hash: number } | null>(null);
  const rigRef = useRef<HTMLDivElement>(null);

  const loadCounts = useCallback(async () => {
    if (!account) return setCounts([]);
    const ids = Array.from({ length: 24 }, (_, i) => i + 1);
    const res = (await partC.balanceOfBatch(ids.map(() => account), ids)) as bigint[];
    setCounts(res.map(Number));
  }, [account]);

  useEffect(() => {
    circC.assembleFee().then((v: bigint) => setFee(v)).catch(() => {});
    Promise.all(Array.from({ length: 8 }, (_, i) => circC.baseHash(i) as Promise<bigint>))
      .then((arr) => setBase(arr.map(Number))).catch(() => {});
    Promise.all(Array.from({ length: 3 }, (_, i) => circC.tierMult(i) as Promise<bigint>))
      .then((arr) => setMult(arr.map(Number))).catch(() => {});
  }, []);
  useEffect(() => { loadCounts().catch(() => {}); }, [loadCounts]);
  useEffect(() => {
    if (!account) return setBal(0n);
    (tapeC.balanceOf(account) as Promise<bigint>).then(setBal).catch(() => {});
  }, [account]);

  const stock = (i: number, tr: number) => counts[i + tr * 8] || 0;
  const can = useMemo(() => {
    let m = Infinity;
    for (let i = 0; i < 8; i++) m = Math.min(m, stock(i, tiers[i]));
    return m === Infinity ? 0 : m;
  }, [counts, tiers]);
  const hash = useMemo(() => {
    if (base.length !== 8) return 0;
    return base.reduce((a, b, i) => a + b * (mult[tiers[i]] ?? 1), 0);
  }, [base, mult, tiers]);

  const missing = useMemo(
    () => PART_NAMES.filter((_, i) => stock(i, tiers[i]) < 1),
    [counts, tiers]
  );
  const units = Math.min(n, Math.max(can, 1));
  const totalCost = Number(formatEther(fee || 0n)) * Math.min(n, can);
  const needWei = fee * BigInt(Math.min(n, can));
  const shortTape = can > 0 && bal < needWei;
  const MAX_PER_TX = 10;

  const pick = (i: number, tr: number, ev?: React.MouseEvent) => {
    if (stock(i, tr) < 1) return;
    setTiers((s) => s.map((v, idx) => (idx === i ? tr : v)));
    if (ev) {
      const rect = rigRef.current?.getBoundingClientRect();
      const tx = rect ? rect.left + rect.width / 2 : ev.clientX;
      const ty = rect ? rect.top + rect.height / 2 : ev.clientY;
      setFly({ type: i, tier: tr, x: ev.clientX, y: ev.clientY, key: Date.now() });
      window.setTimeout(() => setFly(null), 620);
      void tx; void ty;
    }
  };

  const doAssemble = async (units: number) => {
    if (!signer || !account) return toast(t("err.noWallet"), "err");
    if (units < 1) return;
    setBusy(true); setMsg({ k: "info", s: "等待钱包确认…" });
    try {
      const circ = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], signer);
      const tape = new Contract(ADDRS.tape, ABI.tape as unknown as string[], signer);
      // 一次组装需要 fee × 台数；TAPE 不足直接拦下，避免钱包里才报错
      const need = fee * BigInt(units);
      const myBal = (await tape.balanceOf(account)) as bigint;
      if (myBal < need) {
        throw new Error(`TAPE 不足：需要 ${formatEther(need)}，当前 ${formatEther(myBal)}`);
      }
      const al = (await tape.allowance(account, ADDRS.circuit)) as bigint;
      if (al < need) {
        setMsg({ k: "info", s: `授权 ${formatEther(need)} TAPE…` });
        await (await tape.approve(ADDRS.circuit, need)).wait();   // 精确授权，不再 ×100
      }
      // 单笔上限 10 台，超过则分批（与抽卡一致）
      let left = units;
      const perTx = oneByOne ? 1 : MAX_PER_TX;
      while (left > 0) {
        const b = Math.min(left, perTx);
        setMsg({ k: "info", s: units > MAX_PER_TX ? `组装中… 剩余 ${left} 台` : "等待钱包确认…" });
        await trackTx(`组装 ${b} 台`, async () => {
          const tx = b === 1 ? await circ.assembleWithTiers(tiers) : await circ.batchAssembleWithTiers(b, tiers);
          await tx.wait();
        });
        left -= b;
      }
      setMsg({ k: "ok", s: `组装完成 ${units} 台` });
      toast(`组装完成 ${units} 台`, "ok");
      try {
        const circ2 = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], signer);
        const ids = (await circ2.pcsOfOwner(account)) as bigint[];
        const newest = Number(ids[ids.length - 1]);
        const info = await (circ2.getCircuitInfo(newest) as Promise<{ hashRate: bigint }>);
        setBorn({ id: newest, hash: Number(info.hashRate) });
        logAction(newest, "组装出厂");
      } catch {}
      await loadCounts();
    } catch (e) {
      setMsg({ k: "err", s: (e as Error).message.slice(0, 90) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <span className="kicker">STEP 02 · BUILD</span>
      <h2 style={{ marginTop: 14 }}>装配台：8 类部件 → 整机 PC NFT</h2>
      <p className="sub">
        每类选一个档位，消耗该档位 1 件 + {fee ? formatEther(fee) : "100"} TAPE 组装费；算力 = 8 类基础算力 × 档位倍率累加。
      </p>

      <div className="sec-head"><b>档位选择</b><span>点档位切换 · 库存为 0 不可选</span></div>

      <div className="tiles build-kpis">
            <div className="tile"><span>可组装</span><b>{can} <em>台</em></b></div>
            <div className="tile"><span>预计算力</span><b>{hash} <em>H</em></b></div>
            <div className="tile"><span>预估等级</span><b><GradeBadge hash={hash} size="md" /></b></div>
            <div className="tile"><span>组装费</span><b>{formatEther(fee || 0n)} <em>TAPE</em></b></div>
          </div>

      <div className="build-grid">

        <aside className="build-side">
          <div ref={rigRef} className="rig-wrap">
            <RigSlots tiers={tiers} counts={counts} size={260} />
            {fly && (
              <span key={fly.key} className="fly-part"
                style={{ left: fly.x, top: fly.y, ["--tx" as string]: `${(rigRef.current?.getBoundingClientRect().left ?? 0) + (rigRef.current?.getBoundingClientRect().width ?? 0) / 2 - fly.x}px`,
                  ["--ty" as string]: `${(rigRef.current?.getBoundingClientRect().top ?? 0) + (rigRef.current?.getBoundingClientRect().height ?? 0) / 2 - fly.y}px` }}>
                <PartIcon type={fly.type} tier={fly.tier} size={26} />
              </span>
            )}
          </div>

          <div className="build-qty">
            <span className="hint">组装台数</span>
            <div className="stepper">
              <button onClick={() => setN((v) => Math.max(1, v - 1))} disabled={n <= 1}>−</button>
              <b>{Math.min(n, Math.max(can, 1))}</b>
              <button onClick={() => setN((v) => Math.min(can || 1, v + 1))} disabled={n >= can}>+</button>
              <button className="max" onClick={() => setN(Math.max(can, 1))} disabled={can < 2}>MAX</button>
            </div>
          </div>
          <div className="build-cost">
            <span>合计 {can > 0 && <em>(${num(Number(formatEther(fee || 0n)), 2)} / 台{units > MAX_PER_TX ? " · 自动分批" : ""})</em>}</span>
            <b className={shortTape ? "warn" : ""}>{can > 0 ? `${num(totalCost, 2)} TAPE` : "—"}</b>
          </div>
          <div className="build-bal">
            <span>我的 TAPE</span><b className={shortTape ? "warn" : ""}>{num(Number(formatEther(bal)), 2)}</b>
          </div>
          <label className="build-mode">
            <input type="checkbox" checked={oneByOne} onChange={(e) => setOneByOne(e.target.checked)} />
            <span>逐台发送（每台一笔，钱包预览准确；gas 更高）</span>
          </label>
          <p className="build-note">
            钱包预览遇到批量调用可能只显示 1 台（实际扣 {num(Number(formatEther(fee || 0n)), 0)} × 台数），
            勾选逐台可避免误解。
          </p>
          <button className="btn btn-primary btn-block" disabled={busy || can < 1 || shortTape}
            onClick={() => doAssemble(units)}>
            {busy ? "等待钱包确认…" : can < 1 ? "部件不足" : shortTape ? "TAPE 不足" : `组装 ${units} 台`}
          </button>
        </aside>


        <div className="build-col">
          <div className="build-rows">
            {PART_NAMES.map((name, i) => (
              <div className="build-row" key={name}>
                <span className="build-name" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <PartIcon type={i} tier={tiers[i]} size={18} />{name}
                </span>
                <div className="build-chips">
                  {[0, 1, 2].map((tr) => {
                    const c = stock(i, tr);
                    const on = tiers[i] === tr;
                    return (
                      <button key={tr} disabled={c < 1}
                        className={`tier-chip${on ? " on" : ""}${c < 1 ? " empty" : ""}`}
                        style={on ? { borderColor: TIER_COLOR[tr], color: TIER_COLOR[tr] } : undefined}
                        onClick={(e) => pick(i, tr, e)}>
                        {tr === 0 ? TIERS[0] : tr === 1 ? "Pro" : TIERS[2]}
                        <i>{c}</i>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="build-foot">
        {missing.length > 0 && (
          <p className="build-missing">缺：{missing.join("、")}</p>
        )}

        {msg && <p className={`msg ${msg.k}`}>{msg.s}</p>}

        <p className="hint" style={{ marginTop: 10 }}>
          组装消耗所选档位每类 1 件；批量需一次签名（单笔上限 10 台）。
        </p>
      </div>
      {born && (
        <div className="born-mask" onClick={() => setBorn(null)}>
          <div className="born-card">
            <span className="born-badge">出厂</span>
            <div className="born-rig"><RigArt hash={born.hash} mining grade={born.hash >= 240 ? 6 : born.hash >= 160 ? 5 : born.hash >= 80 ? 4 : 3} size={180} /></div>
            <b>PC #{born.id}</b>
            <p>{born.hash} H · {GRADE(born.hash)} 级</p>
            <span className="born-hint">点击任意处关闭</span>
          </div>
        </div>
      )}
    </div>
  );
}
