"use client";

import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Candle } from "@/lib/upbit";
import type { Trade } from "@/lib/backtest";

function formatKRW(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}

type Marker = { date: string; price: number; kind: "buy" | "sell" };

function BuyMark(props: {
  cx?: number;
  cy?: number;
}) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g transform={`translate(${cx},${cy})`}>
      <polygon points="0,-8 -6,4 6,4" fill="#10b981" stroke="#059669" strokeWidth={1} />
    </g>
  );
}

function SellMark(props: {
  cx?: number;
  cy?: number;
}) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g transform={`translate(${cx},${cy})`}>
      <polygon points="0,8 -6,-4 6,-4" fill="#ef4444" stroke="#dc2626" strokeWidth={1} />
    </g>
  );
}

export function PriceChart({
  candles,
  trades,
}: {
  candles: Candle[];
  trades: Trade[];
}) {
  const data = candles.map((c) => ({
    date: new Date(c.timestamp).toISOString().slice(0, 10),
    price: c.close,
  }));

  const buyMarks: Marker[] = [];
  const sellMarks: Marker[] = [];
  for (const t of trades) {
    if (t.entryIndex != null && candles[t.entryIndex]) {
      buyMarks.push({
        date: new Date(candles[t.entryIndex].timestamp).toISOString().slice(0, 10),
        price: t.entryPrice,
        kind: "buy",
      });
    }
    if (t.exitIndex != null && t.exitPrice != null && candles[t.exitIndex]) {
      sellMarks.push({
        date: new Date(candles[t.exitIndex].timestamp).toISOString().slice(0, 10),
        price: t.exitPrice,
        kind: "sell",
      });
    }
  }

  return (
    <div className="h-72 sm:h-96 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="text-xs font-semibold mb-1 text-neutral-600 dark:text-neutral-400">
        가격 차트 · <span className="text-emerald-600">▲ 매수</span>{" "}
        <span className="text-red-500">▼ 매도</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="date" minTickGap={40} stroke="currentColor" opacity={0.4} />
          <YAxis
            tickFormatter={(v: number) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : v >= 10_000
                  ? `${(v / 10_000).toFixed(0)}만`
                  : String(v)
            }
            stroke="currentColor"
            opacity={0.4}
            width={60}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(v: number) => `₩${formatKRW(v)}`}
            labelStyle={{ color: "#000" }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#737373"
            dot={false}
            strokeWidth={1.3}
            name="종가"
          />
          <Scatter
            data={buyMarks}
            dataKey="price"
            shape={<BuyMark />}
            name="매수"
          />
          <Scatter
            data={sellMarks}
            dataKey="price"
            shape={<SellMark />}
            name="매도"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
