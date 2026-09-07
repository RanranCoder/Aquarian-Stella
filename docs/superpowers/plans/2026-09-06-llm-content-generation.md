# LLM 内容生成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将今日星语、关系星图、人格分析的文案从固定模板池升级为 LLM 生成的个性化内容，保留现有天文计算引擎，LLM 仅负责表达层。

**Architecture:** 外部 LLM API 推理 + D1 缓存（实时生成，同日/同人复用），模板兜底优雅降级。API 路由统一入口按 `surface` 字段分流，前端乐观渲染（先模板，AI 回来后无缝替换）。

**Tech Stack:** Cloudflare D1、外部 LLM API（OpenAI 兼容协议，base URL 由 `LLM_BASE_URL` 环境变量配置）、`fetch` 原生调用（无 SDK 依赖）、Vitest

## Global Constraints

- LLM 禁止自行推算行星位置，所有天文数据由 `src/lib/astrology/` 引擎预计算
- AI 输出必须通过 `checkGeneratedText()` 合规校验（`src/lib/trust.ts`）
- 任何失败场景静默降级到现有模板，用户体验不中断
- `today` 每用户每日限 1 次 LLM 调用，`relation` 限 5 次，`personality` 限 1 次（复用 `claimDailyRate`）
- LLM 超时 10s，超时即降级
- 缓存 key 格式：`{uid}:{surface}:{hash}`，`today` 当日过期，`relation`/`personality` 永久
- 出生信息修改时批量失效该用户的 `personality` 和 `relation` 缓存

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|---|---|
| `src/lib/astrology/ai-cache.ts` | D1 缓存表定义、读/写/失效操作 |
| `src/lib/astrology/ai-cache.test.ts` | 缓存层单元测试（用 D1 mock） |
| `src/lib/astrology/ai-content.ts` | LLM 调用层：prompt 模板、JSON 后处理、降级逻辑、各 surface 入口函数 |
| `src/lib/astrology/ai-content.test.ts` | 内容层单元测试（mock fetch） |
| `src/app/api/astrology/ai-content/route.ts` | API 路由：session 验证、rate-limit、调引擎+LLM、返回 |

### 修改文件

| 文件 | 改动 |
|---|---|
| `src/app/today/today-view.tsx` | 乐观加载策略：先渲染模板，AI 回来后替换 |
| `src/app/relationship/relationship-view.tsx` | 同上，relation surface |
| `src/app/chart/chart-view.tsx` | 同上，personality surface |
| `src/app/api/profile/route.ts` | `upsertProfile` 后调 `invalidateAiCache` |
| `wrangler.jsonc` | 增加 `LLM_BASE_URL`、`LLM_MODEL` vars |

---

## Task 1：D1 缓存层

**Files:**
- Create: `src/lib/astrology/ai-cache.ts`
- Test: `src/lib/astrology/ai-cache.test.ts`

**Interfaces:**
- Produces: `getCachedContent(db, key)` → `AiCachePayload | null`
- Produces: `setCachedContent(db, key, surface, userId, payload, expiresAt)` → `void`
- Produces: `invalidateAiCache(db, userId)` → `void`

### Step 1：写失败测试

`src/lib/astrology/ai-cache.test.ts`：

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { D1Mock } from "@/lib/auth/d1-mock";
import { getCachedContent, setCachedContent, invalidateAiCache } from "./ai-cache";

function makeDb(): D1Mock {
  return new D1Mock();
}

