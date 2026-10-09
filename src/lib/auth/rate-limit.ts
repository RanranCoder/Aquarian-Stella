import type { D1Database } from "@cloudflare/workers-types";
import { RATE_EMAIL_PER_HOUR, RATE_IP_PER_HOUR, RATE_HOUR_SEC } from "./types";

const CREATE_RATE = `CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_end INTEGER NOT NULL
)`;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
}

/** 确保槽位存在（count=0，窗口从 windowEnd 起算）。 */
async function ensureWindow(db: D1Database, key: string, windowEnd: number): Promise<void> {
  await db.prepare(CREATE_RATE).run();
  await db
    .prepare("INSERT INTO rate_limits (key, count, window_end) VALUES (?,0,?) ON CONFLICT(key) DO NOTHING")
    .bind(key, windowEnd)
    .run();
}

/** 窗口已过期则归零并开新窗口。 */
async function resetExpired(db: D1Database, key: string, windowEnd: number, now: number): Promise<void> {
  await db
    .prepare("UPDATE rate_limits SET count = 0, window_end = ? WHERE key = ? AND window_end < ?")
    .bind(windowEnd, now, key)
    .run();
}

/**
 * 原子地 claim 一个槽位：先确保存在并重置过期窗口，再
 * UPDATE count = count + 1 WHERE count < max，只有 count 达到上限才拒绝。
 */
async function claimSlot(
  db: D1Database,
  key: string,
  max: number,
  windowEnd: number,
  now: number,
): Promise<boolean> {
  await ensureWindow(db, key, windowEnd);
  await resetExpired(db, key, windowEnd, now);
  const res = await db
    .prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ? AND count < ?")
    .bind(key, max)
    .run();
  return res.meta.changes === 1;
}

/** 一次调用原子 claim 邮箱与 IP 两个槽位，任一项达到上限即不允许。 */
export async function claimRate(db: D1Database, email: string, ip: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowEnd = now + RATE_HOUR_SEC * 1000;
  const emailOk = await claimSlot(db, `otp:rate:${email}`, RATE_EMAIL_PER_HOUR, windowEnd, now);
  if (!emailOk) return { allowed: false, retryAfterSec: RATE_HOUR_SEC };
  const ipOk = await claimSlot(db, `otp:rate:${ip}`, RATE_IP_PER_HOUR, windowEnd, now);
  if (!ipOk) return { allowed: false, retryAfterSec: RATE_HOUR_SEC };
  return { allowed: true };
}

/** 密码登录限流：独立 key 前缀（login:rate），邮箱 + IP 各自计次到 max。 */
export async function claimAccountRate(
  db: D1Database,
  email: string,
  ip: string,
  max: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowEnd = now + RATE_HOUR_SEC * 1000;
  const emailOk = await claimSlot(db, `login:rate:${email}`, max, windowEnd, now);
  if (!emailOk) return { allowed: false, retryAfterSec: RATE_HOUR_SEC };
  const ipOk = await claimSlot(db, `login:rate:${ip}`, max, windowEnd, now);
  if (!ipOk) return { allowed: false, retryAfterSec: RATE_HOUR_SEC };
  return { allowed: true };
}

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
