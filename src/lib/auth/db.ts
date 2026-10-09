import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";
import type { User } from "./types";

const CREATE_USERS = `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
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

export async function getUserById(db: D1Database, id: number): Promise<User | null> {
  return (
    (await db
      .prepare("SELECT id, email, created_at FROM users WHERE id = ?")
      .bind(id)
      .first<User>()) ?? null
  );
}

/** 创建带密码的用户。若邮箱已存在则抛出错误。 */
export async function createUserWithPassword(
  db: D1Database,
  email: string,
  passwordHash: string,
): Promise<User> {
  await db.prepare(CREATE_USERS).run();
  await db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .bind(email, passwordHash)
    .run();
  const row = await db
    .prepare("SELECT id, email, created_at FROM users WHERE email = ?")
    .bind(email)
    .first<User>();
  if (!row) throw new Error("user creation failed");
  return row;
}

/** 获取用户的密码哈希。用户不存在或无密码时返回 null。 */
export async function getUserPasswordHash(
  db: D1Database,
  email: string,
): Promise<string | null> {
  const row = await db
    .prepare("SELECT password_hash FROM users WHERE email = ?")
    .bind(email)
    .first<{ password_hash: string | null }>();
  if (!row) return null;
  return row.password_hash ?? null;
}

/** 更新用户的密码哈希。 */
export async function updateUserPassword(
  db: D1Database,
  email: string,
  passwordHash: string,
): Promise<void> {
  await db
    .prepare("UPDATE users SET password_hash = ? WHERE email = ?")
    .bind(passwordHash, email)
    .run();
}

/** 删除用户。返回是否成功（false = 用户不存在）。 */
export async function deleteUser(
  db: D1Database,
  email: string,
): Promise<boolean> {
  await db.prepare(CREATE_USERS).run();
  const res = await db
    .prepare("DELETE FROM users WHERE email = ?")
    .bind(email)
    .run();
  return res.meta.changes === 1;
}

/**
 * 删除用户的全部云端数据（单 batch 原子完成）。
 * 默认连 users 行一起删；keepUser=true 时保留账号（用于「清除云端数据」而非删号）。
 * 级联 profiles / wishes / star_mails / otp / 相关限流行，避免孤儿数据。
 */
export async function deleteUserData(
  db: D1Database,
  uid: number,
  email: string,
  opts?: { keepUser?: boolean },
): Promise<void> {
  await db.prepare(CREATE_USERS).run();
  const stmts: D1PreparedStatement[] = [];
  if (!opts?.keepUser) {
    stmts.push(db.prepare("DELETE FROM users WHERE id = ?").bind(uid));
  }
  stmts.push(db.prepare("DELETE FROM profiles WHERE user_id = ?").bind(uid));
  stmts.push(db.prepare("DELETE FROM wishes WHERE user_id = ?").bind(uid));
  stmts.push(db.prepare("DELETE FROM star_mails WHERE user_id = ?").bind(uid));
  stmts.push(db.prepare("DELETE FROM otp_codes WHERE email = ?").bind(email));
  stmts.push(db.prepare("DELETE FROM rate_limits WHERE key IN (?, ?)").bind(`otp:rate:${email}`, `login:rate:${email}`));
  await db.batch(stmts);
}
