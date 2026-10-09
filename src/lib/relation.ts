import type { BirthProfile } from "@/lib/astrology";
import { calcNatalChart } from "@/lib/astrology/natal-chart";
import { calcAspectsBetween } from "@/lib/astrology/aspects";
import type { Aspect, AspectType, Planet, PlanetPosition } from "@/lib/astrology/types";

/* ------------------------------------------------------------------ */
/*  输出类型（保持兼容）                                                 */
/* ------------------------------------------------------------------ */

/** 评分因子 */
export type RelationFactor = {
  type: "positive" | "negative";
  planetA: Planet;
  planetB: Planet;
  aspectType: AspectType;
  weight: number;
  label: string;
};

/** 行星位置摘要（用于对比展示） */
export type PlanetPositionSummary = {
  planet: Planet;
  label: string;
  signName: string;
  signSymbol: string;
  degree: number;
};

export type RelationResult = {
  score: number;
  keywords: string[];
  attraction: string[];
  misunderstanding: string[];
  growth: string;
  advice: string;
  /** 你的行星位置 */
  positionsA: PlanetPositionSummary[];
  /** TA 的行星位置 */
  positionsB: PlanetPositionSummary[];
  /** 合盘相位列表（按强度排序） */
  synastryAspects: (Aspect & { label: string })[];
  /** 评分因子分解 */
  factors: RelationFactor[];
};

/* ------------------------------------------------------------------ */
/*  内容模板（按行星/相位类别索引）                                       */
/* ------------------------------------------------------------------ */

interface ContentTemplate {
  keywords: string[];
  attraction: string[];
  misunderstanding: string[];
  growth: string[];
  advice: string[];
}

/** 金星 / 月亮相关 → 情感吸引 */
const VENUS_MOON: ContentTemplate = {
  keywords: ["情感共鸣", "温柔吸引"],
  attraction: [
    "你们在情感表达上有天然的默契，一个眼神就能读懂对方的情绪。",
    "彼此的温柔和细腻会形成一种舒适的磁场，让你们不自觉地想要靠近。",
    "你们对美的感受力很容易同步——喜欢的音乐、电影、甚至散步的路线，都可能不谋而合。",
    "你们之间有一种安静的吸引力，不需要太多语言，光是待在一起就觉得安心。",
    "对生活中小细节的敏感度很像，会同时注意到同一朵云、同一首歌的某句歌词。",
    "情感的节奏很容易对上——一个想说话时，另一个恰好也想倾听。",
  ],
  misunderstanding: [
    "你们都容易把情绪藏在心里，期待对方主动察觉，却忘了开口才是最短的距离。",
    "当一方需要安慰、另一方想给建议时，错位的关心反而会让人觉得没被理解。",
    "你们都怕伤害对方，所以有时候会选择沉默，但沉默本身也可能变成一种距离。",
    "对「安全感」的定义不完全一样，一个需要言语确认，一个需要行动证明。",
  ],
  growth: [
    "这段关系会教你们：真正的亲密，不是猜中对方的心事，而是敢于把脆弱说出来。",
    "你们会一起学会：温柔不只是态度，也是一种需要练习的勇气。",
    "它会让你们明白：被理解的前提是愿意先说出来。",
  ],
  advice: [
    "试着在感到不安时直接说「我现在需要一个拥抱」，而不是等对方来猜。",
    "定期分享一首歌、一部电影——这些小事是情感的养分。",
    "每周留出一段只属于你们的时间，哪怕只是一起散步，也能让默契更深。",
  ],
};

