"use client";

// 비로그인 포함 첫 방문자에게 "지금 뭘 살지 / 언제 살지" 답을 주는 보드.
// 소스: 홈 서버 컴포넌트가 전달하는 shared_backtests 후보 (봇 + 유저가
// 이미 공유한 백테스트 중 수익률·보유 초과 기준 통과한 것).
// 보드는 각 후보에 대해 /api/signals 로 "오늘 신호" 만 덧붙여 렌더.
// 카드 클릭 → /r/[slug] 공유 결과 페이지로 이동 (기존 라우트 재활용).

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BoardCandidate } from "@/app/page";

// 보드에 노출할 상한. 조건 통과한 것들 중 수익률 상위 N개만 노출.
const DISPLAY_TOP_N = 6;

// localStorage 캐시는 "다음 시장 닫힘 시각"까지 유지 (일봉 기준이라 그전엔
// 결과 안 바뀜). 스키마 바뀌면 CACHE_KEY 버전만 올리면 자연 무효화.
const CACHE_KEY = "today-signals-v4";

// 보드가 스캔하는 시장 kind 별 일봉 닫힘 시각 (UTC 시).
// crypto/crypto_fut 00:00, stock_kr 07:00, stock_us 22:00. 외부 반영 여유 +30초.
const DAILY_CLOSES_UTC_HOURS = [0, 7, 22];
const SOURCE_LAG_MS = 30 * 1000;

function nextBoardRefreshMs(now: number = Date.now()): number {
  const d = new Date(now);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  let best = Infinity;
  for (const h of DAILY_CLOSES_UTC_HOURS) {
    let t = Date.UTC(y, m, day, h, 0, 0) + SOURCE_LAG_MS;
    if (t <= now) t += 24 * 60 * 60 * 1000;
    if (t < best) best = t;
  }
  return best;
}

type SignalAction = "buy" | "sell" | "hold";
type SignalRow = {
  action: SignalAction;
  lastSignalAction: "buy" | "sell" | null;
  lastSignalBarsAgo: number | null;
  error?: string;
};

// 캐시는 슬러그별로 저장 — candidates 가 매일 바뀔 수 있어서
// 사라진 항목이 localStorage 에 남아도 렌더 시 자동으로 무시됨.
type CachedPayload = { expiresAt: number; rows: Record<string, SignalRow> };

function readCache(): Record<string, SignalRow> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as CachedPayload;
    if (Date.now() >= payload.expiresAt) return null;
    return payload.rows;
  } catch {
    return null;
  }
}

function writeCache(rows: Record<string, SignalRow>) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedPayload = {
      expiresAt: nextBoardRefreshMs(),
      rows,
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // quota/parse 실패는 무시
  }
}

function shortMarketLabel(marketId: string): string {
  if (marketId.startsWith("KRW-")) return marketId.slice(4);
  if (marketId.startsWith("okx_fut:")) {
    return marketId.slice("okx_fut:".length).replace("-USDT-SWAP", "") + " 선물";
  }
  if (marketId.startsWith("yahoo:")) {
    const t = marketId.slice("yahoo:".length);
    if (t === "005930.KS") return "삼성전자";
    if (t === "000660.KS") return "SK하이닉스";
    return t.replace(/\.KS$|\.KQ$/, "");
  }
  return marketId;
}

function strategyShort(s: string): string {
  switch (s) {
    case "ma_cross":
      return "이평 크로스";
    case "rsi":
      return "RSI";
    case "bollinger":
      return "볼린저밴드";
    case "macd":
      return "MACD";
    case "breakout":
      return "브레이크아웃";
    case "stoch":
      return "스토캐스틱";
    case "ichimoku":
      return "일목균형";
    case "dca":
      return "DCA";
    case "ma_dca":
      return "MA DCA";
    case "grid":
      return "그리드";
    case "rebalance":
      return "리밸런싱";
    case "buy_hold":
      return "바이앤홀드";
    case "custom":
      return "커스텀(DIY)";
    default:
      return s;
  }
}

function daysLabel(days: number): string {
  if (days >= 720) return "2년";
  if (days >= 330) return "1년";
  if (days >= 150) return "6달";
  if (days >= 80) return "3달";
  if (days >= 20) return "1달";
  return `${days}일`;
}

