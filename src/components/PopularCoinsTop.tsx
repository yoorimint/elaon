// 홈 최상단 '🏆 인기 코인 베스트 전략' 섹션.
// popular_coin_strategies 에서 5 코인 각각의 수익률 최고 전략을 SSR 로 렌더.
// 크론 미동작 / 테이블 비면 섹션 자체 사라짐 (null 반환).

import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { SCAN_CUSTOM_TEMPLATES } from "@/lib/scan-custom-templates";
import { timeAgo } from "@/lib/community";

const STALE_THRESHOLD_HOURS = 26;

type Row = {
  id: number;
  market: string;
  strategy: string;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
  win_rate: number | null;
  action: "buy" | "sell" | "hold";
  last_signal_action: "buy" | "sell" | null;
  last_signal_bars_ago: number | null;
  last_signal_entry_price: number | null;
  current_price: number | null;
  last_signal_at: string | null;
  share_slug: string | null;
  custom_template_id: string | null;
  rank: number;
  computed_at: string;
};

function coinLabel(marketId: string): string {
  // KRW-BTC → 비트코인 으로 매핑. 없으면 심볼 그대로.
  const map: Record<string, string> = {
    "KRW-BTC": "비트코인",
    "KRW-ETH": "이더리움",
    "KRW-XRP": "리플",
    "KRW-SOL": "솔라나",
    "KRW-DOGE": "도지코인",
  };
  return map[marketId] ?? marketId.replace(/^KRW-/, "");
}

function strategyShort(s: string, customTemplateId?: string | null): string {
  if (s === "custom" && customTemplateId) {
    const t = SCAN_CUSTOM_TEMPLATES.find((x) => x.id === customTemplateId);
    if (t) return t.name;
  }
  switch (s) {
    case "ma_cross": return "이평 크로스";
    case "rsi": return "RSI";
    case "bollinger": return "볼린저";
    case "macd": return "MACD";
    case "breakout": return "변동성 돌파";
    case "stoch": return "스토캐스틱";
    case "ichimoku": return "일목균형";
    case "dca": return "DCA";
    case "ma_dca": return "MA DCA";
    case "rebalance": return "리밸런싱";
    case "custom": return "커스텀(DIY)";
    default: return s;
  }
}

async function loadPopular(): Promise<Row[]> {
  const sb = createServerClient();
  const { data } = await sb
    .from("popular_coin_strategies")
    .select(
      "id,market,strategy,days,return_pct,benchmark_return_pct,win_rate,action,last_signal_action,last_signal_bars_ago,last_signal_entry_price,current_price,last_signal_at,share_slug,custom_template_id,rank,computed_at",
    )
    .order("rank", { ascending: true });
  return (data ?? []) as Row[];
}

// "4/23 이후 +7.3%" 형태. 신호가 있어야 계산됨.
function paperReturnLabel(r: Row): { text: string; pct: number } | null {
  if (!r.last_signal_action || !r.last_signal_at) return null;
  if (r.last_signal_entry_price == null || r.current_price == null) return null;
  const pct =
    r.last_signal_action === "buy"
      ? (r.current_price / r.last_signal_entry_price - 1) * 100
      : (r.last_signal_entry_price / r.current_price - 1) * 100; // sell 은 숏 가정
  const d = new Date(r.last_signal_at);
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  return { text: `${md} 이후 ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, pct };
}

export async function PopularCoinsTop() {
  const rows = await loadPopular();
  if (rows.length === 0) return null;

  const latestComputedAt = rows.reduce<string>(
    (acc, r) => (r.computed_at > acc ? r.computed_at : acc),
    rows[0].computed_at,
  );
  const isStale =
    (Date.now() - new Date(latestComputedAt).getTime()) / 3_600_000 >
    STALE_THRESHOLD_HOURS;

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">
            🏆 인기 코인 베스트 전략
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            BTC·ETH·XRP·SOL·DOGE 각각 전체 전략(커스텀 포함) × 1·2년 백테스트
            중 수익률 최고 조합.
          </p>
          <div className="mt-1 text-[11px] text-neutral-500">
            {isStale ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-amber-700 dark:text-amber-300 font-medium">
                ⚠️ 갱신 {timeAgo(latestComputedAt)} · 최신 아닐 수 있어요
              </span>
            ) : (
              <span>갱신 {timeAgo(latestComputedAt)}</span>
            )}
          </div>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 grid-cols-1 sm:grid-cols-2">
        {rows.map((r) => {
          const href = r.share_slug
            ? `/r/${r.share_slug}`
            : `/backtest?market=${encodeURIComponent(r.market)}&strategy=${r.strategy}&days=${r.days}${
                r.custom_template_id
                  ? `&customTemplate=${encodeURIComponent(r.custom_template_id)}`
                  : ""
              }`;
          const actionStyle =
            r.action === "buy"
              ? { pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "🟢", label: "매수" }
              : r.action === "sell"
                ? { pill: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", dot: "🔴", label: "매도" }
                : { pill: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400", dot: "⚪", label: "대기" };
          const paper = paperReturnLabel(r);
          return (
            <li key={r.id}>
              <Link
                href={href}
                className="group flex items-center gap-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/30 dark:to-neutral-950 px-3 py-2.5 transition hover:shadow-md"
              >
                {/* 좌측: 코인명 + 액션 뱃지 */}
                <div className="shrink-0 min-w-[72px]">
                  <div className="font-bold leading-tight text-sm">
                    {coinLabel(r.market)}
                  </div>
                  <div
                    className={`mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${actionStyle.pill}`}
                  >
                    <span>{actionStyle.dot}</span>
                    <span>{actionStyle.label}</span>
                  </div>
                </div>

                {/* 가운데: 전략명 → 전략/보유 수익률 → 모의/승률 3줄 */}
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-neutral-500 truncate">
                    {strategyShort(r.strategy, r.custom_template_id)} ·{" "}
                    {r.days >= 700 ? "2년" : r.days >= 330 ? "1년" : `${r.days}일`}
                  </div>
                  <div className="mt-0.5 text-[12px] leading-snug">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      전략 {r.return_pct >= 0 ? "+" : ""}
                      {r.return_pct.toFixed(1)}%
                    </span>
                    <span className="ml-1.5 text-neutral-500">
                      vs 보유{" "}
                      <span
                        className={
                          r.benchmark_return_pct >= 0
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "text-red-600 dark:text-red-400 font-semibold"
                        }
                      >
                        {r.benchmark_return_pct >= 0 ? "+" : ""}
                        {r.benchmark_return_pct.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug">
                    {paper ? (
                      <>
                        <span className="text-neutral-500">
                          모의투자 진행중{" "}
                        </span>
                        <span
                          className={
                            paper.pct >= 0
                              ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                              : "text-red-600 dark:text-red-400 font-semibold"
                          }
                        >
                          {paper.text}
                        </span>
                      </>
                    ) : (
                      <span className="text-neutral-400">
                        모의투자 대기중
                      </span>
                    )}
                    {r.win_rate != null && (
                      <span className="ml-1.5 text-neutral-500">
                        · 승률{" "}
                        <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                          {r.win_rate.toFixed(0)}%
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 우측: 화살표 */}
                <span className="shrink-0 text-brand font-bold text-sm group-hover:translate-x-0.5 transition">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
