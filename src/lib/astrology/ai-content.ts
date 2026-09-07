// src/lib/astrology/ai-content.ts
import type { D1Database } from "@cloudflare/workers-types";
import type { BirthProfile } from "@/lib/astrology";
import type { DailyAstrologyState, NatalChart, Aspect, ScoreResult } from "./types";
import { getDailyAstrologyState } from "./daily-state";
import { calcNatalChart } from "./natal-chart";
import { calcAspectsBetween } from "./aspects";
import { checkGeneratedText } from "@/lib/trust";
import { getCachedContent, setCachedContent } from "./ai-cache";
import { ZODIACS } from "@/data/zodiacs";

/* ================================================================== */
/*  环境变量类型                                                        */
/* ================================================================== */

export interface LLMEnv {
  LLM_BASE_URL: string;
  LLM_API_KEY: string;
  LLM_MODEL: string;
}

/* ================================================================== */
/*  System Prompt                                                       */
/* ================================================================== */

export const SYSTEM_PROMPT = `你是 Stella 星语星愿的星象写作助手。
你收到的所有天文数据（行星位置、相位、评分）均已由专业天引擎精确计算，你无需也不允许自行推算或修改。
你的任务：基于这些计算结果，写出温暖、有洞见的文案。
约束：
- 禁止确定性预言（"一定会"、"注定"）
- 禁止制造恐慌（"灾难"、"大祸"）
- 禁止伪科学表述（"科学证明"、"医学证实"）
- 语气：温暖、平等、陪伴感，不居高临下
- 禁止提及任何系统机制（你不知道有"评分引擎"、"规则表"这类东西）
- 输出严格 JSON，不要包含 markdown 代码块标记`;

/* ================================================================== */
/*  星座中文映射                                                        */
/* ================================================================== */

const SIGN_CN: Record<string, string> = Object.fromEntries(
  ZODIACS.map((z) => [z.slug, z.name]),
);

const PLANET_CN: Record<string, string> = {
  sun: "太阳", moon: "月亮", mercury: "水星", venus: "金星",
  mars: "火星", jupiter: "木星", saturn: "土星",
  uranus: "天王星", neptune: "海王星", pluto: "冥王星", asc: "上升",
};

const ASPECT_CN: Record<string, string> = {
  conjunction: "合相", trine: "三分", square: "四分",
  opposition: "对冲", sextile: "六分",
};

/* ================================================================== */
/*  LLM 调用                                                           */
/* ================================================================== */

const TIMEOUT_MS = 10_000;

