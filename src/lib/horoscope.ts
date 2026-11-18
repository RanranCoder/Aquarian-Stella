import type { Zodiac } from "@/data/zodiacs";
import { ZODIACS } from "@/data/zodiacs";

/* ================================================================== */
/*  公开版「今日运势」确定性内容引擎                                        */
/*                                                                      */
/*  用于 /horoscope 公开 SEO 聚合页：无需登录与出生档案，                   */
/*  按日期 + 星座确定性生成，同一日期同一星座 → 同一内容（可缓存/SSG）。     */
/* ================================================================== */

/** 中国标准时间（UTC+8）的当天日期字符串 YYYY-MM-DD。
 *  部署环境（Cloudflare Workers）的系统时区是 UTC，不能直接用 localDateStr。 */
export function cnDateStr(now: Date = new Date()): string {
  const cn = new Date(now.getTime() + 8 * 3600 * 1000);
  const y = cn.getUTCFullYear();
  const m = String(cn.getUTCMonth() + 1).padStart(2, "0");
  const d = String(cn.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ── 确定性工具 ─────────────────────────────────────────────────── */

function seedOf(zodiacSlug: string, dateStr: string, salt: string): number {
  const s = `${zodiacSlug}|${dateStr}|${salt}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

function dayOfYear(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(Date.UTC(y, 0, 1)).getTime();
  const target = new Date(Date.UTC(y, m - 1, d)).getTime();
  return Math.floor((target - base) / 86400000) + 1;
}

/* ── 文案池 ─────────────────────────────────────────────────────── */

const HEADLINE_TPL = [
  "今天你的{kw0}会替你说话。",
  "今天适合把{kw0}放回生活的中心。",
  "今天的星星轻轻推了你一把：跟着{kw0}走。",
  "今天的世界对你温柔，记得接住这份{kw1}。",
  "今天做决定之前，先听一听心里的{kw0}。",
  "今天不必逞强，{kw1}也是你的力量。",
  "今天适合慢半拍，让{kw0}追上你。",
  "今天有个小小的转机，藏在{kw0}里。",
  "今天把{kw1}交给时间，你只管往前走。",
  "今天的你，比昨天更接近那个{kw0}的自己。",
];

const BODY_TPL = [
  "上午的节奏偏快，{focus}上的事容易被放大。别急着下结论，把观察留到下午——答案往往会自己浮现。傍晚之后，适合把注意力收回来，做一件让自己安静下来的小事。",
  "今天的星象扰动主要落在{focus}。你可能会突然想清楚一件拖了很久的事，或者对某个人的态度有了新的理解。把它记录下来，它会成为你后面的地图。",
  "今天适合处理{focus}相关的事：主动一点，但不强势。你给出的善意，会在几天后悄悄回流。晚间注意休息，别把屏幕带进睡前的最后十分钟。",
  "今天的能量偏内向，{focus}是你今天的主角。有些话不必说满，留三分余地，给彼此空间。你今天的直觉比平时更准，值得信任。",
  "今天的小宇宙把{focus}推到了台前。你想要的答案不在别处，就在你最近一直在回避的那个念头里。今天面对它，会比明天面对容易。",
  "今天的运气藏在细节里：{focus}方面一个小小的调整，就可能带来连锁的好转。别小看一句问候、一次整理、一顿好好吃的饭。",
];

const FOCUS_POOL = ["爱情", "事业", "人际", "情绪", "灵感", "家庭"] as const;

const TIP_POOL = [
  "睡前写下三件今天值得感谢的小事。",
  "把手机放下十分钟，看看窗外的天空。",
  "主动联系一个你很久没说话的人。",
  "给自己泡一杯热茶，慢慢喝完。",
  "整理一个你最容易乱的小角落。",
  "散步十五分钟，不带耳机。",
  "把明天最重要的一件事写下来。",
  "对镜子里的自己说一句鼓励的话。",
];

const LUCKY_COLORS = [
  "雾金", "月白", "薰紫", "星蓝", "暖橘", "薄荷",
  "樱粉", "黛青", "银灰", "酒红", "橄榄绿", "乳白",
] as const;

/* ── 类型 ───────────────────────────────────────────────────────── */

export type PublicHoroscope = {
  date: string;
  /** 今日星语主句 */
  headline: string;
  /** 展开解读 */
  body: string;
  /** 今日聚焦领域 */
  focus: string;
  /** 今日小行动 */
  tip: string;
  /** 幸运色 */
  luckyColor: string;
  /** 幸运数字 1-9 */
  luckyNumber: number;
};

/**
 * 生成某星座在指定日期的公开运势（确定性）。
 * 相同 zodiac + 相同 date → 相同结果。
 */
export function getPublicHoroscope(
  zodiac: Zodiac,
  dateStr: string,
): PublicHoroscope {
  const idx = ZODIACS.indexOf(zodiac);
  const sHead = seedOf(zodiac.slug, dateStr, "headline");
  const sBody = seedOf(zodiac.slug, dateStr, "body");
  const sFocus = seedOf(zodiac.slug, dateStr, "focus");
  const sTip = seedOf(zodiac.slug, dateStr, "tip");
  const sColor = seedOf(zodiac.slug, dateStr, "color");

  const fill = (tpl: string) =>
    tpl
      .replaceAll("{kw0}", zodiac.keywords[0])
      .replaceAll("{kw1}", zodiac.keywords[1] ?? zodiac.keywords[0])
      .replaceAll("{focus}", pick(FOCUS_POOL, sFocus));

  const luckyNumber = ((dayOfYear(dateStr) + idx * 3) % 9) + 1;

  return {
    date: dateStr,
    headline: fill(pick(HEADLINE_TPL, sHead)),
    body: fill(pick(BODY_TPL, sBody)),
    focus: pick(FOCUS_POOL, sFocus),
    tip: pick(TIP_POOL, sTip),
    luckyColor: pick(LUCKY_COLORS, sColor),
    luckyNumber,
  };
}
