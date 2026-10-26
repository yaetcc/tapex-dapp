// 极简 TTL 缓存 + 并发合并：同一 key 在 ttl 内只请求一次
type Entry = { at: number; v: unknown };
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ttlMs) return hit.v as T;
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const p = (async () => {
    try {
      const v = await fn();
      store.set(key, { at: Date.now(), v });
      return v;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p as Promise<T>;
}

/** 静态参数（费用/权重/费率）缓存 1 天 */
export const cachedStatic = <T>(key: string, fn: () => Promise<T>) => cached(key, 24 * 3600_000, fn);
/** 行情类缓存 30s */
export const cachedLive = <T>(key: string, fn: () => Promise<T>) => cached(key, 30_000, fn);
