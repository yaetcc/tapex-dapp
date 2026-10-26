// 区块浏览器外链：数字旁边的 ↗，让每个数字都可验证
export function ScanLink({ path, title }: { path: string; title?: string }) {
  return (
    <a className="scan-link" href={`https://www.oklink.com/xlayer/${path}`} target="_blank" rel="noreferrer"
      title={title ?? "在浏览器查看"} onClick={(e) => e.stopPropagation()}>
      ↗
    </a>
  );
}
