# 星语星愿 · 移动端适配 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全站 11 页在竖屏 360–430px 达到「高级移动体验」——无溢出/小字/塌陷、触控 ≥44px、密集页移动原生信息层级。

**Architecture:** 先打地基（viewport、流式间距 token、底部 Tab 安全区、共享组件触控），再逐页实测清扫并迁移 padding token，密集页做针对性移动细化。每页改完即用浏览器手机视口验证。

**Tech Stack:** Next.js 16.3.1（App Router）+ React 19 + TypeScript + Tailwind v4 + Cloudflare OpenNext。验证用 preview_* 工具（dev server `stella-dev`，port 3000）。

## Global Constraints

- 设备目标：竖屏 360–430px；横屏/平板（`md:` 以上）维持现状。
- 保留 soft-skill 设计规则：色值/字体/动效曲线不变；玻璃卡片、胶囊按钮、`cubic-bezier` 保留。
- 不动分享卡（`ShareCardFrame` 内）固定 px 字号——PNG 截图导出需要。
- 不新增功能；不处理真实 Turnstile/登录线上验证（沙箱 300030 限制）。
- 触控目标：主要可交互控件 ≥44px（`min-h-11`）；装饰性小图标（如 `+` 号 chevron）单独评估，不 blanket 放大。
- 每个任务结束提交一次 commit；commit message 用 `<type>: <中文描述>` 风格（仓库既有约定）。
- 类型检查：`npx tsc --noEmit`；构建：`npm run build`；lint：`npm run lint`。

## File Structure

- `src/app/layout.tsx` — 新增 `viewport` 导出（viewport-fit=cover + themeColor）。
- `src/app/globals.css` — `@theme` 新增 `--space-page-x`/`--space-card`；顶层 `@utility` 定义 `px-page`/`p-card`/`px-card`。
- `src/components/SiteNav.tsx` — 底部 Tab 安全区内边距 + Tab 项 `min-h-11` + 移动端顶部占位收窄。
- `src/components/StarButton.tsx` — `sm` 尺寸加 `min-h-11`。
- `src/components/DatePicker.tsx` — 4 个年/月导航 chevron `h-8 w-8` → `h-11 w-11`。
- 11 个页面 view 文件 — 迁移 `px-6`→`px-page`、`p-8`→`p-card`、`px-8`→`px-card`，并修各页实测问题。

---

### Task 1: viewport 导出

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: 显式 `viewport` 导出，供 Next.js 注入 `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` 与 `<meta name="theme-color">`。

- [ ] **Step 1: 加 Viewport 类型导入与导出**

在 `src/app/layout.tsx` 顶部 import 区加 `Viewport`，并在 `metadata` 导出之后新增 `viewport` 导出：

```ts
import type { Metadata, Viewport } from "next";
```

（把现有 `import type { Metadata } from "next";` 改为上面这行。）

在 `export const metadata: Metadata = { ... }` 之后新增：

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080a12",
};
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS（无新增错误）

- [ ] **Step 3: 浏览器验证 viewport meta**

Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → `preview_eval` `document.querySelector('meta[name="viewport"]')?.content`
Expected: 含 `viewport-fit=cover`；`document.querySelector('meta[name="theme-color"]')?.content` === `#080a12`

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: 显式 viewport 导出含 viewport-fit=cover 与 themeColor"
```

---

### Task 2: 流式间距 token 与语义工具类

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: CSS 变量 `--space-card`（clamp 1.25–2rem）；Tailwind v4 `@utility` `p-card`/`px-card`，供后续页面任务替换散落 `p-8`（卡片内边距）与 `px-8`（英雄区横向 padding）。`px-6` 页面横向 padding（24px）在手机端不算重，保留不动。

- [ ] **Step 1: 在 `@theme` 块内新增间距 token**

在 `src/app/globals.css` 的 `@theme { ... }` 内，`--- Radius 圆角体系` 注释段之前，加：

```css
/* --- Spacing 流式间距（移动端收敛） --- */
--space-card: clamp(1.25rem, 5vw, 2rem);
```

- [ ] **Step 2: 在文件顶层（`@theme` 之外、`@layer` 之外）新增两个 `@utility`**

在 `@theme { ... }` 闭合之后、`@layer base` 之前，加：

```css
@utility p-card {
  padding: var(--space-card);
}
@utility px-card {
  padding-inline: var(--space-card);
}
```

> 视觉等价：`p-card` 在 360px 屏 = 20px（原 `p-8`=32px），≥640px = 32px（与 `p-8` 桌面端一致）。即「移动端收窄、桌面端不变」。

- [ ] **Step 3: 构建验证（Tailwind 编译不报错）**

Run: `npm run build`
Expected: 构建成功（无 Tailwind/Lightning CSS 报错）

- [ ] **Step 4: 浏览器验证一个工具类生效**

Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 任取一个仍用 `p-8` 的卡片（如首页某 `p-8`），在 `preview_eval` 给它 `classList.add('p-card')`，再 `preview_inspect` 该元素读 `padding` 计算值。
Expected: padding ≈ 20px（360px 屏下 clamp 下限 1.25rem=20px），即移动端比原 `p-8`(32px) 小。验证后该临时改动随刷新丢失，无需还原。

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: 流式间距 token --space-card 与 p-card/px-card 工具类"
```

