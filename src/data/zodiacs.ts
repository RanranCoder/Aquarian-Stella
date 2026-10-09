export type ElementKey = "fire" | "earth" | "air" | "water";

export type Zodiac = {
  slug: string;
  name: string;
  en: string;
  symbol: string;
  dateRange: string;
  dates: { month: number; day: number }; // 起始月日，用于区间判断
  element: ElementKey;
  elementLabel: string;
  rulingPlanet: string;
  keywords: string[];
  motto: string;
  personality: string;
  love: string;
  career: string;
  todayHint: string;
};

export const ELEMENT_META: Record<
  ElementKey,
  { label: string; color: string }
> = {
  fire: { label: "火象", color: "text-gold-300" },
  earth: { label: "土象", color: "text-lav-300" },
  air: { label: "风象", color: "text-moon-200" },
  water: { label: "水象", color: "text-lav-200" },
};

/**
 * 星座数组——顺序必须严格按黄道排列，首尾相邻（摩羯→水瓶跨年边界）。
 * getSunSign / signFromLon 依赖此顺序做区间判断，不可随意调整。
 */
export const ZODIACS: Zodiac[] = [
  {
    slug: "aries",
    name: "白羊座",
    en: "Aries",
    symbol: "♈",
    dateRange: "3.21 – 4.19",
    dates: { month: 3, day: 21 },
    element: "fire",
    elementLabel: "火象",
    rulingPlanet: "火星",
    keywords: ["勇气", "直接", "行动"],
    motto: "先跑起来，路会在脚下亮起来。",
    personality:
      "你心里有一团不会熄灭的火。比起犹豫，你更愿意先做，再用结果校准方向。你讨厌被低估，也讨厌绕着弯子的试探。",
    love: "喜欢真诚直接的靠近。一见倾心不难，难的是慢下来，让心动长成信任。",
    career: "适合需要冲劲、开头和舞台的位置。把耐心当成肌肉来练，是你最值得的功课。",
    todayHint: "今天适合主动推进一件拖延很久的小事。",
  },
  {
    slug: "taurus",
    name: "金牛座",
    en: "Taurus",
    symbol: "♉",
    dateRange: "4.20 – 5.20",
    dates: { month: 4, day: 20 },
    element: "earth",
    elementLabel: "土象",
    rulingPlanet: "金星",
    keywords: ["安稳", "感官", "坚持"],
    motto: "慢不是迟钝，是你选择对生活认真。",
    personality:
      "你相信看得见、摸得着的踏实。你对自己认定的事有一种近乎固执的耐心，也从不吝啬善待自己的感官。",
    love: "你要的不是热闹，而是一段能慢慢安放的关系。你的爱藏在一餐一饭和长久的陪伴里。",
    career: "适合需要积累、质量和长期主义的领域。你不是最快的，但常常是走得最稳的那个。",
    todayHint: "今天照顾好身体，给自己一顿好好吃饭的时间。",
  },
  {
    slug: "gemini",
    name: "双子座",
    en: "Gemini",
    symbol: "♊",
    dateRange: "5.21 – 6.21",
    dates: { month: 5, day: 21 },
    element: "air",
    elementLabel: "风象",
    rulingPlanet: "水星",
    keywords: ["好奇", "表达", "变化"],
    motto: "世界的丰富，值得你用一生去好奇。",
    personality:
      "你天生对新鲜信息敏感，能同时看见一件事的两面。你的表达轻盈、灵动，也常常比你以为的更聪明。",
    love: "需要能聊得来、也接得住你变化的对象。真正的亲密，是话越说越深，而不是越说越散。",
    career: "适合信息流动快、需要沟通和连接的领域。专注是天赋的放大器，试着把热情安放得久一点。",
    todayHint: "今天适合表达，也适合先听，再开口。",
  },
  {
    slug: "cancer",
    name: "巨蟹座",
    en: "Cancer",
    symbol: "♋",
    dateRange: "6.22 – 7.22",
    dates: { month: 6, day: 22 },
    element: "water",
    elementLabel: "水象",
    rulingPlanet: "月亮",
    keywords: ["敏感", "守护", "归属"],
    motto: "柔软不是弱点，是你保护所爱的盔甲。",
    personality:
      "你对情绪有着旁人不及的敏锐。你记得很多细节，也很在意身边的人是否真的安好。家与归属，是你内心最深的地基。",
    love: "爱得很深，也藏得很深。你需要安全感，也愿意用整颗心去守护你在乎的关系。",
    career: "适合需要共情、关怀和细腻判断的领域。学会把自己的情绪安放好，你会更有力量。",
    todayHint: "今天给自己一点被照顾的时间，也记得照顾你爱的人。",
  },
  {
    slug: "leo",
    name: "狮子座",
    en: "Leo",
    symbol: "♌",
    dateRange: "7.23 – 8.22",
    dates: { month: 7, day: 23 },
    element: "fire",
    elementLabel: "火象",
    rulingPlanet: "太阳",
    keywords: ["自信", "创造", "照亮"],
    motto: "你站的地方，就是光来的方向。",
    personality:
      "你天生带着光芒，渴望被看见，也渴望成全别人。你的慷慨与骄傲一样真实，你的心里住着一个需要掌声的孩子。",
    love: "要的是被珍视、被认真对待。你愿意为爱的人倾其所有，也希望对方愿意为你站台。",
    career: "适合舞台中央和需要创造力的位置。学会让别人的光也能照进来，你会走得更远。",
    todayHint: "今天大方地展现自己，你值得被看见。",
  },
  {
    slug: "virgo",
    name: "处女座",
    en: "Virgo",
    symbol: "♍",
    dateRange: "8.23 – 9.22",
    dates: { month: 8, day: 23 },
    element: "earth",
    elementLabel: "土象",
    rulingPlanet: "水星",
    keywords: ["细致", "秩序", "服务"],
    motto: "把小事做到极致，就是了不起的浪漫。",
    personality:
      "你有一双能看见瑕疵的眼睛，也有一颗想把一切安放整齐的心。你对自己苛刻，却总在不经意间照顾着所有人。",
    love: "爱是具体的事：记得喜好、安排细节、默默承担。你需要被看见那些没说出口的付出。",
    career: "适合需要精准、分析和打磨的领域。试着允许自己「够好」而非「完美」，会轻松很多。",
    todayHint: "今天整理一处混乱，会让你的心也跟着安静。",
  },
  {
    slug: "libra",
    name: "天秤座",
    en: "Libra",
    symbol: "♎",
    dateRange: "9.23 – 10.23",
    dates: { month: 9, day: 23 },
    element: "air",
    elementLabel: "风象",
    rulingPlanet: "金星",
    keywords: ["平衡", "美感", "关系"],
    motto: "在取舍之间，你一直在寻找那个更温柔的答案。",
    personality:
      "你对美和关系有天生的直觉，总想让一切回到平衡。你善于倾听与调和，也常常因为太在意别人的感受而委屈自己。",
    love: "向往势均力敌、彼此体面的关系。真正的平衡，不是永远不争吵，而是争吵后仍然愿意靠近。",
    career: "适合需要审美、协作与判断力的领域。学会为自己的偏好表态，是你在关系里最重要的练习。",
    todayHint: "今天为自己做一次选择，不为取悦任何人。",
  },
  {
    slug: "scorpio",
    name: "天蝎座",
    en: "Scorpio",
    symbol: "♏",
    dateRange: "10.24 – 11.22",
    dates: { month: 10, day: 24 },
    element: "water",
    elementLabel: "水象",
    rulingPlanet: "冥王星",
    keywords: ["深度", "蜕变", "信任"],
    motto: "你越往深处走，就越接近真正的自己。",
    personality:
      "你看人看事都带着一层深水的洞察。你不轻易交付信任，但一旦认定，就是全副身心的投入。重生是你的本能。",
    love: "要的是灵魂层面的连接，而非表面的热闹。信任是你最后才打开的门，也是最深的爱。",
    career: "适合需要深度、洞察和掌控力的领域。放下的能力，和拥有的能力一样重要。",
    todayHint: "今天适合向内看，你比想象中更有力量。",
  },
  {
    slug: "sagittarius",
    name: "射手座",
    en: "Sagittarius",
    symbol: "♐",
    dateRange: "11.23 – 12.21",
    dates: { month: 11, day: 23 },
    element: "fire",
    elementLabel: "火象",
    rulingPlanet: "木星",
    keywords: ["自由", "远方", "乐观"],
    motto: "世界很大，你生来就是为了出发。",
    personality:
      "你的灵魂里住着风与远方。你对意义和自由有一种近乎本能的渴望，也总能用乐观照亮身边的人。",
    love: "需要能一起看世界、也允许彼此自由的伴侣。最好的关系，是两个自由的人选择同行。",
    career: "适合能探索、能成长、能看见更大图景的领域。把热情落成计划，你会走得既远又稳。",
    todayHint: "今天给自己一点「出发」的冲动，哪怕是散个步。",
  },
  {
    slug: "capricorn",
    name: "摩羯座",
    en: "Capricorn",
    symbol: "♑",
    dateRange: "12.22 – 1.19",
    dates: { month: 12, day: 22 },
    element: "earth",
    elementLabel: "土象",
    rulingPlanet: "土星",
    keywords: ["责任", "耐力", "成就"],
    motto: "你攀登的每一级，都算数。",
    personality:
      "你懂得延迟满足，也懂得坚持的复利。你把责任背在肩上，把情绪放进心里，一步一个脚印地走向自己要的高度。",
    love: "爱得慢热但厚重。你需要对方理解你的沉默，也愿意在认定之后，用长久的行动证明。",
    career: "适合需要结构、战略和长期主义的领域。你已经在足够努力，偶尔记得奖励自己。",
    todayHint: "今天别只顾赶路，停下来看看自己已经走了多远。",
  },
  {
    slug: "aquarius",
    name: "水瓶座",
    en: "Aquarius",
    symbol: "♒",
    dateRange: "1.20 – 2.18",
    dates: { month: 1, day: 20 },
    element: "air",
    elementLabel: "风象",
    rulingPlanet: "天王星",
    keywords: ["独立", "革新", "未来"],
    motto: "你和这个世界，保持着恰到好处的距离。",
    personality:
      "你习惯用旁观者的清醒看世界，也总能在常规之外想到新答案。你的独立不是冷漠，而是一种深层的自我保护。",
    love: "需要尊重彼此独立性的关系。你不擅长甜腻，却会在对方真正需要时，成为最可靠的存在。",
    career: "适合创新、科技和独立思考的领域。你的与众不同，正是你最珍贵的部分。",
    todayHint: "今天允许自己与众不同，你的独特就是答案。",
  },
  {
    slug: "pisces",
    name: "双鱼座",
    en: "Pisces",
    symbol: "♓",
    dateRange: "2.19 – 3.20",
    dates: { month: 2, day: 19 },
    element: "water",
    elementLabel: "水象",
    rulingPlanet: "海王星",
    keywords: ["共情", "想象", "温柔"],
    motto: "你用温柔，接住了这个世界的很多浪。",
    personality:
      "你的感受力像海水一样深广，总能体察到别人忽略的情绪。你的想象力丰富，心中装着一个完整的童话。",
    love: "你爱得没有保留，也容易为爱模糊边界。学会先爱自己，是你一生最重要的功课。",
    career: "适合需要共情、创造和感受力的领域。别忘了，温柔也需要锋芒。",
    todayHint: "今天照顾好自己的情绪，你值得被温柔对待。",
  },
];

