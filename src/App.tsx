import { useEffect, useState } from "react";
import { Nav } from "./components/Nav";
import { Atmosphere, Stickers } from "./components/Atmosphere";
import { Mascot } from "./components/Mascot";
import { TxBar } from "./components/TxBar";
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

export default function App() {
  const [route, setRoute] = useState<string>(() => location.hash.replace("#", "") || "mint");

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

  return (
    <>
      <Atmosphere />
      <Stickers />
      <Mascot />
      <Nav route={current} go={go} />
      <main className="shell" style={{ paddingTop: 26 }}>
        {current === "mint" ? <Mint />
          : current === "asm" ? <Build />
          : current === "stake" ? <Stake />
          : current === "assets" ? <Assets go={go} />
          : current === "divd" ? <Dividend />
          : current === "market" ? <Market />
          : current === "net" ? <Network />
          : <Placeholder name={current} />}
      </main>
      <Toasts />
      <TxBar />
    </>
  );
}
