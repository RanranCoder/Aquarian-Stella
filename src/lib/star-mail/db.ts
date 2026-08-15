import type { D1Database } from "@cloudflare/workers-types";

const CREATE_STAR_MAILS = `CREATE TABLE IF NOT EXISTS star_mails (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  recipient        TEXT NOT NULL,
  recipient_domain TEXT NOT NULL,
  title            TEXT NOT NULL,
  signature        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'sent',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export interface StarMailRecord {
  userId: number;
  recipient: string;
  recipientDomain: string;
  title: string;
  signature: string;
}

export async function insertStarMailRecord(db: D1Database, rec: StarMailRecord): Promise<void> {
  await db.prepare(CREATE_STAR_MAILS).run();
  await db
    .prepare(
      "INSERT INTO star_mails (user_id, recipient, recipient_domain, title, signature, status) VALUES (?,?,?,?,?, 'sent')",
    )
    .bind(rec.userId, rec.recipient, rec.recipientDomain, rec.title, rec.signature)
    .run();
}
