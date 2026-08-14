# 邮箱 OTP 登录 · 设计文档

> 日期：2026-08-14 ｜ 项目：星语星愿 / Aquarian Stella ｜ 状态：已确认，待实现

## 背景与目标

产品目前是纯前端 MVP：Next.js 16.3.1（App Router）+ React 19 + TypeScript + Tailwind v4，部署在 Cloudflare Workers（@opennextjs/cloudflare），所有用户数据（出生资料、星愿）存 localStorage，无后端。

本轮目标：为产品引入**邮箱验证码（OTP）登录**，建立账号身份体系，为后续云同步打地基。因产品转向**国际化**，放弃微信登录（绑定大陆备案生态）。

- **登录机制**：邮箱 6 位验证码（无密码）
- **界面语言**：暂用中文，i18n 后期做（文案集中，方便日后翻译）
- **范围**：Phase 1 只做「账号 + 登录态」，用户数据仍留 localStorage；**云同步（出生资料/星愿上云）为 Phase 2**，本次只预留结构，不实现
- **人机验证**：Cloudflare Turnstile（防 `send-code` 接口被机器人轰炸）
- **发信**：Resend

## 关键决策

| 决策点 | 结论 | 理由 |
|---|---|---|
| 后端形态 | Next.js Route Handler 跑在**现有 Worker** 上 | OpenNext 已把服务端代码托管在 Workers，无需独立后端，`npm run deploy` 一条命令 |
| 数据库 | Cloudflare **D1**（SQLite） | 用户表需要关系查询与长期存储 |
| 瞬时数据 | Cloudflare **KV** | 验证码/限流计数需要 TTL 自动过期，KV 原生支持，无需清理任务 |
| 发信 | **Resend**（`mail.ranran.org.cn`） | 免费额度 100 封/天、REST API 简单、Worker 直接 `fetch` 调用；封装成模块可替换 |
| 人机验证 | **Cloudflare Turnstile** | 免费、与 Cloudflare 账号配套、非交互式体验好 |
| 会话 | 无状态**签名 cookie**（HMAC-SHA256） | 无需会话表，Worker 上 Web Crypto 原生支持 |
| 密码存储 | 不存密码 | OTP 机制本身无密码 |

## 外部前提（用户侧已完成/进行中）

| 事项 | 值 | 状态 |
|---|---|---|
| 主域名 | `ranran.org.cn` | 已有 |
| 站点子域 | `stella.ranran.org.cn` | 生产环境 Workers 自定义域名，**部署时配置** |
| 发信子域 | `mail.ranran.org.cn` | Resend 已验证（用户授权一键连接 Cloudflare） |
| Resend API Key | 待用户创建 | 进行中 |
| Turnstile widget | Site/Secret Key 已提供 | 已完成 |
| 生产 DNS 自定义域名 | `stella.ranran.org.cn` → Worker | 部署时配 |

## 环境变量

| 变量 | 位置 | 性质 | 说明 |
|---|---|---|---|
| `RESEND_API_KEY` | `.dev.vars` / wrangler secret | 机密 | 待用户提供 |
| `AUTH_SECRET` | 同上 | 机密 | 会话签名密钥，实现时生成（`openssl rand -base64 32`） |
| `AUTH_FROM_EMAIL` | 同上 | 配置 | `no-reply@mail.ranran.org.cn` |
| `AUTH_DEV_LOG_CODE` | 同上 | 本地开关 | `true` 时验证码打印终端、不真发信 |
| `TURNSTILE_SECRET_KEY` | 同上 | 机密 | 生产用真实值；**本地用测试密钥** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | 不引入 | 公开 | **用代码常量**，`NODE_ENV === 'production'` 时取真实 Site Key，否则取测试 Key（避免 NEXT_PUBLIC_ 构建期内联的部署复杂度） |

> Turnstile 分环境：真实 widget 的 hostname 不含 `localhost`，本地必须用**测试密钥**（Site `1x00000000000000000000AA` / Secret `1x0000000000000000000000000000000AA`，恒通过）；生产用真实密钥（Site/Secret 已提供）。

## 数据层

### D1 —— `users` 表（Phase 1 仅此一张）

```sql
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    UNIQUE NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

> Phase 2 云同步时新增 `profiles` / `wishes` 表，以 `user_id` 外键关联；Phase 1 不动现有 localStorage 结构。

### KV —— 瞬时数据（均带 TTL）

| Key | Value | TTL |
|---|---|---|
| `otp:{email}` | `{ code_hash, attempts, expires_at }` | 10 分钟 |
| `otp:rate:{email}` | 发送次数 | 1 小时 |
| `otp:rate:{ip}` | 发送次数 | 1 小时 |

验证码**只存哈希**（SHA-256），用后即删；attempts 在 verify 时校验（≤5 次，超过失效）。

## API（4 个 Route Handler）

```
POST /api/auth/send-code   body: { email, turnstileToken }
  ① 校验邮箱格式
  ② Turnstile siteverify（secret + token + remoteip）→ 不通过返回 403
  ③ 限流：每邮箱 ≤5 次/时、每 IP ≤10 次/时
  ④ 生成 6 位验证码 → KV 存哈希
  ⑤ 调 Resend 发信（AUTH_DEV_LOG_CODE=true 时打印终端代替）
  ⑥ 返回 { ok }

