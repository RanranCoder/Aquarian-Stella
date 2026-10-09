# 星语星愿 · 改进开发文档（v2）

> 基于项目全面评估 + 逐项复审后整理的改进清单。每项均经过代码级验证，确保描述与实际代码一致。

---

## P0 — 上线前必须修复

### 1. rate-limit 窗口重置 Bug

**问题**

`src/lib/auth/rate-limit.ts` 第 30-33 行 `resetExpired` 函数存在 SQL 参数顺序错误：

```typescript
// 当前代码（错误）
await db
  .prepare("UPDATE rate_limits SET count = 0, window_end = ? WHERE key = ? AND window_end < ?")
  .bind(key, windowEnd, now)  // 顺序错误
  .run();
```

SQL 占位符顺序是 `window_end=?` -> `key=?` -> `window_end<?`，但 bind 传入的顺序是 `key, windowEnd, now`。正确写法：

```typescript
// 修正后
await db
  .prepare("UPDATE rate_limits SET count = 0, window_end = ? WHERE key = ? AND window_end < ?")
  .bind(windowEnd, now, key)
  .run();
```

**影响**

- 认证登录的 OTP 发送频率限制（claimRate）在窗口过期后不能正确重置
- 星邮发送频率限制（claimDailyRate）在窗口过期后不能正确重置
- 用户/邮箱/IP 的限制窗口过期后会被错误地继续限制
- 测试未发现此 bug，因为 `MemoryD1` mock 不校验参数顺序

**修复步骤**

1. 修正 `resetExpired` 的 bind 参数顺序
2. 为 `MemoryD1` mock 添加参数顺序校验能力
3. 新增测试用例验证窗口过期后计数器确实被归零

**验收标准**

- `npm test` 通过
- `resetExpired` 的 bind 参数与 SQL 占位符顺序一致
- 新增测试覆盖窗口过期重置场景并验证参数

---

## P1 — 上线后优先迭代

### 2. 天文计算性能优化

**问题**

`src/lib/astronomy.ts` 中 `ascendantEclipticLon` 在最坏情况下执行 360 x 16 = 5760 次天文坐标转换。每次涉及三角函数、大气折射和恒星时计算。当前无任何缓存。

**建议方案**

在 `ascendantEclipticLon` 函数内添加请求级 Map 缓存，按分钟粒度 key（`minute:lat:lon`）复用结果。上升星座在 1 分钟内的变化约 0.004 度，远小于星座区间（30 度），不影响判定。

- 同一请求内重复计算直接命中
- 可选：利用 Workers 实例生命周期缓存热门城市结果

**验收标准**

- 同一请求内第二次调用耗时 < 0.1ms
- 关系星图页面总计算时间 < 50ms
- 缓存粒度不影响星座判定结果

---

### 3. 太阳星座边界守护

**问题**

`src/lib/astrology.ts` 中 `getSunSign` 的正确性完全依赖 `src/data/zodiacs.ts` 的 `ZODIACS` 数组按黄道顺序排列且首尾相邻。数据源被意外修改时，跨年边界（摩羯/水瓶）判定会静默出错。

**建议方案**

在 `src/lib/astronomy.test.ts` 新增边界测试用例：

- 12/21 -> sagittarius
- 12/22 -> capricorn
- 1/19 -> capricorn
- 1/20 -> aquarius

同时在 `zodiacs.ts` 旁添加注释标明数组顺序不可随意调整。

**验收标准**

- 4 个边界日期测试全部通过
- ZODIACS 数组顺序变更时测试立即失败

---

### 4. 客户端数据服务端持久化

**问题**

`src/lib/store.ts` 中愿望和用户偏好仅存储在 localStorage。D1 已存在但未存储用户内容数据。

**建议方案**

**阶段一：愿望同步**

- 新建 D1 `wishes` 表（id, user_id, title, category, status, created_at, completed_at）
- 新增 API routes：`GET/POST/PUT/DELETE /api/wishes`
- store.ts 改为乐观更新：先写 localStorage，再异步同步 D1
- 未登录用户继续用 localStorage，登录后自动合并

**阶段二：偏好同步**

- 新建 D1 `user_preferences` 表（user_id, motion_enabled, interests, updated_at）

**验收标准**

- 登录用户在新设备登录后星愿完整恢复
- 离线可正常编辑，恢复网络后自动同步
- localStorage 数据不因服务端同步而被覆盖

---

### 5. 星邮内容安全加固

**问题**

`src/lib/star-mail/moderation.ts` 当前已有 URL 数量、敏感词、重复行检测。`send/route.ts` 已有 Turnstile、Session、频率限制（用户 3 次/天、IP 10 次/天）。`validate.ts` 已有长度校验。

**缺少的安全措施**

- HTML 标签未清理（内容会渲染到邮件模板，存储型 XSS 风险）
- Unicode 零宽字符未检测（可绕过关键词过滤）
- Unicode 同形字未检测（全角字符绕过中文敏感词）

**建议方案**

