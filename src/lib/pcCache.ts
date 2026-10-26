// PC 的算力/等级由 tokenId 决定，永不变更 —— 缓存到 localStorage，减少重复 RPC
export type PcMeta = { hash: number; grade: number };
const KEY = "pc_meta_cache_v1";

export function loadCache(): Record<string, PcMeta> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function saveCache(map: Record<string, PcMeta>) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}

export function putCache(id: number, meta: PcMeta) {
  const c = loadCache();
  c[String(id)] = meta;
  saveCache(c);
}
