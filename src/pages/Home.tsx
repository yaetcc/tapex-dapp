import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { useApp } from "../state/App";
import { ADDRS, ABI } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { num } from "../lib/format";
import { RigArt } from "../components/RigArt";
import { gradeNum } from "../lib/contracts";

export function Home({ go }: { go: (r: string) => void }) {
  const { account, connect } = useApp();
  const [d, setD] = useState<{ pcs: number; staked: number; hash: number; pending: number; ids: number[] } | null>(null);
  const [net, setNet] = useState<{ shares: number; pool: number; perDay: number; supply: number; minted: number; cap: number } | null>(null);

  // 全网状态（不依赖钱包）
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const tapeC = new Contract(ADDRS.tape, ABI.tape as unknown as string[], readProvider);
        const mineC = new Contract(ADDRS.mining, ABI.mining as unknown as string[], readProvider);
        const circC = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], readProvider);
        const [shares, pool, perDay, supply, minted, cap] = await Promise.all([
          mineC.totalShares() as Promise<bigint>,
          tapeC.balanceOf(ADDRS.mining) as Promise<bigint>,
          mineC.rewardPerDay() as Promise<bigint>,
          tapeC.totalSupply() as Promise<bigint>,
          circC.mintedTotal() as Promise<bigint>,
          circC.maxMintTotal() as Promise<bigint>,
        ]);
        if (!alive) return;
        setNet({ shares: Number(shares), pool: Number(formatEther(pool)), perDay: Number(formatEther(perDay)),
          supply: Number(formatEther(supply)), minted: Number(minted), cap: Number(cap) });
      } catch { /* 静默 */ }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!account) { setD(null); return; }
    let alive = true;
    (async () => {
      try {
        const ct = new Contract(ADDRS.circuit, ABI.circuit, readProvider);
        const mt = new Contract(ADDRS.mining, ABI.mining, readProvider);
        const fs = new Contract(ADDRS.feeSplit, ABI.feeSplit, readProvider);
        const [pcBal, stakedIds, pending] = await Promise.all([
          ct.balanceOf(account),
          mt.stakedPCsOf(account),
          fs.pending(account).catch(() => 0n),
        ]);
        let hash = 0;
        for (const id of stakedIds as bigint[]) {
          const info = await ct.getCircuitInfo(id);
          hash += Number(info.hashRate);
        }
        if (!alive) return;
        setD({
          pcs: Number(pcBal), staked: stakedIds.length, hash,
          pending: Number(formatEther(pending)),
          ids: (stakedIds as bigint[]).map((x) => Number(x)).slice(0, 6),
        });
      } catch { /* 静默 */ }
    })();
    return () => { alive = false; };
  }, [account]);


  return (
    <div className="home">
      <div className="card home-hero">
        <div className="home-hero-txt">
          <span className="home-kicker">TAPEX · 矿场总览</span>
          <h1>{account ? "你的矿场" : "开始你的矿场"}</h1>
          <p>抽部件、组装矿机、上架挖矿、每日领分红。</p>
          <div className="home-cta">
            {account ? (
              <>
                <button className="btn btn-primary" onClick={() => go("stake")}>去质押</button>
                <button className="btn btn-ghost" onClick={() => go("divd")}>看分红</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={connect}>连接钱包</button>
            )}
          </div>
        </div>
        <div className="home-hero-art"><RigArt hash={d?.hash ?? 0} grade={6} size={210} state={d && d.staked > 0 ? "mining" : "idle"} /></div>
      </div>

      <div className="home-kpi">
        {[
          { k: "算力", v: d ? `${d.hash}` : "—", u: "H" },
          { k: "机器", v: d ? `${d.pcs}` : "—", u: `台（${d?.staked ?? 0} 挖矿）` },
          { k: "待领取", v: d ? num(d.pending, 2) : "—", u: "TAPE" },
          { k: "每台日均", v: d && d.staked > 0 ? num(d.pending / d.staked, 2) : "—", u: "TAPE" },
        ].map((x) => (
          <div className="card home-tile" key={x.k}>
            <span>{x.k}</span>
            <b data-num>{x.v}</b>
            <em>{x.u}</em>
          </div>
        ))}
      </div>

      <div className="home-grid">
        <div className="card home-panel">
          <div className="sec-head"><b>我的矿机</b><span>{d ? `${d.staked} 台在挖` : "未连接"}</span></div>
          {!d || d.ids.length === 0 ? (
            <div className="empty empty-act">
              <span>还没有上架的机器</span>
              <button className="btn-ghost" onClick={() => go("stake")}>去质押 →</button>
            </div>
          ) : (
            <ul className="home-list">
              {d.ids.map((id) => (
                <li key={id}><b>PC #{id}</b><span>挖矿中</span></li>
              ))}
            </ul>
          )}
        </div>

        <div className="card home-panel">
          <div className="sec-head"><b>快速开始</b><span>3 步</span></div>
          <div className="home-steps">
            <button onClick={() => go("mint")}><i>1</i>抽部件<span>0.001 OKB / 件</span></button>
            <button onClick={() => go("asm")}><i>2</i>组装矿机<span>100 TAPE / 台</span></button>
            <button onClick={() => go("stake")}><i>3</i>上架挖矿<span>按算力分配</span></button>
          </div>
        </div>

        <div className="card home-panel home-net">
          <div className="sec-head"><b>全网状态</b><span>链上实时</span></div>
          <div className="home-net-grid">
            <div><span>全网算力</span><b>{net ? net.shares.toLocaleString() : "—"}</b><em>H</em></div>
            <div><span>日释放</span><b>{net ? num(net.perDay, 0) : "—"}</b><em>TAPE</em></div>
            <div><span>矿池余额</span><b>{net ? num(net.pool, 0) : "—"}</b><em>TAPE</em></div>
            <div><span>已铸造</span><b>{net ? `${net.minted}/${net.cap}` : "—"}</b><em>台</em></div>
          </div>
        </div>
      </div>
    </div>
  );
}
