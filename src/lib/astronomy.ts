import {
  MakeTime,
  EclipticGeoMoon,
  Horizon,
  Observer,
  MoonPhase,
  GeoVector,
  Ecliptic,
  SunPosition,
  Body,
} from "astronomy-engine";
import { ZODIACS, type Zodiac } from "@/data/zodiacs";

const D2R = Math.PI / 180;

/** Laskar 1986 平均黄赤交角（角秒 → 度） */
function obliquityDeg(d: Date): number {
  const T = (d.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000 / 36525;
  const arcsec =
    84381.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T;
  return arcsec / 3600;
}

/** 黄道经度 → 赤道 → 地平坐标（astronomy-engine 的 SiderealTime + 大气折射） */
function eclipticAltAz(date: Date, observer: Observer, lonDeg: number) {
  const e = obliquityDeg(date) * D2R;
  const lon = lonDeg * D2R;
  const dec = Math.asin(Math.sin(e) * Math.sin(lon));
  const ra = Math.atan2(Math.cos(e) * Math.sin(lon), Math.cos(lon));
  const raH = (((ra * 12) / Math.PI) % 24 + 24) % 24; // 时角坐标 0-24h
  const h = Horizon(date, observer, raH, dec / D2R, "normal");
  return { alt: h.altitude, az: h.azimuth };
}

/** 月亮地心黄经（度） */
export function moonEclipticLon(date: Date): number {
  return EclipticGeoMoon(MakeTime(date)).lon;
}


/** 上升星座计算缓存（按分钟粒度，同一分钟内变化 < 0.004 度） */
const _ascendantCache = new Map<string, number | null>();
/** 上升点黄经（东地平线交点），无法计算时返回 null */
export function ascendantEclipticLon(
  date: Date,
  lat: number,
  lon: number,
): number | null {
  const _key = `${Math.floor(date.getTime() / 60000)}:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  if (_ascendantCache.has(_key)) return _ascendantCache.get(_key)!;

  const observer = new Observer(lat, lon, 0);
  let prev = eclipticAltAz(date, observer, 0);
  const crossings: { lon: number; az: number }[] = [];
  for (let i = 1; i <= 360; i++) {
    const cur = eclipticAltAz(date, observer, i % 360);
    if (prev.alt < 0 !== cur.alt < 0) {
      let lo = i - 1;
      let hi = i;
      let loA = eclipticAltAz(date, observer, lo);
      let hiA = cur;
      for (let k = 0; k < 16; k++) {
        const mid = (lo + hi) / 2;
        const m = eclipticAltAz(date, observer, mid);
        if (m.alt < 0) {
          lo = mid;
          loA = m;
        } else {
          hi = mid;
          hiA = m;
        }
      }
      crossings.push({ lon: (lo + hi) / 2, az: (loA.az + hiA.az) / 2 });
    }
    prev = cur;
  }
  const east = crossings.find((c) => c.az > 0 && c.az < 180);
  const result = east ? east.lon : null;
  _ascendantCache.set(_key, result);
  return result;
}

/** 黄经（度）→ 星座 */
export function signFromLon(lonDeg: number): Zodiac {
  const n = ((lonDeg % 360) + 360) % 360;
  return ZODIACS[Math.floor(n / 30)];
}

export type MoonPhaseInfo = { angle: number; label: string };

/** 月相（天文计算）：phase 角 0=新月 90=上弦 180=满月 270=下弦 */
export function getMoonPhase(date: Date): MoonPhaseInfo {
  const n = ((MoonPhase(date) % 360) + 360) % 360;
  let label: string;
  if (n < 22.5 || n >= 337.5) label = "新月";
  else if (n < 67.5) label = "蛾眉月";
  else if (n < 112.5) label = "上弦月";
  else if (n < 157.5) label = "盈凸月";
  else if (n < 202.5) label = "满月";
  else if (n < 247.5) label = "亏凸月";
  else if (n < 292.5) label = "下弦月";
  else label = "残月";
  return { angle: Math.round(n), label };
}

/* ── 行星黄经计算 ── */

/** 行星 key → astronomy-engine Body 映射 */
const PLANET_BODY: Record<string, Body> = {
  Sun: Body.Sun,
  Moon: Body.Moon,
  Mercury: Body.Mercury,
  Venus: Body.Venus,
  Mars: Body.Mars,
  Jupiter: Body.Jupiter,
  Saturn: Body.Saturn,
  Uranus: Body.Uranus,
  Neptune: Body.Neptune,
  Pluto: Body.Pluto,
};

/** 行星中文名 */
export const PLANET_NAMES: Record<string, string> = {
  Sun: "太阳",
  Moon: "月亮",
  Mercury: "水星",
  Venus: "金星",
  Mars: "火星",
  Jupiter: "木星",
  Saturn: "土星",
  Uranus: "天王星",
  Neptune: "海王星",
  Pluto: "冥王星",
};

/** 行星符号 */
export const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
};

export type PlanetPosition = {
  key: string;
  lon: number;
  sign: Zodiac;
  degree: number; // 星座内度数（0-29）
};

/** 计算单颗行星的地心黄经（度） */
function planetEclipticLon(body: Body, date: Date): number {
  if (body === Body.Sun) {
    return SunPosition(MakeTime(date)).elon;
  }
  if (body === Body.Moon) {
    return EclipticGeoMoon(MakeTime(date)).lon;
  }
  const vec = GeoVector(body, MakeTime(date), true);
  const ecl = Ecliptic(vec);
  return ecl.elon;
}

/** 计算全部 10 大行星的位置 */
export function getAllPlanetPositions(date: Date): PlanetPosition[] {
  return Object.entries(PLANET_BODY).map(([key, body]) => {
    const lon = planetEclipticLon(body, date);
    const n = ((lon % 360) + 360) % 360;
    const sign = ZODIACS[Math.floor(n / 30)];
    return { key, lon: n, sign, degree: Math.floor(n % 30) };
  });
}

/* ── 相位计算 ── */

export type AspectType = {
  name: string;
  nameCn: string;
  symbol: string;
  angle: number;
  orb: number; // 允许误差
};

export const ASPECT_TYPES: AspectType[] = [
  { name: "conjunction", nameCn: "合相", symbol: "☌", angle: 0, orb: 8 },
  { name: "sextile", nameCn: "六分", symbol: "⚹", angle: 60, orb: 6 },
  { name: "square", nameCn: "四分", symbol: "□", angle: 90, orb: 7 },
  { name: "trine", nameCn: "三分", symbol: "△", angle: 120, orb: 8 },
  { name: "opposition", nameCn: "对冲", symbol: "☍", angle: 180, orb: 8 },
];

export type Aspect = {
  body1: string;
  body2: string;
  type: AspectType;
  exactAngle: number;
};

/** 计算两个黄经之间的最短角度差 */
function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** 检测所有行星之间的主要相位 */
export function findAspects(positions: PlanetPosition[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const diff = angleDiff(positions[i].lon, positions[j].lon);
      for (const type of ASPECT_TYPES) {
        if (Math.abs(diff - type.angle) <= type.orb) {
          aspects.push({
            body1: positions[i].key,
            body2: positions[j].key,
            type,
            exactAngle: Math.round(diff * 10) / 10,
          });
          break; // 每对行星只取最近的一个相位
        }
      }
    }
  }
  return aspects;
}
