import { describe, it, expect } from "vitest";
import {
  calcCurrentPositions,
  calcTransitAspects,
  getMajorTransits,
} from "./transit";
import type { PlanetPosition } from "./types";

/* ------------------------------------------------------------------ */
/*  辅助函数                                                          */
/* ------------------------------------------------------------------ */

function makePos(planet: PlanetPosition["planet"], longitude: number): PlanetPosition {
  return {
    planet,
    longitude,
    sign: "aries",
    degree: longitude % 30,
  };
}

/* ------------------------------------------------------------------ */
/*  calcCurrentPositions                                              */
/* ------------------------------------------------------------------ */

describe("calcCurrentPositions", () => {
  it("返回 10 颗行星的位置", () => {
    const positions = calcCurrentPositions(new Date("2026-08-19T00:00:00Z"));
    expect(positions).toHaveLength(10);
  });

  it("每颗行星都包含 planet / longitude / sign / degree", () => {
    const positions = calcCurrentPositions(new Date("2026-08-19T00:00:00Z"));
    for (const p of positions) {
      expect(p.planet).toBeTruthy();
      expect(typeof p.longitude).toBe("number");
      expect(p.longitude).toBeGreaterThanOrEqual(0);
      expect(p.longitude).toBeLessThan(360);
      expect(p.sign).toBeTruthy();
      expect(p.degree).toBeGreaterThanOrEqual(0);
      expect(p.degree).toBeLessThan(30);
    }
  });

  it("同一天查询应该返回相同结果（确定性）", () => {
    const d = new Date("2026-08-19T12:00:00Z");
    const a = calcCurrentPositions(d);
    const b = calcCurrentPositions(d);
    expect(a).toEqual(b);
  });

  it("不同日期应该返回不同结果", () => {
    const aug19 = calcCurrentPositions(new Date("2026-08-19T00:00:00Z"));
    const aug20 = calcCurrentPositions(new Date("2026-08-20T00:00:00Z"));

    // 至少有一颗行星位置不同（月亮每天移动约 13°）
    const hasDifference = aug19.some((p, i) => {
      const q = aug20[i];
      return p.planet === q.planet && p.longitude !== q.longitude;
    });
    expect(hasDifference).toBe(true);
  });

  it("不包含上升点（asc）", () => {
    const positions = calcCurrentPositions(new Date("2026-08-19T00:00:00Z"));
    const planets = positions.map((p) => p.planet);
    expect(planets).not.toContain("asc");
  });
});

/* ------------------------------------------------------------------ */
/*  calcTransitAspects                                                */
/* ------------------------------------------------------------------ */

describe("calcTransitAspects", () => {
  it("行运行星与本命行星有相位时返回结果", () => {
    // 行运太阳在 0°，本命月亮在 180° -> 对冲
    const natal: PlanetPosition[] = [makePos("moon", 180)];
    const current: PlanetPosition[] = [makePos("sun", 0)];

    const aspects = calcTransitAspects(natal, current);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe("opposition");
    expect(aspects[0].planetA).toBe("sun");  // 行运行星
    expect(aspects[0].planetB).toBe("moon"); // 本命行星
  });

  it("行运行星与本命行星无相位时返回空", () => {
    const natal: PlanetPosition[] = [makePos("moon", 45)];
    const current: PlanetPosition[] = [makePos("sun", 0)];

    const aspects = calcTransitAspects(natal, current);
    expect(aspects).toHaveLength(0);
  });

  it("多颗行星返回所有匹配的相位", () => {
    const natal: PlanetPosition[] = [
      makePos("moon", 0),
      makePos("venus", 120),
    ];
    const current: PlanetPosition[] = [
      makePos("sun", 0),    // conj moon(0), trine venus(120)
      makePos("mars", 180), // oppo moon(0), trine venus(120)? 60° diff = sextile
    ];

    const aspects = calcTransitAspects(natal, current);
    // sun(0)-moon(0)=conjunction, sun(0)-venus(120)=trine
    // mars(180)-moon(0)=opposition, mars(180)-venus(120)=sextile(60°)
    expect(aspects).toHaveLength(4);
  });

  it("空数组返回空", () => {
    expect(calcTransitAspects([], [makePos("sun", 0)])).toHaveLength(0);
    expect(calcTransitAspects([makePos("sun", 0)], [])).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  getMajorTransits                                                  */
/* ------------------------------------------------------------------ */

describe("getMajorTransits", () => {
  it("优先配对中 orb 紧的相位会被筛选出来", () => {
    // Transit Venus conjunct Natal Moon (orb=1)
    const aspects = [
      {
        planetA: "venus" as const,
        planetB: "moon" as const,
        type: "conjunction" as const,
        angle: 1,
        orb: 1,
        strength: 0.875,
      },
    ];
    const result = getMajorTransits(aspects);
    expect(result).toHaveLength(1);
  });

  it("非优先配对会被过滤掉", () => {
    // Mercury-Mars 不在优先列表中
    const aspects = [
      {
        planetA: "mercury" as const,
        planetB: "mars" as const,
        type: "trine" as const,
        angle: 120,
        orb: 0,
        strength: 1,
      },
    ];
    expect(getMajorTransits(aspects)).toHaveLength(0);
  });

  it("orb 超过行运严格上限的相位会被过滤", () => {
    // Transit Venus trine Natal Moon, orb=5 (超过行运 trine 的 4° 上限)
    const aspects = [
      {
        planetA: "venus" as const,
        planetB: "moon" as const,
        type: "trine" as const,
        angle: 115,
        orb: 5,
        strength: 0.167,
      },
    ];
    expect(getMajorTransits(aspects)).toHaveLength(0);
  });

  it("结果按 strength 降序排列", () => {
    const aspects = [
      {
        planetA: "venus" as const,
        planetB: "moon" as const,
        type: "sextile" as const,
        angle: 60,
        orb: 3,
        strength: 0.4,
      },
      {
        planetA: "mars" as const,
        planetB: "venus" as const,
        type: "conjunction" as const,
        angle: 0,
        orb: 0,
        strength: 1,
      },
    ];
    const result = getMajorTransits(aspects);
    expect(result).toHaveLength(2);
    expect(result[0].strength).toBeGreaterThanOrEqual(result[1].strength);
  });

  it("空数组返回空", () => {
    expect(getMajorTransits([])).toHaveLength(0);
  });

  it("完整流程：真实日期的 major transits 可以正常计算", () => {
    const date = new Date("2026-08-19T00:00:00Z");
    const natalPositions = calcCurrentPositions(
      new Date("1990-06-15T12:00:00Z"),
    );
    const currentPositions = calcCurrentPositions(date);

    const transitAspects = calcTransitAspects(natalPositions, currentPositions);
    const majorTransits = getMajorTransits(transitAspects);

    // 所有 major transits 的 orb 都应在对应相位的严格上限内
    for (const t of majorTransits) {
      const maxOrb =
        t.type === "conjunction" || t.type === "opposition"
          ? 6
          : t.type === "trine" || t.type === "square"
            ? 4
            : 3;
      expect(t.orb).toBeLessThanOrEqual(maxOrb);
    }
  });
});
