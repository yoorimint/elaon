"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { BacktestResult } from "@/lib/backtest";
import type { Candle } from "@/lib/upbit";
import type { Signal, StrategyId, StrategyParams } from "@/lib/strategies";
import type { Condition } from "@/lib/diy-strategy";
import { formatMoney, formatMoneyShort, type Currency } from "@/lib/market";
import { TVChart } from "./TVChart";
import { TermTooltip } from "./TermTooltip";


function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: React.ReactNode;
  value: string;
  tone?: "pos" | "neg";
  hint?: string;
}) {
  const color =
    tone === "pos"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "neg"
        ? "text-red-600 dark:text-red-400"
        : "";
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 sm:p-4">
      <div className="text-[11px] sm:text-xs text-neutral-500 flex items-center gap-1" title={hint}>
        {label}
      </div>
      <div className={`mt-1 text-base sm:text-xl font-bold truncate ${color}`}>
        {value}
      </div>
    </div>
  );
}

function fmtNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return n > 0 ? "∞" : "—";
  return n.toFixed(digits);
}

function fmtPct(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

// 월별 수익률 히트맵. 가로 월(Jan~Dec) × 세로 연. 모바일에선 가로 스크롤.
function MonthlyHeatmap({ monthly }: { monthly: BacktestResult["monthly"] }) {
  if (!monthly || monthly.length === 0) return null;
  const years = Array.from(new Set(monthly.map((m) => m.year))).sort();
  const byYear = new Map<number, Map<number, number>>();
  for (const m of monthly) {
    if (!byYear.has(m.year)) byYear.set(m.year, new Map());
    byYear.get(m.year)!.set(m.month, m.returnPct);
  }
  function cellColor(v: number | undefined): string {
    if (v == null) return "bg-neutral-50 dark:bg-neutral-900/40 text-neutral-400";
    if (v > 5) return "bg-emerald-500/80 text-white";
    if (v > 1) return "bg-emerald-400/60 text-emerald-900 dark:text-emerald-50";
    if (v > 0) return "bg-emerald-200/60 text-emerald-900 dark:text-emerald-100";
    if (v > -1) return "bg-red-200/60 text-red-900 dark:text-red-100";
    if (v > -5) return "bg-red-400/60 text-red-900 dark:text-red-50";
    return "bg-red-500/80 text-white";
  }
  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] sm:text-xs border-separate border-spacing-0.5 min-w-full">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white dark:bg-neutral-950 px-2 py-1 text-neutral-500 font-normal text-left">
              연도
            </th>
            {["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"].map(
              (m) => (
                <th key={m} className="px-1 py-1 text-neutral-500 font-normal min-w-[38px]">
                  {m}
                </th>
              ),
            )}
            <th className="px-2 py-1 text-neutral-500 font-normal">합계</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => {
            const row = byYear.get(y);
            let total = 1;
            if (row) {
              for (const v of row.values()) total *= 1 + v / 100;
            }
            const totalPct = (total - 1) * 100;
            return (
              <tr key={y}>
                <td className="sticky left-0 bg-white dark:bg-neutral-950 px-2 py-1 font-semibold">
                  {y}
                </td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const v = row?.get(m);
                  return (
                    <td
                      key={m}
                      className={`px-1 py-1 text-center rounded ${cellColor(v)}`}
                      title={v != null ? `${v.toFixed(2)}%` : "데이터 없음"}
                    >
                      {v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}` : "·"}
                    </td>
                  );
                })}
                <td
                  className={`px-2 py-1 text-center font-semibold rounded ${cellColor(totalPct)}`}
                >
                  {totalPct >= 0 ? "+" : ""}
                  {totalPct.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

      {/* 핵심 지표 */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat
          label="전략 수익률"
          value={`${result.returnPct.toFixed(2)}%`}
          tone={result.returnPct >= 0 ? "pos" : "neg"}
        />
        <Stat
          label={<TermTooltip term="Benchmark">단순 보유 수익률</TermTooltip>}
          value={`${result.benchmarkReturnPct.toFixed(2)}%`}
          tone={result.benchmarkReturnPct >= 0 ? "pos" : "neg"}
        />
        <Stat
          label={<TermTooltip term="MDD">최대 낙폭 (MDD)</TermTooltip>}
          value={`${result.maxDrawdownPct.toFixed(2)}%`}
          tone="neg"
        />
        <Stat
          label={<TermTooltip term="WinRate">승률</TermTooltip>}
          value={result.tradeCount === 0 ? "-" : `${result.winRate.toFixed(1)}%`}
        />
      </div>

      <div className="mt-3 text-sm">
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

      {/* 리스크 조정 지표 */}
      {result.sharpeRatio !== undefined && (
        <>
          <h3 className="mt-6 mb-2 text-sm font-semibold text-neutral-500">
            리스크 조정 지표
          </h3>
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            <Stat
              label={<TermTooltip term="Sharpe">Sharpe Ratio</TermTooltip>}
              value={fmtNum(result.sharpeRatio)}
              tone={result.sharpeRatio >= 1 ? "pos" : result.sharpeRatio < 0 ? "neg" : undefined}
            />
            <Stat
              label={<TermTooltip term="Sortino">Sortino Ratio</TermTooltip>}
              value={fmtNum(result.sortinoRatio)}
              tone={result.sortinoRatio >= 1 ? "pos" : result.sortinoRatio < 0 ? "neg" : undefined}
            />
            <Stat
              label={<TermTooltip term="Calmar">Calmar Ratio</TermTooltip>}
              value={fmtNum(result.calmarRatio)}
              tone={result.calmarRatio >= 1 ? "pos" : undefined}
            />
            <Stat
              label={<TermTooltip term="ProfitFactor">Profit Factor</TermTooltip>}
              value={fmtNum(result.profitFactor)}
              tone={result.profitFactor >= 1.5 ? "pos" : result.profitFactor < 1 ? "neg" : undefined}
            />
          </div>
        </>
      )}

      {/* 거래 상세 */}
      {result.tradeCount > 0 && result.expectancyPct !== undefined && (
        <>
          <h3 className="mt-6 mb-2 text-sm font-semibold text-neutral-500">거래 상세</h3>
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            <Stat
              label={<TermTooltip term="Expectancy">거래당 기대값</TermTooltip>}
              value={fmtPct(result.expectancyPct)}
              tone={result.expectancyPct >= 0 ? "pos" : "neg"}
            />
            <Stat
              label="평균 이익 / 손실"
              value={`${fmtPct(result.avgWinPct, 1)} / ${fmtPct(result.avgLossPct, 1)}`}
              hint="이익 거래 평균값 / 손실 거래 평균값"
            />
            <Stat
              label="최고 / 최악 거래"
              value={`${fmtPct(result.bestTradePct, 1)} / ${fmtPct(result.worstTradePct, 1)}`}
            />
            <Stat
              label="최대 연승 / 연패"
              value={`${result.maxConsecWins}회 / ${result.maxConsecLosses}회`}
            />
            <Stat
              label="평균 보유 기간"
              value={`${Math.round(result.avgHoldBars)}봉`}
              hint="한 포지션을 평균 몇 봉 동안 들고 있었는지"
            />
            <Stat
              label="최대 낙폭 기간"
              value={`${result.maxDrawdownDurationBars}봉`}
              hint="고점 대비 회복까지 걸린 최장 기간"
              tone="neg"
            />
          </div>
        </>
      )}

      {/* 월별 수익률 히트맵 */}
      {result.monthly && result.monthly.length > 0 && (
        <>
          <h3 className="mt-6 mb-2 text-sm font-semibold text-neutral-500">
            월별 수익률 <span className="text-neutral-400 font-normal">(단위: %)</span>
          </h3>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-2">
            <MonthlyHeatmap monthly={result.monthly} />
          </div>
        </>
      )}

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
