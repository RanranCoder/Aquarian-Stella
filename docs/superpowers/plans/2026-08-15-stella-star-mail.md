# 星邮（Star Mail）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Stella 增加隐藏式情感彩蛋「星邮」：用户写一封信给 Ta，Stella 以主题化邮件代发，正文永不入库。

**Architecture:** 单页 `/mail`（服务端包装页 + 客户端步骤机 intro→compose→preview→sealing→sent）+ 一个 `POST /api/star-mail/send` Route Handler（登录→Turnstile→校验→风控→日限流→D1 记录→Resend 发信）。纯逻辑集中在 `src/lib/star-mail/`，UI 复用现有 GlassCard/StarButton/设计 token。**设计 skill 分工**：soft-skill（Ethereal Glass 视觉一致性）、ui-ux-pro-max（表单/状态/无障碍）、taste-skill（intro 落地页方向 + anti-slop 把关）。

**Tech Stack:** Next.js 16.3.1（App Router, OpenNext on Cloudflare）、React 19、TypeScript、Tailwind v4、D1、Resend、Turnstile、vitest。

## Global Constraints

- 产品文案：标题「有些话想告诉你」；副标「有些话，写下来就已经很好了。」；成功「已启程 / 这封信已经寄出。」；收件提示「请确认邮箱地址准确无误，Stella 会将这封信寄往这里。」
- 正文上限 2000 字、标题上限 60、署名上限 30；收件邮箱必填、标准格式。
- **隐私**：正文只在内存取、发完即弃，**永不写入 D1**；后台只存脱敏元数据。
- **范围裁切**（用户已确认）：定时发送=UI 占位（不建字段/不做后端）；登录门槛=写信可、发送时要求登录；内容风控=轻量规则。
- 复用现有组件（GlassCard / StarButton / Turnstile）、设计 token（`night-*` / `moon-*` / `lav-*` / `gold-*` / `glass` / `hairline`）、session 验证（`verifySession`）、D1 `rate_limits` 表。
- 项目用 vitest；运行期 `CREATE TABLE IF NOT EXISTS` 建表；`npm run typecheck` 不存在 → 用 `npx tsc --noEmit`；构建命令 `npm run build`。
- **本机有系统代理**：curl 测线上要加 `--noproxy '*'`。OpenNext 构建要求无 dev server 在跑。
- 服务端 env 类型在 `src/cloudflare-env.d.ts` 的 `CloudflareEnv` 接口手动维护（`npm run cf-typegen` 会重新生成）。

---

## 文件结构

**新增（纯逻辑，可单测）**
- `src/lib/star-mail/types.ts` — `StarMailDraft`、`STAR_MAIL_DRAFT_KEY`
- `src/lib/star-mail/mask.ts` — `maskEmail`
- `src/lib/star-mail/validate.ts` — `isValidEmailShape`、`validateStarMail`、长度常量
- `src/lib/star-mail/signature.ts` — `ANONYMOUS_SIGNATURE`、`resolveSignature`
- `src/lib/star-mail/moderation.ts` — `checkModeration`（URL/关键词/重复行）
- `src/lib/star-mail/template.ts` — `escapeHtml`、`buildStarMailHtml`
- `src/lib/star-mail/db.ts` — `insertStarMailRecord`
- `src/lib/star-mail/*.test.ts` — 对应 vitest

**新增（API / UI）**
- `src/app/api/star-mail/send/route.ts`
- `src/app/mail/page.tsx`、`src/app/mail/mail-view.tsx`
- `src/app/mail/mail-sealing.css`
- `src/components/mail/MailIntro.tsx`、`MailCompose.tsx`、`MailPreview.tsx`、`MailSealing.tsx`、`MailSent.tsx`

**修改**
- `src/lib/auth/rate-limit.ts`（新增 `claimDailyRate`）
- `src/lib/auth/d1-mock.ts`（新增 `star_mails` 处理 + `getStarMails()`）
- `src/cloudflare-env.d.ts`（新增 `STAR_MAIL_FROM_EMAIL`）
- `wrangler.jsonc`（vars 新增 `STAR_MAIL_FROM_EMAIL`）
- `.dev.vars`（本地新增同一变量；gitignored，不提交）
- `src/components/AccountCard.tsx`（可选 `onAuthed` 回调）
- `src/app/login/page.tsx` + `login-view.tsx`（`next` 参数跳回）
- `src/app/relationship/relationship-view.tsx`（结果页星邮收尾卡）
- `src/app/page.tsx`（首页 Hero 流星入口）

---

### Task 1: 星邮基础类型与纯函数（types / mask / validate / signature）

**Files:**
- Create: `src/lib/star-mail/types.ts`
- Create: `src/lib/star-mail/mask.ts`
- Create: `src/lib/star-mail/validate.ts`
- Create: `src/lib/star-mail/signature.ts`
- Test: `src/lib/star-mail/mask.test.ts`、`validate.test.ts`、`signature.test.ts`

**Interfaces:**
- Produces:
  - `export interface StarMailDraft { recipient: string; title: string; signatureType: "name" | "anonymous" | "custom"; customSignature: string; body: string }`
  - `export const STAR_MAIL_DRAFT_KEY = "xingyu-starmail-draft"`
  - `export function maskEmail(email: string): string`
  - `export const TITLE_MAX = 60`, `export const BODY_MAX = 2000`, `export const SIGNATURE_MAX = 30`
  - `export function isValidEmailShape(email: string): boolean`
  - `export type Validation = { ok: true; recipient: string; title: string; body: string; signature: string } | { ok: false; field: "recipient" | "title" | "body" | "signature"; reason: "INVALID_EMAIL" | "TITLE_TOO_LONG" | "BODY_EMPTY" | "BODY_TOO_LONG" | "SIGNATURE_TOO_LONG" }`
  - `export function validateStarMail(input: { recipient: string; title: string; body: string; signature: string }): Validation`
  - `export const ANONYMOUS_SIGNATURE = "一个想把这句话告诉你的人"`
  - `export function resolveSignature(draft: { signatureType: StarMailDraft["signatureType"]; customSignature: string }, nickname?: string): string`
- Consumes: 无（纯函数，不 import 任何 auth 模块，保证可进客户端 bundle）

- [ ] **Step 1: 写失败的测试**

```ts
// src/lib/star-mail/mask.test.ts
import { describe, expect, it } from "vitest";
import { maskEmail } from "./mask";

describe("maskEmail", () => {
  it("masks the local part after the first char", () => {
    expect(maskEmail("a@example.com")).toBe("a***@example.com");
    expect(maskEmail("zhangsan@163.com")).toBe("z***@163.com");
  });
  it("keeps the domain intact", () => {
    expect(maskEmail("loveyou@gmail.com")).toBe("l***@gmail.com");
  });
});
```

```ts
// src/lib/star-mail/validate.test.ts
import { describe, expect, it } from "vitest";
import { validateStarMail, isValidEmailShape, BODY_MAX, SIGNATURE_MAX, TITLE_MAX } from "./validate";

describe("isValidEmailShape", () => {
  it("accepts normal emails", () => {
    expect(isValidEmailShape("a@b.com")).toBe(true);
    expect(isValidEmailShape("hello.world@sub.example.org")).toBe(true);
  });
  it("rejects malformed emails", () => {
    expect(isValidEmailShape("")).toBe(false);
    expect(isValidEmailShape("nope")).toBe(false);
    expect(isValidEmailShape("a@b")).toBe(false);
    expect(isValidEmailShape("a b@c.com")).toBe(false);
  });
});

describe("validateStarMail", () => {
  const base = { recipient: "ta@gmail.com", title: "有些话想告诉你", body: "你好。", signature: "R" };
  it("passes valid input and returns normalized fields", () => {
    const r = validateStarMail({ ...base, recipient: "  Ta@Gmail.com  ", title: "  标题  " });
    expect(r).toEqual({ ok: true, recipient: "ta@gmail.com", title: "标题", body: "你好。", signature: "R" });
  });
  it("rejects invalid recipient", () => {
    expect(validateStarMail({ ...base, recipient: "bad" })).toMatchObject({ ok: false, field: "recipient" });
  });
  it("rejects empty body", () => {
    expect(validateStarMail({ ...base, body: "   " })).toMatchObject({ ok: false, field: "body", reason: "BODY_EMPTY" });
  });
  it("rejects body over the max", () => {
    expect(validateStarMail({ ...base, body: "x".repeat(BODY_MAX + 1) })).toMatchObject({ ok: false, field: "body", reason: "BODY_TOO_LONG" });
  });
  it("rejects title over the max", () => {
    expect(validateStarMail({ ...base, title: "x".repeat(TITLE_MAX + 1) })).toMatchObject({ ok: false, field: "title" });
  });
  it("rejects signature over the max", () => {
    expect(validateStarMail({ ...base, signature: "x".repeat(SIGNATURE_MAX + 1) })).toMatchObject({ ok: false, field: "signature" });
  });
});
```

