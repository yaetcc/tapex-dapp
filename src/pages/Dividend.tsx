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
    const [p, st, pd, dep, bal] = await Promise.all([
      account ? fsC.pending(account) as Promise<bigint> : Promise.resolve(0n),
      fsC.stakeToken() as Promise<string>,
      fsC.rewardPerDay() as Promise<bigint>,
      fsC.totalDeposited() as Promise<bigint>,
      tapeC.balanceOf(ADDRS.feeSplit) as Promise<bigint>,
    ]);
    setPending(p); setPerDay(pd); setPool(dep); setBalance(bal);
    if (account && st) {
      const erc = new Contract(st, ABI.tape as unknown as string[], readProvider);
      setTapex(await erc.balanceOf(account) as bigint);
    }
  };
  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)); }, [account]);

  const claimable = Number(formatEther(pending));
  const daysLeft = perDay > 0n ? Math.floor(Number(balance) / Number(perDay)) : 0;
  const runOut = daysLeft > 0 && daysLeft < 7;
  // 有效供应 ≈ 21.16M（已排除流动性池与项目地址），用于估算"每天大概分到多少"
  const EFFECTIVE_SUPPLY = 21_160_000;
  const dailyEst = (Number(formatEther(tapex)) / EFFECTIVE_SUPPLY) * Number(formatEther(perDay));
  const rate = tapex > 0n ? "按持仓占比实时累积" : "持有 TAPEX 后开始累积";

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
        <h2 style={{ marginTop: 12 }}>分红</h2>

        <div className="dv-top">
          {/* 主面板：可领 + 领取 */}
          <section className="dv-claim">
            <div className="dv-claim-head">
              <span className="dv-coin" aria-hidden>TX</span>
              <div>
                <span className="dv-label">可领分红</span>
                <div className="dv-amount">
                  {loading ? "—" : <Num value={claimable} format={(n) => num(n, 4)} />}
                  <em>TAPE</em>
                </div>
              </div>
            </div>
            <div className="dv-est">
              <span>预计每天</span>
              <b>≈ {num(dailyEst, 4)} <em>TAPE</em></b>
            </div>
            <p className="hint">{rate}，随时可领，不领不清零。</p>
            {pending === 0n ? (
              <a className="btn btn-primary btn-block dv-cta" href={TAPEX.ignix} target="_blank" rel="noreferrer"
                style={{ textDecoration: "none" }}>去购买 TAPEX 开始分红</a>
            ) : (
              <button className="btn btn-primary btn-block dv-cta" disabled={busy} onClick={claim}>
                {busy ? "等待钱包确认…" : `领取 ${num(claimable, 4)} TAPE`}
              </button>
            )}
          </section>

          {/* 指标面板 */}
          <section className="dv-stats">
            <div className="dv-tile"><span>TAPEX 持仓</span><b>{loading ? "—" : <Num value={Number(formatEther(tapex))} format={(n) => num(n, 2)} />}</b></div>
            <div className="dv-tile"><span>每日释放</span><b>{loading ? "—" : num(Number(formatEther(perDay)), 0)} <em>TAPE</em></b></div>
            <div className="dv-tile"><span>池累计注入</span><b>{loading ? "—" : num(Number(formatEther(pool)), 0)}</b></div>
            <div className="dv-tile"><span>分红池余额</span><b className={runOut ? "warn" : ""}>{loading ? "—" : num(Number(formatEther(balance)), 0)}</b></div>
            <div className="dv-runway">
              <div className="dv-runway-top">
                <span>按当前释放速度可发</span>
                <b className={runOut ? "warn" : ""}>{daysLeft > 0 ? `≈ ${daysLeft} 天` : "—"}</b>
              </div>
              <div className="dv-bar"><i style={{ width: `${Math.min(100, (daysLeft / 60) * 100)}%` }} className={runOut ? "warn" : ""} /></div>
            </div>
          </section>
        </div>

        {/* 规则说明 */}
        <div className="dv-mech">
          {[
            ["5%", "每笔市场成交抽 5% 进分红池"],
            ["按占比", "TAPEX 持仓越多，分得越多"],
            ["随时领", "不领取不会清零，也不锁仓"],
          ].map(([k, v]) => (
            <div key={k} className="dv-mech-cell"><b>{k}</b><span>{v}</span></div>
          ))}
        </div>

        {/* TAPEX 购买 */}
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
            <p className="hint">在 IGNIX / OKX 粘贴上面的合约地址即可买入；两者均禁止被嵌入，图表需新窗口打开。</p>
          </div>
        </div>
      </div>
    </>
  );
}
