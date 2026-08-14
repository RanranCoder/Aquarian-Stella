/**
 * 内容准确性与可信度体系
 *
 * 核心原则：事实由计算引擎产生，解释由规则库约束，语言由 AI 生成。
 * - 计算层（S/A）只允许来自星历与规则库，绝不因文案需要而改动。
 * - 解释层（B/C）由规则库约束措辞，禁止宿命论、恐慌与伪科学。
 */

export type ContentTier = "S" | "A" | "B" | "C";

export const TIER_LABEL: Record<ContentTier, string> = {
  S: "天文计算数据",
  A: "占星规则",
  B: "个性化解释",
  C: "情绪陪伴",
};

/** 数据来源标注 */
export const DATA_SOURCES = {
  ephemeris: "astronomy-engine（基于 JPL DE441 星历模型）",
  timezone: "标准时区偏移（cities.ts）",
  geography: "城市经纬度库（cities.ts）",
  rules: "占星规则库（zodiacs.ts / daily.ts）",
  copy: "人工文案模板（daily.ts）",
} as const;

/** 各数据模块的内容分层与来源 */
export const PROVENANCE: {
  module: string;
  tier: ContentTier;
  source: string;
  note: string;
}[] = [
  {
    module: "lib/astronomy.ts → getSunSign",
    tier: "S",
    source: DATA_SOURCES.rules,
    note: "太阳星座：公历区间映射",
  },
  {
    module: "lib/astronomy.ts → getMoonSign",
    tier: "S",
    source: DATA_SOURCES.ephemeris,
    note: "月亮星座：月亮地心黄经 → 星座",
  },
  {
    module: "lib/astronomy.ts → getRisingSign",
    tier: "S",
    source: `${DATA_SOURCES.ephemeris} + ${DATA_SOURCES.timezone} + ${DATA_SOURCES.geography}`,
    note: "上升星座：本地恒星时 + 经纬度 + 黄道东地平线交点",
  },
  {
    module: "data/zodiacs.ts",
    tier: "A",
    source: DATA_SOURCES.rules,
    note: "十二星座性格/爱情/事业/关键词规则",
  },
  {
    module: "lib/daily.ts → 主题/维度",
    tier: "B",
    source: DATA_SOURCES.rules,
    note: "今日星语主题与维度（由主题库约束）",
  },
  {
    module: "lib/daily.ts → 文案",
    tier: "C",
    source: DATA_SOURCES.copy,
    note: "情绪陪伴文案，无确定性断言",
  },
];

/** AI 生成硬性限制（星语室 / 后续 AI 内容接入时强制执行） */
export const AI_RESTRICTIONS = [
  "禁止修改计算结果",
  "禁止自行推算行星位置",
  "禁止生成确定性预言",
  "禁止制造恐慌",
  "禁止伪装成科学结论",
] as const;

/** 违反规则的文案模式 → 对应限制（词序精确，避免被"不必定义"这类常见子串误伤） */
const RESTRICTION_PATTERNS: { restriction: string; pattern: RegExp }[] = [
  { restriction: "禁止生成确定性预言", pattern: /一定会|注定会|命中注定|绝对会|逃不过|大劫难|必然会是/ },
  { restriction: "禁止制造恐慌", pattern: /灾难|大祸临头|厄运将至|血光之灾|灾祸临门|不祥之兆/ },
  { restriction: "禁止伪装成科学结论", pattern: /医学证明|科学研究表明|科学家证实|临床数据|权威证实/ },
];

/**
 * 校验生成文案是否违反 AI 限制。
 * 返回被违反的限制列表；空数组 = 合规。用于 AI 输出规则检测与规则库自查。
 */
export function checkGeneratedText(text: string): string[] {
  if (!text) return [];
  return RESTRICTION_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
    ({ restriction }) => restriction,
  );
}
