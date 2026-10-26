# TapeX DApp（V6 · React 重写版）

铸造 → 组装 → 质押 → 资产 → 分红 → 市场 → 全网，7 个页面。
Vite + React 18 + TypeScript + ethers v6，部署在 Vercel，线上 <https://tapex.live>。

## 目录

```
src/
  lib/        contracts.ts（地址 + 最小 ABI）· wallet.ts · format.ts · i18n.ts
  state/      App.tsx（钱包 / 语言 / toast）
  components/ Nav · Toasts · Atmosphere（光晕星尘）· Mascot · RigArt（矿机）· RigSlots（装配预览）
  pages/      Mint · Build · Stake · Assets · Dividend · Market · Network
  styles/     tokens · base · mint · build · pages · motion · rig
legacy/       2026-10-26 之前的单文件版本（回滚用，不参与构建）
```

## 开发 / 构建

```bash
npm install
npm run dev      # http://127.0.0.1:5178
npm run build    # Vite 构建（Vercel 默认用它）
```

Vercel 上用 `vercel.json` 指定的构建命令：`node scripts/build.mjs`（esbuild 直出 `dist/`，
与 `vite build` 等价的产物，但避开 rollup 原生依赖），输出目录 `dist`。

## 合约（X Layer 196，均为 UUPS 代理）

| 合约 | 地址 |
|---|---|
| TAPE | `0x72F82ca6E91c6fC2dB750928252e0e2661143BBA` |
| CircuitV6 | `0x35639B2DE9717d6169A9A05AD5777DC41BaC576d` |
| MiningV6 | `0xeaE8799e3Fcf9a1B8585122a1A3bfc5293c63f1f` |
| PartToken | `0xd1D06cC1b90C6365cEFDBC116B53Ba5c78e97a1c` |
| MarketV6 | `0xd9A39E2E3916EeEE50823bDaaD19a3f988a97322` |
| TapeOutV6 | `0x8e0A06B85fFF561567c6ccDbE3d4Cf563819D3Fe` |
| FeeSplitterV6 | `0x421e9dbf442d2BcbD9cDF81FdAC585d114F55007` |

## 回滚

上一个单文件版本在 `legacy/20261026-index.html`（配套 `legacy/assets/`）。
紧急回滚：把 `vercel.json` 删掉、把 `legacy/20261026-index.html` 复制回根目录 `index.html`，再推一次即可。
