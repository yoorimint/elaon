import { ImageResponse } from "next/og";
import { getHub, getPickCategory, listHubs } from "@/lib/picks";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 정적 빌드 시 모든 hub 페이지에 대해 OG image 사전 생성.
export function generateImageMetadata({ params }: { params: { slug: string; hub: string } }) {
  return [{ id: "default", size, contentType, alt: `${params.slug} ${params.hub}` }];
}

// 한글 폰트 — Noto Sans KR Bold (Google Fonts).
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

export default async function HubOGImage({
  params,
}: {
  params: { slug: string; hub: string };
}) {
  const entry = getHub(params.slug, params.hub);
  const cat = getPickCategory(params.slug);
  const fontData = await loadFont();

  const item = entry?.item;
  const name = item?.name ?? "주소모음";
  const blurb = item?.blurb ?? "한국에서 바로 쓰는 사이트";
  const catEmoji = cat?.emoji ?? "📚";
  const catName = cat?.shortTitle ?? "디렉토리";
  const pricing = item?.pricing
    ? item.pricing === "free"
      ? "무료"
      : item.pricing === "freemium"
        ? "무료+유료"
        : "유료"
    : null;
  const founded = item?.founded ? `${item.founded}년` : null;

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
        {/* 상단: 카테고리 뱃지 + 사이트명 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(255,255,255,0.7)",
              padding: "10px 20px",
              borderRadius: 999,
              fontSize: 24,
              color: "#92400e",
            }}
          >
            <span style={{ fontSize: 32 }}>{catEmoji}</span>
            <span style={{ fontWeight: 700 }}>{catName}</span>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#78350f", fontWeight: 600 }}>
            eloan.kr / 주소모음
          </div>
        </div>

        {/* 중앙: 사이트 이름 + 한 줄 요약 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: "#1c1917",
              lineHeight: 1.1,
              marginBottom: 28,
              letterSpacing: -2,
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 500,
              color: "#44403c",
              lineHeight: 1.4,
            }}
          >
            {blurb}
          </div>
        </div>

        {/* 하단: 메타 정보 */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 24,
          }}
        >
          {pricing && (
            <div
              style={{
                display: "flex",
                padding: "10px 24px",
                background: "#1c1917",
                color: "#fef3c7",
                borderRadius: 12,
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {pricing}
            </div>
          )}
          {founded && (
            <div
              style={{
                display: "flex",
                padding: "10px 24px",
                background: "rgba(255,255,255,0.7)",
                color: "#44403c",
                borderRadius: 12,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {founded} 출시
            </div>
          )}
          {item?.korean && (
            <div
              style={{
                display: "flex",
                padding: "10px 24px",
                background: "#dc2626",
                color: "white",
                borderRadius: 12,
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              KR
            </div>
          )}
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
