import type { Zodiac } from "@/data/zodiacs";
import type { BirthProfile } from "@/lib/astrology";
import { getDailyAstrologyState } from "@/lib/astrology/daily-state";
import type { ThemeId } from "@/lib/astrology/daily-state";
import type { Aspect, ScoreResult } from "@/lib/astrology/types";

/* ================================================================== */
/*  Theme 类型                                                          */
/* ================================================================== */

export type Theme = {
  key: string;
  core: string;
  expand: string;
  actions: { yes: string; no: string };
  question: string;
};

/* ================================================================== */
/*  主题内容池 —— 按 Transit 引擎的主题分类组织                             */
/* ================================================================== */

type ThemeEntry = Theme & { category: ThemeId };

export const THEME_CONTENT: ThemeEntry[] = [
  // ── emotion ──────────────────────────────────────────────────────
  {
    category: "emotion",
    key: "边界",
    core: "今天，慢一点也没关系。",
    expand:
      "有些事情并不是没有答案，只是现在还没有到必须做决定的时候。今天更适合整理自己的情绪，而不是急着回应别人。",
    actions: {
      yes: "整理思绪，把悬而未决的事列出来",
      no: "为了获得别人的认可而勉强自己",
    },
    question: "今天有没有一件事，其实你可以晚一点回答？",
  },
  {
    category: "emotion",
    key: "沉淀",
    core: "今天，把脚步放轻，让思绪沉淀下来。",
    expand:
      "你最近吸收了很多信息，也接住了很多情绪。今天不适合向外索取答案，适合向内，听一听自己真正的声音。",
    actions: {
      yes: "留一段不被打扰的时间给自己",
      no: "用忙碌逃避需要面对的念头",
    },
    question: "如果把今天的烦躁翻译成一句话，它会是什么？",
  },

  // ── relationship ─────────────────────────────────────────────────
  {
    category: "relationship",
    key: "靠近",
    core: "今天，值得为喜欢的人多走一步。",
    expand:
      "关系不会凭空变得亲密，它靠一次次微小的靠近积累。主动不是掉价，是你对自己的心意诚实。",
    actions: {
      yes: "主动联系一个你在意的人",
      no: "在等待里猜测对方的心意",
    },
    question: "你希望靠近谁，又因为什么在犹豫？",
  },
  {
    category: "relationship",
    key: "表达",
    core: "今天，把心里的话，轻轻说出口。",
    expand:
      "你习惯了把情绪藏起来自己消化。但真正在意你的人，愿意听你说。表达不是示弱，而是让关系有机会更靠近。",
    actions: {
      yes: "对一个人说出你的真实感受",
      no: "用沉默测试对方的在乎",
    },
    question: "最近有没有一句没说出口的话，值得被听见？",
  },

  // ── creativity ───────────────────────────────────────────────────
  {
    category: "creativity",
    key: "重新开始",
    core: "今天，允许自己重新开始。",
    expand:
      "过去的选择不必定义你。此刻的你，随时可以调整方向。重新开始不是否定过去，而是把经验装进新的行囊。",
    actions: {
      yes: "给一个旧目标写下新的第一步",
      no: "反复责备过去的自己",
    },
    question: "如果重新开始，你最想先放下的是什么？",
  },
  {
    category: "creativity",
    key: "灵感",
    core: "今天，留一个缝隙让灵感进来。",
    expand:
      "你不需要刻意去寻找灵感，只需要给它留一点空间。散步、发呆、随手写下一句话——灵感喜欢放松的大脑。",
    actions: {
      yes: "做一件打破常规的事，哪怕很小",
      no: "把自己困在日复一日的循环里",
    },
    question: "如果今天尝试一件没做过的事，你会选什么？",
  },

  // ── career ───────────────────────────────────────────────────────
  {
    category: "career",
    key: "专注",
    core: "今天，把心放在眼前这一件事上。",
    expand:
      "你想做的事很多，能同时做好的却只有一件。专注不是错过，而是认真对待此刻值得的每一分钟。",
    actions: {
      yes: "一次只做一件事，做完再开始下一件",
      no: "同时打开十个窗口却一件也没完成",
    },
    question: "如果今天只做一件事，你会选哪件？",
  },
  {
    category: "career",
    key: "勇气",
    core: "今天，你有力量跨出那一步。",
    expand:
      "勇气不是不害怕，而是害怕了仍然愿意往前走。你比自己以为的更强大，那件让你犹豫的事，值得你去试一次。",
    actions: {
      yes: "直面一件让你有点害怕的事",
      no: "因为想象中的失败而提前放弃",
    },
    question: "你在害怕的，是事情本身，还是失败后的评价？",
  },

  // ── social ───────────────────────────────────────────────────────
  {
    category: "social",
    key: "感恩",
    core: "今天，记得你已经拥有的。",
    expand:
      "在追逐未来的路上，别忽略眼前的拥有。一句问候、一顿好饭、一个还在身边的人，都值得被认真看见。",
    actions: {
      yes: "对一个人表达感谢",
      no: "只盯着还没得到的东西",
    },
    question: "此刻你最想感谢的人或事，是什么？",
  },
  {
    category: "social",
    key: "整理",
    core: "今天，适合把混乱整理成秩序。",
    expand:
      "无论是房间、计划还是情绪，整理都能带来掌控感。你不需要一次解决所有，只要从一小块开始。",
    actions: {
      yes: "整理一处混乱，让空间和心都清爽",
      no: "让待办清单无限膨胀",
    },
    question: "目前最让你觉得乱的一处，是什么？",
  },
];

