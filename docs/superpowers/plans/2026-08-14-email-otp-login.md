# 邮箱 OTP 登录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为星语星愿添加邮箱 6 位验证码（OTP）登录 + Cloudflare Turnstile 人机验证，Phase 1 只做账号与登录态（用户数据仍留 localStorage）。

**Architecture:** 后端为 Next.js Route Handler，跑在现有 Cloudflare Worker（OpenNext）上，无需独立服务。D1 存 `users` 表（持久），KV 存验证码与频率限制（TTL 自动过期）。发信走 Resend API（本地 `AUTH_DEV_LOG_CODE=true` 时打印终端不发信）。会话为无状态 HMAC 签名 HttpOnly cookie。Turnstile 服务端验证 `send-code` 接口。

**Tech Stack:** Next.js 16.3.1（App Router）· React 19 · TypeScript · Tailwind v4 · Cloudflare Workers/@opennextjs/cloudflare · D1 · KV · Resend · Cloudflare Turnstile · vitest

## Global Constraints

- **Next.js 16 App Router Route Handler 规范**：文件位于 `src/app/api/**/route.ts`；签名 `export async function POST(request: NextRequest)`；读取 cookie 用 `request.cookies.get(name)`，设置 cookie 用 `NextResponse.cookies.set(name, value, opts)`，删除用 `res.cookies.delete(name)`。**禁止**在 Route Handler 里用同步 `cookies()`（本版本是 async，且不需要）。
- **Cloudflare 环境访问**：一律 `const { env } = await getCloudflareContext({ async: true });`，从 `@opennextjs/cloudflare` 导入。所有 binding 与 secret（`DB`/`OTP_KV`/`RESEND_API_KEY`/`AUTH_SECRET`/`AUTH_FROM_EMAIL`/`AUTH_DEV_LOG_CODE`/`TURNSTILE_SECRET_KEY`）都从 `env` 读取。
- **可测试性**：纯函数模块（`otp.ts`/`session.ts`/`crypto.ts`/`rate-limit.ts`/`email.ts`/`turnstile.ts`）**不得在模块顶层** `import` 或调用 `@opennextjs/cloudflare`；依赖（secret、kv、fetch）一律作为函数参数注入。只有 `db.ts` 和 4 个 route.ts 可以接触 `getCloudflareContext`。
- **类型**：`@cloudflare/workers-types` 提供 `D1Database`/`KVNamespace`（只做 `import type`，不加入 tsconfig `types` 以免污染全局）。`CloudflareEnv` 接口在 `src/cloudflare-env.d.ts` 中增强（`declare global` 合并）。
- **密钥安全**：密钥只进 `.dev.vars`（已 gitignored）/ `wrangler secret`。**绝不写进任何被提交的文件**。`RESEND_API_KEY`、`AUTH_SECRET`、真实 `TURNSTILE_SECRET_KEY` 都已安全配置（`.dev.vars` 本地 / 部署时 wrangler secret）。
- **Turnstile 分环境**：Site Key 是公开常量，放 `src/components/Turnstile.tsx`，按 `process.env.NODE_ENV === "production"` 切换真实值 `0x4AAAAAAEP16wGPL8pzhXil` 与测试值 `1x00000000000000000000AA`。Secret Key 服务端：本地 `.dev.vars` 用测试密钥 `1x0000000000000000000000000000000AA`（恒通过），生产用真实值。
- **文案**：暂用中文，固定模板，不含用户可控内容（防注入）。邮件正文为 6 位验证码 + 10 分钟有效期提示。
- **设计 token**：输入框样式统一 `h-12 w-full rounded-xl border border-hairline bg-white/[0.04] px-4 text-[15px] text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400`；卡片用 `GlassCard`（`glow="none"` 或 `"lav"`）；按钮语义色 `moon`/`lav`/`gold`。
- **测试**：`npm test` = `vitest run`，测试文件 `src/**/*.test.ts`，node 环境，`@` alias 指向 `src`。crypto 全局可用（Node 20+ / Workers）。
- 设计文档：`docs/superpowers/specs/2026-08-14-email-otp-login-design.md`（已 commit，本计划的唯一事实来源，遇到分歧以 spec 为准）。

---

### Task 1: 配置地基 — 类型依赖、CloudflareEnv 增强、wrangler bindings

**Files:**
- Modify: `package.json`（加 devDependency `@cloudflare/workers-types`）
- Create: `src/cloudflare-env.d.ts`
- Modify: `wrangler.jsonc`（加 `d1_databases` + `kv_namespaces`）

**Interfaces:**
- Produces: 全局 `CloudflareEnv` 接口额外字段（`DB: D1Database`、`OTP_KV: KVNamespace`、`RESEND_API_KEY`、`AUTH_SECRET`、`AUTH_FROM_EMAIL`、`AUTH_DEV_LOG_CODE?`、`TURNSTILE_SECRET_KEY`），供后续所有 `getCloudflareContext().env` 使用。

- [ ] **Step 1: 安装类型依赖**

```bash
npm i -D @cloudflare/workers-types
```

- [ ] **Step 2: 创建 `src/cloudflare-env.d.ts`**

