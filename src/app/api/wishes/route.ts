import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUid } from "@/lib/auth/uid";
import { getWishesByUser, getDeletedIdsByUser, syncWishes, type SyncWish } from "@/lib/wishes/db";
import { WISH_TITLE_MAX } from "@/lib/wishes/limits";

const CATEGORIES = new Set(["love", "growth", "life", "career", "other"]);
const STATUSES = new Set(["active", "done", "archived"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ITEMS = 500;
const ID_MAX = 100;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

function isValidWish(w: unknown): w is SyncWish {
  if (!w || typeof w !== "object" || Array.isArray(w)) return false;
  const x = w as Record<string, unknown>;
  if (typeof x.id !== "string" || x.id.length === 0 || x.id.length > ID_MAX) return false;
  if (typeof x.title !== "string" || x.title.length === 0 || x.title.length > WISH_TITLE_MAX) return false;
  if (typeof x.category !== "string" || !CATEGORIES.has(x.category)) return false;
  if (typeof x.status !== "string" || !STATUSES.has(x.status)) return false;
  if (typeof x.createdAt !== "string" || !isValidDate(x.createdAt)) return false;
  if (x.completedAt !== undefined && x.completedAt !== null) {
    if (typeof x.completedAt !== "string" || !isValidDate(x.completedAt)) return false;
  }
  if (typeof x.updatedAt !== "number" || !Number.isFinite(x.updatedAt)) return false;
  return true;
}

/** GET /api/wishes — 当前用户全部未删除愿望 + 已删除 id（含删除时刻） */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext({ async: true });
  const uid = await getUid(request, env);
  if (!uid) return NextResponse.json({ error: "NOT_LOGGED_IN" }, { status: 401 });

  const rows = await getWishesByUser(env.DB, uid);
  const tombstones = await getDeletedIdsByUser(env.DB, uid);
  return NextResponse.json({
    wishes: rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      status: r.status,
      createdAt: r.created_at,
      completedAt: r.completed_at ?? undefined,
      updatedAt: r.updated_at,
    })),
    deletedIds: tombstones,
  });
}

/** PUT /api/wishes — 增量合并（upserts + deletes），服务端以 updated_at 裁决 */
export async function PUT(request: NextRequest) {
  const { env } = await getCloudflareContext({ async: true });
  const uid = await getUid(request, env);
  if (!uid) return NextResponse.json({ error: "NOT_LOGGED_IN" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const wishes = (body as { wishes?: unknown }).wishes;
  const deletes = (body as { deletes?: unknown }).deletes;

  if (!Array.isArray(wishes) || wishes.length > MAX_ITEMS) {
    return NextResponse.json({ error: "INVALID_WISHES" }, { status: 400 });
  }
  if (deletes !== undefined && deletes !== null) {
    if (
      !Array.isArray(deletes) ||
      deletes.length > MAX_ITEMS ||
      deletes.some((d) => typeof d !== "string" || d.length === 0 || d.length > ID_MAX)
    ) {
      return NextResponse.json({ error: "INVALID_DELETES" }, { status: 400 });
    }
  }

  if (new Set(wishes.map((w) => (w as { id?: unknown }).id)).size !== wishes.length) {
    return NextResponse.json({ error: "DUPLICATE_ID" }, { status: 400 });
  }
  if (!wishes.every(isValidWish)) {
    return NextResponse.json({ error: "INVALID_WISH" }, { status: 400 });
  }

  await syncWishes(
    env.DB,
    uid,
    {
      upserts: wishes as SyncWish[],
      deletes: (Array.isArray(deletes) ? deletes : []) as string[],
    },
    Date.now(),
  );
  return NextResponse.json({ ok: true });
}