```ts
// src/lib/star-mail/signature.test.ts
import { describe, expect, it } from "vitest";
import { ANONYMOUS_SIGNATURE, resolveSignature } from "./signature";

describe("resolveSignature", () => {
  it("uses nickname for type=name", () => {
    expect(resolveSignature({ signatureType: "name", customSignature: "" }, "小明")).toBe("小明");
  });
  it("falls back to anonymous phrase when nickname missing", () => {
    expect(resolveSignature({ signatureType: "name", customSignature: "" }, undefined)).toBe(ANONYMOUS_SIGNATURE);
    expect(resolveSignature({ signatureType: "name", customSignature: "" }, "   ")).toBe(ANONYMOUS_SIGNATURE);
  });
  it("uses anonymous phrase for type=anonymous", () => {
    expect(resolveSignature({ signatureType: "anonymous", customSignature: "" })).toBe(ANONYMOUS_SIGNATURE);
  });
  it("uses custom text for type=custom, trimmed", () => {
    expect(resolveSignature({ signatureType: "custom", customSignature: "  —— R  " })).toBe("—— R");
  });
  it("caps signature at SIGNATURE_MAX", () => {
    expect(resolveSignature({ signatureType: "custom", customSignature: "x".repeat(99) }).length).toBeLessThanOrEqual(30);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/star-mail/mask.test.ts src/lib/star-mail/validate.test.ts src/lib/star-mail/signature.test.ts`
Expected: FAIL（模块不存在 / 函数未定义）

- [ ] **Step 3: 实现**

```ts
// src/lib/star-mail/types.ts
export interface StarMailDraft {
  recipient: string;
  title: string;
  signatureType: "name" | "anonymous" | "custom";
  customSignature: string;
  body: string;
}

export const STAR_MAIL_DRAFT_KEY = "xingyu-starmail-draft";
```

```ts
// src/lib/star-mail/mask.ts
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}
```

```ts
// src/lib/star-mail/validate.ts
export const TITLE_MAX = 60;
export const BODY_MAX = 2000;
export const SIGNATURE_MAX = 30;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailShape(email: string): boolean {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email);
}

export type Validation =
  | { ok: true; recipient: string; title: string; body: string; signature: string }
  | {
      ok: false;
      field: "recipient" | "title" | "body" | "signature";
      reason: "INVALID_EMAIL" | "TITLE_TOO_LONG" | "BODY_EMPTY" | "BODY_TOO_LONG" | "SIGNATURE_TOO_LONG";
    };

export function validateStarMail(input: {
  recipient: string;
  title: string;
  body: string;
  signature: string;
}): Validation {
  const recipient = input.recipient.trim().toLowerCase();
  if (!isValidEmailShape(recipient)) return { ok: false, field: "recipient", reason: "INVALID_EMAIL" };
  const title = input.title.trim();
  if (title.length > TITLE_MAX) return { ok: false, field: "title", reason: "TITLE_TOO_LONG" };
  const body = input.body;
  if (body.trim().length === 0) return { ok: false, field: "body", reason: "BODY_EMPTY" };
  if (body.length > BODY_MAX) return { ok: false, field: "body", reason: "BODY_TOO_LONG" };
  const signature = input.signature.trim();
  if (signature.length > SIGNATURE_MAX) return { ok: false, field: "signature", reason: "SIGNATURE_TOO_LONG" };
  return { ok: true, recipient, title, body, signature };
}
```

```ts
// src/lib/star-mail/signature.ts
import { SIGNATURE_MAX } from "./validate";

export const ANONYMOUS_SIGNATURE = "一个想把这句话告诉你的人";

export function resolveSignature(
  draft: { signatureType: "name" | "anonymous" | "custom"; customSignature: string },
  nickname?: string,
): string {
  if (draft.signatureType === "name") {
    const name = nickname?.trim();
    return (name || ANONYMOUS_SIGNATURE).slice(0, SIGNATURE_MAX);
  }
  if (draft.signatureType === "custom") {
    return (draft.customSignature.trim() || ANONYMOUS_SIGNATURE).slice(0, SIGNATURE_MAX);
  }
  return ANONYMOUS_SIGNATURE;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/star-mail/mask.test.ts src/lib/star-mail/validate.test.ts src/lib/star-mail/signature.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/star-mail
git commit -m "feat: 星邮纯函数（脱敏/校验/署名解析）"
```

---

### Task 2: 内容风控（moderation）

**Files:**
- Create: `src/lib/star-mail/moderation.ts`
- Test: `src/lib/star-mail/moderation.test.ts`

**Interfaces:**
- Produces: `export type Moderation = { allowed: true } | { allowed: false; reason: "SPAM_URL" | "SPAM_KEYWORD" | "SPAM_REPEAT" }`；`export function checkModeration(input: { title: string; body: string; signature: string }): Moderation`
- Consumes: 无

- [ ] **Step 1: 写失败的测试**

```ts
// src/lib/star-mail/moderation.test.ts
import { describe, expect, it } from "vitest";
import { checkModeration } from "./moderation";

const base = { title: "标题", body: "正文内容", signature: "R" };

describe("checkModeration", () => {
  it("allows clean content", () => {
    expect(checkModeration(base)).toEqual({ allowed: true });
  });
  it("rejects more than 2 URLs", () => {
    const body = "见 https://a.com/1 和 https://b.com/2 还有 www.c.com/3";
    expect(checkModeration({ ...base, body })).toEqual({ allowed: false, reason: "SPAM_URL" });
  });
  it("allows a single URL (e.g. personal site)", () => {
    expect(checkModeration({ ...base, body: "这是我的主页 https://me.example.com" })).toEqual({ allowed: true });
  });
  it("rejects spam keywords in any field", () => {
    expect(checkModeration({ ...base, signature: "加微信看更多" })).toEqual({ allowed: false, reason: "SPAM_KEYWORD" });
  });
  it("rejects a body line repeated 5+ times", () => {
    const body = Array.from({ length: 5 }, () => "关注我").join("\n");
    expect(checkModeration({ ...base, body })).toEqual({ allowed: false, reason: "SPAM_REPEAT" });
  });
  it("allows 4 repeats (below threshold)", () => {
    const body = Array.from({ length: 4 }, () => "想你").join("\n");
    expect(checkModeration({ ...base, body })).toEqual({ allowed: true });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/star-mail/moderation.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
// src/lib/star-mail/moderation.ts
const SPAM_KEYWORDS = [
  "加微信", "加v", "兼职", "贷款", "博彩", "彩票", "中奖", "高收益",
  "刷单", "代开发票", "免费领取", "点击链接", "开户", "日赚", "躺赚",
  "数字货币", "币圈", "杀猪盘", "裸聊", "约炮", "联系客服", "转账",
];

const URL_RE = /(https?:\/\/|www\.)\S+/gi;

export type Moderation =
  | { allowed: true }
  | { allowed: false; reason: "SPAM_URL" | "SPAM_KEYWORD" | "SPAM_REPEAT" };

export function checkModeration(input: {
  title: string;
  body: string;
  signature: string;
}): Moderation {
  const text = `${input.title}\n${input.body}\n${input.signature}`;
  const urls = text.match(URL_RE) ?? [];
  if (urls.length > 2) return { allowed: false, reason: "SPAM_URL" };

  const lower = text.toLowerCase();
  for (const kw of SPAM_KEYWORDS) {
    if (lower.includes(kw)) return { allowed: false, reason: "SPAM_KEYWORD" };
  }

  const seen = new Map<string, number>();
  for (const line of input.body.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const n = (seen.get(t) ?? 0) + 1;
    if (n >= 5) return { allowed: false, reason: "SPAM_REPEAT" };
    seen.set(t, n);
  }

  return { allowed: true };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/star-mail/moderation.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/star-mail/moderation.ts src/lib/star-mail/moderation.test.ts
git commit -m "feat: 星邮轻量内容风控"
```

