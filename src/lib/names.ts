// PC 命名（本地存储）
const KEY = "pc_names_v1";
export function getNames(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function setName(id: number, name: string) {
  const m = getNames();
  if (name.trim()) m[String(id)] = name.trim().slice(0, 12);
  else delete m[String(id)];
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {}
}
