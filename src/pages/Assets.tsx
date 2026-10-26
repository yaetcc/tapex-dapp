import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ADDRS, ABI, PART_NAMES } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { num, shortAddr } from "../lib/format";
import { DetailSheet, type Detail } from "../components/DetailSheet";
import { PartIcon } from "../components/PartIcon";
import { getHistory } from "../lib/tx";

const tapeC = new Contract(ADDRS.tape, ABI.tape as unknown as string[], readProvider);
const partC = new Contract(ADDRS.part, ABI.part as unknown as string[], readProvider);
const circC = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], readProvider);
const fsC = new Contract(ADDRS.feeSplit, ABI.feeSplit as unknown as string[], readProvider);

export function Assets({ go }: { go: (r: string) => void }) {
  const { t, account } = useApp();
  const [tape, setTape] = useState<bigint>(0n);
  const [counts, setCounts] = useState<number[]>([]);
  const [pending, setPending] = useState<bigint>(0n);
  const [pcs, setPcs] = useState<number>(0);
  const [detail, setDetail] = useState<Detail>(null);

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
    })().catch(() => {});
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
          <div className="tiles" style={{ marginTop: 18 }}>
            <div className="tile"><span>TAPE</span><b>{num(Number(formatEther(tape)), 2)}</b></div>
            <div className="tile"><span>待领分红</span><b>{num(Number(formatEther(pending)), 4)} <em>TAPE</em></b></div>
            <div className="tile"><span>PC 整机</span><b>{pcs} <em>台</em></b></div>
            <div className="tile"><span>硬件部件</span><b>{totalParts} <em>件</em></b></div>
          </div>

          <div className="sec-head"><b>硬件部件</b><span>标准 / Pro / 旗舰</span></div>
          <div className="rack">
            {PART_NAMES.map((name, i) => {
              const s = counts[i] || 0, p = counts[i + 8] || 0, f = counts[i + 16] || 0, tot = s + p + f;
              return (
                <div key={name} className={`rack-cell${tot ? " has" : ""}`} style={{ cursor: "pointer" }}
                onClick={() => setDetail({ kind: "part", id: i + 1 })}>
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

          <div className="row-links">
            <button className="btn btn-ghost" onClick={() => go("mint")}>去铸造</button>
            <button className="btn btn-ghost" onClick={() => go("asm")}>去组装</button>
            <button className="btn btn-ghost" onClick={() => go("stake")}>去质押</button>
            <button className="btn btn-ghost" onClick={() => go("divd")}>去领取分红</button>
          </div>
          <div className="sec-head"><b>最近交易</b><span>本机记录</span></div>
          {getHistory().length === 0 ? (
            <div className="empty">还没有交易记录</div>
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
        </>
      )}
      <DetailSheet detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