---

### Task 3: SiteNav 底部 Tab 安全区 + 触控 + 顶部占位收窄

**Files:**
- Modify: `src/components/SiteNav.tsx`

**Interfaces:**
- Produces: 移动端底部 Tab 不被 iPhone home indicator 遮挡；Tab 项可点区 ≥44px；移动端顶部不再有 64px 空白占位。

- [ ] **Step 1: 底部 Tab 容器加安全区内边距**

`src/components/SiteNav.tsx:108`，把：

```tsx
<div className="glass-strong mx-4 mb-4 flex items-stretch justify-between rounded-full px-2 py-1.5">
```

改为：

```tsx
<div className="glass-strong mx-4 mb-[max(1rem,env(safe-area-inset-bottom))] flex items-stretch justify-between rounded-full px-2 py-1.5">
```

- [ ] **Step 2: Tab 项加 min-h-11**

`src/components/SiteNav.tsx:116-118`，Tab 项 Link 的 className 里 `py-1.5` 之前加 `min-h-11`：

```tsx
className={cn(
  "flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 min-h-11 text-[11px] transition-colors duration-300",
  active
    ? "bg-white/[0.08] text-gold-200"
    : "text-moon-400",
)}
```

- [ ] **Step 3: 移动端顶部占位收窄**

`src/components/SiteNav.tsx:132`，把：

```tsx
<div className="h-16 md:h-20" aria-hidden="true" />
```

改为：

```tsx
<div className="h-6 md:h-20" aria-hidden="true" />
```

- [ ] **Step 4: 类型检查 + 浏览器验证**

Run: `npx tsc --noEmit`
Expected: PASS

Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → `preview_inspect` 底部 Tab 容器读 `margin-bottom`（应为 max(1rem, env(...))，在非刘海屏回退 16px）；`preview_inspect` 任一 Tab 项读 `min-height`（44px）；目视顶部无 64px 空白。
Expected: Tab 项 min-height 44px；顶部占位 ~24px；底部 Tab 与 home indicator 间留有空隙。

- [ ] **Step 5: Commit**

```bash
git add src/components/SiteNav.tsx
git commit -m "feat: 底部 Tab 安全区内边距 + Tab 项 min-h-11 + 移动端顶部占位收窄"
```

---

### Task 4: 共享组件触控——StarButton sm 与 DatePicker 导航

**Files:**
- Modify: `src/components/StarButton.tsx`
- Modify: `src/components/DatePicker.tsx`

**Interfaces:**
- Produces: 所有 `size="sm"` 的 StarButton 触控高度 ≥44px；DatePicker 年/月导航 chevron ≥44px。惠及全站使用处，无需逐页改。

- [ ] **Step 1: StarButton sm 尺寸加 min-h-11**

`src/components/StarButton.tsx:25`，把：

```ts
const SIZES = {
  sm: "px-4 py-2 text-sm gap-1.5",
  md: "px-6 py-3 text-[15px] gap-2",
  lg: "px-8 py-4 text-base gap-2.5",
} as const;
```

改为：

