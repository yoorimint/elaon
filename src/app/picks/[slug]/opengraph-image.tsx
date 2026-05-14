import { ImageResponse } from "next/og";
import { getPickCategory } from "@/lib/picks";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateImageMetadata({ params }: { params: { slug: string } }) {
  return [{ id: "default", size, contentType, alt: params.slug }];
}

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

export default async function CategoryOGImage({ params }: { params: { slug: string } }) {
  const cat = getPickCategory(params.slug);
  const fontData = await loadFont();
  const totalItems = cat?.groups.reduce((s, g) => s + g.items.length, 0) ?? 0;

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
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", fontSize: 28, color: "#78350f", fontWeight: 700 }}>
            📚 eloan.kr / 주소모음
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#92400e" }}>
            {totalItems}개 사이트
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 160, marginBottom: 16 }}>
            {cat?.emoji ?? "📚"}
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: "#1c1917",
              lineHeight: 1.1,
              marginBottom: 24,
              letterSpacing: -2,
            }}
          >
            {cat?.shortTitle ?? "주소모음"}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#44403c",
              lineHeight: 1.4,
            }}
          >
            {cat?.oneLiner ?? "한국에서 바로 쓰는 사이트 카테고리"}
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
