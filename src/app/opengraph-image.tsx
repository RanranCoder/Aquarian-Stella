import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "星语星愿 · 看见星象，也看见自己";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = readFile(join(process.cwd(), "fonts/NotoSansSC-Regular.ttf"));

export default async function OgImage() {
  const fontData = await font;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #080a12 0%, #0f1220 50%, #1a1035 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Noto Sans SC, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 装饰圆环 */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            height: 500,
            borderRadius: "50%",
            border: "1px solid rgba(220, 193, 140, 0.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 350,
            height: 350,
            borderRadius: "50%",
            border: "1px solid rgba(178, 165, 221, 0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 200,
            height: 200,
            borderRadius: "50%",
            border: "1px solid rgba(220, 193, 140, 0.1)",
          }}
        />

        {/* 星点 */}
        {[
          { top: "15%", left: "10%", size: 3, opacity: 0.6 },
          { top: "12%", right: "20%", size: 2, opacity: 0.4 },
          { bottom: "20%", left: "15%", size: 2.5, opacity: 0.5 },
          { bottom: "15%", right: "12%", size: 3, opacity: 0.6 },
          { top: "35%", right: "8%", size: 2, opacity: 0.3 },
          { bottom: "35%", left: "8%", size: 2, opacity: 0.4 },
        ].map((dot, i) => {
          const { size, opacity, ...position } = dot;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                ...position,
                width: size,
                height: size,
                opacity,
                borderRadius: "50%",
                backgroundColor: "rgba(220, 193, 140, 0.8)",
                boxShadow: "0 0 6px rgba(220, 193, 140, 0.5)",
              }}
            />
          );
        })}

        {/* 主内容 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            position: "relative",
          }}
        >
          <span
            style={{
              fontSize: 64,
              lineHeight: 1,
              color: "#dcc18c",
              marginBottom: 8,
            }}
          >
            ✦
          </span>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#f0ede8",
              letterSpacing: "0.04em",
              textAlign: "center",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            星语星愿
          </h1>
          <p
            style={{
              fontSize: 24,
              color: "#a8a3b0",
              letterSpacing: "0.08em",
              textAlign: "center",
              margin: 0,
            }}
          >
            看见星象，也看见自己
          </p>
          <div
            style={{
              display: "flex",
              gap: 32,
              marginTop: 12,
              fontSize: 16,
              color: "rgba(178, 165, 221, 0.7)",
              letterSpacing: "0.12em",
            }}
          >
            <span>今日星语</span>
            <span style={{ color: "rgba(220, 193, 140, 0.5)" }}>✦</span>
            <span>我的星盘</span>
            <span style={{ color: "rgba(220, 193, 140, 0.5)" }}>✦</span>
            <span>关系星图</span>
          </div>
        </div>
      </div>
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