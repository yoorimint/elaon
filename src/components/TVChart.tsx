"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createSeriesMarkers,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type SeriesMarker,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/upbit";
import {
  type Signal,
  type StrategyId,
  type StrategyParams,
  sma,
  ema,
  stddev,
  rsi as rsiCalc,
  stochK as stochKCalc,
} from "@/lib/strategies";

export type TVChartProps = {
  candles: Candle[];
  signals: Signal[];
  strategy: StrategyId;
  params: StrategyParams;
};

function toTime(ms: number): UTCTimestamp {
  return Math.floor(ms / 1000) as UTCTimestamp;
}

function toLineData(
  candles: Candle[],
  values: (number | null)[],
): LineData<UTCTimestamp>[] {
  const out: LineData<UTCTimestamp>[] = [];
  for (let i = 0; i < candles.length; i++) {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) continue;
    out.push({ time: toTime(candles[i].timestamp), value: v });
  }
  return out;
}

function rangeHigh(candles: Candle[], i: number, n: number): number {
  let m = -Infinity;
  for (let k = Math.max(0, i - n + 1); k <= i; k++) m = Math.max(m, candles[k].high);
  return m;
}

function rangeLow(candles: Candle[], i: number, n: number): number {
  let m = Infinity;
  for (let k = Math.max(0, i - n + 1); k <= i; k++) m = Math.min(m, candles[k].low);
  return m;
}

function isDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function baseChartOptions(dark: boolean, width: number, height: number) {
  return {
    width,
    height,
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
    const mainRect = mainBox.getBoundingClientRect();
    const mainW = Math.max(1, Math.floor(mainRect.width));
    const mainH = Math.max(1, Math.floor(mainRect.height));
    const chart = createChart(mainBox, baseChartOptions(dark, mainW, mainH));
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

    // === Indicator overlays on the main chart ===
    const closes = candles.map((c) => c.close);

    if (strategy === "ma_cross") {
      const p = params.ma_cross ?? { short: 20, long: 60 };
      const shortLine = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        title: `MA${p.short}`,
      });
      shortLine.setData(toLineData(candles, sma(closes, p.short)));
      const longLine = chart.addSeries(LineSeries, {
        color: "#ef4444",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        title: `MA${p.long}`,
      });
      longLine.setData(toLineData(candles, sma(closes, p.long)));
    }

    if (strategy === "ma_dca") {
      const p = params.ma_dca ?? { intervalDays: 7, amountKRW: 100000, maPeriod: 60 };
      const maLine = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        title: `MA${p.maPeriod}`,
      });
      maLine.setData(toLineData(candles, sma(closes, p.maPeriod)));
    }

    if (strategy === "bollinger") {
      const p = params.bollinger ?? { period: 20, stddev: 2 };
      const mid = sma(closes, p.period);
      const sd = stddev(closes, p.period);
      const upper = mid.map((m, i) =>
        m != null && sd[i] != null ? m + p.stddev * (sd[i] as number) : null,
      );
      const lower = mid.map((m, i) =>
        m != null && sd[i] != null ? m - p.stddev * (sd[i] as number) : null,
      );
      const upperLine = chart.addSeries(LineSeries, {
        color: "#60a5fa",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "BB 상단",
      });
      upperLine.setData(toLineData(candles, upper));
      const midLine = chart.addSeries(LineSeries, {
        color: "#60a5fa",
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "BB 중심",
      });
      midLine.setData(toLineData(candles, mid));
      const lowerLine = chart.addSeries(LineSeries, {
        color: "#60a5fa",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "BB 하단",
      });
      lowerLine.setData(toLineData(candles, lower));
    }

    if (strategy === "ichimoku") {
      const p = params.ichimoku ?? { conversion: 9, base: 26, lagging: 52 };
      const conv: (number | null)[] = [];
      const baseArr: (number | null)[] = [];
      const spanA: (number | null)[] = [];
      const spanB: (number | null)[] = [];
      for (let i = 0; i < candles.length; i++) {
        if (i < p.lagging + p.base) {
          conv.push(null);
          baseArr.push(null);
          spanA.push(null);
          spanB.push(null);
          continue;
        }
        const c =
          (rangeHigh(candles, i, p.conversion) + rangeLow(candles, i, p.conversion)) /
          2;
        const b = (rangeHigh(candles, i, p.base) + rangeLow(candles, i, p.base)) / 2;
        const a = (c + b) / 2;
        const spanBIdx = i - p.base;
        const bb =
          (rangeHigh(candles, spanBIdx, p.lagging) +
            rangeLow(candles, spanBIdx, p.lagging)) /
          2;
        conv.push(c);
        baseArr.push(b);
        spanA.push(a);
        spanB.push(bb);
      }
      const convLine = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "전환선",
      });
      convLine.setData(toLineData(candles, conv));
      const baseLine = chart.addSeries(LineSeries, {
        color: "#ef4444",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "기준선",
      });
      baseLine.setData(toLineData(candles, baseArr));
      const spanALine = chart.addSeries(AreaSeries, {
        topColor: "rgba(134, 239, 172, 0.3)",
        bottomColor: "rgba(134, 239, 172, 0.05)",
        lineColor: "#86efac",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "선행 A",
      });
      spanALine.setData(toLineData(candles, spanA));
      const spanBLine = chart.addSeries(AreaSeries, {
        topColor: "rgba(252, 165, 165, 0.2)",
        bottomColor: "rgba(252, 165, 165, 0.05)",
        lineColor: "#fca5a5",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "선행 B",
      });
      spanBLine.setData(toLineData(candles, spanB));
    }

    let subChart: IChartApi | null = null;
    const subBox = subBoxRef.current;
    if (hasSubPanel && subBox) {
      const subRect = subBox.getBoundingClientRect();
      const subW = Math.max(1, Math.floor(subRect.width));
      const subH = Math.max(1, Math.floor(subRect.height));
      subChart = createChart(subBox, baseChartOptions(dark, subW, subH));

      if (strategy === "rsi") {
        const p = params.rsi ?? { period: 14, oversold: 30, overbought: 70 };
        const rsiLine = subChart.addSeries(LineSeries, {
          color: "#8b5cf6",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "RSI",
        });
        rsiLine.setData(toLineData(candles, rsiCalc(closes, p.period)));
        rsiLine.createPriceLine({
          price: p.overbought,
          color: "#ef4444",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "과매수",
        });
        rsiLine.createPriceLine({
          price: p.oversold,
          color: "#10b981",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "과매도",
        });
      }

      if (strategy === "macd") {
        const p = params.macd ?? { fast: 12, slow: 26, signal: 9 };
        const fastE = ema(closes, p.fast);
        const slowE = ema(closes, p.slow);
        const macdLine = closes.map((_, i) => {
          const f = fastE[i];
          const s = slowE[i];
          return f != null && s != null ? f - s : null;
        });
        const validForSignal = macdLine.map((v) => (v == null ? 0 : v));
        const signalLine = ema(validForSignal, p.signal);
        const hist = macdLine.map((v, i) =>
          v != null && signalLine[i] != null ? v - (signalLine[i] as number) : null,
        );

        const histSeries = subChart.addSeries(HistogramSeries, {
          priceLineVisible: false,
          lastValueVisible: false,
          title: "히스토그램",
        });
        const histData: HistogramData<UTCTimestamp>[] = [];
        for (let i = 0; i < candles.length; i++) {
          const v = hist[i];
          if (v == null) continue;
          histData.push({
            time: toTime(candles[i].timestamp),
            value: v,
            color: v >= 0 ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)",
          });
        }
        histSeries.setData(histData);

        const macdSeries = subChart.addSeries(LineSeries, {
          color: "#3b82f6",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "MACD",
        });
        macdSeries.setData(toLineData(candles, macdLine));

        const signalSeries = subChart.addSeries(LineSeries, {
          color: "#ef4444",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "Signal",
        });
        signalSeries.setData(toLineData(candles, signalLine));

        macdSeries.createPriceLine({
          price: 0,
          color: "#a3a3a3",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: false,
          title: "",
        });
      }

      if (strategy === "stoch") {
        const p = params.stoch ?? {
          period: 14,
          smooth: 3,
          oversold: 20,
          overbought: 80,
        };
        const k = stochKCalc(candles, p.period);
        const kValid = k.map((v) => (v == null ? 50 : v));
        const d = sma(kValid, p.smooth);

        const kSeries = subChart.addSeries(LineSeries, {
          color: "#8b5cf6",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "%K",
        });
        kSeries.setData(toLineData(candles, k));
        const dSeries = subChart.addSeries(LineSeries, {
          color: "#f59e0b",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "%D",
        });
        dSeries.setData(toLineData(candles, d));

        kSeries.createPriceLine({
          price: p.overbought,
          color: "#ef4444",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "과매수",
        });
        kSeries.createPriceLine({
          price: p.oversold,
          color: "#10b981",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "과매도",
        });
      }

      subChart.timeScale().fitContent();
    }

    // Sync time scales between main and sub (unsubscription happens on chart.remove()).
    chart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (r && subChart) subChart.timeScale().setVisibleLogicalRange(r);
    });
    subChart?.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (r) chart.timeScale().setVisibleLogicalRange(r);
    });

    const mainObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });
    mainObserver.observe(mainBox);

    let subObserver: ResizeObserver | null = null;
    if (subChart && subBox) {
      const localSub = subChart;
      subObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            localSub.applyOptions({
              width: Math.floor(width),
              height: Math.floor(height),
            });
          }
        }
      });
      subObserver.observe(subBox);
    }

    return () => {
      mainObserver.disconnect();
      subObserver?.disconnect();
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
