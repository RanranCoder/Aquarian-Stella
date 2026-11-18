import type { Zodiac } from "@/data/zodiacs";
import { ZODIACS } from "@/data/zodiacs";
import { generateMatchReport, pairSlugOf } from "@/lib/match";

/* ================================================================== */
/*  星座详情页扩展内容引擎                                                  */
/*                                                                      */
/*  为 /explore/[slug] 提供优缺点、上升/月亮解读与 FAQ，                    */
/*  全部确定性生成（相同星座 → 相同内容），可安全用于 SSG。                  */
/* ================================================================== */

/* ── 确定性工具 ─────────────────────────────────────────────────── */

function seedOf(slug: string, salt: string): number {
  const s = `${slug}|${salt}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** 从池中选 count 条（确定性、跳过部分条目形成星座间差异） */
function pickSome(pool: string[], count: number, seed: number): string[] {
  const start = seed % pool.length;
  return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]);
}

/* ── 优缺点池（按元素）──────────────────────────────────────────── */

const PROS: Record<string, string[]> = {
  fire: [
    "行动力强：想到就做，很少让机会在犹豫里溜走",
    "真诚坦率：不喜欢拐弯抹角，相处起来不用猜",
    "感染力足：你的热情能点燃周围的人",
    "恢复力快：跌倒了骂两句，爬起来继续",
  ],
  earth: [
    "踏实可靠：承诺过的事，会一件一件兑现",
    "审美在线：对质感与细节有天生的判断力",
    "耐心十足：能陪一件慢的事走很远",
    "边界清晰：懂得照顾自己，也不轻易透支",
  ],
  air: [
    "思维灵活：总能同时看见一件事的两面",
    "社交天赋：跟谁都能聊，聊完还想再聊",
    "学习力强：新东西上手快，好奇心永不断电",
    "心态轻盈：很少被情绪困太久",
  ],
  water: [
    "共情力强：能感觉到别人没说出口的情绪",
    "记忆温柔：记得住那些重要的细节和日子",
    "直觉敏锐：第一感觉往往很准",
    "守护欲强：为了爱的人可以很勇敢",
  ],
};

const CONS: Record<string, string[]> = {
  fire: [
    "容易急躁：节奏一慢就上头，事后又后悔",
    "说话太直：有时好意也会被说成扎人的话",
    "三分钟热度：开始的热情常常大于坚持的耐心",
    "好胜心强：容易把日常小事变成竞技场",
  ],
  earth: [
    "固执己见：认定的事，很难被说服",
    "变化焦虑：计划被打乱时容易烦躁",
    "表达克制：心里在乎，嘴上常常不说",
    "过度自省：容易把责任都揽到自己身上",
  ],
  air: [
    "注意力分散：同时开太多线，容易哪条都没走完",
    "回避冲突：不擅长处理沉重和撕裂的场面",
    "决定困难：选择太多时反而停在原地",
    "情绪隔离：习惯用理性推迟感受",
  ],
  water: [
    "情绪内耗：容易把别人的情绪背成自己的",
    "想太多：一句话能在心里过八百遍",
    "边界模糊：心软起来会委屈自己",
    "敏感多疑：安全感不足时容易过度自保",
  ],
};

/* ── 元素特质描述（FAQ 用）──────────────────────────────────────── */

const ELEMENT_TRAIT: Record<string, string> = {
  fire: "行动先于犹豫，热情是他们与世界相处的方式",
  earth: "务实与耐心是他们安身立命的根本",
  air: "思考与交流是他们理解世界的方式",
  water: "感受与直觉是他们认识世界的入口",
};

/* ── 类型 ───────────────────────────────────────────────────────── */

export type ZodiacExtras = {
  pros: string[];
  cons: string[];
  /** 上升星座科普段 */
  rising: string;
  /** 月亮星座科普段 */
  moon: string;
  faqs: { q: string; a: string }[];
  /** 契合度最高的三个星座（用于内链） */
  bestMatches: { zodiac: Zodiac; slug: string; score: number }[];
};

/**
 * 生成星座详情页的扩展内容（确定性）。
 * 相同星座 → 相同结果。
 */
export function getZodiacExtras(z: Zodiac): ZodiacExtras {
  const sPro = seedOf(z.slug, "pros");
  const sCon = seedOf(z.slug, "cons");

  const pros = pickSome(PROS[z.element], 3, sPro);
  const cons = pickSome(CONS[z.element], 3, sCon);

  // 上升星座：概念科普 + 行动引导
  const rising =
    `${z.name}是你出生时太阳所在的星座，而「上升星座」是你出生那一刻、东方地平线正在升起的星座——它决定了你的第一印象、外在气质和你面对陌生世界的「外壳」。` +
    `很多人觉得自己「不太像」${z.name}，往往是因为上升星座（或月亮星座）带来了另一层性格。上升星座依赖准确的出生时间与地点，误差一小时就可能换一个星座。`;

  // 月亮星座：概念 + 月亮落在该星座的速写
  const moon =
    `月亮星座是你情绪的底色：它描述你需要怎样的安全感、怎样被安抚、以及深夜独处时真实的自己。` +
    `月亮落在${z.name}的人，情绪的核心需求是「${z.keywords[0]}」与「${z.keywords[1]}」——${z.todayHint}`;

  // 最佳配对：用配对引擎取契合度最高的三个星座（内链）
  const best = ZODIACS.filter((o) => o !== z)
    .map((o) => ({ o, report: generateMatchReport(z, o) }))
    .sort((x, y) => y.report.score - x.report.score)
    .slice(0, 3);

  const faqs = [
    {
      q: `${z.name}是什么象星座？`,
      a: `${z.name}是${z.elementLabel}星座（${z.elementLabel}星座的共同点是：${ELEMENT_TRAIT[z.element]}），守护星是${z.rulingPlanet}。`,
    },
    {
      q: `${z.name}的日期是几月几号？`,
      a: `${z.name}的生日区间约为 ${z.dateRange}。星座的分界日期每年会有一两天的浮动，如果你的生日恰好在交界处，建议用准确的出生年月日时计算星盘来确认。`,
    },
    {
      q: `${z.name}和什么座最配？`,
      a: `从元素相性与相位关系看，与${z.name}契合度最高的是${best[0].o.name}、${best[1].o.name}和${best[2].o.name}。完整的两两配对指数，可以查看星座配对表。`,
    },
    {
      q: `${z.name}的性格特点是什么？`,
      a: `${z.personality.split("。")[0]}。在感情里，${z.love.split("。")[0]}。`,
    },
  ];

  return {
    pros,
    cons,
    rising,
    moon,
    faqs,
    bestMatches: best.map((b) => ({
      zodiac: b.o,
      slug: pairSlugOf(z, b.o),
      score: b.report.score,
    })),
  };
}
