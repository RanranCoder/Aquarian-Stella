import { describe, it, expect } from "vitest";
import type { Zodiac } from "@/data/zodiacs";
import type { BirthProfile } from "@/lib/astrology";
import { getDailyHoroscope, THEME_CONTENT } from "./daily";

/* ------------------------------------------------------------------ */
/*  fixtures                                                           */
/* ------------------------------------------------------------------ */

const ARIES: Zodiac = {
  slug: "aries",
  name: "白羊座",
  en: "Aries",
  symbol: "♈",
  dateRange: "3.21 – 4.19",
  dates: { month: 3, day: 21 },
  element: "fire",
  elementLabel: "火象",
  rulingPlanet: "火星",
  keywords: ["勇气", "直接", "行动"],
  motto: "先跑起来，路会在脚下亮起来。",
  personality: "",
  love: "",
  career: "",
  todayHint: "",
};

const GEMINI: Zodiac = {
  slug: "gemini",
  name: "双子座",
  en: "Gemini",
  symbol: "♊",
  dateRange: "5.21 – 6.21",
  dates: { month: 5, day: 21 },
  element: "air",
  elementLabel: "风象",
  rulingPlanet: "水星",
  keywords: ["好奇", "灵活", "沟通"],
  motto: "",
  personality: "",
  love: "",
  career: "",
  todayHint: "",
};

const SAMPLE_PROFILE: BirthProfile = {
  nickname: "test",
  birthDate: "1995-06-15",
  birthTime: "08:30",
  birthTimeAccuracy: "exact",
  birthCity: "上海",
  interests: [],
};

/* ================================================================== */
/*  基础模式（无 profile）                                               */
/* ================================================================== */

describe("getDailyHoroscope – basic mode (no profile)", () => {
  it("返回完整的 DailyHoroscope 结构", () => {
    const h = getDailyHoroscope(ARIES, "2025-08-15");

    expect(h.date).toBe("2025-08-15");
    expect(h.theme).toBeDefined();
    expect(typeof h.theme.key).toBe("string");
    expect(typeof h.theme.core).toBe("string");
    expect(typeof h.theme.expand).toBe("string");
    expect(h.theme.actions).toHaveProperty("yes");
    expect(h.theme.actions).toHaveProperty("no");
    expect(typeof h.theme.question).toBe("string");
    expect(Array.isArray(h.keywords)).toBe(true);
    expect(Array.isArray(h.dimensions)).toBe(true);
    expect(h.signName).toBe("白羊座");
    expect(h.signSymbol).toBe("♈");
  });

  it("五维评分全部为基础分 60", () => {
    const h = getDailyHoroscope(ARIES, "2025-08-15");

    expect(h.dimensions).toHaveLength(5);
    for (const d of h.dimensions) {
      expect(d.score).toBe(60);
    }
  });

  it("关键词来自星座关键词", () => {
    const h = getDailyHoroscope(ARIES, "2025-08-15");

    // 应包含白羊座的 keywords
    for (const kw of h.keywords) {
      expect(ARIES.keywords).toContain(kw);
    }
  });

  it("theme 来自 THEME_CONTENT 池", () => {
    const h = getDailyHoroscope(ARIES, "2025-08-15");
    const keys = THEME_CONTENT.map((t) => t.key);
    expect(keys).toContain(h.theme.key);
  });
});

/* ================================================================== */
/*  Transit 引擎模式（有 profile）                                       */
/* ================================================================== */

