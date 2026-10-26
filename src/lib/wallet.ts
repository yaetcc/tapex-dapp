import { BrowserProvider, FallbackProvider, JsonRpcProvider } from "ethers";
import { CHAIN } from "./contracts";

export type Eth = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(ev: string, fn: (...a: unknown[]) => void): void;
  removeListener?(ev: string, fn: (...a: unknown[]) => void): void;
};

// 直连单一端点：FallbackProvider 会增加 1.5s+ 的选路开销，读页面明显变慢
const PRIMARY = "https://xlayerrpc.okx.com";

// 注意：X Layer 公共 RPC（xlayerrpc.okx.com）对 JSON-RPC batch 支持不完整，
// 实测 batchMaxCount>1 时 eth_call 批量返回后解码失败（组装页库存变 0/8），
// 因此保持单发（batchMaxCount: 1）。速度靠"合约聚合 + 前端缓存"解决，不靠批量。
export const readProvider = new JsonRpcProvider(PRIMARY, CHAIN.id, {
  batchMaxCount: 1, staticNetwork: true,
});

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