function actionStyle(action: SignalAction) {
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

export function TodaySignalBoard({ candidates }: { candidates: BoardCandidate[] }) {
  // 초기값은 null (SSR 일치). 클라이언트에서 useEffect 로 캐시 → 필요 시 fetch.
  const [rows, setRows] = useState<Record<string, SignalRow> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (candidates.length === 0) {
      setRows({});
      return;
    }

    // 캐시가 유효하면 (다음 시장 닫힘 전이면) 네트워크 없이 그대로 사용
    const cached = readCache();
    if (cached) {
      setRows(cached);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // /api/signals 는 한 번에 20개까지. 후보가 많으면 상위만 자른다.
        // (페이지 서버 쿼리에서 이미 최대 20 으로 잘라 오고 있음)
        const pairs = candidates.slice(0, 20).map((c) => ({
          slug: c.slug,
          item: {
            market: c.market,
            strategy: c.strategy,
            params: c.params,
            customBuy: (c.custom_buy ?? undefined) as unknown,
            customSell: (c.custom_sell ?? undefined) as unknown,
          },
        }));
        const res = await fetch("/api/signals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: pairs.map((p) => p.item) }),
        });
        if (!res.ok) throw new Error("api fail");
        const data = (await res.json()) as {
          items: {
            action: SignalAction;
            lastSignalAction: "buy" | "sell" | null;
            lastSignalBarsAgo: number | null;
            error?: string;
          }[];
        };
        if (cancelled) return;
        const map: Record<string, SignalRow> = {};
        (data.items ?? []).forEach((it, i) => {
          const slug = pairs[i]?.slug;
          if (!slug) return;
          map[slug] = {
            action: it.action,
            lastSignalAction: it.lastSignalAction,
            lastSignalBarsAgo: it.lastSignalBarsAgo,
            error: it.error,
          };
        });
        setRows(map);
        writeCache(map);
      } catch {
        if (cancelled) return;
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidates]);

  // 후보 자체가 없으면 (DB 에 조건 통과 결과가 아직 없음) 섹션 숨김.
  if (candidates.length === 0) return null;
  // API 통째로 죽었으면 섹션 숨김 (빈 박스 노출 방지)
  if (failed) return null;

  // 로딩 중엔 헤더만 노출. 스캔은 서버에서 /api/signals 가 캔들 캐시 써서
  // 수 초 내 끝남.
  if (!rows) {
    return (
      <section className="mb-12">
        <h2 className="text-lg sm:text-xl font-bold">오늘의 신호</h2>
        <p className="mt-1 text-sm text-neutral-500">오늘 신호 불러오는 중…</p>
      </section>
    );
  }

  const display = candidates.slice(0, DISPLAY_TOP_N);

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">오늘의 신호</h2>
          <p className="mt-1 text-sm text-neutral-500">
            그냥 보유보다 잘했던 전략의 오늘 신호만 모았어요.
          </p>
        </div>
        <span className="shrink-0 text-[11px] text-neutral-400 text-right">
          과거 수익률은 미래를 보장하지 않음
        </span>
      </div>

      <ul className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-3">
        {display.map((c) => {
          const row = rows[c.slug];
          const action: SignalAction = row?.action ?? "hold";
          const s = actionStyle(action);
          // 최근 3봉 안에 buy/sell 있었으면 단서 노출.
          // buy/sell 이 오늘이면 "오늘", 아니면 "N일 전".
          // 오늘 대기(hold) 상태인데 최근 신호가 있으면 "3일 전 매수" 처럼
          // 무슨 신호였는지까지 보여서 "이미 산 상태" 인지 "오늘 빠짐" 인지 구분.
          const recentHint = (() => {
            if (!row || row.lastSignalBarsAgo === null || !row.lastSignalAction) {
              return null;
            }
            const when =
              row.lastSignalBarsAgo === 0
                ? "오늘"
                : `${row.lastSignalBarsAgo}일 전`;
            if (action === row.lastSignalAction) return when;
            const what = row.lastSignalAction === "buy" ? "매수" : "매도";
            return `${when} ${what}`;
          })();
          const ret = c.return_pct;
          const bench = c.benchmark_return_pct;
          return (
            <li key={c.slug}>
              <Link
                href={`/r/${c.slug}`}
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
                  {shortMarketLabel(c.market)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  {strategyShort(c.strategy)} · {daysLabel(c.days)}
                </div>
                <div className="mt-2 text-xs">
                  <span
                    className={`font-bold ${
                      ret >= 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    }`}
                  >
                    {ret >= 0 ? "+" : ""}
                    {ret.toFixed(1)}%
                  </span>
                  <span className="ml-1.5 text-[10px] text-neutral-500">
                    vs 보유{" "}
                    <span
                      className={
                        bench < 0
                          ? "text-red-600 dark:text-red-400 font-semibold"
                          : ""
                      }
                    >
                      {bench >= 0 ? "+" : ""}
                      {bench.toFixed(1)}%
                    </span>
                  </span>
                  <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓
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
