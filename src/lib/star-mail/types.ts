export interface StarMailDraft {
  recipient: string;
  title: string;
  signatureType: "name" | "anonymous" | "custom";
  customSignature: string;
  body: string;
}

export const STAR_MAIL_DRAFT_KEY = "xingyu-starmail-draft";