---

### Task 3: 邮件模板（template）

**Files:**
- Create: `src/lib/star-mail/template.ts`
- Test: `src/lib/star-mail/template.test.ts`

**Interfaces:**
- Produces: `export function escapeHtml(s: string): string`；`export function buildStarMailHtml(opts: { title: string; body: string; signature: string }): string`
- Consumes: 无

- [ ] **Step 1: 写失败的测试**

```ts
// src/lib/star-mail/template.test.ts
import { describe, expect, it } from "vitest";
import { buildStarMailHtml, escapeHtml } from "./template";

describe("escapeHtml", () => {
  it("escapes HTML metacharacters", () => {
    expect(escapeHtml("<script>alert('x')</script>")).toBe("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(escapeHtml("a & b \"q\"")).toBe("a &amp; b &quot;q&quot;");
  });
});

describe("buildStarMailHtml", () => {
  it("embeds escaped title, body and signature", () => {
    const html = buildStarMailHtml({ title: "你好 <Ta>", body: "第一行\n第二行", signature: "R" });
    expect(html).toContain("你好 &lt;Ta&gt;");
    expect(html).toContain("第一行<br>第二行");
    expect(html).toContain("—— R");
    expect(html).toContain("有些话，写下来就已经很好了。");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/star-mail/template.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// src/lib/star-mail/template.ts
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildStarMailHtml(opts: { title: string; body: string; signature: string }): string {
  const title = escapeHtml(opts.title);
  const signature = escapeHtml(opts.signature);
  const body = opts.body.split("\n").map(escapeHtml).join("<br>");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<body style="margin:0;padding:0;background:#FFFDF6;color:#1B2034;font-family:'PingFang SC','Microsoft YaHei',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 28px;">
    <div style="text-align:center;color:#B08D55;letter-spacing:6px;font-size:20px;padding-bottom:6px;">✦</div>
    <h1 style="text-align:center;font-size:22px;font-weight:600;margin:0;color:#0D1124;">Stella · 一封来自星空的信</h1>
    <p style="text-align:center;font-size:12px;color:#9E98B3;margin:6px 0 0;">星语 · 星愿 · 星邮</p>
    <hr style="border:none;border-top:1px solid #EAD9B4;margin:26px 0;">
    <h2 style="font-size:16px;font-weight:600;margin:0 0 14px;color:#0D1124;">${title}</h2>
    <p style="font-size:15px;line-height:1.9;color:#1B2034;margin:0 0 8px;">亲爱的 Ta：</p>
    <p style="font-size:15px;line-height:1.9;color:#1B2034;margin:0 0 18px;">${body}</p>
    <p style="text-align:right;font-size:14px;color:#1B2034;margin:0;">—— ${signature}</p>
    <hr style="border:none;border-top:1px solid #EAD9B4;margin:26px 0;">
    <p style="text-align:center;font-size:13px;color:#837D9C;margin:0;">有些话，写下来就已经很好了。</p>
    <p style="text-align:center;font-size:13px;color:#837D9C;margin:4px 0 0;">—— Stella</p>
  </div>
</body>
</html>`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/star-mail/template.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/star-mail/template.ts src/lib/star-mail/template.test.ts
git commit -m "feat: 星邮主题化邮件模板（含 HTML 转义）"
```

---

### Task 4: D1 记录层（db + mock 扩展）

**Files:**
- Create: `src/lib/star-mail/db.ts`
- Modify: `src/lib/auth/d1-mock.ts`（新增 `star_mails` 处理 + `getStarMails()`）
- Test: `src/lib/star-mail/db.test.ts`

**Interfaces:**
- Produces: `export interface StarMailRecord { userId: number; recipient: string; recipientDomain: string; title: string; signature: string }`；`export async function insertStarMailRecord(db: D1Database, rec: StarMailRecord): Promise<void>`
- Consumes: `D1Database`（@cloudflare/workers-types）、`MemoryD1.getStarMails()`（仅测试用）

- [ ] **Step 1: 写失败的测试**

```ts
// src/lib/star-mail/db.test.ts
import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { MemoryD1 } from "@/lib/auth/d1-mock";
import { insertStarMailRecord } from "./db";

