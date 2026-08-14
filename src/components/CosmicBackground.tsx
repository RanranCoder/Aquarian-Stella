import { seededRandom } from "@/lib/utils";

const STAR_COUNT = 64;

function buildStars() {
  return Array.from({ length: STAR_COUNT }, (_, i) => {
    const r = (n: number) => seededRandom(i * 7 + n * 13.7);
    const size = r(1) < 0.1 ? 2.2 : r(2) < 0.5 ? 1.5 : 1;
    return {
      left: r(3) * 100,
      top: r(4) * 100,
      size,
      delay: r(5) * 6,
      duration: 3.5 + r(6) * 5,
      bright: r(7) > 0.85,
      color: r(8) > 0.88 ? "lav" : "moon",
    };
  });
}

/**
 * 星空环境层：多层渐变星云 + 稀疏星点 + 流星。
 * 纯 CSS transform/opacity 动效，低端设备流畅；尊重 prefers-reduced-motion。
 */
export function CosmicBackground() {
  const stars = buildStars();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* 星云环境层 */}
      <div className="cosmic-sky absolute inset-0" />

      {/* 星点 */}
      <div className="absolute inset-0">
        {stars.map((s, i) => (
          <span
            key={i}
            className={
              s.color === "lav"
                ? "absolute rounded-full bg-lav-300 animate-twinkle"
                : "absolute rounded-full bg-moon-100 animate-twinkle"
            }
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.bright ? 0.9 : 0.45,
              boxShadow: s.bright
                ? `0 0 6px ${s.color === "lav" ? "rgba(178,165,221,0.7)" : "rgba(242,239,248,0.7)"}`
                : undefined,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      {/* 流星 */}
      <span
        className="animate-shoot absolute left-[76%] top-[12%] h-px w-44 bg-gradient-to-r from-transparent via-moon-100/80 to-transparent"
        style={{ animationDelay: "4s" }}
      />
      <span
        className="animate-shoot absolute left-[56%] top-[26%] h-px w-36 bg-gradient-to-r from-transparent via-lav-200/70 to-transparent"
        style={{ animationDelay: "9s" }}
      />

      {/* 暗角，聚焦中心 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_70%_at_50%_18%,transparent_42%,rgba(3,5,14,0.5))]" />
    </div>
  );
}