/** 火星相关 → 行动力 / 激情 / 冲突 */
const MARS: ContentTemplate = {
  keywords: ["激情碰撞", "行动共振"],
  attraction: [
    "你们之间的化学反应很直接——被对方的果断、热情或冒险精神吸引。",
    "在一起时会有一种「一起做点什么」的冲动，行动力会互相激发。",
    "你们的对话里常常有电流。表达方式的差异，反而让靠近变得有新鲜感。",
    "被对方身上那股「说做就做」的能量感染，一起时总想尝试新事物。",
    "彼此的勇气会互相点燃——一个人不敢做的事，两个人就敢了。",
    "竞争意识让你们都在对方面前展现最好的自己。",
  ],
  misunderstanding: [
    "一个习惯直接说出想法，另一个更愿意先感受气氛，容易在「没说明白」上产生误会。",
    "遇到冲突时，一个想立刻解决，另一个需要先冷静，节奏不同会让彼此觉得没被理解。",
    "对「主动性」的理解不同——一个觉得主动是热情，另一个可能觉得是压力。",
    "都习惯用自己的方式表达在乎，却没注意到对方接收信号的方式不一样。",
  ],
  growth: [
    "这段关系会练习你们在冲动与谨慎之间，找到属于彼此的节奏。",
    "它会教你们：争论不代表否定，碰撞之后的和解反而让关系更结实。",
    "你们会学到：真正的力量不是谁赢了争论，而是争论之后还能好好拥抱。",
  ],
  advice: [
    "在讨论重要事情前，先确认彼此的心情是放松的，再开口。",
    "学会在对方的节奏里等待，也在自己的边界里坦诚。",
    "试着把「你总是」换成「我希望」，对话会温和很多。",
  ],
};

/** 土星相关 → 责任 / 现实考验 */
const SATURN: ContentTemplate = {
  keywords: ["稳重踏实", "现实考验"],
  attraction: [
    "你们之间有一种让人安心的稳定感，像是在喧嚣中找到了可以停靠的地方。",
    "彼此的责任感和可靠性会形成深层的信任，这是很多关系缺少的东西。",
    "一个更理性、一个更感性，恰好补上对方容易忽略的那一面。",
    "在一起时会有一种「日子可以慢慢过」的踏实感，不急不躁。",
    "对方身上那种「说到做到」的品质，会让你觉得这段关系值得信赖。",
    "你们都懂得延迟满足——为了一起的未来，愿意先放下眼前的诱惑。",
  ],
  misunderstanding: [
    "你们对「陪伴」的定义不太一样，一个想要时刻在场，一个想要各自空间。",
    "当压力来临时，一个向外求助，一个向内消化，可能被误解为「不在乎」。",
    "对「未来规划」的节奏可能不同，一个想尽快确定，另一个需要更多时间思考。",
    "都习惯用行动表达爱意，但有时候对方需要的是一句直接的「我在乎你」。",
  ],
  growth: [
    "这段关系会教你们：承诺不是束缚，而是两个人一起把日子过好的决心。",
    "它会提醒你们，先照顾好自己，才能更好地拥抱对方。",
    "你们会学到：柔软不是软弱，敢在对方面前示弱才是真正的信任。",
  ],
  advice: [
    "定期给彼此一段「只属于我们」的时间，关系需要留白。",
    "把「我以为你知道」换成「我需要你听到」，很多误会会提前消失。",
    "每个月做一次「状态同步」——聊聊各自的感受，别让小情绪积成大问题。",
  ],
};

/** 冥王星 / 天王星 / 海王星 → 深层转化 / 灵性 */
const OUTER_PLANET: ContentTemplate = {
  keywords: ["深层连接", "灵魂共振"],
  attraction: [
    "你们之间的连接有一种说不清的深度，像是很久以前就认识了。",
    "在一起时，会不自觉地变得更像自己，而不是更讨好对方。",
    "共同的好奇心是你们最强的纽带，探索世界的脚步很容易同步。",
    "你们的对话常常能触碰到平时不会对别人说的深层想法。",
    "在一起时会有一种「被看见」的感觉，不只是表面的喜欢，而是真正的理解。",
    "对人生意义的追问会让你们的交流有一种超越日常的质感。",
  ],
  misunderstanding: [
    "你们都容易高估对方「应该知道我的想法」，而低估了把话说清楚的必要性。",
    "当一方在经历内在变化时，另一方可能完全没察觉，产生「你变了」的距离感。",
    "对「自由」的需求程度不同，一个需要更多个人空间，另一个可能觉得被冷落。",
    "都习惯用沉默消化情绪，但沉默太久会被误读为「不在乎」。",
  ],
  growth: [
    "你们会一起学会：真正的关系，是在分歧里仍然选择靠近。",
    "这段关系可能带你们看见自己从未注意到的盲区，虽然不舒服，但会让人更完整。",
    "它会教你们：接纳变化是关系的必修课，而不是危机的信号。",
  ],
  advice: [
    "给彼此留出独处的空间，深度连接不等于时时刻刻黏在一起。",
    "试着一起做一些「不一样」的事——打破惯性，是这段关系最好的养分。",
    "定期分享各自最近在想的事，哪怕只是随口说说，也能避免渐行渐远。",
  ],
};

