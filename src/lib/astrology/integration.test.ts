/**
 * 星象计算集成测试
 *
 * 测试完整流程：BirthProfile -> NatalChart -> TransitAspects -> Scores
 * 覆盖：数据流完整性、缓存机制、错误处理、确定性、性能
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { BirthProfile } from "@/lib/astrology";
import { getDailyAstrologyState, clearDailyStateCache } from "./daily-state";
import { calcNatalChart } from "./natal-chart";
import { calcCurrentPositions, calcTransitAspects } from "./transit";
import { calcScores } from "./scoring";
import type { DailyAstrologyState } from "./types";

/* ================================================================== */
/*  测试用出生档案                                                      */
/* ================================================================== */

/** 已知完整信息的用户（精确出生时间 + 已知出生城市） */
const FULL_PROFILE: BirthProfile = {
  nickname: "测试用户",
  birthDate: "1995-06-15",
  birthTime: "08:30",
  birthTimeAccuracy: "exact",
  birthCity: "上海",
  interests: ["爱情", "事业"],
};

/** 仅知道出生日期的用户（无时间、无城市） */
const MINIMAL_PROFILE: BirthProfile = {
  nickname: "极简用户",
  birthDate: "2000-01-01",
  interests: [],
};

/** 出生时间未知的用户（有城市但无时间） */
const CITY_ONLY_PROFILE: BirthProfile = {
  nickname: "城市用户",
  birthDate: "1988-12-25",
  birthCity: "北京",
  interests: [],
};

/* ================================================================== */
/*  完整流程：BirthProfile -> NatalChart -> TransitAspects -> Scores    */
/* ================================================================== */

describe("完整流程：getDailyAstrologyState", () => {
  beforeEach(() => {
    clearDailyStateCache();
  });

  it("已知出生信息的用户，计算 2026-08-19 的星象 — 结构完整", () => {
    const state = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");

    // --- 顶层字段 ---
    expect(state.date).toBe("2026-08-19");
    expect(typeof state.dominantTheme).toBe("string");
    expect(typeof state.moonPhase).toBe("string");
    expect(Array.isArray(state.keywords)).toBe(true);

    // --- 本命星盘 ---
    expect(state.natalChart).toBeDefined();
    expect(state.natalChart.birthDate).toBe("1995-06-15");
    expect(state.natalChart.birthTime).toBe("08:30");
    expect(state.natalChart.birthCity).toBe("上海");
    expect(state.natalChart.positions).toHaveLength(10);
    expect(Array.isArray(state.natalChart.aspects)).toBe(true);
    // 有精确出生时间 + 已知城市 -> 上升星座应存在
    expect(state.natalChart.risingSign).not.toBeNull();
    expect(state.natalChart.risingSign!.planet).toBe("asc");

    // --- 当前行星位置 ---
    expect(state.currentPositions).toHaveLength(10);
    for (const pos of state.currentPositions) {
      expect(pos.longitude).toBeGreaterThanOrEqual(0);
      expect(pos.longitude).toBeLessThan(360);
      expect(pos.degree).toBeGreaterThanOrEqual(0);
      expect(pos.degree).toBeLessThan(30);
    }

    // --- 行运相位 ---
    expect(Array.isArray(state.transitAspects)).toBe(true);
    for (const asp of state.transitAspects) {
      expect(asp.strength).toBeGreaterThanOrEqual(0);
      expect(asp.strength).toBeLessThanOrEqual(1);
      expect(asp.orb).toBeGreaterThanOrEqual(0);
    }

    // --- 五维评分 ---
    const dims = ["emotion", "love", "creativity", "social", "career"] as const;
    for (const dim of dims) {
      expect(state.scores[dim]).toBeDefined();
      expect(state.scores[dim].score).toBeGreaterThanOrEqual(0);
      expect(state.scores[dim].score).toBeLessThanOrEqual(100);
      expect(["low", "normal", "high"]).toContain(state.scores[dim].level);
      expect(Array.isArray(state.scores[dim].factors)).toBe(true);
    }

    // --- 月相 ---
    const validMoonPhases = [
      "新月", "蛾眉月", "上弦月", "盈凸月",
      "满月", "亏凸月", "下弦月", "残月",
    ];
    expect(validMoonPhases).toContain(state.moonPhase);

    // --- 主导主题 ---
    const validThemes = ["relationship", "career", "emotion", "creativity", "social"];
    expect(validThemes).toContain(state.dominantTheme);
  });

  it("极简出生信息（无时间、无城市）也能正常计算", () => {
    const state = getDailyAstrologyState(MINIMAL_PROFILE, "2026-08-19");

    expect(state.natalChart.positions).toHaveLength(10);
    // 无精确时间 -> 上升星座为 null
    expect(state.natalChart.risingSign).toBeNull();
    // 时间默认 12:00，城市默认"未知"
    expect(state.natalChart.birthTime).toBe("12:00");
    expect(state.natalChart.birthCity).toBe("未知");
    expect(state.currentPositions).toHaveLength(10);
    expect(state.scores).toBeDefined();
  });

  it("有城市但无出生时间 — 上升星座为 null", () => {
    const state = getDailyAstrologyState(CITY_ONLY_PROFILE, "2026-08-19");

    expect(state.natalChart.risingSign).toBeNull();
    expect(state.natalChart.birthCity).toBe("北京");
  });
});