export function getZodiacBySlug(slug: string): Zodiac | undefined {
  return ZODIACS.find((z) => z.slug === slug);
}

/* ── 人格分析 Profile ── */

export type PersonalityProfile = {
  core: string;       // 核心特质
  emotion: string;    // 情绪模式
  communication: string; // 沟通风格
  relationship: string;  // 关系模式
  action: string;     // 行动风格
  keywords: string[]; // 综合关键词
};

/** 沟通风格模板（按太阳星座元素） */
const COMM_STYLE: Record<ElementKey, string> = {
  fire: "你的表达直接而有力，善于激励他人。说话带着热情与感染力，有时会先说再想。",
  earth: "你的表达务实而有条理，喜欢用事实和细节说话。不轻易许诺，但说到做到。",
  air: "你的表达灵活而善于变通，擅长从多个角度看问题。你喜欢交流和思想碰撞。",
  water: "你的表达细腻而善于共情，常能感知到话语背后的情绪。有时会用暗示代替直说。",
};

/** 行动风格模板（按火星星座元素） */
const ACTION_STYLE: Record<ElementKey, string> = {
  fire: "你做事冲动但高效，遇到目标会立刻行动。需要学会在冲刺前稍作停顿。",
  earth: "你做事稳健而有计划，不打无准备之仗。有时需要提醒自己，不完美也可以开始。",
  air: "你做事善于沟通协调，喜欢同时推进多件事。需要注意避免精力过于分散。",
  water: "你做事跟随直觉，会在内心酝酿充分后才出手。情绪状态直接影响你的效率。",
};

