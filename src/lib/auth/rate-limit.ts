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