describe("insertStarMailRecord", () => {
  it("inserts a masked metadata record", async () => {
    const db = new MemoryD1();
    const d = db as unknown as D1Database;
    await insertStarMailRecord(d, {
      userId: 7,
      recipient: "a***@gmail.com",
      recipientDomain: "gmail.com",
      title: "有些话想告诉你",
      signature: "R",
    });
    const rows = db.getStarMails();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: 7,
      recipient: "a***@gmail.com",
      recipient_domain: "gmail.com",
      title: "有些话想告诉你",
      signature: "R",
      status: "sent",
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/star-mail/db.test.ts`
Expected: FAIL（db.ts 不存在；getStarMails 不存在）

- [ ] **Step 3: 扩展 MemoryD1 mock**（在 `src/lib/auth/d1-mock.ts` 的 `execute()` 中新增分支 + 一个查询方法）

在 `execute()` 的 `if (sql.includes("UPDATE rate_limits SET count = count + 1"))` 分支**之前**加入：

```ts
if (sql.includes("INSERT INTO star_mails")) {
  const [userId, recipient, recipientDomain, title, signature] = params as [number, string, string, string, string];
  const t = this.table("star_mails");
  const id = t.size + 1;
  t.set(String(id), { id, user_id: userId, recipient, recipient_domain: recipientDomain, title, signature, status: "sent" });
  return { success: true, meta: { changes: 1, last_row_id: id } };
}
```

在类末尾（`selectFirst` 方法后）新增：

```ts
/** 星邮记录查询（仅测试断言用）。 */
getStarMails(): Array<{ user_id: number; recipient: string; recipient_domain: string; title: string; signature: string; status: string }> {
  return Array.from(this.table("star_mails").values()) as Array<{
    user_id: number;
    recipient: string;
    recipient_domain: string;
    title: string;
    signature: string;
    status: string;
  }>;
}
```

- [ ] **Step 4: 实现 db.ts**

```ts
// src/lib/star-mail/db.ts
import type { D1Database } from "@cloudflare/workers-types";

const CREATE_STAR_MAILS = `CREATE TABLE IF NOT EXISTS star_mails (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  recipient        TEXT NOT NULL,
  recipient_domain TEXT NOT NULL,
  title            TEXT NOT NULL,
  signature        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'sent',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export interface StarMailRecord {
  userId: number;
  recipient: string;
  recipientDomain: string;
  title: string;
  signature: string;
}

export async function insertStarMailRecord(db: D1Database, rec: StarMailRecord): Promise<void> {
  await db.prepare(CREATE_STAR_MAILS).run();
  await db
    .prepare(
      "INSERT INTO star_mails (user_id, recipient, recipient_domain, title, signature, status) VALUES (?,?,?,?,?, 'sent')",
    )
    .bind(rec.userId, rec.recipient, rec.recipientDomain, rec.title, rec.signature)
    .run();
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run src/lib/star-mail/db.test.ts src/lib/auth/rate-limit.test.ts src/lib/auth/otp-store.test.ts`
Expected: 全部 PASS（确认 mock 改动没破坏既有测试）

- [ ] **Step 6: Commit**

```bash
git add src/lib/star-mail/db.ts src/lib/star-mail/db.test.ts src/lib/auth/d1-mock.ts
git commit -m "feat: 星邮 D1 发送记录层"
```

---

### Task 5: 日限流（rate-limit）

**Files:**
- Modify: `src/lib/auth/rate-limit.ts`（新增 `claimDailyRate`）
- Test: `src/lib/auth/rate-limit.test.ts`（追加用例）

**Interfaces:**
- Produces: `export async function claimDailyRate(db: D1Database, key: string, max: number, now: number): Promise<RateLimitResult>`
- Consumes: 复用文件内已有的 `claimSlot` / `ensureWindow` / `resetExpired`；`RateLimitResult` 已在文件导出

- [ ] **Step 1: 写失败的测试**（追加到 `src/lib/auth/rate-limit.test.ts` 的 `describe` 内）

```ts
it("claimDailyRate blocks after max and resets after 24h", async () => {
  const db = new MemoryD1();
  const d = db as unknown as D1Database;
  const now = Date.now();
  for (let i = 0; i < 3; i++) {
    expect((await claimDailyRate(d, "starmail:user:1", 3, now)).allowed).toBe(true);
  }
  expect((await claimDailyRate(d, "starmail:user:1", 3, now)).allowed).toBe(false);
  // 窗口过期后放行
  db.seed("rate_limits", "starmail:user:1", { count: 3, window_end: now - 1000 });
  expect((await claimDailyRate(d, "starmail:user:1", 3, now)).allowed).toBe(true);
});
```

同时更新该文件顶部 import：`import { claimDailyRate, claimRate } from "./rate-limit";`

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/auth/rate-limit.test.ts`
Expected: FAIL（claimDailyRate 未定义）

- [ ] **Step 3: 实现**（在 `src/lib/auth/rate-limit.ts` 的 `claimRate` 后追加）

```ts
const DAY_MS = 24 * 60 * 60 * 1000;

/** 24h 日限流（星邮用）：原子 claim，达到 max 即拒绝。 */
export async function claimDailyRate(
  db: D1Database,
  key: string,
  max: number,
  now: number,
): Promise<RateLimitResult> {
  const windowEnd = now + DAY_MS;
  const ok = await claimSlot(db, key, max, windowEnd, now);
  return ok ? { allowed: true } : { allowed: false, retryAfterSec: 24 * 60 * 60 };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/auth/rate-limit.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/rate-limit.ts src/lib/auth/rate-limit.test.ts
git commit -m "feat: 新增 24h 日限流（星邮用）"
```

---

### Task 6: 发送 API 路由 + env 接线

**Files:**
- Create: `src/app/api/star-mail/send/route.ts`
- Modify: `src/cloudflare-env.d.ts`（新增 `STAR_MAIL_FROM_EMAIL`）
- Modify: `wrangler.jsonc`（vars 新增 `STAR_MAIL_FROM_EMAIL`）
- Modify: `.dev.vars`（本地新增同名变量；**gitignored，不提交**）

**Interfaces:**
- Consumes: `verifySession`（`@/lib/auth/session`）、`SESSION_COOKIE`（`@/lib/auth/types`）、`verifyTurnstileToken`（`@/lib/auth/turnstile`）、`claimDailyRate`、`validateStarMail`、`checkModeration`、`maskEmail`、`insertStarMailRecord`、`buildStarMailHtml`、`getCloudflareContext`（`@opennextjs/cloudflare`）
- Produces: `POST /api/star-mail/send` → 200 `{ ok: true, maskedRecipient }`；错误码见实现

- [ ] **Step 1: 更新 env 类型与配置**

在 `src/cloudflare-env.d.ts` 的 `CloudflareEnv` 接口内、`TURNSTILE_SECRET_KEY` 后追加一行：

```ts
    STAR_MAIL_FROM_EMAIL: string;
```

在 `wrangler.jsonc` 的 `vars` 块追加：

```jsonc
"vars": {
  "AUTH_FROM_EMAIL": "Stella@mail.ranran.org.cn",
  "STAR_MAIL_FROM_EMAIL": "Stella · 星邮 <stella@mail.ranran.org.cn>"
}
```

在 `.dev.vars` 追加一行（本地联调用）：`STAR_MAIL_FROM_EMAIL="Stella · 星邮 <stella@mail.ranran.org.cn>"`

- [ ] **Step 2: 实现路由**

```ts
// src/app/api/star-mail/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/types";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { claimDailyRate } from "@/lib/auth/rate-limit";
import { validateStarMail } from "@/lib/star-mail/validate";
import { checkModeration } from "@/lib/star-mail/moderation";
import { maskEmail } from "@/lib/star-mail/mask";
import { insertStarMailRecord } from "@/lib/star-mail/db";
import { buildStarMailHtml } from "@/lib/star-mail/template";

const USER_DAY_LIMIT = 3;
const IP_DAY_LIMIT = 10;

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "NOT_LOGGED_IN" }, { status: 401 });
  const { env } = await getCloudflareContext({ async: true });
  const payload = await verifySession(token, env.AUTH_SECRET);
  if (!payload) return NextResponse.json({ error: "NOT_LOGGED_IN" }, { status: 401 });

  let body: Record<string, unknown> | null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const recipient = typeof body.recipient === "string" ? body.recipient : "";
  const title = typeof body.title === "string" ? body.title : "";
  const signature = typeof body.signature === "string" ? body.signature : "";
  const rawBody = typeof body.body === "string" ? body.body : "";
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  if (!turnstileToken) return NextResponse.json({ error: "MISSING_TURNSTILE" }, { status: 400 });

  const v = validateStarMail({ recipient, title, body: rawBody, signature });
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

  const mod = checkModeration({ title: v.title, body: v.body, signature: v.signature });
  if (!mod.allowed) return NextResponse.json({ error: mod.reason }, { status: 403 });

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const human = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!human) return NextResponse.json({ error: "TURNSTILE_FAILED" }, { status: 403 });

  const now = Date.now();
  const userRl = await claimDailyRate(env.DB, `starmail:user:${payload.uid}`, USER_DAY_LIMIT, now);
  if (!userRl.allowed) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  const ipRl = await claimDailyRate(env.DB, `starmail:ip:${ip}`, IP_DAY_LIMIT, now);
  if (!ipRl.allowed) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const masked = maskEmail(v.recipient);
  const domain = v.recipient.split("@")[1] ?? "";

  const html = buildStarMailHtml({ title: v.title, body: v.body, signature: v.signature });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.STAR_MAIL_FROM_EMAIL,
        to: [v.recipient],
        subject: "一封来自星空的信",
        html,
      }),
    });
    if (!res.ok) throw new Error(`resend failed: ${res.status}`);
  } catch {
    return NextResponse.json({ error: "SEND_FAILED" }, { status: 500 });
  }

  // 正文不入库；记录为 best-effort，记录失败不影响「已寄出」结果
  try {
    await insertStarMailRecord(env.DB, {
      userId: payload.uid,
      recipient: masked,
      recipientDomain: domain,
      title: v.title,
      signature: v.signature,
    });
  } catch {
    // 忽略：发送已成功，记录只是审计用途
  }

  return NextResponse.json({ ok: true, maskedRecipient: masked });
}
```

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误（`env.STAR_MAIL_FROM_EMAIL` 已加类型）

- [ ] **Step 4: lint**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/app/api/star-mail/send/route.ts src/cloudflare-env.d.ts wrangler.jsonc
git commit -m "feat: 星邮发送 API（登录+Turnstile+风控+日限流+Resend）"
```

---

### Task 7: 页面骨架 + intro 落地页

> 设计：此任务是星邮的「第一印象」。用 **taste-skill** 的读法：这是一张**迷你 landing**（intro），深夜蓝、大留白、一颗月亮、稀疏星点、一句 CTA，克制不铺张。用 **soft-skill** 的 Ethereal Glass token（`night-*`/`moon-*`/`gold-*`、`ease-luxe`）。禁止廉价默认：不加满屏玻璃渐变、不加三重等宽卡、动效只保留极少量 twinkle。

**Files:**
- Create: `src/app/mail/page.tsx`
- Create: `src/app/mail/mail-view.tsx`
- Create: `src/components/mail/MailIntro.tsx`

**Interfaces:**
- Produces: `src/app/mail/page.tsx`（服务端包装，metadata title「星邮」）；`MailIntro({ onStart }: { onStart: () => void })`
- Consumes: `StarButton`、`MoonIcon`/`SparkleIcon`（`@/components/icons`）

- [ ] **Step 1: 服务端包装页**

```tsx
// src/app/mail/page.tsx
import type { Metadata } from "next";
import { MailView } from "./mail-view";

export const metadata: Metadata = {
  title: "星邮",
  description:
    "有些话，也许现在说不出口。但你可以先把它写下来，让 Stella 替你寄给 Ta。",
};

export default function Page() {
  return <MailView />;
}
```

- [ ] **Step 2: 客户端步骤机**

