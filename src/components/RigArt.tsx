import { useEffect, useMemo, useState } from "react";

/**
 * 矿机插画 v2
 * - LOD：size < 150 低细节；< 230 中细节；>= 230 全细节
 * - variant：0 中塔 / 1 海景房（双仓）/ 2 ITX（小方箱）—— S 级固定开放式框架
 * - lightHue：0 金 / 1 青 / 2 琥珀（每台固定）
 * - state：idle 待机 / mining 挖矿 / listed 挂单中
 */
export type RigState = "idle" | "mining" | "listed";

const HUES = ["#FFD54D", "#7FE0D6", "#FF9F45"];
const GRADE_COLOR: Record<number, string> = { 3: "#9A8E86", 4: "#7FE0D6", 5: "#00E5A0", 6: "#FFD54D" };

export function RigArt({
  hash = 0,
  grade = 3,
  size = 260,
  variant = 0,
  lightHue = 0,
  state,
  mining,
}: {
  hash?: number;
  grade?: number;
  size?: number;
  variant?: number;
  lightHue?: number;
  state?: RigState;
  mining?: boolean;
}) {
  const st: RigState = state ?? (mining ? "mining" : "idle");
  const lvl = size < 150 ? 0 : size < 230 ? 1 : 2;
  const isS = grade >= 6;
  const v = isS ? 3 : variant % 3;

  // 风扇转速：随算力变化，并有 ±8% 负载抖动
  const base = st === "mining" ? Math.max(0.45, 1.4 - Math.min(hash, 300) / 300) : 0;
  const [jit, setJit] = useState(1);
  useEffect(() => {
    if (st !== "mining") return;
    const t = setInterval(() => setJit(0.92 + Math.random() * 0.16), 4000);
    return () => clearInterval(t);
  }, [st]);
  const speed = base * jit;

  const glow = st === "listed" ? "#FFD54D" : st === "idle" ? GRADE_COLOR[grade] ?? "#7FE0D6" : HUES[lightHue % 3];
  const dim = st === "idle";

  // 机箱外形（按 variant）
  const shell = useMemo(() => {
    if (v === 3) return { x: 8, w: 204, kind: "open" as const };
    if (v === 1) return { x: 6, w: 208, kind: "sea" as const };
    if (v === 2) return { x: 8, w: 204, kind: "itx" as const };
    return { x: 8, w: 204, kind: "tower" as const };
  }, [v]);

  return (
    <div className={`rig${st === "mining" ? " on" : ""}`}
      style={{ width: size, ["--spin" as string]: `${speed}s`, ["--glow" as string]: glow, ["--dim" as string]: dim ? "0.55" : "1" }}>
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
          <clipPath id="caseclip"><rect x="18" y="16" width="184" height="200" rx="10" /></clipPath>
          <radialGradient id="led" cx="50%" cy="50%">
            <stop offset="0" stopColor="var(--glow)" stopOpacity=".9" /><stop offset="1" stopColor="var(--glow)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g style={{ opacity: dim ? 0.6 : 1 }}>
          {/* 机箱外壳 */}
          <rect x={8} y={6} width={204} height={248} rx="14" fill="url(#caseBody)" stroke="#4a382f" strokeWidth="2" />

          {/* 外形差异 */}
          {shell.kind === "open" && (
            <>
              <rect x="8" y="6" width="10" height="248" rx="4" fill="#241a16" stroke="#3a2c26" />
              <rect x="202" y="6" width="10" height="248" rx="4" fill="#241a16" stroke="#3a2c26" />
              <rect x="8" y="6" width="204" height="8" rx="4" fill="#241a16" stroke="#3a2c26" />
              <rect x="8" y="246" width="204" height="8" rx="4" fill="#241a16" stroke="#3a2c26" />
              <rect x="52" y="10" width="116" height="4" rx="2" fill="var(--glow)" opacity=".55" />
            </>
          )}
          {shell.kind === "sea" && (
            <>
              {/* 海景房：整面玻璃 + 底部电源仓隔板 + 顶部提手 */}
              <rect x="10" y="10" width="200" height="240" rx="12" fill="url(#glass)" stroke="#ffffff" strokeOpacity=".12" />
              <line x1="12" y1="196" x2="208" y2="196" stroke="#3a2c26" strokeWidth="2" />
              <rect x="14" y="200" width="192" height="46" rx="8" fill="#1b1512" opacity=".92" />
              <path d="M84 4 h52" stroke="#6b5344" strokeWidth="4" strokeLinecap="round" />
            </>
          )}
          {shell.kind === "itx" && (
            <>
              {/* ITX：小方箱 + 顶部提手 + 前部网孔 */}
              <rect x="18" y="16" width="184" height="200" rx="10" fill="url(#glass)" stroke="#ffffff" strokeOpacity=".08" />
              <path d="M88 2 h44" stroke="#6b5344" strokeWidth="4" strokeLinecap="round" />
              <path d="M88 2 v4 M132 2 v4" stroke="#6b5344" strokeWidth="4" strokeLinecap="round" />
              <rect x="14" y="16" width="10" height="200" rx="5" fill="#171110" stroke="#3a2c26" />
            </>
          )}
          {shell.kind === "tower" && (
            grade >= 4 ? <rect x="18" y="16" width="184" height="200" rx="10" fill="url(#glass)" stroke="#ffffff" strokeOpacity=".14" />
              : <rect x="16" y="14" width="188" height="204" rx="8" fill="#231b17" stroke="#3a2c26" />
          )}

          {/* 内部：low 只画主板块 + 显卡条；mid/high 画完整 */}
          <g clipPath="url(#caseclip)">
            <rect x="30" y="26" width="112" height="118" rx="6" fill="url(#pcb)" stroke="#2c5c4c" />
            <rect x="46" y="52" width="34" height="30" rx="4" fill="#0f1a17" stroke="#356b58" />
            <rect x="90" y="52" width="8" height="46" rx="2" fill="#22302c" stroke="#3d7a63" />
            {lvl >= 1 && <rect x="102" y="52" width="8" height="46" rx="2" fill="#22302c" stroke="#3d7a63" />}
            {lvl >= 1 && <rect x="70" y="76" width="34" height="30" rx="4" fill="#152320" stroke="#3f7f68" />}

            {/* 显卡 */}
            <rect x="34" y="124" width="150" height="24" rx="4" fill="#241a16" stroke="#5a463a" />
            {(lvl >= 1 ? [51, 93, 135] : [63, 105]).map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy="136" r="8" fill="#120e0c" stroke="#6b5344" strokeWidth="1.2" />
                <g className="fan-blades" style={{ transformOrigin: `${cx}px 136px` }}>
                  {[0, 120, 240].map((a) => (
                    <ellipse key={a} cx={cx} cy="131" rx="2" ry="5.5" fill="#8a6d59" transform={`rotate(${a} ${cx} 136)`} />
                  ))}
                </g>
              </g>
            ))}

            {/* 顶部风扇（仅高细节） */}
            {lvl >= 2 && (
              <g>
                <circle cx="150" cy="52" r="18" fill="#120e0c" stroke="#3a2c26" />
                <g className="fan-blades" style={{ transformOrigin: "150px 52px" }}>
                  {[0, 120, 240].map((a) => (
                    <ellipse key={a} cx="150" cy="44" rx="4.5" ry="10" fill="#5e4a3d" transform={`rotate(${a} 150 52)`} />
                  ))}
                </g>
              </g>
            )}

            {/* 电源 / SSD */}
            <rect x="30" y="160" width="86" height="44" rx="5" fill="#1b1512" stroke="#40302a" />
            <rect x="128" y="160" width="52" height="22" rx="3" fill="#241a16" stroke="#4a382f" />
            {lvl >= 1 && <rect x="128" y="188" width="52" height="22" rx="3" fill="#241a16" stroke="#4a382f" />}
          </g>

          {/* 灯带 */}
          <rect x="18" y={v === 2 ? 216 : 222} width={v === 2 ? 170 : 184} height="3" rx="1.5"
            className="led-strip" fill="var(--glow)" opacity={st === "idle" ? ".25" : ".9"} />
          {st !== "idle" && <ellipse cx="110" cy="232" rx="86" ry="22" fill="url(#led)" className="led-glow" />}

          {/* 玻璃反光（仅高细节） */}
          {lvl === 2 && <path d="M18 16h40L18 96z" fill="#ffffff" opacity=".05" />}
        </g>
      </svg>

      {lvl === 0 ? (
        // 缩略图：只留一个状态点，避免遮挡机箱
        <div className="rig-badge mini">
          <i className={`dot${st === "mining" ? " live" : st === "listed" ? " list" : ""}`} />
        </div>
      ) : (
        <div className="rig-badge">
          <i className={`dot${st === "mining" ? " live" : st === "listed" ? " list" : ""}`} />
          {st === "mining" ? "挖矿中" : st === "listed" ? "挂单中" : "待机"}
          {st === "mining" && <b>{hash} H</b>}
        </div>
      )}

      {st === "mining" && (
        <div className="rig-heat" aria-hidden>
          {[0, 1, 2].map((i) => <span key={i} style={{ animationDelay: `${i * 0.9}s` }} />)}
        </div>
      )}
    </div>
  );
}
