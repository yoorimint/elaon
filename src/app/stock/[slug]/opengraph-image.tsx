import { ImageResponse } from "next/og";
import { STOCK_SUGGESTIONS } from "@/lib/stock-suggestions";
import { slugToSymbol } from "@/lib/stock-resolver";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "종목 보고서 — eloan.kr";

export const dynamic = "force-dynamic";

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

export default async function StockOG({
  params,
}: {
  params: { slug: string };
}) {
  let symbol = "";
  let name = "";
  let exchange: "KOSPI" | "KOSDAQ" | "US" | "OTHER" = "OTHER";
  let fontData: ArrayBuffer | null = null;

  try {
    symbol = slugToSymbol(params.slug);
    const local = STOCK_SUGGESTIONS.find((m) => m.symbol === symbol);
    name = local?.name ?? symbol;
    exchange = local?.exchange ?? (
      symbol.endsWith(".KS")
        ? "KOSPI"
        : symbol.endsWith(".KQ")
          ? "KOSDAQ"
          : "OTHER"
    );
    fontData = await loadFont();
  } catch {
    name = name || symbol || "종목";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1c1917 0%, #44403c 100%)",
          padding: "64px 80px",
          color: "#fafafa",
          fontFamily: "NotoSansKR, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#fbbf24",
            fontWeight: 700,
          }}
        >
          <span>📈 eloan.kr / 종목 보고서</span>
          <span>{exchange}</span>
        </div>

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
              fontSize: 110,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -3,
              marginBottom: 24,
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#d4d4d4",
            }}
          >
            {(symbol || "").replace(/\.(KS|KQ)$/, "")} · {exchange}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#a3a3a3",
          }}
        >
          <span>일봉 차트 · EMA · RSI · ADX · CAN SLIM · 백테스트</span>
          <span>야후 일봉 기준</span>
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
