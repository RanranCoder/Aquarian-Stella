# 星邮收件人昵称字段 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 写信页新增必填「Ta 的昵称」输入框（≤20 字），信件抬头从「亲爱的 Ta：」变为「亲爱的 {昵称}：」。

**Architecture:** `StarMailDraft` 增加 `taName`，经 compose → API body → validate（必填+≤20）→ moderation（并入扫描）→ template（转义后输出）；抬头替换预览信纸 + 邮件模板两处；**不入 D1**（`star_mails` 表结构不变）；旧草稿 `taName` 缺省空串。

**Tech Stack:** Next.js 16.3.1（App Router, OpenNext on Cloudflare）、React 19、TypeScript、Tailwind v4、vitest。

## Global Constraints

- 「Ta 的昵称」**必填**，`TA_NAME_MAX = 20`；placeholder「比如：小星 / 小冉」。
- 信件抬头「亲爱的 Ta：」→「亲爱的 {taName}：」出现在**预览信纸（MailPreview）+ 邮件模板（template.ts）**两处；封存动画信纸无此抬头行，不改。
- 昵称与 title/body/signature 一样是进邮件的用户输入：模板内 **HTML 转义**；并入 `checkModeration` 扫描文本。
- `taName` **永不写入 D1**；`star_mails` 表结构不变。
- 旧草稿兼容：`loadDraft()` 缺失 `taName` → 默认 `""`，必填校验兜底。
- 复用现有约定：纯函数零依赖 `src/lib/auth/*`、`@` 别名、vitest `include ["src/**/*.test.ts"]`、运行期 CREATE TABLE 与本任务无关。
- 校验返回 `Validation` union：`field` 增 `"taName"`，`reason` 增 `"TA_NAME_EMPTY" | "TA_NAME_TOO_LONG"`（客户端在 preview 前已拦，API 侧这些码正常到不了，无需加 errorText）。

---

### Task 1: 纯函数（types / validate / moderation / template + 测试）

**Files:**
- Modify: `src/lib/star-mail/types.ts`（`StarMailDraft` 加 `taName: string`）
- Modify: `src/lib/star-mail/validate.ts`
- Modify: `src/lib/star-mail/moderation.ts`
- Modify: `src/lib/star-mail/template.ts`
- Test: `src/lib/star-mail/validate.test.ts`、`moderation.test.ts`、`template.test.ts`

**Interfaces:**
- Produces: `TA_NAME_MAX = 20`；`validateStarMail(input: { recipient; title; body; signature; taName })` 的 `ok:true` 分支含 normalize 后 `taName`（trim）；`checkModeration(input: { title; body; signature; taName })`；`buildStarMailHtml(opts: { title; body; signature; taName })`。
- Consumes: 无（纯函数）。

- [ ] **Step 1: 更新 types.ts**

`StarMailDraft` 接口加一行：

```ts
export interface StarMailDraft {
  recipient: string;
  title: string;
  signatureType: "name" | "anonymous" | "custom";
  customSignature: string;
  body: string;
  taName: string;
}
```

- [ ] **Step 2: 写失败的测试**（更新三个测试文件）

`validate.test.ts` —— `base` 常量加 `taName: "小星"`，并追加三个用例；同时**更新既有「passes valid input」用例的 `toEqual` 期望**（现在 `ok:true` 会带 `taName`）：

```ts
// base: { recipient: "ta@gmail.com", title: "有些话想告诉你", body: "你好。", signature: "R", taName: "小星" }
it("passes valid input and returns normalized fields", () => {
  const r = validateStarMail({ ...base, recipient: "  Ta@Gmail.com  ", title: "  标题  ", taName: "  小星  " });
  expect(r).toEqual({ ok: true, recipient: "ta@gmail.com", title: "标题", body: "你好。", signature: "R", taName: "小星" });
});
it("rejects empty taName", () => {
  expect(validateStarMail({ ...base, taName: "   " })).toMatchObject({ ok: false, field: "taName", reason: "TA_NAME_EMPTY" });
});
it("rejects taName over the max", () => {
  expect(validateStarMail({ ...base, taName: "x".repeat(TA_NAME_MAX + 1) })).toMatchObject({ ok: false, field: "taName", reason: "TA_NAME_TOO_LONG" });
});
```