```ts
const SIZES = {
  sm: "px-4 py-2.5 min-h-11 text-sm gap-1.5",
  md: "px-6 py-3 text-[15px] gap-2",
  lg: "px-8 py-4 text-base gap-2.5",
} as const;
```

- [ ] **Step 2: DatePicker 4 个导航 chevron 放大**

`src/components/DatePicker.tsx`，4 处 `grid h-8 w-8 place-items-center rounded-lg`（行 178、193、259、274）都改为 `grid h-11 w-11 place-items-center rounded-lg`。用 `replace_all` 不可行（`h-8 w-8` 在文件里只在这 4 处出现于该 className 串），手动逐处或用唯一上下文替换。

具体：把每一处：

```tsx
className="grid h-8 w-8 place-items-center rounded-lg text-moon-400 transition-colors hover:bg-white/[0.06] hover:text-moon-100"
```

改为：

```tsx
className="grid h-11 w-11 place-items-center rounded-lg text-moon-400 transition-colors hover:bg-white/[0.06] hover:text-moon-100"
```

（4 处相同，可用 `replace_all`，但需确认该串在文件中仅 4 处。）

- [ ] **Step 3: 类型检查 + 构建验证**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS

- [ ] **Step 4: 浏览器验证触控尺寸**

Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 打开 onboarding 页（用 DatePicker）与 chart 页（用 `size="sm"` 的 StarButton「补全出生信息」）→ `preview_inspect` 触发器/导航 chevron/StarButton 读 `min-height` 或 `height`。
Expected: DatePicker 导航 chevron 44×44；StarButton sm 高度 ≥44px。

- [ ] **Step 5: Commit**

```bash
git add src/components/StarButton.tsx src/components/DatePicker.tsx
git commit -m "feat: StarButton sm 与 DatePicker 导航 chevron 触控目标提至 44px"
```

---

### Task 5: 首页 page.tsx

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `p-card`/`px-card`（Task 2）。
- Produces: 首页移动端——三行星 mini 卡不再横向溢出；卡片 padding 移动端收窄；末段底部为底部 Tab 预留空间。

- [ ] **Step 1: 全文 `p-8` → `p-card`（含 `p-8 md:p-10` → `p-card md:p-10`）**

Edit `src/app/page.tsx`，`replace_all`：old_string `p-8`，new_string `p-card`。命中 :85（`p-8 md:p-10`→`p-card md:p-10`）、:131、:170、:195。`px-8`（:245）不受影响（不同字符串）。

- [ ] **Step 2: 三行星 mini 卡改 grid 防溢出**

Edit：old_string `className="flex gap-3"`（:107），new_string `className="grid grid-cols-3 gap-2"`。
Edit：old_string `className="flex flex-col items-center gap-1 rounded-2xl border border-hairline bg-white/[0.03] px-4 py-4"`（:115），new_string 同串但 `px-4 py-4` → `px-2 py-3`。
Edit：old_string `className="text-[11px] text-moon-500"`（:119 行星描述），new_string `className="text-xs text-moon-500"`。

- [ ] **Step 3: 末段 CTA 卡与底部 padding**

Edit：old_string `className="flex flex-col items-center gap-6 px-8 py-14 text-center md:py-16"`（:245），new_string `className="flex flex-col items-center gap-6 px-card py-10 text-center md:py-14"`。
Edit：old_string `className="mx-auto max-w-4xl px-6 py-16 md:py-24"`（:243 末段），new_string `className="mx-auto max-w-4xl px-6 pt-16 pb-24 md:py-24"`。

- [ ] **Step 4: 类型检查 + 浏览器验证**

