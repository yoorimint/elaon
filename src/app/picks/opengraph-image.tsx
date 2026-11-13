import { ImageResponse } from "next/og";
import { PICK_CATEGORIES, totalPickCount } from "@/lib/picks";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "주소모음 — eloan.kr";

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm203Tq4JJWq209pU0DPdWuqxJFA4GNDCBYtw.woff",
    );
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function HubOGImage() {
  const fontData = await loadFont();
  const total = totalPickCount();
  const catCount = PICK_CATEGORIES.length;
  const emojis = PICK_CATEGORIES.slice(0, 8).map((c) => c.emoji).join(" ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
          padding: "64px 80px",
          fontFamily: "NotoSansKR, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            fontSize: 24,
            color: "#78350f",
            fontWeight: 700,
          }}
        >
          eloan.kr
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 96, marginBottom: 24, gap: 8 }}>
            {emojis}
          </div>
          <div
            style={{
              fontSize: 140,
              fontWeight: 900,
              color: "#1c1917",
              lineHeight: 1,
              marginBottom: 24,
              letterSpacing: -4,
            }}
          >
            주소모음
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 600,
              color: "#44403c",
              marginBottom: 20,
            }}
          >
            한국에서 바로 쓰는 사이트만 큐레이션
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div
              style={{
                display: "flex",
                padding: "12px 28px",
                background: "#1c1917",
                color: "#fef3c7",
                borderRadius: 12,
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {total}개 사이트
            </div>
            <div
              style={{
                display: "flex",
                padding: "12px 28px",
                background: "rgba(255,255,255,0.8)",
                color: "#1c1917",
                borderRadius: 12,
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {catCount}개 카테고리
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: "NotoSansKR", data: fontData, weight: 700, style: "normal" }]
        : undefined,
    },
  );
}
