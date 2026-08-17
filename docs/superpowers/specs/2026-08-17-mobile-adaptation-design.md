# 星语星愿 · 移动端适配设计

- 日期：2026-08-17
- 范围：全站 11 个页面 + 全站共享层（`SiteNav` / `globals.css` / `layout.tsx`）
- 目标设备：竖屏 360–430px（小 Android / SE 至 iPhone Pro Max）
- 成功标准：高级移动体验——正确性（无溢出、无小字、无塌陷、触控 ≥44px、内容可达）+ 密集页移动原生信息层级（非「桌面缩小」手感）

## 背景

站点已上线（stella.ranran.org.cn），并非「桌面专用、从零做移动端」。现状：

- `SiteNav` 已有移动端底部 Tab（`md:hidden`，5 个 Tab，玻璃拟态）+ 桌面浮岛导航（`hidden md:flex`）。
- 全站 23 个文件、90 处 `sm:/md:/lg:` 响应断点；星盘、关系等密集页的 `grid` 在手机上会自动堆叠，字号也有 `md:` 响应。
- `globals.css` 有完整设计 token（深夜蓝黑色系、玻璃卡片、`min-h-dvh`、`prefers-reduced-motion` 支持）。
- 已知缺口：`layout.tsx` 无显式 `viewport` 导出；底部 Tab 无 `safe-area-inset`；散落 `p-8`/`px-5`/`px-6` 未统一；部分触控目标可能 <44px。

结论：本期不是「重构密集页」，而是「地基打磨 + 实测发现并修正针对性问题」。

## 方案

方案 1（已选定）：先打地基，再逐页实测清扫。理由：站点已有设计系统，地基改动全站共享、做一次胜过每页各改一遍，间距/字号更一致、总工作量更小。

## 设计

### 第 1 节 · 地基（全站共享，做一次）

#### 1.1 viewport 与 themeColor
`src/app/layout.tsx` 新增 `export const viewport: Viewport`：
- `width=device-width, initialScale: 1, viewportFit: "cover"`
- `themeColor: "#080a12"`

理由：现无显式 viewport，靠 Next.js 默认；缺 `viewport-fit=cover` 会使刘海屏/灵动岛内容被裁。`themeColor` 让 iOS Safari 顶栏配色。

#### 1.2 safe-area 内边距
- `SiteNav` 移动端底部 Tab 容器：加 `padding-bottom: env(safe-area-inset-bottom)`（用 `max()` 与既有 `mb-4` 协同），避免 iPhone home indicator 压 Tab。
- 顶部 fixed 元素：若清扫中发现被状态栏遮挡，补 `padding-top: env(safe-area-inset-top)`。

#### 1.3 流式间距 token
`globals.css` `@theme` 新增两个流式 token：
- `--space-page-x: clamp(1rem, 4vw, 1.5rem)` —— 页面横向 padding
- `--space-card: clamp(1.25rem, 5vw, 2rem)` —— 卡片内边距

替换散落在各页的 `px-5`/`px-6`（页面容器）与 `p-8`/`p-5`（卡片内边距）。直接解决最高频的「重 padding 吃横向空间」问题，跨页一致。

> 替代方案（未选）：不引 token、直接逐处改 `p-5 sm:p-8`。token 化多一层抽象但保证全站一致，故选 token。

#### 1.4 触控目标兜底
对主要可交互控件兜底 `min-height: 44px`（`min-h-11`）：主按钮、导航项（含底部 Tab 各项）、表单输入框。不含装饰性小图标按钮（如 `PositionCard` 的 `+` 号 chevron，h-9 w-9=36px）——这类单独评估，必要时单独放大，避免 blanket 规则改变既有布局。补齐之前 P2 可能未全覆盖的触控目标。

### 第 2 节 · 逐页清扫策略

起 dev server + 浏览器手机视口，覆盖 390px（iPhone 14）与 360px（小 Android/SE），逐页过 11 页：
首页、onboarding、今日星语（today）、星盘（chart）、关系（relationship）、星愿（wishes）、探索列表（explore）、星座详情（explore/[slug]）、个人中心（profile）、星邮（mail）、登录（login）。

每页查 5 类问题：
1. 横向溢出（出现横向滚动条 / 元素超出视口）
2. 文字 <14px（过小不可读）
3. 布局塌陷（grid/flex 未正确堆叠、元素重叠）
4. 触控目标 <44px
5. 内容被 fixed 底部 Tab 遮挡（页面底部是否预留空间）

代码里已看到的苗头（清扫时优先验证，不预设为 bug）：
- 星盘/关系页多处 `p-8` 重 padding（地基 token 收掉，需逐处替换）。
- `SiteNav` 顶部在移动端仍保留 `h-16` 占位（桌面浮岛导航在移动端隐藏），底部 fixed Tab 似乎没给页面预留底部空间——逐页确认 `main` 容器底部 padding。

### 第 3 节 · 针对性移动原生细化

基于已读的三个密集页，清扫时重点看以下点（实测后再定是否改）：

- **星盘（chart）**：`PositionCard` 的 summary（图标 48 + +号 36 + 文本）在 360px 是否拥挤；`<details>` 折叠是好模式，保留。
- **关系（relationship）**：输入表单 `DatePicker` 在手机原生滚轮体验；结果页 growth+advice 已堆叠（`md:grid-cols-2`），保留；分享卡内部固定 px 不动（截图导出需要）。
- **星邮（mail）**（用户在做的功能，重点）：多步流程（intro→compose→preview→sealing→sent）每步独立组件，需读 `MailCompose`/`MailPreview` 确认 textarea 高度、按钮触控、封存动画 2.6s 在手机是否正常播放；uncommitted 改动一并适配。
- **onboarding**：多步出生信息表单（城市/时间），手机端表单是大头，重点看。
- **首页**：桌面「流星藏着一封信」入口在移动端流星动画位置与可点区。

### 第 4 节 · 验证与范围

**验证**：每页改完即用 `preview_screenshot` + `preview_inspect` 在手机视口确认无溢出、触控达标、底部 Tab 不遮挡，再进下一页。

**范围**：
- 11 个页面 + `SiteNav` / `globals.css` / `layout.tsx` 地基。
- 含星邮 uncommitted 改动（一并适配）。

**非目标**：
- 不改色值/字体/动效曲线（soft-skill 规则保留）。
- 不新增功能。
- 不动分享卡内部固定 px（截图导出需要）。
- 不处理真实 Turnstile / 登录线上验证（已知沙箱浏览器限制，300030）。
- 不做 i18n。
- 横屏 / 平板（`md:` 以上断点）维持现状，本期只管竖屏 360–430px。

## 风险与注意

- 流式 token 替换散落 padding 时，需逐处确认视觉未回退（间距变小后卡片呼吸感可能变化），在浏览器验证。
- 星邮流程有 uncommitted 改动，适配时基于当前工作树状态，不与在做的收件人昵称功能冲突。
- `env(safe-area-inset-*)` 在非刘海设备回退为 0，不影响普通屏。
