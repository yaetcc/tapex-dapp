import { formatEther } from "ethers";

/** 千分位 + 最多 n 位小数 */
export function num(v: number, maxFrac = 4): string {
  if (!isFinite(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: maxFrac });
}

/** wei → 人类可读（大数用 K/M，保留 tooltip 原值由调用方处理） */
export function wei(bn: bigint | null | undefined, maxFrac = 4): string {
  if (bn == null) return "—";
  const v = Number(formatEther(bn));
  return num(v, maxFrac);
}

export function compact(v: number): string {
  if (!isFinite(v)) return "—";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num(v, 0);
}

export const shortAddr = (a?: string) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "");
