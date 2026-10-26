import { useApp } from "../state/App";

export function Placeholder({ name }: { name: string }) {
  const { t } = useApp();
  return (
    <div className="card" style={{ display: "grid", placeItems: "center", minHeight: 320, gap: 10 }}>
      <span className="kicker">{name.toUpperCase()}</span>
      <p className="sub" style={{ textAlign: "center" }}>{t("mint.soon")}</p>
    </div>
  );
}
