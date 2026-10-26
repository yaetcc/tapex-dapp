// 柴犬吉祥物（沿用线上版造型，漂浮动效在 styles/motion.css）
export function Mascot() {
  return (
    <div className="mascot-wrap" aria-hidden dangerouslySetInnerHTML={{ __html: `<svg class="mascot" viewBox="0 0 84 84" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 46c0-12 9-20 22-20s22 8 22 20v12c0 6-4 10-10 10H30c-6 0-10-4-10-10z" fill="#FFD93D" stroke="#241505" stroke-width="3"/><path d="M26 50c-3-4-6-12-4-18 2-6 8-9 13-9" stroke="#241505" stroke-width="3"/><path d="M58 50c3-4 6-12 4-18-2-6-8-9-13-9" stroke="#241505" stroke-width="3"/><circle class="eye-l" cx="32" cy="46" r="3.4" fill="#241505"/><circle class="eye-r" cx="52" cy="46" r="3.4" fill="#241505"/><path d="M38 56c2.5 2 5.5 2 8 0" stroke="#241505" stroke-width="3"/><path d="M28 36h28v4H28z" fill="#FF6BCB" stroke="#241505" stroke-width="2.5"/><rect x="34" y="18" width="16" height="12" rx="3" fill="#FF6BCB" stroke="#241505" stroke-width="2.5"/><path d="M30 24H18c-3 0-5 2-5 5s2 5 5 5h12" stroke="#241505" stroke-width="3"/><path d="M24 20l-3-5M20 21l-4-4M36 15l2-6M42 15l4-5" stroke="#FFD93D" stroke-width="2.6"/></g></svg>` }} />
  );
}
