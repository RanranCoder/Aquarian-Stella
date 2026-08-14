/** 本地时区日期字符串 YYYY-MM-DD */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 2026年8月14日 */
export function formatDateCN(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

/** 08.14 */
export function formatDateDot(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${m}.${d}`;
}