Run: `npx tsc --noEmit`
Expected: PASS

Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 打开 `/` → `preview_eval` `document.documentElement.scrollWidth - document.documentElement.clientWidth`（应为 0，无横向溢出）→ `preview_inspect` 任一行星 mini 卡读 `padding`（≈8px）→ 目视末段内容不被底部 Tab 遮挡。
Expected: scrollWidth 差值 0；行星卡三列等宽不溢出。

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: 首页移动端——行星卡 grid 防溢出 + p-card + 末段 pb-24"
```

---

### Task 6: Onboarding onboarding-view.tsx

**Files:**
- Modify: `src/app/onboarding/onboarding-view.tsx`

**Interfaces:**
- Consumes: `p-card`/`px-card`（Task 2）、`min-h-11` StarButton（Task 4）、`h-11 w-11` DatePicker chevron（Task 4）。
- Produces: onboarding 移动端 padding 收窄 + 底部 Tab 预留空间。进度条已核实在 360px 不溢出（3 圆 + 2 连接线 ≈ 176px），不改。

- [ ] **Step 1: 全文 `p-8` → `p-card`**

Edit `src/app/onboarding/onboarding-view.tsx`，`replace_all`：old `p-8`，new `p-card`。命中 :157（`p-8 md:p-10`→`p-card md:p-10`）。

- [ ] **Step 2: 三处 wrapper / 英雄区 padding**

Edit：old_string `className="mx-auto max-w-xl px-6 py-16 md:py-24 text-center text-sm text-moon-500"`（:109 空状态），new_string 把 `py-16` 改 `pt-16 pb-24`（即 `px-6 pt-16 pb-24 md:py-24 text-center text-sm text-moon-500`）。
Edit：old_string `className="flex flex-col items-center gap-5 px-8 py-14 text-center"`（:111 英雄区内层），new_string `className="flex flex-col items-center gap-5 px-card py-10 text-center"`。
Edit：old_string `className="mx-auto flex max-w-xl flex-col items-center px-6 py-10 md:py-16"`（:127 主 wrapper），new_string `className="mx-auto flex max-w-xl flex-col items-center px-6 pt-10 pb-24 md:py-16"`。

- [ ] **Step 3: 类型检查 + 浏览器验证（进度条重点）**

Run: `npx tsc --noEmit`
Expected: PASS

Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 打开 `/onboarding` → `preview_eval` `document.documentElement.scrollWidth - document.documentElement.clientWidth`（应 0）→ `preview_screenshot` 进度条区域。
Expected: 进度条 3 圆 + 2 连接线完整可见、不溢出、不被截断。

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/onboarding-view.tsx
git commit -m "feat: onboarding 移动端 padding 收窄 + pb-24（进度条已核实无需改）"
```

---

### Task 7: 今日星语 today-view.tsx

**Files:**
- Modify: `src/app/today/today-view.tsx`

**Interfaces:**
- Consumes: `p-card`/`px-card`（Task 2）。

- [ ] **Step 1: 全文 `p-8` → `p-card`**

Edit `src/app/today/today-view.tsx`，`replace_all`：old `p-8`，new `p-card`。命中 :125（`p-8 md:p-10`→`p-card md:p-10`）、:151、:172、:200、:222。

- [ ] **Step 2: 三处 wrapper / 英雄区**

Edit：old_string `className="mx-auto max-w-xl px-6 py-16 md:py-24"`（:61 空状态 wrapper），new_string `className="mx-auto max-w-xl px-6 pt-16 pb-24 md:py-24"`。
Edit：old_string `className="flex flex-col items-center gap-5 px-8 py-14 text-center"`（:63 英雄区内层），new_string `className="flex flex-col items-center gap-5 px-card py-10 text-center"`。
Edit：old_string `className="mx-auto max-w-3xl px-6 py-12 md:py-16"`（:86 主 wrapper），new_string `className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16"`。

> `ShareCardFrame` 内固定 px（:244 等）不动（截图导出需要）。

- [ ] **Step 3: 类型检查 + 浏览器验证**

Run: `npx tsc --noEmit` → PASS
Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 打开 `/today` → `preview_eval` 查 scrollWidth 差值（应 0）→ `preview_inspect` 一张内容卡 padding（≈20px）。
Expected: 无溢出；卡片 padding 移动端 20px。

- [ ] **Step 4: Commit**

```bash
git add src/app/today/today-view.tsx
git commit -m "feat: 今日星语移动端 p-card + pb-24"
```

---

### Task 8: 星盘 chart-view.tsx

**Files:**
- Modify: `src/app/chart/chart-view.tsx`

**Interfaces:**
- Consumes: `p-card`/`px-card`（Task 2）。

- [ ] **Step 1: 全文 `p-8` → `p-card`**

Edit `src/app/chart/chart-view.tsx`，`replace_all`：old `p-8`，new `p-card`。命中 :35（`group p-8`→`group p-card`）、:121（`p-8 md:p-10`→`p-card md:p-10`）、:200、:216、:227、:239。

