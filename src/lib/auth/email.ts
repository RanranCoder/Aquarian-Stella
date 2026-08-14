export async function sendOtpEmail(opts: {
  email: string;
  code: string;
  from: string;
  apiKey: string;
  devLog: boolean;
}): Promise<void> {
  const { email, code, from, apiKey, devLog } = opts;
  if (devLog) {
    console.log(`[AUTH DEV] 登录验证码 for ${email}: ${code}`);
    return;
  }
  const subject = "你的星语星愿登录验证码";
  const text = `你的登录验证码是：${code}\n\n验证码 10 分钟内有效。如果不是你本人操作，请忽略此邮件。`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject, text }),
  });
  if (!res.ok) throw new Error(`resend failed: ${res.status}`);
}
