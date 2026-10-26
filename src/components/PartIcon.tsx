// 8 类硬件真实剪影（24 栅格，统一 1.4/1.8 描边）；档位用材质而非纯色表达
export const PART_PATHS = [
  // CPU：方形顶盖 + 防呆缺口 + 四周触点
  '<rect x="5" y="5" width="14" height="14" rx="1.5"/><rect x="8.5" y="8.5" width="7" height="7" rx="1"/><path d="M5 3v2M8 3v2M12 3v2M16 3v2M5 19v2M8 19v2M12 19v2M16 19v2M3 5h2M3 8h2M3 12h2M3 16h2M19 5h2M19 8h2M19 12h2M19 16h2"/>',
  // 主板：竖长板型 + 插槽列 + 芯片组
  '<rect x="4" y="3" width="16" height="18" rx="1.5"/><rect x="6.5" y="5.5" width="5" height="5" rx="1"/><path d="M14 6h4M14 8.5h4M14 11h4"/><rect x="6.5" y="14" width="11" height="3" rx="1"/>',
  // GPU：长卡 + 双风扇 + 尾部挡板
  '<rect x="2" y="7" width="20" height="10" rx="1.5"/><circle cx="8" cy="12" r="2.6"/><circle cx="15.5" cy="12" r="2.6"/><path d="M2 17v3M4 17v2"/>',
  // RAM：细长条 + 金手指 + 顶部灯带
  '<rect x="7" y="3" width="10" height="15" rx="1.2"/><path d="M7 18h10M9 6h6"/><path d="M9 16v1.6M11 16v1.6M13 16v1.6M15 16v1.6"/>',
  // SSD：M.2 长条 + 散热马甲 + 尾部缺口
  '<rect x="2" y="9" width="20" height="6" rx="1.2"/><path d="M5 9v6M9 11h6"/><path d="M18 9v3"/>',
  // 电源：方盒 + 风扇圈 + 模组口
  '<rect x="3" y="7" width="18" height="11" rx="1.5"/><circle cx="9" cy="12.5" r="3"/><path d="M15 10h4M15 14h4"/>',
  // 散热器：塔体 + 热管 + 侧挂风扇
  '<rect x="6" y="3" width="9" height="14" rx="1"/><path d="M8 6h5M8 9h5M8 12h5"/><circle cx="17" cy="13" r="3.2"/><path d="M6 20h12"/>',
  // 机箱：框架 + 侧透玻璃 + 脚垫
  '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 6h8v10H8z"/><path d="M6 21h2M16 21h2"/>',
];

export const TIER_COLOR = ["#7FE0D6", "#00E5A0", "#FFD54D"];

export function PartIcon({ type, tier, size = 24, muted = false }: {
  type: number; tier?: number; size?: number; muted?: boolean;
}) {
  const color = muted ? "rgba(255,255,255,.35)" : tier != null ? TIER_COLOR[tier] : "var(--ac)";
  // 档位 = 材质：标准 1.4 / Pro 1.4 + 淡填充 / 旗舰 1.8 + 外发光 + 1.08×
  const sw = tier === 2 ? 1.8 : 1.4;
  const scale = tier === 2 ? 1.08 : 1;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{
        transform: `scale(${scale})`,
        filter: tier === 2 ? `drop-shadow(0 0 3px ${color}66)` : undefined,
        opacity: muted ? 0.6 : 1,
      }}
      dangerouslySetInnerHTML={{ __html: PART_PATHS[type] ?? "" }} />
  );
}
