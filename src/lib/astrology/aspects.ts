import type { Planet, PlanetPosition, Aspect, AspectType } from "./types";

/* ------------------------------------------------------------------ */
/*  相位定义                                                          */
/* ------------------------------------------------------------------ */

/** 相位参数：角度 + 最大容许度 */
interface AspectDef {
  type: AspectType;
  angle: number;
  maxOrb: number;
}

/**
 * 五大主相位。
 *
 * | 相位 | 角度 | 容许度 |
 * |------|------|--------|
 * | conjunction (合相) | 0°   | ±8° |
 * | opposition (对冲)  | 180° | ±8° |
 * | trine (三分)       | 120° | ±6° |
 * | square (四分)      | 90°  | ±6° |
 * | sextile (六分)     | 60°  | ±5° |
 */
export const ASPECTS: readonly AspectDef[] = [
  { type: "conjunction", angle: 0, maxOrb: 8 },
  { type: "opposition", angle: 180, maxOrb: 8 },
  { type: "trine", angle: 120, maxOrb: 6 },
  { type: "square", angle: 90, maxOrb: 6 },
  { type: "sextile", angle: 60, maxOrb: 5 },
] as const;

/* ------------------------------------------------------------------ */
/*  工具函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 计算两个角度之间的最小差值（0° ~ 180°）。
 *
 * 例：angleDiff(10, 350) === 20, angleDiff(0, 180) === 180
 */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * 计算相位强度。orb 为 0 时强度 1.0，达到 maxOrb 时强度 0.0。
 */
function calcStrength(orb: number, maxOrb: number): number {
  return Math.max(0, 1 - orb / maxOrb);
}

/* ------------------------------------------------------------------ */
/*  单对行星相位                                                      */
/* ------------------------------------------------------------------ */

/**
 * 计算两颗行星之间的相位。无相位时返回 `null`。
 */
export function calcAspect(
  lonA: number,
  lonB: number,
  planetA: Planet,
  planetB: Planet,
): Aspect | null {
  const angle = angleDiff(lonA, lonB);

  for (const def of ASPECTS) {
    const orb = Math.abs(angle - def.angle);
    if (orb <= def.maxOrb) {
      return {
        planetA,
        planetB,
        type: def.type,
        angle,
        orb,
        strength: calcStrength(orb, def.maxOrb),
      };
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  批量计算                                                         */
/* ------------------------------------------------------------------ */

/**
 * 计算一组行星位置中所有两两之间的相位。
 *
 * 仅返回存在相位的组合（即 orb 在容许度范围内）。
 */
export function calcAllAspects(positions: PlanetPosition[]): Aspect[] {
  const result: Aspect[] = [];

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i];
      const b = positions[j];
      const aspect = calcAspect(a.longitude, b.longitude, a.planet, b.planet);
      if (aspect) {
        result.push(aspect);
      }
    }
  }

  return result;
}

/**
 * 计算两组行星位置之间的所有相位（用于行运 / 组合盘等跨盘场景）。
 *
 * 同组内的配对不会被计算。
 */
export function calcAspectsBetween(
  positionsA: PlanetPosition[],
  positionsB: PlanetPosition[],
): Aspect[] {
  const result: Aspect[] = [];

  for (const a of positionsA) {
    for (const b of positionsB) {
      const aspect = calcAspect(a.longitude, b.longitude, a.planet, b.planet);
      if (aspect) {
        result.push(aspect);
      }
    }
  }

  return result;
}
