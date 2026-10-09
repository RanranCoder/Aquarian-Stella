/**
 * 构建前下载中文字体，用于 OG Image 生成。
 * Google Fonts 的 CSS API 会返回实际的 TTF URL，我们解析后下载。
 */
async function downloadFont() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const fontsDir = path.join(process.cwd(), "fonts");
  const fontPath = path.join(fontsDir, "NotoSansSC-Regular.ttf");

  // 检查是否已存在
  try {
    await fs.access(fontPath);
    console.log("✅ 字体已存在，跳过下载");
    return;
  } catch {
    // 不存在，继续下载
  }

  await fs.mkdir(fontsDir, { recursive: true });

  console.log("📥 下载 Noto Sans SC 字体...");

  // 通过 Google Fonts CSS API 获取实际字体 URL
  const cssUrl =
    "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap";
  const cssRes = await fetch(cssUrl);
  const css = await cssRes.text();

  const urlMatch = css.match(/url\(([^)]+)\)/);
  if (!urlMatch) {
    throw new Error("无法从 Google Fonts CSS 解析字体 URL");
  }

  const ttfUrl = urlMatch[1];
  const res = await fetch(ttfUrl);
  const buffer = await res.arrayBuffer();

  await fs.writeFile(fontPath, Buffer.from(buffer));
  console.log("✅ 字体下载完成");
}

downloadFont().catch((err) => {
  console.error("❌ 字体下载失败:", err.message);
  process.exit(1);
});