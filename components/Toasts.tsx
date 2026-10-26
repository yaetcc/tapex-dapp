import { useApp } from "../state/App";

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, display: "grid", gap: 8, zIndex: 90 }}>
      {toasts.map((x) => (
        <div
          key={x.id}
          className="card"
          style={{
            padding: "10px 14px", fontSize: 12.5, borderRadius: 12, maxWidth: 320,
            borderColor: x.kind === "err" ? "rgba(255,90,90,.4)" : x.kind === "ok" ? "rgba(0,229,160,.4)" : "var(--line-gold)",
            color: x.kind === "err" ? "var(--danger)" : x.kind === "ok" ? "var(--ac)" : "var(--tx-2)",
          }}
        >
          {x.text}
        </div>
      ))}
    </div>
  );
}
