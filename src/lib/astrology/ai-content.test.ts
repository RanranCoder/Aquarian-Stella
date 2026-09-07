import { describe, it, expect } from "vitest";
import {
  assembleTodayPrompt,
  assembleRelationPrompt,
  assemblePersonalityPrompt,
  parseAndValidate,
  SYSTEM_PROMPT,
  todayCacheKey,
  relationCacheKey,
  personalityCacheKey,
  todayExpiresAt,
} from "./ai-content";
import type { DailyAstrologyState, NatalChart, Aspect } from "./types";
import type { BirthProfile } from "@/lib/astrology";

// ── SYSTEM_PROMPT ──

describe("SYSTEM_PROMPT", () => {
  it("包含禁止规则关键词", () => {
    expect(SYSTEM_PROMPT).toContain("禁止");
    expect(SYSTEM_PROMPT).toContain("恐慌");
    expect(SYSTEM_PROMPT).toContain("推算");
  });
});

// ── parseAndValidate ──

describe("parseAndValidate", () => {
  it("合法 JSON 返回对象", () => {
    const result = parseAndValidate('{"core":"测试","keywords":["k1"]}', ["core"]);
    expect(result).toEqual({ core: "测试", keywords: ["k1"] });
  });

  it("非法 JSON 返回 null", () => {
    expect(parseAndValidate("not json", [])).toBeNull();
  });

  it("缺少必需字段返回 null", () => {
    expect(parseAndValidate('{"keywords":["k1"]}', ["core"])).toBeNull();
  });

  it("null 输入返回 null", () => {
    expect(parseAndValidate(null, [])).toBeNull();
  });

  it("markdown 代码块包裹的 JSON 能正确解析", () => {
    const result = parseAndValidate('```json\n{"core":"测试"}\n```', ["core"]);
    expect(result).toEqual({ core: "测试" });
  });

  it("违反 trust 规则的文本返回 null", () => {
    expect(parseAndValidate('{"core":"你一定会成功"}', ["core"])).toBeNull();
  });

  it("数组中包含违规文本返回 null", () => {
    expect(parseAndValidate('{"core":"ok","keywords":["你一定会成功"]}', ["core"])).toBeNull();
  });
});

// ── assembleTodayPrompt ──

describe("assembleTodayPrompt", () => {
  it("包含太阳/月亮/上升星座名称", () => {
    const state = {
      moonPhase: "满月",
      dominantTheme: "emotion",
      currentPositions: [],
      natalChart: {
        positions: [{ planet: "moon", sign: "scorpio", degree: 10 }],
        risingSign: { planet: "asc", sign: "aquarius", degree: 5 },
      },
      transitAspects: [],
      scores: {
        emotion: { score: 72, level: "high", factors: [] },
        love: { score: 55, level: "normal", factors: [] },
        creativity: { score: 60, level: "normal", factors: [] },
        social: { score: 68, level: "normal", factors: [] },
        career: { score: 50, level: "normal", factors: [] },
      },
      keywords: ["情感"],
    } as unknown as DailyAstrologyState;

    const prompt = assembleTodayPrompt(state, "gemini", "2026-09-06");
    expect(prompt).toContain("双子座");
    expect(prompt).toContain("天蝎座");
    expect(prompt).toContain("水瓶座");
    expect(prompt).toContain("满月");
    expect(prompt).toContain("2026-09-06");
  });

  it("无上升时不含'上升'文本", () => {
    const state = {
      moonPhase: "新月",
      dominantTheme: "career",
      currentPositions: [],
      natalChart: { positions: [{ planet: "moon", sign: "aries", degree: 5 }], risingSign: null },
      transitAspects: [],
      scores: {
        emotion: { score: 60, level: "normal", factors: [] },
        love: { score: 60, level: "normal", factors: [] },
        creativity: { score: 60, level: "normal", factors: [] },
        social: { score: 60, level: "normal", factors: [] },
        career: { score: 60, level: "normal", factors: [] },
      },
      keywords: [],
    } as unknown as DailyAstrologyState;
    const prompt = assembleTodayPrompt(state, "aries", "2026-01-01");
    expect(prompt).not.toContain("上升");
  });
});

