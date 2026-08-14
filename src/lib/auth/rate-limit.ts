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
    .bind(key, windowEnd, now)
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
