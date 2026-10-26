import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ADDRS, ABI } from "../lib/contracts";
import { readProvider } from "../lib/wallet";

const fsC = new Contract(ADDRS.feeSplit, ABI.feeSplit as unknown as string[], readProvider);
const tapeC = new Contract(ADDRS.tape, ABI.tape as unknown as string[], readProvider);

/** 全站顶部预警：分红池跑道 < 7 天时提示 */
export function RunwayBanner() {
  const [days, setDays] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    (async () => {
      const [perDay, bal] = await Promise.all([
        fsC.rewardPerDay() as Promise<bigint>,
        tapeC.balanceOf(ADDRS.feeSplit) as Promise<bigint>,   // 分红池里的 TAPE 余额
      ]);
      const pd = Number(formatEther(perDay as bigint));
      const b = Number(formatEther(bal as bigint));
      if (pd > 0) setDays(Math.floor(b / pd));
    })().catch(() => {});
  }, []);

  if (closed || days === null || days >= 7) return null;
  return (
    <div className="runway-banner">
      <b>分红池仅剩约 {days} 天</b>
      <span>按当前释放速度，之后分红将被余额截断</span>
      <button onClick={() => setClosed(true)}>知道了</button>
    </div>
  );
}
