import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MYTax Calculator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage({ params }: { params: { locale: string } }) {
  const titles: Record<string, { main: string; sub: string }> = {
    en: {
      main: "Malaysia Tax Calculator",
      sub: "Free personal income tax calculator for YA2025 with all LHDN reliefs",
    },
    zh: {
      main: "马来西亚税务计算器",
      sub: "免费个人所得税计算器 YA2025 · 含所有 LHDN 减免项目",
    },
    ms: {
      main: "Kalkulator Cukai Malaysia",
      sub: "Kalkulator cukai pendapatan peribadi percuma YA2025 dengan semua pelepasan LHDN",
    },
  };

  const t = titles[params.locale] || titles.en;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #18181b 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)",
          }}
        />

        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              color: "white",
              fontWeight: 700,
            }}
          >
            MY
          </div>
          <span
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: "white",
              letterSpacing: -1,
            }}
          >
            MYTax
          </span>
        </div>

        {/* Main title */}
        <h1
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "white",
            margin: 0,
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          {t.main}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            margin: "20px 0 0 0",
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          {t.sub}
        </p>

        {/* Bottom domain */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 20, color: "#71717a" }}>mytaxs.online</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