/* ================================================================== */
/*  主题池索引                                                          */
/* ================================================================== */

const THEME_POOL: Record<ThemeId, ThemeEntry[]> = {
  emotion: THEME_CONTENT.filter((t) => t.category === "emotion"),
  relationship: THEME_CONTENT.filter((t) => t.category === "relationship"),
  creativity: THEME_CONTENT.filter((t) => t.category === "creativity"),
  career: THEME_CONTENT.filter((t) => t.category === "career"),
  social: THEME_CONTENT.filter((t) => t.category === "social"),
};

/* ================================================================== */
/*  确定性选择工具                                                       */
/* ================================================================== */

/** 将日期字符串解析为年内天数（1-366） */
function dayOfYear(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(y, 0, 1).getTime();
  const target = new Date(y, m - 1, d).getTime();
  return Math.floor((target - base) / 86400000) + 1;
}

/**
 * 确定性地选择主题：基于当天年内天数 + 星座 slug 长度。
 *
 * 同一 sign + 同一 date → 同一 theme（稳定可复现）。
 * 不同 date → 不同 theme（当 pool 长度 > 1 时轮换）。
 */
function selectTheme(pool: ThemeEntry[], signSlug: string, dateStr: string): ThemeEntry {
  const idx = (dayOfYear(dateStr) + signSlug.length) % pool.length;
  return pool[idx];
}

/* ================================================================== */
/*  DailyHoroscope 类型                                                  */
/* ================================================================== */

export type DailyHoroscope = {
  date: string;
  theme: Theme;
  keywords: string[];
  dimensions: { key: string; score: number }[]; // 0-100
  signName: string;
  signSymbol: string;
  /** 行运相位（有 profile 时非空） */
  transitAspects: Aspect[];
  /** 五维评分详情，含 factors（有 profile 时非空） */
  scoresWithFactors: Record<string, ScoreResult>;
};

/* ================================================================== */
/*  五维维度映射（UI 标签 ↔ 引擎 key）                                    */
/* ================================================================== */

const DIMENSIONS: { key: string; engineKey: string }[] = [
  { key: "情绪", engineKey: "emotion" },
  { key: "爱情", engineKey: "love" },
  { key: "创造力", engineKey: "creativity" },
  { key: "人际", engineKey: "social" },
  { key: "事业", engineKey: "career" },
];

/** 基础模式默认分值（无 profile 时使用） */
const BASE_SCORE = 60;

/* ================================================================== */
/*  getDailyHoroscope                                                   */
/* ================================================================== */

/**
 * 生成某星座在指定日期的今日星语。
 *
 * - 有 profile → 接入 Transit 引擎，根据行运相位计算关键词、评分和主题
 * - 无 profile → 返回基于太阳星座的基础版本（主题通过确定性选择，评分固定）
 *
 * 相同 profile + 相同 date → 相同结果（确定性）。
 *
 * @param sign     太阳星座
 * @param dateStr  日期字符串 YYYY-MM-DD
 * @param profile  可选出生档案，提供后启用完整 Transit 计算
 */
export function getDailyHoroscope(
  sign: Zodiac,
  dateStr: string,
  profile?: BirthProfile,
): DailyHoroscope {
  let keywords: string[];
  let dimensions: { key: string; score: number }[];
  let dominantThemeId: ThemeId;
  let transitAspects: Aspect[] = [];
  let scoresWithFactors: Record<string, ScoreResult> = {};

  if (profile) {
    // ── Transit 引擎模式 ─────────────────────────────────────────
    const state = getDailyAstrologyState(profile, dateStr);

    // 关键词：来自行运相位提取（最多取 4 个）
    keywords = state.keywords.slice(0, 4);

    // 主题：由行运相位的行星权重决定
    dominantThemeId = state.dominantTheme as ThemeId;

    // 五维评分：直接使用引擎计算的 0-100 分
    dimensions = DIMENSIONS.map((d) => ({
      key: d.key,
      score: state.scores[d.engineKey]?.score ?? BASE_SCORE,
    }));

    // 行运相位 & 评分详情
    transitAspects = state.transitAspects;
    scoresWithFactors = state.scores as Record<string, ScoreResult>;
  } else {
    // ── 基础模式 ──────────────────────────────────────────────────
    dominantThemeId = "emotion";
    keywords = sign.keywords.slice(0, 3);
    dimensions = DIMENSIONS.map((d) => ({
      key: d.key,
      score: BASE_SCORE,
    }));
  }

  // 从主题池中确定性选择
  const theme = selectTheme(
    THEME_POOL[dominantThemeId] ?? THEME_POOL.emotion,
    sign.slug,
    dateStr,
  );

  return {
    date: dateStr,
    theme,
    keywords,
    dimensions,
    signName: sign.name,
    signSymbol: sign.symbol,
    transitAspects,
    scoresWithFactors,
  };
}
