// 线上 V6 合约地址与最小 ABI（只保留前端用到的）
export const ADDRS = {
  tape: "0x72F82ca6E91c6fC2dB750928252e0e2661143BBA",
  circuit: "0x35639B2DE9717d6169A9A05AD5777DC41BaC576d",
  mining: "0xeaE8799e3Fcf9a1B8585122a1A3bfc5293c63f1f",
  part: "0xd1D06cC1b90C6365cEFDBC116B53Ba5c78e97a1c",
  market: "0xd9A39E2E3916EeEE50823bDaaD19a3f988a97322",
  tapeOut: "0x8e0A06B85fFF561567c6ccDbE3d4Cf563819D3Fe",
  feeSplit: "0x421e9dbf442d2BcbD9cDF81FdAC585d114F55007",
} as const;

export const CHAIN = { id: 196, hex: "0xc4", name: "X Layer", rpc: "https://rpc.xlayer.tech" };

export const ABI = {
  part: [
    "function balanceOf(address,uint256) view returns (uint256)",
    "function balanceOfBatch(address[],uint256[]) view returns (uint256[])",
    "function isApprovedForAll(address,address) view returns (bool)",
    "function setApprovalForAll(address,bool)",
  ],
  circuit: [
    "function mint(uint256) payable",
    "function assembleWithTiers(uint8[8])",
    "function batchAssembleWithTiers(uint256,uint8[8])",
    "function assembleFee() view returns (uint256)",
    "function baseHash(uint256) view returns (uint256)",
    "function tierMult(uint256) view returns (uint256)",
    "function feeReceiver() view returns (address)",
    "function lastTokenId() view returns (uint256)",
    "function mintFee() view returns (uint256)",
    "function maxMintTotal() view returns (uint256)",
    "function mintedTotal() view returns (uint256)",
    "function pcsOfOwner(address) view returns (uint256[])",
    "function ownerOf(uint256) view returns (address)",
    "function stakedOf(uint256) view returns (bool)",
    "function listedOf(uint256) view returns (bool)",
    "function getCircuitInfo(uint256) view returns (tuple(uint256 processorId,bytes32 circuitHash,uint8[8] tiers,uint32 hashRate,uint8 grade,uint256 createdAt))",
  ],
  mining: [
    "function totalShares() view returns (uint256)",
    "function rewardPerDay() view returns (uint256)",
    "function effectiveSupply() view returns (uint256)",
    "function stake(uint256)",
    "function unstake(uint256)",
    "function batchStake(uint256[])",
    "function batchUnstake(uint256[])",
    "function claim(uint256[]) returns (uint256)",
    "function stakedPCsOf(address) view returns (uint256[])",
    "function userEarned(address) view returns (uint256)",
    "function earned(uint256) view returns (uint256)",
    "function stakes(uint256) view returns (address owner,uint256 stakedAt,uint256 share,bool active,uint256 rewardDebt,uint256 migrated)",
  ],
  tape: ["function balanceOf(address) view returns (uint256)", "function totalSupply() view returns (uint256)", "function allowance(address,address) view returns (uint256)", "function approve(address,uint256)"],
  market: [
    "function activePCOrders() view returns (tuple(address seller,uint256 price,uint256 tokenId,bool active)[])",
    "function listPC(uint256,uint256)",
    "function batchListPC(uint256[],uint256[])",
    "function buyPC(uint256)",
    "function delistPC(uint256[])",
    "function activePartOrders() view returns (tuple(address seller,uint256 price,uint256 amount,uint256 partType,bool active)[])",
    "function listPart(uint256,uint256,uint256)",
    "function batchListPart(uint256[],uint256[],uint256[])",
    "function buyPart(uint256,uint256)",
    "function delistPart(uint256[])",
  ],
  feeSplit: [
    "function pending(address) view returns (uint256)",
    "function stakeToken() view returns (address)",
    "function totalDeposited() view returns (uint256)",
    "function rewardPerDay() view returns (uint256)",
    "function effectiveSupply() view returns (uint256)",
    "function claim() returns (uint256)",
  ],
} as const;

export const pcName = (id: number) => `PC #${id}`;
export const gradeOf = (h: number) => (h >= 240 ? "S" : h >= 160 ? "A" : h >= 80 ? "B" : "C");
export const tierOf = (id: number) => Math.floor((id - 1) / 8);
export const typeOf = (id: number) => (id - 1) % 8;

export const PART_NAMES = ["CPU", "主板", "GPU", "RAM", "SSD", "电源", "散热器", "机箱"] as const;
export const TIERS = ["标准", "Pro", "旗舰"] as const;