/** 默认模板（无显著相位时的兜底） */
const DEFAULT: ContentTemplate = {
  keywords: ["星座相遇", "自然吸引"],
  attraction: [
    "你们会被彼此身上与自己不同的那部分吸引——一个负责往前，一个负责停靠。",
    "你们在一起时，会不自觉地变得更像自己，而不是更讨好对方。",
    "共同的好奇心是你们最强的纽带，探索世界的脚步很容易同步。",
  ],
  misunderstanding: [
    "你们都容易高估对方「应该知道我的想法」，而低估了把话说清楚的必要性。",
    "当压力来临时，一个向外求助，一个向内消化，可能被误解为「不在乎」。",
  ],
  growth: [
    "这段关系会教你们：差异不是隔阂，而是看见另一种活法的窗口。",
    "它会提醒你们，先照顾好自己，才能更好地拥抱对方。",
  ],
  advice: [
    "把「我以为你知道」换成「我需要你听到」，很多误会会提前消失。",
    "在讨论重要事情前，先确认彼此的心情是放松的，再开口。",
    ],
  };

  /** 水星相关 → 沟通 / 思维 / 表达 */
  const MERCURY: ContentTemplate = {
    keywords: ["思维共振", "言语默契"],
    attraction: [
      "你们的对话有一种天然的流畅感，聊什么都能接上，像是频率对上了。",
      "在一起时，脑子会转得更快——对方的某个观点常常能激发你的新想法。",
      "你们对信息的接收方式很像，喜欢的播客、文章、甚至笑点都可能高度重合。",
      "被对方的思维方式吸引——一个更跳跃，一个更有条理，恰好互补。",
      "聊天是你们最强的连接方式，哪怕只是闲聊也能聊出深度。",
    ],
    misunderstanding: [
      "一个喜欢把想法说出来再整理，另一个习惯先想清楚再开口，节奏差异容易产生误解。",
      "对「认真讨论」的定义不同——一个觉得是日常交流，另一个可能觉得是在争论。",
      "都习惯用逻辑说服对方，但有时候对方需要的不是道理，而是被听到。",
    ],
    growth: [
      "这段关系会练习你们：沟通不只是交换信息，也是交换感受。",
      "你们会学到：倾听比表达更难，但也更有力量。",
      "它会让你们发现：同一个问题可以有两种都对的答案。",
    ],
    advice: [
      "试着在对话中多问一句「你现在需要我听还是给建议？」，避免错位。",
      "一起写点东西、讨论一本书——思维的碰撞是最好的关系养分。",
      "学会在对方说得不清楚时追问，而不是直接下结论。",
    ],
  };

  /** 木星相关 → 成长 / 乐观 / 信念 */
  const JUPITER: ContentTemplate = {
    keywords: ["共同成长", "乐观吸引"],
    attraction: [
      "你们在一起时，会不自觉地对未来更乐观——好像什么都有可能。",
      "对方身上那种「相信好事会发生」的能量会感染你，让日子都亮了一点。",
      "你们都愿意尝试新事物，一起探索未知的勇气是这段关系最珍贵的部分。",
      "在一起时会觉得人生变宽了——视野、想法、甚至吃的口味都在拓展。",
      "对「成长」的追求让你们有一种天然的同盟感。",
    ],
    misunderstanding: [
      "一个更看重过程中的体验，另一个更在意结果，节奏不同可能产生摩擦。",
      "都习惯给对方「鼓励」，但有时候对方需要的不是加油，而是被允许停下来。",
      "对「冒险」的边界认知不同——一个觉得是勇敢，另一个可能觉得是冲动。",
    ],
    growth: [
      "这段关系会教你们：一起成长不是比赛，而是互相扶持着往前走。",
      "它会让你们学会：乐观不是忽视问题，而是相信问题可以被解决。",
      "你们会发现：真正的富足不是拥有更多，而是一起经历更多。",
    ],
    advice: [
      "一起定一个共同的小目标——哪怕是学做一道新菜，也能让关系更有方向感。",
      "在对方低落时，不要急着拉他起来，先陪他坐一会儿。",
      "定期一起回顾「我们一起经历了什么」，会比想象中更有力量。",
    ],
  };

