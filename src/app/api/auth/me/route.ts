import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySession } from "@/lib/auth/session";
import { getUserById } from "@/lib/auth/db";
import { SESSION_COOKIE } from "@/lib/auth/types";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });
  const { env } = await getCloudflareContext({ async: true });
  const payload = await verifySession(token, env.AUTH_SECRET);
  if (!payload) return NextResponse.json({ user: null });
  // 确认用户仍存在（删号后残留 cookie 视为未登录）
  const user = await getUserById(env.DB, payload.uid);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