- [ ] **Step 2: 两处 wrapper / 英雄区**

Edit：old_string `className="mx-auto max-w-xl px-6 py-16 md:py-24"`（:80 空状态 wrapper），new_string `className="mx-auto max-w-xl px-6 pt-16 pb-24 md:py-24"`。
Edit：old_string `className="flex flex-col items-center gap-5 px-8 py-14 text-center"`（:82 英雄区内层），new_string `className="flex flex-col items-center gap-5 px-card py-10 text-center"`。
Edit：old_string `className="mx-auto max-w-3xl px-6 py-12 md:py-16"`（:118 主 wrapper），new_string `className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16"`。

- [ ] **Step 3: 类型检查 + 浏览器验证（PositionCard summary 重点）**

Run: `npx tsc --noEmit` → PASS
Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 打开 `/chart` → `preview_screenshot` 一张 PositionCard 折叠态 → `preview_inspect` summary 行（图标 48 + 标题 + `+` 号 36）确认不溢出、文字不截断。
Expected: summary 单行不溢出；`+` 号 chevron 为装饰性 span（h-9 w-9），按 spec 不强制 44px，保留。

- [ ] **Step 4: Commit**

```bash
git add src/app/chart/chart-view.tsx
git commit -m "feat: 星盘移动端 p-card + pb-24"
```

---

### Task 9: 关系 relationship-view.tsx

**Files:**
- Modify: `src/app/relationship/relationship-view.tsx`

**Interfaces:**
- Consumes: `p-card`/`px-card`（Task 2）。

- [ ] **Step 1: 全文 `p-8` → `p-card`，`px-8` → `px-card`**

Edit `src/app/relationship/relationship-view.tsx`：
- `replace_all` old `p-8` new `p-card`。命中 :79（`p-8 md:p-10`→`p-card md:p-10`）、:135、:175、:196、:218、:228、:241。
- `replace_all` old `px-8` new `px-card`。命中 :59（英雄区内层 `px-8 py-14`→`px-card py-14`）、:294（星邮入口卡 `px-8 py-12`→`px-card py-12`）。

- [ ] **Step 2: 两处 wrapper / 英雄区垂直 padding**

Edit：old_string `className="mx-auto max-w-xl px-6 py-16 md:py-24"`（:57 空状态 wrapper），new_string `className="mx-auto max-w-xl px-6 pt-16 pb-24 md:py-24"`。
Edit：把 :59 英雄区内层 `px-card py-14` 进一步改 `px-card py-10`：old_string `className="flex flex-col items-center gap-5 px-card py-14 text-center"`，new_string `className="flex flex-col items-center gap-5 px-card py-10 text-center"`。
Edit：old_string `className="mx-auto max-w-3xl px-6 py-12 md:py-16"`（:75 主 wrapper），new_string `className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16"`。

> `ShareCardFrame`（:242 内）固定 px 不动。

- [ ] **Step 3: 类型检查 + 浏览器验证**

Run: `npx tsc --noEmit` → PASS
Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 打开 `/relationship` → 输入 TA 生日生成结果 → `preview_eval` 查 scrollWidth 差值（应 0）→ 目视 growth+advice 已堆叠（`md:grid-cols-2` 移动端单列）。
Expected: 结果页无溢出；双卡移动端单列堆叠。

- [ ] **Step 4: Commit**

```bash
git add src/app/relationship/relationship-view.tsx
git commit -m "feat: 关系星图移动端 p-card/px-card + pb-24"
```

---

### Task 10: 星愿 wishes-view.tsx

**Files:**
- Modify: `src/app/wishes/wishes-view.tsx`

**Interfaces:**
- Consumes: `p-card`（Task 2）。

- [ ] **Step 1: 全文 `p-8` → `p-card`**

Edit `src/app/wishes/wishes-view.tsx`，`replace_all`：old `p-8` new `p-card`。命中 :154。

- [ ] **Step 2: 头部堆叠防溢出 + 关闭按钮触控 + wrapper**

