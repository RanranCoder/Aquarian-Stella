import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isValidEmail, verifyOtp } from "@/lib/auth/otp";
import { signSession } from "@/lib/auth/session";
import { upsertUserByEmail } from "@/lib/auth/db";
import { claimOtpAttempt, consumeOtp } from "@/lib/auth/otp-store";
import { OTP_MAX_ATTEMPTS, SESSION_COOKIE, SESSION_MAX_AGE_MS, type SessionPayload } from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  let body: { email?: string; code?: string } | null;
  try {
    body = (await request.json()) as { email?: string; code?: string } | null;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const code = body.code?.trim() ?? "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });

  const claim = await claimOtpAttempt(env.DB, email, OTP_MAX_ATTEMPTS, Date.now());
  if (claim === "none") return NextResponse.json({ error: "NO_CODE" }, { status: 400 });
  if (claim === "expired") return NextResponse.json({ error: "EXPIRED" }, { status: 400 });
  if (claim === "limited") return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429 });

  const record = await env.DB
    .prepare("SELECT hash FROM otp_codes WHERE email = ?")
    .bind(email)
    .first<{ hash: string }>();
  if (!record) return NextResponse.json({ error: "NO_CODE" }, { status: 400 });

  const match = await verifyOtp(code, record.hash);
  if (!match) return NextResponse.json({ error: "WRONG_CODE" }, { status: 400 });

  const consumed = await consumeOtp(env.DB, email, record.hash);
  if (!consumed) return NextResponse.json({ error: "NO_CODE" }, { status: 400 });

  const user = await upsertUserByEmail(env.DB, email);

  const payload: SessionPayload = { uid: user.id, email: user.email, exp: Date.now() + SESSION_MAX_AGE_MS };
  const token = await signSession(payload, env.AUTH_SECRET);
  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });
  return res;
}
