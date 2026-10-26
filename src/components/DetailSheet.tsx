import { useEffect, useRef, useState } from "react";
import { Contract, formatEther, parseEther } from "ethers";
import { ADDRS, ABI, PART_NAMES, TIERS } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { num } from "../lib/format";
import { GradeBadge, GRADE_COLOR } from "./GradeBadge";
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
  const [tierSel, setTierSel] = useState<number | null>(null);

  const partTypeIdx = detail?.kind === "part" ? (detail.id - 1) % 8 : 0;
  const partTier = tierSel ?? (detail?.kind === "part" ? Math.floor((detail.id - 1) / 8) : 0);
  const effId = detail?.kind === "part" ? partTypeIdx + 1 + partTier * 8 : detail?.id ?? 0;

  useEffect(() => {
    if (!detail) return;
    setLoading(true); setError(""); setInfo(null); setPrice(""); setAmount("1"); setTierSel(null);
    let alive = true;
    const run = async () => {
      if (detail.kind === "pc") {
        const circ = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], readProvider);
        const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], readProvider);
        const [g, owner, staked, listed, orders] = await Promise.all([
          circ.getCircuitInfo(detail.id), circ.ownerOf(detail.id), circ.stakedOf(detail.id), circ.listedOf(detail.id), mk.activePCOrders(),
        ]);
        const pcIdx = orders.findIndex((o: any) => Number(o.tokenId) === detail.id && o.active);
        const mine = pcIdx >= 0 ? { ...orders[pcIdx], orderId: pcIdx + 1 } : null;
        if (!alive) return;
        setInfo({
          kind: "pc",
          hash: Number(g.hashRate), grade: Number(g.grade), tiers: Array.from(g.tiers as bigint[]).map(Number),
          owner, staked, listed, price: mine ? mine.price : null, orderId: mine ? mine.orderId : 0,
          owns: account?.toLowerCase() === String(owner).toLowerCase(),
        });
      } else {
        const part = new Contract(ADDRS.part, ABI.part as unknown as string[], readProvider);
        const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], readProvider);
        const [bal, orders] = await Promise.all([
          account ? part.balanceOf(account, effId) as Promise<bigint> : Promise.resolve(0n),
          mk.activePartOrders(),
        ]);
        // 合约返回全量数组（含已撤/已售完），这里按原始下标补 orderId 并只留 active
        const withId = orders.map((o: any, i: number) => ({ ...o, orderId: i + 1 }))
          .filter((o: any) => Number(o.partType) === effId && o.active && Number(o.amount) > 0);
        const mine = withId.filter((o: any) => o.seller.toLowerCase() === account?.toLowerCase());
        const others = withId.filter((o: any) => o.seller.toLowerCase() !== account?.toLowerCase());
        const floor = others.length ? others.reduce((m: bigint, o: any) => (o.price < m ? o.price : m), others[0].price) : null;
        if (!alive) return;
        setInfo({ kind: "part", bal: Number(bal), mine, floor, count: mine.length, owns: Number(bal) > 0 });
      }
    };
    run()
      .catch((e) => { if (alive) setError((e as Error).message.slice(0, 80)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [detail, account, effId]);

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
    return withTx(`撤单 PC #${detail.id}`, () => mk.delistPC([info.orderId]));
  };

  const partAct = (kind: "list" | "delist" | "buy") => {
    const mk = new Contract(ADDRS.market, ABI.market as unknown as string[], signer!);
    if (kind === "list") return withTx(`挂单 ${partName(effId)}`, async () => {
      const part = new Contract(ADDRS.part, ABI.part as unknown as string[], signer!);
      if (!(await part.isApprovedForAll(account, ADDRS.market))) await (await part.setApprovalForAll(ADDRS.market, true)).wait();
      return mk.listPart(effId, Number(amount || 1), parseEther(price || "0"));
    });
    if (kind === "delist") return withTx("撤单", () => mk.delistPart(info.mine.map((o: any) => o.orderId)));
    return withTx("购买", () => mk.buyPart(1, 1));
  };

  const close = () => { onClose(); };

  return (
    <div className="sheet-mask" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="sheet" ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true">
        <header className="sheet-hd">
          <div className="sheet-title">
            <b>{detail.kind === "pc" ? `PC #${detail.id}` : partName(effId)}</b>
            {info && detail.kind === "pc" && (
              <span className="sheet-tags">
                <GradeBadge hash={info.hash} />
                <span className={`sheet-state${info.staked ? " live" : info.listed ? " list" : ""}`}>
                  {info.staked ? "质押中" : info.listed ? "挂单中" : "待机"}
                </span>
              </span>
            )}
          </div>
          <button className="sheet-x" onClick={close} aria-label="关闭">✕</button>
        </header>

        {error ? (
          <div className="sheet-body"><p className="msg err">{error}</p></div>
        ) : loading || !info || info.kind !== detail.kind ? (
          <div className="sheet-body"><div className="skeleton" style={{ height: 160 }} /></div>
        ) : detail.kind === "pc" ? (
          <div className="sheet-body">
            <div className="sheet-hero" style={{ ["--gc" as string]: GRADE_COLOR[gradeOf(info.hash)] }}>
              <RigArt hash={info.hash} mining={info.staked} grade={info.grade} size={180} />
              <div className="sheet-stats">
                <div className="sheet-stat"><span>算力</span><b>{info.hash} <em>H</em></b></div>
                <div className="sheet-stat"><span>等级</span><b><GradeBadge hash={info.hash} size="md" /></b></div>
                <div className="sheet-stat"><span>旗舰件</span><b>{info.tiers.filter((x: number) => x >= 2).length}</b></div>
                <div className="sheet-stat"><span>Pro 件</span><b>{info.tiers.filter((x: number) => x === 1).length}</b></div>
              </div>
            </div>

            <div className="sheet-foot">
              {!info.owns ? (
                <p className="hint" style={{ margin: 0 }}>这台矿机不在你名下，仅可查看。</p>
              ) : info.staked ? (
                <button className="btn btn-primary btn-block" onClick={() => pcAct("unstake")}>解押</button>
              ) : info.listed ? (
                <>
                  <div className="sheet-price"><span>在售</span><b>{info.price ? num(Number(formatEther(info.price)), 2) : "—"} TAPE</b></div>
                  <button className="btn btn-primary btn-block" onClick={() => pcAct("delist")}>撤单</button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary btn-block" onClick={() => pcAct("stake")}>质押挖矿</button>
                  <div className="sheet-sell">
                    <input className="field field-sm" placeholder="挂单价格 TAPE" value={price} onChange={(e) => setPrice(e.target.value)} />
                    <button className="btn btn-ghost" disabled={!price} onClick={() => pcAct("list")}>挂单出售</button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="sheet-body">
            {detail.kind === "part" && (
              <div className="sheet-tiers">
                {TIERS.map((tn, ti) => (
                  <button key={tn} className={`pc-chip${partTier === ti ? " on" : ""}`} onClick={() => setTierSel(ti)}>
                    {tn}
                  </button>
                ))}
              </div>
            )}
            <div className="sheet-hero" style={{ ["--gc" as string]: TIER_COLOR[partTier] }}>
              <div className="part-big">
                <PartIcon type={partTypeIdx} tier={partTier} size={52} />
              </div>
              <div className="sheet-stats">
                <div className="sheet-stat"><span>持有</span><b>{info.bal} <em>件</em></b></div>
                <div className="sheet-stat"><span>市场最低</span><b>{info.floor ? num(Number(formatEther(info.floor)), 2) : "—"}</b></div>
                <div className="sheet-stat"><span>在售</span><b>{info.count} <em>条</em></b></div>
                <div className="sheet-stat"><span>档位</span><b>{TIERS[partTier]}</b></div>
              </div>
            </div>

            <div className="sheet-foot">
              {info.owns ? (
                <>
                  <div className="sheet-sell">
                    <input className="field field-sm" style={{ width: 70 }} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
                    <input className="field field-sm" placeholder="单价 TAPE" value={price} onChange={(e) => setPrice(e.target.value)} />
                    <button className="btn btn-primary" disabled={!price} onClick={() => partAct("list")}>挂单出售</button>
                  </div>
                  {info.mine.length > 0 && (
                    <button className="btn btn-ghost btn-block" onClick={() => partAct("delist")}>撤单（{info.mine.length} 条）</button>
                  )}
                </>
              ) : (
                <p className="hint" style={{ margin: 0 }}>
                  {info.count > 0 ? "你没有这件 —— 到市场页购买" : "你没有这件，市场也暂无在售"}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