Edit：old_string `className="mb-8 flex items-end justify-between"`（:125 头部），new_string `className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"`。
Edit：old_string `className="grid h-8 w-8 place-items-center rounded-full border border-hairline text-moon-400 hover:text-moon-100"`（:160 关闭按钮），new_string 同串但 `h-8 w-8` → `h-11 w-11`。
Edit：old_string `className="mx-auto max-w-3xl px-6 py-12 md:py-16"`（:123 wrapper），new_string `className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16"`。

- [ ] **Step 3: 类型检查 + 浏览器验证（头部重点）**

Run: `npx tsc --noEmit` → PASS
Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 打开 `/wishes` → `preview_screenshot` 头部 → `preview_inspect` 关闭按钮（新建表单展开后）读 `height`（应 44px）→ 目视头部标题与「写星愿」按钮移动端纵向堆叠。
Expected: 头部不溢出；关闭按钮 44×44；标题与按钮堆叠。

- [ ] **Step 4: Commit**

```bash
git add src/app/wishes/wishes-view.tsx
git commit -m "feat: 星愿移动端头部堆叠 + 关闭按钮 44px + p-card/pb-24"
```

---

### Task 11: 星座详情 explore/[slug]/page.tsx

**Files:**
- Modify: `src/app/explore/[slug]/page.tsx`

**Interfaces:**
- Consumes: `p-card`/`px-card`（Task 2）。

- [ ] **Step 1: 全文 `p-8` → `p-card`，`px-8` → `px-card`**

Edit `src/app/explore/[slug]/page.tsx`：
- `replace_all` old `p-8` new `p-card`。命中 :45（`p-8 md:p-10`→`p-card md:p-10`）、:81、:89、:97、:105。
- `replace_all` old `px-8` new `px-card`。命中 :151（`px-8 py-10`→`px-card py-10`）。

- [ ] **Step 2: wrapper**

Edit：old_string `className="mx-auto max-w-3xl px-6 py-12 md:py-16"`（:42），new_string `className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16"`。
Edit：把 :151 进一步 `px-card py-10` → `px-card py-8`：old_string `className="flex flex-col items-center gap-5 px-card py-10 text-center"`，new_string `className="flex flex-col items-center gap-5 px-card py-8 text-center"`。

- [ ] **Step 3: 类型检查 + 浏览器验证**

Run: `npx tsc --noEmit` → PASS
Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 打开任一 `/explore/aries` 等 → `preview_eval` 查 scrollWidth 差值（应 0）。
Expected: 详情页无溢出。

- [ ] **Step 4: Commit**

```bash
git add "src/app/explore/[slug]/page.tsx"
git commit -m "feat: 星座详情移动端 p-card/px-card + pb-24"
```

---

### Task 12: 个人中心 profile-view.tsx

**Files:**
- Modify: `src/app/profile/profile-view.tsx`

**Interfaces:**
- Consumes: `p-card`（Task 2）。

- [ ] **Step 1: 全文 `p-8` → `p-card`，`px-6 py-12 md:py-16` → `px-6 pt-12 pb-24 md:py-16`**

Edit `src/app/profile/profile-view.tsx`：
- `replace_all` old `p-8` new `p-card`。命中 :93（`p-8 md:flex-row`→`p-card md:flex-row`）、:133、:168、:200、:213、:244。
- `replace_all` old `px-6 py-12 md:py-16` new `px-6 pt-12 pb-24 md:py-16`。命中 :63、:81 两处 wrapper。

> :55 `px-6 py-24` 已足够（96px 底部），不动。

- [ ] **Step 2: 类型检查 + 浏览器验证（stat 网格重点）**