/* ================================================================== */
/*  分步验证：NatalChart -> TransitAspects -> Scores                    */
/* ================================================================== */

describe("分步验证：各模块串联", () => {
  it("calcNatalChart 产出的 positions 可直接传入 calcTransitAspects", () => {
    const chart = calcNatalChart(FULL_PROFILE);
    const current = calcCurrentPositions(new Date("2026-08-19T12:00:00Z"));

    // 不应抛错
    const aspects = calcTransitAspects(chart.positions, current);
    expect(Array.isArray(aspects)).toBe(true);

    // 有相位时验证结构
    for (const asp of aspects) {
      expect(asp.planetA).toBeTruthy();
      expect(asp.planetB).toBeTruthy();
      expect(typeof asp.angle).toBe("number");
      expect(typeof asp.strength).toBe("number");
    }
  });

  it("calcTransitAspects 产出的 aspects 可直接传入 calcScores", () => {
    const chart = calcNatalChart(FULL_PROFILE);
    const current = calcCurrentPositions(new Date("2026-08-19T12:00:00Z"));
    const aspects = calcTransitAspects(chart.positions, current);

    const scores = calcScores(aspects);
    const dims = ["emotion", "love", "creativity", "social", "career"] as const;
    for (const dim of dims) {
      expect(scores[dim].score).toBeGreaterThanOrEqual(0);
      expect(scores[dim].score).toBeLessThanOrEqual(100);
    }
  });
});

/* ================================================================== */
/*  日期变化 -> 结果应变化                                               */
/* ================================================================== */

describe("日期敏感性", () => {
  beforeEach(() => {
    clearDailyStateCache();
  });

  it("2026-08-19 与 2026-08-20 的 DailyState 应不同", () => {
    const state19 = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");
    const state20 = getDailyAstrologyState(FULL_PROFILE, "2026-08-20");

    // 不同日期 -> 不同对象引用
    expect(state19).not.toBe(state20);

    // 至少当前行星位置应不同（月亮每天移动约 13 度）
    const moon19 = state19.currentPositions.find((p) => p.planet === "moon");
    const moon20 = state20.currentPositions.find((p) => p.planet === "moon");
    expect(moon19!.longitude).not.toBe(moon20!.longitude);

    // 日期字段确认不同
    expect(state19.date).toBe("2026-08-19");
    expect(state20.date).toBe("2026-08-20");
  });

  it("同一出生档案、不同日期的行运相位集合可能不同", () => {
    const state19 = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");
    const state20 = getDailyAstrologyState(FULL_PROFILE, "2026-08-20");

    // 行运相位来自 当前行星 x 本命行星，行星位置变了相位大概率也变
    // 至少验证两组相位不是完全相同的对象
    expect(state19.transitAspects).not.toBe(state20.transitAspects);
  });
});

/* ================================================================== */
/*  确定性：相同输入多次计算结果一致                                       */
/* ================================================================== */

describe("确定性", () => {
  beforeEach(() => {
    clearDailyStateCache();
  });

  it("相同 profile + date 多次计算，结果完全一致", () => {
    const state1 = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");
    clearDailyStateCache();
    const state2 = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");

    // 本命星盘一致
    expect(state1.natalChart.positions).toEqual(state2.natalChart.positions);
    expect(state1.natalChart.aspects).toEqual(state2.natalChart.aspects);

    // 当前行星位置一致
    expect(state1.currentPositions).toEqual(state2.currentPositions);

    // 行运相位一致
    expect(state1.transitAspects).toEqual(state2.transitAspects);

    // 五维评分一致
    expect(state1.scores).toEqual(state2.scores);

    // 关键词和主题一致
    expect(state1.keywords).toEqual(state2.keywords);
    expect(state1.dominantTheme).toBe(state2.dominantTheme);
    expect(state1.moonPhase).toBe(state2.moonPhase);
  });

  it("calcCurrentPositions 同一 Date 对象多次调用一致", () => {
    const date = new Date("2026-08-19T12:00:00Z");
    const pos1 = calcCurrentPositions(date);
    const pos2 = calcCurrentPositions(date);
    expect(pos1).toEqual(pos2);
  });

  it("calcNatalChart 同一 profile 多次调用一致", () => {
    const chart1 = calcNatalChart(FULL_PROFILE);
    const chart2 = calcNatalChart(FULL_PROFILE);

    expect(chart1.positions).toEqual(chart2.positions);
    expect(chart1.aspects).toEqual(chart2.aspects);
    expect(chart1.risingSign).toEqual(chart2.risingSign);
  });
});

/* ================================================================== */
/*  缓存机制                                                           */
/* ================================================================== */

