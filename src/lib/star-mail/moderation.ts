const SPAM_KEYWORDS = [
  "加微信", "加v", "兼职", "贷款", "博彩", "彩票", "中奖", "高收益",
  "刷单", "代开发票", "免费领取", "点击链接", "开户", "日赚", "躺赚",
  "数字货币", "币圈", "杀猪盘", "裸聊", "约炮", "联系客服", "转账",
];

const URL_RE = /(https?:\/\/|www\.)\S+/gi;

export type Moderation =
  | { allowed: true }
  | { allowed: false; reason: "SPAM_URL" | "SPAM_KEYWORD" | "SPAM_REPEAT" };

export function checkModeration(input: {
  title: string;
  body: string;
  signature: string;
}): Moderation {
  const text = `${input.title}\n${input.body}\n${input.signature}`;
  const urls = text.match(URL_RE) ?? [];
  if (urls.length > 2) return { allowed: false, reason: "SPAM_URL" };

  const lower = text.toLowerCase();
  for (const kw of SPAM_KEYWORDS) {
    if (lower.includes(kw)) return { allowed: false, reason: "SPAM_KEYWORD" };
  }

  const seen = new Map<string, number>();
  for (const line of input.body.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const n = (seen.get(t) ?? 0) + 1;
    if (n >= 5) return { allowed: false, reason: "SPAM_REPEAT" };
    seen.set(t, n);
  }

  return { allowed: true };
}