async function callLLM(env: LLMEnv, userPrompt: string): Promise<string | null> {
  try {
    const res = await fetch(`${env.LLM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/* ================================================================== */
/*  JSON 后处理与校验                                                   */
/* ================================================================== */

export function parseAndValidate(
  raw: string | null,
  requiredFields: string[],
): Record<string, unknown> | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  for (const field of requiredFields) {
    if (parsed[field] === undefined || parsed[field] === null) return null;
  }
  const allText = Object.values(parsed)
    .filter((v): v is string => typeof v === "string")
    .join(" ");
  if (checkGeneratedText(allText).length > 0) return null;
  for (const val of Object.values(parsed)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string" && checkGeneratedText(item).length > 0) return null;
      }
    }
  }
  return parsed;
}

/* ================================================================== */
/*  Prompt 模板：今日星语                                               */
/* ================================================================== */

export function assembleTodayPrompt(
  state: DailyAstrologyState,
  sunSlug: string,
  dateStr: string,
): string {
  const sunCn = SIGN_CN[sunSlug] ?? sunSlug;
  const moonPos = state.natalChart.positions.find((p) => p.planet === "moon");
  const moonCn = moonPos ? SIGN_CN[moonPos.sign] ?? moonPos.sign : "未知";
  const rising = state.natalChart.risingSign;
  const risingCn = rising ? SIGN_CN[rising.sign] ?? rising.sign : null;

  const transitLines = state.transitAspects.slice(0, 6).map((a) => {
    const nameA = PLANET_CN[a.planetA] ?? a.planetA;
    const nameB = PLANET_CN[a.planetB] ?? a.planetB;
    const aspCn = ASPECT_CN[a.type] ?? a.type;
    return `行运${nameA}${aspCn}本命${nameB}（强度 ${(a.strength * 100).toFixed(0)}%）`;
  });

  const scoreLines = Object.entries(state.scores).map(([dim, s]) => {
    const scoreResult = s as ScoreResult;
    const factorDesc = scoreResult.factors
      .map((f) => `${f.source.replace(/_/g, " ")} ${f.weight > 0 ? "+" : ""}${Math.round(f.weight)}`)
      .join(", ");
    return `- ${dim}：${scoreResult.score}分（${scoreResult.level}）${factorDesc ? "，因素：" + factorDesc : ""}`;
  });

  return `今天是 ${dateStr}。
用户星座：太阳${sunCn}，月亮${moonCn}${risingCn ? "，上升" + risingCn : ""}。
月相：${state.moonPhase}。
当日主导主题：${state.dominantTheme}。

行运相位：
${transitLines.length > 0 ? transitLines.join("\n") : "无显著行运相位"}

五维评分：
${scoreLines.join("\n")}

请根据以上数据，输出以下 JSON：
{
  "core": "一句核心星语（20字以内，温暖有力量）",
  "expand": "展开段落（60-100字，围绕当日星象给出生活化建议）",
  "actions": {"yes": "今天适合做的一件事（具体可执行）", "no": "今天不必做的事（温和提醒）"},
  "question": "一个反思问题（问句，引发内省）",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4"]
}`;
}

/* ================================================================== */
/*  Prompt 模板：关系星图                                               */
/* ================================================================== */

export function assembleRelationPrompt(
  profileA: BirthProfile,
  profileB: BirthProfile,
  chartA: NatalChart,
  chartB: NatalChart,
  synastryAspects: Aspect[],
  score: number,
  factors: { type: string; label: string; weight: number }[],
): string {
  function posSummary(chart: NatalChart) {
    return chart.positions
      .slice(0, 6)
      .map((p) => {
        const name = PLANET_CN[p.planet] ?? p.planet;
        const sign = SIGN_CN[p.sign] ?? p.sign;
        return `${name}${sign}`;
      })
      .join("，");
  }

  const aspectLines = synastryAspects.slice(0, 8).map((a) => {
    const nameA = PLANET_CN[a.planetA] ?? a.planetA;
    const nameB = PLANET_CN[a.planetB] ?? a.planetB;
    const aspCn = ASPECT_CN[a.type] ?? a.type;
    const mood = ["trine", "sextile", "conjunction"].includes(a.type) ? "和谐" : "紧张";
    return `${nameA}${aspCn}${nameB}（${mood}，强度 ${(a.strength * 100).toFixed(0)}%）`;
  });

  const factorLines = factors.map(
    (f) => `${f.type === "positive" ? "正面" : "负面"}：${f.label}（${f.weight > 0 ? "+" : ""}${f.weight}）`,
  );

  return `两人关系星图分析：

A（${profileA.nickname || "用户"}）：${posSummary(chartA)}
B（${profileB.nickname || "TA"}）：${posSummary(chartB)}
合盘评分：${score}/100

主要合盘相位：
${aspectLines.length > 0 ? aspectLines.join("\n") : "无显著合盘相位"}

评分因子：
${factorLines.length > 0 ? factorLines.join("\n") : "无显著因子"}

请输出以下 JSON：
{
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4"],
  "attraction": ["吸引力描述1（50-80字）", "吸引力描述2（50-80字）", "吸引力描述3（50-80字）"],
  "misunderstanding": ["可能误解1（50-80字）", "可能误解2（50-80字）", "可能误解3（50-80字）"],
  "growth": "成长主题（60-100字）",
  "advice": "建议（60-80字）"
}`;
}

/* ================================================================== */
/*  Prompt 模板：人格分析                                               */
/* ================================================================== */

export function assemblePersonalityPrompt(chart: NatalChart): string {
  function planetInfo(planet: string) {
    const pos = chart.positions.find((p) => p.planet === planet);
    if (!pos) return null;
    const sign = SIGN_CN[pos.sign] ?? pos.sign;
    const zodiac = ZODIACS.find((z) => z.slug === pos.sign);
    return { sign, element: zodiac?.elementLabel ?? "", keywords: zodiac?.keywords.slice(0, 3) ?? [] };
  }

  const data = {
    sun: planetInfo("sun"),
    moon: planetInfo("moon"),
    rising: chart.risingSign
      ? {
          sign: SIGN_CN[chart.risingSign.sign] ?? chart.risingSign.sign,
          element: ZODIACS.find((z) => z.slug === chart.risingSign!.sign)?.elementLabel ?? "",
          keywords: ZODIACS.find((z) => z.slug === chart.risingSign!.sign)?.keywords.slice(0, 3) ?? [],
        }
      : null,
    mercury: planetInfo("mercury"),
    venus: planetInfo("venus"),
    mars: planetInfo("mars"),
  };

  return `根据以下星盘数据，为用户撰写个性化人格分析：

太阳：${data.sun?.sign ?? "未知"}（${data.sun?.element}）
月亮：${data.moon?.sign ?? "未知"}（${data.moon?.element}）
上升：${data.rising?.sign ?? "未知（出生时间/城市不详）"}${data.rising ? "（" + data.rising.element + "）" : ""}
水星：${data.mercury?.sign ?? "未知"}
金星：${data.venus?.sign ?? "未知"}
火星：${data.mars?.sign ?? "未知"}

请输出以下 JSON：
{
  "core": "核心特质段落（80-120字，综合太阳/月亮/上升）",
  "emotion": "情绪模式段落（60-100字，基于月亮星座）",
  "communication": "沟通风格段落（60-100字，基于水星星座）",
  "relationship": "关系模式段落（60-100字，基于金星星座）",
  "action": "行动风格段落（60-100字，基于火星星座）",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5", "关键词6", "关键词7", "关键词8"]
}`;
}

/* ================================================================== */
/*  缓存 key 生成                                                      */
/* ================================================================== */

export function todayCacheKey(uid: number, dateStr: string): string {
  return `${uid}:today:${dateStr}`;
}

export function relationCacheKey(uid: number, profileA: BirthProfile, profileB: BirthProfile): string {
  const hash = [profileA.birthDate, profileA.birthTime ?? "", profileB.birthDate, profileB.birthTime ?? ""]
    .join("|")
    .split("")
    .reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
    .toString(36);
  return `${uid}:relation:${hash}`;
}

export function personalityCacheKey(uid: number, chart: NatalChart): string {
  const hash = chart.positions
    .map((p) => `${p.planet}:${p.sign}:${Math.round(p.degree)}`)
    .join(",")
    .split("")
    .reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
    .toString(36);
  return `${uid}:personality:${hash}`;
}

export function todayExpiresAt(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 15, 59, 59, 999);
}

/* ================================================================== */
/*  各 Surface 入口函数                                                */
/* ================================================================== */

export type TodayContent = {
  core: string;
  expand: string;
  actions: { yes: string; no: string };
  question: string;
  keywords: string[];
};

export type RelationContent = {
  keywords: string[];
  attraction: string[];
  misunderstanding: string[];
  growth: string;
  advice: string;
};

export type PersonalityContent = {
  core: string;
  emotion: string;
  communication: string;
  relationship: string;
  action: string;
  keywords: string[];
};

const TODAY_REQUIRED = ["core", "expand", "actions", "question", "keywords"];
const RELATION_REQUIRED = ["keywords", "attraction", "misunderstanding", "growth", "advice"];
const PERSONALITY_REQUIRED = ["core", "emotion", "communication", "relationship", "action", "keywords"];

async function generateWithCache<T>(
  db: D1Database,
  cacheKey: string,
  surface: string,
  uid: number,
  expiresAt: number,
  prompt: string,
  requiredFields: string[],
  env: LLMEnv,
): Promise<T | null> {
  const cached = await getCachedContent(db, cacheKey);
  if (cached) return cached as T;
  const raw = await callLLM(env, prompt);
  const parsed = parseAndValidate(raw, requiredFields);
  if (!parsed) return null;
  try {
    await setCachedContent(db, cacheKey, surface, uid, parsed, expiresAt);
  } catch {
    // best-effort
  }
  return parsed as T;
}

export async function generateTodayContent(
  db: D1Database,
  uid: number,
  profile: BirthProfile,
  dateStr: string,
  env: LLMEnv,
): Promise<TodayContent | null> {
  const { getSunSignFromDate } = await import("@/lib/astrology");
  const sun = getSunSignFromDate(profile.birthDate);
  const state = getDailyAstrologyState(profile, dateStr);
  const prompt = assembleTodayPrompt(state, sun.slug, dateStr);
  const key = todayCacheKey(uid, dateStr);
  return generateWithCache<TodayContent>(db, key, "today", uid, todayExpiresAt(dateStr), prompt, TODAY_REQUIRED, env);
}

export async function generateRelationContent(
  db: D1Database,
  uid: number,
  profileA: BirthProfile,
  profileB: BirthProfile,
  env: LLMEnv,
): Promise<RelationContent | null> {
  const chartA = calcNatalChart(profileA);
  const chartB = calcNatalChart(profileB);
  const aspects = calcAspectsBetween(chartA.positions, chartB.positions);
  const { getRelation } = await import("@/lib/relation");
  const result = getRelation(profileA, profileB);
  const prompt = assembleRelationPrompt(profileA, profileB, chartA, chartB, aspects, result.score, result.factors);
  const key = relationCacheKey(uid, profileA, profileB);
  const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
  return generateWithCache<RelationContent>(db, key, "relation", uid, expiresAt, prompt, RELATION_REQUIRED, env);
}

export async function generatePersonalityContent(
  db: D1Database,
  uid: number,
  profile: BirthProfile,
  env: LLMEnv,
): Promise<PersonalityContent | null> {
  const chart = calcNatalChart(profile);
  const prompt = assemblePersonalityPrompt(chart);
  const key = personalityCacheKey(uid, chart);
  const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
  return generateWithCache<PersonalityContent>(db, key, "personality", uid, expiresAt, prompt, PERSONALITY_REQUIRED, env);
}
