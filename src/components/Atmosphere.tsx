// 背景氛围：三层光晕 + 星尘 + 网格（全部 CSS 动画，尊重 prefers-reduced-motion）
import { useEffect, useRef } from "react";

export function Atmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY * 0.04, 60);
        ref.current?.style.setProperty("--par", `${y}px`);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="atmo" ref={ref} aria-hidden>
      <span className="orb o1" />
      <span className="orb o2" />
      <span className="orb o3" />
      <div className="dust d1" />
      <div className="dust d2" />
      <span className="arc" />
    </div>
  );
}

export function Stickers() {
  return (
    <div className="stickers" aria-hidden>
      <span className="sticker s1">WEN MOON? 🚀</span>
      <span className="sticker s2">2 THE MOON 🌙</span>
    </div>
  );
}