```tsx
// src/app/mail/mail-view.tsx
"use client";

import { useState } from "react";
import { MailIntro } from "@/components/mail/MailIntro";
import { MailCompose } from "@/components/mail/MailCompose";
import { MailPreview } from "@/components/mail/MailPreview";
import { MailSealing } from "@/components/mail/MailSealing";
import { MailSent } from "@/components/mail/MailSent";
import { STAR_MAIL_DRAFT_KEY, type StarMailDraft } from "@/lib/star-mail/types";

type Step = "intro" | "compose" | "preview" | "sealing" | "sent";

export function errorText(reason: string): string {
  switch (reason) {
    case "RATE_LIMITED": return "今天寄出的信有点多了，明天再试试吧。";
    case "SPAM_URL": return "信件中包含过多链接，请移除后再试。";
    case "SPAM_KEYWORD": return "信件中包含疑似广告内容，请调整后再试。";
    case "SPAM_REPEAT": return "信件中重复内容过多，请调整后再试。";
    case "TURNSTILE_FAILED": return "人机验证未通过，请重试。";
    case "SEND_FAILED": return "信件暂时没有寄出，请稍后重试。";
    default: return "信件暂时没有寄出，请稍后重试。";
  }
}

export function MailView() {
  // 登录跳回 /mail 时，若本地有未寄出的草稿，直接回到写信步，而非 intro
  const [step, setStep] = useState<Step>(() =>
    typeof window !== "undefined" && window.localStorage.getItem(STAR_MAIL_DRAFT_KEY)
      ? "compose"
      : "intro",
  );
  const [draft, setDraft] = useState<StarMailDraft | null>(null);
  const [token, setToken] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [sendError, setSendError] = useState("");
  const [masked, setMasked] = useState("");

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col items-center justify-center px-5 py-14 md:py-20">
      {step === "intro" && <MailIntro onStart={() => setStep("compose")} />}

      {step === "compose" && (
        <MailCompose
          initial={draft}
          onPreview={(d) => {
            setDraft(d);
            setSendError("");
            setStep("preview");
          }}
        />
      )}

      {step === "preview" && (
        <MailPreview
          key={previewKey}
          draft={draft!}
          sendError={sendError}
          onEdit={() => setStep("compose")}
          onSeal={(t) => {
            setToken(t);
            setStep("sealing");
          }}
        />
      )}

      {step === "sealing" && (
        <MailSealing
          draft={draft!}
          turnstileToken={token}
          onDone={(m) => {
            setMasked(m);
            try {
              window.localStorage.removeItem(STAR_MAIL_DRAFT_KEY);
            } catch {
              // 忽略
            }
            setStep("sent");
          }}
          onError={(reason) => {
            setSendError(errorText(reason));
            setPreviewKey((k) => k + 1); // 让 Turnstile 重新渲染拿新 token
            setStep("preview");
          }}
        />
      )}

      {step === "sent" && <MailSent masked={masked} />}
    </div>
  );
}
```

- [ ] **Step 3: MailIntro**

```tsx
// src/components/mail/MailIntro.tsx
"use client";

import { StarButton } from "@/components/StarButton";
import { MoonIcon, SparkleIcon } from "@/components/icons";

export function MailIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex w-full flex-col items-center gap-6 py-10 text-center md:py-16">
      {/* 装饰：月亮 + 稀疏星点（纯装饰，pointer-events 交给内容） */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="absolute left-1/2 top-[6%] -translate-x-1/2">
          <MoonIcon className="h-14 w-14 text-moon-200/70" />
        </span>
        <span className="animate-twinkle absolute left-[14%] top-[20%] h-1 w-1 rounded-full bg-lav-300" />
        <span className="animate-twinkle absolute right-[16%] top-[30%] h-1.5 w-1.5 rounded-full bg-gold-300" style={{ animationDelay: "1.2s" }} />
        <span className="animate-twinkle absolute left-[22%] top-[58%] h-1 w-1 rounded-full bg-moon-200" style={{ animationDelay: "0.6s" }} />
        <span className="animate-twinkle absolute right-[24%] top-[64%] h-1 w-1 rounded-full bg-lav-200" style={{ animationDelay: "2s" }} />
      </div>

      <SparkleIcon className="h-6 w-6 text-gold-300" />
      <h1 className="display-zh text-4xl md:text-5xl">星邮</h1>
      <p className="display-zh text-lg text-moon-200 md:text-xl">写一封信给 Ta</p>
      <p className="max-w-xs text-sm leading-relaxed text-moon-400 md:max-w-sm">
        有些话，也许现在说不出口。
        <br />
        但你可以先把它写下来。
      </p>
      <StarButton size="lg" arrow onClick={onStart}>
        写封信给 Ta
      </StarButton>
    </div>
  );
}
```

- [ ] **Step 4: 类型检查 + 构建验证**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误（注意此时 MailCompose/MailPreview/MailSealing/MailSent 尚不存在，`mail-view.tsx` 会报导入错误——请与 Task 8 一起完成后统一验证）

> 说明：Task 7–9 的 UI 文件互相引用，单 task 提交前跑 tsc 会有导入缺失。**建议 Task 7+8+9 一起完成后统一跑 tsc/lint/build**，再按 7→8→9 顺序分三次 commit（每次 commit 前跑 `npx vitest run` 确认既有逻辑不受影响即可）。

- [ ] **Step 5: 不单独提交**

Task 7/8/9 的 UI 文件互相引用，`mail-view.tsx` 在 Task 9 完成前无法通过类型检查。**统一在 Task 9 Step 6 按 7→8→9 顺序三次提交**，本任务不单独 commit。

---

### Task 8: 写信表单（MailCompose）

> 设计：全站**表单最重**的一屏。用 **ui-ux-pro-max** 的产品表单规则：label 对齐、placeholder 层级（`moon-500`）、触控目标 ≥44px（`min-h-11`/`h-12`）、字数反馈、禁用/错误态清晰、键盘可聚焦。署名三选一用**分段选择卡**而非原生 radio（更符合玻璃拟态产品气质）。

**Files:**
- Create: `src/components/mail/MailCompose.tsx`

**Interfaces:**
- Consumes: `StarMailDraft`/`STAR_MAIL_DRAFT_KEY`（`@/lib/star-mail/types`）、`isValidEmailShape`（`@/lib/star-mail/validate`）、`ANONYMOUS_SIGNATURE`（`@/lib/star-mail/signature`）、`store`/`useMounted`（`@/lib/store`）、`GlassCard`、`StarButton`
- Produces: `MailCompose({ initial: StarMailDraft | null; onPreview: (draft: StarMailDraft) => void })`
- 行为：localStorage 草稿自动保存（key `xingyu-starmail-draft`，300ms 防抖）；「预览这封信」做客户端校验并 `onPreview(draft)`；定时发送为 UI 占位（禁用的「定时寄出」+「即将上线」chip，点击提示文案）。

- [ ] **Step 1: 实现**

