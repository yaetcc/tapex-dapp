import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ADDRS, ABI, PART_NAMES, TIERS } from "../lib/contracts";
import { readProvider } from "../lib/wallet";
import { useApp } from "../state/App";
import { compact, num } from "../lib/format";
import { PartIcon } from "../components/PartIcon";
import { RoiCalc } from "../components/RoiCalc";
import { trackTx } from "../lib/tx";

// 链上实测权重（CircuitV6.typeWeight）：CPU 18 / 主板 20 / GPU 18 / RAM 14 / SSD 12 / 电源 8 / 散热器 6 / 机箱 4
const ODD = [18, 20, 18, 14, 12, 8, 6, 4];
// 方向 A：概率条改用「金 → 中性」单色阶，不再引入粉/紫
const ODD_COLOR = ["#FFD54D", "#FFCB4A", "#F5B84A", "#E8A44E", "#D29250", "#B9835A", "#9C7A64", "#8A7870"];

const TIER_COLOR = ["#7FE0D6", "#00E5A0", "#FFD54D"];

type Counts = number[]; // 24
type Hit = { id: number; n: number };

const partC = new Contract(ADDRS.part, ABI.part as unknown as string[], readProvider);
const circC = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], readProvider);

export function Mint() {
  const { t, account, signer, toast } = useApp();
  const [fee, setFee] = useState<bigint>(0n);
  const [cap, setCap] = useState<{ total: bigint; minted: bigint } | null>(null);
  const [counts, setCounts] = useState<Counts>([]);
  const [qty, setQty] = useState("10");
  const [busy, setBusy] = useState(false);
  const [drawn, setDrawn] = useState(0);
  const [hits, setHits] = useState<Hit[] | null>(null);

  const loadCounts = useCallback(async () => {
    if (!account) return setCounts([]);
    const ids = Array.from({ length: 24 }, (_, i) => i + 1);
    const res = (await partC.balanceOfBatch(ids.map(() => account), ids)) as bigint[];
    setCounts(res.map((x) => Number(x)));
  }, [account]);

  useEffect(() => {
    circC.mintFee().then((f: bigint) => setFee(f)).catch(() => {});
    Promise.all([circC.maxMintTotal(), circC.mintedTotal()])
      .then(([a, b]: bigint[]) => setCap({ total: a, minted: b }))
      .catch(() => {});
  }, []);

  useEffect(() => { loadCounts().catch(() => {}); }, [loadCounts]);

  const n = Math.max(0, Math.min(10000, Number(qty) || 0));
  const unit = Number(formatEther(fee || 0n));
  const total = unit * n;
  const owned = counts.reduce((a, b) => a + b, 0);

  const draw = async () => {
    if (!signer || !account) return toast(t("err.noWallet"), "err");
    if (n < 1) return;
    setBusy(true);
    try {
      const before = counts.length ? counts : new Array(24).fill(0);
      const circ = new Contract(ADDRS.circuit, ABI.circuit as unknown as string[], signer);
      let left = n;
      while (left > 0) {
        const b = Math.min(left, 500);
        await trackTx(`抽卡 ${b} 件`, async () => {
          const tx = await circ.mint(b, { value: fee * BigInt(b) });
          await tx.wait();
        });
        left -= b;
      }
      const ids = Array.from({ length: 24 }, (_, i) => i + 1);
      const after = ((await partC.balanceOfBatch(ids.map(() => account), ids)) as bigint[]).map(Number);
      const got: Hit[] = [];
      after.forEach((v, i) => { const d = v - (before[i] || 0); if (d > 0) got.push({ id: i + 1, n: d }); });
      setCounts(after);
      setDrawn((d) => d + n);
      setHits(got.length ? got : [{ id: 0, n }]);
      toast(`${t("mint.ok")} · ${n}`, "ok");
    } catch (e) {
      toast((e as Error).message.slice(0, 80), "err");
    } finally {
      setBusy(false);
    }
  };

  const sumText = useMemo(() => {
    if (!hits) return "";
    const c = [0, 0, 0];
    hits.forEach((h) => { if (h.id) c[Math.floor((h.id - 1) / 8)] += h.n; });
    const parts = hits.reduce((a, h) => a + h.n, 0);
    let s = `${parts} 件`;
    if (c[2]) s += ` · ${TIERS[2]}×${c[2]}`;
    if (c[1]) s += ` · ${TIERS[1]}×${c[1]}`;
    if (c[0]) s += ` · ${TIERS[0]}×${c[0]}`;
    return s;
  }, [hits]);

  return (
    <>
      <div className="card">
        <div className="mint-hero">
          <div>
            <span className="kicker">STEP 01 · MINT</span>
            <h2>{t("mint.title")}</h2>
            <p className="sub">{t("mint.sub")}</p>

            <div className="tiles" style={{ marginTop: 18 }}>
              <div className="tile"><span>{t("mint.unit")}</span><b>{unit.toFixed(4)} <em>OKB</em></b></div>
              <div className="tile"><span>{t("mint.drawn")}</span><b>{num(drawn, 0)}</b></div>
              <div className="tile"><span>{t("mint.owned")}</span><b>{num(owned, 0)}</b></div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="sec-head" style={{ margin: "0 0 8px" }}>
                <b>{t("mint.progress")}</b>
                <span className="spacer" />
                <span style={{ fontFamily: "var(--mono)", color: "var(--gold)" }}>
                  {cap ? `${compact(Number(cap.minted))} / ${compact(Number(cap.total))}` : "—"}
                </span>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
                <i style={{
                  display: "block", height: "100%", borderRadius: 999,
                  width: cap && cap.total > 0n ? `${Number((cap.minted * 10000n) / cap.total) / 100}%` : "0%",
                  background: "linear-gradient(90deg,#FFD93D,#00E5A0)",
                  boxShadow: "0 0 12px rgba(255,217,61,.32)",
                  transition: "width .6s cubic-bezier(.22,1,.36,1)",
                }} />
              </div>
              <p className="hint" style={{ marginTop: 7 }}>{t("mint.progressSub")}</p>
            </div>
          </div>

          <div className="mint-console">
            <div className="console-h"><i /><span>{t("mint.panel")}</span><i /></div>
            <label className="hint" style={{ display: "block", marginBottom: 7 }}>{t("mint.qty")}</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input className="field" style={{ width: 104 }} value={qty} inputMode="numeric"
                onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} />
              <div style={{ display: "flex", gap: 5, flex: 1 }}>
                {[1, 10, 100, 1000].map((v) => (
                  <button key={v} className="btn btn-ghost" style={{ flex: 1, minWidth: 0 }}
                    onClick={() => setQty(String(v))}>{v}</button>
                ))}
              </div>
            </div>
            <p className="hint" style={{ marginTop: 9 }}>{t("mint.qtyNote")}</p>
            <div className="console-total">
              <span>{t("mint.pay")}</span>
              <b>{n ? `${n} × ${unit.toFixed(4)} = ${total.toFixed(4)} OKB` : `${unit.toFixed(4)} OKB / 件`}</b>
            </div>
            <button className="btn btn-primary btn-block" disabled={busy || n < 1} onClick={draw}>
              {busy ? t("mint.busy") : `${t("mint.draw")} ${n || 1} 件`}
            </button>
          </div>
        </div>

        <RoiCalc mintFee={unit} assembleFee={100} />

        <div className="sec-head"><b>{t("mint.odds")}</b><span>{t("mint.oddsSub")}</span></div>
        <div style={{ display: "flex", height: 9, borderRadius: 999, overflow: "hidden", gap: 2 }}>
          {ODD.map((p, i) => (
            <i key={i} style={{ width: `${p}%`, background: ODD_COLOR[i], opacity: 0.9 }} title={`${PART_NAMES[i]} ${p}%`} />
          ))}
        </div>
        <div className="odds-legend">
          {ODD.map((p, i) => (
            <span key={i}><i style={{ background: ODD_COLOR[i] }} />{PART_NAMES[i]}<b>{p}%</b></span>
          ))}
        </div>

        <div className="sec-head"><b>{t("mint.rack")}</b><span className="spacer" /></div>
        <div className="rack">
          {PART_NAMES.map((name, i) => {
            const s = counts[i] || 0, p = counts[i + 8] || 0, f = counts[i + 16] || 0;
            const tot = s + p + f;
            return (
              <div key={name} className={`rack-cell${tot ? " has" : ""}`}>
                <span style={{ marginBottom: 4, display: "inline-flex" }}>
                  <PartIcon type={i} muted={!tot} size={24} />
                </span>
                <em>{name}</em>
                <b>{tot}</b>
                <div className="rack-tiers">
                  {s > 0 && <i className="t0">{TIERS[0]} {s}</i>}
                  {p > 0 && <i className="t1">Pro {p}</i>}
                  {f > 0 && <i className="t2">{TIERS[2]} {f}</i>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hits && (
        <div className="reveal" onClick={() => setHits(null)}>
          <div className="reveal-cards">
            {hits.slice(0, 6).map((h, idx) => {
              const type = h.id ? ((h.id - 1) % 8) : -1;
              const tier = h.id ? Math.floor((h.id - 1) / 8) : 0;
              const col = h.id ? TIER_COLOR[tier] : "#FF9F45";
              return (
                <div key={idx} className="reveal-card" style={{ borderColor: col, boxShadow: `0 18px 46px rgba(5,8,15,.6), 0 0 30px ${col}55`, animationDelay: `${idx * 0.12}s` }}>
                  <em>NEW</em>
                  <b style={{ color: col }}>{type >= 0 ? PART_NAMES[type] : t("mint.openBox")}</b>
                  <span style={{ color: col }}>{type >= 0 ? TIERS[tier] : ""} {h.n > 1 ? `× ${h.n}` : ""}</span>
                </div>
              );
            })}
          </div>
          <div className="reveal-sum">{t("mint.got")} {sumText}</div>
        </div>
      )}
    </>
  );
}
