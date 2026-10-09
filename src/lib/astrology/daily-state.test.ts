import { describe, it, expect, beforeEach } from "vitest";
import type { Aspect, AspectType, Planet } from "./types";
import {
  extractKeywords,
  determineTheme,
  getDailyAstrologyState,
  clearDailyStateCache,
} from "./daily-state";
import type { BirthProfile } from "@/lib/astrology";

/* ------------------------------------------------------------------ */
/*  helpers                                                             */
/* ------------------------------------------------------------------ */

function makeAspect(
  planetA: Planet,
  planetB: Planet,
  type: AspectType,
  strength = 0.8,
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

const SAMPLE_PROFILE: BirthProfile = {
  nickname: "test",
  birthDate: "1995-06-15",
  birthTime: "08:30",
  birthTimeAccuracy: "exact",
  birthCity: "上海",
  interests: [],
};

/* ================================================================== */
/*  extractKeywords                                                     */
/* ================================================================== */

describe("extractKeywords", () => {
  it("从单个相位中提取行星关键词和相位修饰词", () => {
    const aspects = [makeAspect("venus", "moon", "trine")];
    const kws = extractKeywords(aspects);

    // Venus 关键词
    expect(kws).toContain("关系");
    expect(kws).toContain("和谐");
    // Moon 关键词
    expect(kws).toContain("情感");
    expect(kws).toContain("直觉");
    // trine 修饰词
    expect(kws).toContain("和谐");
    expect(kws).toContain("顺畅");
  });

  it("多个相位时关键词去重", () => {
    const aspects = [
      makeAspect("venus", "moon", "trine"),
      makeAspect("venus", "mars", "sextile"),
    ];
    const kws = extractKeywords(aspects);

    // "关系" 只应出现一次（venus 的关键词在两个相位中重复）
    const relCount = kws.filter((k) => k === "关系").length;
    expect(relCount).toBe(1);
  });

  it("square 相位产生张力/挑战关键词", () => {
    const aspects = [makeAspect("mars", "saturn", "square")];
    const kws = extractKeywords(aspects);

    expect(kws).toContain("张力");
    expect(kws).toContain("挑战");
  });

  it("空相位数组返回空关键词", () => {
    expect(extractKeywords([])).toEqual([]);
  });

  it("conjunction 相位产生聚焦/强烈关键词", () => {
    const aspects = [makeAspect("sun", "moon", "conjunction")];
    const kws = extractKeywords(aspects);

    expect(kws).toContain("聚焦");
    expect(kws).toContain("强烈");
  });
});

/* ================================================================== */
/*  determineTheme                                                      */
/* ================================================================== */

describe("determineTheme", () => {
  it("venus-heavy 相位偏向 relationship", () => {
    const aspects = [
      makeAspect("venus", "moon", "trine", 1),
      makeAspect("venus", "mars", "sextile", 1),
      makeAspect("venus", "venus", "trine", 1),
    ];
    expect(determineTheme(aspects)).toBe("relationship");
  });

  it("sun+saturn heavy 相位偏向 career", () => {
    const aspects = [
      makeAspect("sun", "jupiter", "trine", 1),
      makeAspect("saturn", "mars", "trine", 1),
      makeAspect("sun", "mars", "trine", 1),
    ];
    expect(determineTheme(aspects)).toBe("career");
  });

  it("moon-heavy 相位偏向 emotion", () => {
    const aspects = [
      makeAspect("moon", "venus", "trine", 1),
      makeAspect("moon", "neptune", "trine", 1),
      makeAspect("moon", "saturn", "trine", 1),
    ];
    expect(determineTheme(aspects)).toBe("emotion");
  });

  it("mercury-heavy 相位偏向 social", () => {
    const aspects = [
      makeAspect("mercury", "jupiter", "trine", 1),
      makeAspect("mercury", "venus", "trine", 1),
    ];
    expect(determineTheme(aspects)).toBe("social");
  });

  it("neptune+uranus heavy 相位偏向 creativity", () => {
    const aspects = [
      makeAspect("neptune", "venus", "trine", 1),
      makeAspect("uranus", "sun", "trine", 1),
      makeAspect("neptune", "moon", "trine", 1),
    ];
    expect(determineTheme(aspects)).toBe("creativity");
  });

  it("空相位返回默认主题 emotion", () => {
    expect(determineTheme([])).toBe("emotion");
  });
});

/* ================================================================== */
/*  getDailyAstrologyState                                              */
/* ================================================================== */

describe("getDailyAstrologyState", () => {
  beforeEach(() => {
    clearDailyStateCache();
  });

  it("返回完整的 DailyAstrologyState 结构", () => {
    const state = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-15");

    expect(state.date).toBe("2025-08-15");
    expect(state.natalChart).toBeDefined();
    expect(state.natalChart.positions.length).toBe(10);
    expect(state.currentPositions.length).toBe(10);
    expect(Array.isArray(state.transitAspects)).toBe(true);
    expect(state.scores).toBeDefined();
    expect(state.keywords).toBeDefined();
    expect(typeof state.dominantTheme).toBe("string");
    expect(typeof state.moonPhase).toBe("string");
  });

  it("五维评分都存在", () => {
    const state = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-15");

    for (const dim of ["emotion", "love", "creativity", "social", "career"]) {
      expect(state.scores[dim]).toBeDefined();
      expect(state.scores[dim].score).toBeGreaterThanOrEqual(0);
      expect(state.scores[dim].score).toBeLessThanOrEqual(100);
    }
  });

  it("月相是有效标签", () => {
    const state = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-15");
    const validLabels = ["新月", "蛾眉月", "上弦月", "盈凸月", "满月", "亏凸月", "下弦月", "残月"];
    expect(validLabels).toContain(state.moonPhase);
  });

  it("dominantTheme 是合法值", () => {
    const state = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-15");
    const validThemes = ["relationship", "career", "emotion", "creativity", "social"];
    expect(validThemes).toContain(state.dominantTheme);
  });

  it("缓存命中：相同 profile + date 返回同一引用", () => {
    const a = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-15");
    const b = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-15");
    expect(a).toBe(b);
  });

  it("不同日期返回不同结果", () => {
    const a = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-15");
    const b = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-16");
    expect(a).not.toBe(b);
    // 不同日期的月相可能不同（不强制断言，但结构应不同）
    expect(a.date).not.toBe(b.date);
  });

  it("不同 profile 返回不同结果", () => {
    const other: BirthProfile = {
      ...SAMPLE_PROFILE,
      birthDate: "2000-01-01",
    };
    const a = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-15");
    const b = getDailyAstrologyState(other, "2025-08-15");
    expect(a).not.toBe(b);
  });

  it("clearDailyStateCache 后重新计算", () => {
    const a = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-15");
    clearDailyStateCache();
    const b = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-15");
    expect(a).not.toBe(b); // 新引用
    expect(a.date).toBe(b.date); // 同样内容
  });

  it("keywords 是字符串数组", () => {
    const state = getDailyAstrologyState(SAMPLE_PROFILE, "2025-08-15");
    expect(Array.isArray(state.keywords)).toBe(true);
    for (const kw of state.keywords) {
      expect(typeof kw).toBe("string");
    }
  });
});
