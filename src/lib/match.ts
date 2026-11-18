import type { ElementKey, Zodiac } from "@/data/zodiacs";
import { ZODIACS } from "@/data/zodiacs";

/* ================================================================== */
/*  星座配对确定性内容引擎                                                  */
/*                                                                      */
/*  相同的一对星座 → 相同的配对报告（稳定可复现、可 SSG 缓存）。              */
/*  内容由「黄道角度关系 × 元素相性 × 双方关键词」确定性生成，               */
/*  66 个组合各有差异，避免模板雷同。                                      */
/* ================================================================== */

/* ── 黄道角度关系 ───────────────────────────────────────────────── */

export type AspectKind =
  | "same" // 合相 0°（同星座）
  | "semisextile" // 半六合 30°（相邻星座）
  | "sextile" // 六合 60°
  | "square" // 刑 90°
  | "trine" // 三合 120°
  | "quincunx" // 梅花相 150°
  | "opposition"; // 对宫 180°

const ASPECT_META: Record<AspectKind, { label: string; base: number }> = {
  same: { label: "同星座 · 合相（0°）", base: 86 },
  semisextile: { label: "相邻星座 · 半六合（30°）", base: 72 },
  sextile: { label: "六合（60°）", base: 80 },
  square: { label: "刑相位（90°）", base: 66 },
  trine: { label: "三合（120°）", base: 92 },
  quincunx: { label: "梅花相（150°）", base: 60 },
  opposition: { label: "对宫相位（180°）", base: 76 },
};

/** 根据两个星座在黄道上的位置差，判断角度关系 */
function aspectBetween(idxA: number, idxB: number): AspectKind {
  const diff = Math.min((idxB - idxA + 12) % 12, (idxA - idxB + 12) % 12);
  switch (diff) {
    case 0:
      return "same";
    case 1:
      return "semisextile";
    case 2:
      return "sextile";
    case 3:
      return "square";
    case 4:
      return "trine";
    case 5:
      return "quincunx";
    case 6:
      return "opposition";
    default:
      return "same";
  }
}

/* ── 元素相性 ───────────────────────────────────────────────────── */

type ElementTone = "great" | "good" | "tough";

const ELEMENT_RELATION: Record<
  string,
  { label: string; tone: ElementTone; adj: number }
> = {
  "fire+fire": { label: "同为火象", tone: "great", adj: 4 },
  "earth+earth": { label: "同为土象", tone: "great", adj: 4 },
  "air+air": { label: "同为风象", tone: "great", adj: 4 },
  "water+water": { label: "同为水象", tone: "great", adj: 4 },
  "fire+air": { label: "火风相生", tone: "good", adj: 2 },
  "earth+water": { label: "土水相养", tone: "good", adj: 2 },
  "fire+earth": { label: "火土相制", tone: "tough", adj: -4 },
  "fire+water": { label: "火水相克", tone: "tough", adj: -4 },
  "earth+air": { label: "风土相制", tone: "tough", adj: -4 },
  "air+water": { label: "风水相扰", tone: "tough", adj: -4 },
};

/** 元素组合查表的固定排序（与 ELEMENT_RELATION 的 key 一致） */
const ELEMENT_ORDER: ElementKey[] = ["fire", "earth", "air", "water"];

function elementRelation(a: ElementKey, b: ElementKey) {
  const [x, y] =
    ELEMENT_ORDER.indexOf(a) <= ELEMENT_ORDER.indexOf(b)
      ? [a, b]
      : [b, a];
  return ELEMENT_RELATION[`${x}+${y}`];
}

/* ── 确定性工具 ─────────────────────────────────────────────────── */

