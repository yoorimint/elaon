// 홈의 "오늘의 신호" 섹션 — board_top_signals 에서 상위 6개 (buy 우선, 보유 이김)
// 노출. /signals 페이지와 동일한 데이터 소스라 내용 일치 보장.
// 별도 클라이언트 fetch / 캐시 없음 — 서버 컴포넌트로 직접 SELECT.

import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { STOCK_MARKETS } from "@/lib/market";
import { SCAN_CUSTOM_TEMPLATES } from "@/lib/scan-custom-templates";

const DISPLAY_N = 6;

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
  share_slug: string | null;
  custom_template_id: string | null;
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
    case "bollinger": return "볼린저밴드";
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

function actionStyle(action: Row["action"]) {
  if (action === "buy") {
    return {
      dot: "🟢",
      label: "매수",
      ring: "border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30",
      text: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (action === "sell") {
    return {
      dot: "🔴",
      label: "매도",
      ring: "border-red-300 dark:border-red-700 bg-red-50/60 dark:bg-red-950/30",
      text: "text-red-700 dark:text-red-300",
    };
  }
  return {
    dot: "⚪",
    label: "대기",
    ring: "border-neutral-200 dark:border-neutral-800",
    text: "text-neutral-600 dark:text-neutral-400",
  };
}

async function loadBoardTop(): Promise<Row[]> {
  const sb = createServerClient();
  // 매수는 위 "🔥 오늘 살 만한 거" 섹션이 담당 → 여기는 매도/대기만 노출 (중복 제거).
  // 더 많이 받아 market 단위 dedup 후 상위 N개. 정렬은 수익률 desc.
  const { data } = await sb
    .from("board_top_signals")
    .select("id,market,strategy,days,return_pct,benchmark_return_pct,action,last_signal_action,last_signal_bars_ago,share_slug,custom_template_id")
    .neq("action", "buy")
    .order("return_pct", { ascending: false })
    .limit(40);
  const all = (data ?? []) as Row[];
  const seen = new Set<string>();
  const unique: Row[] = [];
  for (const r of all) {
    if (seen.has(r.market)) continue;
    seen.add(r.market);
    unique.push(r);
  }
  return unique.slice(0, DISPLAY_N);
}

export async function BoardSignalsTop() {
  const rows = await loadBoardTop();
  if (rows.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">검증된 전략 더 보기</h2>
          <p
            className="mt-1 text-sm text-neutral-500"
            style={{ wordBreak: "keep-all" }}
          >
            보유 대비 잘했던 전략 중 오늘 매도·대기 상태인 것들. 진입 타이밍 기다리는 종목 참고용.
          </p>
        </div>
        <Link
          href="/signals"
          className="shrink-0 text-sm text-brand hover:underline whitespace-nowrap"
        >
          전체 보기 →
        </Link>
      </div>
      <p className="mt-0.5 text-[11px] text-neutral-400">
        과거 수익률은 미래를 보장하지 않음
      </p>

      <ul className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const s = actionStyle(r.action);
          const recent =
            r.last_signal_action && r.last_signal_bars_ago !== null
              ? r.last_signal_bars_ago === 0
                ? "오늘"
                : `${r.last_signal_bars_ago}일 전`
              : null;
          const recentHint =
            recent && r.last_signal_action && r.action !== r.last_signal_action
              ? `${recent} ${r.last_signal_action === "buy" ? "매수" : "매도"}`
              : recent;
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
                className={`block h-full rounded-xl border p-3 sm:p-4 transition hover:bg-brand/5 ${s.ring}`}
              >
                <div className={`flex items-center gap-1.5 text-sm font-bold ${s.text}`}>
                  <span aria-hidden>{s.dot}</span>
                  <span>{s.label}</span>
                  {recentHint && (
                    <span className="ml-auto text-[10px] font-normal text-neutral-500">
                      {recentHint}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 font-semibold leading-tight">
                  {shortMarketLabel(r.market)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  {strategyShort(r.strategy, r.custom_template_id)} ·{" "}
                  {r.days >= 720 ? "2년" : r.days >= 330 ? "1년" : `${r.days}일`}
                </div>
                <div className="mt-2 text-xs">
                  <span
                    className={`font-bold ${
                      r.return_pct >= 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    }`}
                  >
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
