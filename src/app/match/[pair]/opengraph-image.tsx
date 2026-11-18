import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { OgBackdrop } from "@/components/og/OgBackdrop";
import { generateMatchReport, parsePairSlug } from "@/lib/match";

export const alt = "星语星愿 · 星座配对";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = readFile(join(process.cwd(), "fonts/NotoSansSC-Regular.ttf"));

export default async function Image({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const [{ pair }, fontData] = await Promise.all([params, font]);
  const parsed = parsePairSlug(pair);

  if (!parsed) {
    return new ImageResponse(
      (
        <OgBackdrop>
          <div style={{ fontSize: 56, color: "#f0ede8" }}>星座配对 · 星语星愿</div>
        </OgBackdrop>
      ),
      {
        ...size,
        fonts: [
          { name: "Noto Sans SC", data: fontData, style: "normal", weight: 400 },
        ],
      }
    );
  }

  const report = generateMatchReport(parsed.a, parsed.b);

  return new ImageResponse(
    (
      <OgBackdrop>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 84, lineHeight: 1, color: "#dcc18c" }}>
                {report.a.symbol}
              </span>
              <span style={{ fontSize: 30, color: "#f0ede8" }}>{report.a.name}</span>
            </div>
            <span style={{ fontSize: 40, color: "rgba(220, 193, 140, 0.7)" }}>×</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 84, lineHeight: 1, color: "#b2a5dd" }}>
                {report.b.symbol}
              </span>
              <span style={{ fontSize: 30, color: "#f0ede8" }}>{report.b.name}</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontSize: 20, color: "#a8a3b0", letterSpacing: "0.2em" }}>
              配对指数
            </span>
            <span style={{ fontSize: 88, fontWeight: 700, color: "#dcc18c", lineHeight: 1 }}>
              {report.score}
            </span>
            <span style={{ fontSize: 32, color: "#b2a5dd" }}>「{report.verdict}」</span>
          </div>

          <p
            style={{
              fontSize: 22,
              color: "rgba(168, 163, 176, 0.9)",
              letterSpacing: "0.12em",
              margin: 0,
            }}
          >
            {report.elementLabel} · {report.aspectLabel}
          </p>

          <div
            style={{
              marginTop: 6,
              fontSize: 16,
              color: "rgba(220, 193, 140, 0.6)",
              letterSpacing: "0.2em",
            }}
          >
            星语星愿 · stella.ranran.org.cn
          </div>
        </div>
      </OgBackdrop>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Noto Sans SC",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
