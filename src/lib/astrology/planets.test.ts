import { describe, it, expect } from "vitest";
import {
  getPlanetLongitude,
  longitudeToSign,
  getPlanetPosition,
  getAllPlanetPositions,
} from "./planets";

/* ------------------------------------------------------------------ */
/*  辅助函数                                                          */
/* ------------------------------------------------------------------ */

/** 精度容差：天文计算允许 ±0.01° 浮点漂移 */
const EPSILON = 0.01;

function closeTo(actual: number, expected: number, eps = EPSILON) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(eps);
}

/* ------------------------------------------------------------------ */
/*  longitudeToSign — 星座 + 度数映射                                 */
/* ------------------------------------------------------------------ */

describe("longitudeToSign", () => {
  /* ── 边界：29°59', 30°00' ── */

  it("29.98°（≈29°59'）仍在白羊座，度数 ≈ 29.98", () => {
    const { sign, degree } = longitudeToSign(29.98);
    expect(sign).toBe("aries");
    closeTo(degree, 29.98);
  });

  it("30.00° 刚好进入金牛座，度数 0", () => {
    const { sign, degree } = longitudeToSign(30);
    expect(sign).toBe("taurus");
    closeTo(degree, 0);
  });

  /* ── 边界：59°59', 60°00' ── */

  it("59.98°（≈59°59'）仍在金牛座，度数 ≈ 29.98", () => {
    const { sign, degree } = longitudeToSign(59.98);
    expect(sign).toBe("taurus");
    closeTo(degree, 29.98);
  });

  it("60.00° 刚好进入双子座，度数 0", () => {
    const { sign, degree } = longitudeToSign(60);
    expect(sign).toBe("gemini");
    closeTo(degree, 0);
  });

  /* ── 其他星座边界 ── */

  it("90° → 巨蟹座", () => {
    const { sign } = longitudeToSign(90);
    expect(sign).toBe("cancer");
  });

  it("180° → 天秤座", () => {
    const { sign } = longitudeToSign(180);
    expect(sign).toBe("libra");
  });

  it("270° → 摩羯座", () => {
    const { sign } = longitudeToSign(270);
    expect(sign).toBe("capricorn");
  });

  it("359.99° → 双鱼座末尾", () => {
    const { sign, degree } = longitudeToSign(359.99);
    expect(sign).toBe("pisces");
    closeTo(degree, 29.99);
  });

  /* ── 负度数与超 360° 归一化 ── */

  it("-1° 归一化到 359°，仍在双鱼座", () => {
    const { sign } = longitudeToSign(-1);
    expect(sign).toBe("pisces");
  });

  it("360° 等价于 0°，白羊座", () => {
    const { sign, degree } = longitudeToSign(360);
    expect(sign).toBe("aries");
    closeTo(degree, 0);
  });

  it("390° 等价于 30°，金牛座", () => {
    const { sign } = longitudeToSign(390);
    expect(sign).toBe("taurus");
  });
});

/* ------------------------------------------------------------------ */
/*  getPlanetLongitude — 已知日期的经度验证                            */
/* ------------------------------------------------------------------ */

