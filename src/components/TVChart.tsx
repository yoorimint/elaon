"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/upbit";
import type { Signal, StrategyId, StrategyParams } from "@/lib/strategies";

export type TVChartProps = {
  candles: Candle[];
  signals: Signal[];
  strategy: StrategyId;
  params: StrategyParams;
};

function toTime(ms: number): UTCTimestamp {
  return Math.floor(ms / 1000) as UTCTimestamp;
}

function isDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function baseChartOptions(dark: boolean) {
  return {
    layout: {
      background: { type: ColorType.Solid, color: "transparent" },
      textColor: dark ? "#d4d4d4" : "#404040",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: dark ? "#27272a" : "#f4f4f5" },
      horzLines: { color: dark ? "#27272a" : "#f4f4f5" },
    },
    rightPriceScale: {
      borderColor: dark ? "#3f3f46" : "#e5e5e5",
    },
    timeScale: {
      borderColor: dark ? "#3f3f46" : "#e5e5e5",
      timeVisible: false,
      secondsVisible: false,
    },
    crosshair: { mode: CrosshairMode.Normal },
    autoSize: true,
  };
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
  const hasSubPanel = OSCILLATOR_STRATEGIES.includes(strategy);

  useEffect(() => {
    const mainBox = mainBoxRef.current;
    if (!mainBox) return;

    const dark = isDark();
    const chart = createChart(mainBox, baseChartOptions(dark));
    const candleSeries: ISeriesApi<"Candlestick"> = chart.addSeries(
      CandlestickSeries,
      {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderUpColor: "#059669",
        borderDownColor: "#dc2626",
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      },
    );
    candleSeries.setData(
      candles.map((c) => ({
        time: toTime(c.timestamp),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    // Buy/Sell markers from the strategy's signals.
    const markers: SeriesMarker<UTCTimestamp>[] = [];
    for (let i = 0; i < signals.length; i++) {
      const s = signals[i];
      const t = toTime(candles[i].timestamp);
      const isBuy =
        s === "buy" || (typeof s === "object" && s !== null && "buy_krw" in s);
      const isSell =
        s === "sell" ||
        (typeof s === "object" && s !== null && "sell_qty_frac" in s);
      if (isBuy) {
        markers.push({
          time: t,
          position: "belowBar",
          color: "#10b981",
          shape: "arrowUp",
          text: "매수",
        });
      } else if (isSell) {
        markers.push({
          time: t,
          position: "aboveBar",
          color: "#ef4444",
          shape: "arrowDown",
          text: "매도",
        });
      }
    }
    if (markers.length > 0) {
      createSeriesMarkers(candleSeries, markers);
    }

    chart.timeScale().fitContent();

    let subChart: IChartApi | null = null;
    const subBox = subBoxRef.current;
    if (hasSubPanel && subBox) {
      subChart = createChart(subBox, baseChartOptions(dark));
    }

    // Sync time scales between main and sub (unsubscription happens on chart.remove()).
    chart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (r && subChart) subChart.timeScale().setVisibleLogicalRange(r);
    });
    subChart?.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (r) chart.timeScale().setVisibleLogicalRange(r);
    });

    return () => {
      subChart?.remove();
      chart.remove();
    };
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
