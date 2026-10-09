const enc = new TextEncoder();

export function encode(s: string): Uint8Array {
  return enc.encode(s);
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return toHex(new Uint8Array(digest));
}

export async function hmacSha256(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64Url(new Uint8Array(sig));
}

export function timingSafeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

/* ------------------------------------------------------------------ */
/*  密码哈希（PBKDF2-SHA256）                                         */
/* ------------------------------------------------------------------ */

function getRandomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

/**
 * 使用 PBKDF2-SHA256 对密码进行哈希。
 * 返回格式: `salt_b64url.hash_b64url`（点分隔，方便单列存储）。
 */
export async function hashPassword(
  password: string,
  iterations = 100_000,
  keyLength = 32,
  saltBytes = 16,
): Promise<string> {
  const salt = getRandomBytes(saltBytes);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    keyLength * 8,
  );
  const hash = new Uint8Array(bits);
  return `${toBase64Url(salt)}.${toBase64Url(hash)}`;
}

/**
 * 验证密码是否与存储的哈希匹配。
 * storedHash 格式: `salt_b64url.hash_b64url`
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  iterations = 100_000,
  keyLength = 32,
): Promise<boolean> {
  const dot = storedHash.indexOf(".");
  if (dot === -1) return false;
  const saltB64 = storedHash.slice(0, dot);
  const expectedHashB64 = storedHash.slice(dot + 1);

  const salt = fromBase64Url(saltB64);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    keyLength * 8,
  );
  const actualHashB64 = toBase64Url(new Uint8Array(bits));
  return timingSafeEqual(actualHashB64, expectedHashB64);
}
