import type { Planet, PlanetPosition, Aspect } from "./types";
import { getAllPlanetPositions } from "./planets";
import { calcAspectsBetween } from "./aspects";

/* ------------------------------------------------------------------ */
/*  当前行星位置                                                        */
/* ------------------------------------------------------------------ */

/**
 * 计算指定日期的所有行星位置（不含上升点）。
 *
 * 行星经度每日变化约 0.2°~1°，因此不同日期会产生不同的相位组合。
 * 同一日期多次调用返回相同结果（确定性）。
 */
export function calcCurrentPositions(date: Date): PlanetPosition[] {
  return getAllPlanetPositions(date);
}

/* ------------------------------------------------------------------ */
/*  Transit 相位计算                                                    */
/* ------------------------------------------------------------------ */

/**
 * 重点关注的行运行星 -> 本命行星配对。
 *
 * 每条记录 [transitPlanet, natalPlanet] 代表一组高权重组合。
 * 未在此列表中的配对不会被 `getMajorTransits` 单独筛选，
 * 但仍会出现在 `calcTransitAspects` 的全量结果中。
 */
const PRIORITY_PAIRS: ReadonlyArray<[Planet, Planet]> = [
  // Transit Venus -> 本命情感行星
  ["venus", "moon"],
  ["venus", "venus"],
  ["venus", "mars"],
  // Transit Mars -> 本命情感行星
  ["mars", "venus"],
  ["mars", "moon"],
  // Transit Moon -> 本命情感行星
  ["moon", "moon"],
  ["moon", "venus"],
  // Transit 外行星 -> 本命日月
  ["jupiter", "sun"],
  ["jupiter", "moon"],
  ["saturn", "sun"],
  ["saturn", "moon"],
];

/**
 * 计算行运（transit）相位：当前行星位置与本命行星之间的所有相位。
 *
 * 使用 `calcAspectsBetween` 遍历两组位置，返回所有在容许度内的相位。
 * 结果中 `planetA` 为行运行星，`planetB` 为本命行星。
 *
 * @param natalPositions  本命星盘的行星位置
 * @param currentPositions  当前行星位置（由 `calcCurrentPositions` 获得）
 */
export function calcTransitAspects(
  natalPositions: PlanetPosition[],
  currentPositions: PlanetPosition[],
): Aspect[] {
  return calcAspectsBetween(currentPositions, natalPositions);
}

/* ------------------------------------------------------------------ */
/*  主要 Transit 筛选                                                   */
/* ------------------------------------------------------------------ */

/**
 * 主要相位类型的最大 orb（行运用，比本命盘更严格）。
 *
 * 行运相位的影响力随 orb 增大迅速衰减，因此容许度比 natal 更紧：
 * - conjunction / opposition: 6°
 * - trine / square: 4°
 * - sextile: 3°（六分相本身影响较轻，需更精确才算 major）
 */
const TRANSIT_MAX_ORB: Record<string, number> = {
  conjunction: 6,
  opposition: 6,
  trine: 4,
  square: 4,
  sextile: 3,
};

/**
 * 判断一个行运行星 -> 本命行星的配对是否在优先列表中。
 *
 * 双向检查：[transit, natal] 和 [natal, transit] 均视为匹配，
 * 因为 `calcAspectsBetween` 的 planetA/planetB 顺序取决于遍历顺序。
 */
function isPriorityPair(planetA: Planet, planetB: Planet): boolean {
  return PRIORITY_PAIRS.some(
    ([t, n]) =>
      (t === planetA && n === planetB) || (t === planetB && n === planetA),
  );
}

/**
 * 从全量 transit 相位中筛选出主要的、影响力大的相位。
 *
 * 筛选条件（全部满足）：
 * 1. orb 不超过该相位类型的严格上限（TRANSIT_MAX_ORB）
 * 2. 行运行星 -> 本命行星的配对在 PRIORITY_PAIRS 中
 *
 * 结果按 strength 降序排列（最强的排在最前面）。
 */
export function getMajorTransits(transitAspects: Aspect[]): Aspect[] {
  return transitAspects
    .filter((a) => {
      const maxOrb = TRANSIT_MAX_ORB[a.type];
      if (maxOrb === undefined || a.orb > maxOrb) return false;
      return isPriorityPair(a.planetA, a.planetB);
    })
    .sort((a, b) => b.strength - a.strength);
}