```ts
import type { D1Database, KVNamespace } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    OTP_KV: KVNamespace;
    RESEND_API_KEY: string;
    AUTH_SECRET: string;
    AUTH_FROM_EMAIL: string;
    AUTH_DEV_LOG_CODE?: string;
    TURNSTILE_SECRET_KEY: string;
  }
}

export {};
```

- [ ] **Step 3: 给 `wrangler.jsonc` 加 D1 与 KV binding**

在现有 `images` 配置块之后追加（保持 JSONC 注释风格）：

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "xingyu-xingyuan-db",
    "database_id": "local-dev-placeholder"
  }
],
"kv_namespaces": [
  {
    "binding": "OTP_KV",
    "id": "local-dev-placeholder"
  }
]
```

> 本地开发由 Miniflare 经 `getPlatformProxy` 模拟 D1/KV（无需真实资源）。若 Step 4 报缺资源错误，改用真实资源：`npx wrangler d1 create xingyu-xingyuan-db` 与 `npx wrangler kv namespace create OTP_KV`（需已登录 Cloudflare），把返回的真实 ID 填回。

- [ ] **Step 4: 验证类型与本地代理可用**

```bash
npx tsc --noEmit
npm run dev
```

Expected: `tsc` 无错误；`next dev` 正常启动、无 binding 相关报错（先不要请求 API，纯验证启动）。

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/cloudflare-env.d.ts wrangler.jsonc
git commit -m "chore: 配置 D1/KV binding 与 Cloudflare 环境类型"
```

---

### Task 2: crypto 工具 + OTP 模块（TDD）

**Files:**
- Create: `src/lib/auth/types.ts`
- Create: `src/lib/auth/crypto.ts`
- Create: `src/lib/auth/otp.ts`
- Test: `src/lib/auth/crypto.test.ts`
- Test: `src/lib/auth/otp.test.ts`

**Interfaces:**
- Produces (被 Task 3/4/5/6/7 使用)：
  - `types.ts`: `interface User { id: number; email: string; created_at: string }`、`interface SessionPayload { uid: number; email: string; exp: number }`、`interface StoredOtp { hash: string; attempts: number; expiresAt: number }`、常量 `SESSION_COOKIE = "stella_session"`、`SESSION_MAX_AGE_MS = 30*24*60*60*1000`、`OTP_TTL_MS = 10*60*1000`、`OTP_MAX_ATTEMPTS = 5`、`RATE_EMAIL_PER_HOUR = 5`、`RATE_IP_PER_HOUR = 10`、`RATE_HOUR_SEC = 3600`
  - `crypto.ts`: `encode(s): Uint8Array`、`toBase64Url(bytes): string`、`fromBase64Url(s): Uint8Array`、`toHex(bytes): string`、`sha256Hex(s): Promise<string>`、`hmacSha256(data, secret): Promise<string>`（返回 base64url）、`timingSafeEqual(a, b): boolean`
  - `otp.ts`: `isValidEmail(email): boolean`、`generateOtp(): string`（6 位）、`hashCode(code): Promise<string>`（sha256Hex）、`verifyOtp(input, storedHash): Promise<boolean>`（timingSafeEqual）

- [ ] **Step 1: 写失败的测试 — `crypto.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { encode, toBase64Url, fromBase64Url, toHex, hmacSha256, sha256Hex, timingSafeEqual } from "./crypto";

describe("crypto", () => {
  it("base64url roundtrip", () => {
    const bytes = encode("{\"a\":1}");
    const b64 = toBase64Url(bytes);
    expect(b64).not.toMatch(/[+/=]/);
    expect(new TextDecoder().decode(fromBase64Url(b64))).toBe("{\"a\":1}");
  });

  it("sha256Hex is deterministic and hex", async () => {
    const h1 = await sha256Hex("123456");
    const h2 = await sha256Hex("123456");
    const h3 = await sha256Hex("654321");
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hmacSha256 differs by secret and is base64url", async () => {
    const a = await hmacSha256("body", "secret-a");
    const b = await hmacSha256("body", "secret-b");
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/[+/=]/);
  });

  it("timingSafeEqual compares correctly", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/lib/auth/crypto.test.ts
```

Expected: FAIL，报 `Cannot find module './crypto'`。

- [ ] **Step 3: 实现 `types.ts`**

```ts
export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface SessionPayload {
  uid: number;
  email: string;
  exp: number; // unix ms
}

export interface StoredOtp {
  hash: string;
  attempts: number;
  expiresAt: number; // unix ms
}

export const SESSION_COOKIE = "stella_session";
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const RATE_EMAIL_PER_HOUR = 5;
export const RATE_IP_PER_HOUR = 10;
export const RATE_HOUR_SEC = 3600;
```

- [ ] **Step 4: 实现 `crypto.ts`**

```ts
const enc = new TextEncoder();

export function encode(s: string): Uint8Array {
  return enc.encode(s);
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return toHex(new Uint8Array(digest));
}

export async function hmacSha256(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64Url(new Uint8Array(sig));
}

export function timingSafeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
```

