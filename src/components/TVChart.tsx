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

    // Real candle data with duplicate-time protection (lightweight-charts requires strictly ascending unique times).
    const rawData: LineData<UTCTimestamp>[] = [];
    for (const c of candles) {
      if (!Number.isFinite(c.timestamp) || !Number.isFinite(c.close)) continue;
      rawData.push({
        time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
        value: c.close,
      });
    }
    rawData.sort((a, b) => (a.time as number) - (b.time as number));
    const data: LineData<UTCTimestamp>[] = [];
    let prev = -Infinity;
    let dropped = 0;
    for (const p of rawData) {
      if ((p.time as number) <= prev) {
        dropped++;
        continue;
      }
      data.push(p);
      prev = p.time as number;
    }

    try {
      series.setData(data);
      chart.timeScale().fitContent();
      const vr = chart.timeScale().getVisibleRange();
      const lr = chart.timeScale().getVisibleLogicalRange();
      setDebug(
        `OK raw=${rawData.length} uniq=${data.length} dropped=${dropped} box=${w}x${h} vr=${vr ? `${vr.from}~${vr.to}` : "null"} lr=${lr ? `${lr.from.toFixed(1)}~${lr.to.toFixed(1)}` : "null"}`,
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
