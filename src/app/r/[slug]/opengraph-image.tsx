import { ImageResponse } from "next/og";
import { createServerClient } from "@/lib/supabase-server";
import { STRATEGIES } from "@/lib/strategies";
import { symbolPrettyLabel } from "@/lib/bot-symbols";

export const runtime = "edge";
export const alt = "eloan 백테스트 결과";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function strategyName(id: string) {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

export default async function Image({ params }: { params: { slug: string } }) {
  const sb = createServerClient();
  const { data } = await sb
    .from("shared_backtests")
    .select("market,strategy,days,return_pct,benchmark_return_pct,max_drawdown_pct,trade_count")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#fff",
            fontSize: 48,
          }}
        >
          eloan 백테스트
        </div>
      ),
      size,
    );
  }

  const positive = data.return_pct >= 0;
  const accent = positive ? "#10b981" : "#ef4444";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          color: "#fff",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: "#f7931a",
            fontWeight: 700,
            letterSpacing: 4,
          }}
        >
          ELOAN BACKTEST
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 24, fontSize: 32, color: "#a3a3a3" }}>
          <span style={{ background: "#1f1f1f", padding: "8px 20px", borderRadius: 999 }}>
            {symbolPrettyLabel(data.market)}
          </span>
          <span style={{ background: "#1f1f1f", padding: "8px 20px", borderRadius: 999 }}>
            {strategyName(data.strategy)}
          </span>
          <span style={{ background: "#1f1f1f", padding: "8px 20px", borderRadius: 999 }}>
            {data.days}일
          </span>
        </div>

        <div style={{ marginTop: 48, display: "flex", alignItems: "baseline", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 24, color: "#a3a3a3" }}>전략 수익률</span>
            <span style={{ fontSize: 160, fontWeight: 800, color: accent, lineHeight: 1 }}>
              {data.return_pct.toFixed(1)}%
            </span>
          </div>
        </div>

        <div style={{ marginTop: 32, display: "flex", gap: 48, fontSize: 28, color: "#a3a3a3" }}>
          <span>단순 보유 {data.benchmark_return_pct.toFixed(1)}%</span>
          <span>MDD {data.max_drawdown_pct.toFixed(1)}%</span>
          <span>거래 {data.trade_count}회</span>
        </div>

        <div style={{ marginTop: "auto", fontSize: 24, color: "#737373" }}>
          eloan.kr — 코인 전략, 숫자로 증명하세요
        </div>
      </div>
    ),
    size,
  );
}
