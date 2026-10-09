import type { Aspect, Planet, AspectType, ScoreFactor, ScoreResult } from "../types";

/* ------------------------------------------------------------------ */
/*  爱情评分规则                                                        */
/*  主要因素：Venus, Moon, Mars（第七宫由行星位置体现）                    */
/* ------------------------------------------------------------------ */

interface Rule {
  a: Planet;
  b: Planet;
  type: AspectType;
  weight: number;
}

const RULES: Rule[] = [
  // ── 正面 ──
  { a: "venus", b: "moon", type: "trine", weight: 10 },
  { a: "venus", b: "venus", type: "sextile", weight: 8 },
  { a: "moon", b: "venus", type: "sextile", weight: 6 },
  { a: "venus", b: "mars", type: "trine", weight: 9 },
  { a: "venus", b: "mars", type: "sextile", weight: 7 },
  { a: "venus", b: "moon", type: "conjunction", weight: 8 },
  { a: "venus", b: "jupiter", type: "trine", weight: 7 },
  { a: "moon", b: "mars", type: "trine", weight: 5 },

  // ── 负面 ──
  { a: "mars", b: "venus", type: "square", weight: -10 },
  { a: "mars", b: "venus", type: "opposition", weight: -8 },
  { a: "venus", b: "saturn", type: "square", weight: -7 },
  { a: "venus", b: "saturn", type: "opposition", weight: -6 },
  { a: "moon", b: "venus", type: "opposition", weight: -5 },
  { a: "venus", b: "pluto", type: "square", weight: -6 },
];

/* ------------------------------------------------------------------ */
/*  工具函数                                                           */
/* ------------------------------------------------------------------ */

function matchKey(a: Planet, b: Planet): string {
  return [a, b].sort().join(":");
}

/** 构建规则索引：planetA:planetB:aspectType -> Rule */
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
 * 计算爱情维度评分。
 *
 * 遍历所有相位，匹配预定义规则，加权求和后归一化到 0-100。
 * 基准分 60，正面规则最高 +40，负面规则最低 -40。
 */
export function calcLoveScore(aspects: Aspect[]): ScoreResult {
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
      category: "love",
    });
  }

  // 归一化：正面贡献映射到 [0, +40]，负面贡献映射到 [-40, 0]
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
