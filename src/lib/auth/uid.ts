import { NextRequest } from "next/server";
import { verifySession } from "./session";
import { SESSION_COOKIE } from "./types";

/**
 * 从请求 session cookie 解析当前登录用户 uid。
 * 未登录或会话无效（过期/伪造）返回 null。所有 /api 路由统一复用此 helper。
 */
export async function getUid(
  request: NextRequest,
  env: { AUTH_SECRET: string },
): Promise<number | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token, env.AUTH_SECRET);
  return payload?.uid ?? null;
}