- [ ] **Step 5: 写失败的测试 — `otp.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { isValidEmail, generateOtp, hashCode, verifyOtp } from "./otp";

describe("otp", () => {
  it("isValidEmail accepts normal emails and rejects garbage", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("hello.world+tag@example.co.uk")).toBe(true);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });

  it("generateOtp returns 6 digits", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });

  it("hashCode is deterministic", async () => {
    expect(await hashCode("123456")).toBe(await hashCode("123456"));
    expect(await hashCode("123456")).not.toBe(await hashCode("123457"));
  });

  it("verifyOtp matches only the right code", async () => {
    const h = await hashCode("482913");
    expect(await verifyOtp("482913", h)).toBe(true);
    expect(await verifyOtp("482914", h)).toBe(false);
  });
});
```

- [ ] **Step 6: 运行测试确认失败**

```bash
npx vitest run src/lib/auth/otp.test.ts
```

Expected: FAIL，`Cannot find module './otp'`。

- [ ] **Step 7: 实现 `otp.ts`**

```ts
import { sha256Hex, timingSafeEqual } from "./crypto";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email);
}

export function generateOtp(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, "0");
}

export function hashCode(code: string): Promise<string> {
  return sha256Hex(code);
}

export async function verifyOtp(input: string, storedHash: string): Promise<boolean> {
  const inputHash = await sha256Hex(input);
  return timingSafeEqual(inputHash, storedHash);
}
```

- [ ] **Step 8: 运行两个测试确认通过**

```bash
npx vitest run src/lib/auth
```

Expected: 全部 PASS。

- [ ] **Step 9: Commit**

```bash
git add src/lib/auth/types.ts src/lib/auth/crypto.ts src/lib/auth/otp.ts src/lib/auth/crypto.test.ts src/lib/auth/otp.test.ts
git commit -m "feat: 邮箱校验与验证码生成/哈希工具（含单测）"
```

---

### Task 3: 会话签名模块（TDD）

**Files:**
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/session.test.ts`

**Interfaces:**
- Consumes: `types.ts`（`SessionPayload`）、`crypto.ts`（`toBase64Url`/`fromBase64Url`/`encode`/`hmacSha256`/`timingSafeEqual`）
- Produces（被 Task 7 使用）：
  - `signSession(payload: SessionPayload, secret: string): Promise<string>` — 返回 `base64url(payload).sig` 格式令牌
  - `verifySession(token: string, secret: string): Promise<SessionPayload | null>` — 验签 + 校验 `exp`，失败/过期返回 `null`

- [ ] **Step 1: 写失败的测试 — `session.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";
import type { SessionPayload } from "./types";

const SECRET = "test-secret-123";
const payload: SessionPayload = { uid: 7, email: "a@b.com", exp: Date.now() + 100000 };

