# 星邮（Star Mail）· 实现设计

> 日期：2026-08-15 ｜ 项目：星语星愿 / Stella ｜ 状态：已确认
> 产品设计见 `docs/Stella_星邮彩蛋功能设计文档.md`（V1.0）。本文档只记录**工程实现决策**，不复述产品文案。

## 目标与范围

为 Stella 增加隐藏式情感彩蛋「星邮」：用户写一封信给 Ta，Stella 以主题化邮件代发。按文档 P0 范围实现，三个范围裁切（已与用户确认）：

| 决策点 | 结论 |
|---|---|
| 定时发送 | **只做 UI 占位**：写信页「立即寄出 / 定时寄出」切换，定时项禁用 + 「即将上线」标签，点击给提示文案；不建字段、不做后端。理由：真实定时发送需加密存正文至寄出时刻，与「寄出后删除信件 / 不长期保存」隐私原则冲突，且需 cron/队列。 |
| 登录限制 | **写信可、发送时要求登录**：未登录可进入 `/mail` 写信/预览（草稿在 localStorage）；点「封存/发送」时校验会话，未登录引导去登录页，登录后返回继续。 |
| 内容风控 | **轻量规则先上**：URL 数量、垃圾广告关键词黑名单、单行重复检测；命中即拒绝。规则可迭代，不引入模型。 |

隐私原则（文档 §13）：信件正文**永不入库**，只在内存组装 → Resend 发送 → 丢弃。后台仅存脱敏元数据。

## 架构

单页 `/mail`（服务端包装页 + 客户端视图，沿用现有惯例）+ 一个 Route Handler。

客户端步骤机：

```
intro → compose → preview → sealing(动画) → sent
```

- 直接访问 `/mail` 显示 intro（彩蛋感落地页：深夜蓝、星点、月亮、极少量星轨、大面积留白 + 「写封信给 Ta」）。
- 表单各步骤数据保存在父组件 state；草稿自动保存到 localStorage（`xingyu-starmail-draft`）。
- sealing 动画为纯 CSS 2~4s：信纸折叠 → 信封 → 星光 → 沿星轨飞走；文案「把这份心意交给星星。」→「正在寄出……」。

## API

`POST /api/star-mail/send`，请求体：

```jsonc
{
  "recipient": "a@example.com",
  "title": "有些话想告诉你",      // 可选，默认同文案，≤60
  "signature": "R",              // ≤30
  "body": "……",                 // 1~2000
  "turnstileToken": "…"
}
```

服务端顺序：

1. 读会话 cookie → `verifySession`；无效返回 `401 NOT_LOGGED_IN`。
2. 校验 body 形状 → `400 INVALID_BODY`。
3. 邮箱格式（复用 `isValidEmail`）→ `400 INVALID_EMAIL`。
4. Turnstile 验证（复用 `verifyTurnstileToken`）→ `403 TURNSTILE_FAILED`。
5. 长度规则 → `400 INVALID_FIELD`（字段级信息：标题/正文/署名超限）。
6. 内容风控 → `403 SPAM_DETECTED`。
7. 限流：用户 3 封/天 + IP 10 封/天（24h 窗口，复用 `rate_limits` 表）→ `429 RATE_LIMITED`。
8. D1 写 `star_mails` 记录（脱敏元数据，正文不入库）。
9. Resend 发送主题化 HTML 邮件；失败则删除/标记记录并 `500 SEND_FAILED`。
10. 返回 `{ ok: true, maskedRecipient: "a***@example.com" }`。

未登录时客户端不应发起请求：preview 页「封存这封信」点击前用 `useAuth()` 检查，未登录先展示登录引导（跳 `/login?next=/mail`，登录后返回 `/mail` 继续）。

**收件邮箱确认**（文档 §7「提交前再次确认」）：preview 页顶部展示收件邮箱，附勾选框「我已确认收件邮箱准确无误」，未勾选则「封存这封信」禁用。

**登录引导与返回**：preview 页点击「封存这封信」时若 `useAuth()` 为未登录，显示内联提示卡「发送需要登录 Stella，你的信会在本地草稿中保留。」+ StarButton「去登录」指向 `/login?next=/mail`。登录页（`login-view.tsx`）读取 `next` 参数，登录成功后自动跳回；为此给 `AccountCard` 增加可选 `onAuthed?: () => void` 回调，登录成功时调用。

## 数据层

### D1 新表 `star_mails`（运行期 CREATE TABLE IF NOT EXISTS，沿用现有模式）

