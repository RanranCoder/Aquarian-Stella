/** 十大行星 + 上升点 */
export type Planet =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "asc";

/** 十二星座 */
export type ZodiacSign =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

/** 行星在星盘中的位置 */
export interface PlanetPosition {
  planet: Planet;
  /** 黄道经度 0-360 */
  longitude: number;
  /** 所在星座 */
  sign: ZodiacSign;
  /** 星座内度数 0-30 */
  degree: number;
}

/** 相位类型 */
export type AspectType =
  | "conjunction"  // 合相 0°
  | "opposition"   // 对冲 180°
  | "trine"        // 三分 120°
  | "square"       // 四分 90°
  | "sextile";     // 六分 60°

/** 两颗行星之间的相位 */
export interface Aspect {
  planetA: Planet;
  planetB: Planet;
  type: AspectType;
  /** 实际角度 */
  angle: number;
  /** 容许度偏差 */
  orb: number;
  /** 相位强度 0-1 */
  strength: number;
}

/** 单项评分因子 */
export interface ScoreFactor {
  type: "positive" | "negative";
  source: string;
  weight: number;
  category: string;
}

/** 综合评分结果 */
export interface ScoreResult {
  /** 综合分 0-100 */
  score: number;
  level: "low" | "normal" | "high";
  factors: ScoreFactor[];
}

/** 本命星盘 */
export interface NatalChart {
  positions: PlanetPosition[];
  aspects: Aspect[];
  /** 上升星座位置（需要精确出生时间 + 出生城市，否则为 null） */
  risingSign: PlanetPosition | null;
  birthDate: string;
  birthTime: string;
  birthCity: string;
}

/** 每日星象状态 */
export interface DailyAstrologyState {
  date: string;
  natalChart: NatalChart;
  currentPositions: PlanetPosition[];
  transitAspects: Aspect[];
  scores: Record<string, ScoreResult>;
  keywords: string[];
  dominantTheme: string;
  moonPhase: string;
}
