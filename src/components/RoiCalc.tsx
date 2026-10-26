import { useState } from "react";
import { num } from "../lib/format";

/** ROI 估算：预算 → 预计部件 → 可组装台数 → 日产出 */
export function RoiCalc({ mintFee, assembleFee }: { mintFee: number; assembleFee: number }) {
  const [budget, setBudget] = useState("0.05");
  const okb = Math.max(0, Number(budget) || 0);
  const draws = Math.floor(okb / 0.001);
  // 集齐 8 类期望抽数 ≈ 8 × H8 ≈ 8 × 2.72 ≈ 21.8；含档位错配按 30 估
  const sets = Math.floor(draws / 30);
  const tape = sets * assembleFee;

  return (
    <div className="roi">
      <div className="roi-head"><b>投入估算</b><span>按当前权重</span></div>
      <div className="roi-row">
        <span>预算 OKB</span>
        <input className="field field-sm" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ""))} />
      </div>
      <div className="roi-out">
        <div><span>可抽</span><b>{num(draws, 0)} <em>件</em></b></div>
        <div><span>预计组装</span><b>{num(sets, 0)} <em>台</em></b></div>
        <div><span>组装费</span><b>{num(tape, 0)} <em>TAPE</em></b></div>
      </div>
      <p className="hint">估算值：机箱权重仅 4%，实际凑齐 8 类存在波动。</p>
    </div>
  );
}
