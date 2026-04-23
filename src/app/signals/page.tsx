import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { STOCK_MARKETS } from "@/lib/market";
import { SCAN_CUSTOM_TEMPLATES } from "@/lib/scan-custom-templates";

export const metadata: Metadata = {
  title: "오늘의 신호 — eloan",
  description:
    "인기 종목 × 검증된 전략의 오늘 매수/매도 신호. 매일 장 마감 후 자동 갱신.",
  alternates: { canonical: "https://www.eloan.kr/signals" },
};

// 크론이 하루 3번 채우는 board_top_signals 만 SELECT → 서버 사이드 렌더.
// 클라 필터 인터랙션은 없음. kind 별 섹션으로 나눠 한 화면에 보여줌.
export const revalidate = 300; // 5분 ISR — 크론 반영 시차 커버

type BoardRow = {
  id: number;
  market_kind: "crypto" | "crypto_fut" | "stock_kr" | "stock_us";
  market: string;
  strategy: string;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
  trade_count: number;
  action: "buy" | "sell" | "hold";
  last_signal_action: "buy" | "sell" | null;
  last_signal_bars_ago: number | null;
  share_slug: string | null;
  custom_template_id: string | null;
  rank: number;
  computed_at: string;
};

const KIND_TITLE: Record<BoardRow["market_kind"], string> = {
  crypto: "코인",
  crypto_fut: "코인 선물",
  stock_kr: "국내 주식",
  stock_us: "미국 주식",
};

const KIND_ORDER: BoardRow["market_kind"][] = [
  "crypto",
  "crypto_fut",
  "stock_kr",
  "stock_us",
];

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

function daysLabel(days: number): string {
  if (days >= 720) return "2년";
  if (days >= 330) return "1년";
  return `${days}일`;
}

function actionStyle(action: BoardRow["action"]) {
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

async function loadBoard() {
  const sb = createServerClient();
  const { data } = await sb
    .from("board_top_signals")
    .select("*")
    .order("market_kind")
    .order("rank");
  return (data ?? []) as BoardRow[];
}

export default async function SignalsPage() {
  const rows = await loadBoard();
  const byKind = new Map<BoardRow["market_kind"], BoardRow[]>();
  for (const r of rows) {
    const bucket = byKind.get(r.market_kind);
    if (bucket) bucket.push(r);
    else byKind.set(r.market_kind, [r]);
  }

  // 상단 요약: "오늘 매수 신호" 전체 카운트 + 최근 갱신 시각
  const buyCount = rows.filter((r) => r.action === "buy").length;
  const latest = rows.reduce<string | null>(
    (acc, r) => (!acc || r.computed_at > acc ? r.computed_at : acc),
    null,
  );
  const latestLabel = latest ? timeAgo(latest) : null;
  // GitHub Actions 크론이 종종 지연/스킵되는 이슈가 있어 26h 넘으면
  // 유저가 "이 신호 오늘 거 맞나?" 고 헷갈리지 않도록 경고 표시.
  const STALE_THRESHOLD_HOURS = 26;
  const isStale = latest
    ? (Date.now() - new Date(latest).getTime()) / 3_600_000 >
      STALE_THRESHOLD_HOURS
    : false;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold">오늘의 신호</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        인기 종목 × 검증된 전략의 오늘 매수/매도 신호. 매일 장 마감 후 자동 갱신.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
        {buyCount > 0 && (
          <span>
            오늘 매수 신호{" "}
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {buyCount}개
            </span>
          </span>
        )}
        {latestLabel &&
          (isStale ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300 font-medium">
              ⚠️ 갱신 {latestLabel} · 최신 아닐 수 있어요
            </span>
          ) : (
            <span>· 갱신 {latestLabel}</span>
          ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
          <h2 className="text-lg font-semibold">아직 결과 없음</h2>
          <p className="mt-2 text-sm text-neutral-500">
            크론이 처음 돌면 여기에 차곡차곡 채워져요.
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              홈으로
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {KIND_ORDER.map((kind) => {
            const list = byKind.get(kind);
            if (!list || list.length === 0) return null;
            return (
              <section key={kind}>
                <h2 className="text-lg font-bold">{KIND_TITLE[kind]}</h2>
                <ul className="mt-3 grid gap-3 grid-cols-2 lg:grid-cols-3">
                  {list.map((r) => {
                    const s = actionStyle(r.action);
                    const recent =
                      r.last_signal_action && r.last_signal_bars_ago !== null
                        ? r.last_signal_bars_ago === 0
                          ? "오늘"
                          : `${r.last_signal_bars_ago}일 전`
                        : null;
                    const recentHint =
                      recent && r.action !== r.last_signal_action && r.last_signal_action
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
                            {strategyShort(r.strategy, r.custom_template_id)} · {daysLabel(r.days)}
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
          })}
        </div>
      )}
    </main>
  );
}

// timeAgo 유사 — 간단한 한국어 상대 시간
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "방금 전";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  return `${days}일 전`;
}
