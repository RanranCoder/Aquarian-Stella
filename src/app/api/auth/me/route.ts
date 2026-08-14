import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySession } from "@/lib/auth/session";
import { getUserByEmail } from "@/lib/auth/db";
import { SESSION_COOKIE } from "@/lib/auth/types";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });
  const { env } = await getCloudflareContext({ async: true });
  const payload = await verifySession(token, env.AUTH_SECRET);
  if (!payload) return NextResponse.json({ user: null });
  const user = await getUserByEmail(env.DB, payload.email);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
