# Stella 文案表达层接入 LLM 设计方案

> 2026-09-06 | 状态：设计完成，待实施

## 目标

将今日星语、关系星图、人格分析三处文案从固定模板池升级为 LLM 生成的个性化内容，同时保留现有的真实天文计算引擎作为数据源，LLM 仅负责文案表达层。

## 核心原则

- **计算层不动**：行星位置、相位检测、五维评分、合盘分数全部保持现有引擎
- **LLM 是解释者，非计算者**：所有天文数据由引擎算好后作为 prompt 上下文传入，LLM 禁止自行推算
- **模板兜底**：任何 LLM 失败场景都静默回退到现有模板，用户体验不中断
- **内容安全**：复用现有 `trust.ts` 的 `checkGeneratedText()` 校验 AI 输出

---

## 架构

```
客户端 (Next.js)
   │
   ▼
POST /api/astrology/ai-content
   │
   ├─ 1. 验证 session（复用 verifySession）
   ├─ 2. rate-limit（uid 级每日上限）
   ├─ 3. D1 查缓存（命中 → 直接返回）
   ├─ 4. 调已有计算引擎组装天文上下文
   ├─ 5. 组装 prompt（system + user）→ 调外部 LLM API
   ├─ 6. JSON.parse → checkGeneratedText → 写 D1 缓存
   └─ 7. 返回
   任一步骤失败 → 降级到现有模板文案（静默，不报错）
```

三个页面各自独立调用，互不阻塞。

---

## Prompt 设计

### System Prompt（三个 surface 共用）

```
你是 Stella 星语星愿的星象写作助手。
你收到的所有天文数据（行星位置、相位、评分）均已由专业天引擎精确计算，你无需也不允许自行推算或修改。
你的任务：基于这些计算结果，写出温暖、有洞见的文案。
约束：
- 禁止确定性预言（"一定会"、"注定"）
- 禁止制造恐慌（"灾难"、"大祸"）
- 禁止伪科学表述（"科学证明"、"医学证实"）
- 语气：温暖、平等、陪伴感，不居高临下
- 禁止提及任何系统机制（你不知道有"评分引擎"、"规则表"这类东西）
```

### Surface: today（今日星语）

**User Prompt 输入**：

```json
{
  "sun": "双子座",
  "moon": "天蝎座",
  "rising": "水瓶座",
  "moonPhase": "盈凸月",
  "date": "2026-09-06",
  "transitAspects": [
    "行运金星三分本命月亮（强度 0.87）",
    "行运火星四分本命金星（强度 0.62）"
  ],
  "dominantTheme": "relationship",
  "scores": {
    "情绪": {"score": 72, "level": "high", "factors": ["月亮三分金星 +9", "月亮四分土星 -6"]},
    "爱情": {"score": 55, "level": "normal", "factors": ["金星三分月亮 +8", "火星四分金星 -7"]},
    "创造力": {"score": 60, "level": "normal", "factors": []},
    "人际": {"score": 68, "level": "normal", "factors": ["月亮三分水星 +7"]},
    "事业": {"score": 50, "level": "normal", "factors": ["太阳四分土星 -8"]}
  }
}
```

**期望输出**：

```json
{
  "core": "一句核心星语（20字以内）",
  "expand": "展开段落（60-100字）",
  "actions": {"yes": "今天适合做的一件事", "no": "今天不必做的事"},
  "question": "反思问题（一个问句）",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4"]
}
```

### Surface: relation（关系星图）

**User Prompt 输入**：

```json
{
  "personA": {"sun": "巨蟹座", "moon": "双鱼座", "venus": "金牛座", "mars": "狮子座"},
  "personB": {"sun": "天蝎座", "moon": "处女座", "venus": "天蝎座", "mars": "水瓶座"},
  "synastryAspects": [
    "A的金星三分B的月亮（和谐，强度0.92）",
    "A的火星四分B的金星（紧张，强度0.75）",
    "A的月亮合相B的月亮（和谐，强度0.88）"
  ],
  "score": 73,
  "scoreFactors": [
    {"type": "positive", "desc": "金星三分月亮", "weight": "+11"},
    {"type": "negative", "desc": "火星四分金星", "weight": "-10"}
  ]
}
```

**期望输出**：

```json
{
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4"],
  "attraction": ["吸引力描述1（50-80字）", "吸引力描述2", "吸引力描述3"],
  "misunderstanding": ["可能误解1", "可能误解2", "可能误解3"],
  "growth": "成长主题（60-100字）",
  "advice": "建议（60-80字）"
}
```

### Surface: personality（人格分析）

**User Prompt 输入**：

```json
{
  "sun": {"sign": "双子座", "element": "风象", "keywords": ["好奇","灵活","沟通"]},
  "moon": {"sign": "天蝎座", "element": "水象", "keywords": ["深度","直觉","专注"]},
  "rising": {"sign": "水瓶座", "element": "风象", "keywords": ["独立","创新","理性"]},
  "mercury": {"sign": "双子座", "keywords": ["思维敏捷","善表达"]},
  "venus": {"sign": "金牛座", "keywords": ["稳定","感官享受","忠诚"]},
  "mars": {"sign": "狮子座", "keywords": ["领导力","表现欲","勇气"]}
}
```

**期望输出**：

```json
{
  "core": "核心特质段落（80-120字）",
  "emotion": "情绪模式段落（60-100字）",
  "communication": "沟通风格段落（60-100字）",
  "relationship": "关系模式段落（60-100字）",
  "action": "行动风格段落（60-100字）",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5", "关键词6", "关键词7", "关键词8"]
}
```

---

## API 路由

