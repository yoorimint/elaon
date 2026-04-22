"use client";

// 비로그인 포함 첫 방문자에게 "지금 뭘 살지 / 언제 살지" 답을 주는 큐레이션 보드.
// 인기 종목 × 대표 전략 6개를 고정해놓고 /api/signals 로 오늘 신호 한꺼번에 조회.
// buy_hold 는 신호 개념이 없어서 빠짐. 카드 클릭 → /backtest?preset=... 로 검증 흐름 연결.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BEGINNER_PRESETS,
  presetStrategyParams,
  type BeginnerPreset,
} from "@/lib/beginner-presets";

// 보드에 노출할 6개. 코인 3 + 주식 1 + 선물 2.
// (buy_hold 프리셋은 신호 없어서 제외)
const BOARD_PRESET_IDS = [
  "btc-rsi-2y",
  "eth-ma-1y",
  "sol-bb-1y",
  "samsung-ma-1y",
  "btcfut-ma-1y",
  "solfut-rsi-1y",
];

type SignalAction = "buy" | "sell" | "hold";
type SignalRow = {
  market: string;
  action: SignalAction;
  lastSignalAction: "buy" | "sell" | null;
  lastSignalBarsAgo: number | null;
  returnPct?: number;
  benchmarkReturnPct?: number;
  daysUsed?: number;
  error?: string;
};

function shortMarketLabel(marketId: string): string {
  if (marketId.startsWith("KRW-")) return marketId.slice(4);
  if (marketId.startsWith("okx_fut:")) {
    return marketId.slice("okx_fut:".length).replace("-USDT-SWAP", "") + " 선물";
  }
  if (marketId.startsWith("yahoo:")) {
    const t = marketId.slice("yahoo:".length);
    if (t === "005930.KS") return "삼성전자";
    return t.replace(/\.KS$|\.KQ$/, "");
  }
  return marketId;
}

function strategyShort(s: string): string {
  switch (s) {
    case "ma_cross":
      return "이평 20/60";
    case "rsi":
      return "RSI 30/70";
    case "bollinger":
      return "볼린저밴드";
    case "macd":
      return "MACD";
    default:
      return s;
  }
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
    label: "관망",
    ring: "border-neutral-200 dark:border-neutral-800",
    text: "text-neutral-600 dark:text-neutral-400",
  };
}

export function TodaySignalBoard() {
  const presets = useMemo<BeginnerPreset[]>(
    () =>
      BOARD_PRESET_IDS.map((id) => BEGINNER_PRESETS.find((p) => p.id === id))
        .filter((p): p is BeginnerPreset => !!p),
    [],
  );

  const [rows, setRows] = useState<Record<string, SignalRow> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = presets
          .map((p) => {
            const params = presetStrategyParams(p.id);
            if (!params) return null;
            return {
              market: p.market,
              strategy: p.strategy,
              params,
              backtestDays: p.days,
            };
          })
          .filter(Boolean);
        const res = await fetch("/api/signals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) throw new Error("api fail");
        const data = (await res.json()) as { items: SignalRow[] };
        if (cancelled) return;
        const map: Record<string, SignalRow> = {};
        for (const it of data.items ?? []) map[it.market] = it;
        setRows(map);
      } catch {
        if (cancelled) return;
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [presets]);

  // API 통째로 죽었으면 섹션 자체를 숨김 (빈 박스 노출 방지)
  if (failed) return null;

  // 결과 도착 전엔 모든 카드를 로딩으로 보여주고, 도착 후엔
  //   (1) 절대 수익률 10% 이상 &
  //   (2) 그냥 보유보다 잘한
  // 전략만 노출. "좀 벌었으면서 보유도 이긴" 것만 의미있음.
  const MIN_RETURN_PCT = 10;
  const profitable = rows
    ? presets.filter((p) => {
        const r = rows[p.market];
        if (typeof r?.returnPct !== "number") return false;
        if (typeof r.benchmarkReturnPct !== "number") return false;
        if (r.returnPct < MIN_RETURN_PCT) return false;
        return r.returnPct > r.benchmarkReturnPct;
      })
    : presets;

  // 결과 도착했는데 하나도 보유를 못 이겼으면 섹션 통째로 숨김.
  if (rows && profitable.length === 0) return null;

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
        {profitable.map((p) => {
          const row = rows?.[p.market];
          const action: SignalAction = row?.action ?? "hold";
          const s = actionStyle(action);
          const recent =
            row?.lastSignalAction && row.lastSignalBarsAgo !== null
              ? row.lastSignalBarsAgo === 0
                ? "오늘"
                : `${row.lastSignalBarsAgo}일 전`
              : null;
          const ret = row?.returnPct;
          const bench = row?.benchmarkReturnPct;
          const beat =
            typeof ret === "number" && typeof bench === "number" && ret > bench;
          return (
            <li key={p.id}>
              <Link
                href={`/backtest?preset=${p.id}`}
                className={`block h-full rounded-xl border p-3 sm:p-4 transition hover:bg-brand/5 ${s.ring}`}
              >
                <div className={`flex items-center gap-1.5 text-sm font-bold ${s.text}`}>
                  <span aria-hidden>{s.dot}</span>
                  <span>{rows ? s.label : "···"}</span>
                  {recent && action !== "hold" && (
                    <span className="ml-auto text-[10px] font-normal text-neutral-500">
                      {recent}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 font-semibold leading-tight">
                  {shortMarketLabel(p.market)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  {strategyShort(p.strategy)} · {p.days >= 730 ? "2년" : "1년"}
                </div>
                {typeof ret === "number" && (
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
                    {typeof bench === "number" && (
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
                    )}
                    {beat && (
                      <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓
                      </span>
                    )}
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
