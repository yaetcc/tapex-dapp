import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { useApp } from "../state/App";
import { ADDRS, PART_NAMES } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { num } from "../lib/format";
import { RigArt } from "../components/RigArt";

const A = {
  erc721: ["function balanceOf(address) view returns (uint256)"],
  staked: ["function stakedPCsOf(address) view returns (uint256[])"],
  pending: ["function pending(address) view returns (uint256)"],
  batch: ["function balanceOfBatch(address[],uint256[]) view returns (uint256[])"],
  info: ["function getCircuitInfo(uint256) view returns (tuple(uint256 processorId,bytes32 circuitHash,uint8[8] tiers,uint32 hashRate,uint8 grade,uint256 createdAt))"],
  u64: ["function totalShares() view returns (uint256)"],
  bal: ["function balanceOf(address) view returns (uint256)"],
  perDay: ["function rewardPerDay() view returns (uint256)"],
  supply: ["function totalSupply() view returns (uint256)"],
  minted: ["function mintedTotal() view returns (uint256)"],
  maxMint: ["function maxMintTotal() view returns (uint256)"],
};

type Mine = { pcs: number; staked: number; hash: number; pending: number; ids: number[]; can: number; missing: number[] };
type Net = { shares: number; pool: number; perDay: number; supply: number; minted: number; cap: number };

