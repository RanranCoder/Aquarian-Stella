import {
  Body,
  EclipticLongitude,
  EclipticGeoMoon,
  SunPosition,
  MakeTime,
} from "astronomy-engine";
import { ZODIACS } from "@/data/zodiacs";
import type { Planet, ZodiacSign, PlanetPosition } from "./types";

/** Planet -> astronomy-engine Body 映射（太阳、月亮和上升点需要特殊处理） */
type MappedPlanet = Exclude<Planet, "sun" | "moon" | "asc">;

const planetToBody: Record<MappedPlanet, Body> = {
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
};

/** 12 星座 slug -> ZodiacSign 类型映射，由 ZODIACS 数组顺序保证 */
const SIGN_ORDER: ZodiacSign[] = ZODIACS.map((z) => z.slug as ZodiacSign);

/**
 * 计算指定行星在给定日期的黄道经度（0-360°）。
 *
 * - 太阳：使用 SunPosition(time).elon
 * - 月亮：使用 EclipticGeoMoon(time).lon
 * - 其他行星：使用 EclipticLongitude(body, time)
 */
export function getPlanetLongitude(planet: Planet, date: Date): number {
  const time = MakeTime(date);

  if (planet === "sun") {
    return SunPosition(time).elon;
  }

  if (planet === "moon") {
    return EclipticGeoMoon(time).lon;
  }

  // ASC 不是真实天体，由 natal-chart.ts 单独计算
  if (planet === "asc") {
    throw new Error("ASC position is computed separately, not via getPlanetLongitude");
  }

  const body = planetToBody[planet];
  return EclipticLongitude(body, time);
}

/**
 * 黄道经度 -> 星座 + 星座内度数。
 *
 * 复用 src/data/zodiacs.ts 中的星座数据，每 30° 对应一个星座。
 */
export function longitudeToSign(longitude: number): {
  sign: ZodiacSign;
  degree: number;
} {
  const n = ((longitude % 360) + 360) % 360;
  const index = Math.floor(n / 30);
  return {
    sign: SIGN_ORDER[index],
    degree: n - index * 30,
  };
}

/**
 * 获取单颗行星的完整位置信息（经度、星座、星座内度数）。
 */
export function getPlanetPosition(
  planet: Planet,
  date: Date,
): PlanetPosition {
  const longitude = getPlanetLongitude(planet, date);
  const { sign, degree } = longitudeToSign(longitude);
  return { planet, longitude, sign, degree };
}

/**
 * 获取全部 10 颗行星的位置信息。
 */
export function getAllPlanetPositions(date: Date): PlanetPosition[] {
  const planets: Planet[] = [
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
  ];
  return planets.map((planet) => getPlanetPosition(planet, date));
}
