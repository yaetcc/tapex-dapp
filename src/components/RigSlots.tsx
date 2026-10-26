// 装配预览：把 8 类部件放进机箱的真实位置，选中的档位点亮、缺件显示虚框
const TIER_COLOR = ["#7FE0D6", "#00E5A0", "#FFD54D"];

type Props = { tiers: number[]; counts: number[]; size?: number };

export function RigSlots({ tiers, counts, size = 300 }: Props) {
  const stock = (i: number, tr: number) => counts[i + tr * 8] || 0;
  const ok = (i: number) => stock(i, tiers[i]) > 0;
  const col = (i: number) => TIER_COLOR[tiers[i]] ?? TIER_COLOR[0];
  let total = 0;
  for (let i = 0; i < 8; i++) if (ok(i)) total++;

  return (
    <div className="rigslots" style={{ width: size }}>
      <svg viewBox="0 0 220 260" width="100%" fill="none">
        {/* 机箱 */}
        <rect x="8" y="6" width="204" height="248" rx="14" fill="url(#caseBody)" stroke="#3a2c26" strokeWidth="2" />
        <rect x="18" y="16" width="184" height="200" rx="10" fill="#ffffff" opacity=".03" stroke="#ffffff" strokeOpacity=".06" />

        {/* 主板（背景区域） */}
        <rect x="28" y="26" width="118" height="126" rx="8"
          fill={ok(1) ? col(1) : "#1a1512"} fillOpacity={ok(1) ? 0.12 : 0.5}
          stroke={ok(1) ? col(1) : "#3a2c26"} strokeWidth="1.5" strokeDasharray={ok(1) ? "0" : "4 4"} />
        <text x="34" y="42" fontSize="9" fill={ok(1) ? col(1) : "#6b5a50"}>主板</text>

        {/* CPU 插槽 */}
        <rect x="46" y="52" width="34" height="30" rx="4"
          fill={ok(0) ? col(0) : "transparent"} fillOpacity={ok(0) ? 0.18 : 0}
          stroke={ok(0) ? col(0) : "#4a382f"} strokeDasharray={ok(0) ? "0" : "3 3"} />
        <text x="52" y="71" fontSize="7" fill={ok(0) ? col(0) : "#6b5a50"}>CPU</text>

        {/* 散热器（CPU 上方的圆） */}
        <circle cx="63" cy="67" r="21" stroke={ok(6) ? col(6) : "#4a382f"} strokeDasharray={ok(6) ? "0" : "3 3"}
          strokeWidth="1.2" opacity={ok(6) ? 0.75 : 1} />
        {ok(6) && <circle cx="63" cy="67" r="21" fill={col(6)} opacity=".08" />}

        {/* 内存 ×2 */}
        {[0, 1].map((k) => (
          <rect key={k} x={90 + k * 12} y="52" width="8" height="46" rx="2"
            fill={ok(3) ? col(3) : "transparent"} fillOpacity={ok(3) ? 0.2 : 0}
            stroke={ok(3) ? col(3) : "#4a382f"} strokeDasharray={ok(3) ? "0" : "3 3"} />
        ))}
        <text x="88" y="110" fontSize="7" fill={ok(3) ? col(3) : "#6b5a50"}>RAM</text>

        {/* 芯片组 */}
        <rect x="112" y="60" width="28" height="26" rx="4" fill="#152320" stroke="#3f7f68" opacity=".7" />

        {/* 显卡 */}
        <rect x="34" y="124" width="150" height="24" rx="4"
          fill={ok(2) ? col(2) : "transparent"} fillOpacity={ok(2) ? 0.16 : 0}
          stroke={ok(2) ? col(2) : "#4a382f"} strokeWidth="1.4" strokeDasharray={ok(2) ? "0" : "4 4"} />
        {[51, 93, 135].map((cx) => (
          <circle key={cx} cx={cx} cy="136" r="7" stroke={ok(2) ? col(2) : "#4a382f"} strokeWidth="1"
            opacity={ok(2) ? 0.9 : 0.6} />
        ))}
        <text x="160" y="140" fontSize="7" fill={ok(2) ? col(2) : "#6b5a50"}>GPU</text>

        {/* SSD ×2 */}
        {[0, 1].map((k) => (
          <rect key={k} x={128 + k * 28} y="160" width="24" height="20" rx="3"
            fill={ok(4) ? col(4) : "transparent"} fillOpacity={ok(4) ? 0.18 : 0}
            stroke={ok(4) ? col(4) : "#4a382f"} strokeDasharray={ok(4) ? "0" : "3 3"} />
        ))}
        <text x="128" y="192" fontSize="7" fill={ok(4) ? col(4) : "#6b5a50"}>SSD</text>

        {/* 电源 */}
        <rect x="30" y="160" width="86" height="44" rx="5"
          fill={ok(5) ? col(5) : "transparent"} fillOpacity={ok(5) ? 0.12 : 0}
          stroke={ok(5) ? col(5) : "#4a382f"} strokeDasharray={ok(5) ? "0" : "4 4"} />
        <circle cx="46" cy="182" r="8" stroke={ok(5) ? col(5) : "#4a382f"} strokeWidth="1" opacity=".8" />
        <text x="60" y="186" fontSize="7" fill={ok(5) ? col(5) : "#6b5a50"}>电源</text>

        {/* 机箱标记（底部） */}
        <text x="18" y="244" fontSize="7" fill={ok(7) ? col(7) : "#6b5a50"}>机箱</text>
        <rect x="18" y="222" width="184" height="3" rx="1.5"
          fill={ok(7) ? col(7) : "#3a2c26"} opacity={ok(7) ? 0.9 : 0.5} />
      </svg>

      <div className="rigslots-badge">
        <b>{total}</b>/8 件已就位
      </div>
    </div>
  );
}
