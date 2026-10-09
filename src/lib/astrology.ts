import { ZODIACS, type Zodiac } from "@/data/zodiacs";
import {
  moonEclipticLon,
  ascendantEclipticLon,
  signFromLon,
} from "@/lib/astronomy";
import { findCity } from "@/data/cities";

export type BirthProfile = {
  nickname: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:mm
  birthTimeAccuracy?: "exact" | "approximate" | "unknown";
  birthCity?: string;
  interests: string[];
};

/** 用本地出生时间 + 时区构造 UTC 时刻（时间未知时取正午） */
export function birthMoment(profile: BirthProfile, tz: number): Date {
  const [y, m, d] = profile.birthDate.split("-").map(Number);
  const [h, min] = (profile.birthTime ?? "12:00").split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - tz, min));
}

/** 按公历月日计算太阳星座（真实的星座区间规则，含跨年边界） */
function dayOfYear(month: number, day: number): number {
  const base = new Date(2001, 0, 1).getTime();
  return Math.round(
    (new Date(2001, month - 1, day).getTime() - base) / 86400000,
  );
}

export function getSunSign(month: number, day: number): Zodiac {
  const input = dayOfYear(month, day);
  for (let i = 0; i < ZODIACS.length; i++) {
    const cur = ZODIACS[i];
    const next = ZODIACS[(i + 1) % ZODIACS.length];
    const start = dayOfYear(cur.dates.month, cur.dates.day);
    const end = dayOfYear(next.dates.month, next.dates.day);
    if (start < end) {
      if (input >= start && input < end) return cur;
    } else {
      // 跨年区间（摩羯 12/22 → 水瓶 1/20）
      if (input >= start || input < end) return cur;
    }
  }
  return ZODIACS[0];
}

export function getSunSignFromDate(dateStr: string): Zodiac {
  const [, m, d] = dateStr.split("-").map(Number);
  return getSunSign(m, d);
}

/** 月亮星座：真实天文计算（月亮地心黄经）。城市已知时用时区，否则按 UTC+8。 */
export function getMoonSign(profile: BirthProfile): Zodiac {
  const city = findCity(profile.birthCity);
  const tz = city?.tz ?? 8;
  return signFromLon(moonEclipticLon(birthMoment(profile, tz)));
}

/**
 * 上升星座：真实天文计算（黄道东地平线交点）。
 * 需要精确/大概的出生时间 + 已知出生地；否则返回 null，由前端标记「准确度有限」。
 */
export function getRisingSign(profile: BirthProfile): Zodiac | null {
  if (!profile.birthTime || profile.birthTimeAccuracy === "unknown") {
    return null;
  }
  const city = findCity(profile.birthCity);
  if (!city) return null;
  const lon = ascendantEclipticLon(
    birthMoment(profile, city.tz),
    city.lat,
    city.lon,
  );
  return lon === null ? null : signFromLon(lon);
}
