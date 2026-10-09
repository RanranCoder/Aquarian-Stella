import type { D1Database } from "@cloudflare/workers-types";

const CREATE_WISHES = `CREATE TABLE IF NOT EXISTS wishes (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  completed_at TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER
)`;

const ALTER_UPDATED_AT = "ALTER TABLE wishes ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0";
const ALTER_DELETED_AT = "ALTER TABLE wishes ADD COLUMN deleted_at INTEGER";

export interface WishRow {
  id: string;
  user_id: number;
  title: string;
  category: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  updated_at: number;
}

export interface SyncWish {
  id: string;
  title: string;
  category: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: number;
}

/** 确保表存在 */
async function ensureTable(db: D1Database): Promise<void> {
  await db.prepare(CREATE_WISHES).run();
}

/**
 * 运行时迁移：为老库补 updated_at / deleted_at 列。
 * SQLite 常量默认加列是元数据级、不重写表；已迁移过的表抛 duplicate column 忽略。
 */
async function ensureColumns(db: D1Database): Promise<void> {
  for (const ddl of [ALTER_UPDATED_AT, ALTER_DELETED_AT]) {
    try {
      await db.prepare(ddl).run();
    } catch {
      // duplicate column name —— 该列已存在
    }
  }
}

/** 获取用户所有未删除愿望（含 updated_at） */
export async function getWishesByUser(db: D1Database, userId: number): Promise<WishRow[]> {
  await ensureTable(db);
  await ensureColumns(db);
  const result = await db
    .prepare(
      "SELECT id, user_id, title, category, status, created_at, completed_at, updated_at FROM wishes WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
    )
    .bind(userId)
    .all<WishRow>();
  return result.results ?? [];
}

/** 获取用户所有已 tombstone 删除的愿望 id 与其删除时刻 */
export async function getDeletedIdsByUser(
  db: D1Database,
  userId: number,
): Promise<Array<{ id: string; deletedAt: number }>> {
  await ensureTable(db);
  await ensureColumns(db);
  const result = await db
    .prepare(
      "SELECT id, deleted_at FROM wishes WHERE user_id = ? AND deleted_at IS NOT NULL",
    )
    .bind(userId)
    .all<{ id: string; deleted_at: number }>();
  return (result.results ?? []).map((r) => ({ id: r.id, deletedAt: r.deleted_at }));
}

const DELETE_SQL =
  "UPDATE wishes SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL";
const UPSERT_SQL =
  `INSERT INTO wishes (id, user_id, title, category, status, created_at, completed_at, updated_at)
   VALUES (?,?,?,?,?,?,?,?)
   ON CONFLICT(id) DO UPDATE SET
     title = excluded.title,
     category = excluded.category,
     status = excluded.status,
     completed_at = excluded.completed_at,
     updated_at = excluded.updated_at,
     deleted_at = NULL
   WHERE wishes.user_id = excluded.user_id AND excluded.updated_at > wishes.updated_at`;

/**
 * 增量合并同步：
 * - deletes：对指定 id 做 tombstone（并 bump updated_at，纳入同一版本时钟），仅限本用户、仅未删除行。
 * - upserts：逐条 upsert；同 id 且 incoming 更新（updated_at 更大）才覆盖并清除 tombstone；
 *   撞他人 id 或 incoming 陈旧则 0 行，安全静默。
 * 分片执行以规避 D1 batch 100 语句上限。
 */
export async function syncWishes(
  db: D1Database,
  userId: number,
  input: { upserts: SyncWish[]; deletes: string[] },
  now: number,
): Promise<void> {
  await ensureTable(db);
  await ensureColumns(db);
  const CHUNK = 50;

  for (let i = 0; i < input.deletes.length; i += CHUNK) {
    const chunk = input.deletes.slice(i, i + CHUNK);
    await db.batch(
      chunk.map((id) => db.prepare(DELETE_SQL).bind(now, now, id, userId)),
    );
  }

  for (let i = 0; i < input.upserts.length; i += CHUNK) {
    const chunk = input.upserts.slice(i, i + CHUNK);
    await db.batch(
      chunk.map((w) =>
        db
          .prepare(UPSERT_SQL)
          .bind(w.id, userId, w.title, w.category, w.status, w.createdAt, w.completedAt ?? null, w.updatedAt),
      ),
    );
  }
}