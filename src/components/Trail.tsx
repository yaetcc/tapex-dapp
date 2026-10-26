import { useEffect, useState } from "react";
import { Contract } from "ethers";
import { useApp } from "../state/App";
import { ADDRS, ABI } from "../lib/contracts";
import { readProvider } from "../lib/wallet";

// 主线：抽 → 组 → 挖 → 领 → 交
const STEPS: { route: string; label: string; icon: string }[] = [
  { route: "mint", label: "抽部件", icon: "M5 5h14v14H5z" },
  { route: "asm", label: "组装", icon: "M12 3v18M3 12h18" },
  { route: "stake", label: "上架挖矿", icon: "M4 18h16M6 14l3-4 3 3 4-6" },
  { route: "divd", label: "收分红", icon: "M12 3v12M8 11l4 4 4-4M4 21h16" },
  { route: "market", label: "交易", icon: "M4 8h14l-3-3M20 16H6l3 3" },
];

export function Trail({ route, go }: { route: string; go: (r: string) => void }) {
  const { account } = useApp();
  const [parts, setParts] = useState<number | null>(null);
  const [pcs, setPcs] = useState<number | null>(null);

  useEffect(() => {
    if (!account) { setParts(null); setPcs(null); return; }
    let alive = true;
    (async () => {
      try {
        const pt = new Contract(ADDRS.part, ABI.part, readProvider);
        const ids = Array.from({ length: 24 }, (_, i) => i + 1);
        const bals: bigint[] = await pt.balanceOfBatch(ids.map(() => account), ids);
        const total = bals.reduce((a, b) => a + Number(b), 0);
        const ct = new Contract(ADDRS.circuit, ABI.circuit, readProvider);
        const n = Number(await ct.balanceOf(account));
        if (!alive) return;
        setParts(total); setPcs(n);
      } catch { /* 静默：主线不阻塞 */ }
    })();
    return () => { alive = false; };
  }, [account]);

  const idx = Math.max(0, STEPS.findIndex((s) => s.route === route));
  const hint = !account
    ? "连接钱包开始"
    : idx === 0 ? (parts ? `${parts} 件部件，继续抽` : "先抽第一件部件")
    : idx === 1 ? (parts ? "凑齐 8 类去组装" : "部件不够")
    : idx === 2 ? (pcs ? `${pcs} 台，上架挖矿` : "先组装一台")
    : idx === 3 ? "查看今日分红"
    : "看看市场行情";

  return (
    <div className="trail">
      <div className="trail-steps">
        {STEPS.map((s, i) => {
          const done = i < idx;
          const cur = i === idx;
          return (
            <button key={s.route} className={`trail-step${done ? " done" : ""}${cur ? " cur" : ""}`}
              onClick={() => go(s.route)} aria-current={cur ? "step" : undefined}>
              <i className="trail-dot">{done ? "✓" : i + 1}</i>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
      <span className="trail-hint">{hint}</span>
    </div>
  );
}
