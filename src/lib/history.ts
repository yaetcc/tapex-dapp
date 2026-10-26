// 本地操作记录（每台 PC 的时间线）
export type LogItem = { id: number; action: string; ts: number };
const KEY = "pc_history_v1";
export function logAction(id: number, action: string) {
  try {
    const all: LogItem[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    all.unshift({ id, action, ts: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 200)));
  } catch {}
}
export function getActions(id: number, limit = 4): LogItem[] {
  try {
    return (JSON.parse(localStorage.getItem(KEY) || "[]") as LogItem[]).filter((x) => x.id === id).slice(0, limit);
  } catch { return []; }
}
