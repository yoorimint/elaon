"use client";

import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, Time, UTCTimestamp } from "lightweight-charts";
import type { Candle } from "@/lib/upbit";
import type { Signal, StrategyId, StrategyParams } from "@/lib/strategies";

export type TVChartProps = {
  candles: Candle[];
  signals: Signal[];
  strategy: StrategyId;
  params: StrategyParams;
};

type ChartRefs = {
  main: IChartApi | null;
  sub: IChartApi | null;
  priceSeries: ISeriesApi<"Line" | "Candlestick"> | null;
};

function toTime(ms: number): UTCTimestamp {
  return Math.floor(ms / 1000) as UTCTimestamp;
}

function subtitleFor(strategy: StrategyId): string {
  switch (strategy) {
    case "bollinger":
      return "볼린저 상/하단 + 중심선을 가격 위에 겹쳐 표시";
    case "ma_cross":
      return "단기·장기 이평선 교차 지점을 확인";
    case "ma_dca":
      return "기준 이평선 아래에서만 적립 매수";
    case "ichimoku":
      return "전환선·기준선·구름대를 함께 표시";
    case "rsi":
      return "아래 RSI 패널의 과매도/과매수 기준선 참고";
    case "macd":
      return "아래 MACD 히스토그램 + 시그널 교차 참고";
    case "stoch":
      return "아래 %K/%D 교차와 과매도·과매수 구간 참고";
    default:
      return "";
  }
}

const OSCILLATOR_STRATEGIES: readonly StrategyId[] = ["rsi", "macd", "stoch"];

export function TVChart({ candles, signals, strategy, params }: TVChartProps) {
  const mainBoxRef = useRef<HTMLDivElement | null>(null);
  const subBoxRef = useRef<HTMLDivElement | null>(null);
  const refs = useRef<ChartRefs>({ main: null, sub: null, priceSeries: null });
  const hasSubPanel = OSCILLATOR_STRATEGIES.includes(strategy);

  useEffect(() => {
    // Chart lifecycle setup populated in subsequent passes.
    void candles;
    void signals;
    void params;
    void refs;
  }, [candles, signals, strategy, params, hasSubPanel]);

  const subtitle = subtitleFor(strategy);

  return (
    <div>
      {subtitle && (
        <div className="mb-2 text-xs text-neutral-500">{subtitle}</div>
      )}
      <div
        ref={mainBoxRef}
        className="h-80 sm:h-96 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
      />
      {hasSubPanel && (
        <div
          ref={subBoxRef}
          className="mt-3 h-40 sm:h-48 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        />
      )}
    </div>
  );
}

void toTime;
