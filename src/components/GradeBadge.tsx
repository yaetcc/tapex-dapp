import { gradeOf } from "../lib/contracts";

/** 等级色板：S 金 / A 绿 / B 青 / C 灰 */
export const GRADE_COLOR: Record<string, string> = {
  S: "#FFD54D",
  A: "#00E5A0",
  B: "#7FE0D6",
  C: "#9A8E86",
};

/** 由算力得出等级并上色（不依赖合约 grade 枚举） */
export function GradeBadge({ hash, size = "sm" }: { hash: number; size?: "sm" | "md" }) {
  const g = gradeOf(hash);
  const color = GRADE_COLOR[g] ?? GRADE_COLOR.C;
  return (
    <span
      className={`grade grade-${g.toLowerCase()}${size === "md" ? " md" : ""}`}
      style={{ color, borderColor: color, background: `${color}1a` }}
      title={`算力 ${hash} H`}
    >
      {g}
    </span>
  );
}
