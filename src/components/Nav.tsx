import { useApp } from "../state/App";
import { shortAddr } from "../lib/format";

const ITEMS = [
  ["home", "nav.home"], ["mint", "nav.mint"], ["asm", "nav.asm"], ["stake", "nav.stake"], ["assets", "nav.assets"],
  ["divd", "nav.divd"], ["market", "nav.market"], ["net", "nav.net"],
] as const;

export function Nav({ route, go }: { route: string; go: (r: string) => void }) {
  const { t, lang, setLang, account, connect, connecting } = useApp();
  return (
    <header className="topbar">
      <div className="brand" onClick={() => go("home")} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") go("home"); }} style={{ cursor: "pointer" }}>
        <img src="/logo.svg" alt="TAPEX" className="logomark" />
        TAPEX
        <span className="chip">X Layer</span>
      </div>
      <nav className="nav">
        {ITEMS.map(([id, key]) => (
          <button key={id} aria-current={route === id ? "page" : undefined} onClick={() => go(id)}>
            {t(key)}
          </button>
        ))}
      </nav>
      <button className="btn btn-ghost" title="切换密度" style={{ width: 40 }}
        onClick={() => {
          const next = document.documentElement.dataset.density === "compact" ? "cozy" : "compact";
          document.documentElement.dataset.density = next;
          localStorage.setItem("density", next);
        }}>≡</button>
      <button className="btn btn-ghost" onClick={() => setLang(lang === "zh" ? "en" : "zh")} style={{ width: 46 }}>
        {lang === "zh" ? "EN" : "中"}
      </button>
      <button className="btn btn-ghost" onClick={connect} style={{ width: 150 }}>
        {account ? shortAddr(account) : connecting ? "…" : t("cta.connect")}
      </button>
    </header>
  );
}

export function MobileTabs({ route, go }: { route: string; go: (r: string) => void }) {
  const { t } = useApp();
  return (
    <nav className="mtabs">
      {ITEMS.map(([id, key]) => (
        <button key={id} aria-current={route === id ? "page" : undefined} onClick={() => go(id)}>
          {t(key)}
        </button>
      ))}
    </nav>
  );
}
