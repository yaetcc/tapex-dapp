// 8 类硬件图标（统一出处：铸造/资产/组装/市场/详情弹窗共用）
export const PART_PATHS = [
  '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2"/>',
  '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4v6H7z"/><path d="M13 9h4M13 13h4"/>',
  '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3.4"/><path d="M12 8.6V6M12 18v-2.6"/>',
  '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h6"/>',
  '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10h8M8 14h5"/>',
  '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 11h5v2H7z"/><path d="M15 11h3"/>',
  '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 5v3M12 16v3M5 12h3M16 12h3"/>',
  '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8"/><circle cx="12" cy="16" r="1.6"/>',
];

export const TIER_COLOR = ["#7FE0D6", "#00E5A0", "#FFD54D"];

export function PartIcon({ type, tier, size = 24, muted = false }: {
  type: number; tier?: number; size?: number; muted?: boolean;
}) {
  const color = muted ? "rgba(255,255,255,.35)" : tier != null ? TIER_COLOR[tier] : "var(--ac)";
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color}
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: PART_PATHS[type] ?? "" }} />
  );
}
