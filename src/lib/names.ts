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

/** 每台机器固定的灯光色相（0 金 / 1 青 / 2 琥珀） */
export function getHue(id: number): number {
  return (id * 7 + 3) % 3;
}
/** 机箱形态变体 0 中塔 / 1 海景房 / 2 ITX */
export function getVariant(id: number): number {
  return id % 3;
}
