import { describe, it, expect } from "vitest";
import { angleDiff, calcAspect, calcAllAspects, calcAspectsBetween, ASPECTS } from "./aspects";
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
/*  angleDiff                                                         */
/* ------------------------------------------------------------------ */

describe("angleDiff", () => {
  it("同一角度差值为 0", () => {
    expect(angleDiff(90, 90)).toBe(0);
  });

  it("350° 与 10° 的差值为 20°", () => {
    expect(angleDiff(350, 10)).toBe(20);
  });

  it("0° 与 180° 的差值为 180°", () => {
    expect(angleDiff(0, 180)).toBe(180);
  });

  it("10° 与 350° 的差值为 20°（顺序无关）", () => {
    expect(angleDiff(10, 350)).toBe(20);
  });

  it("270° 与 90° 的差值为 180°", () => {
    expect(angleDiff(270, 90)).toBe(180);
  });
});

/* ------------------------------------------------------------------ */
/*  ASPECTS 常量                                                      */
/* ------------------------------------------------------------------ */

describe("ASPECTS", () => {
  it("定义了 5 种相位", () => {
    expect(ASPECTS).toHaveLength(5);
  });

  it("包含所有必需相位", () => {
    const types = ASPECTS.map((a) => a.type);
    expect(types).toContain("conjunction");
    expect(types).toContain("opposition");
    expect(types).toContain("trine");
    expect(types).toContain("square");
    expect(types).toContain("sextile");
  });
});

/* ------------------------------------------------------------------ */
/*  calcAspect                                                        */
/* ------------------------------------------------------------------ */