POST /api/auth/verify      body: { email, code }
  ① 查 KV `otp:{email}`
  ② 校验未过期 & attempts < 5
  ③ 比对哈希（恒定时间），用后即删
  ④ D1 upsert 用户（邮箱即账号，首次登录自动注册）
  ⑤ 签发会话 cookie → 返回 { ok, user }

GET  /api/auth/me          校验会话 cookie → { user } | null

POST /api/auth/logout      清 cookie → { ok }
```

## 会话

- **无状态签名 cookie**：`{ uid, email, exp }` 用 `AUTH_SECRET` HMAC-SHA256 签名
- 属性：`HttpOnly` + `Secure` + `SameSite=Lax`，`Max-Age` 30 天
- 校验在 `/api/auth/me` 与需要登录态的接口执行

## 前端

在个人中心新增 **AccountCard 账号卡**（[profile-view.tsx](src/app/profile/profile-view.tsx) 顶部资料卡上方）：

- **未登录**：邮箱输入框 → 「发送验证码」（60s 重发倒计时）→ 6 位验证码输入 → 「登录」
- **已登录**：显示邮箱 + 「退出登录」
- 组件挂载时请求 `/api/auth/me` 判定状态
- Turnstile widget 以显式渲染方式嵌入（managed 模式，深色主题适配玻璃拟态），token 随 `send-code` 请求提交

数据仍全在 localStorage，登录不改变现有数据行为；隐私文案「数据不上传服务器」继续成立，账号卡补一句「账号信息存储于服务器」。

## 安全清单

- 验证码只存哈希、不落日志、10 分钟过期、用后即删、最多试 5 次
- `send-code` 双重防护：Turnstile + 限流（防轰炸 / 防暴力破解）
- 密钥（`RESEND_API_KEY` / `AUTH_SECRET` / `TURNSTILE_SECRET_KEY`）只进 `.dev.vars` / wrangler secret，不进代码、不进 git
- Cookie HttpOnly + Secure + SameSite=Lax
- 邮件内容固定模板，不含用户可控内容（防注入）

## 测试与本地开发

- **Vitest 单测**（沿用现有 [vitest.config.ts](vitest.config.ts)）：邮箱校验、验证码生成、哈希比对、会话签名/验签、过期与重放、限流逻辑
- **本地手测**：`AUTH_DEV_LOG_CODE=true` + Turnstile 测试密钥，`next dev` 下验证码打印终端，跑通「输邮箱 → 终端抄验证码 → 登录」全流程，不依赖任何真实钥匙
- D1/KV 本地经 `initOpenNextCloudflareForDev` 代理（已配置），无需真数据库

## 文件改动清单

```
新增  src/app/api/auth/send-code/route.ts
新增  src/app/api/auth/verify/route.ts
新增  src/app/api/auth/me/route.ts
新增  src/app/api/auth/logout/route.ts
新增  src/lib/auth/otp.ts          （验证码生成/校验/哈希）
新增  src/lib/auth/session.ts      （cookie 签名/验签）
新增  src/lib/auth/db.ts           （D1 访问封装）
新增  src/lib/auth/email.ts        （Resend 发信，可替换模块）
新增  src/lib/auth/rate-limit.ts   （KV 限流）
新增  src/lib/auth/turnstile.ts    （服务端 siteverify，可替换模块）
新增  src/lib/auth/types.ts        （共享类型）
新增  src/components/AccountCard.tsx（登录 UI + Turnstile widget）
改动  src/app/profile/profile-view.tsx（接入账号卡）
改动  wrangler.jsonc               （D1 + KV binding）
改动  .dev.vars                    （密钥占位：AUTH_SECRET、Turnstile 测试密钥等）
新增  .dev.vars.example            （模板，供他人参考）
```

## 部署（生产）

1. `wrangler secret put`：`RESEND_API_KEY`、`AUTH_SECRET`、`TURNSTILE_SECRET_KEY`
2. wrangler.jsonc 加 D1 + KV binding，本地 `wrangler d1 migrations` / 建表
3. Workers 自定义域名：`stella.ranran.org.cn` 指向 Worker（dashboard 或 wrangler routes）
4. `npm run deploy`

## Phase 2（本次不实现，仅留设计意图）

- `profiles` / `wishes` 表上云，登录后 localStorage → D1 合并
- 隐私文案整体重写
- 多设备同步、离线兜底
- i18n 双语
