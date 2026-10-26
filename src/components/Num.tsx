import { useEffect, useRef, useState } from "react";

/** 数值滚动：400ms ease-out + 轻微回弹（超调 3%） */
export function Num({ value, format }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);
  const fmt = format ?? ((n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 }));

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    if (reduce || !isFinite(value) || !isFinite(from)) { setShown(value); fromRef.current = value; return; }
    const delta = value - from;
    if (Math.abs(delta) < 1e-9) return;
    const t0 = performance.now();
    const dur = 420;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      // ease-out-back 轻微回弹
      const c1 = 1.15, c3 = c1 + 1;
      const e = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
      setShown(from + delta * Math.min(e, 1.02));
      if (k < 1) rafRef.current = requestAnimationFrame(step);
      else { setShown(value); fromRef.current = value; }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{fmt(shown)}</>;
}