Run: `npx tsc --noEmit` → PASS
Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 打开 `/profile` → `preview_inspect` :172 附近 `grid grid-cols-3 gap-3` 统计瓦片，确认三列不挤、数字不截断。
Expected: 统计三列可读；若仍挤（实测发现），再 Edit 把 `gap-3` → `gap-2` 并提交（同 commit）。

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/profile-view.tsx
git commit -m "feat: 个人中心移动端 p-card + pb-24"
```

---

### Task 13: 星邮 mail 子组件

**Files:**
- Modify: `src/components/mail/MailCompose.tsx`
- Modify: `src/components/mail/MailPreview.tsx`
- Modify: `src/components/mail/MailSealing.tsx`
- Modify: `src/components/mail/MailSent.tsx`
- Modify: `src/app/mail/mail-view.tsx`

**Interfaces:**
- Consumes: 无新 token（星邮信纸为白底 bespoke 设计，用响应式 px 而非 `p-card`）。
- Produces: 星邮流程移动端小字 ≥14px、触控 ≥44/36px、padding 收窄、底部 Tab 预留。

> 编辑依据为移动端扫描的行锚定发现（class 串稳定，行号可能微偏移，以 class 串为准匹配）。

- [ ] **Step 1: MailCompose.tsx——小字与 chips/按钮触控**

Edit `src/components/mail/MailCompose.tsx`：
- `p-7 md:p-9` → `p-5 md:p-7`（写信面板内边距，:115）。
- `text-[11px]`（确认提示、签名提示、正文字数计数，:134/:208/:237）→ `text-xs`（三处，逐处或用上下文唯一串替换）。
- 标题建议 chips `px-3 py-1.5 text-[12px]` → `px-3 py-2 min-h-9 text-sm`（:173）。
- 定时发送 toggle `text-[12px]` → `text-sm`（:243-245）。
- 「即将上线」按钮 `px-2.5 py-1 text-[11px]` → `px-3 py-1.5 min-h-9 text-xs`（:250）。

- [ ] **Step 2: MailPreview.tsx——信纸 padding 与 checkbox**

Edit `src/components/mail/MailPreview.tsx`：
- 信纸 `px-6 py-8 md:px-10 md:py-10` → `px-5 py-6 md:px-8 md:py-8`（:43）。
- checkbox `h-4 w-4` → `h-5 w-5`（:66），并给其所在可点 label 行加 `min-h-11`（确保整行可点 ≥44px；具体加在 label/容器 className 上，按实际结构）。

- [ ] **Step 3: MailSealing.tsx / MailSent.tsx / mail-view.tsx**

Edit `src/components/mail/MailSealing.tsx`：`py-10` → `py-6`（:98 封存页纵向）。
Edit `src/components/mail/MailSent.tsx`：`py-12` → `py-8`（:9）；masked 收件人 pill `text-[13px]` → `text-sm`（:18）。
Edit `src/app/mail/mail-view.tsx`：old_string `className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col items-center justify-center px-5 py-14 md:py-20"`，new_string 把 `py-14` 改 `pt-14 pb-24`。

- [ ] **Step 4: 类型检查 + 构建验证**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS

- [ ] **Step 5: 浏览器验证整条星邮流程**

Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 打开 `/mail` → 走 intro→compose→preview→sealing→sent → 每步 `preview_screenshot` → 重点 `preview_inspect` chips/按钮 `min-height`、checkbox 行 ≥44、信纸 padding 移动端收窄、封存动画 2.6s 正常播放（`prefers-reduced-motion` 下跳过）。
Expected: 全流程无溢出；chips/按钮触控达标；封存动画播放正常。

- [ ] **Step 6: Commit**

```bash
git add src/components/mail/MailCompose.tsx src/components/mail/MailPreview.tsx src/components/mail/MailSealing.tsx src/components/mail/MailSent.tsx src/app/mail/mail-view.tsx
git commit -m "feat: 星邮移动端小字/chips/checkbox 触控 + 信纸 padding + pb-24"
```

---

### Task 14: 次要页 login + explore 列表

**Files:**
- Modify: `src/app/login/login-view.tsx`
- Modify: `src/app/explore/page.tsx`

**Interfaces:**
- Consumes: 无（仅 wrapper 底部 padding）。

- [ ] **Step 1: login wrapper pb-24**

Edit `src/app/login/login-view.tsx`：old_string `className="mx-auto max-w-md px-6 py-16 md:py-24"`，new_string `className="mx-auto max-w-md px-6 pt-16 pb-24 md:py-24"`。

- [ ] **Step 2: explore 列表 wrapper pb-24**

Edit `src/app/explore/page.tsx`：old_string `className="mx-auto max-w-6xl px-6 py-12 md:py-16"`，new_string `className="mx-auto max-w-6xl px-6 pt-12 pb-24 md:py-16"`。

> explore 列表 `grid-cols-2` 在手机端即为两列，扫描确认无溢出，不改 grid。

- [ ] **Step 3: 类型检查 + 浏览器验证**

