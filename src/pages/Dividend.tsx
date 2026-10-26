import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ADDRS, ABI } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { num } from "../lib/format";
import { Num } from "../components/Num";
import { TAPEX } from "../lib/links";

const fsC = new Contract(ADDRS.feeSplit, ABI.feeSplit as unknown as string[], readProvider);
const tapeC = new Contract(ADDRS.tape, ABI.tape as unknown as string[], readProvider);

export function Dividend() {
  const { t, account, signer, toast } = useApp();
  const [pending, setPending] = useState<bigint>(0n);
  const [tapex, setTapex] = useState<bigint>(0n);
  const [perDay, setPerDay] = useState<bigint>(0n);
  const [pool, setPool] = useState<bigint>(0n);
  const [balance, setBalance] = useState<bigint>(0n);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const [p, st, pd, dep, poolBal] = await Promise.all([
      account ? fsC.pending(account) as Promise<bigint> : Promise.resolve(0n),
      fsC.stakeToken() as Promise<string>,
      fsC.rewardPerDay() as Promise<bigint>,
      fsC.totalDeposited() as Promise<bigint>,
      tapeC.balanceOf(ADDRS.feeSplit) as Promise<bigint>,
    ]);
    setPending(p); setPerDay(pd); setPool(dep); setBalance(poolBal);
    if (account && st) {
      const erc = new Contract(st, ABI.tape as unknown as string[], readProvider);
      setTapex(await erc.balanceOf(account) as bigint);
    }
  };
  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)); }, [account]);

  const claimable = Number(formatEther(pending));
  const daysLeft = perDay > 0n ? Math.floor(Number(balance) / Number(perDay)) : 0;
  const runOut = daysLeft > 0 && daysLeft < 7;

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
    <>
      <div className="card">
        <span className="kicker">TAPEX · DIVIDEND</span>

        <div className="dv-hero">
          <div className="dv-main">
            <h2>可领分红</h2>
            <div className="dv-amount">
              {loading ? "—" : <Num value={claimable} format={(n) => num(n, 4)} />}
              <em>TAPE</em>
            </div>
            <p className="hint">持有 TAPEX 即按持仓占比自动累积，随时可领，不领不消失。</p>
            <button className="btn btn-primary dv-cta" disabled={busy || pending === 0n} onClick={claim}>
              {busy ? "等待钱包确认…" : pending === 0n ? "暂无可领分红" : `领取 ${num(claimable, 4)} TAPE`}
            </button>
          </div>

          <div className="dv-side">
            <div className="dv-row"><span>TAPEX 持仓</span><b>{loading ? "—" : <Num value={Number(formatEther(tapex))} format={(n) => num(n, 2)} />}</b></div>
            <div className="dv-row"><span>每日释放</span><b>{loading ? "—" : num(Number(formatEther(perDay)), 0)} <em>TAPE</em></b></div>
            <div className="dv-row"><span>池累计注入</span><b>{loading ? "—" : num(Number(formatEther(pool)), 0)}</b></div>
            <div className="dv-row"><span>分红池余额</span><b className={runOut ? "warn" : ""}>{loading ? "—" : num(Number(formatEther(balance)), 0)}</b></div>

            <div className="dv-runway">
              <div className="dv-runway-top">
                <span>还能发 {daysLeft > 0 ? `≈ ${daysLeft} 天` : "—"}</span>
                {runOut && <em>余额偏低</em>}
              </div>
              <div className="dv-bar"><i style={{ width: `${Math.min(100, (daysLeft / 60) * 100)}%` }} className={runOut ? "warn" : ""} /></div>
            </div>
          </div>
        </div>

        <div className="tapex-card">
          <div className="tapex-left">
            <div className="tapex-sym">
              <span className="tapex-badge">TAPEX</span>
              <span className="hint">{tapex === 0n ? "还没有 TAPEX，买入即可开始分红" : "持有中，分红持续累积"}</span>
            </div>
            <code className="tapex-addr">{TAPEX.address}</code>
            <div className="tapex-acts">
              <button className="btn btn-ghost" onClick={async () => {
                try { await navigator.clipboard.writeText(TAPEX.address); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
              }}>{copied ? "已复制" : "复制合约"}</button>
              <a className="btn btn-ghost" href={TAPEX.explorer} target="_blank" rel="noreferrer">浏览器</a>
            </div>
          </div>

          <div className="tapex-right">
            <div className="tapex-buy">
              <a className="btn btn-primary" href={TAPEX.ignix} target="_blank" rel="noreferrer">IGNIX 购买 / K 线</a>
              <a className="btn btn-ghost" href={TAPEX.okx} target="_blank" rel="noreferrer">OKX 行情购买</a>
            </div>
            <ol className="tapex-steps">
              <li>钱包切到 <b>X Layer</b>，备好 OKB 作 gas</li>
              <li>在 IGNIX 粘贴合约 <b>{TAPEX.address.slice(0, 6)}…{TAPEX.address.slice(-4)}</b></li>
              <li>买完回本页，持仓与分红自动更新</li>
            </ol>
            <p className="hint">IGNIX / OKX 均禁止被嵌入，图表与交易需在新窗口打开。</p>
          </div>
        </div>
      </div>
    </>
  );
}