// ── assembleRelationPrompt ──

describe("assembleRelationPrompt", () => {
  it("包含两人昵称和评分", () => {
    const profileA: BirthProfile = { nickname: "Alice", birthDate: "1995-06-15", interests: [] };
    const profileB: BirthProfile = { nickname: "Bob", birthDate: "1993-11-22", interests: [] };
    const chartA = { positions: [{ planet: "sun", sign: "gemini", degree: 15 }], aspects: [], risingSign: null, birthDate: "1995-06-15", birthTime: "12:00", birthCity: "未知" } as unknown as NatalChart;
    const chartB = { positions: [{ planet: "sun", sign: "scorpio", degree: 0 }], aspects: [], risingSign: null, birthDate: "1993-11-22", birthTime: "12:00", birthCity: "未知" } as unknown as NatalChart;

    const prompt = assembleRelationPrompt(profileA, profileB, chartA, chartB, [], 73, []);
    expect(prompt).toContain("Alice");
    expect(prompt).toContain("Bob");
    expect(prompt).toContain("73");
  });
});

// ── assemblePersonalityPrompt ──

describe("assemblePersonalityPrompt", () => {
  it("包含六颗行星的星座", () => {
    const chart = {
      positions: [
        { planet: "sun", sign: "gemini", degree: 15 },
        { planet: "moon", sign: "scorpio", degree: 10 },
        { planet: "mercury", sign: "gemini", degree: 20 },
        { planet: "venus", sign: "taurus", degree: 5 },
        { planet: "mars", sign: "leo", degree: 12 },
      ],
      risingSign: { planet: "asc", sign: "aquarius", degree: 5 },
      aspects: [],
      birthDate: "1995-06-15",
      birthTime: "08:30",
      birthCity: "上海",
    } as unknown as NatalChart;

    const prompt = assemblePersonalityPrompt(chart);
    expect(prompt).toContain("双子座");
    expect(prompt).toContain("天蝎座");
    expect(prompt).toContain("水瓶座");
    expect(prompt).toContain("金牛座");
    expect(prompt).toContain("狮子座");
  });

  it("无上升时显示'未知'", () => {
    const chart = {
      positions: [{ planet: "sun", sign: "aries", degree: 0 }],
      risingSign: null,
      aspects: [],
      birthDate: "2000-01-01",
      birthTime: "12:00",
      birthCity: "未知",
    } as unknown as NatalChart;
    const prompt = assemblePersonalityPrompt(chart);
    expect(prompt).toContain("未知");
  });
});

// ── 缓存 key 生成 ──

describe("cache key generation", () => {
  it("todayCacheKey 格式正确", () => {
    expect(todayCacheKey(42, "2026-09-06")).toBe("42:today:2026-09-06");
  });

  it("relationCacheKey 对同一对人确定性", () => {
    const a: BirthProfile = { nickname: "A", birthDate: "1995-06-15", interests: [] };
    const b: BirthProfile = { nickname: "B", birthDate: "1993-11-22", interests: [] };
    expect(relationCacheKey(1, a, b)).toBe(relationCacheKey(1, a, b));
  });

  it("relationCacheKey 对不同人不同", () => {
    const a: BirthProfile = { nickname: "A", birthDate: "1995-06-15", interests: [] };
    const b: BirthProfile = { nickname: "B", birthDate: "1993-11-22", interests: [] };
    const c: BirthProfile = { nickname: "C", birthDate: "2000-03-10", interests: [] };
    expect(relationCacheKey(1, a, b)).not.toBe(relationCacheKey(1, a, c));
  });

  it("todayExpiresAt 返回未来时间", () => {
    const expires = todayExpiresAt("2026-09-06");
    expect(expires).toBeGreaterThan(Date.UTC(2026, 8, 6));
    expect(expires).toBeLessThan(Date.UTC(2026, 8, 7));
  });
});