function seedOf(a: string, b: string, salt: string): number {
  const s = `${a}|${b}|${salt}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/* ── 配对报告类型 ───────────────────────────────────────────────── */

export type MatchReport = {
  /** 两位星座（按 ZODIACS 黄道顺序排列，前者在先） */
  a: Zodiac;
  b: Zodiac;
  /** 综合匹配度 50-98 */
  score: number;
  /** 一句话结论，如「天作之合」「欢喜冤家」 */
  verdict: string;
  aspectKind: AspectKind;
  aspectLabel: string;
  /** 元素关系标签，如「火风相生」 */
  elementLabel: string;
  /** 四维评分 */
  dimensions: { key: string; score: number }[];
  /** 正文四段 */
  sections: {
    attraction: string;
    harmony: string;
    challenge: string;
    advice: string;
  };
  /** 常见问题（用于页面 FAQ 与 FAQPage 结构化数据） */
  faqs: { q: string; a: string }[];
};

/* ── 一句话结论分档 ─────────────────────────────────────────────── */

function verdictOf(score: number): string {
  if (score >= 90) return "天作之合";
  if (score >= 82) return "彼此成就";
  if (score >= 75) return "舒适同频";
  if (score >= 68) return "欢喜冤家";
  return "需要磨合";
}

/* ── 文案模板 ───────────────────────────────────────────────────── */
/*  每类角度写多个变体，用确定性 seed 选取，保证 66 页内容彼此不同。        */

const ATTRACTION_TPL: Record<AspectKind, string[]> = {
  same: [
    "{a}和{b}像照镜子一样相似：都是{a_kw}的人，也都是{b_kw}的信徒。你们几乎不需要解释自己，一个眼神就能确认「你懂我」。这种被深深理解的感觉，正是这段关系最强的黏合剂。",
    "初见时{a}和{b}就会惊讶于彼此的默契——同样的{a_kw}、同样认准了就不回头的{b_kw}。你们像两个频率相同的电台，信号一接通就满是共鸣。",
    "{a}和{b}是同类人：一个{a_kw}，一个{b_kw}，喜欢的东西、讨厌的事情、说话的节奏都惊人地一致。和这样天生合拍的人在一起，恋爱会像回到了家。",
  ],
  semisextile: [
    "{a}和{b}像住在同一层楼的两户邻居：抬头不见低头见，气质里却藏着微妙的差异。一个是{a_kw}的，一个是{b_kw}的——这种「像又不太像」的距离感，会慢慢长出一种熟悉的安全感。",
    "{a}和{b}是彼此生活半径里的星座，靠近得很自然，但看世界的角度差了那么一格。正因如此，你们的关系像慢慢升温的茶，越相处越有味道。",
  ],
  sextile: [
    "{a}和{b}之间有一种轻松的默契：一个{a_kw}，一个{b_kw}，兴趣相投，话题不断。你们不需要费力迁就，就能把日子过得舒服——这类「毫不费力的关系」，往往越处越久。",
    "{a}和{b}天生聊得来。一个擅长{a_kw}，一个自带{b_kw}，彼此的分享欲能一直在线。这段关系最难得的，是从一开始就没有拧巴的感觉。",
  ],
  square: [
    "{a}和{b}之间有一种说不清的电光石火：一个是{a_kw}的，一个是{b_kw}的，风格完全不同，却恰恰因为不同而互相吸引。刑相位的关系自带张力——开始得越热烈，考验也来得越真实。",
    "{a}和{b}是典型的「欢喜冤家」：一个{a_kw}，一个{b_kw}，磕磕绊绊不断，却总在吵完之后发现谁也离不开谁。这段感情的火花，恰恰来自那些摩擦。",
  ],
  trine: [
    "{a}和{b}是占星里公认的和谐组合：{a_kw}遇上{b_kw}，像风助火势、火借风威，彼此的能量天然地互相放大。你们在一起时最像「顺流而下」——不费劲、少内耗，舒服得让人羡慕。",
    "在配对组合里，{a}和{b}属于高和谐度的一档：一个自带{a_kw}，一个天生{b_kw}，两个人看世界的底层逻辑几乎一致。这种深处的同频，是长久关系最硬的底牌。",
  ],
  quincunx: [
    "{a}和{b}像两个来自不同星球的人：一个{a_kw}，一个{b_kw}，连生气的方式都不在同一频道。但也正因为全然不同，这段关系里永远有新鲜感和探索欲——只要愿意翻译彼此的语言。",
    "{a}和{b}初见时大概率会互相好奇：对方的生活逻辑和自己如此不同。一个{a_kw}，一个{b_kw}，磨合期会比较明显，可一旦找到相处节奏，你们会看到彼此世界里从未见过的风景。",
  ],
  opposition: [
    "{a}和{b}站在黄道的两端，是彼此的「镜像伴侣」：一个{a_kw}，一个{b_kw}，看似相反，实则互补。对宫组合的吸引力极强——你缺的那一半，恰好对方有。",
    "{a}和{b}是天生的磁极：一个擅长{a_kw}，一个自带{b_kw}，像钟摆的两端互相牵引。这种关系开始时往往轰轰烈烈，你们在对方身上看见的，正是自己想成为的样子。",
  ],
};

const HARMONY_TPL: Record<ElementTone, string[]> = {
  great: [
    "你们同属{element}，情绪的节拍器和本能反应几乎一致：{a}的{a_kw2}和{b}的{b_kw2}互相呼应，很难出现「我说了你不懂」的错位。默契是这段关系的主旋律。",
    "同样的元素意味着相似的底层情绪逻辑。{a}需要的安慰和{b}给出的安慰，恰好是同一种配方——{a_kw2}遇上{b_kw2}，你们天然就能接住彼此。",
  ],
  good: [
    "你们的元素是占星里的经典搭档（{element}）：{a}的{a_kw2}负责点火，{b}的{b_kw2}负责流动，能量在你们之间形成正向循环。越互动，彼此的天赋越被放大。",
    "{element}的组合让你们天然互补：{a}提供{a_kw2}，{b}带来{b_kw2}，两个人像同一支队伍的两个位置，配合起来行云流水。",
  ],
  tough: [
    "你们的元素关系是{element}，底层节奏不同：{a}习惯{a_kw2}，{b}更偏向{b_kw2}，同样的场景常常读出两种剧本。这不是谁对谁错，而是需要练习「翻译」彼此的表达方式。",
    "{a}和{b}的情绪频道不同（{element}）：一个以{a_kw2}为先，一个以{b_kw2}为重。相处中容易「好心办错事」，需要更多的确认和复述，而不是默认对方都懂。",
  ],
};

const CHALLENGE_TPL: Record<AspectKind, string[]> = {
  same: [
    "最大的挑战来自「太像」：两个都{a_kw}的人，谁都不愿意先低头；两个都{b_kw}的人，容易同时冲动或同时僵持。学会给情绪留出缓冲带，是你们的共同课题。",
    "相似的你们会撞上同一块短板：都不擅长补对方的缺，因为你们的缺口是同一个。冲突时容易变成「镜像式争吵」——记得先退一步的人，往往赢的是关系。",
  ],
  semisextile: [
    "你们的挑战在细节里：{a}在意{a_kw2}，{b}在意{b_kw2}，生活中的小事容易积累出「说不清哪里不对」的隔阂。定期把感受摊开来讲，比争论对错更重要。",
    "相邻的你们差「半格」：节奏不同步的时刻，{a}觉得{b}慢半拍，{b}觉得{a}急了些。把这种小错位当成可爱而不是问题，关系会顺畅很多。",
  ],
  sextile: [
    "你们整体顺畅，但要小心「太顺」带来的松懈：一个{a_kw}，一个{b_kw}，都不习惯处理关系里的沉重话题。遇到分歧时别绕开，正面谈完反而更快和好。",
    "挑战不大，但深水区需要主动：{a}和{b}都倾向把轻松的一面给对方，真正的脆弱反而不轻易展示。关系想再进一步，练习深度坦诚是关键。",
  ],
  square: [
    "刑相位的核心挑战是节奏冲突：{a}的{a_kw}和{b}的{b_kw}在同一件事上常常给出相反的解法。容易陷入「我为你好」式的拉锯。记住：你们对抗的是问题，不是彼此。",
    "{a}和{b}的摩擦点在于彼此都坚持自己的方式——一个认为{a_kw}才是对的，一个笃信{b_kw}。学会在原则之外的区域轮流让步，是这段关系的必修课。",
  ],
  trine: [
    "你们要防的是「太舒服」：三合的组合少有原则性冲突，但舒适区待久了，反而容易回避那些需要坦诚的深聊。定期主动交换真心话，好关系才不会停在表面。",
    "最和谐的关系也有暗礁：{a}和{b}都习惯顺着彼此，矛盾被跳过而不是被解决。练习把小别扭及时说开，是让这段高配组合走得更远的秘诀。",
  ],
  quincunx: [
    "梅花相的功课是「翻译」：{a}表达在乎的方式是{a_kw2}，{b}期待的被爱方式却是{b_kw2}，付出常常落不到点上。把「我以为」换成「你需要」，误会会少一大半。",
    "{a}和{b}的差异是全方位的：一个{a_kw}，一个{b_kw}，生活的默认设置不同。磨合期会比较长，但每一次调适成功，你们的默契就会上一个新台阶。",
  ],
  opposition: [
    "对宫关系的挑战是钟摆效应：{a}的{a_kw}和{b}的{b_kw}轮流主导，关系容易在「你迁就我」和「我迁就你」之间摇摆。找到中间点、而不是轮流站两端，是你们的长期课题。",
    "你们最大的课题是把「互补」变成「合作」而不是「较劲」：{a}觉得{b_kw2}更重要，{b}坚持{a_kw2}才是根本。争赢了道理，输掉关系的账，要提前算清楚。",
  ],
};

const ADVICE_TPL: Record<AspectKind, string[]> = {
  same: [
    "给{a}：把「我说了算」的冲动换成「你说呢」；给{b}：在对方冲动时做那个先深呼吸的人。两个同类人最好的相处，是活成彼此的镜子，也活成彼此的刹车。",
    "给{a}和{b}：既然你们如此相似，就把共同的软肋列出来，互相提醒而不是互相指责。同类人最深的浪漫，是一起变成更好的自己。",
  ],
  semisextile: [
    "给{a}：多问一句「你为什么这么想」，少下一句「你应该怎样」的判断；给{b}：把在意的事及时说出来，别让小别扭过夜。相邻星座的默契，是处出来的。",
    "给{a}：欣赏{b}与你不同的那半格，那里藏着你看不到的视角；给{b}：跟上{a}的节奏时也别丢掉自己的步频。慢慢来，比较快。",
  ],
  sextile: [
    "给{a}：主动把深层感受分给{b}，你们的关系值得更大的坦诚；给{b}：珍惜这份难得的不费劲，同时学会在关键时刻站出来表态。轻松的关系，也需要郑重的时刻。",
    "给{a}和{b}：你们的组合赢在自然，输在懒散——定期安排一次认真的深聊，把「挺好的」升级成「很确定」。六合的关系经得起主动经营。",
  ],
  square: [
    "给{a}：冲突时先复述一遍{b}的观点再说自己的，你会发现分歧没有想象中大；给{b}：把「争对错」换成「找第三种方案」，刑相位的张力是成长最快的燃料。",
    "给{a}：{b}的{b_kw}不是针对你，那是TA的本能；给{b}：{a}的{a_kw}也不是冒犯，那是TA的真诚。约定一个「暂停手势」，激动时叫停，冷静后继续。",
  ],
  trine: [
    "给{a}：主动发起那些「不敢问」的话题，你的直觉在这段关系里几乎不会错；给{b}：别把和谐当成理所当然，记得常常表达感谢和偏爱。三合的组合，值得最用心的经营。",
    "给{a}和{b}：你们的天赋是顺势而为，但要记得定期「逆流」一次——聊聊那些不舒服的话题、确认彼此的边界。高和谐的配对，最怕的是从未真正交过底。",
  ],
  quincunx: [
    "给{a}：别用自己的方式猜{b}，直接问TA「你需要什么」，答案往往出乎意料；给{b}：把对{a}的不解当成探索而不是负担，你们的差异正是这段关系最迷人的部分。",
    "给{a}和{b}：建立一套只属于你们的「翻译词典」——把各自的雷区、暗语、爱的语言写下来。全然不同的两个人，反而能建成最坚固的桥。",
  ],
  opposition: [
    "给{a}：你缺少的正是{b}富余的，多向TA取经而不是较劲；给{b}：欣赏{a}把你们带到你不敢去的地方。对宫不是对立，是同一枚硬币的两面。",
    "给{a}：在争执里练习「我们先都退半步」；给{b}：把对宫的吸引力沉淀成共同的规则。极性带来的化学反应，需要用稳定的地基来安放。",
  ],
};

/* ── FAQ 模板 ───────────────────────────────────────────────────── */

function buildFaqs(
  a: Zodiac,
  b: Zodiac,
  score: number,
  verdict: string,
  stability: number,
  advice: string,
): { q: string; a: string }[] {
  const level =
    score >= 85
      ? "属于占星意义上相当契合的一对"
      : score >= 75
        ? "属于有明显默契、也有小差异的一对"
        : "属于需要更多磨合、但潜力不小的一对";
  return [
    {
      q: `${a.name}和${b.name}配吗？`,
      a: `从占星角度看，${a.name}（${a.elementLabel}）和${b.name}（${b.elementLabel}）的综合匹配度为 ${score} 分（满分 100），${level}。关系的关键词是「${verdict}」——${verdict === "天作之合" || verdict === "彼此成就" ? "珍惜彼此，就是最好的经营" : "找到相处节奏，比天生合拍更重要"}。`,
    },
    {
      q: `${a.name}和${b.name}在一起会怎么样？`,
      a: `${advice.split("。")[0]}。日常相处中，${a.name}习惯用${a.keywords[0]}的方式表达，${b.name}则更看重${b.keywords[0]}——接住彼此的表达方式，这段关系就会越来越顺。`,
    },
    {
      q: `${a.name}和${b.name}适合长期发展或结婚吗？`,
      a: `你们的关系稳定指数约为 ${stability} 分。${stability >= 75 ? "长期来看底子扎实，适合认真发展。" : "长期关系需要刻意经营：定期深聊、把分歧说开，是走得长远的前提。"}`,
    },
    {
      q: `${a.name}和${b.name}各自的性格有什么特点？`,
      a: `${a.name}：${a.personality.split("。")[0]}。${b.name}：${b.personality.split("。")[0]}。想深入了解，可以查看${a.name}和${b.name}的完整性格解读。`,
    },
  ];
}

/* ── 主生成函数 ─────────────────────────────────────────────────── */

/**
 * 生成两个星座之间的确定性配对报告。
 * 相同输入（不分先后顺序）→ 相同输出。
 */
export function generateMatchReport(inputA: Zodiac, inputB: Zodiac): MatchReport {
  // 统一按黄道顺序排列，保证 a→b 与 b→a 生成同一份内容
  const idxA = ZODIACS.indexOf(inputA);
  const idxB = ZODIACS.indexOf(inputB);
  const [a, b] = idxA <= idxB ? [inputA, inputB] : [inputB, inputA];
  const [loIdx, hiIdx] = idxA <= idxB ? [idxA, idxB] : [idxB, idxA];

  const aspect = aspectBetween(idxA, idxB);
  const elem = elementRelation(a.element, b.element);
  const meta = ASPECT_META[aspect];

  // 确定性微调：让 66 个组合的分数彼此错开
  const offset = ((loIdx * 7 + hiIdx * 5) % 9) - 4;
  const score = clamp(meta.base + elem.adj + offset, 50, 98);

  // 四维评分（吸引力 / 沟通默契 / 价值观 / 稳定性）
  const attractionAdj: Record<AspectKind, number> = {
    same: 2,
    semisextile: 4,
    sextile: 6,
    square: 10,
    trine: 5,
    quincunx: 6,
    opposition: 12,
  };
  const communicationAdj: Record<AspectKind, number> = {
    same: 6,
    semisextile: -2,
    sextile: 4,
    square: -6,
    trine: 6,
    quincunx: -8,
    opposition: -2,
  };
  const valuesAdj: Record<AspectKind, number> = {
    same: 6,
    semisextile: 0,
    sextile: 2,
    square: -4,
    trine: 8,
    quincunx: -6,
    opposition: 4,
  };
  const stabilityAdj: Record<AspectKind, number> = {
    same: 5,
    semisextile: 2,
    sextile: 2,
    square: -8,
    trine: 6,
    quincunx: -6,
    opposition: -4,
  };
  const elementBonus =
    elem.tone === "great" ? 4 : elem.tone === "good" ? 2 : -3;
  const airBonus = (z: Zodiac) => (z.element === "air" ? 4 : 0);
  const earthBonus = (z: Zodiac) => (z.element === "earth" ? 4 : 0);

  const dimensions = [
    {
      key: "吸引力",
      score: clamp(meta.base + attractionAdj[aspect] + elementBonus / 2, 40, 98),
    },
    {
      key: "沟通默契",
      score: clamp(
        meta.base + communicationAdj[aspect] + elementBonus + airBonus(a) / 2 + airBonus(b) / 2,
        40,
        98,
      ),
    },
    {
      key: "价值观",
      score: clamp(meta.base + valuesAdj[aspect] + elementBonus, 40, 98),
    },
    {
      key: "稳定性",
      score: clamp(
        meta.base + stabilityAdj[aspect] + elementBonus + earthBonus(a) / 2 + earthBonus(b) / 2,
        40,
        98,
      ),
    },
  ].map((d) => ({ key: d.key, score: Math.round(d.score) }));

  // 四段正文：确定性选取模板并填充
  const sA = seedOf(a.slug, b.slug, "attraction");
  const sH = seedOf(a.slug, b.slug, "harmony");
  const sC = seedOf(a.slug, b.slug, "challenge");
  const sV = seedOf(a.slug, b.slug, "advice");

  const fill = (tpl: string) =>
    tpl
      .replaceAll("{a}", a.name)
      .replaceAll("{b}", b.name)
      .replaceAll("{a_kw}", a.keywords[0])
      .replaceAll("{b_kw}", b.keywords[0])
      .replaceAll("{a_kw2}", a.keywords[1] ?? a.keywords[0])
      .replaceAll("{b_kw2}", b.keywords[1] ?? b.keywords[0])
      .replaceAll("{element}", elem.label);

  const sections = {
    attraction: fill(pick(ATTRACTION_TPL[aspect], sA)),
    harmony: fill(pick(HARMONY_TPL[elem.tone], sH)),
    challenge: fill(pick(CHALLENGE_TPL[aspect], sC)),
    advice: fill(pick(ADVICE_TPL[aspect], sV)),
  };

  const verdict = verdictOf(score);
  const faqs = buildFaqs(
    a,
    b,
    score,
    verdict,
    dimensions.find((d) => d.key === "稳定性")?.score ?? score,
    sections.advice,
  );

  return {
    a,
    b,
    score,
    verdict,
    aspectKind: aspect,
    aspectLabel: meta.label,
    elementLabel: elem.label,
    dimensions,
    sections,
    faqs,
  };
}

/* ── 配对 slug 工具 ─────────────────────────────────────────────── */

/** 生成规范化的配对 slug，如 "aries-taurus"（按 ZODIACS 顺序，前者在先） */
export function pairSlugOf(a: Zodiac, b: Zodiac): string {
  const idxA = ZODIACS.indexOf(a);
  const idxB = ZODIACS.indexOf(b);
  const [x, y] = idxA <= idxB ? [a.slug, b.slug] : [b.slug, a.slug];
  return `${x}-and-${y}`;
}

/** 解析配对 slug，返回两个星座；无效 slug 返回 null */
export function parsePairSlug(
  slug: string,
): { a: Zodiac; b: Zodiac } | null {
  const parts = slug.split("-and-");
  if (parts.length !== 2) return null;
  const a = ZODIACS.find((z) => z.slug === parts[0]);
  const b = ZODIACS.find((z) => z.slug === parts[1]);
  if (!a || !b || a === b) return null;
  return { a, b };
}

/** 全部 66 个组合（C(12,2)），供 generateStaticParams 与 sitemap 使用 */
export function ALL_PAIRS(): { slug: string; a: Zodiac; b: Zodiac }[] {
  const pairs: { slug: string; a: Zodiac; b: Zodiac }[] = [];
  for (let i = 0; i < ZODIACS.length; i++) {
    for (let j = i + 1; j < ZODIACS.length; j++) {
      const a = ZODIACS[i];
      const b = ZODIACS[j];
      pairs.push({ slug: `${a.slug}-and-${b.slug}`, a, b });
    }
  }
  return pairs;
}

/** 某星座的相关推荐配对（同元素优先 + 相邻链接），用于内链 */
export function relatedPairs(zodiac: Zodiac, limit = 6): { slug: string; a: Zodiac; b: Zodiac }[] {
  const others = ZODIACS.filter((z) => z !== zodiac);
  const sameElement = others.filter((z) => z.element === zodiac.element);
  const rest = others.filter((z) => z.element !== zodiac.element);
  const ordered = [...sameElement, ...rest].slice(0, limit);
  return ordered.map((other) => ({
    slug: pairSlugOf(zodiac, other),
    a: zodiac,
    b: other,
  }));
}
