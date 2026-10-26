import { useEffect, useState } from "react";

/** 到账飘字：+X TAPE 向上飘散 */
export function FloatGain({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1400); return () => clearTimeout(t); }, [onDone]);
  return <div className="float-gain">+{text}</div>;
}
