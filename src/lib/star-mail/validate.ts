export const TITLE_MAX = 60;
export const BODY_MAX = 2000;
export const SIGNATURE_MAX = 30;
export const TA_NAME_MAX = 20;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailShape(email: string): boolean {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email);
}

export type Validation =
  | { ok: true; recipient: string; title: string; body: string; signature: string; taName: string }
  | {
      ok: false;
      field: "recipient" | "title" | "body" | "signature" | "taName";
      reason: "INVALID_EMAIL" | "TITLE_TOO_LONG" | "BODY_EMPTY" | "BODY_TOO_LONG" | "SIGNATURE_TOO_LONG" | "TA_NAME_EMPTY" | "TA_NAME_TOO_LONG";
    };

export function validateStarMail(input: {
  recipient: string;
  title: string;
  body: string;
  signature: string;
  taName: string;
}): Validation {
  const recipient = input.recipient.trim().toLowerCase();
  if (!isValidEmailShape(recipient)) return { ok: false, field: "recipient", reason: "INVALID_EMAIL" };
  const taName = input.taName.trim();
  if (taName.length === 0) return { ok: false, field: "taName", reason: "TA_NAME_EMPTY" };
  if (taName.length > TA_NAME_MAX) return { ok: false, field: "taName", reason: "TA_NAME_TOO_LONG" };
  const title = input.title.trim();
  if (title.length > TITLE_MAX) return { ok: false, field: "title", reason: "TITLE_TOO_LONG" };
  const body = input.body;
  if (body.trim().length === 0) return { ok: false, field: "body", reason: "BODY_EMPTY" };
  if (body.length > BODY_MAX) return { ok: false, field: "body", reason: "BODY_TOO_LONG" };
  const signature = input.signature.trim();
  if (signature.length > SIGNATURE_MAX) return { ok: false, field: "signature", reason: "SIGNATURE_TOO_LONG" };
  return { ok: true, recipient, title, body, signature, taName };
}
