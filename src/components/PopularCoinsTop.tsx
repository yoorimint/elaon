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
      "id,market,strategy,days,return_pct,benchmark_return_pct,action,last_signal_action,last_signal_bars_ago,last_signal_entry_price,current_price,last_signal_at,share_slug,custom_template_id,rank,computed_at",
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

      <ul className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-5">
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
                className="block h-full rounded-xl border border-amber-300 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-neutral-950 p-3 sm:p-4 transition hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-bold leading-tight">
                    {coinLabel(r.market)}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${actionStyle.pill}`}>
                    {actionStyle.dot} {actionStyle.label}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-neutral-500 truncate">
                  {strategyShort(r.strategy, r.custom_template_id)} ·{" "}
                  {r.days >= 700 ? "2년" : r.days >= 330 ? "1년" : `${r.days}일`}
                </div>
                <div className="mt-2">
                  <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                    +{r.return_pct.toFixed(1)}%
                  </span>
                  <span className="ml-1 text-[10px] text-neutral-500">백테</span>
                </div>
                {paper && (
                  <div
                    className={`mt-1 text-[11px] font-medium ${
                      paper.pct >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    모의 {paper.text}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-brand font-semibold">
                  결과 보기 →
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
