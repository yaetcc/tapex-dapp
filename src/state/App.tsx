import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BrowserProvider, type JsonRpcSigner } from "ethers";
import { connectWallet, ensureChain, getEth } from "../lib/wallet";
import { t as tr, type DictKey, type Lang } from "../lib/i18n";

type Toast = { id: number; text: string; kind: "ok" | "err" | "info" };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
  account: string | null;
  signer: JsonRpcSigner | null;
  provider: BrowserProvider | null;
  connecting: boolean;
  connect: () => Promise<void>;
  toasts: Toast[];
  toast: (text: string, kind?: Toast["kind"]) => void;
};

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
};

let toastSeq = 0;

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("tx_lang") as Lang) || "zh");
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const t = useCallback((k: DictKey) => tr(k, lang), [lang]);
  const toast = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const id = ++toastSeq;
    setToasts((s) => [...s, { id, text, kind }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4200);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      await ensureChain();
      const { address, provider } = await connectWallet();
      setProvider(provider);
      setAccount(address);
      setSigner(await provider.getSigner());
    } catch (e) {
      toast((e as Error).message.slice(0, 90), "err");
    } finally {
      setConnecting(false);
    }
  }, [toast]);

  useEffect(() => {
    localStorage.setItem("tx_lang", lang);
  }, [lang]);

  useEffect(() => {
    const eth = getEth();
    if (!eth) return;
    eth.request({ method: "eth_accounts" })
      .then(async (accs) => {
        const list = accs as string[];
        if (!list?.length) return;
        const p = new BrowserProvider(eth);
        setProvider(p);
        setAccount(list[0]);
        setSigner(await p.getSigner());
      })
      .catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, t, account, signer, provider, connecting, connect, toasts, toast }),
    [lang, t, account, signer, provider, connecting, connect, toasts, toast]
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