更新 import：`import { validateStarMail, isValidEmailShape, BODY_MAX, SIGNATURE_MAX, TITLE_MAX, TA_NAME_MAX } from "./validate";`

`moderation.test.ts` —— `base` 加 `taName: "小星"`，追加：

```ts
it("rejects spam keywords in taName", () => {
  expect(checkModeration({ ...base, taName: "加微信" })).toEqual({ allowed: false, reason: "SPAM_KEYWORD" });
});
```

`template.test.ts` —— `buildStarMailHtml` 调用都加 `taName: "小星"`，并断言抬头：

```ts
it("embeds escaped title, body, taName and signature", () => {
  const html = buildStarMailHtml({ title: "你好 <Ta>", body: "第一行\n第二行", signature: "R", taName: "小星" });
  expect(html).toContain("你好 &lt;Ta&gt;");
  expect(html).toContain("第一行<br>第二行");
  expect(html).toContain("亲爱的 小星：");
  expect(html).toContain("—— R");
  expect(html).toContain("有些话，写下来就已经很好了。");
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npx vitest run src/lib/star-mail/validate.test.ts src/lib/star-mail/moderation.test.ts src/lib/star-mail/template.test.ts`
Expected: FAIL（TS 报 `taName` 不在类型上 / 断言不符）

- [ ] **Step 4: 实现**

`validate.ts` 追加常量并改函数：

```ts
export const TA_NAME_MAX = 20;
```
`Validation` union：`field` 加 `"taName"`，`reason` 加 `"TA_NAME_EMPTY" | "TA_NAME_TOO_LONG"`。

`validateStarMail` 输入签名加 `taName: string`，在 recipient 检查之后插入：

```ts
const taName = input.taName.trim();
if (taName.length === 0) return { ok: false, field: "taName", reason: "TA_NAME_EMPTY" };
if (taName.length > TA_NAME_MAX) return { ok: false, field: "taName", reason: "TA_NAME_TOO_LONG" };
```
`ok:true` 分支返回对象加 `taName`。

`moderation.ts`：

```ts
export function checkModeration(input: {
  title: string;
  body: string;
  signature: string;
  taName: string;
}): Moderation {
  const text = `${input.title}\n${input.taName}\n${input.body}\n${input.signature}`;
  ...
```

`template.ts`：

```ts
export function buildStarMailHtml(opts: { title: string; body: string; signature: string; taName: string }): string {
  const taName = escapeHtml(opts.taName);
  ...
```
把模板里 `<p style="font-size:15px;...">亲爱的 Ta：</p>` 改为 `${taName}`。

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run src/lib/star-mail/validate.test.ts src/lib/star-mail/moderation.test.ts src/lib/star-mail/template.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/star-mail
git commit -m "feat: 星邮收件人昵称字段（校验/风控/邮件抬头）"
```

---

### Task 2: API 路由透传

**Files:**
- Modify: `src/app/api/star-mail/send/route.ts`

**Interfaces:**
- Consumes: `validateStarMail({ recipient, title, body, signature, taName })`、`checkModeration({ title, body, signature, taName })`、`buildStarMailHtml({ title, body, signature, taName })`
- Produces: 无新接口；路由 body 多收一个 `taName` 字段。

- [ ] **Step 1: 实现**

在路由读取 body 字段处加一行：

```ts
const taName = typeof body.taName === "string" ? body.taName : "";
```

`validateStarMail` 调用改为：

```ts
const v = validateStarMail({ recipient, title, body: rawBody, signature, taName });
```

`checkModeration` 调用改为：

```ts
const mod = checkModeration({ title: v.title, body: v.body, signature: v.signature, taName: v.taName });
```

`buildStarMailHtml` 调用改为：

```ts
const html = buildStarMailHtml({ title: v.title, body: v.body, signature: v.signature, taName: v.taName });
```

- [ ] **Step 2: 验证**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/app/api/star-mail/send/route.ts
git commit -m "feat: 星邮发送 API 透传收件人昵称"
```

