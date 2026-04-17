"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function formatKRW(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}

type EquityPoint = { t: number; e: number; b: number };

export function SharedChart({ equity }: { equity: EquityPoint[] }) {
  const data = equity.map((p) => ({
    date: new Date(p.t).toISOString().slice(0, 10),
    전략: p.e,
    보유: p.b,
  }));

  return (
    <div className="mt-6 h-72 sm:h-96 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" minTickGap={40} stroke="currentColor" opacity={0.4} />
          <YAxis
            tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`}
            stroke="currentColor"
            opacity={0.4}
            width={60}
          />
          <Tooltip
            formatter={(v: number) => `₩${formatKRW(v)}`}
            labelStyle={{ color: "#000" }}
          />
          <Legend />
          <Line type="monotone" dataKey="전략" stroke="#f7931a" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="보유" stroke="#888" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