Run: `npx tsc --noEmit` → PASS
Run: `preview_start` name `stella-dev` → `preview_resize` preset `mobile` → 打开 `/login` 与 `/explore` → 目视底部内容不被 Tab 遮挡；explore 两列卡片不溢出。
Expected: 两页底部留白足够；explore 无溢出。

- [ ] **Step 4: Commit**

```bash
git add src/app/login/login-view.tsx src/app/explore/page.tsx
git commit -m "feat: login/explore 列表移动端 pb-24"
```

---

### Task 15: 全站移动端回归验证

**Files:**
- 无文件改动（纯验证任务；若发现残留问题，回到对应 Task 修补并再验证）。

- [ ] **Step 1: 启动 dev server 并设两个手机视口**

Run: `preview_start` name `stella-dev`
Run: `preview_resize` preset `mobile`（375×812，iOS）
（随后用 `preview_resize` width 360 height 780 模拟小 Android，逐页复验关键页。）

- [ ] **Step 2: 11 页逐页过——无横向溢出**

对每个路由 `/ /onboarding /today /chart /relationship /wishes /explore /explore/aries /profile /mail /login` 执行 `preview_eval`：
```js
document.documentElement.scrollWidth - document.documentElement.clientWidth
```
Expected: 每页均为 0（无横向滚动条）。

- [ ] **Step 3: 抽查触控目标与底部 Tab**

`preview_inspect` 各页一个主按钮/输入/Tab 项，`min-height` 或 `height` ≥44px。
`preview_inspect` 底部 Tab 容器 `margin-bottom` 反映 `max(1rem, env(safe-area-inset-bottom))`。
目视每页末段内容与底部 Tab 之间有空隙（不被遮挡）。

- [ ] **Step 4: 关键页截图存档**

`preview_screenshot` 首页、onboarding、星盘、关系、星邮写信、星愿，确认视觉无回退（卡片呼吸感、玻璃拟态、深夜底色不变）。

- [ ] **Step 5: 最终 lint / 类型 / 构建闸**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: 全绿。

- [ ] **Step 6: 若全绿，本任务无需 commit（纯验证）；若有修补，对应 Task 单独提交后回到 Step 2 重验该页。**

---

## 自检（planner self-review）

**Spec 覆盖：**
- §1.1 viewport → Task 1 ✓
- §1.2 safe-area → Task 3（底部）✓；顶部 inset 留待实测发现再加（spec 措辞为「若被遮挡」）✓
- §1.3 流式间距 token → Task 2（`p-card`/`px-card`）✓；`px-6` 经核实非问题，未引 `px-page`，已记于 Task 2 说明 ✓
- §1.4 触控兜底 → Task 3（Tab）、Task 4（StarButton sm / DatePicker chevron）、Task 10（关闭按钮）、Task 13（chips/checkbox）；装饰性 `+` 号 chevron 按 spec 不动 ✓
- §2 逐页清扫 5 类问题 → 每页 Task 含 `preview_eval` scrollWidth 检查 + `preview_inspect` + 截图 ✓
- §3 针对性细化 → 星盘 PositionCard（Task 8 Step 3）、关系 DatePicker（Task 4 + Task 9）、星邮全流程（Task 13）、onboarding 进度条（Task 6 已核实无需改）、首页流星入口（Task 5 截图验证）✓
- §4 验证与范围 → Task 15 全站回归 + lint/tsc/build 闸；非目标（不动分享卡 px、不改色值/字体/动效、不处理 Turnstile、不做 i18n、不管 md 以上）已记于 Global Constraints 与各 Task 注释 ✓

**占位扫描：** 无 TBD/TODO；每步含具体 Edit old/new 或具体命令。星邮子组件以 class 串匹配（行号可能偏移），已在 Task 13 注明以 class 串为准——非占位，是稳定匹配策略。

**类型/命名一致：** `p-card`/`px-card`/`--space-card` 在 Task 2 定义，后续 Task 一致使用；`min-h-11`、`h-11 w-11` 全计划一致。

**风险已记：** 流式 token 替换后卡片呼吸感变化（Task 2 Step 4 + Task 15 Step 4 截图存档验证）；星邮 uncommitted 改动一并适配（Task 13 基于当前工作树）。
