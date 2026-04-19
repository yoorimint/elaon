"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createSeriesMarkers,
  type CandlestickData,
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

// lightweight-charts requires strictly ascending unique times.
// Returns indices kept (so callers can align companion arrays).
function dedupTimes(times: UTCTimestamp[]): number[] {
  const keep: number[] = [];
  let prev = -Infinity;
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    if (t > prev) {
      keep.push(i);
      prev = t;
    }
  }
  return keep;
}

function toLineData(
  candles: Candle[],
  values: (number | null)[],
  keepIdx: number[],
): LineData<UTCTimestamp>[] {
  const out: LineData<UTCTimestamp>[] = [];
  for (const i of keepIdx) {
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

function koreanPriceFormatter(v: number): string {
  if (!Number.isFinite(v)) return "-";
  const abs = Math.abs(v);
  if (abs >= 100_000_000) return `${(v / 100_000_000).toFixed(2)}억`;
  if (abs >= 10_000) return `${(v / 10_000).toFixed(1)}만`;
  if (abs >= 100) return v.toFixed(0);
  return v.toFixed(2);
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
    rightPriceScale: { borderColor: dark ? "#3f3f46" : "#e5e5e5" },
    timeScale: {
      borderColor: dark ? "#3f3f46" : "#e5e5e5",
      timeVisible: false,
      secondsVisible: false,
    },
    crosshair: { mode: CrosshairMode.Normal },
    localization: {
      priceFormatter: koreanPriceFormatter,
    },
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

    // Build dedup'd time index up front so every series shares the same time grid.
    const allTimes: UTCTimestamp[] = candles.map((c) => toTime(c.timestamp));
    const keepIdx = dedupTimes(allTimes);

    const dark = isDark();
    const mainRect = mainBox.getBoundingClientRect();
    const mainW = Math.max(1, Math.floor(mainRect.width));
    const mainH = Math.max(1, Math.floor(mainRect.height));
    const chart = createChart(mainBox, baseChartOptions(dark, mainW, mainH));

    const priceSeries: ISeriesApi<"Candlestick"> = chart.addSeries(
      CandlestickSeries,
      {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderUpColor: "#059669",
        borderDownColor: "#dc2626",
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
        priceLineVisible: false,
        lastValueVisible: true,
      },
    );
    const priceData: CandlestickData<UTCTimestamp>[] = [];
    for (const i of keepIdx) {
      const c = candles[i];
      if (
        !Number.isFinite(c.open) ||
        !Number.isFinite(c.high) ||
        !Number.isFinite(c.low) ||
        !Number.isFinite(c.close)
      ) {
        continue;
      }
      priceData.push({
        time: allTimes[i],
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      });
    }
    priceSeries.setData(priceData);

    // Buy/Sell markers from the strategy's signals (only on dedup'd indices).
    const markers: SeriesMarker<UTCTimestamp>[] = [];
    for (const i of keepIdx) {
      const s = signals[i];
      if (s == null) continue;
      const isBuy =
        s === "buy" || (typeof s === "object" && s !== null && "buy_krw" in s);
      const isSell =
        s === "sell" ||
        (typeof s === "object" && s !== null && "sell_qty_frac" in s);
      if (isBuy) {
        markers.push({
          time: allTimes[i],
          position: "belowBar",
          color: "#10b981",
          shape: "arrowUp",
          text: "매수",
        });
      } else if (isSell) {
        markers.push({
          time: allTimes[i],
          position: "aboveBar",
          color: "#ef4444",
          shape: "arrowDown",
          text: "매도",
        });
      }
    }
    if (markers.length > 0) createSeriesMarkers(priceSeries, markers);

    // === Indicator overlays on the main chart ===
    const closes = candles.map((c) => c.close);

    if (strategy === "ma_cross") {
      const p = params.ma_cross ?? { short: 20, long: 60 };
      const shortLine = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "",
      });
      shortLine.setData(toLineData(candles, sma(closes, p.short), keepIdx));
      const longLine = chart.addSeries(LineSeries, {
        color: "#ef4444",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        title: `MA${p.long}`,
      });
      longLine.setData(toLineData(candles, sma(closes, p.long), keepIdx));
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
      maLine.setData(toLineData(candles, sma(closes, p.maPeriod), keepIdx));
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
        title: "",
      });
      upperLine.setData(toLineData(candles, upper, keepIdx));
      const midLine = chart.addSeries(LineSeries, {
        color: "#60a5fa",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "",
      });
      midLine.setData(toLineData(candles, mid, keepIdx));
      const lowerLine = chart.addSeries(LineSeries, {
        color: "#60a5fa",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "",
      });
      lowerLine.setData(toLineData(candles, lower, keepIdx));
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
        title: "",
      });
      convLine.setData(toLineData(candles, conv, keepIdx));
      const baseLine = chart.addSeries(LineSeries, {
        color: "#ef4444",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "",
      });
      baseLine.setData(toLineData(candles, baseArr, keepIdx));
      const spanALine = chart.addSeries(LineSeries, {
        color: "#86efac",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "",
      });
      spanALine.setData(toLineData(candles, spanA, keepIdx));
      const spanBLine = chart.addSeries(LineSeries, {
        color: "#fca5a5",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "",
      });
      spanBLine.setData(toLineData(candles, spanB, keepIdx));
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
        rsiLine.setData(toLineData(candles, rsiCalc(closes, p.period), keepIdx));
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
        for (const i of keepIdx) {
          const v = hist[i];
          if (v == null) continue;
          histData.push({
            time: allTimes[i],
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
        macdSeries.setData(toLineData(candles, macdLine, keepIdx));

        const signalSeries = subChart.addSeries(LineSeries, {
          color: "#ef4444",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "Signal",
        });
        signalSeries.setData(toLineData(candles, signalLine, keepIdx));

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
        kSeries.setData(toLineData(candles, k, keepIdx));
        const dSeries = subChart.addSeries(LineSeries, {
          color: "#f59e0b",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "%D",
        });
        dSeries.setData(toLineData(candles, d, keepIdx));

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

    // Sync time scales between main and sub.
    chart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (r && subChart) subChart.timeScale().setVisibleLogicalRange(r);
    });
    subChart?.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (r) chart.timeScale().setVisibleLogicalRange(r);
    });

    chart.timeScale().fitContent();

    // Resize on actual size changes only.
    let lastMainW = mainW;
    let lastMainH = mainH;
    const mainObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0 && (w !== lastMainW || h !== lastMainH)) {
          lastMainW = w;
          lastMainH = h;
          chart.applyOptions({ width: w, height: h });
        }
      }
    });
    mainObserver.observe(mainBox);

    let subObserver: ResizeObserver | null = null;
    if (subChart && subBox) {
      const localSub = subChart;
      const subRect0 = subBox.getBoundingClientRect();
      let lastSubW = Math.floor(subRect0.width);
      let lastSubH = Math.floor(subRect0.height);
      subObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.floor(entry.contentRect.width);
          const h = Math.floor(entry.contentRect.height);
          if (w > 0 && h > 0 && (w !== lastSubW || h !== lastSubH)) {
            lastSubW = w;
            lastSubH = h;
            localSub.applyOptions({ width: w, height: h });
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
  const legendItems = legendFor(strategy, params);

  return (
    <div>
      {subtitle && (
        <div className="mb-2 text-xs text-neutral-500">{subtitle}</div>
      )}
      <div
        ref={mainBoxRef}
        style={{ width: "100%", height: "360px", position: "relative" }}
        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
      />
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300">
        <LegendDot color="#10b981" label="양봉" />
        <LegendDot color="#ef4444" label="음봉" />
        <LegendDot color="#10b981" label="▲ 매수" />
        <LegendDot color="#ef4444" label="▼ 매도" />
        {legendItems.map((it) => (
          <LegendDot key={it.label} color={it.color} label={it.label} />
        ))}
      </div>
      {hasSubPanel && (
        <div
          ref={subBoxRef}
          style={{ width: "100%", height: "200px", position: "relative" }}
          className="mt-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        />
      )}
    </div>
  );
}

type LegendItem = { label: string; color: string };

function legendFor(strategy: StrategyId, params: StrategyParams): LegendItem[] {
  switch (strategy) {
    case "ma_cross": {
      const p = params.ma_cross ?? { short: 20, long: 60 };
      return [
        { label: `MA${p.short}`, color: "#3b82f6" },
        { label: `MA${p.long}`, color: "#ef4444" },
      ];
    }
    case "ma_dca": {
      const p = params.ma_dca ?? { intervalDays: 7, amountKRW: 100000, maPeriod: 60 };
      return [{ label: `MA${p.maPeriod}`, color: "#3b82f6" }];
    }
    case "bollinger":
      return [
        { label: "BB 상/하단", color: "#60a5fa" },
        { label: "BB 중심", color: "#93c5fd" },
      ];
    case "ichimoku":
      return [
        { label: "전환선", color: "#3b82f6" },
        { label: "기준선", color: "#ef4444" },
        { label: "선행 A", color: "#86efac" },
        { label: "선행 B", color: "#fca5a5" },
      ];
    default:
      return [];
  }
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
