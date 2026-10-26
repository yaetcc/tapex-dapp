// 背景氛围：三层光晕 + 星尘 + 网格（全部 CSS 动画，尊重 prefers-reduced-motion）
export function Atmosphere() {
  return (
    <div className="atmo" aria-hidden>
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
