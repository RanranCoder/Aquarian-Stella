import type { BirthProfile } from "@/lib/astrology";
import type {
  Aspect,
  AspectType,
  DailyAstrologyState,
  Planet,
  ScoreResult,
} from "./types";
import { calcNatalChart } from "./natal-chart";
import { calcCurrentPositions, calcTransitAspects } from "./transit";
import { calcScores } from "./scoring";
import { getMoonPhase } from "@/lib/astronomy";

/* ================================================================== */
/*  关键词映射                                                          */
/* ================================================================== */

/**
 * 行星 -> 关联关键词池。
 *
 * 每颗行星象征的生命领域，用于 `extractKeywords` 中根据相位动态提取。
 */
const PLANET_KEYWORDS: Record<Planet, string[]> = {
  sun: ["自我", "意志", "目标", "领导力"],
  moon: ["情感", "内在", "安全感", "直觉"],
  mercury: ["沟通", "思维", "学习", "表达"],
  venus: ["关系", "和谐", "审美", "价值观"],
  mars: ["行动", "竞争", "能量", "勇气"],
  jupiter: ["成长", "机遇", "乐观", "信念"],
  saturn: ["责任", "纪律", "考验", "成熟"],
  uranus: ["变革", "自由", "灵感", "突破"],
  neptune: ["灵性", "想象", "梦境", "同理心"],
  pluto: ["转化", "深层", "重生", "力量"],
  asc: ["外在", "第一印象", "上升"],
};

/**
 * 相位类型 -> 语义修饰词。
 *
 * 和谐相位表示顺遂，紧张相位表示挑战，合相表示强烈聚焦。
 */
const ASPECT_MODIFIERS: Record<AspectType, { mood: string; prefix: string }> = {
  conjunction:  { mood: "强烈", prefix: "聚焦" },
  trine:        { mood: "和谐", prefix: "顺畅" },
  sextile:      { mood: "助力", prefix: "机遇" },
  square:       { mood: "张力", prefix: "挑战" },
  opposition:   { mood: "对峙", prefix: "平衡" },
};

/* ================================================================== */
/*  主题映射                                                            */
/* ================================================================== */

/**
 * 行星 -> 主题归属权重。
 *
 * `determineTheme` 统计所有活跃相位涉及行星的主题贡献，
 * 取最高权重的主题作为当日主导。
 */
const PLANET_THEME_WEIGHTS: Record<Planet, Partial<Record<string, number>>> = {
  sun:       { career: 3, creativity: 1 },
  moon:      { emotion: 3, relationship: 1 },
  mercury:   { career: 1, social: 2, creativity: 1 },
  venus:     { relationship: 3, creativity: 2, social: 1 },
  mars:      { career: 2, creativity: 1, emotion: 1 },
  jupiter:   { career: 2, social: 2, creativity: 1 },
  saturn:    { career: 3, emotion: 1 },
  uranus:    { creativity: 2, social: 1, career: 1 },
  neptune:   { creativity: 2, emotion: 2 },
  pluto:     { emotion: 2, career: 1, relationship: 1 },
  asc:       { social: 2 },
};

/* ================================================================== */
/*  extractKeywords                                                     */
/* ================================================================== */

/**
 * 从行运相位中提取关键词。
 *
 * 遍历所有相位，按行星象征领域 + 相位语义组合生成关键词列表。
 * 结果去重，按出现顺序排列（强度高的在前，因为调用方一般已排序）。
 *
 * @example
 * // venus_trine_moon → ["关系", "情感", "和谐", "顺畅"]
 * extractKeywords(aspects);
 */
export function extractKeywords(aspects: Aspect[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const asp of aspects) {
    // 行星关键词
    for (const planet of [asp.planetA, asp.planetB]) {
      for (const kw of PLANET_KEYWORDS[planet]) {
        if (!seen.has(kw)) {
          seen.add(kw);
          result.push(kw);
        }
      }
    }

    // 相位语义修饰词
    const mod = ASPECT_MODIFIERS[asp.type];
    for (const kw of [mod.prefix, mod.mood]) {
      if (!seen.has(kw)) {
        seen.add(kw);
        result.push(kw);
      }
    }
  }

  return result;
}

/* ================================================================== */
/*  determineTheme                                                      */
/* ================================================================== */

const ALL_THEMES = ["relationship", "career", "emotion", "creativity", "social"] as const;
export type ThemeId = (typeof ALL_THEMES)[number];