/* ------------------------------------------------------------------ */
/*  评分规则                                                           */
/* ------------------------------------------------------------------ */

interface SynastryRule {
  a: Planet;
  b: Planet;
  type: AspectType;
  weight: number;
}

/**
 * 合盘评分规则。
 *
 * - 和谐相位（trine / sextile）为正分
 * - 紧张相位（square / opposition）为负分
 * - 合相（conjunction）视行星组合而定
 */
const SYNASTRY_RULES: SynastryRule[] = [
  // ── 正面：和谐相位 ──
  { a: "venus", b: "venus", type: "trine", weight: 12 },
  { a: "venus", b: "venus", type: "sextile", weight: 10 },
  { a: "venus", b: "moon", type: "trine", weight: 11 },
  { a: "venus", b: "moon", type: "sextile", weight: 9 },
  { a: "moon", b: "moon", type: "trine", weight: 10 },
  { a: "moon", b: "moon", type: "sextile", weight: 8 },
  { a: "venus", b: "mars", type: "trine", weight: 10 },
  { a: "venus", b: "mars", type: "sextile", weight: 8 },
  { a: "sun", b: "moon", type: "trine", weight: 9 },
  { a: "sun", b: "moon", type: "sextile", weight: 7 },
  { a: "sun", b: "venus", type: "trine", weight: 8 },
  { a: "sun", b: "venus", type: "sextile", weight: 6 },
  { a: "sun", b: "sun", type: "trine", weight: 7 },
  { a: "sun", b: "sun", type: "sextile", weight: 5 },
  { a: "mars", b: "mars", type: "trine", weight: 6 },
  { a: "mars", b: "mars", type: "sextile", weight: 5 },
  { a: "mercury", b: "mercury", type: "trine", weight: 6 },
  { a: "mercury", b: "mercury", type: "sextile", weight: 5 },
  { a: "venus", b: "jupiter", type: "trine", weight: 8 },
  { a: "venus", b: "jupiter", type: "sextile", weight: 6 },
  { a: "moon", b: "jupiter", type: "trine", weight: 7 },
  { a: "jupiter", b: "jupiter", type: "trine", weight: 6 },
  { a: "jupiter", b: "jupiter", type: "sextile", weight: 5 },

  // ── 正面：和谐合相 ──
  { a: "venus", b: "venus", type: "conjunction", weight: 11 },
  { a: "venus", b: "moon", type: "conjunction", weight: 10 },
  { a: "moon", b: "moon", type: "conjunction", weight: 9 },
  { a: "sun", b: "moon", type: "conjunction", weight: 8 },
  { a: "sun", b: "venus", type: "conjunction", weight: 7 },
  { a: "venus", b: "mars", type: "conjunction", weight: 9 },
  { a: "sun", b: "sun", type: "conjunction", weight: 6 },
  { a: "mercury", b: "mercury", type: "conjunction", weight: 5 },

  // ── 负面：紧张相位 ──
  { a: "mars", b: "venus", type: "square", weight: -10 },
  { a: "mars", b: "venus", type: "opposition", weight: -8 },
  { a: "mars", b: "moon", type: "square", weight: -9 },
  { a: "mars", b: "moon", type: "opposition", weight: -7 },
  { a: "venus", b: "saturn", type: "square", weight: -8 },
  { a: "venus", b: "saturn", type: "opposition", weight: -7 },
  { a: "moon", b: "saturn", type: "square", weight: -8 },
  { a: "moon", b: "saturn", type: "opposition", weight: -6 },
  { a: "sun", b: "saturn", type: "square", weight: -7 },
  { a: "sun", b: "saturn", type: "opposition", weight: -6 },
  { a: "venus", b: "pluto", type: "square", weight: -7 },
  { a: "venus", b: "pluto", type: "opposition", weight: -6 },
  { a: "moon", b: "pluto", type: "square", weight: -7 },
  { a: "moon", b: "pluto", type: "opposition", weight: -5 },
  { a: "mars", b: "mars", type: "opposition", weight: -7 },
  { a: "mars", b: "mars", type: "square", weight: -6 },
  { a: "sun", b: "sun", type: "square", weight: -6 },
  { a: "sun", b: "sun", type: "opposition", weight: -5 },
  { a: "moon", b: "moon", type: "square", weight: -6 },
  { a: "moon", b: "moon", type: "opposition", weight: -5 },

  // ── 负面：紧张合相（某些行星组合的合相是紧张的）──
  { a: "mars", b: "moon", type: "conjunction", weight: -5 },
  { a: "venus", b: "saturn", type: "conjunction", weight: -6 },
  { a: "moon", b: "saturn", type: "conjunction", weight: -6 },
  { a: "venus", b: "pluto", type: "conjunction", weight: -5 },
  { a: "moon", b: "pluto", type: "conjunction", weight: -5 },
];

