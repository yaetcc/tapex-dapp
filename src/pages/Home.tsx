import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { useApp } from "../state/App";
import { ADDRS, ABI, PART_NAMES } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { num } from "../lib/format";
import { RigArt } from "../components/RigArt";
import { gradeNum } from "../lib/contracts";

function Count({ to, digits = 2 }: { to: number; digits?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!to) { setV(0); return; }
    const t0 = performance.now(); const dur = 600;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}</>;
}

export function Home({ go }: { go: (r: string) => void }) {
  const { account, connect } = useApp();
  const [d, setD] = useState<{ pcs: number; staked: number; hash: number; pending: number; ids: number[]; can: number; missing: number[] } | null>(null);
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
          ct.balanceOf(account).catch(() => 0n),
          mt.stakedPCsOf(account).catch(() => [] as bigint[]),
          fs.pending(account).catch(() => 0n),
        ]);
        let can = 0;
        let missing: number[] = [];
        try {
          const pt = new Contract(ADDRS.part, ABI.part, readProvider);
          const ids24 = Array.from({ length: 24 }, (_, i) => i + 1);
          const bals: bigint[] = await pt.balanceOfBatch(ids24.map(() => account), ids24);
          const byType = Array.from({ length: 8 }, (_, i) => [0, 1, 2].reduce((a, tr) => a + Number(bals[tr * 8 + i]), 0));
          can = Math.min(...byType);
          missing = byType.map((v, i) => (v < 1 ? i : -1)).filter((i) => i >= 0);
        } catch { /* 部件读取失败不影响其它指标 */ }
        let hash = 0;
        for (const id of (stakedIds as bigint[]).slice(0, 30)) {
          try { const info = await ct.getCircuitInfo(id); hash += Number(info.hashRate); } catch { /* skip */ }
        }
        if (!alive) return;
        setD({
          pcs: Number(pcBal), staked: stakedIds.length, hash,
          pending: Number(formatEther(pending)),
          ids: (stakedIds as bigint[]).map((x) => Number(x)).slice(0, 6),
          can, missing,
        });
      } catch (err) { console.warn("home data", err); }
    })();
    return () => { alive = false; };
  }, [account]);


  const act = (() => {
    if (!d) return { icon: "✦", title: "先抽第一件部件", sub: "0.001 OKB 一抽，8 类集齐可组装", cta: "去铸造", route: "mint" };
    if (d.pending > 0) return { icon: "↓", title: `可领取 ${num(d.pending, 2)} TAPE`, sub: `${d.staked} 台机器在挖，越早领越早复投`, cta: "去领取", route: "stake" };
    if (d.can >= 1) return { icon: "⚙", title: `够装 ${d.can} 台`, sub: "8 类部件已齐，去组装矿机", cta: "去组装", route: "asm" };
    if (d.missing.length > 0 && d.missing.length <= 3)
      return { icon: "＋", title: `还差 ${d.missing.map((i) => PART_NAMES[i]).join("、")}`, sub: `再抽 ${d.missing.length} 件就能装一台`, cta: "去抽部件", route: "mint" };
    if (d.pcs > 0 && d.staked === 0) return { icon: "⚡", title: `${d.pcs} 台待上架`, sub: "上架后按算力开始挖矿", cta: "去质押", route: "stake" };
    return { icon: "✦", title: "开始抽第一件部件", sub: "0.001 OKB 一抽，8 类集齐可组装", cta: "去铸造", route: "mint" };
  })();

  return (
    <div className="home">
      <div className="card home-hero">
        <div className="home-hero-txt">
          <span className="home-kicker"><i aria-hidden />TAPEX · 矿场总览</span>
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

      {account && (
        <div className="card act-card">
          <div className="act-ico">{act.icon}</div>
          <div className="act-body">
            <b>{act.title}</b>
            <span>{act.sub}</span>
          </div>
          <button className="btn btn-primary" onClick={() => go(act.route)}>{act.cta}</button>
        </div>
      )}

      <div className="home-kpi">
        <div className="card home-tile main">
          <span>待领取</span>
          <b data-num>{d ? <Count to={d.pending} /> : "0.00"}</b>
          <em>TAPE · {!account ? "连接钱包后显示" : d && d.staked > 0 ? `${d.staked} 台在挖` : "未上架"}</em>
          <i className="spark" aria-hidden><b /><b /><b /><b /><b /><b /><b /></i>
        </div>
        <div className="card home-tile"><span>算力</span><b data-num>{d ? <Count to={d.hash} digits={0} /> : "0"}</b><em>H{!account ? " · 连接后显示" : ""}</em></div>
        <div className="card home-tile"><span>机器</span><b data-num>{d ? <Count to={d.pcs} digits={0} /> : "0"}</b><em>台（{d?.staked ?? 0} 挖矿）</em></div>
        <div className="card home-tile"><span>每台日均</span><b data-num>{d && d.staked > 0 ? <Count to={d.pending / d.staked} /> : "0.00"}</b><em>TAPE</em></div>
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
