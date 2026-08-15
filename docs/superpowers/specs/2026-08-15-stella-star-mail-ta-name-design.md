# 星邮 · 收件人昵称字段（Ta 的昵称）· 实现设计

> 日期：2026-08-15 ｜ 项目：星语星愿 / Stella ｜ 状态：已确认
> 前置：星邮主功能已实现并合入 main（见 `docs/superpowers/specs/2026-08-15-stella-star-mail-design.md`）。本文是增量改动。

## 目标

写信时填写收件人昵称，信件抬头从「亲爱的 Ta：」变为「亲爱的 {昵称}：」，让信更私人化。

## 决策（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 必填/选填 | **必填**——不填昵称不能预览/发送 |
| 长度 | ≤ 20 字 |
| placeholder | 「比如：小星 / 小冉」 |
| 抬头替换位置 | **预览信纸 + 邮件模板**两处（封存动画信纸只显示 To: Ta + 标题 + 正文，无「亲爱的 Ta：」行，不改） |
| 数据归属 | 昵称只在内存流转 → Resend 邮件；**不入 D1**（`star_mails` 表结构不变，保持「只留必要发送记录」隐私原则） |
| 风控 | 昵称并入 moderation 扫描文本（也是进邮件的用户输入） |
| 旧草稿兼容 | localStorage 旧草稿无 `taName` → 加载为默认空串，必填校验兜底，不报错 |

## 数据流

```
写信表单 taName(必填, ≤20)
 → StarMailDraft.taName
 → POST /api/star-mail/send body: { ..., taName }
 → validateStarMail（必填 INVALID? 超长 TA_NAME_TOO_LONG）
 → checkModeration（title+body+signature+taName 合并扫描）
 → buildStarMailHtml({ title, body, signature, taName }) → 「亲爱的 {taName}：」
```

## 改动点

### 类型与纯函数（TDD）
- `src/lib/star-mail/types.ts`：`StarMailDraft` 增加 `taName: string`。
- `src/lib/star-mail/validate.ts`：新增 `TA_NAME_MAX = 20`；`validateStarMail` 输入增加 `taName`；必填（trim 非空，否则 `{ field: "taName", reason: "TA_NAME_EMPTY" }`）+ 超长 `TA_NAME_TOO_LONG`；返回 `ok:true` 时带 normalize 后的 `taName`。
- `src/lib/star-mail/moderation.ts`：`checkModeration` 输入增加 `taName`，并入 `text` 拼接。
- `src/lib/star-mail/template.ts`：`buildStarMailHtml` 增加 `taName` 参数，`亲爱的 Ta：` → `亲爱的 {escapeHtml(taName)}：`。

### API
- `src/app/api/star-mail/send/route.ts`：读 `taName`（string 强转），传入 `validateStarMail` / `checkModeration` / `buildStarMailHtml`。

### UI
- `src/components/mail/MailCompose.tsx`：邮箱下方新增「Ta 的昵称」input（placeholder「比如：小星 / 小冉」，maxLength 20）；`handlePreview` 增加「请填写 Ta 的昵称」客户端校验；草稿保存/加载带 `taName`（旧草稿缺省空串）。
- `src/components/mail/MailPreview.tsx`：「亲爱的 Ta：」→「亲爱的 {draft.taName}：」。
- `src/components/mail/MailSealing.tsx`：发送 payload 带 `taName`（信纸无「亲爱的 Ta：」行，抬头不改）。

### 测试
- `validate.test.ts`：taName 必填空/超长/正常 normalize。
- `moderation.test.ts`：昵称命中关键词。
- `template.test.ts`：`亲爱的 {taName}：` 转义输出。

## 验证
- vitest / tsc / lint / `npm run build`。
- 浏览器：写信必填昵称才能预览；预览信纸/封存动画抬头为昵称；刷新草稿保留昵称；真实邮件抬头为昵称（人工）。