describe("缓存机制", () => {
  beforeEach(() => {
    clearDailyStateCache();
  });

  it("缓存命中：相同 profile + date 返回同一引用", () => {
    const a = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");
    const b = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");
    expect(a).toBe(b); // 同一对象引用，证明缓存命中
  });

  it("缓存未命中：不同日期返回不同引用", () => {
    const a = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");
    const b = getDailyAstrologyState(FULL_PROFILE, "2026-08-20");
    expect(a).not.toBe(b);
  });

  it("缓存未命中：不同 profile 返回不同引用", () => {
    const a = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");
    const b = getDailyAstrologyState(MINIMAL_PROFILE, "2026-08-19");
    expect(a).not.toBe(b);
  });

  it("clearDailyStateCache 后重新计算产生新引用", () => {
    const a = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");
    clearDailyStateCache();
    const b = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");
    expect(a).not.toBe(b); // 新引用（缓存已清除）
    // 内容仍一致
    expect(a.date).toBe(b.date);
    expect(a.natalChart.positions).toEqual(b.natalChart.positions);
  });

  it("批量查询不同日期，各自缓存独立", () => {
    const dates = ["2026-08-19", "2026-08-20", "2026-08-21"];
    const states: DailyAstrologyState[] = dates.map((d) =>
      getDailyAstrologyState(FULL_PROFILE, d),
    );

    // 再次查询应命中缓存
    for (let i = 0; i < dates.length; i++) {
      const cached = getDailyAstrologyState(FULL_PROFILE, dates[i]);
      expect(cached).toBe(states[i]);
    }
  });
});

/* ================================================================== */
/*  错误处理                                                           */
/* ================================================================== */

describe("错误处理", () => {
  beforeEach(() => {
    clearDailyStateCache();
  });

  it("无效出生日期格式会抛出明确错误", () => {
    const badProfile: BirthProfile = {
      nickname: "异常用户",
      birthDate: "not-a-date",
      interests: [],
    };
    // birthMoment 产生 Invalid Date，astronomy-engine 的 MakeTime 会抛错
    expect(() => {
      getDailyAstrologyState(badProfile, "2026-08-19");
    }).toThrow();
  });

  it("不存在的城市不会崩溃 — 上升星座降级为 null", () => {
    const unknownCityProfile: BirthProfile = {
      nickname: "火星用户",
      birthDate: "1990-05-20",
      birthTime: "10:00",
      birthTimeAccuracy: "exact",
      birthCity: "火星基地",
      interests: [],
    };
    const state = getDailyAstrologyState(unknownCityProfile, "2026-08-19");

    // 未知城市 -> findCity 返回 undefined -> 上升星座为 null
    expect(state.natalChart.risingSign).toBeNull();
    expect(state.natalChart.birthCity).toBe("火星基地");
  });

  it("birthCity 为空字符串不会崩溃", () => {
    const emptyCityProfile: BirthProfile = {
      nickname: "空城市",
      birthDate: "1992-03-10",
      birthCity: "",
      interests: [],
    };
    expect(() => {
      getDailyAstrologyState(emptyCityProfile, "2026-08-19");
    }).not.toThrow();
  });

  it("birthTime 为空字符串会抛错（?? 不拦截空字符串）", () => {
    const emptyTimeProfile: BirthProfile = {
      nickname: "空时间",
      birthDate: "1992-03-10",
      birthTime: "",
      birthCity: "上海",
      interests: [],
    };
    // birthMoment 中 (profile.birthTime ?? "12:00") 不会拦截 ""（?? 只处理 null/undefined），
    // "".split(":") 产生 NaN，导致 astronomy-engine 抛错
    expect(() => {
      calcNatalChart(emptyTimeProfile);
    }).toThrow();
  });
});

/* ================================================================== */
/*  性能测试                                                           */
/* ================================================================== */

describe("性能", () => {
  it("计算 10 颗行星位置 < 50ms", () => {
    const date = new Date("2026-08-19T12:00:00Z");
    const start = performance.now();
    const positions = calcCurrentPositions(date);
    const elapsed = performance.now() - start;

    expect(positions).toHaveLength(10);
    expect(elapsed).toBeLessThan(50);
  });

  it("完整 DailyState 计算 < 200ms", () => {
    // 清除缓存确保冷启动计时
    clearDailyStateCache();
    const start = performance.now();
    const state = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");
    const elapsed = performance.now() - start;

    expect(state).toBeDefined();
    expect(state.natalChart.positions).toHaveLength(10);
    expect(state.currentPositions).toHaveLength(10);
    expect(elapsed).toBeLessThan(200);
  });

  it("缓存命中后的查询接近 0ms", () => {
    clearDailyStateCache();
    // 预热缓存
    getDailyAstrologyState(FULL_PROFILE, "2026-08-19");

    // 缓存命中计时
    const start = performance.now();
    const state = getDailyAstrologyState(FULL_PROFILE, "2026-08-19");
    const elapsed = performance.now() - start;

    expect(state).toBeDefined();
    // 缓存命中应 < 1ms
    expect(elapsed).toBeLessThan(1);
  });
});
