// 홈 최상단 "오늘의 매수·매도 신호" 하이라이트.
// board_top_signals 에서 action in ('buy','sell') 인 것을 합쳐 상위 N개 노출.
// 같은 market 중복 제거 (sell 우선). 크론이 비어있으면 null → 섹션 사라짐.

import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { STOCK_MARKETS } from "@/lib/market";
import { SCAN_CUSTOM_TEMPLATES } from "@/lib/scan-custom-templates";
import { timeAgo } from "@/lib/community";

const DISPLAY_N = 6;
const STALE_THRESHOLD_HOURS = 26;

type Row = {
  id: number;
  market: string;
  strategy: string;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
  action: "buy" | "sell";
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

async function loadSignals(): Promise<Row[]> {
  const sb = createServerClient();
  // buy 와 sell 을 각각 수익률순으로 상위 40개씩 받아 합침. market 중복은
  // buy/sell 각 큐 안에서 제거 — 같은 market 에 buy 와 sell 이 동시 있으면
  // 드물지만 수익률 높은 쪽 유지.
  const COLS =
    "id,market,strategy,days,return_pct,benchmark_return_pct,action,share_slug,custom_template_id,computed_at";
  const [buyRes, sellRes] = await Promise.all([
    sb
      .from("board_top_signals")
      .select(COLS)
      .eq("action", "buy")
      .order("return_pct", { ascending: false })
      .limit(40),
    sb
      .from("board_top_signals")
      .select(COLS)
      .eq("action", "sell")
      .order("return_pct", { ascending: false })
      .limit(40),
  ]);
  const buys = (buyRes.data ?? []) as Row[];
  const sells = (sellRes.data ?? []) as Row[];

  // 수익률로 통합 정렬 — 매수/매도 섞여도 수익률 상위부터 노출.
  // 같은 market 중복 제거 (먼저 등장한 쪽 유지).
  const merged = [...buys, ...sells].sort(
    (a, b) => b.return_pct - a.return_pct,
  );
  const seen = new Set<string>();
  const unique: Row[] = [];
  for (const r of merged) {
    if (seen.has(r.market)) continue;
    seen.add(r.market);
    unique.push(r);
  }
  return unique.slice(0, DISPLAY_N);
}

export async function TodayBuyHighlight() {
  const rows = await loadSignals();
  if (rows.length === 0) return null;

  const latestComputedAt = rows.reduce<string>(
    (acc, r) => (r.computed_at > acc ? r.computed_at : acc),
    rows[0].computed_at,
  );
  const ageHours =
    (Date.now() - new Date(latestComputedAt).getTime()) / 3_600_000;
  const isStale = ageHours > STALE_THRESHOLD_HOURS;

  const buyCount = rows.filter((r) => r.action === "buy").length;
  const sellCount = rows.filter((r) => r.action === "sell").length;

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">
            🔥 오늘의 매수·매도 신호 ({rows.length})
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            과거 수익률 높았던 전략들이 오늘{" "}
            {buyCount > 0 && (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                매수 {buyCount}
              </span>
            )}
            {buyCount > 0 && sellCount > 0 && <span> · </span>}
            {sellCount > 0 && (
              <span className="font-semibold text-red-600 dark:text-red-400">
                매도 {sellCount}
              </span>
            )}{" "}
            신호를 냈어요.
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
          const isBuy = r.action === "buy";
          const href = r.share_slug
            ? `/r/${r.share_slug}`
            : `/backtest?market=${encodeURIComponent(r.market)}&strategy=${r.strategy}&days=${r.days}${
                r.custom_template_id
                  ? `&customTemplate=${encodeURIComponent(r.custom_template_id)}`
                  : ""
              }`;
          const cardColor = isBuy
            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50"
            : "border-red-300 dark:border-red-700 bg-red-50/60 dark:bg-red-950/30 hover:bg-red-100/70 dark:hover:bg-red-950/50";
          const pillColor = isBuy
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-red-700 dark:text-red-300";
          const returnColor = isBuy
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-red-700 dark:text-red-400";
          return (
            <li key={r.id}>
              <Link
                href={href}
                className={`block h-full rounded-xl border p-3 sm:p-4 transition ${cardColor}`}
              >
                <div
                  className={`flex items-center gap-1.5 text-sm font-bold ${pillColor}`}
                >
                  <span aria-hidden>{isBuy ? "🟢" : "🔴"}</span>
                  <span>{isBuy ? "매수" : "매도"}</span>
                  <span className="ml-auto text-[10px] font-normal text-neutral-500">
                    오늘
                  </span>
                </div>
                <div className="mt-1.5 font-semibold leading-tight">
                  {shortMarketLabel(r.market)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  {strategyShort(r.strategy, r.custom_template_id)} ·{" "}
                  {r.days >= 330 ? "1년" : `${r.days}일`}
                </div>
                <div className="mt-2 text-xs">
                  <span className={`font-bold ${returnColor}`}>
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
