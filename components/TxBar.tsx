import { useEffect, useState } from "react";
import { onTx, type TxState } from "../lib/tx";

export function TxBar() {
  const [tx, setTx] = useState<TxState | null>(null);
  useEffect(() => onTx(setTx), []);
  if (!tx) return null;
  const color = tx.status === "err" ? "var(--danger)" : tx.status === "ok" ? "var(--ac)" : "var(--gold)";
  const text = tx.status === "pending" ? "等待钱包 / 打包中…" : tx.status === "ok" ? "已确认" : "失败";
  return (
    <div className={`txbar ${tx.status}`}>
      <i style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      <b>{tx.label}</b>
      <span>{text}</span>
      {tx.error && <em>{tx.error}</em>}
    </div>
  );
}
