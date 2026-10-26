import { ensureChain } from "./wallet";
import { humanErr } from "./errors";

// 交易历史（localStorage 最近 8 条）
export type TxRecord = { label: string; status: "ok" | "err"; ts: number; error?: string };
export function pushHistory(r: TxRecord) {
  try {
    const list = JSON.parse(localStorage.getItem("tx_history") || "[]") as TxRecord[];
    localStorage.setItem("tx_history", JSON.stringify([r, ...list].slice(0, 8)));
  } catch {}
}
export function getHistory(): TxRecord[] {
  try { return JSON.parse(localStorage.getItem("tx_history") || "[]"); } catch { return []; }
}
export type TxState = { label: string; status: "pending" | "ok" | "err"; error?: string };
let listener: ((t: TxState | null) => void) | null = null;
let hideTimer: number | undefined;

export const onTx = (fn: (t: TxState | null) => void) => { listener = fn; return () => { listener = null; }; };
const push = (t: TxState | null) => listener?.(t);

export async function trackTx<T>(label: string, run: () => Promise<T>): Promise<T> {
  window.clearTimeout(hideTimer);
  push({ label, status: "pending" });
  try {
    await ensureChain();           // 每次写操作前确认网络，避免切链后交易失败
    const r = await run();
    push({ label, status: "ok" });
    pushHistory({ label, status: "ok", ts: Date.now() });
    hideTimer = window.setTimeout(() => push(null), 2600);
    return r;
  } catch (e) {
    const error = humanErr(e);
    push({ label, status: "err", error });
    pushHistory({ label, status: "err", ts: Date.now(), error });
    hideTimer = window.setTimeout(() => push(null), 5000);
    throw e;
  }
}