---

### Task 3: UI（写信输入框 + 预览抬头 + 封存 payload）

**Files:**
- Modify: `src/components/mail/MailCompose.tsx`
- Modify: `src/components/mail/MailPreview.tsx`
- Modify: `src/components/mail/MailSealing.tsx`

**Interfaces:**
- Consumes: `StarMailDraft`（含 `taName`）、`validateStarMail` 语义、`TA_NAME_MAX`（仅用于 maxLength 与提示可硬编码 20）
- Produces: compose 的 `onPreview` 回调产出含 `taName` 的 draft；sealing 发送 payload 含 `taName`。

- [ ] **Step 1: MailCompose 加输入框**

在邮箱块之后、标题块之前插入（`INPUT_CLASS` 复用）：

```tsx
{/* Ta 的昵称 */}
<div className="flex flex-col gap-2">
  <label className="text-xs text-moon-500" htmlFor="sm-taname">Ta 的昵称</label>
  <input
    id="sm-taname"
    type="text"
    value={taName}
    onChange={(e) => setTaName(e.target.value)}
    placeholder="比如：小星 / 小冉"
    maxLength={20}
    className={INPUT_CLASS}
  />
</div>
```

状态与草稿：

```tsx
const [taName, setTaName] = useState(
  initial?.taName ?? (typeof window !== "undefined" ? loadDraft()?.taName ?? "" : ""),
);
```
草稿保存 effect 的 JSON 加 `taName`。
`handlePreview` 在「请填写收件邮箱」之后加：

```tsx
if (!taName.trim()) { setError("请填写 Ta 的昵称"); return; }
```
`onPreview` 对象加 `taName: taName.trim()`。

- [ ] **Step 2: MailPreview 抬头替换**

`亲爱的 Ta：` 改为：

```tsx
<p className="mt-6 text-[15px] leading-loose text-[#1B2034]">亲爱的 {draft.taName}：</p>
```

- [ ] **Step 3: MailSealing payload 加 taName**

fetch body 的 JSON 加一行：

```ts
body: JSON.stringify({
  recipient: draft.recipient.trim(),
  title: draft.title.trim(),
  body: draft.body,
  signature: resolveSignature(draft, nicknameRef.current),
  taName: draft.taName.trim(),
  turnstileToken,
}),
```

- [ ] **Step 4: 全量门禁**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 全部通过（92+ 用例）

- [ ] **Step 5: Commit**

```bash
git add src/components/mail/MailCompose.tsx src/components/mail/MailPreview.tsx src/components/mail/MailSealing.tsx
git commit -m "feat: 星邮写信表单收件人昵称 + 预览抬头个性化"
```

---

### Task 4: 验证与收尾

**Files:** 无

- [ ] **Step 1: 全量单测 + 类型 + lint**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: 全部通过

- [ ] **Step 2: 生产构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 3: 浏览器验证**（`npm run dev`，preview 工具）

1. `/mail` → 写信：昵称留空点「预览这封信」→ 报错「请填写 Ta 的昵称」；填「小星」→ 可预览。
2. 预览信纸抬头为「亲爱的 小星：」。
3. 刷新 `/mail` 草稿恢复，昵称仍在。
4. 封存 → 已启程流程不受影响（真实发送仍需人工 Turnstile/登录）。

- [ ] **Step 4: 确认 spec 覆盖**

回读 spec：必填、≤20、placeholder、两处抬头、不入 D1、旧草稿兼容均已实现。
