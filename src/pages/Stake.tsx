import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ADDRS, ABI, gradeOf } from "../lib/contracts";
import { GradeBadge, GRADE_COLOR } from "../components/GradeBadge";
import { readProvider } from "../lib/wallet";
import { loadCache, putCache } from "../lib/pcCache";
import { ScanLink } from "../components/ScanLink";
import { getNames, setName } from "../lib/names";
import { logAction } from "../lib/history";
import { FloatGain } from "../components/FloatGain";
import { useApp } from "../state/App";
import { num } from "../lib/format";
import { RigArt } from "../components/RigArt";
import { RigSlots } from "../components/RigSlots";
import { DetailSheet, type Detail } from "../components/DetailSheet";
import { trackTx } from "../lib/tx";

const circC = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], readProvider);
const mineC = new Contract(ADDRS.mining, ABI.mining as unknown as string[], readProvider);
const mkC = new Contract(ADDRS.market, ABI.market as unknown as string[], readProvider);

type PC = { id: number; hash: number; grade: number; staked: boolean; listed: boolean; ready?: boolean };

export function Stake() {
  const { t, account, signer, toast } = useApp();
  const [pcs, setPcs] = useState<PC[]>([]);
  const [earned, setEarned] = useState<bigint>(0n);
  const [busy, setBusy] = useState<number | 0>(0);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [detail, setDetail] = useState<Detail>(null);
  const [maxBatch, setMaxBatch] = useState(10);
  const [net, setNet] = useState<{ shares: number; perDay: number }>({ shares: 0, perDay: 0 });
  const [names, setNamesState] = useState<Record<string, string>>(getNames());
  const [gain, setGain] = useState<string | null>(null);
  const touchRef = useRef<{ id: number; x: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "staked" | "idle" | "listed">("all");
  const [sort, setSort] = useState<"hash" | "id">("hash");
  const [shown, setShown] = useState(8);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!account) { setPcs([]); setEarned(0n); setLoading(false); return; }
    setLoading(true);
    try {
      const [ids, staked, orders] = await Promise.all([
        circC.pcsOfOwner(account) as Promise<bigint[]>,
        mineC.stakedPCsOf(account) as Promise<bigint[]>,
        mkC.activePCOrders().catch(() => []) as Promise<{ tokenId: bigint; active: boolean }[]>,
      ]);
      const stakedSet = new Set(staked.map(Number));
      const listedSet = new Set(orders.filter((o) => o.active).map((o) => Number(o.tokenId)));
      const cache = loadCache();
      const build = () => ids.map((x) => {
        const id = Number(x);
        const meta = cache[String(id)];
        return {
          id, hash: meta?.hash ?? 0, grade: meta?.grade ?? 3,
          staked: stakedSet.has(id), listed: listedSet.has(id), ready: Boolean(meta),
        };
      });
      setPcs(build());                                  // 先把卡片铺出来，数据陆续填充
      setLoading(false);
      const need = ids.map(Number).filter((id) => !cache[String(id)]);
      for (let i = 0; i < need.length; i += 8) {
        const chunk = need.slice(i, i + 8);
        const infos = await Promise.all(chunk.map((x) => circC.getCircuitInfo(x) as Promise<{ hashRate: bigint; grade: bigint }>));
        chunk.forEach((x, k) => {
          cache[String(x)] = { hash: Number(infos[k].hashRate), grade: Number(infos[k].grade) };
          putCache(x, cache[String(x)]);
        });
        setPcs(build());                                // 每批到达即刷新
      }
      const e = (await mineC.userEarned(account)) as bigint;
      setEarned(e);
    } finally { setLoading(false); }
  }, [account]);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);
  useEffect(() => { (mineC.maxBatch() as Promise<bigint>).then((v) => setMaxBatch(Number(v))).catch(() => {}); }, []);
  useEffect(() => {
    Promise.all([mineC.totalShares(), mineC.rewardPerDay()])
      .then(([sh, pd]) => setNet({ shares: Number(sh), perDay: Number(formatEther(pd as bigint)) }))
      .catch(() => {});
  }, []);

  const stakedList = useMemo(() => pcs.filter((p) => p.staked), [pcs]);
  const counts = useMemo(() => ({
    all: pcs.length,
    idle: pcs.filter((p) => !p.staked && !p.listed).length,
    staked: pcs.filter((p) => p.staked).length,
    listed: pcs.filter((p) => p.listed).length,
  }), [pcs]);

  const visible = useMemo(
    () => pcs
      .filter((p) => (filter === "all" ? true : filter === "staked" ? p.staked : filter === "listed" ? p.listed : !p.staked && !p.listed))
      .sort((a, b) => (sort === "hash" ? b.hash - a.hash : a.id - b.id)),
    [pcs, filter, sort]
  );
  const allSelected = visible.length > 0 && visible.every((p) => sel.has(p.id));
  const hiddenSelected = [...sel].filter((id) => !visible.some((p) => p.id === id)).length;
  const txCount = Math.max(1, Math.ceil(sel.size / Math.max(1, maxBatch)));
  const dailyOf = (hash: number) => (net.shares > 0 ? (hash / net.shares) * net.perDay : 0);
  const totalHash = useMemo(() => pcs.reduce((a, p) => a + (p.staked ? p.hash : 0), 0), [pcs]);

  const batchAct = async (kind: "stake" | "unstake" | "claim") => {
    if (!signer || !account) return toast(t("err.noWallet"), "err");
    const ids = [...sel];
    if (!ids.length) return toast("先勾选矿机", "err");
    setBusy(-1);
    try {
      const c = new Contract(ADDRS.mining, ABI.mining as unknown as string[], signer);
      const label = kind === "claim" ? "批量领取" : kind === "stake" ? "批量质押" : "批量解押";
      // 质押/解押受 maxBatch 限制；claim 没有限制，一笔发完（超 80 台才分批）
      const size = kind === "claim" ? (ids.length > 80 ? 80 : ids.length) : Math.max(1, maxBatch);
      for (let i = 0; i < ids.length; i += size) {
        const chunk = ids.slice(i, i + size);
        const round = ids.length > size ? ` ${i + 1}-${i + chunk.length}/${ids.length}` : ` ${ids.length}`;
        await trackTx(`${label}${round}`, async () => {
          const tx = kind === "claim" ? await c.claim(chunk)
            : kind === "stake" ? await c.batchStake(chunk) : await c.batchUnstake(chunk);
          await tx.wait();
        });
      }
      toast(`批量${kind === "claim" ? "领取" : kind === "stake" ? "质押" : "解押"} ${ids.length} 台完成`, "ok");
      setSel(new Set());
      await load();
    } catch (e) { toast((e as Error).message.slice(0, 90), "err"); }
    finally { setBusy(0); }
  };

  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const claimAll = async () => {
    if (!signer || !account) return toast(t("err.noWallet"), "err");
    const ids = stakedList.map((p) => p.id);
    if (!ids.length) return toast("没有质押中的矿机", "err");
    if (earned === 0n) return toast("暂无可领收益", "err");
    setBusy(-1);
    try {
      const c = new Contract(ADDRS.mining, ABI.mining as unknown as string[], signer);
      // claim(ids) 没有长度限制，一笔领完；超过 80 台才分批，避免单笔 gas 过高
      const size = ids.length > 80 ? 80 : ids.length;
      for (let i = 0; i < ids.length; i += size) {
        const chunk = ids.slice(i, i + size);
        const round = ids.length > size ? ` ${i + 1}-${i + chunk.length}/${ids.length}` : "";
        await trackTx(`领取挖矿收益${round}`, async () => {
          const tx = await c.claim(chunk);
          await tx.wait();
        });
      }
      toast(`已领取 ${num(Number(formatEther(earned)), 4)} TAPE`, "ok");
      setGain(`${num(Number(formatEther(earned)), 4)} TAPE`);
      ids.slice(0, 3).forEach((id) => logAction(id, "领取收益"));
      await load();
    } catch (e) { toast((e as Error).message.slice(0, 90), "err"); }
    finally { setBusy(0); }
  };

  const act = async (kind: "stake" | "unstake" | "claim", id?: number) => {
    if (!signer || !account) return toast(t("err.noWallet"), "err");
    setBusy(id ?? -1);
    const snapshot = pcs;
    if (kind !== "claim" && id) {
      const next = kind === "stake";
      setPcs((prev) => prev.map((x) => (x.id === id ? { ...x, staked: next } : x)));  // 乐观更新
    }
    try {
      const c = new Contract(ADDRS.mining, ABI.mining as unknown as string[], signer);
      await trackTx(kind === "claim" ? "领取" : kind === "stake" ? `质押 PC #${id}` : `解押 PC #${id}`, async () => {
        const tx = kind === "claim"
          ? await c.claim(stakedList.map((p) => p.id))
          : kind === "stake" ? await c.stake(id) : await c.unstake(id);
        await tx.wait();
      });
      toast(kind === "claim" ? "领取成功" : kind === "stake" ? "质押成功" : "已解押", "ok");
      if (kind === "claim") setGain(`${num(Number(formatEther(earned)), 4)} TAPE`);
      if (id) logAction(id, kind === "claim" ? "领取收益" : kind === "stake" ? "质押" : "解押");
      await load();
    } catch (e) {
      toast((e as Error).message.slice(0, 90), "err");
      setPcs(snapshot);                        // 失败回滚
    } finally { setBusy(0); }
  };

  return (
    <div className="card">
      <span className="kicker">STEP 03 · STAKE</span>
      <h2 style={{ marginTop: 14 }}>质押 PC NFT 挖矿</h2>
      <p className="sub">质押整机按算力份额累计 TAPE；NFT 始终留在钱包，链上只标记质押状态，可随时解押。</p>

      <div className="tiles" style={{ marginTop: 18 }}>
        <div className="tile"><span>总矿机</span><b>{pcs.length}</b></div>
        <div className="tile"><span>质押中</span><b>{stakedList.length}</b></div>
        <div className="tile"><span>总算力</span><b>{num(totalHash, 0)} <em>H</em></b></div>
        <div className="tile tile-claim">
          <span>待领取</span>
          <b>{loading ? "—" : num(Number(formatEther(earned)), 4)} <em>TAPE</em></b>
          <button className="tile-claim-btn" disabled={busy !== 0 || earned === 0n || stakedList.length === 0} onClick={claimAll}>
            {busy === -1 ? "领取中" : earned === 0n ? "无可领" : "领取"}
          </button>
          <i className="tile-claim-hint">
            {stakedList.length} 台 · 1 笔 <ScanLink path={`address/${ADDRS.mining}`} title="挖矿合约" />
          </i>
        </div>
      </div>


      <div className="sec-head">
        <b>我的矿机</b>
        <span>实时链上状态</span>
        <span className="spacer" />
        <div className="batch-bar">
          <div className="pc-filters">
            {([["all", "全部"], ["idle", "待机"], ["staked", "质押中"], ["listed", "挂单中"]] as const).map(([k, label]) => (
              <button key={k} className={`pc-chip${filter === k ? " on" : ""}`} onClick={() => { setFilter(k); setShown(8); }}>
                {label}<i>{counts[k]}</i>
              </button>
            ))}
            <button className="pc-chip" onClick={() => setSort(sort === "hash" ? "id" : "hash")}>
              {sort === "hash" ? "算力↓" : "编号↑"}
            </button>
          </div>
          <label className="chk">
            <input type="checkbox" checked={allSelected} onChange={(e) => {
              if (e.target.checked) { setSel((prev) => new Set([...prev, ...visible.map((p) => p.id)])); setShown(999); }
              else setSel((prev) => { const n = new Set(prev); visible.forEach((p) => n.delete(p.id)); return n; });
            }} />
            全选{visible.length !== counts.all ? "当前筛选" : ""}（{visible.length}）
          </label>
          {sel.size > 0 && <button className="chk-btn" onClick={() => setSel(new Set())}>清空</button>}
          <span className="sel-count">
            已选 {sel.size} 台{hiddenSelected > 0 ? `（另有 ${hiddenSelected} 台已选未显示）` : ""}
          </span>
          <button className="btn btn-ghost" disabled={busy !== 0 || !sel.size} onClick={() => batchAct("stake")}>批量质押{sel.size ? ` ${sel.size}` : ""}{txCount > 1 ? `（${txCount} 笔）` : ""}</button>
          <button className="btn btn-ghost" disabled={busy !== 0 || !sel.size} onClick={() => batchAct("unstake")}>批量解押{sel.size ? ` ${sel.size}` : ""}</button>
          <button className="btn btn-ghost" disabled={busy !== 0 || !sel.size || earned === 0n} onClick={() => batchAct("claim")}>批量领取{sel.size ? ` ${sel.size}` : ""}</button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : !account ? (
        <div className="empty">连接钱包后查看矿机</div>
      ) : pcs.length === 0 ? (
        <div className="empty-empty">
          <div className="empty-rig"><RigSlots tiers={[0,0,0,0,0,0,0,0]} counts={[]} size={200} /></div>
          <p>你还没有矿机 —— 先抽部件，再组装一台</p>
          <div className="row-links" style={{ justifyContent: "center" }}>
            <button className="btn btn-ghost" onClick={() => (location.hash = "mint")}>去铸造</button>
            <button className="btn btn-ghost" onClick={() => (location.hash = "asm")}>去组装</button>
          </div>
        </div>
      ) : (
        <div className="farm">
          {visible.slice(0, shown).map((p) => (
            <div key={p.id} className={`farm-cell${p.staked ? " on" : ""}`} data-g={gradeOf(p.hash).toLowerCase()}
              onTouchStart={(e) => { touchRef.current = { id: p.id, x: e.touches[0].clientX }; }}
              onTouchEnd={(e) => {
                const t = touchRef.current;
                if (!t || t.id !== p.id) return;
                const dx = e.changedTouches[0].clientX - t.x;
                touchRef.current = null;
                if (Math.abs(dx) < 70 || busy !== 0 || p.listed) return;
                if (dx > 0 && !p.staked) act("stake", p.id);
                if (dx < 0 && p.staked) act("unstake", p.id);
              }}
              onClick={() => setDetail({ kind: "pc", id: p.id })}
              style={{ cursor: "pointer", ["--gc" as string]: GRADE_COLOR[gradeOf(p.hash)] }}>
              <RigArt hash={p.hash} mining={p.staked} grade={p.grade} size={200} />
              <label className="farm-check" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
              </label>
              <div className="farm-meta">
                <b
                  title="点击重命名"
                  style={{ cursor: "text" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = window.prompt("给这台矿机起个名字（留空清除）", names[String(p.id)] ?? "");
                    if (next !== null) { setName(p.id, next); setNamesState(getNames()); }
                  }}
                >{names[String(p.id)] || `PC #${p.id}`}</b>
                <GradeBadge hash={p.hash} />
                <span>{p.hash} H</span>
                {p.staked && <span className="pc-daily">+{num(dailyOf(p.hash), 2)}/天</span>}
                {p.listed && <span className="pc-listed">挂单中</span>}
              </div>
              <div className="farm-actions">
                {p.listed ? (
                  <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); setDetail({ kind: "pc", id: p.id }); }}>
                    挂单中 · 去撤单
                  </button>
                ) : (
                  <button className={`btn ${p.staked ? "btn-ghost" : "btn-primary"}`} disabled={busy !== 0}
                    onClick={(e) => { e.stopPropagation(); act(p.staked ? "unstake" : "stake", p.id); }}>
                    {busy === p.id ? "…" : p.staked ? "解押" : "质押挖矿"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {visible.length > shown && (
            <div className="farm-more">
              <button className="btn btn-ghost" onClick={() => setShown((v) => v + 16)}>
                显示更多（还有 {visible.length - shown} 台）
              </button>
            </div>
          )}
        </div>
      )}
      {gain && <FloatGain text={gain} onDone={() => setGain(null)} />}
      <DetailSheet detail={detail} onClose={() => setDetail(null)} onChanged={load} />
    </div>
  );
}