describe("getPlanetLongitude", () => {
  /* ── 基本调用 ── */

  it("太阳经度在 0-360 范围内", () => {
    const lon = getPlanetLongitude("sun", new Date("2026-06-21T12:00:00Z"));
    expect(lon).toBeGreaterThanOrEqual(0);
    expect(lon).toBeLessThan(360);
  });

  it("月亮经度在 0-360 范围内", () => {
    const lon = getPlanetLongitude("moon", new Date("2026-06-21T12:00:00Z"));
    expect(lon).toBeGreaterThanOrEqual(0);
    expect(lon).toBeLessThan(360);
  });

  it("水星经度在 0-360 范围内", () => {
    const lon = getPlanetLongitude("mercury", new Date("2026-06-21T12:00:00Z"));
    expect(lon).toBeGreaterThanOrEqual(0);
    expect(lon).toBeLessThan(360);
  });

  /* ── 2026 夏至：太阳约在 90°（巨蟹座 0° 附近） ── */

  it("2026-06-21 太阳经度 ≈ 90°（巨蟹座起点附近）", () => {
    const lon = getPlanetLongitude("sun", new Date("2026-06-21T18:00:00Z"));
    // 夏至点约 90°，允许 ±2° 误差
    closeTo(lon, 90, 2);
    const { sign } = longitudeToSign(lon);
    expect(sign).toBe("cancer");
  });

  /* ── 2026 春分：太阳约在 0°（白羊座 0°） ── */

  it("2026-03-21 太阳经度 ≈ 0°（白羊座起点附近）", () => {
    const lon = getPlanetLongitude("sun", new Date("2026-03-21T12:00:00Z"));
    // 春分后一天太阳已在白羊座区间
    closeTo(lon, 1, 2);
    const { sign } = longitudeToSign(lon);
    expect(sign).toBe("aries");
  });

  /* ── 跨年日期 ── */

  it("跨年：2025-12-31 和 2026-01-01 太阳都在摩羯座附近", () => {
    const lon2025 = getPlanetLongitude("sun", new Date("2025-12-31T12:00:00Z"));
    const lon2026 = getPlanetLongitude("sun", new Date("2026-01-01T12:00:00Z"));

    // 两天之间太阳仅移动约 1°
    expect(longitudeToSign(lon2025).sign).toBe("capricorn");
    expect(longitudeToSign(lon2026).sign).toBe("capricorn");
    closeTo(lon2026 - lon2025, 1, 0.5);
  });

  it("跨年：2026-12-31 和 2027-01-01 太阳都在摩羯座附近", () => {
    const lon2026 = getPlanetLongitude("sun", new Date("2026-12-31T12:00:00Z"));
    const lon2027 = getPlanetLongitude("sun", new Date("2027-01-01T12:00:00Z"));

    expect(longitudeToSign(lon2026).sign).toBe("capricorn");
    expect(longitudeToSign(lon2027).sign).toBe("capricorn");
  });

  /* ── ASC 应抛出错误 ── */

  it("getPlanetLongitude('asc') 应抛出错误", () => {
    expect(() =>
      getPlanetLongitude("asc", new Date("2026-01-01T00:00:00Z")),
    ).toThrow("ASC position is computed separately");
  });
});

/* ------------------------------------------------------------------ */
/*  getPlanetPosition                                                  */
/* ------------------------------------------------------------------ */

describe("getPlanetPosition", () => {
  it("返回完整的 PlanetPosition 结构", () => {
    const pos = getPlanetPosition("sun", new Date("2026-06-21T12:00:00Z"));
    expect(pos.planet).toBe("sun");
    expect(typeof pos.longitude).toBe("number");
    expect(pos.longitude).toBeGreaterThanOrEqual(0);
    expect(pos.longitude).toBeLessThan(360);
    expect(typeof pos.sign).toBe("string");
    expect(pos.degree).toBeGreaterThanOrEqual(0);
    expect(pos.degree).toBeLessThan(30);
  });

  it("经度与 sign/degree 一致性", () => {
    const pos = getPlanetPosition("venus", new Date("2026-08-15T12:00:00Z"));
    const expected = longitudeToSign(pos.longitude);
    expect(pos.sign).toBe(expected.sign);
    closeTo(pos.degree, expected.degree);
  });
});

/* ------------------------------------------------------------------ */
/*  getAllPlanetPositions                                               */
/* ------------------------------------------------------------------ */

describe("getAllPlanetPositions", () => {
  it("返回 10 颗行星（不含 asc）", () => {
    const positions = getAllPlanetPositions(new Date("2026-08-15T12:00:00Z"));
    expect(positions).toHaveLength(10);
    const planetNames = positions.map((p) => p.planet);
    expect(planetNames).not.toContain("asc");
  });

  it("每颗行星都有合法的经度", () => {
    const positions = getAllPlanetPositions(new Date("2026-08-15T12:00:00Z"));
    for (const pos of positions) {
      expect(pos.longitude).toBeGreaterThanOrEqual(0);
      expect(pos.longitude).toBeLessThan(360);
      expect(pos.degree).toBeGreaterThanOrEqual(0);
      expect(pos.degree).toBeLessThan(30);
    }
  });

  it("同一天多次调用返回相同结果（确定性）", () => {
    const d = new Date("2026-08-15T12:00:00Z");
    const a = getAllPlanetPositions(d);
    const b = getAllPlanetPositions(d);
    expect(a).toEqual(b);
  });
});
