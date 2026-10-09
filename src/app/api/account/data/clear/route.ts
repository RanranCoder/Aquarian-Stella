import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUid } from "@/lib/auth/uid";
import { getUserById, deleteUserData } from "@/lib/auth/db";
import { claimDailyRate } from "@/lib/auth/rate-limit";

/** POST /api/account/data/clear — 清除当前账号的云端数据（profile + wishes），保留账号与邮箱。 */
export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext({ async: true });
  const uid = await getUid(request, env);
  if (!uid) return NextResponse.json({ error: "NOT_LOGGED_IN" }, { status: 401 });

  const limited = await claimDailyRate(env.DB, `clear:${uid}`, 5, Date.now());
  if (!limited.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const user = await getUserById(env.DB, uid);
  if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  await deleteUserData(env.DB, uid, user.email, { keepUser: true });
  return NextResponse.json({ ok: true });
}