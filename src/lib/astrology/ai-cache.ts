import type { D1Database } from "@cloudflare/workers-types";

const CREATE_CACHE = `CREATE TABLE IF NOT EXISTS ai_content_cache (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key   TEXT    NOT NULL UNIQUE,
  surface     TEXT    NOT NULL,
  user_id     INTEGER NOT NULL,
  payload     TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
)`;

const CREATE_INDEX = `CREATE INDEX IF NOT EXISTS idx_cache_lookup
  ON ai_content_cache(cache_key, expires_at)`;

async function ensureTable(db: D1Database): Promise<void> {
  await db.prepare(CREATE_CACHE).run();
  await db.prepare(CREATE_INDEX).run();
}

export async function getCachedContent(
  db: D1Database,
  key: string,
): Promise<Record<string, unknown> | null> {
  await ensureTable(db);
  const now = Date.now();
  const row = await db
    .prepare("SELECT payload FROM ai_content_cache WHERE cache_key = ? AND expires_at > ?")
    .bind(key, now)
    .first<{ payload: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function setCachedContent(
  db: D1Database,
  key: string,
  surface: string,
  userId: number,
  payload: Record<string, unknown>,
  expiresAt: number,
): Promise<void> {
  await ensureTable(db);
  await db
    .prepare(
      `INSERT INTO ai_content_cache (cache_key, surface, user_id, payload, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         payload = excluded.payload,
         created_at = excluded.created_at,
         expires_at = excluded.expires_at`,
    )
    .bind(key, surface, userId, JSON.stringify(payload), Date.now(), expiresAt)
    .run();
}

export async function invalidateAiCache(db: D1Database, userId: number): Promise<void> {
  await ensureTable(db);
  await db
    .prepare("DELETE FROM ai_content_cache WHERE user_id = ?")
    .bind(userId)
    .run();
}