describe("calcAspect", () => {
  const sun: PlanetPosition["planet"] = "sun";
  const moon: PlanetPosition["planet"] = "moon";

  // --- conjunction (0°, orb ±8°) ---

  it("0° 应该是 conjunction", () => {
    const result = calcAspect(0, 0, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("conjunction");
    expect(result!.orb).toBe(0);
    expect(result!.strength).toBe(1);
  });

  it("7° 应该是 conjunction (orb=7)", () => {
    const result = calcAspect(0, 7, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("conjunction");
    expect(result!.orb).toBe(7);
  });

  it("9° 应该不是 conjunction（超出容许度）", () => {
    const result = calcAspect(0, 9, sun, moon);
    expect(result).toBeNull();
  });

  // --- sextile (60°, orb ±5°) ---

  it("54° 应该是无相位（超出 sextile 容许度 5°）", () => {
    const result = calcAspect(0, 54, sun, moon);
    expect(result).toBeNull();
  });

  it("59° 应该是 sextile（orb=1，在容许度内）", () => {
    const result = calcAspect(0, 59, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("sextile");
    expect(result!.orb).toBe(1);
  });

  it("60° 应该是 sextile", () => {
    const result = calcAspect(0, 60, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("sextile");
    expect(result!.orb).toBe(0);
    expect(result!.strength).toBe(1);
  });

  it("61° 应该是 sextile (orb=1)", () => {
    const result = calcAspect(0, 61, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("sextile");
    expect(result!.orb).toBe(1);
  });

  it("66° 应该不是 sextile（超出容许度）", () => {
    const result = calcAspect(0, 66, sun, moon);
    expect(result).toBeNull();
  });

  // --- square (90°, orb ±6°) ---

  it("83° 应该是无相位（超出 square 容许度 6°）", () => {
    const result = calcAspect(0, 83, sun, moon);
    expect(result).toBeNull();
  });

  it("89° 应该是 square（orb=1，在容许度内）", () => {
    const result = calcAspect(0, 89, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("square");
    expect(result!.orb).toBe(1);
  });

  it("90° 应该是 square", () => {
    const result = calcAspect(0, 90, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("square");
    expect(result!.orb).toBe(0);
    expect(result!.strength).toBe(1);
  });

  it("91° 应该是 square (orb=1)", () => {
    const result = calcAspect(0, 91, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("square");
    expect(result!.orb).toBe(1);
  });

  it("97° 应该不是 square（超出容许度）", () => {
    const result = calcAspect(0, 97, sun, moon);
    expect(result).toBeNull();
  });

  // --- trine (120°, orb ±6°) ---

  it("113° 应该是无相位（超出 trine 容许度 6°）", () => {
    const result = calcAspect(0, 113, sun, moon);
    expect(result).toBeNull();
  });

  it("119° 应该是 trine（orb=1，在容许度内）", () => {
    const result = calcAspect(0, 119, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("trine");
    expect(result!.orb).toBe(1);
  });

  it("120° 应该是 trine", () => {
    const result = calcAspect(0, 120, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("trine");
    expect(result!.orb).toBe(0);
    expect(result!.strength).toBe(1);
  });

  it("121° 应该是 trine (orb=1)", () => {
    const result = calcAspect(0, 121, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("trine");
    expect(result!.orb).toBe(1);
  });

  it("127° 应该不是 trine（超出容许度）", () => {
    const result = calcAspect(0, 127, sun, moon);
    expect(result).toBeNull();
  });

  // --- opposition (180°, orb ±8°) ---

  it("171° 应该是无相位（超出 opposition 容许度 8°）", () => {
    const result = calcAspect(0, 171, sun, moon);
    expect(result).toBeNull();
  });

  it("179° 应该是 opposition（orb=1，在容许度内）", () => {
    const result = calcAspect(0, 179, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("opposition");
    expect(result!.orb).toBe(1);
  });

  it("180° 应该是 opposition", () => {
    const result = calcAspect(0, 180, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("opposition");
    expect(result!.orb).toBe(0);
    expect(result!.strength).toBe(1);
  });

  it("181° 应该是 opposition (orb=1)", () => {
    const result = calcAspect(0, 181, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("opposition");
    expect(result!.orb).toBe(1);
  });

  it("189° 应该不是 opposition（超出容许度）", () => {
    const result = calcAspect(0, 189, sun, moon);
    expect(result).toBeNull();
  });

  // --- 跨越 360° 边界 ---

  it("359° 与 1° 是 conjunction", () => {
    const result = calcAspect(359, 1, sun, moon);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("conjunction");
    expect(result!.orb).toBe(2);
  });

  // --- orb 超出所有相位范围 ---

  it("45° 不匹配任何相位", () => {
    const result = calcAspect(0, 45, sun, moon);
    expect(result).toBeNull();
  });

  it("150° 不匹配任何相位", () => {
    const result = calcAspect(0, 150, sun, moon);
    expect(result).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  calcAllAspects                                                    */
/* ------------------------------------------------------------------ */

describe("calcAllAspects", () => {
  it("三颗行星全部有相位时返回 3 个结果", () => {
    const positions: PlanetPosition[] = [
      makePos("sun", 0),
      makePos("moon", 60),
      makePos("venus", 120),
    ];
    const aspects = calcAllAspects(positions);
    expect(aspects).toHaveLength(3);
  });

  it("无相位时返回空数组", () => {
    const positions: PlanetPosition[] = [
      makePos("sun", 0),
      makePos("moon", 45),
    ];
    const aspects = calcAllAspects(positions);
    expect(aspects).toHaveLength(0);
  });

  it("单颗行星不产生相位", () => {
    const positions: PlanetPosition[] = [makePos("sun", 0)];
    expect(calcAllAspects(positions)).toHaveLength(0);
  });

  it("空数组返回空", () => {
    expect(calcAllAspects([])).toHaveLength(0);
  });

  it("返回的 aspect 包含正确的行星名", () => {
    const positions: PlanetPosition[] = [
      makePos("sun", 0),
      makePos("moon", 180),
    ];
    const aspects = calcAllAspects(positions);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].planetA).toBe("sun");
    expect(aspects[0].planetB).toBe("moon");
    expect(aspects[0].type).toBe("opposition");
  });
});

/* ------------------------------------------------------------------ */
/*  calcAspectsBetween                                                */
/* ------------------------------------------------------------------ */

describe("calcAspectsBetween", () => {
  it("计算两组位置之间的相位", () => {
    const groupA: PlanetPosition[] = [
      makePos("sun", 0),
      makePos("moon", 60),
    ];
    const groupB: PlanetPosition[] = [
      makePos("mars", 180),
      makePos("venus", 120),
    ];
    const aspects = calcAspectsBetween(groupA, groupB);
    // sun(0) - mars(180) = opposition
    // sun(0) - venus(120) = trine
    // moon(60) - mars(180) = trine (120°)
    // moon(60) - venus(120) = sextile (60°)
    expect(aspects).toHaveLength(4);
  });

  it("空组返回空数组", () => {
    expect(calcAspectsBetween([], [makePos("sun", 0)])).toHaveLength(0);
    expect(calcAspectsBetween([makePos("sun", 0)], [])).toHaveLength(0);
  });

  it("仅计算跨组相位，不计算组内相位", () => {
    const groupA: PlanetPosition[] = [
      makePos("sun", 0),
      makePos("moon", 90), // 组内 square，不应被计算
    ];
    const groupB: PlanetPosition[] = [makePos("mars", 180)];
    const aspects = calcAspectsBetween(groupA, groupB);
    // sun(0)-mars(180)=opposition, moon(90)-mars(180)=square
    expect(aspects).toHaveLength(2);
    const pairs = aspects.map((a) => `${a.planetA}-${a.planetB}`);
    expect(pairs).not.toContain("sun-moon");
  });
});
