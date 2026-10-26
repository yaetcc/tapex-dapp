import { useEffect, useRef, useState } from "react";
import { Contract, formatEther, parseEther } from "ethers";
import { ADDRS, ABI, PART_NAMES, TIERS } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { num } from "../lib/format";
import { gradeOf } from "../lib/contracts";
import { trackTx } from "../lib/tx";
import { RigArt } from "./RigArt";
import { PartIcon } from "./PartIcon";

export type Detail = { kind: "pc" | "part"; id: number } | null;

const partName = (id: number) => `${PART_NAMES[(id - 1) % 8]} · ${TIERS[Math.floor((id - 1) / 8)]}`;
const TIER_COLOR = ["#7FE0D6", "#00E5A0", "#FFD54D"];

export function DetailSheet({ detail, onClose, onChanged }: {
  detail: Detail; onClose: () => void; onChanged?: () => void;
}) {
  const { account, signer, toast } = useApp();
  const boxRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<any>(null);
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("1");

  useEffect(() => {
    if (!detail) return;
    setLoading(true); setError(""); setInfo(null); setPrice(""); setAmount("1");
    const run = async () => {
      if (detail.kind === "pc") {
        const circ = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], readProvider);
        const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], readProvider);
        const [g, owner, staked, listed, orders] = await Promise.all([
          circ.getCircuitInfo(detail.id), circ.ownerOf(detail.id), circ.stakedOf(detail.id), circ.listedOf(detail.id), mk.activePCOrders(),
        ]);
        const mine = orders.find((o: any) => Number(o.tokenId) === detail.id && o.active);
        setInfo({
          hash: Number(g.hashRate), grade: Number(g.grade), tiers: Array.from(g.tiers as bigint[]).map(Number),
          owner, staked, listed, price: mine ? mine.price : null,
          owns: account?.toLowerCase() === String(owner).toLowerCase(),
        });
      } else {
        const part = new Contract(ADDRS.part, ABI.part as unknown as string[], readProvider);
        const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], readProvider);
        const [bal, orders] = await Promise.all([
          account ? part.balanceOf(account, detail.id) as Promise<bigint> : Promise.resolve(0n),
          mk.activePartOrders(),
        ]);
        const mine = orders.filter((o: any) => Number(o.partType) === detail.id && o.active);
        const others = mine.filter((o: any) => o.seller.toLowerCase() !== account?.toLowerCase());
        const floor = others.length ? others.reduce((m: bigint, o: any) => (o.price < m ? o.price : m), others[0].price) : null;
        setInfo({ bal: Number(bal), mine, floor, count: mine.length, owns: Number(bal) > 0 });
      }
    };
    run().catch((e) => setError((e as Error).message.slice(0, 80))).finally(() => setLoading(false));
  }, [detail, account]);

  // Esc 关闭 + 锁滚动 + 焦点
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab") return;
      const box = boxRef.current;
      if (!box) return;
      const items = box.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    boxRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [detail, onClose]);

  if (!detail) return null;

  const withTx = async (label: string, fn: () => Promise<unknown>) => {
    if (!signer) return toast("请先连接钱包", "err");
    try { await trackTx(label, async () => { const t: any = await fn(); await t.wait(); }); onChanged?.(); }
    catch (e) { /* trackTx 已提示 */ }
  };

  const pcAct = (kind: "stake" | "unstake" | "list" | "delist") => {
    const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], signer!);
    const mine = new Contract(ADDRS.mining, ABI.mining as unknown as string[], signer!);
    if (kind === "stake") return withTx(`质押 PC #${detail.id}`, () => mine.stake(detail.id));
    if (kind === "unstake") return withTx(`解押 PC #${detail.id}`, () => mine.unstake(detail.id));
    if (kind === "list") return withTx(`挂单 PC #${detail.id}`, () => mk.listPC(detail.id, parseEther(price || "0")));
    return withTx(`撤单 PC #${detail.id}`, () => mk.delistPC([info?.orderId ?? 0]));
  };

  const partAct = (kind: "list" | "delist" | "buy") => {
    const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], signer!);
    if (kind === "list") return withTx(`挂单 ${partName(detail.id)}`, async () => {
      const part = new Contract(ADDRS.part, ABI.part as unknown as string[], signer!);
      if (!(await part.isApprovedForAll(account, ADDRS.market))) await (await part.setApprovalForAll(ADDRS.market, true)).wait();
      return mk.listPart(detail.id, Number(amount || 1), parseEther(price || "0"));
    });
    if (kind === "delist") return withTx("撤单", () => mk.delistPart(info.mine.map((o: any, i: number) => i + 1)));
    return withTx("购买", () => mk.buyPart(1, 1));
  };

  const close = () => { onClose(); };

  return (
    <div className="sheet-mask" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="sheet" ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true">
        <header className="sheet-hd">
          <b>{detail.kind === "pc" ? `PC #${detail.id}` : partName(detail.id)}</b>
          <button className="sheet-x" onClick={close} aria-label="关闭">✕</button>
        </header>

        {error ? (
          <div className="sheet-body"><p className="msg err">{error}</p></div>
        ) : loading || !info ? (
          <div className="sheet-body"><div className="skeleton" style={{ height: 160 }} /></div>
        ) : detail.kind === "pc" ? (
          <div className="sheet-body">
            <div className="sheet-hero">
              <RigArt hash={info.hash} mining={info.staked} grade={info.grade} size={190} />
              <div className="sheet-kv">
                <div><span>算力</span><b>{info.hash} H</b></div>
                <div><span>等级</span><b>{gradeOf(info.hash)}</b></div>
                <div><span>档位</span><b>旗舰×{info.tiers.filter((x: number) => x >= 2).length} · Pro×{info.tiers.filter((x: number) => x === 1).length}</b></div>
                <div><span>状态</span><b>{info.staked ? "质押中" : info.listed ? "挂单中" : "待机"}</b></div>
              </div>
            </div>

            <div className="sheet-acts">
              {!info.owns ? <span className="hint">不是你的矿机，只读</span> : info.staked ? (
                <button className="btn btn-primary" onClick={() => pcAct("unstake")}>解押</button>
              ) : info.listed ? (
                <>
                  <span className="hint">在售 {info.price ? num(Number(formatEther(info.price)), 2) : "—"} TAPE</span>
                  <button className="btn btn-primary" onClick={() => pcAct("delist")}>撤单</button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={() => pcAct("stake")}>质押挖矿</button>
                  <div className="sheet-inline">
                    <input className="field field-sm" placeholder="价格 TAPE" value={price} onChange={(e) => setPrice(e.target.value)} />
                    <button className="btn btn-ghost" disabled={!price} onClick={() => pcAct("list")}>挂单出售</button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="sheet-body">
            <div className="sheet-hero">
              <div className="part-big" style={{ borderColor: TIER_COLOR[Math.floor((detail.id - 1) / 8)] }}>
                <PartIcon type={(detail.id - 1) % 8} tier={Math.floor((detail.id - 1) / 8)} size={46} />
                <b>{PART_NAMES[(detail.id - 1) % 8]}</b>
                <span style={{ color: TIER_COLOR[Math.floor((detail.id - 1) / 8)] }}>{TIERS[Math.floor((detail.id - 1) / 8)]}</span>
              </div>
              <div className="sheet-kv">
                <div><span>持有</span><b>{info.bal} 件</b></div>
                <div><span>市场最低</span><b>{info.floor ? num(Number(formatEther(info.floor)), 2) + " TAPE" : "—"}</b></div>
                <div><span>在售</span><b>{info.count} 条</b></div>
              </div>
            </div>

            <div className="sheet-acts">
              {info.owns ? (
                <>
                  <div className="sheet-inline">
                    <input className="field field-sm" style={{ width: 68 }} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
                    <input className="field field-sm" placeholder="单价 TAPE" value={price} onChange={(e) => setPrice(e.target.value)} />
                    <button className="btn btn-primary" disabled={!price} onClick={() => partAct("list")}>挂单出售</button>
                  </div>
                  {info.mine.length > 0 && <button className="btn btn-ghost" onClick={() => partAct("delist")}>撤单（{info.mine.length} 条）</button>}
                </>
              ) : (
                <span className="hint">{info.count > 0 ? "你没有这件 —— 到市场页购买" : "你没有这件，市场也没有在售"}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