```tsx
// src/components/mail/MailCompose.tsx
"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { isValidEmailShape } from "@/lib/star-mail/validate";
import { ANONYMOUS_SIGNATURE } from "@/lib/star-mail/signature";
import { STAR_MAIL_DRAFT_KEY, type StarMailDraft } from "@/lib/star-mail/types";
import { store, useMounted } from "@/lib/store";

const TITLE_SUGGESTIONS = [
  "给你的一句话",
  "我一直想告诉你",
  "有些话想对你说",
  "好久不见",
  "谢谢你",
  "对不起",
  "我想你了",
  "写给未来的你",
];

const INPUT_CLASS =
  "h-12 w-full rounded-xl border border-hairline bg-white/[0.04] px-4 text-[15px] text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400";

function loadDraft(): StarMailDraft | null {
  try {
    const raw = window.localStorage.getItem(STAR_MAIL_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StarMailDraft>;
    if (typeof parsed.recipient !== "string") return null;
    return {
      recipient: parsed.recipient ?? "",
      title: parsed.title ?? "",
      signatureType: parsed.signatureType ?? "name",
      customSignature: parsed.customSignature ?? "",
      body: parsed.body ?? "",
    };
  } catch {
    return null;
  }
}

export function MailCompose({
  initial,
  onPreview,
}: {
  initial: StarMailDraft | null;
  onPreview: (draft: StarMailDraft) => void;
}) {
  const mounted = useMounted();
  const nickname = mounted ? store.useStore().profile?.nickname ?? "" : "";

  // 首次挂载：优先用父组件传入的 initial；没有（如登录跳回/直开 /mail）则从 localStorage 恢复草稿。
  // typeof window 守卫避免 SSR 期间访问 localStorage。
  const [recipient, setRecipient] = useState(
    initial?.recipient ?? (typeof window !== "undefined" ? loadDraft()?.recipient ?? "" : ""),
  );
  const [title, setTitle] = useState(
    initial?.title ?? (typeof window !== "undefined" ? loadDraft()?.title ?? "" : ""),
  );
  const [signatureType, setSignatureType] = useState<StarMailDraft["signatureType"]>(
    initial?.signatureType ?? (typeof window !== "undefined" ? loadDraft()?.signatureType ?? "name" : "name"),
  );
  const [customSignature, setCustomSignature] = useState(
    initial?.customSignature ?? (typeof window !== "undefined" ? loadDraft()?.customSignature ?? "" : ""),
  );
  const [body, setBody] = useState(
    initial?.body ?? (typeof window !== "undefined" ? loadDraft()?.body ?? "" : ""),
  );
  const [error, setError] = useState("");

  // 草稿自动保存（300ms 防抖）
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STAR_MAIL_DRAFT_KEY,
          JSON.stringify({ recipient, title, signatureType, customSignature, body }),
        );
      } catch {
        // localStorage 不可用时静默降级
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [recipient, title, signatureType, customSignature, body]);

  const emailOk = isValidEmailShape(recipient.trim());
  const bodyLen = body.length;

  function handlePreview() {
    setError("");
    if (!recipient.trim()) { setError("请填写收件邮箱"); return; }
    if (!emailOk) { setError("邮箱格式不正确，请检查后再试"); return; }
    if (!body.trim()) { setError("写点什么吧，哪怕只有一句话"); return; }
    if (bodyLen > 2000) { setError("正文不能超过 2000 字"); return; }
    onPreview({
      recipient: recipient.trim().toLowerCase(),
      title: title.trim(),
      signatureType,
      customSignature: customSignature.trim(),
      body,
    });
  }

  return (
    <GlassCard glow="none" className="w-full">
      <div className="flex flex-col gap-7 p-7 md:p-9">
        <div className="text-center">
          <p className="text-sm tracking-[0.22em] text-gold-300">✦</p>
          <h1 className="display-zh mt-3 text-2xl">写封信给 Ta</h1>
        </div>

        {/* 收件邮箱 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-moon-500" htmlFor="sm-recipient">Ta 的邮箱</label>
          <input
            id="sm-recipient"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="example@email.com"
            className={INPUT_CLASS}
          />
          <p className="text-[11px] leading-relaxed text-moon-500">
            请确认邮箱地址准确无误，Stella 会将这封信寄往这里。
          </p>
        </div>

        {/* 标题 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-moon-500" htmlFor="sm-title">
            信的标题 <span className="opacity-60">（可选）</span>
          </label>
          <input
            id="sm-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="有些话想告诉你"
            maxLength={60}
            className={INPUT_CLASS}
          />
          <div className="flex flex-wrap gap-2">
            {TITLE_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTitle(s)}
                className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                  title === s
                    ? "border-gold-400/70 bg-gold-400/10 text-gold-200"
                    : "border-hairline text-moon-400 hover:border-gold-400/50 hover:text-moon-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 署名 */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-moon-500">署名</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            {(
              [
                { v: "name" as const, label: "我的名字", hint: nickname || "未设置昵称" },
                { v: "anonymous" as const, label: "匿名", hint: ANONYMOUS_SIGNATURE },
                { v: "custom" as const, label: "自定义署名", hint: "" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setSignatureType(o.v)}
                className={`flex min-h-11 flex-1 flex-col items-start justify-center rounded-xl border px-4 py-2.5 text-left transition-colors ${
                  signatureType === o.v
                    ? "border-lav-400/70 bg-lav-400/10"
                    : "border-hairline hover:border-lav-400/40"
                }`}
              >
                <span className="text-sm text-moon-100">{o.label}</span>
                {o.hint && (
                  <span className="mt-0.5 max-w-[16rem] truncate text-[11px] text-moon-500">{o.hint}</span>
                )}
              </button>
            ))}
          </div>
          {signatureType === "custom" && (
            <input
              type="text"
              value={customSignature}
              onChange={(e) => setCustomSignature(e.target.value)}
              placeholder="比如：R / 那个一直记得你的人 / 星星知道是谁"
              maxLength={30}
              className={INPUT_CLASS}
            />
          )}
        </div>

        {/* 正文 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-moon-500" htmlFor="sm-body">想说的话</label>
          <textarea
            id="sm-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            maxLength={2000}
            placeholder="写下你一直想说，却还没有说出口的话……"
            className="w-full resize-y rounded-xl border border-hairline bg-white/[0.04] px-4 py-3 text-[15px] leading-relaxed text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400"
          />
          <div className="text-right text-[11px] text-moon-500">{bodyLen} / 2000</div>
        </div>

        {/* 定时发送 UI 占位 */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-white/[0.02] px-4 py-3">
          <span className="text-sm text-moon-300">发送时机</span>
          <div className="inline-flex rounded-full border border-hairline p-0.5 text-[12px]">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-moon-200">立即寄出</span>
            <span className="px-3 py-1 text-moon-500">定时寄出</span>
          </div>
          <button
            type="button"
            onClick={() => setError("定时发送即将上线，先帮你立即寄出。")}
            className="ml-auto rounded-full border border-hairline px-2.5 py-1 text-[11px] text-moon-500 transition-colors hover:border-gold-400/50 hover:text-gold-300"
          >
            即将上线
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-center">
          <StarButton size="lg" arrow onClick={handlePreview}>预览这封信</StarButton>
        </div>
      </div>
    </GlassCard>
  );
}
```

- [ ] **Step 2: 类型检查（与 Task 9 一起完成后统一跑）**

Run: `npx tsc --noEmit`
Expected: 无错误（等 Task 9 补全后统一验证）

- [ ] **Step 3: 不单独提交**

同 Task 7 Step 5：本任务文件随 Task 9 Step 6 一起提交。

---

### Task 9: 预览 + 封存动画 + 已启程 + 登录门槛

> 设计：预览页是**信纸感**关键帧——暖白信纸与深夜蓝背景形成克制对比（soft-skill 的 Editorial 质感，`#FFFDF6` 底 / `#0D1124` 字 / `#EAD9B4` 分隔线）。封存动画纯 CSS、尊重 `prefers-reduced-motion`。登录门槛按确认方案：未登录可写信/预览，封存时要求登录。

**Files:**
- Create: `src/components/mail/MailPreview.tsx`
- Create: `src/components/mail/MailSealing.tsx`
- Create: `src/app/mail/mail-sealing.css`
- Create: `src/components/mail/MailSent.tsx`

**Interfaces:**
- Consumes: `Turnstile`、`useAuth`、`store`/`useMounted`、`resolveSignature`、`StarMailDraft`、`StarButton`
- Produces: `MailPreview({ draft, sendError, onEdit, onSeal })`、`MailSealing({ draft, turnstileToken, onDone, onError })`、`MailSent({ masked })`

- [ ] **Step 1: MailPreview**

