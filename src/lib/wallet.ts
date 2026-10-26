import { BrowserProvider, JsonRpcProvider } from "ethers";
import { CHAIN } from "./contracts";

export type Eth = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(ev: string, fn: (...a: unknown[]) => void): void;
  removeListener?(ev: string, fn: (...a: unknown[]) => void): void;
};

export const readProvider = new JsonRpcProvider(CHAIN.rpc, CHAIN.id, { batchMaxCount: 1, staticNetwork: true });

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