/* ------------------------------------------------------------------ */
/*  工具函数                                                           */
/* ------------------------------------------------------------------ */

function matchKey(a: Planet, b: Planet): string {
  return [a, b].sort().join(":");
}

function buildIndex(rules: SynastryRule[]): Map<string, SynastryRule> {
  const map = new Map<string, SynastryRule>();
  for (const r of rules) {
    map.set(`${matchKey(r.a, r.b)}:${r.type}`, r);
  }
  return map;
}

const RULE_MAP = buildIndex(SYNASTRY_RULES);

const POSITIVE_MAX = SYNASTRY_RULES.filter((r) => r.weight > 0).reduce(
  (s, r) => s + r.weight,
  0,
);

const NEGATIVE_MAX = Math.abs(
  SYNASTRY_RULES.filter((r) => r.weight < 0).reduce((s, r) => s + r.weight, 0),
);

/** 行星中文名（小写 slug -> 中文） */
const PLANET_LABEL: Record<Planet, string> = {
  sun: "太阳",
  moon: "月亮",
  mercury: "水星",
  venus: "金星",
  mars: "火星",
  jupiter: "木星",
  saturn: "土星",
  uranus: "天王星",
  neptune: "海王星",
  pluto: "冥王星",
  asc: "上升",
};

/** 相位中文名 */
const ASPECT_LABEL: Record<AspectType, string> = {
  conjunction: "合相",
  opposition: "对冲",
  trine: "三分",
  square: "四分",
  sextile: "六分",
};

/** 星座中文名（slug -> 中文） */
const SIGN_LABEL: Record<string, { name: string; symbol: string }> = {
  aries: { name: "白羊", symbol: "♈" },
  taurus: { name: "金牛", symbol: "♉" },
  gemini: { name: "双子", symbol: "♊" },
  cancer: { name: "巨蟹", symbol: "♋" },
  leo: { name: "狮子", symbol: "♌" },
  virgo: { name: "处女", symbol: "♍" },
  libra: { name: "天秤", symbol: "♎" },
  scorpio: { name: "天蝎", symbol: "♏" },
  sagittarius: { name: "射手", symbol: "♐" },
  capricorn: { name: "摩羯", symbol: "♑" },
  aquarius: { name: "水瓶", symbol: "♒" },
  pisces: { name: "双鱼", symbol: "♓" },
};