```tsx
// src/components/mail/MailPreview.tsx
"use client";

import { useState } from "react";
import { StarButton } from "@/components/StarButton";
import { Turnstile } from "@/components/Turnstile";
import { useAuth } from "@/lib/use-auth";
import { resolveSignature } from "@/lib/star-mail/signature";
import { store, useMounted } from "@/lib/store";
import type { StarMailDraft } from "@/lib/star-mail/types";

export function MailPreview({
  draft,
  sendError,
  onEdit,
  onSeal,
}: {
  draft: StarMailDraft;
  sendError: string;
  onEdit: () => void;
  onSeal: (turnstileToken: string) => void;
}) {
  const mounted = useMounted();
  const nickname = mounted ? store.useStore().profile?.nickname : undefined;
  const auth = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const signature = resolveSignature(draft, nickname);

  function handleSeal() {
    if (auth.status !== "authenticated") {
      setShowLogin(true);
      return;
    }
    if (confirmed && turnstileToken) onSeal(turnstileToken);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* 信纸 */}
      <div className="rounded-[1.5rem] bg-[#FFFDF6] px-6 py-8 text-[#1B2034] shadow-card-lg md:px-10 md:py-10">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-lg text-[#B08D55]">✦</span>
          <p className="text-sm tracking-[0.24em] text-[#837D9C]">To: Ta</p>
          <h2 className="display-zh mt-3 text-xl text-[#0D1124] md:text-2xl">
            {draft.title || "有些话想告诉你"}
          </h2>
        </div>
        <div className="mx-auto mt-6 h-px w-24 bg-[#EAD9B4]" />
        <p className="mt-6 text-[15px] leading-loose text-[#1B2034]">亲爱的 Ta：</p>
        <p className="mt-2 whitespace-pre-line text-[15px] leading-loose text-[#1B2034]">{draft.body}</p>
        <p className="mt-8 text-right text-[15px] text-[#1B2034]">—— {signature}</p>
        <div className="mt-10 text-center">
          <span className="text-[12px] tracking-[0.3em] text-[#9E98B3]">Stella</span>
        </div>
      </div>

      {/* 收件邮箱确认 */}
      <label className="flex items-start gap-2.5 text-sm text-moon-300">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#9B8EC4]"
        />
        <span>
          我已确认收件邮箱 <span className="text-moon-100">{draft.recipient}</span> 准确无误
        </span>
      </label>

      {sendError && <p className="text-sm text-red-400">{sendError}</p>}

      {auth.status === "loading" && (
        <p className="text-center text-sm text-moon-500">正在确认登录状态…</p>
      )}

      {auth.status === "anonymous" && !showLogin && (
        <p className="text-sm text-moon-400">发送需要登录 Stella。登录后，你的信会在本地草稿中保留。</p>
      )}

      {showLogin && (
        <div className="rounded-2xl border border-gold-400/40 bg-gold-400/[0.06] p-6 text-center">
          <p className="text-sm leading-relaxed text-moon-200">
            发送前先登录 Stella，这封信会保存在你的草稿里。
          </p>
          <div className="mt-4 flex justify-center">
            <StarButton href="/login?next=/mail" size="md" variant="gold">
              去登录
            </StarButton>
          </div>
        </div>
      )}

      {/* 操作区 */}
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <StarButton variant="ghost" onClick={onEdit}>重新编辑</StarButton>
        {auth.status === "authenticated" && (
          <StarButton size="lg" arrow disabled={!confirmed || !turnstileToken} onClick={handleSeal}>
            封存这封信
          </StarButton>
        )}
        {auth.status === "anonymous" && (
          <StarButton size="lg" arrow disabled={!confirmed} onClick={handleSeal}>
            封存这封信
          </StarButton>
        )}
      </div>

      {auth.status === "authenticated" && (
        <Turnstile onToken={setTurnstileToken} className="min-h-[65px]" />
      )}
    </div>
  );
}
```

- [ ] **Step 2: MailSealing**

```tsx
// src/components/mail/MailSealing.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { store, useMounted } from "@/lib/store";
import { resolveSignature } from "@/lib/star-mail/signature";
import type { StarMailDraft } from "@/lib/star-mail/types";
import "../../app/mail/mail-sealing.css";

type SendState =
  | { kind: "sending" }
  | { kind: "error"; reason: string }
  | { kind: "done"; masked: string };

export function MailSealing({
  draft,
  turnstileToken,
  onDone,
  onError,
}: {
  draft: StarMailDraft;
  turnstileToken: string;
  onDone: (masked: string) => void;
  onError: (reason: string) => void;
}) {
  const mounted = useMounted();
  const nickname = mounted ? store.useStore().profile?.nickname : undefined;
  const nicknameRef = useRef(nickname);
  nicknameRef.current = nickname;

  const [animDone, setAnimDone] = useState(false);
  const [send, setSend] = useState<SendState>({ kind: "sending" });

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const firedRef = useRef(false);

  // 动画时长（尊重 prefers-reduced-motion）
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setAnimDone(true), reduced ? 500 : 2600);
    return () => window.clearTimeout(t);
  }, []);

  // 动画与发送都完成后再进入终态
  useEffect(() => {
    if (!animDone || firedRef.current) return;
    if (send.kind === "done") {
      firedRef.current = true;
      onDoneRef.current(send.masked);
    } else if (send.kind === "error") {
      firedRef.current = true;
      onErrorRef.current(send.reason);
    }
  }, [animDone, send]);

  // 发起发送
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/star-mail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: draft.recipient.trim(),
            title: draft.title.trim(),
            body: draft.body,
            signature: resolveSignature(draft, nicknameRef.current),
            turnstileToken,
          }),
        });
        const data = (await res.json()) as { error?: string; maskedRecipient?: string };
        if (!res.ok) {
          if (alive) setSend({ kind: "error", reason: data.error ?? "SEND_FAILED" });
          return;
        }
        if (alive && data.maskedRecipient) setSend({ kind: "done", masked: data.maskedRecipient });
      } catch {
        if (alive) setSend({ kind: "error", reason: "SEND_FAILED" });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, turnstileToken]);

  return (
    <div className="flex w-full flex-col items-center gap-8 py-10 text-center">
      <div className="seal-stage relative flex h-64 w-full max-w-xs flex-col items-center justify-center">
        {/* 信纸 */}
        <div className="seal-letter h-52 w-40 rounded-lg bg-[#FFFDF6] p-4 shadow-card-lg">
          <p className="text-[10px] tracking-[0.2em] text-[#9E98B3]">To: Ta</p>
          <p className="mt-2 text-[12px] font-medium text-[#0D1124]">
            {draft.title || "有些话想告诉你"}
          </p>
          <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-[#1B2034]">
            {draft.body}
          </p>
        </div>
        {/* 信封（折叠后出现，沿星轨飞走） */}
        <div className="seal-envelope absolute grid h-24 w-36 place-items-center rounded-md bg-gradient-to-b from-[#EAD9B4] to-[#D8BF92] shadow-card-lg">
          <span className="text-xl text-[#0D1124]">✦</span>
        </div>
      </div>

      <p className="seal-text-1 text-sm text-moon-200">把这份心意交给星星。</p>
      <p className="seal-text-2 text-sm text-moon-400">正在寄出……</p>
    </div>
  );
}
```

- [ ] **Step 3: 封存动画 CSS**

```css
/* src/app/mail/mail-sealing.css */
@keyframes sm-fold {
  0% { transform: rotateX(0deg) scale(1); opacity: 1; }
  100% { transform: rotateX(90deg) scale(0.8); opacity: 0.3; }
}
@keyframes sm-envelope-in {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes sm-fly {
  0% { transform: translate3d(0, 0, 0) rotate(-6deg) scale(1); opacity: 1; }
  18% { opacity: 1; }
  100% { transform: translate3d(150px, -280px, 0) rotate(-28deg) scale(0.4); opacity: 0; }
}
@keyframes sm-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.seal-stage { perspective: 900px; }
.seal-letter {
  transform-origin: bottom center;
  animation: sm-fold 0.9s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}
.seal-envelope {
  opacity: 0;
  animation:
    sm-envelope-in 0.45s cubic-bezier(0.32, 0.72, 0, 1) 0.9s both,
    sm-fly 1.15s cubic-bezier(0.16, 1, 0.3, 1) 1.45s forwards;
}
.seal-text-1 { animation: sm-fade 0.4s ease-in-out 0.2s both; }
.seal-text-2 { animation: sm-fade 0.4s ease-in-out 1.1s both; }
```

> 注：全局 CSS 已对 `prefers-reduced-motion` 强制 `animation-duration: 0.001ms`，动画会瞬间完成；JS 计时也会缩短到 500ms，保证一致。

- [ ] **Step 4: MailSent**

