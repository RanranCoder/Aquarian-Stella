import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { generateOtp, hashCode, isValidEmail } from "@/lib/auth/otp";
import { claimRate } from "@/lib/auth/rate-limit";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { sendOtpEmail } from "@/lib/auth/email";
import { storeOtp, deleteOtp } from "@/lib/auth/otp-store";
import { OTP_TTL_MS } from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  let body: { email?: string; turnstileToken?: string } | null;
  try {
    body = (await request.json()) as { email?: string; turnstileToken?: string } | null;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const turnstileToken = body.turnstileToken;
  if (!isValidEmail(email)) return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  if (!turnstileToken) return NextResponse.json({ error: "MISSING_TURNSTILE" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  const human = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!human) return NextResponse.json({ error: "TURNSTILE_FAILED" }, { status: 403 });

  const rl = await claimRate(env.DB, email, ip);
  if (!rl.allowed) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const code = generateOtp();
  const hash = await hashCode(code);
  await storeOtp(env.DB, email, hash, Date.now() + OTP_TTL_MS);

  try {
    await sendOtpEmail({
      email,
      code,
      from: env.AUTH_FROM_EMAIL,
      apiKey: env.RESEND_API_KEY,
      devLog: env.AUTH_DEV_LOG_CODE === "true",
    });
  } catch {
    await deleteOtp(env.DB, email);
    return NextResponse.json({ error: "SEND_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
