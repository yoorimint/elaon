import { ImageResponse } from "next/og";
import { STOCK_MARKETS } from "@/lib/market";
import { fetchYahooCandles } from "@/lib/yahoo";
import { buildStockReport } from "@/lib/stock-report";
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
  const symbol = slugToSymbol(params.slug);
  const local = STOCK_MARKETS.find(
    (m) => m.id.replace(/^yahoo:/, "") === symbol,
  );
  const fontData = await loadFont();

  let name = local?.name ?? symbol;
  let priceText = "";
  let changeText = "";
  let changeTone: "up" | "down" | "flat" = "flat";
  let exchange = symbol.endsWith(".KS")
    ? "KOSPI"
    : symbol.endsWith(".KQ")
      ? "KOSDAQ"
      : "OTHER";

  try {
    const endMs = Date.now();
    const startMs = endMs - 1000 * 60 * 60 * 24 * 365 * 2;
    const candles = await fetchYahooCandles(symbol, "1d", startMs, endMs);
    if (candles.length > 0) {
      const report = buildStockReport({
        symbol,
        name,
        candles,
      });
      const isKR = exchange === "KOSPI" || exchange === "KOSDAQ";
      priceText = isKR
        ? `${Math.round(report.price).toLocaleString("ko-KR")}원`
        : `$${report.price.toFixed(2)}`;
      const ch = report.change1d;
      changeTone = ch > 0.05 ? "up" : ch < -0.05 ? "down" : "flat";
      changeText = `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`;
    }
  } catch {
    // graceful
  }

  const changeColor =
    changeTone === "up"
      ? "#ef4444"
      : changeTone === "down"
        ? "#3b82f6"
        : "#737373";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #1c1917 0%, #44403c 100%)",
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
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -3,
              marginBottom: 16,
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#d4d4d4",
              marginBottom: 36,
            }}
          >
            {symbol.replace(/\.(KS|KQ)$/, "")} · {exchange}
          </div>
          {priceText && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
              <span style={{ fontSize: 80, fontWeight: 800 }}>{priceText}</span>
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: changeColor,
                }}
              >
                {changeText}
              </span>
            </div>
          )}
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
