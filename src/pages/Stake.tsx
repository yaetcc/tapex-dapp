import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ADDRS, ABI, gradeOf } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { num } from "../lib/format";
import { RigArt } from "../components/RigArt";
import { DetailSheet, type Detail } from "../components/DetailSheet";
import { trackTx } from "../lib/tx";

const circC = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], readProvider);
const mineC = new Contract(ADDRS.mining, ABI.mining as unknown as string[], readProvider);

type PC = { id: number; hash: number; grade: number; staked: boolean };

export function Stake() {
  const { t, account, signer, toast } = useApp();
  const [pcs, setPcs] = useState<PC[]>([]);
  const [earned, setEarned] = useState<bigint>(0n);
  const [busy, setBusy] = useState<number | 0>(0);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [detail, setDetail] = useState<Detail>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!account) { setPcs([]); setEarned(0n); setLoading(false); return; }
    setLoading(true);
    try {
      const [ids, staked] = await Promise.all([
        circC.pcsOfOwner(account) as Promise<bigint[]>,
        mineC.stakedPCsOf(account) as Promise<bigint[]>,
      ]);
      const stakedSet = new Set(staked.map(Number));
      const infos = await Promise.all(ids.map((i) => circC.getCircuitInfo(i) as Promise<{ hashRate: bigint; grade: bigint }>));
      setPcs(ids.map((i, k) => ({
        id: Number(i), hash: Number(infos[k].hashRate), grade: Number(infos[k].grade), staked: stakedSet.has(Number(i)),
      })));
      const e = (await mineC.userEarned(account)) as bigint;
      setEarned(e);
    } finally { setLoading(false); }
  }, [account]);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const stakedList = useMemo(() => pcs.filter((p) => p.staked), [pcs]);
  const totalHash = useMemo(() => pcs.reduce((a, p) => a + (p.staked ? p.hash : 0), 0), [pcs]);

  const batchAct = async (kind: "stake" | "unstake" | "claim") => {
    if (!signer || !account) return toast(t("err.noWallet"), "err");
    const ids = [...sel];
    if (!ids.length) return toast("先勾选矿机", "err");
    setBusy(-1);
    try {
      const c = new Contract(ADDRS.mining, ABI.mining as unknown as string[], signer);
      const label = kind === "claim" ? "批量领取" : kind === "stake" ? "批量质押" : "批量解押";
      await trackTx(`${label} ${ids.length} 台`, async () => {
        const tx = kind === "claim" ? await c.claim(ids)
          : kind === "stake" ? await c.batchStake(ids) : await c.batchUnstake(ids);
        await tx.wait();
      });
      toast(`批量${kind === "claim" ? "领取" : kind === "stake" ? "质押" : "解押"} ${ids.length} 台完成`, "ok");
      setSel(new Set());
      await load();
    } catch (e) { toast((e as Error).message.slice(0, 90), "err"); }
    finally { setBusy(0); }
  };

  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const act = async (kind: "stake" | "unstake" | "claim", id?: number) => {
    if (!signer || !account) return toast(t("err.noWallet"), "err");
    setBusy(id ?? -1);
    try {
      const c = new Contract(ADDRS.mining, ABI.mining as unknown as string[], signer);
      await trackTx(kind === "claim" ? "领取" : kind === "stake" ? `质押 PC #${id}` : `解押 PC #${id}`, async () => {
        const tx = kind === "claim"
          ? await c.claim(stakedList.map((p) => p.id))
          : kind === "stake" ? await c.stake(id) : await c.unstake(id);
        await tx.wait();
      });
      toast(kind === "claim" ? "领取成功" : kind === "stake" ? "质押成功" : "已解押", "ok");
      await load();
    } catch (e) {
      toast((e as Error).message.slice(0, 90), "err");
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
        <div className="tile"><span>待领取</span><b>{num(Number(formatEther(earned)), 4)} <em>TAPE</em></b></div>
      </div>

      <div className="sec-head">
        <b>我的矿机</b>
        <span>实时链上状态</span>
        <span className="spacer" />
        <div className="batch-bar">
          <label className="chk">
            <input type="checkbox" checked={sel.size > 0 && sel.size === pcs.length}
              onChange={(e) => setSel(e.target.checked ? new Set(pcs.map((p) => p.id)) : new Set())} />
            全选
          </label>
          <span className="sel-count">{sel.size} 台</span>
          <button className="btn btn-ghost" disabled={busy !== 0 || !sel.size} onClick={() => batchAct("stake")}>批量质押</button>
          <button className="btn btn-ghost" disabled={busy !== 0 || !sel.size} onClick={() => batchAct("unstake")}>批量解押</button>
          <button className="btn btn-ghost" disabled={busy !== 0 || !sel.size || earned === 0n} onClick={() => batchAct("claim")}>批量领取</button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : !account ? (
        <div className="empty">连接钱包后查看矿机</div>
      ) : pcs.length === 0 ? (
        <div className="empty">你还没有矿机 —— 去「铸造」抽部件，再到「组装」做一台</div>
      ) : (
        <div className="farm">
          {pcs.map((p) => (
            <div key={p.id} className={`farm-cell${p.staked ? " on" : ""}`}
              onClick={() => setDetail({ kind: "pc", id: p.id })} style={{ cursor: "pointer" }}>
              <RigArt hash={p.hash} mining={p.staked} grade={p.grade} size={200} />
              <label className="farm-check" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
              </label>
              <div className="farm-meta">
                <b>PC #{p.id}</b>
                <span className={`grade g${p.grade}`}>{gradeOf(p.hash)}</span>
                <span>{p.hash} H</span>
              </div>
              <div className="farm-actions">
                <button className={`btn ${p.staked ? "btn-ghost" : "btn-primary"}`} disabled={busy !== 0}
                  onClick={(e) => { e.stopPropagation(); act(p.staked ? "unstake" : "stake", p.id); }}>
                  {busy === p.id ? "…" : p.staked ? "解押" : "质押挖矿"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <DetailSheet detail={detail} onClose={() => setDetail(null)} onChanged={load} />
    </div>
  );
}
