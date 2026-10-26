import { useEffect, useRef, useState } from "react";

/** 数值滚动：值变化时 400ms ease-out 过渡；reduced-motion 直接跳 */
export function Num({ value, format }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);
  const fmt = format ?? ((n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 }));

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    if (reduce || !isFinite(value) || !isFinite(from)) { setShown(value); fromRef.current = value; return; }
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 400);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(from + (value - from) * e);
      if (k < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{fmt(shown)}</>;
}
