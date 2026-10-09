import type { D1Database } from "@cloudflare/workers-types";
import type { BirthProfile } from "@/lib/astrology";

const CREATE_PROFILES = `CREATE TABLE IF NOT EXISTS profiles (
  user_id             INTEGER PRIMARY KEY,
  nickname            TEXT NOT NULL DEFAULT '',
  birth_date          TEXT NOT NULL,
  birth_time          TEXT,
  birth_time_accuracy TEXT NOT NULL DEFAULT 'unknown',
  birth_city          TEXT,
  interests           TEXT NOT NULL DEFAULT '[]',
  onboarded           INTEGER NOT NULL DEFAULT 1,
  updated_at          INTEGER NOT NULL,
  created_at          INTEGER NOT NULL
)`;

export interface ProfileRow {
  user_id: number;
  nickname: string;
  birth_date: string;
  birth_time: string | null;
  birth_time_accuracy: string;
  birth_city: string | null;
  interests: string;
  onboarded: number;
  updated_at: number;
  created_at: number;
}

/** 云端 profile = 客户端 BirthProfile + 服务端带上的同步元信息 */
export type CloudProfile = BirthProfile & { onboarded: boolean; updatedAt: number };

/** 确保表存在 */
async function ensureTable(db: D1Database): Promise<void> {
  await db.prepare(CREATE_PROFILES).run();
}

function parseInterests(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** 读取用户云端档案。不存在返回 null。 */
export async function getProfile(
  db: D1Database,
  userId: number,
): Promise<CloudProfile | null> {
  await ensureTable(db);
  const row = await db
    .prepare(
      "SELECT user_id, nickname, birth_date, birth_time, birth_time_accuracy, birth_city, interests, onboarded, updated_at, created_at FROM profiles WHERE user_id = ?",
    )
    .bind(userId)
    .first<ProfileRow>();
  if (!row) return null;
  return {
    nickname: row.nickname,
    birthDate: row.birth_date,
    birthTime: row.birth_time ?? undefined,
    birthTimeAccuracy: row.birth_time_accuracy as BirthProfile["birthTimeAccuracy"],
    birthCity: row.birth_city ?? undefined,
    interests: parseInterests(row.interests),
    onboarded: row.onboarded === 1,
    updatedAt: row.updated_at,
  };
}

/** 写入（1:1 by user_id）整行 upsert；created_at 首插生成、更新时保留。 */
export async function upsertProfile(
  db: D1Database,
  userId: number,
  profile: BirthProfile,
  updatedAt: number,
): Promise<void> {
  await ensureTable(db);
  const accuracy = profile.birthTimeAccuracy ?? "unknown";
  const interests = JSON.stringify(profile.interests ?? []);
  await db
    .prepare(
      `INSERT INTO profiles (user_id, nickname, birth_date, birth_time, birth_time_accuracy, birth_city, interests, onboarded, updated_at, created_at)
       VALUES (?,?,?,?,?,?,?,1,?,?)
       ON CONFLICT(user_id) DO UPDATE SET
         nickname = excluded.nickname,
         birth_date = excluded.birth_date,
         birth_time = excluded.birth_time,
         birth_time_accuracy = excluded.birth_time_accuracy,
         birth_city = excluded.birth_city,
         interests = excluded.interests,
         onboarded = 1,
         updated_at = excluded.updated_at`,
    )
    .bind(
      userId,
      profile.nickname,
      profile.birthDate,
      profile.birthTime ? profile.birthTime : null,
      accuracy,
      profile.birthCity ? profile.birthCity : null,
      interests,
      updatedAt,
      updatedAt,
    )
    .run();
}