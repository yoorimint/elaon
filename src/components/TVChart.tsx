"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  LineSeries,
  ColorType,
  type LineData,
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

export function TVChart({ candles }: TVChartProps) {
  const mainBoxRef = useRef<HTMLDivElement | null>(null);
  const [debug, setDebug] = useState<string>("init");

  useEffect(() => {
    const mainBox = mainBoxRef.current;
    if (!mainBox) {
      setDebug("no ref");
      return;
    }

    const rect = mainBox.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    let chart;
    try {
      chart = createChart(mainBox, {
        width: w,
        height: h,
        layout: {
          background: { type: ColorType.Solid, color: "#ffffff" },
          textColor: "#000000",
        },
      });
    } catch (e) {
      setDebug(`createChart threw: ${(e as Error).message}`);
      return;
    }

    let series;
    try {
      series = chart.addSeries(LineSeries, {
        color: "#ff0000",
        lineWidth: 3,
      });
    } catch (e) {
      setDebug(`addSeries threw: ${(e as Error).message}`);
      chart.remove();
      return;
    }

    // Hardcoded smoke test: 5 points on a normalized axis.
    const data: LineData<UTCTimestamp>[] = [
      { time: 1700000000 as UTCTimestamp, value: 100 },
      { time: 1702592000 as UTCTimestamp, value: 150 },
      { time: 1705184000 as UTCTimestamp, value: 80 },
      { time: 1707776000 as UTCTimestamp, value: 200 },
      { time: 1710368000 as UTCTimestamp, value: 120 },
    ];

    try {
      series.setData(data);
      chart.timeScale().fitContent();
      const vr = chart.timeScale().getVisibleRange();
      const lr = chart.timeScale().getVisibleLogicalRange();
      setDebug(
        `OK points=${data.length} box=${w}x${h} visibleRange=${vr ? `${vr.from}~${vr.to}` : "null"} logical=${lr ? `${lr.from.toFixed(1)}~${lr.to.toFixed(1)}` : "null"}`,
      );
    } catch (e) {
      setDebug(`setData threw: ${(e as Error).message}`);
    }

    return () => {
      chart.remove();
    };
  }, [candles]);

  return (
    <div>
      <div className="mb-1 text-[10px] text-neutral-400 break-all">🔧 {debug}</div>
      <div
        ref={mainBoxRef}
        style={{ width: "100%", height: "320px", position: "relative" }}
        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
      />
    </div>
  );
}
