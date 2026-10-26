import { useCallback, useEffect, useState } from "react";
import { Contract, formatEther, parseEther } from "ethers";
import { ADDRS, ABI, PART_NAMES, TIERS, tierOf, typeOf } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { num, shortAddr } from "../lib/format";
import { trackTx } from "../lib/tx";
import { DetailSheet, type Detail } from "../components/DetailSheet";
import { PartIcon } from "../components/PartIcon";

const mkC = new Contract(ADDRS.market, ABI.market as unknown as string[], readProvider);
const tapeC = new Contract(ADDRS.tape, ABI.tape as unknown as string[], readProvider);
const partC = new Contract(ADDRS.part, ABI.part as unknown as string[], readProvider);

type PcOrder = { id: number; seller: string; price: bigint; tokenId: number };
type PartOrder = { id: number; seller: string; price: bigint; amount: number; partType: number };

const partName = (id: number) => `${PART_NAMES[typeOf(id)]} · ${TIERS[tierOf(id)]}`;

export function Market() {
  const { t, account, signer, toast } = useApp();
  const [mode, setMode] = useState<"pc" | "part" | "mine">("pc");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"price" | "time">("time");
  const [pc, setPc] = useState<PcOrder[]>([]);
  const [parts, setParts] = useState<PartOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellId, setSellId] = useState(""); const [sellPrice, setSellPrice] = useState("");
  const [batch, setBatch] = useState(false);
  const [rows, setRows] = useState<string[][]>([["", "", ""]]);
  const [ptType, setPtType] = useState(1); const [ptAmount, setPtAmount] = useState(""); const [ptPrice, setPtPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<Detail>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pcs, pts] = await Promise.all([
        mkC.activePCOrders() as Promise<{ seller: string; price: bigint; tokenId: bigint; active: boolean }[]>,
        mkC.activePartOrders() as Promise<{ seller: string; price: bigint; amount: bigint; partType: bigint; active: boolean }[]>,
      ]);
      setPc(pcs.map((o, i) => ({ id: i + 1, seller: o.seller, price: o.price, tokenId: Number(o.tokenId), active: o.active }))
        .filter((o) => o.active));
      setParts(pts.map((o, i) => ({ id: i + 1, seller: o.seller, price: o.price, amount: Number(o.amount), partType: Number(o.partType), active: o.active }))
        .filter((o) => o.active && o.amount > 0));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const withSigner = async (fn: () => Promise<unknown>) => {
    if (!signer || !account) return toast(t("err.noWallet"), "err");
    setBusy(true); setMsg("等待钱包确认…");
    try { await trackTx("交易", fn); setMsg(""); await load(); }
    catch (e) { setMsg((e as Error).message.slice(0, 90)); }
    finally { setBusy(false); }
  };

  const buyPc = (o: PcOrder) => withSigner(async () => {
    const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], signer!);
    const tape = new Contract(ADDRS.tape, ABI.tape as unknown as string[], signer!);
    const al = await tape.allowance(account, ADDRS.market) as bigint;
    if (al < o.price) await (await tape.approve(ADDRS.market, o.price * 100n)).wait();
    await (await mk.buyPC(o.id)).wait();
    toast("购买成功", "ok");
  });

  const buyPart = (o: PartOrder) => withSigner(async () => {
    const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], signer!);
    const tape = new Contract(ADDRS.tape, ABI.tape as unknown as string[], signer!);
    const total = o.price;
    const al = await tape.allowance(account, ADDRS.market) as bigint;
    if (al < total) await (await tape.approve(ADDRS.market, total * 100n)).wait();
    await (await mk.buyPart(o.id, 1)).wait();
    toast("购买成功", "ok");
  });

  const myPc = pc.filter((o) => account && o.seller.toLowerCase() === account.toLowerCase());
  const myParts = parts.filter((o) => account && o.seller.toLowerCase() === account.toLowerCase());
  const bySort = <T extends { price: bigint }>(arr: T[]) =>
    sort === "price" ? [...arr].sort((a, b) => (a.price < b.price ? -1 : 1)) : arr;
  const myAddr = account?.toLowerCase();
  const pcView = bySort(pc.filter((o) => (!q || String(o.tokenId).includes(q)) && o.seller.toLowerCase() !== myAddr));
  const partView = bySort(parts.filter((o) => (!q || partName(o.partType).toLowerCase().includes(q.toLowerCase())) && o.seller.toLowerCase() !== myAddr));

  const delistPc = (ids: number[]) => withSigner(async () => {
    const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], signer!);
    await (await mk.delistPC(ids)).wait();
    toast(`撤单 ${ids.length} 条`, "ok");
  });
  const delistPart = (ids: number[]) => withSigner(async () => {
    const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], signer!);
    await (await mk.delistPart(ids)).wait();
    toast(`撤单 ${ids.length} 条`, "ok");
  });

  const setCell = (i: number, k: number, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? r.map((c, j) => (j === k ? v : c)) : r)));

  const submitBatch = () => withSigner(async () => {
    const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], signer!);
    const valid = rows.filter((r) => r[0] && r[2]);
    if (!valid.length) throw new Error("请至少填一行完整数据");
    if (valid.length > 10) throw new Error("单笔最多 10 条，请分批提交");
    valid.forEach((r) => {
      const amt = Number(r[1] || "1");
      if (Number(r[2]) <= 0) throw new Error("单价必须大于 0");
      if (!(amt >= 1)) throw new Error("数量必须 ≥ 1");
      if (mode === "part" && (Number(r[0]) < 1 || Number(r[0]) > 24)) throw new Error("部件 ID 需在 1–24");
    });
    if (mode === "pc") {
      const ids = valid.map((r) => BigInt(r[0]));
      const prices = valid.map((r) => parseEther(r[2]));
      await (await mk.batchListPC(ids, prices)).wait();
    } else {
      const types = valid.map((r) => BigInt(r[0]));
      const amounts = valid.map((r) => BigInt(r[1] || "1"));
      const prices = valid.map((r) => parseEther(r[2]));
      const part = new Contract(ADDRS.part, ABI.part as unknown as string[], signer!);
      if (!(await part.isApprovedForAll(account, ADDRS.market))) {
        await (await part.setApprovalForAll(ADDRS.market, true)).wait();
      }
      await (await mk.batchListPart(types, amounts, prices)).wait();
    }
    setRows([["", "", ""]]);
    toast(`批量挂单 ${valid.length} 条`, "ok");
  });

  const listPc = () => withSigner(async () => {
    const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], signer!);
    await (await mk.listPC(Number(sellId), parseEther(sellPrice || "0"))).wait();
    setSellId(""); setSellPrice(""); toast("已挂单", "ok");
  });

  const listPart = () => withSigner(async () => {
    const part = new Contract(ADDRS.part, ABI.part as unknown as string[], signer!);
    const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], signer!);
    const ok = await part.isApprovedForAll(account, ADDRS.market) as boolean;
    if (!ok) await (await part.setApprovalForAll(ADDRS.market, true)).wait();
    await (await mk.listPart(ptType, Number(ptAmount), parseEther(ptPrice || "0"))).wait();
    setPtAmount(""); setPtPrice(""); toast("已挂单", "ok");
  });

  return (
    <div className="card">
      <span className="kicker">MARKET</span>
      <h2 style={{ marginTop: 14 }}>交易市场</h2>
      <p className="sub">整机与部件都可挂单买卖（TAPE 计价，成交收 10% 手续费：5% 销毁 + 5% 分红）。</p>

      <div className="mk-tabs">
        <button className={mode === "pc" ? "on" : ""} onClick={() => setMode("pc")}>整机 PC</button>
        <button className={mode === "part" ? "on" : ""} onClick={() => setMode("part")}>部件</button>
        <button className={mode === "mine" ? "on" : ""} onClick={() => setMode("mine")}>我的</button>
      </div>

      <div className="sell-row" style={{ marginTop: 10 }}>
        <input className="field field-sm" placeholder="搜索 PC ID / 部件名" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field field-sm" value={sort} onChange={(e) => setSort(e.target.value as "price" | "time")}>
          <option value="time">默认排序</option>
          <option value="price">价格从低到高</option>
        </select>
      </div>

      <div className="mk-layout">
      <div className="mk-main">
      {mode === "mine" ? (
        <>
          <div className="sec-head"><b>我的整机挂单</b><span>{myPc.length} 条</span><span className="spacer" />
            {myPc.length > 0 && <button className="btn btn-ghost" disabled={busy} onClick={() => delistPc(myPc.map((o) => o.id))}>全部撤下</button>}
          </div>
          {myPc.length === 0 ? <div className="empty">没有整机挂单</div> : (
            <div className="order-list">
              {myPc.map((o) => (
                <div className="order-row" key={"mp" + o.id}>
                  <b>PC #{o.tokenId}</b><span className="muted">#{o.id}</span>
                  <span className="price">{num(Number(formatEther(o.price)), 2)} TAPE</span>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => delistPc([o.id])}>撤单</button>
                </div>
              ))}
            </div>
          )}
          <div className="sec-head"><b>我的部件挂单</b><span>{myParts.length} 条</span><span className="spacer" />
            {myParts.length > 0 && <button className="btn btn-ghost" disabled={busy} onClick={() => delistPart(myParts.map((o) => o.id))}>全部撤下</button>}
          </div>
          {myParts.length === 0 ? <div className="empty">没有部件挂单</div> : (
            <div className="order-list">
              {myParts.map((o) => (
                <div className="order-row" key={"mpa" + o.id}>
                  <b style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <PartIcon type={(o.partType - 1) % 8} tier={Math.floor((o.partType - 1) / 8)} size={17} />
                    {partName(o.partType)}
                  </b>
                  <span className="muted">剩 {o.amount}</span>
                  <span className="price">{num(Number(formatEther(o.price)), 2)} TAPE</span>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => delistPart([o.id])}>撤单</button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : mode === "pc" ? (
        <>
          <div className="sec-head" style={{ marginTop: 12 }}>
            <b>批量挂单</b><span>一次签名挂多台</span>
            <span className="spacer" />
            <button className="btn btn-ghost" onClick={() => setBatch((b) => !b)}>{batch ? "收起" : "展开"}</button>
          </div>
          {batch && (
            <div className="batch-list">
              {rows.map((r, i) => (
                <div className="batch-line" key={i}>
                  <input className="field field-sm" placeholder="PC ID" value={r[0]} onChange={(e) => setCell(i, 0, e.target.value.replace(/\D/g, ""))} />
                  <input className="field field-sm" placeholder="价格 TAPE" value={r[2]} onChange={(e) => setCell(i, 2, e.target.value)} />
                  <button className="btn btn-ghost" onClick={() => setRows((rs) => rs.filter((_, x) => x !== i))}>删</button>
                </div>
              ))}
              <div className="batch-line">
                <button className="btn btn-ghost" onClick={() => setRows((rs) => [...rs, ["", "", ""]])}>+ 加一行</button>
                <button className="btn btn-primary" style={{ height: 32, padding: "0 16px", fontSize: 12 }} disabled={busy} onClick={submitBatch}>
                  批量挂单
                </button>
              </div>
            </div>
          )}
          <div className="sell-row">
            <input className="field field-sm" placeholder="PC ID" value={sellId} onChange={(e) => setSellId(e.target.value.replace(/\D/g, ""))} />
            <input className="field field-sm" placeholder="价格 TAPE" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
            <button className="btn btn-ghost" disabled={busy || !sellId || !sellPrice} onClick={listPc}>挂单</button>
          </div>
          <div className="sec-head"><b>在售整机</b><span>{pcView.length - myPc.length} 条</span></div>
          {loading ? <div className="skeleton" style={{ height: 90 }} /> : pc.length === 0 ? (
            <div className="empty">暂无在售整机</div>
          ) : (
            <div className="order-list">
              {pcView.map((o) => (
                <div className="order-row" key={o.id} style={{ cursor: "pointer" }}
                  onClick={(e) => { if (!(e.target as HTMLElement).closest("button")) setDetail({ kind: "pc", id: o.tokenId }); }}>
                  <b>PC #{o.tokenId}</b>
                  <span className="muted">{shortAddr(o.seller)}</span>
                  <span className="price">{num(Number(formatEther(o.price)), 2)} TAPE</span>
                  <button className="btn btn-primary" style={{ height: 32, padding: "0 14px", fontSize: 12 }}
                    disabled={busy || o.seller.toLowerCase() === account?.toLowerCase()} onClick={() => buyPc(o)}>
                    {o.seller.toLowerCase() === account?.toLowerCase() ? "我的" : "购买"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="sec-head" style={{ marginTop: 12 }}>
            <b>批量挂单</b><span>部件类型 / 数量 / 单价</span>
            <span className="spacer" />
            <button className="btn btn-ghost" onClick={() => setBatch((b) => !b)}>{batch ? "收起" : "展开"}</button>
          </div>
          {batch && (
            <div className="batch-list">
              {rows.map((r, i) => (
                <div className="batch-line" key={i}>
                  <input className="field field-sm" placeholder="ID 1-24" value={r[0]} onChange={(e) => setCell(i, 0, e.target.value.replace(/\D/g, ""))} style={{ width: 90 }} />
                  <input className="field field-sm" placeholder="数量" value={r[1]} onChange={(e) => setCell(i, 1, e.target.value.replace(/\D/g, ""))} style={{ width: 80 }} />
                  <input className="field field-sm" placeholder="单价 TAPE" value={r[2]} onChange={(e) => setCell(i, 2, e.target.value)} />
                  <button className="btn btn-ghost" onClick={() => setRows((rs) => rs.filter((_, x) => x !== i))}>删</button>
                </div>
              ))}
              <div className="batch-line">
                <button className="btn btn-ghost" onClick={() => setRows((rs) => [...rs, ["", "", ""]])}>+ 加一行</button>
                <button className="btn btn-primary" style={{ height: 32, padding: "0 16px", fontSize: 12 }} disabled={busy} onClick={submitBatch}>
                  批量挂单
                </button>
              </div>
            </div>
          )}
          <div className="sell-row">
            <select className="field field-sm" value={ptType} onChange={(e) => setPtType(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((id) => <option key={id} value={id}>{partName(id)}</option>)}
            </select>
            <input className="field field-sm" placeholder="数量" value={ptAmount} onChange={(e) => setPtAmount(e.target.value.replace(/\D/g, ""))} />
            <input className="field field-sm" placeholder="单价 TAPE" value={ptPrice} onChange={(e) => setPtPrice(e.target.value)} />
            <button className="btn btn-ghost" disabled={busy || !ptAmount || !ptPrice} onClick={listPart}>挂单</button>
          </div>
          <div className="sec-head"><b>在售部件</b><span>{partView.length - myParts.length} 条</span></div>
          {loading ? <div className="skeleton" style={{ height: 90 }} /> : parts.length === 0 ? (
            <div className="empty">暂无在售部件</div>
          ) : (
            <div className="order-list">
              {partView.map((o) => (
                <div className="order-row" key={o.id}>
                  <b style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <PartIcon type={(o.partType - 1) % 8} tier={Math.floor((o.partType - 1) / 8)} size={17} />
                    {partName(o.partType)}
                  </b>
                  <span className="muted">剩 {o.amount} · {shortAddr(o.seller)}</span>
                  <span className="price">
                    {num(Number(formatEther(o.price)), 2)}
                    <em style={{ fontStyle: "normal", fontSize: 10, color: "var(--tx-3)" }}> /件</em>
                  </span>
                  <button className="btn btn-primary" style={{ height: 32, padding: "0 14px", fontSize: 12 }}
                    disabled={busy || o.seller.toLowerCase() === account?.toLowerCase()} onClick={() => buyPart(o)}>
                    {o.seller.toLowerCase() === account?.toLowerCase() ? "我的" : "买 1 件"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      </div>

      <aside className="mk-side">
        <div className="sec-head" style={{ marginTop: 0 }}><b>我的挂单</b><span>{myPc.length + myParts.length} 条</span></div>
        {myPc.length + myParts.length === 0 ? (
          <div className="empty">暂无挂单</div>
        ) : (
          <div className="mk-side-list">
            {[...myPc.map((o) => ({ kind: "pc" as const, id: o.id, label: `PC #${o.tokenId}`, price: o.price })),
              ...myParts.map((o) => ({ kind: "part" as const, id: o.id, label: partName(o.partType), price: o.price }))].map((o, i) => (
              <div className="mk-side-row" key={i}>
                <b>{o.label}</b>
                <span>{num(Number(formatEther(o.price)), 2)}</span>
                <button className="btn btn-ghost" disabled={busy}
                  onClick={() => o.kind === "pc" ? delistPc([o.id]) : delistPart([o.id])}>撤</button>
              </div>
            ))}
            <button className="btn btn-ghost btn-block" disabled={busy}
              onClick={() => { if (myPc.length) delistPc(myPc.map((o) => o.id)); if (myParts.length) delistPart(myParts.map((o) => o.id)); }}>
              全部撤下
            </button>
          </div>
        )}
      </aside>
      </div>

      {msg && <p className="msg err">{msg}</p>}
      <DetailSheet detail={detail} onClose={() => setDetail(null)} onChanged={load} />
    </div>
  );
}