describe("ai-cache", () => {
  let db: D1Mock;
  beforeEach(() => {
    db = makeDb();
  });

  it("写入后可读取", async () => {
    const payload = { core: "测试星语", keywords: ["关键词"] };
    const now = Date.now();
    await setCachedContent(db, "u1:today:2026-09-06", "today", 1, payload, now + 86400000);
    const result = await getCachedContent(db, "u1:today:2026-09-06");
    expect(result).toEqual(payload);
  });

  it("未写入时返回 null", async () => {
    const result = await getCachedContent(db, "u1:today:2026-09-06");
    expect(result).toBeNull();
  });

  it("过期后返回 null", async () => {
    const payload = { core: "测试" };
    const pastTime = Date.now() - 1000;
    await setCachedContent(db, "u1:today:2026-09-06", "today", 1, payload, pastTime);
    const result = await getCachedContent(db, "u1:today:2026-09-06");
    expect(result).toBeNull();
  });

  it("invalidateAiCache 删除指定用户的所有缓存", async () => {
    await setCachedContent(db, "u1:today:2026-09-06", "today", 1, { a: 1 }, Date.now() + 86400000);
    await setCachedContent(db, "u1:personality:abc", "personality", 1, { b: 2 }, Date.now() + 86400000);
    await setCachedContent(db, "u2:today:2026-09-06", "today", 2, { c: 3 }, Date.now() + 86400000);
    await invalidateAiCache(db, 1);
    expect(await getCachedContent(db, "u1:today:2026-09-06")).toBeNull();
    expect(await getCachedContent(db, "u1:personality:abc")).toBeNull();
    // u2 的缓存不受影响
    expect(await getCachedContent(db, "u2:today:2026-09-06")).toEqual({ c: 3 });
  });
});
```

### Step 2：运行测试确认失败

```bash
npx vitest run src/lib/astrology/ai-cache.test.ts
```

预期：`Cannot find module './ai-cache'`

### Step 3：实现 `ai-cache.ts`

```ts
// src/lib/astrology/ai-cache.ts
import type { D1Database } from "@cloudflare/workers-types";

const CREATE_CACHE = `CREATE TABLE IF NOT EXISTS ai_content_cache (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key   TEXT    NOT NULL UNIQUE,
  surface     TEXT    NOT NULL,
  user_id     INTEGER NOT NULL,
  payload     TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
)`;

const CREATE_INDEX = `CREATE INDEX IF NOT EXISTS idx_cache_lookup
  ON ai_content_cache(cache_key, expires_at)`;

async function ensureTable(db: D1Database): Promise<void> {
  await db.prepare(CREATE_CACHE).run();
  await db.prepare(CREATE_INDEX).run();
}