describe("session", () => {
  it("signs and verifies a roundtrip token", async () => {
    const token = await signSession(payload, SECRET);
    const verified = await verifySession(token, SECRET);
    expect(verified).toEqual(payload);
  });

  it("rejects tampered tokens", async () => {
    const token = await signSession(payload, SECRET);
    const tampered = token.slice(0, -2) + (token.endsWith("AA") ? "BB" : "AA");
    expect(await verifySession(tampered, SECRET)).toBeNull();
  });

  it("rejects tokens signed with a different secret", async () => {
    const token = await signSession(payload, SECRET);
    expect(await verifySession(token, "other-secret")).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const expired = await signSession({ ...payload, exp: Date.now() - 1000 }, SECRET);
    expect(await verifySession(expired, SECRET)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifySession("not-a-token", SECRET)).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/lib/auth/session.test.ts
```

Expected: FAIL，`Cannot find module './session'`。

- [ ] **Step 3: 实现 `session.ts`**

```ts
import { encode, toBase64Url, fromBase64Url, hmacSha256, timingSafeEqual } from "./crypto";
import type { SessionPayload } from "./types";

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = toBase64Url(encode(JSON.stringify(payload)));
  const sig = await hmacSha256(body, secret);
  return `${body}.${sig}`;
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSha256(body, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (typeof payload.uid !== "number" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/lib/auth/session.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/session.ts src/lib/auth/session.test.ts
git commit -m "feat: 会话签名/验签（HMAC 无状态 cookie）"
```

---

### Task 4: 频率限制模块（TDD）

**Files:**
- Create: `src/lib/auth/rate-limit.ts`
- Test: `src/lib/auth/rate-limit.test.ts`

**Interfaces:**
- Consumes: `types.ts`（`RATE_EMAIL_PER_HOUR`/`RATE_IP_PER_HOUR`/`RATE_HOUR_SEC`）
- Produces（被 Task 7 使用）：
  - `interface SimpleKV { get(key: string): Promise<string | null>; put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> }` — `KVNamespace` 结构上满足该窄接口，测试用内存实现
  - `interface RateLimitResult { allowed: boolean; retryAfterSec?: number }`
  - `checkRateLimit(kv: SimpleKV, email: string, ip: string): Promise<RateLimitResult>`
  - `incrementRate(kv: SimpleKV, email: string, ip: string): Promise<void>`

- [ ] **Step 1: 写失败的测试 — `rate-limit.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { checkRateLimit, incrementRate, type SimpleKV } from "./rate-limit";
import { RATE_EMAIL_PER_HOUR, RATE_IP_PER_HOUR } from "./types";

class MemoryKV implements SimpleKV {
  private map = new Map<string, { value: string; exp: number }>();
  async get(key: string): Promise<string | null> {
    const e = this.map.get(key);
    if (!e) return null;
    if (Date.now() > e.exp) { this.map.delete(key); return null; }
    return e.value;
  }
  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    this.map.set(key, { value, exp: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : Infinity });
  }
}

async function prime(kv: MemoryKV, times: number, key: string) {
  for (let i = 0; i < times; i++) {
    const n = Number((await kv.get(key)) ?? "0") + 1;
    await kv.put(key, String(n), { expirationTtl: 3600 });
  }
}

describe("rate-limit", () => {
  it("allows requests under the limit", async () => {
    const kv = new MemoryKV();
    expect(await checkRateLimit(kv, "a@b.com", "1.2.3.4")).toEqual({ allowed: true });
    await incrementRate(kv, "a@b.com", "1.2.3.4");
    expect(await checkRateLimit(kv, "a@b.com", "1.2.3.4")).toEqual({ allowed: true });
  });

  it("blocks when the email limit is hit", async () => {
    const kv = new MemoryKV();
    await prime(kv, RATE_EMAIL_PER_HOUR, `otp:rate:a@b.com`);
    const r = await checkRateLimit(kv, "a@b.com", "9.9.9.9");
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSec).toBeDefined();
  });

  it("blocks when the IP limit is hit even if email is fresh", async () => {
    const kv = new MemoryKV();
    await prime(kv, RATE_IP_PER_HOUR, "otp:rate:1.2.3.4");
    const r = await checkRateLimit(kv, "a@b.com", "1.2.3.4");
    expect(r.allowed).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/lib/auth/rate-limit.test.ts
```

Expected: FAIL，`Cannot find module './rate-limit'`。

- [ ] **Step 3: 实现 `rate-limit.ts`**

```ts
import { RATE_EMAIL_PER_HOUR, RATE_IP_PER_HOUR, RATE_HOUR_SEC } from "./types";

export interface SimpleKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
}

async function getCount(kv: SimpleKV, key: string): Promise<number> {
  const v = await kv.get(key);
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

async function bump(kv: SimpleKV, key: string): Promise<void> {
  const n = (await getCount(kv, key)) + 1;
  await kv.put(key, String(n), { expirationTtl: RATE_HOUR_SEC });
}

export async function checkRateLimit(kv: SimpleKV, email: string, ip: string): Promise<RateLimitResult> {
  const [emailCount, ipCount] = await Promise.all([
    getCount(kv, `otp:rate:${email}`),
    getCount(kv, `otp:rate:${ip}`),
  ]);
  if (emailCount >= RATE_EMAIL_PER_HOUR) return { allowed: false, retryAfterSec: RATE_HOUR_SEC };
  if (ipCount >= RATE_IP_PER_HOUR) return { allowed: false, retryAfterSec: RATE_HOUR_SEC };
  return { allowed: true };
}

export async function incrementRate(kv: SimpleKV, email: string, ip: string): Promise<void> {
  await Promise.all([bump(kv, `otp:rate:${email}`), bump(kv, `otp:rate:${ip}`)]);
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/lib/auth/rate-limit.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/rate-limit.ts src/lib/auth/rate-limit.test.ts
git commit -m "feat: OTP 发送频率限制（KV 计数 + TTL）"
```

---

### Task 5: 发信（Resend）+ 人机验证（Turnstile）模块（TDD）

**Files:**
- Create: `src/lib/auth/email.ts`
- Create: `src/lib/auth/turnstile.ts`
- Test: `src/lib/auth/email.test.ts`
- Test: `src/lib/auth/turnstile.test.ts`

**Interfaces:**
- Consumes: 无内部依赖
- Produces（被 Task 7 使用）：
  - `sendOtpEmail(opts: { email: string; code: string; from: string; apiKey: string; devLog: boolean }): Promise<void>` — `devLog=true` 时 `console.log` 打印验证码并返回（不发信）；否则 POST `https://api.resend.com/emails`，非 2xx 抛错
  - `verifyTurnstileToken(token: string, secret: string, ip?: string): Promise<boolean>` — POST `https://challenges.cloudflare.com/turnstile/v0/siteverify`（form-encoded），仅 `success === true` 返回 `true`

- [ ] **Step 1: 写失败的测试 — `email.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendOtpEmail } from "./email";

describe("sendOtpEmail", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("logs the code and does not fetch in devLog mode", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await sendOtpEmail({ email: "a@b.com", code: "123456", from: "no-reply@x.com", apiKey: "k", devLog: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("123456"));
  });

  it("posts to the Resend API with bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await sendOtpEmail({ email: "a@b.com", code: "123456", from: "no-reply@x.com", apiKey: "re_xxx", devLog: false });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_xxx" }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toEqual(["a@b.com"]);
    expect(body.text).toContain("123456");
  });

  it("throws when Resend responds non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(
      sendOtpEmail({ email: "a@b.com", code: "123456", from: "no-reply@x.com", apiKey: "k", devLog: false }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/lib/auth/email.test.ts
```

Expected: FAIL，`Cannot find module './email'`。

- [ ] **Step 3: 实现 `email.ts`**

```ts
export async function sendOtpEmail(opts: {
  email: string;
  code: string;
  from: string;
  apiKey: string;
  devLog: boolean;
}): Promise<void> {
  const { email, code, from, apiKey, devLog } = opts;
  if (devLog) {
    console.log(`[AUTH DEV] 登录验证码 for ${email}: ${code}`);
    return;
  }
  const subject = "你的星语星愿登录验证码";
  const text = `你的登录验证码是：${code}\n\n验证码 10 分钟内有效。如果不是你本人操作，请忽略此邮件。`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject, text }),
  });
  if (!res.ok) throw new Error(`resend failed: ${res.status}`);
}
```

- [ ] **Step 4: 写失败的测试 — `turnstile.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "./turnstile";

describe("verifyTurnstileToken", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns true when siteverify succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await verifyTurnstileToken("tok", "secret", "1.2.3.4")).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.body).toContain("remoteip=1.2.3.4");
  });

  it("returns false when siteverify fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }));
    expect(await verifyTurnstileToken("tok", "secret")).toBe(false);
  });

  it("returns false when the HTTP call errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    expect(await verifyTurnstileToken("tok", "secret")).toBe(false);
  });
});
```

- [ ] **Step 5: 运行测试确认失败**

```bash
npx vitest run src/lib/auth/turnstile.test.ts
```

Expected: FAIL，`Cannot find module './turnstile'`。

- [ ] **Step 6: 实现 `turnstile.ts`**

```ts
export async function verifyTurnstileToken(token: string, secret: string, ip?: string): Promise<boolean> {
  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 7: 运行两个测试确认通过**

```bash
npx vitest run src/lib/auth/email.test.ts src/lib/auth/turnstile.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth/email.ts src/lib/auth/turnstile.ts src/lib/auth/email.test.ts src/lib/auth/turnstile.test.ts
git commit -m "feat: Resend 发信与 Turnstile 服务端验证模块"
```

---

### Task 6: D1 数据访问模块（TDD with fake D1）

**Files:**
- Create: `src/lib/auth/db.ts`
- Test: `src/lib/auth/db.test.ts`

**Interfaces:**
- Consumes: `types.ts`（`User`）；`import type { D1Database } from "@cloudflare/workers-types"`
- Produces（被 Task 7 使用）：
  - `upsertUserByEmail(db: D1Database, email: string): Promise<User>` — 幂等：首次插入、重复返回已有行
  - `getUserByEmail(db: D1Database, email: string): Promise<User | null>`

- [ ] **Step 1: 写失败的测试 — `db.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { upsertUserByEmail, getUserByEmail } from "./db";

type Row = { id: number; email: string; created_at: string };

/** 记录 SQL 与参数并返回可编程结果的假 D1（只实现本模块用到的 API）。 */
class FakeD1 {
  calls: Array<{ sql: string; params: unknown[] }> = [];
  results: Row[] = [];
  prepare(sql: string) {
    const self = this;
    return {
      bind(...params: unknown[]) {
        self.calls.push({ sql, params });
        return this;
      },
      async run() {
        return { success: true };
      },
      async first<T>() {
        const r = self.results.shift();
        return (r ?? null) as T | null;
      },
    };
  }
}

describe("db", () => {
  it("upserts a user (create table, insert-or-ignore, select)", async () => {
    const db = new FakeD1();
    db.results.push({ id: 1, email: "a@b.com", created_at: "2026-08-14" });
    const user = await upsertUserByEmail(db as unknown as D1Database, "a@b.com");
    expect(user).toEqual({ id: 1, email: "a@b.com", created_at: "2026-08-14" });
    const sqls = db.calls.map((c) => c.sql);
    expect(sqls[0]).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(sqls[1]).toContain("INSERT INTO users");
    expect(sqls[1]).toContain("ON CONFLICT(email)");
    expect(sqls[2]).toContain("SELECT id, email, created_at");
    expect(db.calls[1].params).toEqual(["a@b.com"]);
    expect(db.calls[2].params).toEqual(["a@b.com"]);
  });

  it("getUserByEmail returns null when absent", async () => {
    const db = new FakeD1();
    expect(await getUserByEmail(db as unknown as D1Database, "nobody@x.com")).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/lib/auth/db.test.ts
```

Expected: FAIL，`Cannot find module './db'`。

- [ ] **Step 3: 实现 `db.ts`**

```ts
import type { D1Database } from "@cloudflare/workers-types";
import type { User } from "./types";

const CREATE_USERS = `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export async function upsertUserByEmail(db: D1Database, email: string): Promise<User> {
  await db.prepare(CREATE_USERS).run();
  await db
    .prepare("INSERT INTO users (email) VALUES (?) ON CONFLICT(email) DO NOTHING")
    .bind(email)
    .run();
  const row = await db
    .prepare("SELECT id, email, created_at FROM users WHERE email = ?")
    .bind(email)
    .first<User>();
  if (!row) throw new Error("user upsert failed");
  return row;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  return (
    (await db
      .prepare("SELECT id, email, created_at FROM users WHERE email = ?")
      .bind(email)
      .first<User>()) ?? null
  );
}
```

> 注意：测试里用 `db as unknown as D1Database` 是因为 FakeD1 只实现了窄接口；生产代码传真实的 `env.DB`。

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/lib/auth/db.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/db.ts src/lib/auth/db.test.ts
git commit -m "feat: D1 用户表访问（幂等 upsert）"
```

---

### Task 7: 4 个 Route Handler

**Files:**
- Create: `src/app/api/auth/send-code/route.ts`
- Create: `src/app/api/auth/verify/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/app/api/auth/logout/route.ts`

**Interfaces:**
- Consumes: Task 2–6 的全部产物（`otp.ts`/`session.ts`/`rate-limit.ts`/`email.ts`/`turnstile.ts`/`db.ts`/`types.ts`）
- Produces（被 Task 8 使用）：HTTP 契约
  - `POST /api/auth/send-code` `{ email, turnstileToken }` → `200 { ok: true }`；`400 { error }`（`INVALID_EMAIL`/`INVALID_BODY`/`MISSING_TURNSTILE`/`NO_CODE`…）；`403 { error: "TURNSTILE_FAILED" }`；`429 { error: "RATE_LIMITED" }`
  - `POST /api/auth/verify` `{ email, code }` → `200 { ok: true, user: { id, email } }` + `Set-Cookie: stella_session`；`400 { error }`（`INVALID_EMAIL`/`INVALID_CODE`/`NO_CODE`/`EXPIRED`/`WRONG_CODE`）；`429 { error: "TOO_MANY_ATTEMPTS" }`
  - `GET /api/auth/me` → `200 { user: { id, email } | null }`
  - `POST /api/auth/logout` → `200 { ok: true }`，清 cookie

- [ ] **Step 1: 实现 `send-code/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { generateOtp, hashCode, isValidEmail } from "@/lib/auth/otp";
import { checkRateLimit, incrementRate } from "@/lib/auth/rate-limit";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { sendOtpEmail } from "@/lib/auth/email";
import { OTP_TTL_MS } from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  let body: { email?: string; turnstileToken?: string };
  try {
    body = (await request.json()) as { email?: string; turnstileToken?: string };
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const turnstileToken = body.turnstileToken;
  if (!isValidEmail(email)) return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  if (!turnstileToken) return NextResponse.json({ error: "MISSING_TURNSTILE" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  const human = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!human) return NextResponse.json({ error: "TURNSTILE_FAILED" }, { status: 403 });

  const rl = await checkRateLimit(env.OTP_KV, email, ip);
  if (!rl.allowed) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const code = generateOtp();
  const hash = await hashCode(code);
  await env.OTP_KV.put(
    `otp:${email}`,
    JSON.stringify({ hash, attempts: 0, expiresAt: Date.now() + OTP_TTL_MS }),
    { expirationTtl: Math.ceil(OTP_TTL_MS / 1000) },
  );
  await incrementRate(env.OTP_KV, email, ip);

  await sendOtpEmail({
    email,
    code,
    from: env.AUTH_FROM_EMAIL,
    apiKey: env.RESEND_API_KEY,
    devLog: env.AUTH_DEV_LOG_CODE === "true",
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: 实现 `verify/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isValidEmail, verifyOtp } from "@/lib/auth/otp";
import { signSession } from "@/lib/auth/session";
import { upsertUserByEmail } from "@/lib/auth/db";
import { OTP_MAX_ATTEMPTS, SESSION_COOKIE, SESSION_MAX_AGE_MS, type SessionPayload, type StoredOtp } from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = (await request.json()) as { email?: string; code?: string };
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const code = body.code?.trim() ?? "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });

  const record = await env.OTP_KV.get<StoredOtp>(`otp:${email}`, "json");
  if (!record) return NextResponse.json({ error: "NO_CODE" }, { status: 400 });
  if (Date.now() > record.expiresAt) {
    await env.OTP_KV.delete(`otp:${email}`);
    return NextResponse.json({ error: "EXPIRED" }, { status: 400 });
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await env.OTP_KV.delete(`otp:${email}`);
    return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
  }

  const match = await verifyOtp(code, record.hash);
  if (!match) {
    await env.OTP_KV.put(
      `otp:${email}`,
      JSON.stringify({ ...record, attempts: record.attempts + 1 }),
      { expirationTtl: Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000)) },
    );
    return NextResponse.json({ error: "WRONG_CODE" }, { status: 400 });
  }

  await env.OTP_KV.delete(`otp:${email}`);
  const user = await upsertUserByEmail(env.DB, email);

  const payload: SessionPayload = { uid: user.id, email: user.email, exp: Date.now() + SESSION_MAX_AGE_MS };
  const token = await signSession(payload, env.AUTH_SECRET);
  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });
  return res;
}
```

- [ ] **Step 3: 实现 `me/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySession } from "@/lib/auth/session";
import { getUserByEmail } from "@/lib/auth/db";
import { SESSION_COOKIE } from "@/lib/auth/types";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });
  const { env } = await getCloudflareContext({ async: true });
  const payload = await verifySession(token, env.AUTH_SECRET);
  if (!payload) return NextResponse.json({ user: null });
  const user = await getUserByEmail(env.DB, payload.email);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
```

- [ ] **Step 4: 实现 `logout/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/types";

export async function POST(_request: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
```

- [ ] **Step 5: 类型检查**

```bash
npx tsc --noEmit
```

Expected: 无错误。若 `env.OTP_KV`/`env.DB` 类型报错，确认 `src/cloudflare-env.d.ts` 已生效（Task 1）。

- [ ] **Step 6: 本地端到端验证（手动）**

启动 `npm run dev`（后台），然后用 curl 走全流程。终端应看到 `[AUTH DEV] 登录验证码 for ...`。

```bash
# 1) 发码（测试 secret 接受占位 token XXXX.DUMMY.TOKEN.XXXX）
curl -s -X POST http://localhost:3000/api/auth/send-code \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","turnstileToken":"XXXX.DUMMY.TOKEN.XXXX"}'

# 2) 从 dev 终端拿到 6 位验证码，替换下面的 123456 后验证 → 应返回 Set-Cookie: stella_session=...
curl -s -i -X POST http://localhost:3000/api/auth/verify \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","code":"<终端里的验证码>"}'

# 3) 带 cookie 查 /me → 应返回 user
#    把上一步 Set-Cookie 的值（不含属性的分号后部分）填到 stella_session=...
curl -s http://localhost:3000/api/auth/me -H 'Cookie: stella_session=<上一步的令牌>'

# 4) 登出 → 返回 { ok: true }
curl -s -X POST http://localhost:3000/api/auth/logout

# 5) 异常路径抽查：错误验证码 → WRONG_CODE；超限发送 → 429 RATE_LIMITED
```

Expected: ① `200 { "ok": true }` 且终端打印验证码；② `200 { ok:true, user:{...} }` 且 `Set-Cookie: stella_session=`；③ `200 { user: {...} }`；④ `{ ok: true }`；⑤ 相应错误码。

> 若 Step 6 中 send-code 返回 `403 TURNSTILE_FAILED`，多半是本地用了真实 secret 而非测试密钥——检查 `.dev.vars` 里 `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`。

- [ ] **Step 7: Commit**

```bash
git add src/app/api/auth
git commit -m "feat: 邮箱 OTP 登录四接口（send-code/verify/me/logout）"
```

---

### Task 8: AccountCard 登录 UI + 个人中心接入

**Files:**
- Create: `src/components/Turnstile.tsx`
- Create: `src/components/AccountCard.tsx`
- Modify: `src/app/profile/profile-view.tsx`（顶部资料卡前插入 `<AccountCard />`）
- Modify: `src/app/profile/profile-view.tsx` 隐私文案补一句（账号信息存储于服务器）

**Interfaces:**
- Consumes: Task 7 的 HTTP 契约
- Produces: `<AccountCard />`（无 props，自包含登录/登出 UI）、`<Turnstile onToken={(t) => void} className? />`

- [ ] **Step 1: 实现 `Turnstile.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";

export const TURNSTILE_SITE_KEY =
  process.env.NODE_ENV === "production"
    ? "0x4AAAAAAEP16wGPL8pzhXil"
    : "1x00000000000000000000AA";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

export function Turnstile({
  onToken,
  className,
}: {
  onToken: (token: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let widgetId: string | undefined;

    const render = () => {
      if (!containerRef.current || widgetId || !window.turnstile) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[src*="/turnstile/v0/api.js"]');
    const boot = () => {
      if (window.turnstile) render();
    };
    if (existing) {
      existing.addEventListener("load", boot);
      boot();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.addEventListener("load", boot);
      document.head.appendChild(script);
    }

    return () => {
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}
```

- [ ] **Step 2: 实现 `AccountCard.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Turnstile } from "@/components/Turnstile";

const INPUT_CLASS =
  "h-12 w-full rounded-xl border border-hairline bg-white/[0.04] px-4 text-[15px] text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400";

type AccountState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; email: string };

function errorText(e?: string): string {
  switch (e) {
    case "INVALID_EMAIL": return "邮箱格式不正确";
    case "TURNSTILE_FAILED": return "人机验证未通过，请重试";
    case "RATE_LIMITED": return "发送太频繁，请稍后再试";
    case "NO_CODE": return "请先获取验证码";
    case "EXPIRED": return "验证码已过期，请重新获取";
    case "WRONG_CODE": return "验证码不正确";
    case "TOO_MANY_ATTEMPTS": return "尝试次数过多，请重新获取验证码";
    case "INVALID_CODE": return "请输入 6 位数字验证码";
    default: return "操作失败，请稍后重试";
  }
}

export function AccountCard() {
  const [state, setState] = useState<AccountState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as { user: { email: string } | null };
      setState(
        data.user ? { status: "authenticated", email: data.user.email } : { status: "anonymous" },
      );
    } catch {
      setState({ status: "anonymous" });
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function handleSendCode() {
    setError("");
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    if (!turnstileToken) {
      setError("请稍候，人机验证未就绪");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), turnstileToken }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(errorText(data.error));
        return;
      }
      setCooldown(60);
      setTurnstileToken("");
    } catch {
      setError("发送失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("请输入 6 位验证码");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(errorText(data.error));
        return;
      }
      setCode("");
      await refreshMe();
    } catch {
      setError("登录失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setState({ status: "anonymous" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard glow="none" className="mb-5">
      <div className="p-8">
        <h2 className="mb-4 text-sm tracking-[0.18em] text-moon-500">账号</h2>

        {state.status === "loading" && (
          <p className="text-sm text-moon-500">加载中…</p>
        )}

        {state.status === "authenticated" && (
          <div className="flex flex-col items-center gap-4">
            <p className="break-all text-[15px] text-moon-200">{state.email}</p>
            <button
              onClick={handleLogout}
              disabled={busy}
              className="flex min-h-11 items-center rounded-full border border-hairline px-5 py-2 text-sm text-moon-400 transition-colors hover:border-lav-400/50 hover:text-lav-300 disabled:opacity-50"
            >
              退出登录
            </button>
          </div>
        )}

        {state.status === "anonymous" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
              <button
                onClick={handleSendCode}
                disabled={busy || cooldown > 0}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-lav-400/15 px-5 text-sm text-lav-200 transition-colors hover:bg-lav-400/25 disabled:opacity-50"
              >
                {cooldown > 0 ? `${cooldown}s 后重发` : busy ? "发送中…" : "发送验证码"}
              </button>
            </div>

            <Turnstile onToken={setTurnstileToken} className="min-h-[65px]" />

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={INPUT_CLASS}
              />
              <button
                onClick={handleVerify}
                disabled={busy || !code}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-lav-300 to-lav-500 px-5 text-sm font-medium text-night-950 transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "登录中…" : "登录"}
              </button>
            </div>

            <p className="text-xs text-moon-500">
              未注册的邮箱将自动创建账号。验证码 10 分钟内有效。
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
```

- [ ] **Step 3: 接入个人中心 — 修改 `src/app/profile/profile-view.tsx`**

在 import 区加 `import { AccountCard } from "@/components/AccountCard";`，然后在 `{/* 资料卡 */}` 之前插入：

```tsx
<AccountCard />
```

并把隐私卡文案（原「你的出生资料与星愿默认只保存在这台设备的浏览器里，不会上传到服务器。你可以随时清除。」）追加一句：

```tsx
你的账号信息（邮箱）存储于服务器；出生资料与星愿仍只保存在这台设备的浏览器里。
```

- [ ] **Step 4: 类型检查 + lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: 无错误、无 lint 告警。

- [ ] **Step 5: 浏览器验证完整登录流程**

```bash
npm run dev
```

用 preview 打开 `http://localhost:3000/profile`：
1. 页面出现「账号」卡，未登录态（邮箱 + 发送验证码 + Turnstile 框 + 验证码输入 + 登录按钮）
2. 输入邮箱 → 点「发送验证码」→ 按钮进入 60s 倒计时，终端打印 `[AUTH DEV] 登录验证码 for ...`
3. 输入终端里 6 位验证码 → 点「登录」→ 卡片切换为「已登录」（显示邮箱 + 退出登录）
4. 刷新页面 → 仍为已登录（cookie 生效）
5. 点「退出登录」→ 恢复未登录
6. 故意输错验证码 → 显示「验证码不正确」；不发码直接点登录 → 提示先获取验证码

Expected: 以上 6 步全部符合。

- [ ] **Step 6: Commit**

```bash
git add src/components/Turnstile.tsx src/components/AccountCard.tsx src/app/profile/profile-view.tsx
git commit -m "feat: 个人中心账号卡 — 邮箱验证码登录 UI + Turnstile"
```

---

### Task 9: 全量回归与收尾

**Files:**
- 无新增（如发现问题则修复）

**Interfaces:**
- Consumes: 全部任务产物

- [ ] **Step 1: 全量测试与构建**

```bash
npm test
npm run lint
npm run build
```

Expected: vitest 全 PASS；eslint 无错误；`next build` 成功（含 OpenNext 兼容性输出）。

> 若 `npm run build` 因 Route Handler 读取 `getCloudflareContext` 而被静态优化阻断，给 4 个 route.ts 加 `export const dynamic = "force-dynamic";` 后重跑。

- [ ] **Step 2: 检查无密钥泄漏**

```bash
git status
git diff --stat
grep -rn "re_XT8ocPK8\|0x4AAAAAAEP16_DT95JnvmQh2vn_p_qsDf0" --include="*.ts" --include="*.tsx" src || echo "OK: 无真实密钥进入源码"
```

Expected: 工作区无意外文件；`src` 下不出现真实 RESEND 密钥或 Turnstile secret（Site Key `0x4AAAAAAEP16wGPL8pzhXil` 是公开常量，允许出现在 `Turnstile.tsx`）。

- [ ] **Step 3: 最终提交（如有修复）**

```bash
git add -A
git commit -m "chore: 登录功能收尾"
```

仅当 Step 1/2 有改动时执行；否则跳过。

---

## Self-Review

- **Spec 覆盖**：spec 的 8 节（外部前提/数据层/API/会话/前端/安全/测试/文件清单）均已映射到 Task 1–9；Phase 2 云同步明确不在计划内（spec 原文亦标注不实现）。Turnstile 分环境、AUTH_DEV_LOG_CODE、隐私文案补充均落实。
- **占位符扫描**：无 TBD/TODO；每个代码步骤含完整实现；手动验证步骤给出具体 curl 命令与预期响应。
- **类型一致性**：`signSession`/`verifySession`、`checkRateLimit`/`incrementRate`、`upsertUserByEmail`/`getUserByEmail`、`sendOtpEmail`/`verifyTurnstileToken` 在各任务间的签名一致；`StoredOtp`/`SessionPayload`/`User` 仅在 `types.ts` 定义一次；错误码字符串在 Task 7 产出、Task 8 消费，逐项对齐。