```sql
CREATE TABLE IF NOT EXISTS star_mails (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  recipient        TEXT NOT NULL,        -- 脱敏：a***@example.com
  recipient_domain TEXT NOT NULL,        -- 脱敏后域名（统计/防滥用）
  title            TEXT NOT NULL,
  signature        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'sent',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
```

> 正文、收件人原文**不入库**。`recipient` 存脱敏串用于成功页回显与记录审计。

### 限流（复用 `rate_limits` 表）

新增 `claimDailyRate(db, key, max, now)`：24h 窗口，原子 UPDATE count+1 WHERE count < max，同现有 `claimRate` 模式。键：

- `starmail:user:{uid}` → max 3
- `starmail:ip:{ip}` → max 10

## 邮件模板（Resend HTML）

`src/lib/star-mail/template.ts` 返回 HTML 字符串：

- 暖白底 `#FFFDF6`，深夜蓝文字 `#1B2034`，金色星星分隔线。
- 版式：✦ + Stella 标题「一封来自星空的信」→ 用户标题 → 「亲爱的 Ta：」+ 正文（换行转 `<br>`）→ 署名 → 页脚「有些话，写下来就已经很好了。—— Stella」。
- **所有用户字段 HTML 转义**（title/body/signature），防注入。
- Subject：`一封来自星空的信`（不泄露用户标题以外的信息）。
- From：`STAR_MAIL_FROM_EMAIL = "Stella · 星邮 <stella@mail.ranran.org.cn>"`（同一已验证域名 `mail.ranran.org.cn`）。

## 文件清单

新增：

- `src/app/mail/page.tsx` — 服务端包装页（metadata）
- `src/app/mail/mail-view.tsx` — 客户端步骤机编排
- `src/components/mail/MailIntro.tsx`
- `src/components/mail/MailCompose.tsx`
- `src/components/mail/MailPreview.tsx`
- `src/components/mail/MailSealing.tsx`
- `src/components/mail/MailSent.tsx`
- `src/app/api/star-mail/send/route.ts`
- `src/lib/star-mail/validate.ts` — 长度规则 + 收件确认逻辑
- `src/lib/star-mail/moderation.ts` — 轻量风控
- `src/lib/star-mail/mask.ts` — 邮箱脱敏
- `src/lib/star-mail/template.ts` — Resend HTML
- `src/lib/star-mail/db.ts` — star_mails 表 + 写记录
- `src/lib/star-mail/validate.test.ts`、`moderation.test.ts`、`mask.test.ts` — vitest

修改：

- `src/lib/auth/rate-limit.ts` — 新增 `claimDailyRate`
- `src/app/relationship/relationship-view.tsx` — 结果页追加星邮收尾卡片
- `src/app/page.tsx` — 首页 Hero 追加可点流星入口
- `src/components/AccountCard.tsx` — 新增可选 `onAuthed` 回调
- `src/app/login/login-view.tsx` — 读取 `next` 参数、登录成功后跳回
- `wrangler.jsonc` / `.dev.vars` — 新增 `STAR_MAIL_FROM_EMAIL`
- `src/components/Turnstile.tsx` — 无需改动，复用

## 内容风控规则（v1）

- URL 数量 > 2（`http(s)://` 或 `www.`）→ `SPAM_URL`
- 标题/正文/署名命中垃圾广告黑名单（如「加微信/兼职/贷款/博彩/刷单/代开发票/免费领取/点击链接」等）→ `SPAM_KEYWORD`
- 正文同一行重复 ≥ 5 次 → `SPAM_REPEAT`
- 黑名单维护在 `moderation.ts` 常量，便于迭代

## 入口

1. **关系星图结果页**（`relationship-view.tsx`）：结果下方追加收尾卡片「你和 Ta 的星星已经相遇。还有一句话，你一直没有告诉 Ta 吗？」+ StarButton「写封信给 Ta →」链接 `/mail`。
2. **首页 Hero**（`page.tsx`）：追加一颗可点击的流星，hover 提示「这里藏着一封信」，点击进 `/mail`。保持低调，不破坏彩蛋感。

## 测试与验证

- vitest：`mask`（邮箱脱敏边界）、`moderation`（URL/关键词/重复行）、`validate`（长度/空值）。
- 手工浏览器验证：完整流程（写信→预览→封存→已启程）、未登录发送被拦并引导登录、脱敏回显、限流提示、封存动画与 `prefers-reduced-motion`。
- 类型检查 / lint / 生产构建 / OpenNext 构建，与现有流程一致。
