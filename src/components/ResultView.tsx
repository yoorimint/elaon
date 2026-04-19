"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { BacktestResult } from "@/lib/backtest";
import type { Candle } from "@/lib/upbit";
import type { Signal, StrategyId, StrategyParams } from "@/lib/strategies";
import type { Condition } from "@/lib/diy-strategy";
import { formatMoney, formatMoneyShort, type Currency } from "@/lib/market";
import { TVChart } from "./TVChart";


function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color =
    tone === "pos"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "neg"
        ? "text-red-600 dark:text-red-400"
        : "";
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

export function ResultView({
  result,
  candles,
  signals,
  strategy,
  params,
  customBuy,
  customSell,
  currency = "KRW",
}: {
  result: BacktestResult;
  candles?: Candle[];
  signals?: Signal[];
  strategy?: StrategyId;
  params?: StrategyParams;
  customBuy?: Condition[];
  customSell?: Condition[];
  currency?: Currency;
}) {
  const data = result.equity.map((p) => ({
    date: new Date(p.timestamp).toISOString().slice(0, 10),
    전략: Math.round(p.equity),
    보유: Math.round(p.benchmark),
  }));

  const beatBenchmark = result.returnPct > result.benchmarkReturnPct;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">결과</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="전략 수익률"
          value={`${result.returnPct.toFixed(2)}%`}
          tone={result.returnPct >= 0 ? "pos" : "neg"}
        />
        <Stat
          label="단순 보유 수익률"
          value={`${result.benchmarkReturnPct.toFixed(2)}%`}
          tone={result.benchmarkReturnPct >= 0 ? "pos" : "neg"}
        />
        <Stat
          label="최대 낙폭(MDD)"
          value={`${result.maxDrawdownPct.toFixed(2)}%`}
          tone="neg"
        />
        <Stat
          label="승률"
          value={result.tradeCount === 0 ? "-" : `${result.winRate.toFixed(1)}%`}
        />
      </div>

      <div className="mt-4 text-sm">
        {beatBenchmark ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            ✓ 단순 보유보다 {(result.returnPct - result.benchmarkReturnPct).toFixed(2)}%p 초과 수익
          </span>
        ) : (
          <span className="text-neutral-500">
            단순 보유 대비 {(result.returnPct - result.benchmarkReturnPct).toFixed(2)}%p
          </span>
        )}
      </div>

      {candles && candles.length > 0 && signals && strategy && params && (
        <div className="mt-6">
          <TVChart
            candles={candles}
            signals={signals}
            strategy={strategy}
            params={params}
            customBuy={customBuy}
            customSell={customSell}
            currency={currency}
          />
        </div>
      )}

      <div className="mt-6 h-72 sm:h-96 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="text-xs font-semibold mb-1 text-neutral-600 dark:text-neutral-400">
          자산 곡선 (전략 vs 단순 보유)
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" minTickGap={40} stroke="currentColor" opacity={0.4} />
            <YAxis
              tickFormatter={(v: number) => formatMoneyShort(v, currency)}
              stroke="currentColor"
              opacity={0.4}
              width={70}
            />
            <Tooltip
              formatter={(v: number) => formatMoney(v, currency)}
              labelStyle={{ color: "#000" }}
            />
            <Legend />
            <Line type="monotone" dataKey="전략" stroke="#f7931a" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="보유" stroke="#888" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6">
        <h3 className="text-base font-semibold mb-2">거래 내역 ({result.tradeCount}회)</h3>
        {result.trades.length === 0 ? (
          <div className="text-sm text-neutral-500">거래가 발생하지 않았습니다.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-right">진입가</th>
                  <th className="px-3 py-2 text-right">청산가</th>
                  <th className="px-3 py-2 text-right">손익</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((t, i) => (
                  <tr key={i} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(t.entryPrice, currency)}</td>
                    <td className="px-3 py-2 text-right">
                      {t.exitPrice ? formatMoney(t.exitPrice, currency) : "-"}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${
                        (t.pnlPct ?? 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {t.pnlPct == null ? "-" : `${t.pnlPct.toFixed(2)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