export async function getCachedContent(
  db: D1Database,
  key: string,
): Promise<Record<string, unknown> | null> {
  await ensureTable(db);
  const now = Date.now();
  const row = await db
    .prepare("SELECT payload FROM ai_content_cache WHERE cache_key = ? AND expires_at > ?")
    .bind(key, now)
    .first<{ payload: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function setCachedContent(
  db: D1Database,
  key: string,
  surface: string,
  userId: number,
  payload: Record<string, unknown>,
  expiresAt: number,
): Promise<void> {
  await ensureTable(db);
  await db
    .prepare(
      `INSERT INTO ai_content_cache (cache_key, surface, user_id, payload, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         payload = excluded.payload,
         created_at = excluded.created_at,
         expires_at = excluded.expires_at`,
    )
    .bind(key, surface, userId, JSON.stringify(payload), Date.now(), expiresAt)
    .run();
}

export async function invalidateAiCache(db: D1Database, userId: number): Promise<void> {
  await ensureTable(db);
  await db
    .prepare("DELETE FROM ai_content_cache WHERE user_id = ?")
    .bind(userId)
    .run();
}
```

### Step 4：运行测试确认通过

```bash
npx vitest run src/lib/astrology/ai-cache.test.ts
```

预期：全部 PASS

### Step 5：提交

```bash
git add src/lib/astrology/ai-cache.ts src/lib/astrology/ai-cache.test.ts
git commit -m "feat: add D1 ai_content_cache layer with get/set/invalidation"
```

---

## Task 2：LLM 调用层与 Prompt 模板

**Files:**
- Create: `src/lib/astrology/ai-content.ts`
- Test: `src/lib/astrology/ai-content.test.ts`

**Interfaces:**
- Consumes: `getDailyAstrologyState()` from `src/lib/astrology/daily-state.ts`
- Consumes: `calcNatalChart()` from `src/lib/astrology/natal-chart.ts`
- Consumes: `getRelation()` from `src/lib/relation.ts`
- Consumes: `checkGeneratedText()` from `src/lib/trust.ts`
- Consumes: `getCachedContent()`, `setCachedContent()` from `./ai-cache.ts`
- Produces: `generateTodayContent(db, uid, profile, dateStr, env)` → `TodayContent`
- Produces: `generateRelationContent(db, uid, profileA, profileB, env)` → `RelationContent`
- Produces: `generatePersonalityContent(db, uid, profile, env)` → `PersonalityContent`

### Step 1：写失败测试

`src/lib/astrology/ai-content.test.ts`：

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assembleTodayPrompt,
  assembleRelationPrompt,
  assemblePersonalityPrompt,
  parseAndValidate,
  SYSTEM_PROMPT,
} from "./ai-content";
import type { DailyAstrologyState } from "./types";

// ── prompt 组装测试 ──

describe("assembleTodayPrompt", () => {
  it("包含太阳/月亮/上升星座名称", () => {
    const state = {
      moonPhase: "满月",
      dominantTheme: "emotion",
      currentPositions: [
        { planet: "sun", sign: "gemini", degree: 15 },
      ],
      natalChart: {
        positions: [
          { planet: "moon", sign: "scorpio", degree: 10 },
        ],
        risingSign: { planet: "asc", sign: "aquarius", degree: 5 },
      },
      transitAspects: [
        { planetA: "venus", planetB: "moon", type: "trine", strength: 0.87, angle: 119, orb: 1 },
      ],
      scores: {
        emotion: { score: 72, level: "high", factors: [{ type: "positive", source: "venus_trine_moon", weight: 9, category: "emotion" }] },
        love: { score: 55, level: "normal", factors: [] },
        creativity: { score: 60, level: "normal", factors: [] },
        social: { score: 68, level: "normal", factors: [] },
        career: { score: 50, level: "normal", factors: [] },
      },
      keywords: ["情感", "和谐"],
    } as unknown as DailyAstrologyState;

    const prompt = assembleTodayPrompt(state, "gemini", "2026-09-06");
    expect(prompt).toContain("双子座");
    expect(prompt).toContain("天蝎座");
    expect(prompt).toContain("水瓶座");
    expect(prompt).toContain("满月");
  });
});

describe("parseAndValidate", () => {
  it("合法 JSON 返回对象", () => {
    const result = parseAndValidate('{"core":"测试","keywords":["k1"]}', ["core"]);
    expect(result).toEqual({ core: "测试", keywords: ["k1"] });
  });

  it("非法 JSON 返回 null", () => {
    expect(parseAndValidate("not json", [])).toBeNull();
  });

  it("缺少必需字段返回 null", () => {
    expect(parseAndValidate('{"keywords":["k1"]}', ["core"])).toBeNull();
  });

  it("违反 trust 规则的文本被拦截时字段被清空", () => {
    const result = parseAndValidate('{"core":"你一定会成功","keywords":["k1"]}', ["core"]);
    // core 被 checkGeneratedText 拦截 → 归为 null 字段，触发降级
    expect(result).toBeNull();
  });
});

describe("SYSTEM_PROMPT", () => {
  it("包含禁止规则关键词", () => {
    expect(SYSTEM_PROMPT).toContain("禁止");
    expect(SYSTEM_PROMPT).toContain("恐慌");
    expect(SYSTEM_PROMPT).toContain("推算");
  });
});
```

### Step 2：运行测试确认失败

```bash
npx vitest run src/lib/astrology/ai-content.test.ts
```

### Step 3：实现 `ai-content.ts`

```ts
// src/lib/astrology/ai-content.ts
import type { D1Database } from "@cloudflare/workers-types";
import type { BirthProfile } from "@/lib/astrology";
import type { DailyAstrologyState, NatalChart, Aspect, ScoreResult } from "./types";
import { getDailyAstrologyState } from "./daily-state";
import { calcNatalChart } from "./natal-chart";
import { calcCurrentPositions, calcTransitAspects, getMajorTransits } from "./transit";
import { calcScores } from "./scoring";
import { checkGeneratedText } from "@/lib/trust";
import { getCachedContent, setCachedContent } from "./ai-cache";
import { ZODIACS } from "@/data/zodiacs";

/* ================================================================== */
/*  环境变量类型                                                        */
/* ================================================================== */

export interface LLMEnv {
  LLM_BASE_URL: string;   // e.g. "https://api.deepseek.com"
  LLM_API_KEY: string;     // wrangler secret
  LLM_MODEL: string;       // e.g. "deepseek-chat"
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

async function callLLM(
  env: LLMEnv,
  userPrompt: string,
): Promise<string | null> {
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
    const data = await res.json() as {
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

/** 解析 LLM 返回的 JSON，校验必需字段 + trust 规则。失败返回 null。 */
export function parseAndValidate(
  raw: string | null,
  requiredFields: string[],
): Record<string, unknown> | null {
  if (!raw) return null;
  // 有时 LLM 会包裹 ```json ... ```，先剥掉
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  // 必需字段检查
  for (const field of requiredFields) {
    if (parsed[field] === undefined || parsed[field] === null) return null;
  }
  // trust 校验：所有字符串字段聚合检查
  const allText = Object.values(parsed)
    .filter((v): v is string => typeof v === "string")
    .join(" ");
  const violations = checkGeneratedText(allText);
  if (violations.length > 0) return null;
  // 数组字段的子项也检查
  for (const val of Object.values(parsed)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string") {
          if (checkGeneratedText(item).length > 0) return null;
        }
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

  const transitLines = state.transitAspects
    .slice(0, 6)
    .map((a) => {
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
    const parts = chart.positions.slice(0, 6).map((p) => {
      const name = PLANET_CN[p.planet] ?? p.planet;
      const sign = SIGN_CN[p.sign] ?? p.sign;
      return `${name}${sign}`;
    });
    return parts.join("，");
  }

  const aspectLines = synastryAspects
    .slice(0, 8)
    .map((a) => {
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
    return {
      sign,
      element: zodiac?.elementLabel ?? "",
      keywords: zodiac?.keywords.slice(0, 3) ?? [],
    };
  }

  const data = {
    sun: planetInfo("sun"),
    moon: planetInfo("moon"),
    rising: chart.risingSign
      ? { sign: SIGN_CN[chart.risingSign.sign] ?? chart.risingSign.sign,
          element: ZODIACS.find((z) => z.slug === chart.risingSign!.sign)?.elementLabel ?? "",
          keywords: ZODIACS.find((z) => z.slug === chart.risingSign!.sign)?.keywords.slice(0, 3) ?? [] }
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

/* ================================================================== */
/*  今日过期时间（当天 23:59:59 本地 → 这里用 UTC+8 近似）              */
/* ================================================================== */

export function todayExpiresAt(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  // 当天 23:59:59 UTC+8 = 15:59:59 UTC
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

/** 通用生成流程：查缓存 → 调 LLM → 校验 → 写缓存。失败返回 null。 */
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
  // 1. 查缓存
  const cached = await getCachedContent(db, cacheKey);
  if (cached) return cached as T;

  // 2. 调 LLM
  const raw = await callLLM(env, prompt);
  const parsed = parseAndValidate(raw, requiredFields);
  if (!parsed) return null;

  // 3. 写缓存（失败忽略）
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
  const aspects = (await import("./aspects")).calcAspectsBetween(chartA.positions, chartB.positions);
  // 使用 relation.ts 的评分逻辑
  const { getRelation } = await import("@/lib/relation");
  const result = getRelation(profileA, profileB);
  const prompt = assembleRelationPrompt(profileA, profileB, chartA, chartB, aspects, result.score, result.factors);
  const key = relationCacheKey(uid, profileA, profileB);
  // relation 缓存永不过期（设为 1 年后）
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
```

### Step 4：运行测试确认通过

```bash
npx vitest run src/lib/astrology/ai-content.test.ts
```

### Step 5：提交

```bash
git add src/lib/astrology/ai-content.ts src/lib/astrology/ai-content.test.ts
git commit -m "feat: add LLM content generation layer with prompt templates and validation"
```

---

## Task 3：API 路由

**Files:**
- Create: `src/app/api/astrology/ai-content/route.ts`

**Interfaces:**
- Consumes: `generateTodayContent`, `generateRelationContent`, `generatePersonalityContent` from `@/lib/astrology/ai-content`
- Consumes: `getUid` from `@/lib/auth/uid`
- Consumes: `claimDailyRate` from `@/lib/auth/rate-limit`
- Consumes: `getProfile` from `@/lib/profile/db`
- Produces: `POST /api/astrology/ai-content` endpoint

### Step 1：实现路由

```ts
// src/app/api/astrology/ai-content/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUid } from "@/lib/auth/uid";
import { getProfile } from "@/lib/profile/db";
import { claimDailyRate } from "@/lib/auth/rate-limit";
import {
  generateTodayContent,
  generateRelationContent,
  generatePersonalityContent,
  type LLMEnv,
} from "@/lib/astrology/ai-content";
import type { BirthProfile } from "@/lib/astrology";

const SURFACE_LIMITS: Record<string, number> = {
  today: 1,
  relation: 5,
  personality: 1,
};

function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext({ async: true });
  const uid = await getUid(request, env);
  if (!uid) return NextResponse.json({ error: "NOT_LOGGED_IN" }, { status: 401 });

  let body: Record<string, unknown> | null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const surface = typeof body.surface === "string" ? body.surface : "";
  if (!["today", "relation", "personality"].includes(surface)) {
    return NextResponse.json({ error: "INVALID_SURFACE" }, { status: 400 });
  }

  // rate-limit
  const limit = SURFACE_LIMITS[surface] ?? 1;
  const rlKey = `ai:${surface}:${uid}`;
  const rl = await claimDailyRate(env.DB, rlKey, limit, Date.now());
  if (!rl.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  // 读取用户 profile
  const profile = await getProfile(env.DB, uid);
  if (!profile) {
    return NextResponse.json({ error: "NO_PROFILE" }, { status: 400 });
  }

  const llmEnv: LLMEnv = {
    LLM_BASE_URL: env.LLM_BASE_URL,
    LLM_API_KEY: env.LLM_API_KEY,
    LLM_MODEL: env.LLM_MODEL,
  };

  let content: Record<string, unknown> | null = null;

  try {
    if (surface === "today") {
      const dateStr = typeof body.date === "string" ? body.date : todayDateStr();
      content = await generateTodayContent(env.DB, uid, profile, dateStr, llmEnv);
    } else if (surface === "relation") {
      const partnerRaw = body.partnerProfile as Record<string, unknown> | undefined;
      if (!partnerRaw || typeof partnerRaw.birthDate !== "string") {
        return NextResponse.json({ error: "MISSING_PARTNER" }, { status: 400 });
      }
      const partner: BirthProfile = {
        nickname: typeof partnerRaw.nickname === "string" ? partnerRaw.nickname : "TA",
        birthDate: partnerRaw.birthDate,
        birthTime: typeof partnerRaw.birthTime === "string" ? partnerRaw.birthTime : undefined,
        birthTimeAccuracy: (partnerRaw.birthTimeAccuracy as BirthProfile["birthTimeAccuracy"]) ?? "unknown",
        birthCity: typeof partnerRaw.birthCity === "string" ? partnerRaw.birthCity : undefined,
        interests: [],
      };
      content = await generateRelationContent(env.DB, uid, profile, partner, llmEnv);
    } else if (surface === "personality") {
      content = await generatePersonalityContent(env.DB, uid, profile, llmEnv);
    }
  } catch {
    content = null;
  }

  // 降级：content 为 null 时返回空对象，前端用模板兜底
  return NextResponse.json({
    ok: true,
    surface,
    content: content ?? null,
    source: content ? "ai" : "template",
  });
}
```

### Step 2：提交

```bash
git add src/app/api/astrology/ai-content/route.ts
git commit -m "feat: add /api/astrology/ai-content route with caching and rate limiting"
```

---

## Task 4：wrangler 环境变量

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `src/app/api/astrology/ai-content/route.ts`（补充 env 类型）

### Step 1：修改 `wrangler.jsonc`

在 `vars` 中增加：

```jsonc
"vars": {
  "AUTH_FROM_EMAIL": "Stella@mail.ranran.org.cn",
  "STAR_MAIL_FROM_EMAIL": "Stella 星邮 <stella@mail.ranran.org.cn>",
  "LLM_BASE_URL": "https://api.deepseek.com",
  "LLM_MODEL": "deepseek-chat"
}
```

`LLM_API_KEY` 通过 `wrangler secret put LLM_API_KEY` 设置，不写入文件。

### Step 2：确认路由中的 env 类型

路由中通过 `env.LLM_BASE_URL` / `env.LLM_API_KEY` / `env.LLM_MODEL` 访问，无需额外类型声明（Cloudflare env 类型由 `wrangler types` 自动生成）。

### Step 3：提交

```bash
git add wrangler.jsonc
git commit -m "feat: add LLM_BASE_URL and LLM_MODEL to wrangler vars"
```

---

## Task 5：前端 — 今日星语乐观加载

**Files:**
- Modify: `src/app/today/today-view.tsx`

**Interfaces:**
- Consumes: `POST /api/astrology/ai-content` with `{ surface: "today", date }`

### Step 1：实现乐观加载逻辑

在 `TodayPage` 组件中：

```tsx
// 在现有 profile 存在的分支开头，增加 AI 内容状态：
const [aiContent, setAiContent] = useState<TodayContent | null>(null);

// 在 date 变化时请求 AI 内容：
useEffect(() => {
  if (!profile) return;
  let cancelled = false;
  fetch("/api/astrology/ai-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surface: "today", date }),
    credentials: "include",
  })
    .then((r) => r.json())
    .then((data) => {
      if (!cancelled && data.content) {
        setAiContent(data.content as TodayContent);
      }
    })
    .catch(() => {});
  return () => { cancelled = true; };
}, [profile, date]);

// 替换渲染逻辑：
// 现有：h?.theme.core
// 改为：aiContent?.core ?? h?.theme.core
// 同理 expand/actions/question/keywords
```

**关键**：评分维度 `h.dimensions`、行运相位 `majorTransits` 始终来自引擎，不被 AI 覆盖。

### Step 2：手动验证

- 页面加载时先显示模板文案，AI 内容返回后无缝替换（无布局抖动）
- AI 失败时模板正常显示
- 切换日期时重新请求

### Step 3：提交

```bash
git add src/app/today/today-view.tsx
git commit -m "feat: today page optimistic AI content loading"
```

---

## Task 6：前端 — 关系星图乐观加载

**Files:**
- Modify: `src/app/relationship/relationship-view.tsx`

### Step 1：实现

在 `generate()` 函数中，现有 `getRelation()` 调用之后，追加 AI 请求：

```tsx
const [aiRelation, setAiRelation] = useState<RelationContent | null>(null);

function generate() {
  if (!profile || !canGenerate) return;
  const taProfile: BirthProfile = { /* 现有逻辑 */ };
  const relationResult = getRelation(profile, taProfile);
  setResult(relationResult);
  setAiRelation(null); // 重置

  // 请求 AI 内容
  fetch("/api/astrology/ai-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surface: "relation", partnerProfile: taProfile }),
    credentials: "include",
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.content) setAiRelation(data.content as RelationContent);
    })
    .catch(() => {});
}

// 渲染时：
// attraction: aiRelation?.attraction ?? result.attraction
// misunderstanding: aiRelation?.misunderstanding ?? result.misunderstanding
// growth: aiRelation?.growth ?? result.growth
// advice: aiRelation?.advice ?? result.advice
// keywords: aiRelation?.keywords ?? result.keywords
// score / factors / synastryAspects 始终来自 result（引擎）
```

### Step 2：提交

```bash
git add src/app/relationship/relationship-view.tsx
git commit -m "feat: relationship page optimistic AI content loading"
```

---

## Task 7：前端 — 人格分析乐观加载

**Files:**
- Modify: `src/app/chart/chart-view.tsx`

### Step 1：实现

```tsx
const [aiPersonality, setAiPersonality] = useState<PersonalityContent | null>(null);

useEffect(() => {
  if (!profile) return;
  let cancelled = false;
  fetch("/api/astrology/ai-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surface: "personality" }),
    credentials: "include",
  })
    .then((r) => r.json())
    .then((data) => {
      if (!cancelled && data.content) {
        setAiPersonality(data.content as PersonalityContent);
      }
    })
    .catch(() => {});
  return () => { cancelled = true; };
}, [profile?.birthDate, profile?.birthTime, profile?.birthCity]);

// personalityProfile 的各字段替换：
// personalityProfile.core → aiPersonality?.core ?? personalityProfile.core
// personalityProfile.emotion → aiPersonality?.emotion ?? personalityProfile.emotion
// personalityProfile.communication → aiPersonality?.communication ?? personalityProfile.communication
// personalityProfile.relationship → aiPersonality?.relationship ?? personalityProfile.relationship
// personalityProfile.action → aiPersonality?.action ?? personalityProfile.action
// keywords → aiPersonality?.keywords ?? personalityProfile.keywords
```

### Step 2：提交

```bash
git add src/app/chart/chart-view.tsx
git commit -m "feat: chart page optimistic AI personality loading"
```

---

## Task 8：出生信息修改时缓存失效

**Files:**
- Modify: `src/app/api/profile/route.ts`

### Step 1：在 `PUT` 路由末尾追加缓存失效

在 `await upsertProfile(...)` 之后、`return` 之前：

```ts
// 失效该用户的 AI 内容缓存（personality / relation）
try {
  const { invalidateAiCache } = await import("@/lib/astrology/ai-cache");
  await invalidateAiCache(env.DB, uid);
} catch {
  // best-effort，不阻塞 profile 保存
}
```

### Step 2：提交

```bash
git add src/app/api/profile/route.ts
git commit -m "feat: invalidate AI cache on profile update"
```

---

## Task 9：手动集成测试

### Step 1：设置 wrangler secret

```bash
npx wrangler secret put LLM_API_KEY
# 输入 DeepSeek API key
```

### Step 2：本地运行

```bash
npm run dev
```

### Step 3：验证清单

- [ ] 今日星语：登录后进入首页，先显示模板文案，2-3 秒后文案被 AI 版本替换，无布局抖动
- [ ] 今日星语：切换日期，AI 内容更新
- [ ] 今日星语：刷新同一天，第二次直接返回缓存（Network 面板可见极快响应）
- [ ] 关系星图：输入 TA 信息后生成，先显示模板后替换
- [ ] 人格分析：首次进入星盘页有 AI 内容，后续直接缓存
- [ ] 降级：断网或用错误 API key，所有页面仍正常显示模板文案
- [ ] rate-limit：today 页面同一天第二次请求返回 429（但缓存已命中所以不会触发）
- [ ] 出生信息修改后，人格分析重新生成

### Step 4：最终提交

```bash
git add -A
git commit -m "feat: complete LLM content generation integration"
```
