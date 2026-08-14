import { sha256Hex, timingSafeEqual } from "./crypto";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email);
}

export function generateOtp(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, "0");
}

export function hashCode(code: string): Promise<string> {
  return sha256Hex(code);
}

export async function verifyOtp(input: string, storedHash: string): Promise<boolean> {
  const inputHash = await sha256Hex(input);
  return timingSafeEqual(inputHash, storedHash);
}
