import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUid } from "@/lib/auth/uid";
import { claimDailyRate } from "@/lib/auth/rate-limit";
import { getProfile, upsertProfile } from "@/lib/profile/db";
import type { BirthProfile } from "@/lib/astrology";

const ACCURACIES = new Set(["exact", "approximate", "unknown"]);
const INTEREST_ALLOW = new Set(["爱情", "自我", "情绪", "事业", "人际"]);
const BIRTH_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const NICKNAME_MAX = 12;
const CITY_MAX = 64;

/** 真实日历校验 + 范围 1949-01-01..今天（对齐 onboarding BIRTH_MIN/MAX） */
function isValidBirthDate(s: string): boolean {
  if (!BIRTH_DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return false;
  }
  const min = new Date(1949, 0, 1).getTime();
  return dt.getTime() >= min && dt.getTime() <= Date.now();
}

type Validation = { ok: true; profile: BirthProfile } | { ok: false; error: string };

function validateProfile(value: unknown): Validation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "INVALID_PROFILE" };
  }
  const p = value as Record<string, unknown>;

  const nickname = typeof p.nickname === "string" ? p.nickname.trim() : "";
  if (nickname.length === 0 || nickname.length > NICKNAME_MAX) {
    return { ok: false, error: "INVALID_NICKNAME" };
  }

  const birthDate = p.birthDate;
  if (typeof birthDate !== "string" || !isValidBirthDate(birthDate)) {
    return { ok: false, error: "INVALID_BIRTH_DATE" };
  }

  const accuracy = p.birthTimeAccuracy;
  if (typeof accuracy !== "string" || !ACCURACIES.has(accuracy)) {
    return { ok: false, error: "INVALID_TIME_ACCURACY" };
  }

  let birthTime: string | undefined;
  if (p.birthTime !== undefined && p.birthTime !== null && p.birthTime !== "") {
    if (typeof p.birthTime !== "string" || !TIME_RE.test(p.birthTime)) {
      return { ok: false, error: "INVALID_BIRTH_TIME" };
    }
    birthTime = p.birthTime;
  }
  if (accuracy === "unknown" && birthTime) {
    return { ok: false, error: "INVALID_TIME_ACCURACY" };
  }

  const birthCity = typeof p.birthCity === "string" ? p.birthCity.trim() : "";
  if (birthCity.length > CITY_MAX) {
    return { ok: false, error: "INVALID_BIRTH_CITY" };
  }

  const interestsRaw = p.interests;
  if (!Array.isArray(interestsRaw)) {
    return { ok: false, error: "INVALID_INTERESTS" };
  }
  const dedup = [...new Set(interestsRaw)];
  if (dedup.length > 5 || dedup.some((i) => typeof i !== "string" || !INTEREST_ALLOW.has(i))) {
    return { ok: false, error: "INVALID_INTERESTS" };
  }
  const interests = dedup as string[];

  return {
    ok: true,
    profile: {
      nickname,
      birthDate,
      birthTime: accuracy === "unknown" ? undefined : birthTime,
      birthTimeAccuracy: accuracy as BirthProfile["birthTimeAccuracy"],
      birthCity: birthCity || undefined,
      interests,
    },
  };
}

/** GET /api/profile — 当前用户云端出生档案；未建档返回 { profile: null } */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext({ async: true });
  const uid = await getUid(request, env);
  if (!uid) return NextResponse.json({ error: "NOT_LOGGED_IN" }, { status: 401 });
  const profile = await getProfile(env.DB, uid);
  return NextResponse.json({ profile });
}

/** PUT /api/profile — 保存当前用户出生档案（整行 upsert，updated_at 由服务端定） */
export async function PUT(request: NextRequest) {
  const { env } = await getCloudflareContext({ async: true });
  const uid = await getUid(request, env);
  if (!uid) return NextResponse.json({ error: "NOT_LOGGED_IN" }, { status: 401 });

  if (Number(request.headers.get("content-length") ?? 0) > 2048) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    !(body as Record<string, unknown>).profile
  ) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const check = validateProfile((body as { profile: unknown }).profile);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const limited = await claimDailyRate(env.DB, `profile:${uid}`, 30, Date.now());
  if (!limited.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  await upsertProfile(env.DB, uid, check.profile, Date.now());

  // 失效该用户的 AI 内容缓存（personality / relation）
  try {
    const { invalidateAiCache } = await import("@/lib/astrology/ai-cache");
    await invalidateAiCache(env.DB, uid);
  } catch {
    // best-effort，不阻塞 profile 保存
  }

  const saved = await getProfile(env.DB, uid);
  return NextResponse.json({ ok: true, profile: saved });
}