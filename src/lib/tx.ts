// 全局交易状态：pending → ok / err，供底部状态条订阅
export type TxState = { label: string; status: "pending" | "ok" | "err"; error?: string };
let listener: ((t: TxState | null) => void) | null = null;
let hideTimer: number | undefined;

export const onTx = (fn: (t: TxState | null) => void) => { listener = fn; return () => { listener = null; }; };
const push = (t: TxState | null) => listener?.(t);

export async function trackTx<T>(label: string, run: () => Promise<T>): Promise<T> {
  window.clearTimeout(hideTimer);
  push({ label, status: "pending" });
  try {
    const r = await run();
    push({ label, status: "ok" });
    hideTimer = window.setTimeout(() => push(null), 2600);
    return r;
  } catch (e) {
    push({ label, status: "err", error: (e as Error).message.slice(0, 90) });
    hideTimer = window.setTimeout(() => push(null), 5000);
    throw e;
  }
}
