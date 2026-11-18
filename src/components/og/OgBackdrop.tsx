/**
 * OG 图共享背景：深空渐变 + 轨道圆环 + 星点。
 * 供 explore/[slug] 与 match/[pair] 的动态 OG 图复用。
 */
export function OgBackdrop({
  children,
}: {
  children: React.ReactNode;
}) {
  const dots = [
    { top: "15%", left: "10%", size: 3, opacity: 0.6 },
    { top: "12%", right: "20%", size: 2, opacity: 0.4 },
    { bottom: "20%", left: "15%", size: 2.5, opacity: 0.5 },
    { bottom: "15%", right: "12%", size: 3, opacity: 0.6 },
    { top: "35%", right: "8%", size: 2, opacity: 0.3 },
    { bottom: "35%", left: "8%", size: 2, opacity: 0.4 },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(135deg, #080a12 0%, #0f1220 50%, #1a1035 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Noto Sans SC, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
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
      {dots.map((dot, i) => {
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
      {children}
    </div>
  );
}
