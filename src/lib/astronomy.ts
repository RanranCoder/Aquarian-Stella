import {
  MakeTime,
  EclipticGeoMoon,
  Horizon,
  Observer,
  MoonPhase,
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

/** 上升点黄经（东地平线交点），无法计算时返回 null */
export function ascendantEclipticLon(
  date: Date,
  lat: number,
  lon: number,
): number | null {
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
  return east ? east.lon : null;
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
