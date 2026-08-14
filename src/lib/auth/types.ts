export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface SessionPayload {
  uid: number;
  email: string;
  exp: number; // unix ms
}

export interface StoredOtp {
  hash: string;
  attempts: number;
  expiresAt: number; // unix ms
}

export const SESSION_COOKIE = "stella_session";
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const RATE_EMAIL_PER_HOUR = 5;
export const RATE_IP_PER_HOUR = 10;
export const RATE_HOUR_SEC = 3600;
