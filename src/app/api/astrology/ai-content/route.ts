import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUid } from "@/lib/auth/uid";
import { getProfile } from "@/lib/profile/db";
import { claimDailyRate } from "@/lib/auth/rate-limit";
import {
  generateTodayContent,
  generateRelationContent,
  generatePersonalityContent,
  type LLMEnv,
} from "@/lib/astrology/ai-content";
import type { BirthProfile } from "@/lib/astrology";

const SURFACE_LIMITS: Record<string, number> = {
  today: 3,
  relation: 10,
  personality: 3,
};

function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext({ async: true });
  const uid = await getUid(request, env);
  if (!uid) return NextResponse.json({ error: "NOT_LOGGED_IN" }, { status: 401 });

  let body: Record<string, unknown> | null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const surface = typeof body.surface === "string" ? body.surface : "";
  if (!["today", "relation", "personality"].includes(surface)) {
    return NextResponse.json({ error: "INVALID_SURFACE" }, { status: 400 });
  }

  const limit = SURFACE_LIMITS[surface] ?? 1;
  const rlKey = `ai:${surface}:${uid}`;
  const rl = await claimDailyRate(env.DB, rlKey, limit, Date.now());
  if (!rl.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const profile = await getProfile(env.DB, uid);
  if (!profile) {
    return NextResponse.json({ error: "NO_PROFILE" }, { status: 400 });
  }

  const llmEnv: LLMEnv = {
    LLM_BASE_URL: (env as unknown as Record<string, string>).LLM_BASE_URL,
    LLM_API_KEY: (env as unknown as Record<string, string>).LLM_API_KEY,
    LLM_MODEL: (env as unknown as Record<string, string>).LLM_MODEL,
  };

  let content: Record<string, unknown> | null = null;

  let debugError: string | undefined;
  try {
    if (surface === "today") {
      const dateStr = typeof body.date === "string" ? body.date : todayDateStr();
      content = await generateTodayContent(env.DB, uid, profile, dateStr, llmEnv);
    } else if (surface === "relation") {
      const partnerRaw = body.partnerProfile as Record<string, unknown> | undefined;
      if (!partnerRaw || typeof partnerRaw.birthDate !== "string") {
        return NextResponse.json({ error: "MISSING_PARTNER" }, { status: 400 });
      }
      const partner: BirthProfile = {
        nickname: typeof partnerRaw.nickname === "string" ? partnerRaw.nickname : "TA",
        birthDate: partnerRaw.birthDate,
        birthTime: typeof partnerRaw.birthTime === "string" ? partnerRaw.birthTime : undefined,
        birthTimeAccuracy: (partnerRaw.birthTimeAccuracy as BirthProfile["birthTimeAccuracy"]) ?? "unknown",
        birthCity: typeof partnerRaw.birthCity === "string" ? partnerRaw.birthCity : undefined,
        interests: [],
      };
      content = await generateRelationContent(env.DB, uid, profile, partner, llmEnv);
    } else if (surface === "personality") {
      content = await generatePersonalityContent(env.DB, uid, profile, llmEnv);
    }
  } catch (err) {
    debugError = err instanceof Error ? err.message : String(err);
    console.error("[ai-content] generation error:", debugError);
    content = null;
  }

  return NextResponse.json({
    ok: true,
    surface,
    content: content ?? null,
    source: content ? "ai" : "template",
    ...(debugError ? { debugError } : {}),
  });
}
