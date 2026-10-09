import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isValidEmail } from "@/lib/auth/otp";
import { getUserPasswordHash } from "@/lib/auth/db";
import { verifyPassword } from "@/lib/auth/crypto";
import { findUserByEmail } from "@/lib/auth/user-admin";
import { signSession } from "@/lib/auth/session";
import { claimAccountRate } from "@/lib/auth/rate-limit";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  LOGIN_RATE_PER_HOUR,
  PASSWORD_ITERATIONS,
  PASSWORD_KEY_LENGTH,
  type SessionPayload,
} from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string } | null;
  try {
    body = (await request.json()) as { email?: string; password?: string } | null;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!isValidEmail(email)) return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "INVALID_PASSWORD" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  const rl = await claimAccountRate(env.DB, email, ip, LOGIN_RATE_PER_HOUR);
  if (!rl.allowed) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  // 统一 401（不区分"无此账号/密码错误"）防邮箱枚举
  const storedHash = await getUserPasswordHash(env.DB, email);
  if (!storedHash) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const ok = await verifyPassword(password, storedHash, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH);
  if (!ok) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });

  const user = await findUserByEmail(env.DB, email);
  if (!user) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });

  const payload: SessionPayload = {
    uid: user.id,
    email: user.email,
    exp: Date.now() + SESSION_MAX_AGE_MS,
  };
  const token = await signSession(payload, env.AUTH_SECRET);

  const res = NextResponse.json({
    ok: true,
    token,
    user: { id: user.id, email: user.email },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });
  return res;
}