export function Home({ go }: { go: (r: string) => void }) {
  const { account, connect } = useApp();
  const [d, setD] = useState<Mine | null>(() => {
    try { const raw = localStorage.getItem("home_cache"); return raw ? JSON.parse(raw) as Mine : null; } catch { return null; }
  });
  const [net, setNet] = useState<Net | null>(null);

  // 全网（不依赖钱包）
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const tapeC = new Contract(ADDRS.tape, A.supply.concat(A.bal), readProvider);
        const mineC = new Contract(ADDRS.mining, A.u64.concat(A.perDay), readProvider);
        const circC = new Contract(ADDRS.circuit, A.minted.concat(A.maxMint), readProvider);
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

  // 我的矿场
  useEffect(() => {
    if (!account) { setD(null); return; }
    try { const c = JSON.parse(localStorage.getItem("home_cache") || "null"); if (c && !c.__ok) { /* 旧缓存结构 */ } } catch { /* ignore */ }
    let alive = true;
    (async () => {
      try {
        const ct = new Contract(ADDRS.circuit, A.erc721.concat(A.info), readProvider);
        const mt = new Contract(ADDRS.mining, A.staked, readProvider);
        const fs = new Contract(ADDRS.feeSplit, A.pending, readProvider);
        const [pcBal, stakedIds, pending] = await Promise.all([
          ct.balanceOf(account).catch(() => 0n),
          mt.stakedPCsOf(account).catch(() => [] as bigint[]),
          fs.pending(account).catch(() => 0n),
        ]);
        // 先出快数据（3 个调用），算力随后补
        if (alive) setD({ pcs: Number(pcBal), staked: (stakedIds as bigint[]).length, hash: 0,
          pending: Number(formatEther(pending)), ids: (stakedIds as bigint[]).map(Number).slice(0, 8), can: 0, missing: [] });

        // 部件 + 算力并行
        const ids = (stakedIds as bigint[]).slice(0, 40);
        const [partsRes, ...infos] = await Promise.all([
          (async () => {
            try {
              const pt = new Contract(ADDRS.part, A.batch, readProvider);
              const ids24 = Array.from({ length: 24 }, (_, i) => i + 1);
              const bals: bigint[] = await pt.balanceOfBatch(ids24.map(() => account), ids24);
              const byType = Array.from({ length: 8 }, (_, i) => [0, 1, 2].reduce((a, tr) => a + Number(bals[tr * 8 + i]), 0));
              return { can: Math.min(...byType), missing: byType.map((v, i) => (v < 1 ? i : -1)).filter((i) => i >= 0) };
            } catch { return { can: 0, missing: [] as number[] }; }
          })(),
          ...ids.map((id) => ct.getCircuitInfo(id).catch(() => null)),
        ]);
        let hash = 0;
        for (const info of infos as any[]) if (info) hash += Number(info.hashRate);
        if (!alive) return;
        setD({ pcs: Number(pcBal), staked: (stakedIds as bigint[]).length, hash,
          pending: Number(formatEther(pending)), ids: (stakedIds as bigint[]).map(Number).slice(0, 8),
          can: partsRes.can, missing: partsRes.missing });
        try { localStorage.setItem("home_cache", JSON.stringify({ pcs: Number(pcBal), staked: (stakedIds as bigint[]).length, hash, pending: Number(formatEther(pending)), ids: (stakedIds as bigint[]).map(Number).slice(0, 8), can: partsRes.can, missing: partsRes.missing })); } catch { /* ignore */ }
      } catch (e) { console.warn("[home] 读取矿场数据失败", e); }
    })();
    return () => { alive = false; };
  }, [account]);

  const act = (() => {
    if (!d) return { icon: "✦", title: "开始抽第一件部件", sub: "0.001 OKB 一抽，8 类集齐可组装", cta: "去铸造", route: "mint" };
    if (d.pending > 0) return { icon: "↓", title: `可领取 ${num(d.pending, 2)} TAPE`, sub: `${d.staked} 台在挖，越早领越早复投`, cta: "去领取", route: "stake" };
    if (d.can >= 1) return { icon: "⚙", title: `够装 ${d.can} 台`, sub: "8 类部件已齐，去组装矿机", cta: "去组装", route: "asm" };
    if (d.missing.length > 0 && d.missing.length <= 3) return { icon: "＋", title: `还差 ${d.missing.map((i) => PART_NAMES[i]).join("、")}`, sub: `再抽 ${d.missing.length} 件就能装一台`, cta: "去抽部件", route: "mint" };
    if (d.pcs > 0 && d.staked === 0) return { icon: "⚡", title: `${d.pcs} 台待上架`, sub: "上架后按算力开始挖矿", cta: "去质押", route: "stake" };
    return { icon: "✦", title: "开始抽第一件部件", sub: "0.001 OKB 一抽，8 类集齐可组装", cta: "去铸造", route: "mint" };
  })();

  const stats = [
    { k: "待领取", v: d ? num(d.pending, 2) : "0.00", u: "TAPE", hot: true },
    { k: "算力", v: d ? d.hash.toLocaleString() : "0", u: "H" },
    { k: "机器", v: d ? String(d.pcs) : "0", u: "台" },
    { k: "日均", v: d && d.staked > 0 ? num(d.pending / d.staked, 2) : "0.00", u: "TAPE" },
  ];

  return (
    <div className="home2">
      <section className="hero2">
        <div className="hero2-left">
          <span className="kicker2"><i />TAPEX · 矿场控制台</span>
          <h1>{account ? "你的矿场" : "开始你的矿场"}</h1>
          <p>抽部件 → 组装矿机 → 上架挖矿 → 每日分红</p>
          <div className="hero2-cta">
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

        <div className="hero2-rig">
          <RigArt hash={d?.hash ?? 0} grade={6} size={300} state={d && d.staked > 0 ? "mining" : "idle"} />
          <span className="nameplate">{d && d.staked > 0 ? `${d.staked} 台在跑` : "待机中"}</span>
        </div>

        <div className="hero2-side">
          <button className={`act2${account ? "" : " off"}`} onClick={() => go(account ? act.route : "mint")}>
            <span className="act2-ico">{act.icon}</span>
            <span className="act2-txt">
              <b>{account ? act.title : "连接钱包，开始第一台矿机"}</b>
              <em>{account ? act.sub : "0.001 OKB 一抽 · 8 类集齐可组装"}</em>
            </span>
            <span className="act2-go">{account ? act.cta : "去抽"} →</span>
          </button>

          <div className="stats2">
            {stats.map((x) => (
              <div key={x.k} className={x.hot ? "hot" : ""}>
                <span>{x.k}</span>
                <b>{x.v}</b>
                <em>{x.u}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="ticker">
        <span>全网算力 <b>{net ? net.shares.toLocaleString() : "—"} H</b></span><i />
        <span>日释放 <b>{net ? num(net.perDay, 0) : "—"} TAPE</b></span><i />
        <span>矿池余额 <b>{net ? num(net.pool, 0) : "—"} TAPE</b></span><i />
        <span>已铸造 <b>{net ? `${net.minted}/${net.cap}` : "—"}</b></span>
      </div>

      <div className="lower2">
        <div className="panel2">
          <div className="panel2-head"><b>我的矿机</b><span>{d ? `${d.staked} 台在挖` : "未连接"}</span></div>
          {!d || d.ids.length === 0 ? (
            <button className="panel2-empty" onClick={() => go("stake")}>还没有上架的机器 · 去质押 →</button>
          ) : (
            <div className="chips2">
              {d.ids.map((id) => <button key={id} onClick={() => go("assets")}>PC #{id}</button>)}
            </div>
          )}
        </div>

        <div className="panel2">
          <div className="panel2-head"><b>下一步</b><span>3 步</span></div>
          <div className="steps2">
            <button onClick={() => go("mint")}><i>1</i><b>抽部件</b><em>0.001 OKB / 件</em></button>
            <button onClick={() => go("asm")}><i>2</i><b>组装</b><em>100 TAPE / 台</em></button>
            <button onClick={() => go("stake")}><i>3</i><b>上架</b><em>按算力分配</em></button>
          </div>
        </div>
      </div>
    </div>
  );
}
