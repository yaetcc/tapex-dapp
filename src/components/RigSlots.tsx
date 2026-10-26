// 装配预览：与 RigArt 同一套坐标体系，8 个槽位按真实位置摆放
// 选中的档位 → 档位色实心；缺件 → 虚线灰框
const TIER_COLOR = ["#7FE0D6", "#00E5A0", "#FFD54D"];

type Props = { tiers: number[]; counts: number[]; size?: number; onHover?: (i: number | null) => void };

export function RigSlots({ tiers, counts, size = 300, onHover }: Props) {
  const stock = (i: number, tr: number) => counts[i + tr * 8] || 0;
  const ok = (i: number) => stock(i, tiers[i]) > 0;
  const col = (i: number) => TIER_COLOR[tiers[i]] ?? TIER_COLOR[0];
  const fp = (i: number, alpha = 0.16) => ({
    fill: ok(i) ? col(i) : "transparent",
    fillOpacity: ok(i) ? alpha : 0,
  });
  const stroke = (i: number) => (ok(i) ? col(i) : "#4a382f");
  const dash = (i: number) => (ok(i) ? "0" : "4 4");
  let total = 0;
  for (let i = 0; i < 8; i++) if (ok(i)) total++;

  return (
    <div className="rigslots" style={{ width: size }} onMouseLeave={() => onHover?.(null)}>
      <svg viewBox="0 0 220 260" width="100%" fill="none">
        <defs>
          <linearGradient id="rsBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a211d" /><stop offset="1" stopColor="#15100e" />
          </linearGradient>
          <pattern id="rsGrid" width="9" height="9" patternUnits="userSpaceOnUse">
            <path d="M0 0h9v9" stroke="#356b58" strokeWidth="0.4" opacity=".25" />
          </pattern>
        </defs>

        {/* 机箱（部件 8） */}
        <rect onMouseEnter={() => onHover?.(7)} x="8" y="6" width="204" height="248" rx="14"
          fill="url(#rsBody)" stroke={stroke(7)} strokeWidth="1.6" strokeDasharray={dash(7)} />
        <rect x="18" y="16" width="184" height="228" rx="10" fill="#ffffff" opacity=".025" stroke="#ffffff" strokeOpacity=".06" />

        {/* 主板（部件 2） */}
        <rect onMouseEnter={() => onHover?.(1)} x="36" y="22" width="154" height="148" rx="6" {...fp(1, 0.1)}
          stroke={stroke(1)} strokeWidth="1.2" strokeDasharray={dash(1)} />
        <rect x="36" y="22" width="154" height="148" rx="6" fill="url(#rsGrid)" />

        {/* CPU（部件 1） */}
        <rect onMouseEnter={() => onHover?.(0)} x="58" y="44" width="34" height="30" rx="3" {...fp(0)} stroke={stroke(0)} strokeWidth="1" strokeDasharray={dash(0)} />

        {/* 散热器（部件 7） */}
        <circle onMouseEnter={() => onHover?.(6)} cx="75" cy="59" r="23" {...fp(6, 0.1)} stroke={stroke(6)} strokeWidth="1.1" strokeDasharray={dash(6)} />

        {/* 内存 ×2（部件 4） */}
        <rect onMouseEnter={() => onHover?.(3)} x="104" y="44" width="5" height="48" rx="1.5" {...fp(3, 0.5)} stroke={stroke(3)} strokeWidth="0.8" strokeDasharray={dash(3)} />
        <rect x="113" y="44" width="5" height="48" rx="1.5" {...fp(3, 0.5)} stroke={stroke(3)} strokeWidth="0.8" strokeDasharray={dash(3)} />

        {/* 显卡（部件 3） */}
        <rect x="44" y="122" width="158" height="38" rx="5" {...fp(2)} stroke={stroke(2)} strokeWidth="1.4" strokeDasharray={dash(2)} />

        {/* SSD（部件 5） */}
        <rect onMouseEnter={() => onHover?.(4)} x="124" y="100" width="58" height="10" rx="2" {...fp(4, 0.35)} stroke={stroke(4)} strokeWidth="0.9" strokeDasharray={dash(4)} />

        {/* 电源（部件 6） */}
        <rect onMouseEnter={() => onHover?.(5)} x="28" y="202" width="104" height="40" rx="5" {...fp(5, 0.12)} stroke={stroke(5)} strokeWidth="1.1" strokeDasharray={dash(5)} />

        {/* 标签 */}
        <g fontSize="10">
          <text x="140" y="34" fill={ok(1) ? stroke(1) : "#6b5a50"}>主板</text>
          <text x="46" y="96" fill={ok(0) ? stroke(0) : "#6b5a50"}>CPU</text>
          <text x="84" y="96" fill={ok(6) ? stroke(6) : "#6b5a50"}>散热</text>
          <text x="104" y="38" fill={ok(3) ? stroke(3) : "#6b5a50"}>RAM</text>
          <text x="50" y="118" fill={ok(2) ? stroke(2) : "#6b5a50"}>GPU</text>
          <text x="184" y="108" fill={ok(4) ? stroke(4) : "#6b5a50"}>SSD</text>
          <text x="36" y="197" fill={ok(5) ? stroke(5) : "#6b5a50"}>电源</text>
          <text x="18" y="248" fill={ok(7) ? stroke(7) : "#6b5a50"}>机箱</text>
        </g>
      </svg>

      <div className="rigslots-badge">
        <b>{total}</b>/8 件已就位
      </div>
    </div>
  );
}
