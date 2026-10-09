import type { BirthProfile } from "@/lib/astrology";
import { birthMoment } from "@/lib/astrology";
import { findCity } from "@/data/cities";
import { getAllPlanetPositions } from "./planets";
import { calcAllAspects } from "./aspects";
import { ascendantEclipticLon } from "@/lib/astronomy";
import { longitudeToSign } from "./planets";
import type { NatalChart, PlanetPosition } from "./types";

/**
 * 计算本命星盘。
 *
 * 根据出生日期、时间（可选）和出生城市（可选），
 * 计算出生时刻十大行星的黄道位置、行星间相位，以及上升星座。
 *
 * - 出生时间未知时使用 12:00（正午）代替
 * - 出生城市未知时上升星座返回 null
 * - 出生城市未知时时区默认 UTC+8
 */
export function calcNatalChart(profile: BirthProfile): NatalChart {
  const city = findCity(profile.birthCity);
  const tz = city?.tz ?? 8;

  const moment = birthMoment(profile, tz);
  const positions = getAllPlanetPositions(moment);
  const aspects = calcAllAspects(positions);
  const risingSign = calcRisingSign(profile, moment, city);

  return {
    positions,
    aspects,
    risingSign,
    birthDate: profile.birthDate,
    birthTime: profile.birthTime ?? "12:00",
    birthCity: profile.birthCity ?? "未知",
  };
}

/** 计算上升星座位置（需要精确出生时间 + 已知出生城市） */
function calcRisingSign(
  profile: BirthProfile,
  moment: Date,
  city: ReturnType<typeof findCity>,
): PlanetPosition | null {
  if (!profile.birthTime || profile.birthTimeAccuracy === "unknown") {
    return null;
  }
  if (!city) {
    return null;
  }

  const lon = ascendantEclipticLon(moment, city.lat, city.lon);
  if (lon === null) {
    return null;
  }

  const { sign, degree } = longitudeToSign(lon);
  return {
    planet: "asc",
    longitude: lon,
    sign,
    degree,
  };
}
