# TapeX DApp（v3 终版 · 已发布）

去中心化"真实硬件"电脑组装游戏 DApp（铸造部件 NFT → 组装 PC → 质押挖矿 → 交易市场），部署于 X Layer 主网（Chain 196）。
版本：v3 修复版（2026-09-24 已重新部署主网） — 含只读接口修复（连接钱包不弹交易）、多 RPC 自动切换、钱包检测加固。

## 文件构成

| 文件 | 说明 |
|---|---|
| `TapeX DApp.html` | DApp 唯一入口（自包含逻辑，内联 CSS/JS） |
| `assets/ethers.umd.min.js` | ethers.js 运行时（入口页引用，需与 HTML 同目录部署） |
| `README.md` | 本说明 |

## 部署方式（任选其一，均为静态托管）

- **GitHub Pages**：新建仓库 → 上传上述文件 → Settings → Pages → 部署分支 → 获得公网链接。
- **Vercel / Netlify**：拖入本目录即可，入口自动识别 `TapeX DApp.html`（或自行改名为 `index.html`）。
- **自有服务器 / 对象存储**：整目录上传，保持相对路径不变（`assets/` 必须与 HTML 同级）。
- **本地使用**：用系统 Chrome 双击 `TapeX DApp.html` 打开（Chrome 需安装 OKX Wallet 或 MetaMask 扩展，浏览器地址栏输入
  `file:///.../TapeX%20DApp.html` 亦可）。

## 合约（X Layer 主网）

| 合约 | 地址 |
|---|---|
| Token（TapeX） | 0xefac9e6D56eAE13c7D7e071297D3B16D09aB7DE5 |
| Processor（部件铸造） | 0x7e8aBC042ceA2f5566298e159E2801b721Bb3AA0 |
| Circuit NFT（PC 组装） | 0x20420E212E0f38EF5e29b3B3ea945F77fbC128E6 |
| Mining（质押挖矿） | 0xA12D7d971E316Dc37689fCbd01Cd2f259f342018 |
| Market（交易市场） | 0x83eBB28beB18477Fb5221Da0106425C336B61CD8 |

## 玩法

铸造部件（OKB 付费，单次上限 10,000 件，总量 1,000,000 上限）→ 组装成完整 PC（CPU/主板/GPU/RAM/SSD/电源/散热器/机箱）→ 质押 PC 挖矿得 TapeX 代币 → 市场自由交易。
