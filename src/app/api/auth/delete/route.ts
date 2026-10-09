import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySession } from "@/lib/auth/session";
import { getUserPasswordHash, deleteUserData } from "@/lib/auth/db";
import { verifyPassword } from "@/lib/auth/crypto";
import { SESSION_COOKIE, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH } from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { env } = await getCloudflareContext({ async: true });
  const payload = await verifySession(token, env.AUTH_SECRET);
  if (!payload) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { password?: string } | null;
  try {
    body = (await request.json()) as { password?: string } | null;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const password = body.password ?? "";

  const storedHash = await getUserPasswordHash(env.DB, payload.email);
  if (!storedHash) return NextResponse.json({ error: "NO_PASSWORD_SET" }, { status: 400 });

  const ok = await verifyPassword(password, storedHash, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH);
  if (!ok) return NextResponse.json({ error: "WRONG_PASSWORD" }, { status: 401 });

  await deleteUserData(env.DB, payload.uid, payload.email);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