```tsx
// src/components/mail/MailSent.tsx
"use client";

import { StarButton } from "@/components/StarButton";
import { SparkleIcon } from "@/components/icons";

export function MailSent({ masked }: { masked: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-5 py-12 text-center">
      <SparkleIcon className="h-6 w-6 text-gold-300" />
      <h1 className="display-zh text-3xl md:text-4xl">已启程</h1>
      <p className="text-sm leading-relaxed text-moon-300">这封信已经寄出。</p>
      <p className="text-sm leading-relaxed text-moon-300">
        希望 Ta 能在某个刚刚好的时刻，
        <br />
        看见它。
      </p>
      <p className="rounded-full border border-hairline bg-white/[0.04] px-4 py-2 text-[13px] text-moon-400">
        已发送至：<span className="text-moon-200">{masked}</span>
      </p>
      <div className="mt-2">
        <StarButton href="/" size="lg" arrow>回到星语星愿</StarButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 统一类型检查 + lint + 单测**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 全部通过（Task 7+8+9 的导入现已齐备）

- [ ] **Step 6: 按 Task 7→8→9 顺序三次提交**

Task 7 的 `page.tsx`/`mail-view.tsx`/`MailIntro.tsx` 与 Task 8 的 `MailCompose.tsx` 此刻才与 Task 9 文件齐备，分三次提交保证每个 commit 独立可构建：

```bash
git add src/app/mail/page.tsx src/app/mail/mail-view.tsx src/components/mail/MailIntro.tsx
git commit -m "feat: 星邮页面骨架与 intro 落地页"

git add src/components/mail/MailCompose.tsx
git commit -m "feat: 星邮写信表单（草稿保存/署名/定时占位）"

git add src/components/mail/MailPreview.tsx src/components/mail/MailSealing.tsx src/app/mail/mail-sealing.css src/components/mail/MailSent.tsx
git commit -m "feat: 星邮预览/封存动画/已启程与登录门槛"
```

---

### Task 10: 登录跳回（AccountCard onAuthed + login next）

**Files:**
- Modify: `src/components/AccountCard.tsx`
- Modify: `src/app/login/login-view.tsx`
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `useRouter`（`next/navigation`，已在 onboarding 使用）
- Produces: `AccountCard({ onAuthed }: { onAuthed?: () => void })`；`LoginView({ next }: { next: string })`

- [ ] **Step 1: AccountCard 加可选回调**

修改 `src/components/AccountCard.tsx`：
1. 组件签名改为 `export function AccountCard({ onAuthed }: { onAuthed?: () => void })`。
2. 在 `handleVerify` 中，`await refreshMe();` 之后加一行 `onAuthed?.();`。

- [ ] **Step 2: login-view 读 next 并跳回**

```tsx
// src/app/login/login-view.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { AccountCard } from "@/components/AccountCard";

export function LoginView({ next }: { next: string }) {
  const router = useRouter();
  const onAuthed = () => {
    // 只接受站内相对路径，防开放重定向
    if (next.startsWith("/") && !next.startsWith("//")) router.replace(next);
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16 md:py-24">
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <Image
          src="/brand/logo-main.png"
          alt="星语星愿"
          width={1020}
          height={305}
          className="h-8 w-auto max-w-none"
        />
        <h1 className="display-zh text-2xl">登录星语星愿</h1>
        <p className="text-sm leading-relaxed text-moon-400">
          登录后，你的出生信息与星愿会保存在你的账号下。
        </p>
      </div>
      <AccountCard onAuthed={onAuthed} />
    </div>
  );
}
```

- [ ] **Step 3: login/page.tsx 透传 next**

```tsx
// src/app/login/page.tsx
import type { Metadata } from "next";
import { LoginView } from "./login-view";

export const metadata: Metadata = {
  title: "登录",
  description: "登录星语星愿，保存你的出生信息与星愿。",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <LoginView next={next ?? "/"} />;
}
```

> 说明：`searchParams` 在本版 Next 是 async Promise prop（已核对 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`）。`/profile` 里的 `AccountCard` 不传 `onAuthed`，行为不变。

- [ ] **Step 4: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/components/AccountCard.tsx src/app/login/login-view.tsx src/app/login/page.tsx
git commit -m "feat: 登录页支持 next 跳回（星邮登录引导用）"
```

---

### Task 11: 入口（关系星图收尾卡 + 首页流星）

**Files:**
- Modify: `src/app/relationship/relationship-view.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `StarButton`（relationship-view 已导入）
- 行为：关系结果生成后显示星邮入口；首页 Hero 显示可点流星

- [ ] **Step 1: 关系星图结果页追加星邮收尾卡**

在 `src/app/relationship/relationship-view.tsx` 的 `{result && (...)}` 块内、**分享卡 GlassCard 之后**、`</>` 之前，追加：

```tsx
{/* 星邮入口 */}
<GlassCard glow="gold">
  <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
    <p className="display-zh text-xl text-moon-200 md:text-2xl">
      你和 Ta 的星星已经相遇。
    </p>
    <p className="max-w-sm text-sm leading-relaxed text-moon-400">
      还有一句话，你一直没有告诉 Ta 吗？
    </p>
    <StarButton href="/mail" size="lg" arrow>
      写封信给 Ta
    </StarButton>
  </div>
</GlassCard>
```

- [ ] **Step 2: 首页 Hero 追加可点流星**

在 `src/app/page.tsx` 的 hero `<section>` 内、轨道视觉层 `<div ...aria-hidden="true">...</div>` 之后、`<div className="relative flex flex-col items-center gap-6">` 之前，追加：

```tsx
{/* 星邮入口：这里藏着一封信（桌面端） */}
<Link
  href="/mail"
  aria-label="这里藏着一封信，点击进入星邮"
  className="group absolute right-[7%] top-[16%] hidden flex-col items-end gap-2 md:flex"
>
  <span className="h-px w-28 bg-gradient-to-r from-transparent via-gold-300/90 to-transparent" />
  <span className="text-[11px] text-moon-500 transition-colors group-hover:text-gold-300">
    ✦ 这里藏着一封信
  </span>
</Link>
```

> `Link` 已在 `page.tsx` 顶部导入。移动端该入口隐藏（关系星图入口覆盖全端）。

- [ ] **Step 3: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/app/relationship/relationship-view.tsx src/app/page.tsx
git commit -m "feat: 星邮入口（关系星图收尾卡 + 首页流星）"
```

---

### Task 12: 验证与收尾

**Files:** 无（验证）

- [ ] **Step 1: 全量单测 + 类型 + lint**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: 全部通过

- [ ] **Step 2: 生产构建**

Run: `npm run build`
Expected: 构建成功，`/mail` 与 `/api/star-mail/send` 均纳入

- [ ] **Step 3: 本地 dev 手工验证完整流程**

Run: `npm run dev`（确保无 OpenNext 构建占用的 EBUSY 冲突）

浏览器验证清单（golden path + 边界）：
1. 直接访问 `/mail` → 显示 intro 落地页（月亮/星点/留白/「写封信给 Ta」）。
2. 点「写封信给 Ta」→ 写信表单；填写邮箱/标题（用推荐 chips）/署名三种切换/正文；字数实时显示；**刷新页面草稿仍在**（localStorage）。
3. 点「预览这封信」→ 暖白信纸预览、收件邮箱展示；不勾选确认时「封存这封信」禁用。
4. **未登录**点封存 → 出现「去登录」提示；点去登录 → `/login?next=/mail`；登录成功 → 自动跳回 `/mail`（草稿仍在）。
5. 勾选确认 + Turnstile → 点「封存这封信」→ 封存动画（2.6s）→「已启程」页，显示 `已发送至：a***@gmail.com`。
6. 邮箱收到主题化 HTML 邮件（暖白底/蓝色字/金色星星），正文换行正确、无注入。
7. 同一账号第 4 封 → 提示「今天寄出的信有点多了…」。
8. 系统开启「减少动态效果」时封存动画瞬间完成且仍能发送成功。
9. 校验错误提示：空邮箱/坏邮箱/空正文/超长正文均有对应文案。

> 注：本机有系统代理，浏览器内登录等真实 Turnstile 交互需人工确认；沙箱自动化浏览器可能被 Turnstile 拦（300030）。若沙箱受限，用「注入 cookie」法验证登录态 UI。

- [ ] **Step 4: 确认文档与代码一致**

快速回读 spec 的 Global Constraints，确认正文未入库、脱敏、限流、风控均已实现。

- [ ] **Step 5: 更新项目记忆（memory）**

实现完成后更新 `C:\Users\zhara\.claude\projects\D--MyApp-Stella\memory\xingyu-xingyuan-project.md`，追加星邮已实现状态（路由/API/表/入口/限流数值/邮箱脱敏/正文不入库）。

- [ ] **Step 6: 收尾 commit（如仍有未提交改动）**

```bash
git add -A
git status
git commit -m "chore: 星邮验证收尾"
```
