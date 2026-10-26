import { useEffect, useState } from "react";
// 真实感矿机插画：机箱 + 三风扇 + GPU + 主板 + 电源 + 内存 + SSD
// mining=true 时风扇旋转、灯带呼吸、热量上升；hashRate 影响转速
export function RigArt({
  hash = 0, mining = false, grade = 3, size = 260,
}: { hash?: number; mining?: boolean; grade?: number; size?: number }) {
  // 负载波动：基础转速 + 每 4s 微调 ±8%，模拟真实矿机噪声起伏
  const base = mining ? Math.max(0.45, 1.4 - Math.min(hash, 300) / 300) : 0;
  const [jit, setJit] = useState(1);
  useEffect(() => {
    if (!mining) return;
    const t = setInterval(() => setJit(0.92 + Math.random() * 0.16), 4000);
    return () => clearInterval(t);
  }, [mining]);
  const speed = base * jit;
  const GCOLOR: Record<number, string> = { 3: "#9A8E86", 4: "#7FE0D6", 5: "#00E5A0", 6: "#FFD54D" };
  const glow = GCOLOR[grade] ?? "#7FE0D6";
  return (
    <div className={`rig${mining ? " on" : ""}`} style={{ width: size, ["--spin" as string]: `${speed}s`, ["--glow" as string]: glow }}>
      <svg viewBox="0 0 220 260" width="100%" height="100%" fill="none">
        <defs>
          <linearGradient id="caseBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a211d" /><stop offset="1" stopColor="#15100e" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".10" /><stop offset=".6" stopColor="#ffffff" stopOpacity=".02" />
          </linearGradient>
          <linearGradient id="pcb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d3b32" /><stop offset="1" stopColor="#12241f" />
          </linearGradient>
          <radialGradient id="led" cx="50%" cy="50%">
            <stop offset="0" stopColor="var(--glow)" stopOpacity=".9" /><stop offset="1" stopColor="var(--glow)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 机箱外壳：S 级 = 开放式框架（无侧板） */}
        <rect x="8" y="6" width="204" height="248" rx="14" fill="url(#caseBody)" stroke="#3a2c26" strokeWidth="2" />
        {grade >= 6 ? (
          <>
            {/* 开放式：四角立柱 + 上下横梁 */}
            <rect x="8" y="6" width="10" height="248" rx="4" fill="#241a16" stroke="#3a2c26" />
            <rect x="202" y="6" width="10" height="248" rx="4" fill="#241a16" stroke="#3a2c26" />
            <rect x="8" y="6" width="204" height="8" rx="4" fill="#241a16" stroke="#3a2c26" />
            <rect x="8" y="246" width="204" height="8" rx="4" fill="#241a16" stroke="#3a2c26" />
          </>
        ) : grade >= 5 ? (
          <>
            {/* 全侧透：玻璃铺满 */}
            <rect x="14" y="12" width="192" height="236" rx="10" fill="url(#glass)" stroke="#ffffff" strokeOpacity=".10" />
            {/* 前部金属冲孔网 */}
            <rect x="14" y="12" width="16" height="236" rx="8" fill="#171110" stroke="#3a2c26" />
            <g fill="#4a3a32" opacity=".85">
              {Array.from({ length: 11 }, (_, r) => (
                <g key={r}>
                  <circle cx="18.5" cy={26 + r * 20} r="1.5" />
                  <circle cx="23" cy={26 + r * 20} r="1.5" />
                  <circle cx="27.5" cy={26 + r * 20} r="1.5" />
                </g>
              ))}
            </g>
            {/* 顶部提手 */}
            <path d="M78 8 h64" stroke="#6b5344" strokeWidth="5" strokeLinecap="round" />
            <path d="M78 8 v-4 M142 8 v-4" stroke="#6b5344" strokeWidth="5" strokeLinecap="round" />
            {/* 前部竖向灯条 */}
            <rect x="31" y="26" width="3" height="196" rx="1.5" fill="var(--glow)" opacity=".75" />
          </>
        ) : grade >= 4 ? (
          /* 侧透：内窗，四周留金属框 */
          <rect x="18" y="16" width="184" height="200" rx="10" fill="url(#glass)" stroke="#ffffff" strokeOpacity=".06" />
        ) : (
          /* 铁皮侧板：内部完全遮住 */
          <rect x="16" y="14" width="188" height="204" rx="8" fill="#231b17" stroke="#3a2c26" />
        )}

        <g opacity={grade >= 4 ? 1 : 0}>
        {/* 主板 */}
        <rect x="30" y="26" width="112" height="118" rx="6" fill="url(#pcb)" stroke="#2c5c4c" strokeWidth="1" />
        <rect x="38" y="34" width="30" height="26" rx="3" fill="#0f1a17" stroke="#356b58" />
        <rect x="76" y="34" width="20" height="26" rx="2" fill="#0f1a17" stroke="#356b58" />
        <rect x="104" y="34" width="30" height="26" rx="3" fill="#0f1a17" stroke="#356b58" />
        {/* 内存条 */}
        {[0, 1].map((i) => (
          <rect key={i} x={38 + i * 12} y="68" width="8" height="42" rx="2" fill="#22302c" stroke="#3d7a63" />
        ))}
        {/* 芯片组 */}
        <rect x="70" y="76" width="34" height="30" rx="4" fill="#152320" stroke="#3f7f68" />
        <path d="M74 82h26M74 88h26M74 94h26M74 100h26" stroke="#2c5548" strokeWidth="1.2" />

        {/* 顶部风扇（机箱风道） */}
        <g stroke="#2f2622">
          <circle cx="150" cy="52" r="20" fill="#120e0c" />
          <circle cx="150" cy="52" r="20" fill="none" stroke="#3a2c26" />
        </g>
        <g className="fan-blades" style={{ transformOrigin: "150px 52px" }}>
          {[0, 120, 240].map((a) => (
            <ellipse key={a} cx="150" cy="44" rx="5" ry="12" fill="#5e4a3d" transform={`rotate(${a} 150 52)`} opacity=".85" />
          ))}
        </g>

        {/* 显卡 */}
        <rect x="34" y="118" width="150" height="22" rx="4" fill="#241a16" stroke="#5a463a" />
        <rect x="38" y="122" width="34" height="14" rx="2" fill="#1a1310" stroke="#6b5344" />
        <rect x="76" y="122" width="34" height="14" rx="2" fill="#1a1310" stroke="#6b5344" />
        <rect x="114" y="122" width="34" height="14" rx="2" fill="#1a1310" stroke="#6b5344" />
        <rect x="152" y="122" width="26" height="14" rx="2" fill="#1a1310" stroke="#6b5344" />

        {/* 三风扇（显卡） */}
        {[51, 93, 135].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="129" r="7" fill="none" stroke="#6b5344" strokeWidth="1.2" />
            <g className="fan-blades" style={{ transformOrigin: `${cx}px 129px` }}>
              {[0, 120, 240].map((a) => (
                <ellipse key={a} cx={cx} cy={125} rx="2" ry="5" fill="#8a6d59" transform={`rotate(${a} ${cx} 129)`} opacity=".9" />
              ))}
            </g>
          </g>
        ))}

        </g>

        {/* 电源仓 + SSD */}
        <rect x="30" y="156" width="90" height="52" rx="5" fill="#1b1512" stroke="#40302a" />
        <rect x="36" y="162" width="78" height="14" rx="3" fill="#241a16" stroke="#4a382f" />
        <circle cx="44" cy="196" r="7" fill="none" stroke="#4a382f" />
        <g className="fan-blades" style={{ transformOrigin: "44px 196px" }}>
          {[0, 120, 240].map((a) => (
            <ellipse key={a} cx="44" cy="192.5" rx="1.8" ry="4" fill="#6b5344" transform={`rotate(${a} 44 196)`} />
          ))}
        </g>
        <rect x="128" y="156" width="52" height="24" rx="3" fill="#241a16" stroke="#4a382f" />
        <rect x="128" y="184" width="52" height="24" rx="3" fill="#241a16" stroke="#4a382f" />

        {/* A 级：竖装显卡 */}
        {grade >= 5 && (
          <g>
            <rect x="128" y="96" width="26" height="112" rx="4" fill="#241a16" stroke="#5a463a" />
            {[0, 1, 2].map((k) => (
              <circle key={k} cx="141" cy={112 + k * 30} r="9" fill="none" stroke="#6b5344" strokeWidth="1.2" />
            ))}
          </g>
        )}

        {/* S 级：顶部冷排 + 双灯带（开放式框架已在外壳分支处理） */}
        {grade >= 6 && (
          <g>
            <rect x="52" y="10" width="116" height="4" rx="2" fill="var(--glow)" opacity=".55" />
            <rect x="52" y="16" width="116" height="4" rx="2" fill="var(--glow)" opacity=".3" />
          </g>
        )}

        {/* 灯带 + 光晕 */}
        {grade >= 4 && (
          <>
            <rect x="18" y="222" width="184" height="3" rx="1.5" className="led-strip" fill="var(--glow)" opacity=".8" />
            <ellipse cx="110" cy="232" rx="86" ry="22" fill="url(#led)" className="led-glow" />
          </>
        )}

        {/* 玻璃反光 */}
        <path d="M18 16h40L18 96z" fill="#ffffff" opacity=".05" />
        <path d="M120 16h82v14l-82 52z" fill="#ffffff" opacity=".03" />
      </svg>

      <div className="rig-badge">
        <i className={`dot${mining ? " live" : ""}`} />
        {mining ? "挖矿中" : "待机"}
        {mining && <b>{hash} H</b>}
      </div>

      {mining && (
        <div className="rig-heat" aria-hidden>
          {[0, 1, 2].map((i) => <span key={i} style={{ animationDelay: `${i * 0.9}s` }} />)}
        </div>
      )}
    </div>
  );
}