在 `checkModeration` 函数中，先用 `stripHtml` 和 `stripInvisibleChars` 清理输入，再执行原有的 URL / 关键词 / 重复检测。

**验收标准**

- 包含 `<script>` 标签的内容被清理后再校验
- 零宽字符无法绕过关键词过滤
- 现有测试不受影响

---

## P2 — 持续改进

### 6. R2 增量缓存启用

**问题**

`open-next.config.ts` 中 `r2IncrementalCache` 被注释掉，所有页面每次请求都重新渲染。

**建议方案**

1. Cloudflare Dashboard 创建 R2 Bucket
2. wrangler.jsonc 添加 R2 绑定
3. open-next.config.ts 取消注释并配置 incrementalCache

**验收标准**

- 重复访问同一页面时第二次请求耗时明显降低
- 个性化内容不被错误缓存

---

### 7. 页面级缓存策略

**问题**

即使启用 R2 缓存，也需要为不同页面制定差异化策略。

**建议方案**

| 页面 | 缓存策略 | 理由 |
|------|----------|------|
| / (首页) | revalidate: 3600 | 静态内容 |
| /explore/[slug] | revalidate: 86400 | 星座信息基本不变 |
| /today (无 profile) | revalidate: 3600 | 基础模式按日轮换 |
| /today (有 profile) | force-dynamic | 个性化内容 |
| /chart | force-dynamic | 依赖用户 profile |
| /relationship | force-dynamic | 双人计算 |
| /mail | force-dynamic | UGC 内容 |
| /wishes | force-dynamic | 用户私有数据 |

---

### 8. UI 组件测试覆盖

**问题**

全部 25 个测试文件均为纯逻辑测试，没有任何组件渲染测试。关键交互路径无自动化保护。

**建议方案**

引入 Vitest + React Testing Library（jsdom 环境），按风险排序添加测试：Onboarding 流程 > 星盘可视化 > 星邮撰写。

**验收标准**

- 核心交互路径有至少 1 个渲染测试
- 组件测试与逻辑测试均可通过 npm test 统一运行

---

### 9. 关系星图文案丰富度

**现状**

`src/lib/relation.ts` 的评分和模板选择是算法驱动的：天文引擎计算本命星盘 → 合盘相位检测 → 按行星对 + 相位类型 + 强度加权评分 → 选择对应的内容模板。算法本身没有问题。

**问题在于文案池的深度**

当前 4 套 ContentTemplate（VENUS_MOON、MARS、SATURN、OUTER_PLANET）+ 1 个 DEFAULT，每套只有 2-3 条 attraction/misunderstanding。算法虽然能选出正确的模板组合，但文案池太浅——同一模板下的用户看到的句子完全相同。

**建议方案**

不改变算法结构，只扩充每套模板的文案条数，并新增按行星细分的模板：

- 现有模板每套 attraction/misunderstanding 扩充到 5-8 条，growth/advice 扩充到 3 条
- 新增 MERCURY（沟通/思维）、JUPITER（成长/乐观）模板
- 新增组合模板：VENUS_MARS（激情+浪漫）、MOON_SATURN（情感+责任）

这样算法选择的维度不变，但每个维度下的内容丰富度显著提升。

---

### 10. 国际化预留

**问题**

所有文案、UI 文本、星座名称均为中文硬编码。

**建议方案**

使用 Next.js middleware + 路由前缀（/zh/、/en/），文案提取到 src/i18n/，数据层文案与 UI 文案分离。

---

## 改进时间线

| 阶段 | 时间 | 内容 |
|------|------|------|
| **上线前** | 0.5 天 | #1 rate-limit bug 修复 |
| **上线后第一周** | 3-5 天 | #2 性能优化、#3 边界守护、#5 星邮安全 |
| **第二周** | 5 天 | #4 数据持久化、#8 组件测试 |
| **第三周** | 3 天 | #6 R2 缓存、#7 缓存策略、#9 模板扩展 |
| **按需** | - | #10 国际化预留 |

---

## 参考文件

| 改进项 | 涉及文件 |
|--------|---------|
| #1 rate-limit bug | `src/lib/auth/rate-limit.ts`, `src/lib/auth/d1-mock.ts`, `src/lib/auth/rate-limit.test.ts` |
| #2 性能优化 | `src/lib/astronomy.ts` |
| #3 边界守护 | `src/data/zodiacs.ts`, `src/lib/astronomy.test.ts`, `src/lib/astrology.ts` |
| #4 数据持久化 | `src/lib/store.ts`, `src/app/api/wishes/` (新建), D1 schema |
| #5 星邮安全 | `src/lib/star-mail/moderation.ts` |
| #6 R2 缓存 | `open-next.config.ts`, `wrangler.jsonc` |
| #7 缓存策略 | `src/app/*/page.tsx`, `open-next.config.ts` |
| #8 组件测试 | `src/app/**/*.test.tsx` (新建), `vitest.config.ts` |
| #9 模板扩展 | `src/lib/relation.ts` |
| #10 国际化 | `src/i18n/` (新建), `middleware.ts` (新建) |