/**
 * 基于本命星盘六颗关键星体，生成综合人格分析。
 * @param sun - 太阳星座
 * @param moon - 月亮星座
 * @param asc - 上升星座（可能为 null）
 * @param mercury - 水星星座
 * @param venus - 金星星座
 * @param mars - 火星星座
 */
export function generatePersonalityProfile(
  sun: Zodiac,
  moon: Zodiac,
  asc: Zodiac | null,
  mercury: Zodiac,
  venus: Zodiac,
  mars: Zodiac,
): PersonalityProfile {
  // 核心特质：太阳 + 上升
  const ascPart = asc
    ? `外在呈现出${asc.elementLabel}的${asc.keywords[0]}特质，`
    : "";
  const core =
    `你的内在驱力是${sun.keywords[0]}与${sun.keywords[1]}（${sun.elementLabel}·${sun.name}）。` +
    `${ascPart}` +
    `内心深处，你需要的是${moon.keywords[0]}与${moon.keywords[1]}（${moon.elementLabel}·${moon.name}）。`;

  // 情绪模式：月亮
  const emotion =
    `月亮落在${moon.name}（${moon.elementLabel}），你的情绪底色是${moon.keywords[0]}与${moon.keywords[1]}。` +
    `${moon.personality}`;

  // 沟通风格：水星 + 元素
  const commElement = COMM_STYLE[mercury.element];
  const communication =
    `水星落在${mercury.name}，你的思维方式偏向${mercury.keywords[0]}与${mercury.keywords[1]}。${commElement}`;

  // 关系模式：金星
  const relationship =
    `金星落在${venus.name}，你在关系中追求${venus.keywords[0]}与${venus.keywords[1]}。${venus.love}`;

  // 行动风格：火星 + 元素
  const actElement = ACTION_STYLE[mars.element];
  const action =
    `火星落在${mars.name}，你的行动力源于${mars.keywords[0]}。${actElement}`;

  // 综合关键词：合并六颗星的关键词，去重取前 8
  const keywords = Array.from(
    new Set([
      ...sun.keywords,
      ...moon.keywords,
      ...(asc ? asc.keywords : []),
      ...mercury.keywords.slice(0, 1),
      ...venus.keywords.slice(0, 1),
      ...mars.keywords.slice(0, 1),
    ]),
  ).slice(0, 8);

  return { core, emotion, communication, relationship, action, keywords };
}
