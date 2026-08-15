export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildStarMailHtml(opts: { title: string; body: string; signature: string; taName: string }): string {
  const title = escapeHtml(opts.title);
  const signature = escapeHtml(opts.signature);
  const taName = escapeHtml(opts.taName);
  const body = opts.body.split("\n").map(escapeHtml).join("<br>");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<body style="margin:0;padding:0;background:#FFFDF6;color:#1B2034;font-family:'PingFang SC','Microsoft YaHei',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 28px;">
    <div style="text-align:center;color:#B08D55;letter-spacing:6px;font-size:20px;padding-bottom:6px;">✦</div>
    <h1 style="text-align:center;font-size:22px;font-weight:600;margin:0;color:#0D1124;">Stella · 一封来自星空的信</h1>
    <p style="text-align:center;font-size:12px;color:#9E98B3;margin:6px 0 0;">星语 · 星愿 · 星邮</p>
    <hr style="border:none;border-top:1px solid #EAD9B4;margin:26px 0;">
    <h2 style="font-size:16px;font-weight:600;margin:0 0 14px;color:#0D1124;">${title}</h2>
    <p style="font-size:15px;line-height:1.9;color:#1B2034;margin:0 0 8px;">亲爱的 ${taName}：</p>
    <p style="font-size:15px;line-height:1.9;color:#1B2034;margin:0 0 18px;">${body}</p>
    <p style="text-align:right;font-size:14px;color:#1B2034;margin:0;">—— ${signature}</p>
    <hr style="border:none;border-top:1px solid #EAD9B4;margin:26px 0;">
    <p style="text-align:center;font-size:13px;color:#837D9C;margin:0;">有些话，写下来就已经很好了。</p>
    <p style="text-align:center;font-size:13px;color:#837D9C;margin:4px 0 0;">—— Stella</p>
  </div>
</body>
</html>`;
}
