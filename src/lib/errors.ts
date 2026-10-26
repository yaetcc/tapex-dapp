// 合约 revert → 人话
const MAP: [RegExp, string][] = [
  [/user rejected|user denied|4001/i, "已取消签名"],
  [/insufficient funds|insufficient balance/i, "余额不足（OKB 或 gas）"],
  [/not owner/i, "这台 NFT 不在你名下"],
  [/staked/i, "该矿机质押中，请先解押"],
  [/listed/i, "该矿机挂单中，请先撤单"],
  [/no part/i, "部件不足，凑齐 8 类各 1 件"],
  [/\bfee\b/i, "支付金额不符"],
  [/\bcap\b/i, "已达抽卡上限"],
  [/\bbatch\b/i, "单笔数量超限（上限 10）"],
  [/not stake/i, "该矿机没有在质押中"],
  [/inactive/i, "该挂单已失效"],
  [/allowance/i, "TAPE 授权额度不足"],
  [/reentr/i, "合约重入保护触发，请重试"],
  [/insufficient balance for transfer|ERC1155InsufficientBalance/i, "余额不足：没有这件部件"],
  [/execution reverted/i, "链上校验未通过（常见原因：库存不足 / 未授权 / 该单已失效）"],
  [/unknown custom error/i, "链上自定义错误：多半是库存或授权不满足"],
];
export function humanErr(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  for (const [re, text] of MAP) if (re.test(msg)) return text;
  return msg.slice(0, 90);
}
