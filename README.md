# TapeX DApp（V6 · tapex.live）

去中心化「真实硬件」电脑组装游戏 DApp：**OKB 抽部件 → 组装 PC NFT → 质押挖 TAPE → 市场交易 → 持 TAPEX 分 TAPE**。
部署于 X Layer 主网（Chain ID 196），线上地址 <https://tapex.live>。

当前线上文件：`index.html`（md5 `83aef63cb56237318cd6734c8f6f4746`）

## 文件构成

| 文件 | 说明 |
|---|---|
| `index.html` | DApp 唯一入口（单文件，内联 CSS/JS，7 个 Tab） |
| `assets/ethers.umd.min.js` | ethers v6 运行时，需与 `index.html` 同目录 |
| `CNAME` | 自定义域名（tapex.live） |
| `README.md` | 本说明 |

## 页面结构（7 Tab）

| Tab | 作用 |
|---|---|
| 铸造 mint | 花 OKB 抽随机部件（8 类 × 3 档 = 24 种 id） |
| 组装 asm | 装配台：按类选档位，8 类各 1 件 + 100 TAPE 组装费 |
| 质押 stake | PC 质押挖 TAPE，支持批量质押 / 解押 |
| 资产 mine | TAPE 余额、PC 列表、部件与算力概览 |
| 分红 divd | 持 TAPEX 按持仓占比分 TAPE |
| 市场 market | PC 挂单 / 撤单 / 购买（TAPE 计价，手续费 10%） |
| 全网 net | 算力、奖励池、抽卡进度、趋势 |

## 合约（X Layer 主网，均为 UUPS 可升级代理）

| 合约 | 地址 |
|---|---|
| TAPE（代币，2100 万） | `0x72F82ca6E91c6fC2dB750928252e0e2661143BBA` |
| CircuitV6（PC NFT） | `0x35639B2DE9717d6169A9A05AD5777DC41BaC576d` |
| MiningV6（质押挖矿） | `0xeaE8799e3Fcf9a1B8585122a1A3bfc5293c63f1f` |
| PartToken（部件 ERC1155） | `0xd1D06cC1b90C6365cEFDBC116B53Ba5c78e97a1c` |
| MarketV6（市场） | `0xd9A39E2E3916EeEE50823bDaaD19a3f988a97322` |
| TapeOutV6（盲盒） | `0x8e0A06B85fFF561567c6ccDbE3d4Cf563819D3Fe` |
| FeeSplitterV6（分红池） | `0x421e9dbf442d2BcbD9cDF81FdAC585d114F55007` |

> 旧版（v3）合约地址已全部停用，请勿再交互。

## 发布

```bash
# 本仓库 main 分支 → Vercel 自动部署
git add index.html && git commit -m "..." && git push

# 部署后校验（应与本地 md5 一致）
curl -sL "https://tapex.live/index.html?v=$RANDOM" | md5
```

## 本地预览

不要直接双击打开（`file://` 下公共 RPC 会拦 CORS，链上数据读不出来）。起一个静态服务：

```bash
python3 -m http.server 8799
# 浏览器打开 http://127.0.0.1:8799/index.html
```
