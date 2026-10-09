import { describe, it, expect } from "vitest";
import { getRelation } from "./relation";
import type { BirthProfile } from "@/lib/astrology";

/* ------------------------------------------------------------------ */
/*  辅助函数                                                          */
/* ------------------------------------------------------------------ */

function makeProfile(
  nickname: string,
  birthDate: string,
  birthTime?: string,
): BirthProfile {
  return { nickname, birthDate, birthTime, interests: [] };
}

/* ------------------------------------------------------------------ */
/*  getRelation                                                       */
/* ------------------------------------------------------------------ */

describe("getRelation", () => {
  const alice = makeProfile("Alice", "1995-06-15", "08:30");
  const bob = makeProfile("Bob", "1993-11-22", "14:00");
  const carol = makeProfile("Carol", "2000-03-10", "10:00");

  /* ── 确定性 ──────────────────────────────────────────────────────── */

  it("相同两人输入 → 相同结果", () => {
    const r1 = getRelation(alice, bob);
    const r2 = getRelation(alice, bob);
    expect(r1).toEqual(r2);
  });

  it("不同两人 → 不同结果", () => {
    const r1 = getRelation(alice, bob);
    const r2 = getRelation(alice, carol);
    // 分数或内容至少有一项不同
    const same =
      r1.score === r2.score &&
      JSON.stringify(r1.keywords) === JSON.stringify(r2.keywords) &&
      JSON.stringify(r1.attraction) === JSON.stringify(r2.attraction);
    expect(same).toBe(false);
  });

  /* ── 输出结构 ────────────────────────────────────────────────────── */

  it("输出包含所有必需字段", () => {
    const r = getRelation(alice, bob);
    expect(typeof r.score).toBe("number");
    expect(Array.isArray(r.keywords)).toBe(true);
    expect(Array.isArray(r.attraction)).toBe(true);
    expect(Array.isArray(r.misunderstanding)).toBe(true);
    expect(typeof r.growth).toBe("string");
    expect(typeof r.advice).toBe("string");
  });

  it("score 在 0-100 范围内", () => {
    const r = getRelation(alice, bob);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("keywords 非空", () => {
    const r = getRelation(alice, bob);
    expect(r.keywords.length).toBeGreaterThan(0);
  });

  it("attraction 有 3 条", () => {
    const r = getRelation(alice, bob);
    expect(r.attraction).toHaveLength(3);
  });

  it("misunderstanding 有 3 条", () => {
    const r = getRelation(alice, bob);
    expect(r.misunderstanding).toHaveLength(3);
  });

  it("growth 和 advice 非空字符串", () => {
    const r = getRelation(alice, bob);
    expect(r.growth.length).toBeGreaterThan(0);
    expect(r.advice.length).toBeGreaterThan(0);
  });

  /* ── 无随机依赖 ──────────────────────────────────────────────────── */

  it("多次调用结果完全一致（无随机抖动）", () => {
    const results = Array.from({ length: 10 }, () => getRelation(alice, bob));
    for (const r of results) {
      expect(r).toEqual(results[0]);
    }
  });

  /* ── 无出生时间的降级 ─────────────────────────────────────────────── */

  it("不知道出生时间也能正常计算", () => {
    const a = makeProfile("A", "1995-06-15");
    const b = makeProfile("B", "1993-11-22");
    const r = getRelation(a, b);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.attraction.length).toBeGreaterThan(0);
  });
});
