import { useApp } from "../state/App";
import { shortAddr } from "../lib/format";

const ITEMS = [
  ["mint", "nav.mint"], ["asm", "nav.asm"], ["stake", "nav.stake"], ["assets", "nav.assets"],
  ["divd", "nav.divd"], ["market", "nav.market"], ["net", "nav.net"],
] as const;

export function Nav({ route, go }: { route: string; go: (r: string) => void }) {
  const { t, lang, setLang, account, connect, connecting } = useApp();
  return (
    <header className="topbar">
      <div className="brand">
        <img src="/logo.svg" alt="TapeX" className="logomark" />
        TapeX
        <span className="chip">X Layer</span>
      </div>
      <nav className="nav">
        {ITEMS.map(([id, key]) => (
          <button key={id} aria-current={route === id ? "page" : undefined} onClick={() => go(id)}>
            {t(key)}
          </button>
        ))}
      </nav>
      <button className="btn btn-ghost" onClick={() => setLang(lang === "zh" ? "en" : "zh")} style={{ width: 46 }}>
        {lang === "zh" ? "EN" : "中"}
      </button>
      <button className="btn btn-ghost" onClick={connect} style={{ width: 150 }}>
        {account ? shortAddr(account) : connecting ? "…" : t("cta.connect")}
      </button>
    </header>
  );
}
