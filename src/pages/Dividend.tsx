import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ADDRS, ABI } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { num } from "../lib/format";
import { Num } from "../components/Num";

const fsC = new Contract(ADDRS.feeSplit, ABI.feeSplit as unknown as string[], readProvider);

export function Dividend() {
  const { t, account, signer, toast } = useApp();
  const [pending, setPending] = useState<bigint>(0n);
  const [tapex, setTapex] = useState<bigint>(0n);
  const [perDay, setPerDay] = useState<bigint>(0n);
  const [pool, setPool] = useState<bigint>(0n);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [p, st, pd, dep] = await Promise.all([
      account ? fsC.pending(account) as Promise<bigint> : Promise.resolve(0n),
      fsC.stakeToken() as Promise<string>,
      fsC.rewardPerDay() as Promise<bigint>,
      fsC.totalDeposited() as Promise<bigint>,
    ]);
    setPending(p); setPerDay(pd); setPool(dep);
    if (account && st) {
      const erc = new Contract(st, ABI.tape as unknown as string[], readProvider);
      setTapex(await erc.balanceOf(account) as bigint);
    }
  };
  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)); }, [account]);

  const claim = async () => {
    if (!signer) return toast(t("err.noWallet"), "err");
    setBusy(true);
    try {
      const c = new Contract(ADDRS.feeSplit, ABI.feeSplit as unknown as string[], signer);
      await (await c.claim()).wait();
      toast("领取成功", "ok");
      await load();
    } catch (e) { toast((e as Error).message.slice(0, 90), "err"); }
    finally { setBusy(false); }
  };

  return (
    <div className="card">
      <span className="kicker">TAPEX · DIVIDEND</span>
      <h2 style={{ marginTop: 14 }}>持 TAPEX 分 TAPE</h2>
      <p className="sub">持有 TAPEX 自动累积分红：分红池每天恒定释放，按持仓占比分配，随时可领取。</p>

      <div className="tiles" style={{ marginTop: 18 }}>
        <div className="tile"><span>TAPEX 持仓</span><b>{loading ? "—" : <Num value={Number(formatEther(tapex))} format={(n) => num(n, 2)} />}</b></div>
        <div className="tile"><span>可领分红</span><b>{loading ? "—" : <Num value={Number(formatEther(pending))} format={(n) => num(n, 4)} />} <em>TAPE</em></b></div>
        <div className="tile"><span>每日释放</span><b>{num(Number(formatEther(perDay)), 0)} <em>TAPE</em></b></div>
        <div className="tile"><span>池累计注入</span><b>{num(Number(formatEther(pool)), 0)} <em>TAPE</em></b></div>
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 16, maxWidth: 320 }}
        disabled={busy || pending === 0n} onClick={claim}>
        {busy ? "…" : pending === 0n ? "暂无可领分红" : `领取 ${num(Number(formatEther(pending)), 4)} TAPE`}
      </button>

      {account && tapex === 0n && (
        <p className="hint" style={{ marginTop: 12 }}>
          你现在没有 TAPEX，所以分不到 TAPE —— 需要先持有 TAPEX 才能参与分红。
        </p>
      )}
    </div>
  );
}
