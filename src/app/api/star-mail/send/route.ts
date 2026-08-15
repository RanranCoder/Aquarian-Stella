import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/types";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { claimDailyRate } from "@/lib/auth/rate-limit";
import { validateStarMail } from "@/lib/star-mail/validate";
import { checkModeration } from "@/lib/star-mail/moderation";
import { maskEmail } from "@/lib/star-mail/mask";
import { insertStarMailRecord } from "@/lib/star-mail/db";
import { buildStarMailHtml } from "@/lib/star-mail/template";

const USER_DAY_LIMIT = 3;
const IP_DAY_LIMIT = 10;

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "NOT_LOGGED_IN" }, { status: 401 });
  const { env } = await getCloudflareContext({ async: true });
  const payload = await verifySession(token, env.AUTH_SECRET);
  if (!payload) return NextResponse.json({ error: "NOT_LOGGED_IN" }, { status: 401 });

  let body: Record<string, unknown> | null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const recipient = typeof body.recipient === "string" ? body.recipient : "";
  const title = typeof body.title === "string" ? body.title : "";
  const signature = typeof body.signature === "string" ? body.signature : "";
  const rawBody = typeof body.body === "string" ? body.body : "";
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  if (!turnstileToken) return NextResponse.json({ error: "MISSING_TURNSTILE" }, { status: 400 });

  const v = validateStarMail({ recipient, title, body: rawBody, signature });
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

  const mod = checkModeration({ title: v.title, body: v.body, signature: v.signature });
  if (!mod.allowed) return NextResponse.json({ error: mod.reason }, { status: 403 });

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const human = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!human) return NextResponse.json({ error: "TURNSTILE_FAILED" }, { status: 403 });

  const now = Date.now();
  const userRl = await claimDailyRate(env.DB, `starmail:user:${payload.uid}`, USER_DAY_LIMIT, now);
  if (!userRl.allowed) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  const ipRl = await claimDailyRate(env.DB, `starmail:ip:${ip}`, IP_DAY_LIMIT, now);
  if (!ipRl.allowed) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const masked = maskEmail(v.recipient);
  const domain = v.recipient.split("@")[1] ?? "";

  const html = buildStarMailHtml({ title: v.title, body: v.body, signature: v.signature });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.STAR_MAIL_FROM_EMAIL,
        to: [v.recipient],
        subject: "一封来自星空的信",
        html,
      }),
    });
    if (!res.ok) throw new Error(`resend failed: ${res.status}`);
  } catch {
    return NextResponse.json({ error: "SEND_FAILED" }, { status: 500 });
  }

  // 正文不入库；记录为 best-effort，记录失败不影响「已寄出」结果
  try {
    await insertStarMailRecord(env.DB, {
      userId: payload.uid,
      recipient: masked,
      recipientDomain: domain,
      title: v.title,
      signature: v.signature,
    });
  } catch {
    // 忽略：发送已成功，记录只是审计用途
  }

  return NextResponse.json({ ok: true, maskedRecipient: masked });
}
