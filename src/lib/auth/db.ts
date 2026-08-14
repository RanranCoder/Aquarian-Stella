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
