import type { D1Database } from "@cloudflare/workers-types";

const CREATE_OTP = `CREATE TABLE IF NOT EXISTS otp_codes (
  email      TEXT PRIMARY KEY,
  hash       TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
)`;

export type OtpClaim = "none" | "expired" | "limited" | "ok";

interface OtpRow {
  hash: string;
  attempts: number;
  expires_at: number;
}

/** 写入或覆盖验证码（覆盖时重置尝试次数）。 */
export async function storeOtp(
  db: D1Database,
  email: string,
  hash: string,
  expiresAt: number,
): Promise<void> {
  await db.prepare(CREATE_OTP).run();
  await db
    .prepare(
      "INSERT INTO otp_codes (email, hash, attempts, expires_at) VALUES (?,?,0,?) ON CONFLICT(email) DO UPDATE SET hash=excluded.hash, attempts=0, expires_at=excluded.expires_at",
    )
    .bind(email, hash, expiresAt)
    .run();
}

/**
 * 原子地记一次尝试：无记录 → none；已过期 → 删除并返回 expired；
 * 达到次数上限 → limited；否则计次 +1 并返回 ok。
 */
export async function claimOtpAttempt(
  db: D1Database,
  email: string,
  maxAttempts: number,
  now: number,
): Promise<OtpClaim> {
  await db.prepare(CREATE_OTP).run();
  const row = await db
    .prepare("SELECT hash, attempts, expires_at FROM otp_codes WHERE email = ?")
    .bind(email)
    .first<OtpRow>();
  if (!row) return "none";
  if (row.expires_at <= now) {
    await db.prepare("DELETE FROM otp_codes WHERE email = ?").bind(email).run();
    return "expired";
  }
  const res = await db
    .prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE email = ? AND attempts < ?")
    .bind(email, maxAttempts)
    .run();
  return res.meta.changes === 1 ? "ok" : "limited";
}

/** 原子一次性消费：仅当 hash 匹配才删除（防重放），返回是否删除成功。 */
export async function consumeOtp(
  db: D1Database,
  email: string,
  hash: string,
): Promise<boolean> {
  await db.prepare(CREATE_OTP).run();
  const res = await db
    .prepare("DELETE FROM otp_codes WHERE email = ? AND hash = ?")
    .bind(email, hash)
    .run();
  return res.meta.changes === 1;
}

/** 删除验证码（用于发信失败等场景）。 */
export async function deleteOtp(db: D1Database, email: string): Promise<void> {
  await db.prepare(CREATE_OTP).run();
  await db.prepare("DELETE FROM otp_codes WHERE email = ?").bind(email).run();
}
