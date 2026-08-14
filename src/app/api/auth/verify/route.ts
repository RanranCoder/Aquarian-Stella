import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isValidEmail, verifyOtp } from "@/lib/auth/otp";
import { signSession } from "@/lib/auth/session";
import { upsertUserByEmail } from "@/lib/auth/db";
import { OTP_MAX_ATTEMPTS, SESSION_COOKIE, SESSION_MAX_AGE_MS, type SessionPayload, type StoredOtp } from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = (await request.json()) as { email?: string; code?: string };
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const code = body.code?.trim() ?? "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });

  const record = await env.OTP_KV.get<StoredOtp>(`otp:${email}`, "json");
  if (!record) return NextResponse.json({ error: "NO_CODE" }, { status: 400 });
  if (Date.now() > record.expiresAt) {
    await env.OTP_KV.delete(`otp:${email}`);
    return NextResponse.json({ error: "EXPIRED" }, { status: 400 });
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await env.OTP_KV.delete(`otp:${email}`);
    return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
  }

  const match = await verifyOtp(code, record.hash);
  if (!match) {
    await env.OTP_KV.put(
      `otp:${email}`,
      JSON.stringify({ ...record, attempts: record.attempts + 1 }),
      { expirationTtl: Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000)) },
    );
    return NextResponse.json({ error: "WRONG_CODE" }, { status: 400 });
  }

  await env.OTP_KV.delete(`otp:${email}`);
  const user = await upsertUserByEmail(env.DB, email);

  const payload: SessionPayload = { uid: user.id, email: user.email, exp: Date.now() + SESSION_MAX_AGE_MS };
  const token = await signSession(payload, env.AUTH_SECRET);
  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });
  return res;
}
