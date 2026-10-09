import { describe, it, expect } from "vitest";
import { SearchRiseSet, SunPosition, Body, Observer } from "astronomy-engine";
import {
  getSunSign,
  getSunSignFromDate,
  getMoonSign,
  getRisingSign,
  type BirthProfile,
} from "@/lib/astrology";
import { ascendantEclipticLon, moonEclipticLon } from "@/lib/astronomy";
import { THEME_CONTENT, getDailyHoroscope } from "@/lib/daily";
import { ZODIACS } from "@/data/zodiacs";
import { checkGeneratedText } from "@/lib/trust";

describe("太阳星座区间（S 层规则）", () => {
  const cases: [number, number, string][] = [
    [3, 20, "pisces"],
    [3, 21, "aries"],
    [4, 19, "aries"],
    [4, 20, "taurus"],
    [7, 22, "cancer"],
    [7, 23, "leo"],
    [8, 22, "leo"],
    [8, 23, "virgo"],
    [9, 22, "virgo"],
    [9, 23, "libra"],
    [12, 21, "sagittarius"],
    [12, 22, "capricorn"],
    [1, 19, "capricorn"],
    [1, 20, "aquarius"],
    [2, 18, "aquarius"],
    [2, 19, "pisces"],
  ];
  it.each(cases)("%i/%i → %s", (m, d, slug) => {
    expect(getSunSign(m, d).slug).toBe(slug);
  });
});

describe("上升星座：日出时刻应落在太阳位置附近（多源交叉验证）", () => {
  const observers = [
    { lat: 23.13, lon: 113.26 },
    { lat: 39.9, lon: 116.41 },
    { lat: 34.05, lon: -118.24 },
  ];
  const dates = [
    new Date(Date.UTC(2026, 0, 15)),
    new Date(Date.UTC(2026, 3, 30)),
    new Date(Date.UTC(2026, 7, 14)),
    new Date(Date.UTC(2026, 10, 2)),
  ];
  it.each(observers.flatMap((o) => dates.map((d) => ({ ...o, date: d }))))(
    "lat=%lat lon=%lon date=%date",
    ({ lat, lon, date }) => {
      const rise = SearchRiseSet(Body.Sun, new Observer(lat, lon, 0), 1, date, 2);
      expect(rise).toBeTruthy();
      const asc = ascendantEclipticLon(rise!.date, lat, lon);
      expect(asc).not.toBeNull();
      const sun = SunPosition(rise!).elon;
      const diff = Math.abs((((asc! - sun + 540) % 360) + 360) % 360 - 180);
      expect(diff).toBeLessThan(2);
    },
  );
});

describe("月亮黄经与星座（S 层计算）", () => {
  it("黄经在 [0,360)", () => {
    for (const iso of ["2004-08-11", "1998-05-21", "2026-08-14"]) {
      const [y, m, d] = iso.split("-").map(Number);
      const lon = moonEclipticLon(new Date(Date.UTC(y, m - 1, d, 12)));
      expect(lon).toBeGreaterThanOrEqual(0);
      expect(lon).toBeLessThan(360);
    }
  });

  it("月亮星座与太阳星座不同（测试档案）", () => {
    const profile: BirthProfile = {
      nickname: "t",
      birthDate: "2004-08-11",
      birthTime: "09:30",
      birthTimeAccuracy: "exact",
      birthCity: "广州",
      interests: [],
    };
    expect(getMoonSign(profile).slug).not.toBe(getSunSignFromProfile(profile).slug);
    expect(getRisingSign(profile)?.slug).not.toBe(getSunSignFromProfile(profile).slug);
  });
});

function getSunSignFromProfile(p: BirthProfile) {
  const [, m, d] = p.birthDate.split("-").map(Number);
  return getSunSign(m, d);
}

describe("内容合规：今日星语全部主题 + 十二星座文案通过 AI 限制检测", () => {
  it("全部 THEMES 文案无宿命论/恐慌/伪科学", () => {
    const texts = THEME_CONTENT.flatMap((t) => [
      t.core,
      t.expand,
      t.actions.yes,
      t.actions.no,
      t.question,
    ]);
    for (const text of texts) {
      const violations = checkGeneratedText(text);
      expect(violations, `违例文案: ${text}`).toEqual([]);
    }
  });

  it("十二星座性格/爱情/事业/座右铭合规", () => {
    for (const z of ZODIACS) {
      for (const text of [z.personality, z.love, z.career, z.motto, z.todayHint]) {
        const violations = checkGeneratedText(text);
        expect(violations, `违例文案(${z.name}): ${text}`).toEqual([]);
      }
    }
  });

  it("真实生成的多日星语合规", () => {
    for (const sign of ZODIACS) {
      for (let d = 1; d <= 15; d++) {
        const date = `2026-01-${String(d).padStart(2, "0")}`;
        const h = getDailyHoroscope(sign, date);
        const texts = [
          h.theme.core,
          h.theme.expand,
          h.theme.actions.yes,
          h.theme.actions.no,
          h.theme.question,
        ];
        for (const text of texts) {
          expect(checkGeneratedText(text), `违例: ${text}`).toEqual([]);
        }
      }
    }
  });
});

describe("太阳星座跨年边界守护", () => {
  it("12/21 → 射手座", () => {
    expect(getSunSign(12, 21).slug).toBe("sagittarius");
  });
  it("12/22 → 摩羯座", () => {
    expect(getSunSign(12, 22).slug).toBe("capricorn");
  });
  it("1/19 → 摩羯座", () => {
    expect(getSunSign(1, 19).slug).toBe("capricorn");
  });
  it("1/20 → 水瓶座", () => {
    expect(getSunSign(1, 20).slug).toBe("aquarius");
  });
  it("2/18 → 水瓶座", () => {
    expect(getSunSign(2, 18).slug).toBe("aquarius");
  });
  it("2/19 → 双鱼座", () => {
    expect(getSunSign(2, 19).slug).toBe("pisces");
  });
});

describe("getSunSignFromDate（日期字符串接口）", () => {
  it("跨年：2025-12-22 → 摩羯座", () => {
    expect(getSunSignFromDate("2025-12-22").slug).toBe("capricorn");
  });
  it("跨年：2026-01-19 → 摩羯座", () => {
    expect(getSunSignFromDate("2026-01-19").slug).toBe("capricorn");
  });
  it("跨年：2026-01-20 → 水瓶座", () => {
    expect(getSunSignFromDate("2026-01-20").slug).toBe("aquarius");
  });
  it("年中：2026-07-22 → 巨蟹座", () => {
    expect(getSunSignFromDate("2026-07-22").slug).toBe("cancer");
  });
  it("年中：2026-07-23 → 狮子座", () => {
    expect(getSunSignFromDate("2026-07-23").slug).toBe("leo");
  });
});
