import type { Aspect, Planet, AspectType, ScoreFactor, ScoreResult } from "../types";

/* ------------------------------------------------------------------ */
/*  情绪评分规则                                                        */
/*  主要因素：Moon, Venus, Saturn, Neptune（第四宫由行星位置体现）        */
/* ------------------------------------------------------------------ */

interface Rule {
  a: Planet;
  b: Planet;
  type: AspectType;
  weight: number;
}

const RULES: Rule[] = [
  // ── 正面：情绪稳定、内心和谐 ──
  { a: "moon", b: "venus", type: "trine", weight: 10 },
  { a: "moon", b: "venus", type: "sextile", weight: 7 },
  { a: "moon", b: "saturn", type: "trine", weight: 8 },
  { a: "moon", b: "neptune", type: "trine", weight: 7 },
  { a: "moon", b: "neptune", type: "sextile", weight: 6 },
  { a: "moon", b: "jupiter", type: "trine", weight: 6 },
  { a: "venus", b: "neptune", type: "trine", weight: 5 },
  { a: "moon", b: "moon", type: "trine", weight: 6 },

  // ── 负面：情绪波动、焦虑 ──
  { a: "moon", b: "saturn", type: "square", weight: -10 },
  { a: "moon", b: "saturn", type: "opposition", weight: -8 },
  { a: "moon", b: "pluto", type: "square", weight: -9 },
  { a: "moon", b: "pluto", type: "opposition", weight: -7 },
  { a: "moon", b: "neptune", type: "square", weight: -7 },
  { a: "moon", b: "mars", type: "square", weight: -6 },
  { a: "venus", b: "saturn", type: "conjunction", weight: -5 },
];

/* ------------------------------------------------------------------ */
/*  工具函数                                                           */
/* ------------------------------------------------------------------ */

function matchKey(a: Planet, b: Planet): string {
  return [a, b].sort().join(":");
}

function buildIndex(rules: Rule[]): Map<string, Rule> {
  const map = new Map<string, Rule>();
  for (const r of rules) {
    map.set(`${matchKey(r.a, r.b)}:${r.type}`, r);
  }
  return map;
}

const RULE_MAP = buildIndex(RULES);

const POSITIVE_MAX = RULES.filter((r) => r.weight > 0).reduce(
  (s, r) => s + r.weight,
  0,
);

const NEGATIVE_MAX = Math.abs(
  RULES.filter((r) => r.weight < 0).reduce((s, r) => s + r.weight, 0),
);

/* ------------------------------------------------------------------ */
/*  计算                                                               */
/* ------------------------------------------------------------------ */

/**
 * 计算情绪维度评分。
 *
 * 月亮与土星/冥王星的硬相位会显著拉低情绪分，
 * 与金星/海王星的和谐相位则带来情绪上的温暖与直觉力。
 */
export function calcEmotionScore(aspects: Aspect[]): ScoreResult {
  const factors: ScoreFactor[] = [];
  let rawScore = 0;

  for (const asp of aspects) {
    const key = `${matchKey(asp.planetA, asp.planetB)}:${asp.type}`;
    const rule = RULE_MAP.get(key);
    if (!rule) continue;

    const contribution = rule.weight * asp.strength;
    rawScore += contribution;

    factors.push({
      type: rule.weight > 0 ? "positive" : "negative",
      source: `${asp.planetA}_${asp.type}_${asp.planetB}`,
      weight: contribution,
      category: "emotion",
    });
  }

  let bonus: number;
  if (rawScore >= 0) {
    bonus = POSITIVE_MAX > 0 ? (rawScore / POSITIVE_MAX) * 40 : 0;
  } else {
    bonus = NEGATIVE_MAX > 0 ? (rawScore / NEGATIVE_MAX) * 40 : 0;
  }

  const score = Math.round(60 + bonus);
  const clampedScore = Math.min(100, Math.max(0, score));

  const level = clampedScore < 40 ? "low" : clampedScore > 70 ? "high" : "normal";

  return { score: clampedScore, level, factors };
}
