import { useCallback, useEffect, useState } from "react";
import { Contract, formatEther, parseEther } from "ethers";
import { ADDRS, ABI, PART_NAMES, TIERS, tierOf, typeOf } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { num, shortAddr } from "../lib/format";

const mkC = new Contract(ADDRS.market, ABI.market as unknown as string[], readProvider);
const tapeC = new Contract(ADDRS.tape, ABI.tape as unknown as string[], readProvider);
const partC = new Contract(ADDRS.part, ABI.part as unknown as string[], readProvider);

type PcOrder = { id: number; seller: string; price: bigint; tokenId: number };
type PartOrder = { id: number; seller: string; price: bigint; amount: number; partType: number };

const partName = (id: number) => `${PART_NAMES[typeOf(id)]} · ${TIERS[tierOf(id)]}`;

export function Market() {
  const { t, account, signer, toast } = useApp();
  const [mode, setMode] = useState<"pc" | "part">("pc");
  const [pc, setPc] = useState<PcOrder[]>([]);
  const [parts, setParts] = useState<PartOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellId, setSellId] = useState(""); const [sellPrice, setSellPrice] = useState("");
  const [ptType, setPtType] = useState(1); const [ptAmount, setPtAmount] = useState(""); const [ptPrice, setPtPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pcs, pts] = await Promise.all([
        mkC.activePCOrders() as Promise<{ seller: string; price: bigint; tokenId: bigint; active: boolean }[]>,
        mkC.activePartOrders() as Promise<{ seller: string; price: bigint; amount: bigint; partType: bigint; active: boolean }[]>,
      ]);
      setPc(pcs.map((o, i) => ({ id: i + 1, seller: o.seller, price: o.price, tokenId: Number(o.tokenId) })));
      setParts(pts.map((o, i) => ({ id: i + 1, seller: o.seller, price: o.price, amount: Number(o.amount), partType: Number(o.partType) })));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const withSigner = async (fn: () => Promise<unknown>) => {
    if (!signer || !account) return toast(t("err.noWallet"), "err");
    setBusy(true); setMsg("等待钱包确认…");
    try { await fn(); setMsg(""); await load(); }
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
      </div>

      {mode === "pc" ? (
        <>
          <div className="sell-row">
            <input className="field field-sm" placeholder="PC ID" value={sellId} onChange={(e) => setSellId(e.target.value.replace(/\D/g, ""))} />
            <input className="field field-sm" placeholder="价格 TAPE" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
            <button className="btn btn-ghost" disabled={busy || !sellId || !sellPrice} onClick={listPc}>挂单</button>
          </div>
          <div className="sec-head">
            <b>我的挂单</b><span>{myPc.length} 条</span><span className="spacer" />
            {myPc.length > 0 && (
              <button className="btn btn-ghost" disabled={busy} onClick={() => delistPc(myPc.map((o) => o.id))}>
                全部撤下
              </button>
            )}
          </div>
          {myPc.length > 0 && (
            <div className="order-list" style={{ marginBottom: 8 }}>
              {myPc.map((o) => (
                <div className="order-row" key={"m" + o.id}>
                  <b>PC #{o.tokenId}</b>
                  <span className="muted">#{o.id}</span>
                  <span className="price">{num(Number(formatEther(o.price)), 2)} TAPE</span>
                  <button className="btn btn-ghost" style={{ height: 30, padding: "0 12px", fontSize: 11.5 }}
                    disabled={busy} onClick={() => delistPc([o.id])}>撤单</button>
                </div>
              ))}
            </div>
          )}
          <div className="sec-head"><b>在售整机</b><span>{pc.length - myPc.length} 条</span></div>
          {loading ? <div className="skeleton" style={{ height: 90 }} /> : pc.length === 0 ? (
            <div className="empty">暂无在售整机</div>
          ) : (
            <div className="order-list">
              {pc.map((o) => (
                <div className="order-row" key={o.id}>
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
          <div className="sell-row">
            <select className="field field-sm" value={ptType} onChange={(e) => setPtType(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((id) => <option key={id} value={id}>{partName(id)}</option>)}
            </select>
            <input className="field field-sm" placeholder="数量" value={ptAmount} onChange={(e) => setPtAmount(e.target.value.replace(/\D/g, ""))} />
            <input className="field field-sm" placeholder="单价 TAPE" value={ptPrice} onChange={(e) => setPtPrice(e.target.value)} />
            <button className="btn btn-ghost" disabled={busy || !ptAmount || !ptPrice} onClick={listPart}>挂单</button>
          </div>
          <div className="sec-head">
            <b>我的部件挂单</b><span>{myParts.length} 条</span><span className="spacer" />
            {myParts.length > 0 && (
              <button className="btn btn-ghost" disabled={busy} onClick={() => delistPart(myParts.map((o) => o.id))}>
                全部撤下
              </button>
            )}
          </div>
          {myParts.length > 0 && (
            <div className="order-list" style={{ marginBottom: 8 }}>
              {myParts.map((o) => (
                <div className="order-row" key={"mp" + o.id}>
                  <b>{partName(o.partType)}</b>
                  <span className="muted">剩 {o.amount}</span>
                  <span className="price">{num(Number(formatEther(o.price)), 2)} TAPE</span>
                  <button className="btn btn-ghost" style={{ height: 30, padding: "0 12px", fontSize: 11.5 }}
                    disabled={busy} onClick={() => delistPart([o.id])}>撤单</button>
                </div>
              ))}
            </div>
          )}
          <div className="sec-head"><b>在售部件</b><span>{parts.length - myParts.length} 条</span></div>
          {loading ? <div className="skeleton" style={{ height: 90 }} /> : parts.length === 0 ? (
            <div className="empty">暂无在售部件</div>
          ) : (
            <div className="order-list">
              {parts.map((o) => (
                <div className="order-row" key={o.id}>
                  <b>{partName(o.partType)}</b>
                  <span className="muted">剩 {o.amount} · {shortAddr(o.seller)}</span>
                  <span className="price">{num(Number(formatEther(o.price)), 2)} TAPE</span>
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
      {msg && <p className="msg err">{msg}</p>}
    </div>
  );
}
