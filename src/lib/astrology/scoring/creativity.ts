import type { Aspect, Planet, AspectType, ScoreFactor, ScoreResult } from "../types";

/* ------------------------------------------------------------------ */
/*  创造力评分规则                                                      */
/*  主要因素：Sun, Mercury, Neptune, Uranus（第五宫由行星位置体现）      */
/* ------------------------------------------------------------------ */

interface Rule {
  a: Planet;
  b: Planet;
  type: AspectType;
  weight: number;
}

const RULES: Rule[] = [
  // ── 正面：灵感涌现、表达力强 ──
  { a: "sun", b: "neptune", type: "trine", weight: 10 },
  { a: "sun", b: "neptune", type: "sextile", weight: 8 },
  { a: "mercury", b: "neptune", type: "trine", weight: 9 },
  { a: "mercury", b: "neptune", type: "sextile", weight: 7 },
  { a: "mercury", b: "uranus", type: "trine", weight: 8 },
  { a: "mercury", b: "uranus", type: "sextile", weight: 6 },
  { a: "sun", b: "uranus", type: "trine", weight: 7 },
  { a: "venus", b: "neptune", type: "trine", weight: 6 },

  // ── 负面：思维受阻、灵感枯竭 ──
  { a: "mercury", b: "saturn", type: "square", weight: -9 },
  { a: "mercury", b: "saturn", type: "opposition", weight: -7 },
  { a: "sun", b: "saturn", type: "square", weight: -8 },
  { a: "sun", b: "saturn", type: "opposition", weight: -6 },
  { a: "mercury", b: "neptune", type: "square", weight: -7 },
  { a: "sun", b: "neptune", type: "opposition", weight: -5 },
  { a: "mercury", b: "pluto", type: "square", weight: -6 },
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
 * 计算创造力维度评分。
 *
 * 太阳与海王星/天王星的和谐相位带来灵感与独特视角，
 * 水星与土星的硬相位则可能限制思维的灵活性。
 */
export function calcCreativityScore(aspects: Aspect[]): ScoreResult {
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
      category: "creativity",
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
