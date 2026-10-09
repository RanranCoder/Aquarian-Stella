import type { Aspect, Planet, AspectType, ScoreFactor, ScoreResult } from "../types";

/* ------------------------------------------------------------------ */
/*  事业评分规则                                                        */
/*  主要因素：Sun, Mars, Jupiter, Saturn（第十宫由行星位置体现）         */
/* ------------------------------------------------------------------ */

interface Rule {
  a: Planet;
  b: Planet;
  type: AspectType;
  weight: number;
}

const RULES: Rule[] = [
  // ── 正面：行动力强、机遇多 ──
  { a: "sun", b: "jupiter", type: "trine", weight: 10 },
  { a: "sun", b: "jupiter", type: "sextile", weight: 8 },
  { a: "mars", b: "jupiter", type: "trine", weight: 9 },
  { a: "mars", b: "saturn", type: "trine", weight: 8 },
  { a: "sun", b: "mars", type: "trine", weight: 7 },
  { a: "sun", b: "mars", type: "sextile", weight: 6 },
  { a: "mars", b: "saturn", type: "sextile", weight: 7 },
  { a: "jupiter", b: "saturn", type: "trine", weight: 7 },

  // ── 负面：受阻、压力大 ──
  { a: "sun", b: "saturn", type: "square", weight: -9 },
  { a: "sun", b: "saturn", type: "opposition", weight: -7 },
  { a: "mars", b: "saturn", type: "square", weight: -10 },
  { a: "mars", b: "saturn", type: "opposition", weight: -8 },
  { a: "mars", b: "pluto", type: "square", weight: -7 },
  { a: "sun", b: "mars", type: "opposition", weight: -6 },
  { a: "jupiter", b: "saturn", type: "square", weight: -5 },
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
 * 计算事业维度评分。
 *
 * 太阳与木星的和谐相位带来事业上的贵人运与扩张力，
 * 火星与土星的硬相位则带来行动上的阻力与压力。
 */
export function calcCareerScore(aspects: Aspect[]): ScoreResult {
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
      category: "career",
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
