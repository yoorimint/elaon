// 홈 최상단 "오늘 살 만한 거" 하이라이트.
// board_top_signals 에서 action='buy' 인 것만 상위 N개 서버에서 로드.
// 크론이 아직 안 돌아 테이블 비었으면 null 반환 → 홈에서 섹션 자체 사라짐.

import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { STOCK_MARKETS } from "@/lib/market";
import { SCAN_CUSTOM_TEMPLATES } from "@/lib/scan-custom-templates";
import { timeAgo } from "@/lib/community";

const DISPLAY_N = 3;
// GitHub Actions 크론이 종종 스킵되는 이슈가 있어서, computed_at 이
// 이 시간을 넘으면 "신호가 오래됐어요" 경고를 띄워 유저가 혼란을 안 겪게.
const STALE_THRESHOLD_HOURS = 26;

type Row = {
  id: number;
  market: string;
  strategy: string;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
  share_slug: string | null;
  custom_template_id: string | null;
  computed_at: string;
};

function shortMarketLabel(marketId: string): string {
  const hit = STOCK_MARKETS.find((m) => m.id === marketId);
  if (hit) return hit.name;
  if (marketId.startsWith("KRW-")) return marketId.slice(4);
  if (marketId.startsWith("okx_fut:")) {
    return (
      marketId.slice("okx_fut:".length).replace("-USDT-SWAP", "") + " 선물"
    );
  }
  if (marketId.startsWith("yahoo:")) {
    return marketId.slice("yahoo:".length).replace(/\.KS$|\.KQ$/, "");
  }
  return marketId;
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
    case "breakout": return "브레이크아웃";
    case "stoch": return "스토캐스틱";
    case "ichimoku": return "일목균형";
    case "dca": return "DCA";
    case "ma_dca": return "MA DCA";
    case "rebalance": return "리밸런싱";
    case "custom": return "커스텀(DIY)";
    default: return s;
  }
}

async function loadBuys(): Promise<Row[]> {
  const sb = createServerClient();
  const { data } = await sb
    .from("board_top_signals")
    .select("id,market,strategy,days,return_pct,benchmark_return_pct,share_slug,custom_template_id,computed_at")
    .eq("action", "buy")
    .order("return_pct", { ascending: false })
    .limit(DISPLAY_N);
  return (data ?? []) as Row[];
}

export async function TodayBuyHighlight() {
  const rows = await loadBuys();
  if (rows.length === 0) return null;

  const latestComputedAt = rows.reduce<string>(
    (acc, r) => (r.computed_at > acc ? r.computed_at : acc),
    rows[0].computed_at,
  );
  const ageHours =
    (Date.now() - new Date(latestComputedAt).getTime()) / 3_600_000;
  const isStale = ageHours > STALE_THRESHOLD_HOURS;

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">
            🔥 오늘 살 만한 거 ({rows.length})
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            과거 수익률 높았던 전략들이 오늘 매수 신호를 냈어요.
          </p>
          <div className="mt-1 text-[11px] text-neutral-500">
            {isStale ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-amber-700 dark:text-amber-300 font-medium">
                ⚠️ 신호 갱신 {timeAgo(latestComputedAt)} · 최신 아닐 수 있어요
              </span>
            ) : (
              <span>갱신 {timeAgo(latestComputedAt)}</span>
            )}
          </div>
        </div>
        <Link
          href="/signals"
          className="shrink-0 text-sm text-brand hover:underline whitespace-nowrap"
        >
          전체 신호 →
        </Link>
      </div>

      <ul className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const href = r.share_slug
            ? `/r/${r.share_slug}`
            : `/backtest?market=${encodeURIComponent(r.market)}&strategy=${r.strategy}&days=${r.days}${
                r.custom_template_id
                  ? `&customTemplate=${encodeURIComponent(r.custom_template_id)}`
                  : ""
              }`;
          return (
            <li key={r.id}>
              <Link
                href={href}
                className="block h-full rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 p-3 sm:p-4 transition hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50"
              >
                <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  <span aria-hidden>🟢</span>
                  <span>매수</span>
                  <span className="ml-auto text-[10px] font-normal text-neutral-500">
                    오늘
                  </span>
                </div>
                <div className="mt-1.5 font-semibold leading-tight">
                  {shortMarketLabel(r.market)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  {strategyShort(r.strategy, r.custom_template_id)} · {r.days >= 330 ? "1년" : `${r.days}일`}
                </div>
                <div className="mt-2 text-xs">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {r.return_pct >= 0 ? "+" : ""}
                    {r.return_pct.toFixed(1)}%
                  </span>
                  <span className="ml-1.5 text-[10px] text-neutral-500">
                    vs 보유{" "}
                    <span
                      className={
                        r.benchmark_return_pct < 0
                          ? "text-red-600 dark:text-red-400 font-semibold"
                          : ""
                      }
                    >
                      {r.benchmark_return_pct >= 0 ? "+" : ""}
                      {r.benchmark_return_pct.toFixed(1)}%
                    </span>
                  </span>
                </div>
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