/**
 * 根据主要相位确定今日主导主题。
 *
 * 统计所有相位中涉及行星的主题权重，返回得分最高的主题。
 * 当无相位或得分相同时，按默认优先级返回。
 *
 * @returns 主题 ID: relationship | career | emotion | creativity | social
 */
export function determineTheme(aspects: Aspect[]): ThemeId {
  const scores: Record<string, number> = {
    relationship: 0,
    career: 0,
    emotion: 0,
    creativity: 0,
    social: 0,
  };

  for (const asp of aspects) {
    // 相位强度作为权重乘数
    const multiplier = asp.strength;

    for (const planet of [asp.planetA, asp.planetB]) {
      const weights = PLANET_THEME_WEIGHTS[planet];
      if (!weights) continue;
      for (const [theme, weight] of Object.entries(weights)) {
        scores[theme] += (weight ?? 0) * multiplier;
      }
    }
  }

  // 找到得分最高的主题；平局时保留默认值 "emotion"
  let best: ThemeId = "emotion";
  let bestScore = 0;

  for (const theme of ALL_THEMES) {
    if (scores[theme] > bestScore) {
      bestScore = scores[theme];
      best = theme;
    }
  }

  return best;
}

/* ================================================================== */
/*  月相（复用 astronomy.ts）                                             */
/* ================================================================== */

export { getMoonPhase };
export type { MoonPhaseInfo } from "@/lib/astronomy";

/* ================================================================== */
/*  缓存                                                                */
/* ================================================================== */

/**
 * 内存缓存：natalChartHash + date -> DailyAstrologyState。
 *
 * 以出生档案的 birthDate + birthTime + birthCity 生成简易哈希，
 * 与日期拼接作为 key。同一天同一用户无需重复计算。
 */
const dailyStateCache = new Map<string, DailyAstrologyState>();

function natalChartHash(profile: BirthProfile): string {
  return [
    profile.birthDate,
    profile.birthTime ?? "12:00",
    profile.birthCity ?? "unknown",
  ].join("|");
}

function cacheKey(profile: BirthProfile, dateStr: string): string {
  return `${natalChartHash(profile)}@${dateStr}`;
}

/* ================================================================== */
/*  getDailyAstrologyState                                              */
/* ================================================================== */

/**
 * 计算指定用户在指定日期的每日星象状态。
 *
 * 流程：
 * 1. 计算本命星盘（复用 `calcNatalChart`）
 * 2. 计算当日行星位置（复用 `calcCurrentPositions`）
 * 3. 计算行运相位（复用 `calcTransitAspects`）
 * 4. 计算五维评分（复用 `calcScores`）
 * 5. 提取关键词（`extractKeywords`）
 * 6. 确定主导主题（`determineTheme`）
 * 7. 计算月相（复用 `getMoonPhase`）
 *
 * 带内存缓存：同一出生档案 + 同一日期仅计算一次。
 *
 * @param profile  用户出生档案
 * @param dateStr  目标日期，格式 YYYY-MM-DD
 */
export function getDailyAstrologyState(
  profile: BirthProfile,
  dateStr: string,
): DailyAstrologyState {
  // --- 缓存命中 ---
  const key = cacheKey(profile, dateStr);
  const cached = dailyStateCache.get(key);
  if (cached) return cached;

  // --- 计算 ---
  const natalChart = calcNatalChart(profile);

  const targetDate = new Date(`${dateStr}T12:00:00Z`);
  const currentPositions = calcCurrentPositions(targetDate);

  const transitAspects = calcTransitAspects(
    natalChart.positions,
    currentPositions,
  );

  const scores = calcScores(transitAspects);

  const keywords = extractKeywords(transitAspects);
  const dominantTheme = determineTheme(transitAspects);
  const moonPhaseInfo = getMoonPhase(targetDate);

  const state: DailyAstrologyState = {
    date: dateStr,
    natalChart,
    currentPositions,
    transitAspects,
    scores: scores as unknown as Record<string, ScoreResult>,
    keywords,
    dominantTheme,
    moonPhase: moonPhaseInfo.label,
  };

  // --- 写入缓存 ---
  dailyStateCache.set(key, state);

  return state;
}

/**
 * 清除缓存（用于测试或手动刷新）。
 */
export function clearDailyStateCache(): void {
  dailyStateCache.clear();
}
