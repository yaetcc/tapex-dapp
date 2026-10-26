import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ADDRS, ABI, PART_NAMES } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { loadCache, putCache } from "../lib/pcCache";
import { useApp } from "../state/App";
import { num, shortAddr } from "../lib/format";
import { DetailSheet, type Detail } from "../components/DetailSheet";
import { PartIcon } from "../components/PartIcon";
import { RigArt } from "../components/RigArt";
import { GradeBadge, GRADE_COLOR } from "../components/GradeBadge";
import { getHue, getVariant } from "../lib/names";
import { gradeOf, gradeNum } from "../lib/contracts";
import { getHistory } from "../lib/tx";
import { Num } from "../components/Num";

const tapeC = new Contract(ADDRS.tape, ABI.tape as unknown as string[], readProvider);
const partC = new Contract(ADDRS.part, ABI.part as unknown as string[], readProvider);
const circC = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], readProvider);
const fsC = new Contract(ADDRS.feeSplit, ABI.feeSplit as unknown as string[], readProvider);
const mkC = new Contract(ADDRS.market, ABI.market as unknown as string[], readProvider);

export function Assets({ go }: { go: (r: string) => void }) {
  const { t, account } = useApp();
  const [tape, setTape] = useState<bigint>(0n);
  const [counts, setCounts] = useState<number[]>([]);
  const [pending, setPending] = useState<bigint>(0n);
  const [pcs, setPcs] = useState<number>(0);
  const [pcList, setPcList] = useState<{ id: number; hash: number; grade: number; staked: boolean; listed: boolean }[]>([]);
  const [pcLoading, setPcLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "idle" | "staked" | "listed">("all");
  const [sort, setSort] = useState<"hash" | "id">("hash");
  const [shown, setShown] = useState(8);
  const [detail, setDetail] = useState<Detail>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account) return;
    (async () => {
      const ids = Array.from({ length: 24 }, (_, i) => i + 1);
      const [bal, parts, p, pcList] = await Promise.all([
        tapeC.balanceOf(account) as Promise<bigint>,
        partC.balanceOfBatch(ids.map(() => account), ids) as Promise<bigint[]>,
        fsC.pending(account) as Promise<bigint>,
        circC.pcsOfOwner(account) as Promise<bigint[]>,
      ]);
      setTape(bal); setCounts(parts.map(Number)); setPending(p); setPcs(pcList.length);
      if (pcList.length) {
        const circ = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], readProvider);
        const mine = new Contract(ADDRS.mining, ABI.mining as unknown as string[], readProvider);
        const [stakedRaw, orders] = await Promise.all([
          mine.stakedPCsOf(account) as Promise<bigint[]>,
          mkC.activePCOrders().catch(() => []) as Promise<{ tokenId: bigint; active: boolean }[]>,
        ]);
        const stakedIds = new Set(stakedRaw.map(Number));
        const listedIds = new Set(orders.filter((o) => o.active).map((o) => Number(o.tokenId)));
        const cache = loadCache();
        const need = pcList.map(Number).filter((id) => !cache[String(id)]);
        for (let i = 0; i < need.length; i += 8) {
          const chunk = need.slice(i, i + 8);
          const infos = await Promise.all(chunk.map((id) => circ.getCircuitInfo(id) as Promise<{ hashRate: bigint; grade: bigint }>));
          chunk.forEach((id, k) => {
            cache[String(id)] = { hash: Number(infos[k].hashRate), grade: Number(infos[k].grade) };
            putCache(id, cache[String(id)]);
          });
        }
        setPcList(pcList.map((x) => {
          const id = Number(x);
          const meta = cache[String(id)] ?? { hash: 0, grade: 3 };
          return { id, hash: meta.hash, grade: meta.grade, staked: stakedIds.has(id), listed: listedIds.has(id) };
        }));
      }
    })().catch(() => {}).finally(() => { setLoading(false); setPcLoading(false); });
  }, [account]);

  const totalParts = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="card">
      <span className="kicker">MY · ASSETS</span>
      <h2 style={{ marginTop: 14 }}>我的资产</h2>

      {!account ? (
        <div className="empty" style={{ marginTop: 18 }}>连接钱包后查看资产</div>
      ) : (
        <>
          <div className="as-layout">
          <div className="as-main">
          <div className="tiles" style={{ marginTop: 18 }}>
            <div className="tile"><span><img className="coin-ico" src="/tape-logo.svg" alt="" />TAPE</span><b>{loading ? "—" : <Num value={Number(formatEther(tape))} format={(n) => num(n, 2)} />}</b></div>
            <div className="tile"><span><img className="coin-ico" src="/tape-logo.svg" alt="" />待领分红</span><b>{loading ? "—" : <Num value={Number(formatEther(pending))} format={(n) => num(n, 4)} />} <em>TAPE</em></b></div>
            <div className="tile"><span>PC 整机</span><b>{loading ? "—" : pcs} <em>台</em></b></div>
            <div className="tile"><span>硬件部件</span><b>{loading ? "—" : totalParts} <em>件</em></b></div>
          </div>
          {!loading && pcs === 0 && totalParts === 0 && (
            <div className="guide" style={{ marginTop: 14 }}>
              <b>第一步</b> 还没有部件 —— 先去铸造抽几件，再组装成 PC。
              <button className="btn btn-ghost" onClick={() => go("mint")}>去铸造</button>
            </div>
          )}

          <div className="sec-head">
            <b>我的 PC</b><span>{pcs} 台</span>
            <span className="spacer" />
            <div className="pc-filters">
              {([["all", "全部"], ["idle", "待机"], ["staked", "质押中"], ["listed", "挂单中"]] as const).map(([k, label]) => (
                <button key={k} className={`pc-chip${filter === k ? " on" : ""}`} onClick={() => { setFilter(k); setShown(8); }}>
                  {label}<i>{k === "all" ? pcList.length
                    : k === "staked" ? pcList.filter((p) => p.staked).length
                    : k === "listed" ? pcList.filter((p) => p.listed).length
                    : pcList.filter((p) => !p.staked && !p.listed).length}</i>
                </button>
              ))}
              <button className="pc-chip" onClick={() => setSort(sort === "hash" ? "id" : "hash")}>
                {sort === "hash" ? "算力↓" : "编号↑"}
              </button>
            </div>
          </div>

          {pcLoading ? (
            <div className="pc-grid"><div className="skeleton" style={{ height: 150 }} /><div className="skeleton" style={{ height: 150 }} /></div>
          ) : pcs === 0 ? (
            <div className="empty empty-act">
              <span>还没有 PC —— 先去组装一台</span>
              <button className="btn-ghost" onClick={() => go("asm")}>去组装 →</button>
            </div>
          ) : (
            <>
              <div className="pc-grid">
                {pcList
                  .filter((p) => (filter === "all" ? true : filter === "staked" ? p.staked : filter === "listed" ? p.listed : !p.staked && !p.listed))
                  .sort((a, b) => (sort === "hash" ? b.hash - a.hash : a.id - b.id))
                  .slice(0, shown)
                  .map((p) => (
                    <div key={p.id} className={`pc-mini${p.staked ? " on" : ""}`}
                      data-g={gradeOf(p.hash).toLowerCase()}
                      style={{ ["--gc" as string]: GRADE_COLOR[gradeOf(p.hash)] }}
                      onClick={() => setDetail({ kind: "pc", id: p.id })}>
                      <RigArt hash={p.hash} mining={p.staked} grade={p.id === 12 ? 5 : gradeNum(p.hash)} size={120} />
                      <div className="pc-mini-meta">
                        <b>#{p.id}</b>
                        <GradeBadge hash={p.hash} />
                        <em>{p.hash} H</em>
                        <span className={`pc-mini-state${p.staked ? " live" : p.listed ? " list" : ""}`}>
                          {p.staked ? "质押中" : p.listed ? "挂单中" : "待机"}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
              {pcList.filter((p) => (filter === "all" ? true : filter === "staked" ? p.staked : filter === "listed" ? p.listed : !p.staked && !p.listed)).length > shown && (
                <div className="pc-more">
                  <button className="btn btn-ghost" onClick={() => setShown((v) => v + 16)}>
                    显示更多（还有 {pcList.filter((p) => (filter === "all" ? true : filter === "staked" ? p.staked : filter === "listed" ? p.listed : !p.staked && !p.listed)).length - shown} 台）
                  </button>
                </div>
              )}
            </>
          )}

          <div className="sec-head"><b>硬件部件</b><span>标准 / Pro / 旗舰</span></div>
          <div className="rack">
            {PART_NAMES.map((name, i) => {
              const s = counts[i] || 0, p = counts[i + 8] || 0, f = counts[i + 16] || 0, tot = s + p + f;
              return (
                <div key={name} className={`rack-cell${tot ? " has" : ""}`} style={{ cursor: "pointer" }}
                onClick={() => {
                  const tier = f > 0 ? 2 : p > 0 ? 1 : 0;      // 旗舰 > Pro > 标准
                  setDetail({ kind: "part", id: i + 1 + tier * 8 });
                }}>
                  <span style={{ marginBottom: 1 }}><PartIcon type={i} muted={!tot} size={22} /></span>
                  <em>{name}</em><b>{tot}</b>
                  <div className="rack-tiers">
                    {s > 0 && <i className="t0">标 {s}</i>}
                    {p > 0 && <i className="t1">Pro {p}</i>}
                    {f > 0 && <i className="t2">旗 {f}</i>}
                  </div>
                </div>
              );
            })}
          </div>

          </div>

          <aside className="as-side">
            <div className="sec-head" style={{ marginTop: 0 }}><b>快捷入口</b></div>
            <div className="as-links"><button className="btn btn-ghost" onClick={() => go("mint")}>去铸造</button>
            <button className="btn btn-ghost" onClick={() => go("asm")}>去组装</button>
            <button className="btn btn-ghost" onClick={() => go("stake")}>去质押</button>
            <button className="btn btn-ghost" onClick={() => go("divd")}>去领取分红</button></div>
<div className="sec-head"><b>最近交易</b><span>本机记录</span></div>
          {getHistory().length === 0 ? (
            <div className="empty empty-act">
              <span>还没有交易记录</span>
              <button className="btn-ghost" onClick={() => go("mint")}>去抽部件 →</button>
            </div>
          ) : (
            <ul className="tx-list">
              {getHistory().map((h, i) => (
                <li key={i} className={h.status}>
                  <b>{h.label}</b>
                  <span>{new Date(h.ts).toLocaleString("zh-CN", { hour12: false }).slice(5, 16)}</span>
                  <em>{h.status === "ok" ? "已完成" : h.error || "失败"}</em>
                </li>
              ))}
            </ul>
          )}
            <p className="hint" style={{ marginTop: 12 }}>已连接 {shortAddr(account ?? "")}</p>
          </aside>
          </div>
        </>
      )}
      <DetailSheet detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
