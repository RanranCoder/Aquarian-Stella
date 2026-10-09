# 星语星愿 · Aquarian Stella

面向年轻人的星象自我探索网站。**看见星象，也看见自己。**

不强调"预测命运"，而是把复杂的星象信息翻译成普通用户可以理解、可以反思、可以记录的语言。

## 功能

- **今日星语** — 按你的太阳/月亮/上升星座，每天生成一句星语、关键词、维度与今日建议
- **我的星盘** — 太阳、月亮、上升三个星位，三种看见自己的角度
- **关系星图** — 输入你与 TA 的出生信息，看看你们的星星如何相遇，可生成分享图
- **我的星愿** — 写下愿望，让星星陪你看它慢慢实现
- **十二星座探索** — 每个星座的性格、爱情、事业与今日星语

## 技术栈

- **Next.js 16**（App Router）+ React 19 + TypeScript + Tailwind v4
- **Cloudflare** 部署（OpenNext / Workers）
- **astronomy-engine**（基于 JPL DE441 星历）— 真实的月亮星座、上升星座与月相计算

## 内容准确性与可信度

项目遵循一套内容信任体系（见 [src/lib/trust.ts](src/lib/trust.ts)）：

> 事实由计算引擎产生，解释由规则库约束，语言由 AI 生成。

- **内容分层**：S 天文计算数据 / A 占星规则 / B 个性化解释 / C 情绪陪伴
- **AI 限制**：禁止修改计算结果、禁止生成确定性预言、禁止制造恐慌、禁止伪装成科学结论
- **自动校验**：`npm test` 运行星盘回归测试（太阳星座边界、上升与日出位置的交叉验证、内容合规检测）

## 本地运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000

## 测试

```bash
npm test        # 星盘回归测试 + 内容合规
npm run lint    # ESLint
npm run build   # 生产构建
```

## 部署（Cloudflare）

使用 Cloudflare Workers Builds 自动部署时，请设置：

- Build command：`npm run build:cloudflare`
- Deploy command：`npx opennextjs-cloudflare deploy`

`npm run build` 只构建 Next.js；`npm run build:cloudflare` 会额外生成
Wrangler 所需的 `.open-next/worker.js` 和 `.open-next/assets`。

```bash
npm run preview   # 本地预览 Worker
npm run deploy    # 部署到 Cloudflare Workers
```
