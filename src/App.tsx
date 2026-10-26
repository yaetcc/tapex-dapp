import { useEffect, useRef, useState } from "react";
import { Nav, MobileTabs } from "./components/Nav";
import { Atmosphere, Stickers } from "./components/Atmosphere";
import { Mascot } from "./components/Mascot";
import { TxBar } from "./components/TxBar";
import { RunwayBanner } from "./components/RunwayBanner";
import { Toasts } from "./components/Toasts";
import { Mint } from "./pages/Mint";
import { Placeholder } from "./pages/Placeholder";
import { Build } from "./pages/Build";
import { Stake } from "./pages/Stake";
import { Assets } from "./pages/Assets";
import { Dividend } from "./pages/Dividend";
import { Market } from "./pages/Market";
import { Network } from "./pages/Network";

const ROUTES = ["mint", "asm", "stake", "assets", "divd", "market", "net"] as const;

if (typeof document !== "undefined") {
  document.documentElement.dataset.density = localStorage.getItem("density") || "cozy";
}

export default function App() {
  const [route, setRoute] = useState<string>(() => location.hash.replace("#", "") || "mint");
  const [dir, setDir] = useState<"next" | "prev">("next");
  const prevIdxRef = useRef<number>(-1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 7) { e.preventDefault(); go(ROUTES[n - 1]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(location.hash.replace("#", "") || "mint");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (r: string) => {
    location.hash = r;
    setRoute(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const current = ROUTES.includes(route as (typeof ROUTES)[number]) ? route : "mint";

  // Tab 顺序决定转场方向：渲染时同步计算，避免首帧用旧方向
  const curIdx = ROUTES.indexOf(current as (typeof ROUTES)[number]);
  if (prevIdxRef.current !== curIdx) {
    if (prevIdxRef.current !== -1) setDir(curIdx > prevIdxRef.current ? "next" : "prev");
    prevIdxRef.current = curIdx;
  }

  return (
    <>
      <Atmosphere />
      <Stickers />
      <Mascot />
      <Nav route={current} go={go} />
      <RunwayBanner />
      <main className={`shell page-enter-${dir}`} key={current} style={{ paddingTop: 26 }}>
        {current === "mint" ? <Mint />
          : current === "asm" ? <Build />
          : current === "stake" ? <Stake />
          : current === "assets" ? <Assets go={go} />
          : current === "divd" ? <Dividend />
          : current === "market" ? <Market />
          : current === "net" ? <Network />
          : <Placeholder name={current} />}
      </main>
      <MobileTabs route={current} go={go} />
      <Toasts />
      <TxBar />
    </>
  );
}
