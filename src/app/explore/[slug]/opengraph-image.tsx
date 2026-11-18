import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { OgBackdrop } from "@/components/og/OgBackdrop";
import { getZodiacBySlug, ELEMENT_META } from "@/data/zodiacs";

export const alt = "星语星愿 · 星座解读";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = readFile(join(process.cwd(), "fonts/NotoSansSC-Regular.ttf"));

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, fontData] = await Promise.all([params, font]);
  const zodiac = getZodiacBySlug(slug);
  if (!zodiac) {
    return new ImageResponse(<OgBackdrop><div>星语星愿</div></OgBackdrop>, {
      ...size,
      fonts: [{ name: "Noto Sans SC", data: fontData, style: "normal", weight: 400 }],
    });
  }

  const element = ELEMENT_META[zodiac.element];

  return new ImageResponse(
    (
      <OgBackdrop>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            position: "relative",
          }}
        >
          <span style={{ fontSize: 96, lineHeight: 1, color: "#dcc18c" }}>
            {zodiac.symbol}
          </span>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#f0ede8",
              letterSpacing: "0.06em",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {zodiac.name} · {zodiac.en}
          </h1>
          <p
            style={{
              fontSize: 28,
              color: "#a8a3b0",
              letterSpacing: "0.1em",
              margin: 0,
            }}
          >
            {zodiac.dateRange} · {element.label} · 守护星 {zodiac.rulingPlanet}
          </p>
          <p
            style={{
              fontSize: 22,
              color: "rgba(178, 165, 221, 0.8)",
              letterSpacing: "0.14em",
              margin: 0,
            }}
          >
            {zodiac.keywords.join(" · ")}
          </p>
          <div
            style={{
              marginTop: 8,
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
