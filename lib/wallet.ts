import { BrowserProvider, FallbackProvider, JsonRpcProvider } from "ethers";
import { CHAIN } from "./contracts";

export type Eth = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(ev: string, fn: (...a: unknown[]) => void): void;
  removeListener?(ev: string, fn: (...a: unknown[]) => void): void;
};

const RPC_LIST = [CHAIN.rpc, "https://xlayerrpc.okx.com"];
export const readProvider = new FallbackProvider(
  RPC_LIST.map((url, i) => ({
    provider: new JsonRpcProvider(url, CHAIN.id, { batchMaxCount: 1, staticNetwork: true }),
    priority: i + 1, stallTimeout: 1500, weight: 1,
  })),
  CHAIN.id,
  { quorum: 1 }
);

/** 读操作重试：3 次指数退避，失败抛最后一次错误 */
export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 400 * 2 ** i));
    }
  }
  throw last;
}

export function getEth(): Eth | null {
  const w = window as unknown as { ethereum?: Eth };
  return w.ethereum ?? null;
}

export async function connectWallet(): Promise<{ address: string; provider: BrowserProvider }> {
  const eth = getEth();
  if (!eth) throw new Error("未检测到钱包扩展（MetaMask / OKX Wallet）");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("钱包没有返回账户");
  const provider = new BrowserProvider(eth);
  return { address: accounts[0], provider };
}

export async function ensureChain() {
  const eth = getEth();
  if (!eth) return;
  const hex = (await eth.request({ method: "eth_chainId" })) as string;
  if (parseInt(hex, 16) === CHAIN.id) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN.hex }] });
  } catch {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: CHAIN.hex, chainName: CHAIN.name,
        nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
        rpcUrls: [CHAIN.rpc],
      }],
    });
  }
}