/** 生成行星位置摘要 */
function summarizePositions(positions: PlanetPosition[]): PlanetPositionSummary[] {
  return positions.map((p) => ({
    planet: p.planet,
    label: PLANET_LABEL[p.planet] ?? p.planet,
    signName: SIGN_LABEL[p.sign]?.name ?? p.sign,
    signSymbol: SIGN_LABEL[p.sign]?.symbol ?? "",
    degree: Math.round(p.degree),
  }));
}

/** 生成相位描述标签 */
function aspectLabel(asp: Aspect): string {
  return `${PLANET_LABEL[asp.planetA]} ${ASPECT_LABEL[asp.type]} ${PLANET_LABEL[asp.planetB]}`;
}

/** 相位对应的评分语境标签 */
const ASPECT_SCORE_HINT: Record<AspectType, { positive: string; negative: string }> = {
  conjunction: { positive: "和谐共鸣", negative: "碰撞强烈" },
  trine: { positive: "和谐吸引", negative: "" },
  sextile: { positive: "默契配合", negative: "" },
  square: { positive: "", negative: "冲突张力" },
  opposition: { positive: "", negative: "对立拉扯" },
};

function buildFactor(rule: SynastryRule, asp: Aspect): RelationFactor {
  const isPositive = rule.weight > 0;
  const hint = isPositive
    ? ASPECT_SCORE_HINT[asp.type].positive
    : ASPECT_SCORE_HINT[asp.type].negative;
  const label =
    `${PLANET_LABEL[rule.a]} ${ASPECT_LABEL[rule.type]} ${PLANET_LABEL[rule.b]}` +
    (hint ? `（${hint}）` : "");
  return {
    type: isPositive ? "positive" : "negative",
    planetA: asp.planetA,
    planetB: asp.planetB,
    aspectType: asp.type,
    weight: rule.weight,
    label,
  };
}

/** 判断行星是否属于某个类别 */
function isVenusMoon(planet: Planet): boolean {
  return planet === "venus" || planet === "moon";
}

function isMars(planet: Planet): boolean {
  return planet === "mars";
}

function isSaturn(planet: Planet): boolean {
  return planet === "saturn";
}

function isOuterPlanet(planet: Planet): boolean {
  return planet === "uranus" || planet === "neptune" || planet === "pluto";
}

function isMercury(planet: Planet): boolean {
  return planet === "mercury";
}

function isJupiter(planet: Planet): boolean {
  return planet === "jupiter";
}

/* ------------------------------------------------------------------ */
/*  从合盘相位中提取内容类别                                              */
/* ------------------------------------------------------------------ */

/**
 * 统计各内容类别的命中次数，返回排序后的类别列表。
 * 用于选择最相关的文案模板。
 */
function categorizeAspects(aspects: Aspect[]): ContentTemplate[] {
  const scores = new Map<ContentTemplate, number>();

  for (const asp of aspects) {
    const strength = asp.strength;

    // 金星/月亮相关相位
    if (isVenusMoon(asp.planetA) || isVenusMoon(asp.planetB)) {
      scores.set(VENUS_MOON, (scores.get(VENUS_MOON) ?? 0) + strength);
    }
    // 火星相关相位
    if (isMars(asp.planetA) || isMars(asp.planetB)) {
      scores.set(MARS, (scores.get(MARS) ?? 0) + strength);
    }
    // 土星相关相位
    if (isSaturn(asp.planetA) || isSaturn(asp.planetB)) {
      scores.set(SATURN, (scores.get(SATURN) ?? 0) + strength);
    }
    // 外行星相关相位
    if (isOuterPlanet(asp.planetA) || isOuterPlanet(asp.planetB)) {
      scores.set(OUTER_PLANET, (scores.get(OUTER_PLANET) ?? 0) + strength);
    }
    // 水星相关相位
    if (isMercury(asp.planetA) || isMercury(asp.planetB)) {
      scores.set(MERCURY, (scores.get(MERCURY) ?? 0) + strength);
    }
    // 木星相关相位
    if (isJupiter(asp.planetA) || isJupiter(asp.planetB)) {
      scores.set(JUPITER, (scores.get(JUPITER) ?? 0) + strength);
    }
  }

  // 按分数降序排列
  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tpl]) => tpl);

  // 至少返回默认模板作为兜底
  if (sorted.length === 0) return [DEFAULT];
  return sorted;
}

