import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ADDRS, ABI, PART_NAMES, TIERS } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { num } from "../lib/format";
import { RigSlots } from "../components/RigSlots";
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

  const pick = (i: number, tr: number) => {
    if (stock(i, tr) < 1) return;
    setTiers((s) => s.map((v, idx) => (idx === i ? tr : v)));
  };

  const doAssemble = async (units: number) => {
    if (!signer || !account) return toast(t("err.noWallet"), "err");
    if (units < 1) return;
    setBusy(true); setMsg({ k: "info", s: "等待钱包确认…" });
    try {
      const circ = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], signer);
      const tape = new Contract(ADDRS.tape, ABI.tape as unknown as string[], signer);
      const need = fee * BigInt(units);
      const al = (await tape.allowance(account, ADDRS.circuit)) as bigint;
      if (al < need) {
        setMsg({ k: "info", s: "首次需要授权 TAPE…" });
        await (await tape.approve(ADDRS.circuit, need * 100n)).wait();
      }
      await trackTx(`组装 ${units} 台`, async () => {
        const tx = units === 1
          ? await circ.assembleWithTiers(tiers)
          : await circ.batchAssembleWithTiers(units, tiers);
        await tx.wait();
      });
      setMsg({ k: "ok", s: `组装完成 ${units} 台` });
      toast(`组装完成 ${units} 台`, "ok");
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

      <div className="build-grid">
        <div>
          <div className="sec-head"><b>档位选择</b><span>点档位切换 · 库存为 0 不可选</span></div>
          <div className="build-rows">
            {PART_NAMES.map((name, i) => (
              <div className="build-row" key={name}>
                <span className="build-name">{name}</span>
                <div className="build-chips">
                  {[0, 1, 2].map((tr) => {
                    const c = stock(i, tr);
                    const on = tiers[i] === tr;
                    return (
                      <button key={tr} disabled={c < 1}
                        className={`tier-chip${on ? " on" : ""}${c < 1 ? " empty" : ""}`}
                        style={on ? { borderColor: TIER_COLOR[tr], color: TIER_COLOR[tr] } : undefined}
                        onClick={() => pick(i, tr)}>
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

        <aside className="build-side">
          <RigSlots tiers={tiers} counts={counts} size={280} />
          <div className="tiles" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="tile"><span>可组装</span><b>{can} <em>台</em></b></div>
            <div className="tile"><span>预计算力</span><b>{hash} <em>H</em></b></div>
            <div className="tile"><span>预估等级</span><b>{GRADE(hash)}</b></div>
            <div className="tile"><span>组装费</span><b>{formatEther(fee || 0n)} <em>TAPE</em></b></div>
          </div>

          <div className="build-actions">
            <div className="build-qty">
              <span className="hint">批量台数</span>
              <input className="field field-sm" style={{ width: 74 }} value={n}
                onChange={(e) => setN(Math.max(1, Math.min(can || 1, Number(e.target.value.replace(/\D/g, "")) || 1)))} />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy || can < 1} onClick={() => doAssemble(1)}>
              {busy ? "…" : "组装 1 台"}
            </button>
            <button className="btn btn-primary btn-block" disabled={busy || can < 1} onClick={() => doAssemble(Math.min(n, can))}>
              {busy ? "…" : `批量组装 ${Math.min(n, can)} 台`}
            </button>
          </div>
          {msg && <p className={`msg ${msg.k}`}>{msg.s}</p>}
          <p className="hint" style={{ marginTop: 10 }}>
            组装消耗所选档位每类 1 件；批量需一次签名（单笔上限 10 台）。
          </p>
        </aside>
      </div>
    </div>
  );
}
