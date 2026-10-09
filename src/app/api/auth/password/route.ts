import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySession } from "@/lib/auth/session";
import { getUserPasswordHash, updateUserPassword } from "@/lib/auth/db";
import { verifyPassword, hashPassword } from "@/lib/auth/crypto";
import {
  SESSION_COOKIE,
  PASSWORD_ITERATIONS,
  PASSWORD_KEY_LENGTH,
  PASSWORD_SALT_BYTES,
} from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { env } = await getCloudflareContext({ async: true });
  const payload = await verifySession(token, env.AUTH_SECRET);
  if (!payload) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { oldPassword?: string; newPassword?: string } | null;
  try {
    body = (await request.json()) as { oldPassword?: string; newPassword?: string } | null;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const oldPassword = body.oldPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "INVALID_NEW_PASSWORD" }, { status: 400 });
  }

  const storedHash = await getUserPasswordHash(env.DB, payload.email);
  if (!storedHash) return NextResponse.json({ error: "NO_PASSWORD_SET" }, { status: 400 });

  const ok = await verifyPassword(oldPassword, storedHash, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH);
  if (!ok) return NextResponse.json({ error: "WRONG_PASSWORD" }, { status: 401 });

  const newHash = await hashPassword(
    newPassword,
    PASSWORD_ITERATIONS,
    PASSWORD_KEY_LENGTH,
    PASSWORD_SALT_BYTES,
  );
  await updateUserPassword(env.DB, payload.email, newHash);

  return NextResponse.json({ ok: true });
}
