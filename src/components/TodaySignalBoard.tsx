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
            return { market: p.market, strategy: p.strategy, params };
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

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">오늘의 신호</h2>
          <p className="mt-1 text-sm text-neutral-500">
            인기 종목에 검증된 전략을 적용한 오늘 결과예요.
          </p>
        </div>
        <span className="shrink-0 text-[11px] text-neutral-400">
          매매 추천 아님 · 전략 결과 표시
        </span>
      </div>

      <ul className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-3">
        {presets.map((p) => {
          const row = rows?.[p.market];
          const action: SignalAction = row?.action ?? "hold";
          const s = actionStyle(action);
          const recent =
            row?.lastSignalAction && row.lastSignalBarsAgo !== null
              ? row.lastSignalBarsAgo === 0
                ? "오늘"
                : `${row.lastSignalBarsAgo}일 전`
              : null;
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
                  {strategyShort(p.strategy)}
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
