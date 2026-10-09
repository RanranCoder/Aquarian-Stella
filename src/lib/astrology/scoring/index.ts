import type { Aspect, ScoreResult } from "../types";
import { calcLoveScore } from "./love";
import { calcEmotionScore } from "./emotion";
import { calcCreativityScore } from "./creativity";
import { calcSocialScore } from "./social";
import { calcCareerScore } from "./career";

/* ------------------------------------------------------------------ */
/*  常量                                                               */
/* ------------------------------------------------------------------ */

/** 五维评分基准分 */
export const BASE_SCORE = 60;

/* ------------------------------------------------------------------ */
/*  工具函数                                                           */
/* ------------------------------------------------------------------ */

/**
 * 将数值限制在 [min, max] 范围内。
 *
 * @example clamp(120, 0, 100) // 100
 * @example clamp(-5, 0, 100)  // 0
 */
export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/* ------------------------------------------------------------------ */
/*  五维评分聚合                                                       */
/* ------------------------------------------------------------------ */

export interface AllScores {
  emotion: ScoreResult;
  love: ScoreResult;
  creativity: ScoreResult;
  social: ScoreResult;
  career: ScoreResult;
}

/**
 * 计算五维评分（情绪、爱情、创造力、人际、事业）。
 *
 * 纯函数：相同输入始终输出相同结果，无随机数依赖。
 *
 * @param aspects  相位数组（本命盘相位或行运相位均可）
 */
export function calcScores(aspects: Aspect[]): AllScores {
  return {
    emotion: calcEmotionScore(aspects),
    love: calcLoveScore(aspects),
    creativity: calcCreativityScore(aspects),
    social: calcSocialScore(aspects),
    career: calcCareerScore(aspects),
  };
}

/* ------------------------------------------------------------------ */
/*  按需导入                                                           */
/* ------------------------------------------------------------------ */

export { calcLoveScore } from "./love";
export { calcEmotionScore } from "./emotion";
export { calcCreativityScore } from "./creativity";
export { calcSocialScore } from "./social";
export { calcCareerScore } from "./career";
