import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ADDRS, ABI } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { compact, num } from "../lib/format";
import { Num } from "../components/Num";

const tapeC = new Contract(ADDRS.tape, ABI.tape as unknown as string[], readProvider);
const mineC = new Contract(ADDRS.mining, ABI.mining as unknown as string[], readProvider);
const circC = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], readProvider);
const fsC = new Contract(ADDRS.feeSplit, ABI.feeSplit as unknown as string[], readProvider);

type S = { shares: number; pool: number; minted: number; cap: number; perDay: number; deposited: number; supply: number };

export function Network() {
  const [s, setS] = useState<S | null>(null);

  useEffect(() => {
    (async () => {
      const [shares, pool, minted, cap, perDay, dep, supply] = await Promise.all([
        mineC.totalShares() as Promise<bigint>,
        tapeC.balanceOf(ADDRS.mining) as Promise<bigint>,
        circC.mintedTotal() as Promise<bigint>,
        circC.maxMintTotal() as Promise<bigint>,
        mineC.rewardPerDay() as Promise<bigint>,
        fsC.totalDeposited() as Promise<bigint>,
        tapeC.totalSupply() as Promise<bigint>,
      ]);
      setS({
        shares: Number(shares), pool: Number(formatEther(pool)), minted: Number(minted),
        cap: Number(cap), perDay: Number(formatEther(perDay)), deposited: Number(formatEther(dep)),
        supply: Number(formatEther(supply)),
      });
    })().catch(() => {});
  }, []);

  const pct = s && s.cap > 0 ? Math.min(100, (s.minted / s.cap) * 100) : 0;

  return (
    <div className="card">
      <span className="kicker">NETWORK</span>
      <h2 style={{ marginTop: 14 }}>全网状态</h2>

      <div className="tiles" style={{ marginTop: 18 }}>
        <div className="tile"><span>全网算力</span><b>{s ? <Num value={s.shares} format={(n) => num(n, 0)} /> : "—"} <em>H</em></b></div>
        <div className="tile"><span>奖励池余额</span><b>{s ? <Num value={s.pool} format={compact} /> : "—"} <em>TAPE</em></b></div>
        <div className="tile"><span>已抽部件</span><b>{s ? compact(s.minted) : "—"}</b></div>
        <div className="tile"><span>抽卡上限</span><b>{s ? compact(s.cap) : "—"}</b></div>
      </div>

      <div className="sec-head"><b>抽卡进度</b><span>{s ? `${num(s.minted, 0)} / ${num(s.cap, 0)}` : "—"}</span></div>
      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
        <i style={{ display: "block", height: "100%", width: `${pct}%`, borderRadius: 999, background: "linear-gradient(90deg,#FFD93D,#00E5A0)", transition: "width .6s" }} />
      </div>

      <details className="fold-box">
        <summary>合约参数 · 经济模型</summary>
        <div className="kv">
          <span>TAPE 总供应</span><b>{s ? num(s.supply, 0) : "—"}</b>
          <span>每日释放（挖矿）</span><b>{s ? num(s.perDay, 0) : "—"} TAPE</b>
          <span>分红池累计注入</span><b>{s ? num(s.deposited, 0) : "—"} TAPE</b>
          <span>抽卡单价</span><b>0.001 OKB / 件</b>
          <span>组装费</span><b>100 TAPE / 台</b>
          <span>市场手续费</span><b>10%（5% 销毁 + 5% 分红）</b>
        </div>
      </details>

      <p className="hint" style={{ marginTop: 14 }}>数据来自公共 RPC（rpc.xlayer.tech），交易确认后可能有数秒延迟。</p>
    </div>
  );
}
