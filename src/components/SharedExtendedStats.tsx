"use client";

// 공유 상세 페이지(/r/[slug]) 전용 — DB 에 저장된 extended_metrics 로부터
// 리스크 조정 지표 / 거래 상세 / 월별 히트맵을 그린다. ResultView 와 내용은
// 유사하지만 서버 컴포넌트에서 호출하기 위해 별도 클라이언트 아일랜드로 분리.

import { TermTooltip } from "./TermTooltip";

type ExtendedMetrics = {
  sharpe_ratio?: number | null;
  sortino_ratio?: number | null;
  calmar_ratio?: number | null;
  profit_factor?: number | null;
  expectancy_pct?: number | null;
  avg_win_pct?: number | null;
  avg_loss_pct?: number | null;
  best_trade_pct?: number | null;
  worst_trade_pct?: number | null;
  max_consec_wins?: number | null;
  max_consec_losses?: number | null;
  avg_hold_bars?: number | null;
  max_drawdown_duration_bars?: number | null;
  monthly?: Array<{ year: number; month: number; returnPct: number }> | null;
};

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}
function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

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
      <div
        className="text-[11px] sm:text-xs text-neutral-500 flex items-center gap-1"
        title={hint}
      >
        {label}
      </div>
      <div className={`mt-1 text-base sm:text-xl font-bold truncate ${color}`}>
        {value}
      </div>
    </div>
  );
}

function MonthlyHeatmap({
  monthly,
}: {
  monthly: Array<{ year: number; month: number; returnPct: number }>;
}) {
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

export function SharedExtendedStats({
  metrics,
  tradeCount,
}: {
  metrics: ExtendedMetrics | null;
  tradeCount: number;
}) {
  if (!metrics) return null;
  const hasRisk =
    metrics.sharpe_ratio != null ||
    metrics.sortino_ratio != null ||
    metrics.calmar_ratio != null ||
    metrics.profit_factor != null;

  return (
    <div className="mt-6 space-y-6">
      {hasRisk && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-500">
            리스크 조정 지표
          </h3>
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            <Stat
              label={<TermTooltip term="Sharpe">Sharpe Ratio</TermTooltip>}
              value={fmtNum(metrics.sharpe_ratio)}
              tone={
                (metrics.sharpe_ratio ?? 0) >= 1
                  ? "pos"
                  : (metrics.sharpe_ratio ?? 0) < 0
                    ? "neg"
                    : undefined
              }
            />
            <Stat
              label={<TermTooltip term="Sortino">Sortino Ratio</TermTooltip>}
              value={fmtNum(metrics.sortino_ratio)}
            />
            <Stat
              label={<TermTooltip term="Calmar">Calmar Ratio</TermTooltip>}
              value={fmtNum(metrics.calmar_ratio)}
            />
            <Stat
              label={<TermTooltip term="ProfitFactor">Profit Factor</TermTooltip>}
              value={fmtNum(metrics.profit_factor)}
              tone={
                (metrics.profit_factor ?? 0) >= 1.5
                  ? "pos"
                  : (metrics.profit_factor ?? 0) < 1
                    ? "neg"
                    : undefined
              }
            />
          </div>
        </div>
      )}

      {tradeCount > 0 && metrics.expectancy_pct != null && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-500">거래 상세</h3>
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            <Stat
              label={<TermTooltip term="Expectancy">거래당 기대값</TermTooltip>}
              value={fmtPct(metrics.expectancy_pct)}
              tone={(metrics.expectancy_pct ?? 0) >= 0 ? "pos" : "neg"}
            />
            <Stat
              label="평균 이익 / 손실"
              value={`${fmtPct(metrics.avg_win_pct, 1)} / ${fmtPct(metrics.avg_loss_pct, 1)}`}
            />
            <Stat
              label="최고 / 최악 거래"
              value={`${fmtPct(metrics.best_trade_pct, 1)} / ${fmtPct(metrics.worst_trade_pct, 1)}`}
            />
            <Stat
              label="최대 연승 / 연패"
              value={`${metrics.max_consec_wins ?? 0}회 / ${metrics.max_consec_losses ?? 0}회`}
            />
            <Stat
              label="평균 보유 기간"
              value={`${Math.round(metrics.avg_hold_bars ?? 0)}봉`}
            />
            <Stat
              label="최대 낙폭 기간"
              value={`${metrics.max_drawdown_duration_bars ?? 0}봉`}
              tone="neg"
            />
          </div>
        </div>
      )}

      {metrics.monthly && metrics.monthly.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-500">
            월별 수익률 <span className="text-neutral-400 font-normal">(단위: %)</span>
          </h3>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-2">
            <MonthlyHeatmap monthly={metrics.monthly} />
          </div>
        </div>
      )}
    </div>
  );
}
