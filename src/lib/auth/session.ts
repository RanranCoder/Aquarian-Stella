import { encode, toBase64Url, fromBase64Url, hmacSha256, timingSafeEqual } from "./crypto";
import type { SessionPayload } from "./types";

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = toBase64Url(encode(JSON.stringify(payload)));
  const sig = await hmacSha256(body, secret);
  return `${body}.${sig}`;
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSha256(body, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (typeof payload.uid !== "number" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
