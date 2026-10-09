import type { D1Database } from "@cloudflare/workers-types";
import type { User, UserCredentials } from "./types";
import { createUserWithPassword, getUserByEmail } from "./db";
import { hashPassword } from "./crypto";
import { PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_SALT_BYTES } from "./types";

/** 按邮箱查询用户（含 id / email / created_at）。不存在返回 null。 */
export async function findUserByEmail(
  db: D1Database,
  email: string,
): Promise<User | null> {
  return getUserByEmail(db, email);
}

/** 创建用户并写入密码哈希。若邮箱已存在则抛出 UNIQUE 约束错误。 */
export async function adminCreateUser(
  db: D1Database,
  credentials: UserCredentials,
): Promise<User> {
  const passwordHash = await hashPassword(
    credentials.password,
    PASSWORD_ITERATIONS,
    PASSWORD_KEY_LENGTH,
    PASSWORD_SALT_BYTES,
  );
  return createUserWithPassword(db, credentials.email, passwordHash);
}
