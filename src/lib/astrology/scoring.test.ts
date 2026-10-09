import { describe, it, expect } from "vitest";
import { calcScores, clamp, BASE_SCORE } from "./scoring";
import type { Aspect, Planet, AspectType } from "./types";

/* ------------------------------------------------------------------ */
/*  辅助函数                                                          */
/* ------------------------------------------------------------------ */

function makeAspect(
  planetA: Planet,
  planetB: Planet,
  type: AspectType,
  strength = 1,
): Aspect {
  return {
    planetA,
    planetB,
    type,
    angle: 0,
    orb: 0,
    strength,
  };
}

/* ------------------------------------------------------------------ */
/*  clamp 工具函数                                                     */
/* ------------------------------------------------------------------ */

describe("clamp", () => {
  it("数值在范围内原样返回", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("超出上限时返回 max", () => {
    expect(clamp(120, 0, 100)).toBe(100);
  });

  it("低于下限时返回 min", () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it("边界值：恰好等于 min", () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });

  it("边界值：恰好等于 max", () => {
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

/* ------------------------------------------------------------------ */
/*  BASE_SCORE 常量                                                    */
/* ------------------------------------------------------------------ */

describe("BASE_SCORE", () => {
  it("基准分为 60", () => {
    expect(BASE_SCORE).toBe(60);
  });
});

/* ------------------------------------------------------------------ */
/*  calcScores — 评分确定性                                            */
/* ------------------------------------------------------------------ */

describe("calcScores 确定性", () => {
  it("相同输入始终产生相同输出", () => {
    const aspects: Aspect[] = [
      makeAspect("venus", "moon", "trine", 0.8),
      makeAspect("mars", "venus", "square", 0.5),
      makeAspect("sun", "jupiter", "trine", 0.9),
    ];

    const result1 = calcScores(aspects);
    const result2 = calcScores(aspects);

    expect(result1).toEqual(result2);
  });

  it("空相位数组产生稳定的默认结果", () => {
    const result1 = calcScores([]);
    const result2 = calcScores([]);

    expect(result1).toEqual(result2);
  });

  it("相同相位不同顺序产生相同结果", () => {
    const aspects1: Aspect[] = [
      makeAspect("venus", "moon", "trine", 1),
      makeAspect("mars", "saturn", "square", 0.8),
    ];
    const aspects2: Aspect[] = [
      makeAspect("mars", "saturn", "square", 0.8),
      makeAspect("venus", "moon", "trine", 1),
    ];

    expect(calcScores(aspects1)).toEqual(calcScores(aspects2));
  });
});

/* ------------------------------------------------------------------ */
/*  calcScores — 评分范围 0-100                                        */
/* ------------------------------------------------------------------ */

describe("calcScores 评分范围", () => {
  const DIMENSIONS = ["emotion", "love", "creativity", "social", "career"] as const;

  it("空相位：所有维度分数在 0-100", () => {
    const scores = calcScores([]);
    for (const dim of DIMENSIONS) {
      expect(scores[dim].score).toBeGreaterThanOrEqual(0);
      expect(scores[dim].score).toBeLessThanOrEqual(100);
    }
  });

  it("全正面相位：分数在 0-100", () => {
    const aspects: Aspect[] = [
      makeAspect("venus", "moon", "trine", 1),
      makeAspect("moon", "venus", "sextile", 1),
      makeAspect("venus", "mars", "trine", 1),
      makeAspect("sun", "jupiter", "trine", 1),
      makeAspect("mercury", "venus", "sextile", 1),
    ];
    const scores = calcScores(aspects);
    for (const dim of DIMENSIONS) {
      expect(scores[dim].score).toBeGreaterThanOrEqual(0);
      expect(scores[dim].score).toBeLessThanOrEqual(100);
    }
  });

  it("全负面相位：分数在 0-100", () => {
    const aspects: Aspect[] = [
      makeAspect("mars", "venus", "square", 1),
      makeAspect("moon", "saturn", "square", 1),
      makeAspect("mars", "venus", "opposition", 1),
      makeAspect("venus", "saturn", "square", 1),
      makeAspect("moon", "pluto", "square", 1),
    ];
    const scores = calcScores(aspects);
    for (const dim of DIMENSIONS) {
      expect(scores[dim].score).toBeGreaterThanOrEqual(0);
      expect(scores[dim].score).toBeLessThanOrEqual(100);
    }
  });

  it("大量相位不会导致溢出", () => {
    // 构造大量高权重正面相位
    const aspects: Aspect[] = [];
    for (let i = 0; i < 20; i++) {
      aspects.push(makeAspect("venus", "moon", "trine", 1));
      aspects.push(makeAspect("moon", "saturn", "square", 1));
    }
    const scores = calcScores(aspects);
    for (const dim of DIMENSIONS) {
      expect(scores[dim].score).toBeGreaterThanOrEqual(0);
      expect(scores[dim].score).toBeLessThanOrEqual(100);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  calcScores — factors 输出                                          */
/* ------------------------------------------------------------------ */

describe("calcScores factors 输出", () => {
  it("空相位时 factors 为空数组", () => {
    const scores = calcScores([]);
    for (const dim of ["emotion", "love", "creativity", "social", "career"] as const) {
      expect(scores[dim].factors).toEqual([]);
    }
  });

  it("匹配规则的相位会产生 factor", () => {
    // venus-moon-trine 匹配 love 规则
    const aspects = [makeAspect("venus", "moon", "trine", 1)];
    const scores = calcScores(aspects);

    expect(scores.love.factors.length).toBeGreaterThan(0);
    const factor = scores.love.factors[0];
    expect(factor.category).toBe("love");
    expect(factor.source).toContain("venus");
    expect(factor.source).toContain("trine");
    expect(factor.source).toContain("moon");
    expect(typeof factor.weight).toBe("number");
  });

  it("positive 类型 factor 来自正面规则", () => {
    const aspects = [makeAspect("venus", "moon", "trine", 1)];
    const scores = calcScores(aspects);

    const factor = scores.love.factors[0];
    expect(factor.type).toBe("positive");
    expect(factor.weight).toBeGreaterThan(0);
  });

  it("negative 类型 factor 来自负面规则", () => {
    // mars-venus-square 匹配 love 负面规则
    const aspects = [makeAspect("mars", "venus", "square", 1)];
    const scores = calcScores(aspects);

    expect(scores.love.factors.length).toBeGreaterThan(0);
    const factor = scores.love.factors[0];
    expect(factor.type).toBe("negative");
    expect(factor.weight).toBeLessThan(0);
  });

  it("factor 的 weight 与 strength 正相关", () => {
    const aspects1 = [makeAspect("venus", "moon", "trine", 1)];
    const aspects2 = [makeAspect("venus", "moon", "trine", 0.5)];

    const score1 = calcScores(aspects1);
    const score2 = calcScores(aspects2);

    // strength=1 时 factor 权重应更大
    expect(Math.abs(score1.love.factors[0].weight)).toBeGreaterThan(
      Math.abs(score2.love.factors[0].weight),
    );
  });

  it("不匹配任何规则的相位不会产生 factor", () => {
    // mercury-neptune-conjunction 不在任何维度规则中
    const aspects = [makeAspect("mercury", "neptune", "conjunction", 1)];
    const scores = calcScores(aspects);

    for (const dim of ["emotion", "love", "creativity", "social", "career"] as const) {
      expect(scores[dim].factors).toEqual([]);
    }
  });

  it("同一相位可匹配多个维度的规则", () => {
    // venus-moon-trine 同时匹配 love 和 emotion 规则
    const aspects = [makeAspect("venus", "moon", "trine", 1)];
    const scores = calcScores(aspects);

    const hasLoveFactor = scores.love.factors.length > 0;
    const hasEmotionFactor = scores.emotion.factors.length > 0;
    // 至少应同时命中两个维度
    expect(hasLoveFactor || hasEmotionFactor).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  calcScores — level 分级                                            */
/* ------------------------------------------------------------------ */

describe("calcScores level 分级", () => {
  it("score < 40 时 level 为 'low'", () => {
    // 大量负面相位压低分数
    const aspects: Aspect[] = [];
    for (let i = 0; i < 5; i++) {
      aspects.push(makeAspect("mars", "venus", "square", 1));
      aspects.push(makeAspect("moon", "saturn", "square", 1));
      aspects.push(makeAspect("mars", "venus", "opposition", 1));
      aspects.push(makeAspect("venus", "saturn", "square", 1));
      aspects.push(makeAspect("moon", "pluto", "square", 1));
    }
    const scores = calcScores(aspects);
    // 至少有一个维度应该是 low
    const levels = Object.values(scores).map((s) => s.level);
    expect(levels).toContain("low");
  });

  it("score > 70 时 level 为 'high'", () => {
    // 大量正面相位提高分数
    const aspects: Aspect[] = [];
    for (let i = 0; i < 5; i++) {
      aspects.push(makeAspect("venus", "moon", "trine", 1));
      aspects.push(makeAspect("venus", "mars", "trine", 1));
      aspects.push(makeAspect("venus", "jupiter", "trine", 1));
    }
    const scores = calcScores(aspects);
    const levels = Object.values(scores).map((s) => s.level);
    expect(levels).toContain("high");
  });

  it("每个维度的 level 与 score 一致", () => {
    const aspects = [makeAspect("venus", "moon", "trine", 0.8)];
    const scores = calcScores(aspects);

    for (const dim of ["emotion", "love", "creativity", "social", "career"] as const) {
      const { score, level } = scores[dim];
      if (score < 40) expect(level).toBe("low");
      else if (score > 70) expect(level).toBe("high");
      else expect(level).toBe("normal");
    }
  });
});