**统一入口** `POST /api/astrology/ai-content`

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `surface` | `"today" \| "relation" \| "personality"` | 是 | 场景标识 |
| `date` | `string` (YYYY-MM-DD) | today 必填 | 目标日期 |
| `partnerProfile` | `BirthProfile` | relation 必填 | 对方出生档案 |

**响应**：200 + LLM 生成的 JSON（结构取决于 surface），或降级模板内容。始终返回 200，失败场景通过 `source: "template"` 字段标识。

**rate-limit**：

| Surface | 每用户每日上限 |
|---|---|
| `today` | 1 次 |
| `relation` | 5 次（同一对人缓存不重复计） |
| `personality` | 1 次 |

---

## D1 缓存表

```sql
CREATE TABLE ai_content_cache (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key   TEXT    NOT NULL UNIQUE,
  surface     TEXT    NOT NULL,
  user_id     TEXT    NOT NULL,
  payload     TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);

CREATE INDEX idx_cache_lookup
  ON ai_content_cache(cache_key, expires_at);
```

### 缓存 Key 与过期策略

| Surface | Key 格式 | 过期时间 |
|---|---|---|
| `today` | `{uid}:today:{date}` | 当天 23:59:59 本地时间 |
| `relation` | `{uid}:relation:{personA_hash}:{personB_hash}` | 永久 |
| `personality` | `{uid}:personality:{natalHash}` | 永久 |

**缓存失效**：用户修改出生信息时，调用 `invalidateAiCache(uid)` 批量 DELETE 所有该 uid 的 `personality` 和 `relation` 缓存。挂载在 `/api/profile` 更新接口末尾。

---

## 后处理流水线

LLM 返回后依次执行：

1. **JSON 解析** — 失败 → 降级模板
2. **`checkGeneratedText()`** — 现有 `trust.ts` 正则校验，命中限制 → 降级模板
3. **字段长度校验** — 超长截断 / 空字段降级模板
4. **写入 D1 缓存** — 写入失败忽略（下次重新生成）

---

## 前端接入模式

采用**乐观策略**：先渲染模板文案，AI 内容返回后无缝替换。用户永远不用等加载。

### today-view.tsx

```
现有：
  getDailyHoroscope(sun, date, profile) → 渲染 theme

改为：
  getDailyHoroscope() 仍计算评分/关键词/相位（不丢）
  同时 POST /api/astrology/ai-content {surface:"today", date}
  AI 返回后 → 用 AI 的 core/expand/actions/question 覆盖 theme 对应字段
  AI 未返回 → 用现有模板 theme，体验无感知
```

### relationship-view.tsx

```
现有：
  getRelation(profileA, profileB) → 渲染 attraction/misunderstanding 等

改为：
  getRelation() 仍计算评分/相位/因子（不丢）
  点击「生成」时同时 POST /api/astrology/ai-content {surface:"relation", partnerProfile}
  AI 返回后 → 覆盖文案字段
  评分因子列表始终来自引擎
```

### chart-view.tsx

```
现有：
  generatePersonalityProfile() → 渲染五段描述

改为：
  首次进入页面时 POST /api/astrology/ai-content {surface:"personality"}
  AI 返回后 → 覆盖五段描述与关键词
  后续访问走 D1 缓存，直到用户修改出生信息
```

---

## 异常处理

| 异常场景 | 处理方式 | 用户感知 |
|---|---|---|
| LLM 超时（>10s） | 静默降级到模板 | 看到模板文案，无报错 |
| LLM 返回非 JSON | 重试1次 → 降级 | 同上 |
| LLM 内容触发 checkGeneratedText | 丢弃 → 降级 | 同上 |
| D1 缓存读取失败 | 视为缓存未命中，走 LLM | 无感知 |
| D1 写入失败 | 忽略，下次重新生成 | 无感知 |
| API key 失效/余额不足 | 降级 + 日志告警 | 无感知 |
| 未登录 | 401 | 前端跳登录 |
| rate-limit 超限 | 429 | 前端提示 |

---

## 测试策略

### 单元测试

文件：`src/lib/astrology/ai-content.test.ts`

- prompt 组装正确性：输入各种 profile → prompt 包含正确的星座/相位/分数
- `checkGeneratedText` 拦截违规内容
- JSON 解析失败时返回 null（触发降级）
- 缓存 key 生成的确定性与唯一性

### 集成测试

文件：`src/app/api/astrology/ai-content/route.test.ts`

- 完整流程：mock LLM 返回 → D1 写入 → 第二次请求命中缓存不调 LLM
- LLM 超时 → 返回降级模板且 status 200
- 未登录 → 401
- rate-limit → 429

### 手动测试

- 今日星语 AI 内容替换后无布局抖动
- 关系星图保留评分因子展示
- 断网时模板正常显示

---

## 成本估算

- 每次 LLM 调用约 400 input / 300 output tokens
- DeepSeek 价格：约 ¥0.001-0.003/次
- 月活 1000 用户 × 3次/天 × 30天 ≈ 90,000 次 ≈ ¥90-270/月

---

## 实施分期

### Phase 1：基础设施 + 今日星语（优先级最高）

- `src/lib/astrology/ai-content.ts` — LLM 调用层、prompt 模板、后处理流水线
- `src/app/api/astrology/ai-content/route.ts` — API 路由 + D1 缓存 + rate-limit
- `wrangler.jsonc` 增加 LLM API KEY secret
- `src/app/today/today-view.tsx` — 接入乐观加载策略
- 单元测试 + 手动测试

### Phase 2：关系星图

- `src/app/relationship/relationship-view.tsx` — 接入 AI 内容
- relation prompt 模板
- 缓存 key 逻辑（两人 hash）
- 测试

### Phase 3：人格分析

- `src/app/chart/chart-view.tsx` — 接入 AI 内容
- personality prompt 模板
- 出生信息修改时缓存失效逻辑
- 测试