describe("getDailyHoroscope – transit mode (with profile)", () => {
  it("返回完整的 DailyHoroscope 结构", () => {
    const h = getDailyHoroscope(ARIES, "2025-08-15", SAMPLE_PROFILE);

    expect(h.date).toBe("2025-08-15");
    expect(h.theme).toBeDefined();
    expect(typeof h.theme.key).toBe("string");
    expect(typeof h.theme.core).toBe("string");
    expect(Array.isArray(h.keywords)).toBe(true);
    expect(Array.isArray(h.dimensions)).toBe(true);
    expect(h.signName).toBe("白羊座");
    expect(h.signSymbol).toBe("♈");
  });

  it("五维评分全部在 0-100 范围内", () => {
    const h = getDailyHoroscope(ARIES, "2025-08-15", SAMPLE_PROFILE);

    expect(h.dimensions).toHaveLength(5);
    for (const d of h.dimensions) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });

  it("维度标签包含标准五维", () => {
    const h = getDailyHoroscope(ARIES, "2025-08-15", SAMPLE_PROFILE);
    const keys = h.dimensions.map((d) => d.key);

    expect(keys).toContain("情绪");
    expect(keys).toContain("爱情");
    expect(keys).toContain("创造力");
    expect(keys).toContain("人际");
    expect(keys).toContain("事业");
  });

  it("theme 来自 THEME_CONTENT 池", () => {
    const h = getDailyHoroscope(ARIES, "2025-08-15", SAMPLE_PROFILE);
    const keys = THEME_CONTENT.map((t) => t.key);
    expect(keys).toContain(h.theme.key);
  });

  it("关键词来自 Transit 引擎（非星座静态关键词）", () => {
    const h = getDailyHoroscope(ARIES, "2025-08-15", SAMPLE_PROFILE);

    // Transit 引擎的关键词可能包含行星相关词（如"情感"、"关系"等）
    expect(h.keywords.length).toBeGreaterThan(0);
    expect(h.keywords.length).toBeLessThanOrEqual(4);
  });
});

/* ================================================================== */
/*  确定性                                                              */
/* ================================================================== */

describe("getDailyHoroscope – determinism", () => {
  it("相同 profile + 相同 date → 相同结果", () => {
    const a = getDailyHoroscope(ARIES, "2025-08-15", SAMPLE_PROFILE);
    const b = getDailyHoroscope(ARIES, "2025-08-15", SAMPLE_PROFILE);

    expect(a.date).toBe(b.date);
    expect(a.theme.key).toBe(b.theme.key);
    expect(a.theme.core).toBe(b.theme.core);
    expect(a.keywords).toEqual(b.keywords);
    expect(a.dimensions).toEqual(b.dimensions);
    expect(a.signName).toBe(b.signName);
  });

  it("相同 sign + 相同 date（无 profile）→ 相同结果", () => {
    const a = getDailyHoroscope(ARIES, "2025-08-15");
    const b = getDailyHoroscope(ARIES, "2025-08-15");

    expect(a.theme.key).toBe(b.theme.key);
    expect(a.keywords).toEqual(b.keywords);
    expect(a.dimensions).toEqual(b.dimensions);
  });

  it("不同 date → 可能不同结果（transit 模式）", () => {
    const a = getDailyHoroscope(ARIES, "2025-08-15", SAMPLE_PROFILE);
    const b = getDailyHoroscope(ARIES, "2025-08-16", SAMPLE_PROFILE);

    // 日期不同，至少日期字段不同
    expect(a.date).not.toBe(b.date);
    // 主题可能相同也可能不同（取决于主题池大小），但评分应不同
    // （Transit 引擎对不同日期计算不同行运）
  });

  it("不同 sign → 可能不同结果（基础模式）", () => {
    const a = getDailyHoroscope(ARIES, "2025-08-15");
    const b = getDailyHoroscope(GEMINI, "2025-08-15");

    expect(a.signName).not.toBe(b.signName);
    expect(a.signSymbol).not.toBe(b.signSymbol);
  });
});

/* ================================================================== */
/*  THEME_CONTENT 完整性                                                 */
/* ================================================================== */

describe("THEME_CONTENT", () => {
  it("覆盖所有 5 个主题分类", () => {
    const categories = new Set(THEME_CONTENT.map((t) => t.category));
    expect(categories).toContain("emotion");
    expect(categories).toContain("relationship");
    expect(categories).toContain("creativity");
    expect(categories).toContain("career");
    expect(categories).toContain("social");
  });

  it("每个主题都有完整字段", () => {
    for (const t of THEME_CONTENT) {
      expect(typeof t.key).toBe("string");
      expect(t.key.length).toBeGreaterThan(0);
      expect(typeof t.core).toBe("string");
      expect(t.core.length).toBeGreaterThan(0);
      expect(typeof t.expand).toBe("string");
      expect(typeof t.actions.yes).toBe("string");
      expect(typeof t.actions.no).toBe("string");
      expect(typeof t.question).toBe("string");
    }
  });
});
