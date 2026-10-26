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
  const [booting, setBooting] = useState(false);
  const [coasting, setCoasting] = useState(false);
  useEffect(() => {
    if (st !== "mining") return;
    const t = setInterval(() => setJit(0.92 + Math.random() * 0.16), 4000);
    return () => clearInterval(t);
  }, [st]);
  const speed = base * jit;

  // 停机惯性：退出挖矿态后仍慢转 1.2s
  useEffect(() => {
    if (st === "mining") { setCoasting(false); return; }
    setCoasting(true);
    const t = setTimeout(() => setCoasting(false), 1200);
    return () => clearTimeout(t);
  }, [st]);

  // 启动加速：第一次进入挖矿态时，用 1.2s 从慢速升到目标转速
  useEffect(() => {
    if (st !== "mining") return;
    setBooting(true);
    const t = setTimeout(() => setBooting(false), 1200);
    return () => clearTimeout(t);
  }, [st]);

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
    <div className={`rig${st === "mining" || coasting ? " on" : ""}${booting ? " booting" : ""}${coasting ? " coasting" : ""}`}
      style={{ width: size, ["--spin" as string]: `${speed}s`, ["--glow" as string]: glow, ["--dim" as string]: dim ? "0.55" : "1" }}>
      <svg viewBox="0 0 220 260" width="100%" height="100%" fill="none"
        style={lvl === 2 ? { transform: "skewY(-0.6deg)" } : undefined}>
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
          <clipPath id="caseclip"><rect x="18" y="16" width="184" height="228" rx="10" /></clipPath>
          <pattern id="pcbgrid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 0h8v8" stroke="#356b58" strokeWidth="0.4" opacity=".35" />
          </pattern>
          <pattern id="brushed" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <path d="M0 0v6" stroke="#ffffff" strokeWidth="0.5" opacity=".05" />
          </pattern>
          <linearGradient id="ledflow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--glow)" stopOpacity="0" />
            <stop offset=".45" stopColor="#ffffff" stopOpacity=".55" />
            <stop offset=".55" stopColor="#ffffff" stopOpacity=".55" />
            <stop offset="1" stopColor="var(--glow)" stopOpacity="0" />
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" /></filter>
          <linearGradient id="rgbfade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--glow)" stopOpacity=".1" />
            <stop offset=".5" stopColor="var(--glow)" stopOpacity=".95" />
            <stop offset="1" stopColor="var(--glow)" stopOpacity=".1" />
          </linearGradient>
          <radialGradient id="spill" cx="50%" cy="50%">
            <stop offset="0" stopColor="var(--glow)" stopOpacity=".22" />
            <stop offset="1" stopColor="var(--glow)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="led" cx="50%" cy="50%">
            <stop offset="0" stopColor="var(--glow)" stopOpacity=".9" /><stop offset="1" stopColor="var(--glow)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g style={{ opacity: dim ? 0.6 : 1 }}>
          {/* 接地阴影 + 倒影 */}
          <ellipse cx="110" cy="256" rx="96" ry="7" fill="#000" opacity=".45" filter="url(#soft)" />
          <g transform="translate(0, 508) scale(1, -0.2)" opacity=".10">
            <rect x="8" y="6" width="204" height="248" rx="14" fill="url(#caseBody)" />
          </g>

          {/* 机箱外壳 */}
          <rect x={8} y={6} width={204} height={248} rx="14" fill="url(#caseBody)" stroke="#4a382f" strokeWidth="1.6" />
          <rect x={8} y={6} width={204} height={248} rx="14" fill="url(#brushed)" opacity=".5" />

          {/* 顶板（仅大图，制造体积） */}
          {lvl === 2 && (
            <path d="M14 8 L28 2 h168 l8 6 z" fill="#2f241f" stroke="#4a382f" strokeWidth="1" opacity=".9" />
          )}

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
              <rect x="12" y="12" width="196" height="234" rx="12" fill="url(#glass)" stroke="#ffffff" strokeOpacity=".12" />
              <line x1="12" y1="196" x2="208" y2="196" stroke="#3a2c26" strokeWidth="2" />
              <rect x="14" y="200" width="192" height="46" rx="8" fill="#1b1512" opacity=".92" />
              <path d="M84 4 h52" stroke="#6b5344" strokeWidth="4" strokeLinecap="round" />
            </>
          )}
          {shell.kind === "itx" && (
            <>
              {/* ITX：小方箱 + 顶部提手 + 前部网孔 */}
              <rect x="18" y="16" width="184" height="222" rx="10" fill="url(#glass)" stroke="#ffffff" strokeOpacity=".08" />
              <path d="M88 2 h44" stroke="#6b5344" strokeWidth="4" strokeLinecap="round" />
              <path d="M88 2 v4 M132 2 v4" stroke="#6b5344" strokeWidth="4" strokeLinecap="round" />
              <rect x="14" y="16" width="10" height="200" rx="5" fill="#171110" stroke="#3a2c26" />
            </>
          )}
          {shell.kind === "tower" && (
            grade >= 4 ? <rect x="18" y="16" width="184" height="228" rx="10" fill="url(#glass)" stroke="#ffffff" strokeOpacity=".14" />
              : <rect x="16" y="14" width="188" height="230" rx="8" fill="#231b17" stroke="#3a2c26" />
          )}

          {/* 内部（真实 ATX 侧视：主板横置 / 显卡加厚 / 内存变细 / 三层 z-order） */}
          <g clipPath="url(#caseclip)">
            {/* 主板 PCB（横置 150×120） */}
            <rect x="38" y="20" width="144" height="160" rx="6" fill="url(#pcb)" stroke="#2c5c4c" strokeWidth="1.2" />
            <rect x="38" y="20" width="144" height="160" rx="6" fill="url(#pcbgrid)" />
            {/* 丝印（仅大图） */}
            {lvl >= 2 && (
              <g stroke="#356b58" strokeWidth="0.8" opacity=".55">
                <path d="M44 166h60M44 172h38M44 178h48" />
                <path d="M150 34h28M150 40h20" />
              </g>
            )}
            {/* CPU 插槽 */}
            <rect x="58" y="42" width="34" height="30" rx="3" fill="#0f1a17" stroke="#356b58" strokeWidth="0.8" />
            {/* 内存 ×2（细条 5×42） */}
            <rect x="108" y="42" width="6" height="54" rx="1.5" fill="#22302c" stroke="#3d7a63" strokeWidth="0.8" />
            {lvl >= 1 && <rect x="117" y="42" width="6" height="54" rx="1.5" fill="#22302c" stroke="#3d7a63" strokeWidth="0.8" />}
            {/* 内存顶部灯点 */}
            <circle className="ram-led" cx="107" cy="40" r="1.6" fill="var(--glow)" opacity={st === "idle" ? ".3" : ".9"} />
            {lvl >= 1 && <circle className="ram-led" cx="117" cy="40" r="1.6" fill="var(--glow)" opacity={st === "idle" ? ".3" : ".9"} />}

            {/* 金手指（仅大图） */}
            {lvl >= 2 && (
              <g fill="#C9A227" opacity=".65">
                <rect x="108" y="90" width="6" height="4" />
                <rect x="117" y="90" width="6" height="4" />
              </g>
            )}
            {/* M.2 NVMe：直插主板（显卡下方） */}
            <g>
              <rect x="124" y="104" width="52" height="10" rx="2" fill="#1a1512" stroke="#3d7a63" strokeWidth="0.9" />
              <rect x="126" y="106" width="40" height="6" rx="1.5" fill="#22302c" stroke="#3d7a63" strokeWidth="0.6" />
              {lvl >= 2 && <circle cx="171" cy="109" r="1.3" fill="#6b5344" />}
            </g>

            {/* 24pin 主板供电（压在显卡后面走线） */}
            {lvl >= 1 && (
              <g fill="none" stroke="#2f2620" strokeWidth="4" strokeLinecap="round" opacity=".85">
                <path d="M182 58 C 192 90, 192 140, 172 190" />
              </g>
            )}

            {/* 显卡投影 */}
            <rect x="38" y="170" width="152" height="6" rx="3" fill="#000" opacity=".3" filter="url(#soft)" />
            {/* 显卡（加厚 140×34） */}
            <rect x="36" y="122" width="154" height="46" rx="5" fill="#241a16" stroke="#6b5344" strokeWidth="1.6" />
            <rect x="36" y="122" width="154" height="46" rx="5" fill="url(#brushed)" />
            <rect x="40" y="128" width="26" height="34" rx="2" fill="#1a1310" stroke="#8a6d59" strokeWidth="0.8" />
            {(lvl >= 1 ? [86, 118, 150] : [100, 132]).map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy="145" r="14.5" fill="#120e0c" stroke="#8a6d59" strokeWidth="1.2" />
                <g className="fan-blades" style={{ transformOrigin: `${cx}px 145px` }}>
                  {[0, 120, 240].map((a) => (
                    <ellipse key={a} cx={cx} cy="136.5" rx="3.4" ry="9" fill="#8a6d59" transform={`rotate(${a} ${cx} 145)`} />
                  ))}
                </g>
              </g>
            ))}
            {/* 显卡 RGB 灯条 */}
            <rect className="gpu-rgb" x="44" y="122.5" width="138" height="2.5" rx="1.2" fill="url(#rgbfade)" opacity={st === "idle" ? ".25" : ".95"} />

            {/* 背板螺丝（仅大图） */}
            {lvl >= 2 && (
              <g fill="#6b5344">
                {[[52, 126], [186, 126], [52, 162], [186, 162]].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="1.6" />
                ))}
              </g>
            )}

            {/* CPU 塔式散热 */}
            <circle cx="75" cy="57" r="24" fill="#181210" stroke="#4a382f" strokeWidth="1.2" />
            <g className="fan-blades" style={{ transformOrigin: "75px 57px" }}>
              {[0, 120, 240].map((a) => (
                <ellipse key={a} cx="75" cy="48" rx="4.6" ry="9.4" fill="#5e4a3d" transform={`rotate(${a} 75 59)`} />
              ))}
            </g>

            {/* PCH 芯片组（显卡下方右侧） */}
            <rect x="148" y="172" width="34" height="20" rx="3" fill="#152320" stroke="#3f7f68" strokeWidth="0.8" />
            {lvl >= 2 && <path d="M152 178h26M152 183h18" stroke="#2c5548" strokeWidth="0.8" opacity=".7" />}

            {/* 前面板（侧视）：竖直进风格栅 */}
            {lvl >= 1 && (
              <>
                <rect x="18" y="30" width="8" height="156" rx="3" fill="#191310" stroke="#3a2c26" strokeWidth="0.8" />
                <g fill="#3a2c26">
                  {Array.from({ length: 10 }, (_, i) => (
                    <rect key={i} x="20" y={38 + i * 15} width="4" height="7" rx="1" />
                  ))}
                </g>
                {st === "mining" && <rect x="17" y="34" width="1.6" height="148" rx="0.8" fill="var(--glow)" opacity=".55" />}
              </>
            )}


            {/* 显卡供电线束（高细节） */}
            {lvl >= 2 && (
              <g fill="none" stroke="#2f2620" strokeWidth="3.2" strokeLinecap="round" opacity=".9">
                <path d="M170 168 C 178 182, 168 190, 156 192" strokeWidth="2.6" />
                <path d="M180 168 C 188 184, 178 192, 166 192" strokeWidth="2.6" />
              </g>
            )}

            {/* 顶部散热格栅（侧视） */}
            {lvl >= 2 && (
              <>
                <rect x="58" y="16" width="112" height="7" rx="3.5" fill="#191310" stroke="#3a2c26" strokeWidth="0.8" />
                <g fill="#3a2c26">
                  {Array.from({ length: 9 }, (_, i) => (
                    <rect key={i} x={62 + i * 12} y="18" width="7" height="3" rx="1.5" />
                  ))}
                </g>
              </>
            )}

            {/* 底部电源仓 */}
            <line x1="18" y1="190" x2="202" y2="190" stroke="#3a2c26" strokeWidth="1.2" />
            <rect x="28" y="196" width="112" height="46" rx="5" fill="#15100e" stroke="#40302a" strokeWidth="1.2" />
            <rect x="30" y="198" width="108" height="8" rx="4" fill="#ffffff" opacity=".04" />
            <circle cx="48" cy="221" r="11" fill="none" stroke="#4a382f" strokeWidth="0.8" />
            <g className="fan-blades" style={{ transformOrigin: "48px 221px" }}>
              {[0, 120, 240].map((a) => (
                <ellipse key={a} cx="48" cy="215" rx="2.4" ry="6.2" fill="#6b5344" transform={`rotate(${a} 48 221)`} />
              ))}
            </g>
            {/* 电源模组接口（大图） */}
            {lvl >= 2 && (
              <g fill="#241a16" stroke="#4a382f" strokeWidth="0.8">
                <rect x="72" y="216" width="10" height="10" rx="2" />
                <rect x="86" y="216" width="14" height="10" rx="2" />
                <rect x="104" y="216" width="10" height="10" rx="2" />
              </g>
            )}


            {/* 上盖丝印 */}
            {lvl >= 2 && (
              <text x="152" y="220" fontSize="9" fill="#4a382f" letterSpacing="2">TAPEX</text>
            )}

            {/* 机箱脚垫（大图） */}
            {lvl >= 2 && (
              <g fill="#1a1411" stroke="#3a2c26" strokeWidth="0.8">
                <rect x="26" y="250" width="16" height="5" rx="2" />
                <rect x="178" y="250" width="16" height="5" rx="2" />
              </g>
            )}
          </g>

          {/* 灯带 */}
          <rect x="18" y="246" width="184" height="3" rx="1.5"
            className="led-strip" fill="var(--glow)" opacity={st === "idle" ? ".25" : ".9"} />
          {st !== "idle" && <ellipse cx="110" cy="234" rx="86" ry="20" fill="url(#led)" className="led-glow" />}
          {st === "mining" && <rect className="led-flow" x="18" y="245" width="70" height="5" rx="2.5" fill="url(#ledflow)" opacity=".8" />}

          {/* 玻璃反光（仅高细节） */}
          {st !== "idle" && <ellipse cx="110" cy="236" rx="92" ry="24" fill="url(#spill)" opacity=".65" />}
          {lvl === 2 && (
            <>
              <path d="M18 16h40L18 96z" fill="#ffffff" opacity=".06" />
              <path d="M196 60v150l-34 60V120z" fill="#ffffff" opacity=".03" />
            </>
          )}
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