/**
 * 按优先级合并两个模板的内容数组，去重后取前 N 项。
 * 内容顺序直接由模板优先级（相位强度）决定，无随机依赖。
 */
function mergeItems(primary: string[], secondary: string[], count: number): string[] {
  const merged = [...primary, ...secondary.filter((t) => !primary.includes(t))];
  return merged.slice(0, count);
}

/* ------------------------------------------------------------------ */
/*  核心函数                                                           */
/* ------------------------------------------------------------------ */

/**
 * 基于两人出生信息计算关系星图（synastry）。
 *
 * 分别计算两人的本命星盘，再计算两盘之间的合盘相位，
 * 然后基于相位加权计算关系分数并选择对应内容模板。
 *
 * 纯函数：相同输入始终输出相同结果，无随机数依赖。
 */
export function getRelation(
  profileA: BirthProfile,
  profileB: BirthProfile,
): RelationResult {
  // 1. 计算本命星盘
  const chartA = calcNatalChart(profileA);
  const chartB = calcNatalChart(profileB);

  // 2. 计算合盘相位（synastry）
  const synastryAspects = calcAspectsBetween(chartA.positions, chartB.positions);

  // 3. 计算分数 + 收集评分因子
  let rawScore = 0;
  const factors: RelationFactor[] = [];
  for (const asp of synastryAspects) {
    const key = `${matchKey(asp.planetA, asp.planetB)}:${asp.type}`;
    const rule = RULE_MAP.get(key);
    if (rule) {
      rawScore += rule.weight * asp.strength;
      factors.push(buildFactor(rule, asp));
    }
  }
  // 按绝对分数降序排列
  factors.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  let bonus: number;
  if (rawScore >= 0) {
    bonus = POSITIVE_MAX > 0 ? (rawScore / POSITIVE_MAX) * 40 : 0;
  } else {
    bonus = NEGATIVE_MAX > 0 ? (rawScore / NEGATIVE_MAX) * 40 : 0;
  }
  const score = Math.round(60 + bonus);
  const clampedScore = Math.min(100, Math.max(0, score));

  // 3. 选择内容模板
  const templates = categorizeAspects(synastryAspects);
  const primary = templates[0];
  const secondary = templates.length > 1 ? templates[1] : DEFAULT;

  const keywords = [
    ...primary.keywords.slice(0, 1),
    ...(secondary !== primary ? secondary.keywords.slice(0, 1) : DEFAULT.keywords.slice(0, 1)),
    "关系成长",
  ];

  // 4. 行星位置摘要
  const positionsA = summarizePositions(chartA.positions);
  const positionsB = summarizePositions(chartB.positions);

  // 5. 合盘相位（按强度排序，带标签）
  const labelledAspects = synastryAspects
    .slice()
    .sort((a, b) => b.strength - a.strength)
    .map((asp) => ({ ...asp, label: aspectLabel(asp) }));

  return {
    score: clampedScore,
    keywords,
    attraction: mergeItems(primary.attraction, secondary.attraction, 3),
    misunderstanding: mergeItems(primary.misunderstanding, secondary.misunderstanding, 3),
    growth: mergeItems(primary.growth, secondary.growth, 1)[0],
    advice: mergeItems(primary.advice, secondary.advice, 1)[0],
    positionsA,
    positionsB,
    synastryAspects: labelledAspects,
    factors,
  };
}
