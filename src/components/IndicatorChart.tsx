"use client";

import {
  ComposedChart,
  Line,
  Area,
  Bar,
  Scatter,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Candle } from "@/lib/upbit";
import {
  type Signal,
  type StrategyId,
  type StrategyParams,
  sma,
  ema,
  stddev,
  rsi as rsiCalc,
} from "@/lib/strategies";

type Row = {
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  buy?: number | null;
  sell?: number | null;
  maShort?: number | null;
  maLong?: number | null;
  bbUpper?: number | null;
  bbMid?: number | null;
  bbLower?: number | null;
  bbBand?: [number, number] | null;
  maDca?: number | null;
  ichiConv?: number | null;
  ichiBase?: number | null;
  ichiCloudTop?: number | null;
  ichiCloudBot?: number | null;
  ichiCloudBand?: [number, number] | null;
  ichiCloudSide?: "up" | "down" | null;
  rsi?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  macdHist?: number | null;
  stochK?: number | null;
  stochD?: number | null;
};

function fmtKRW(n: number) {
  if (!Number.isFinite(n)) return "-";
  return `₩${new Intl.NumberFormat("ko-KR").format(Math.round(n))}`;
}

function rangeHigh(candles: Candle[], i: number, n: number) {
  let m = -Infinity;
  for (let k = Math.max(0, i - n + 1); k <= i; k++) m = Math.max(m, candles[k].high);
  return m;
}

function rangeLow(candles: Candle[], i: number, n: number) {
  let m = Infinity;
  for (let k = Math.max(0, i - n + 1); k <= i; k++) m = Math.min(m, candles[k].low);
  return m;
}

export function IndicatorChart({
  candles,
  signals,
  strategy,
  params,
}: {
  candles: Candle[];
  signals: Signal[];
  strategy: StrategyId;
  params: StrategyParams;
}) {
  const closes = candles.map((c) => c.close);

  const rows: Row[] = candles.map((c, i) => {
    const sig = signals[i];
    const isBuy =
      sig === "buy" || (typeof sig === "object" && sig !== null && "buy_krw" in sig);
    const isSell =
      sig === "sell" ||
      (typeof sig === "object" && sig !== null && "sell_qty_frac" in sig);
    return {
      date: new Date(c.timestamp).toISOString().slice(0, 10),
      price: c.close,
      open: c.open,
      high: c.high,
      low: c.low,
      buy: isBuy ? c.close : null,
      sell: isSell ? c.close : null,
    };
  });

  if (strategy === "ma_cross") {
    const p = params.ma_cross ?? { short: 20, long: 60 };
    const s = sma(closes, p.short);
    const l = sma(closes, p.long);
    rows.forEach((r, i) => {
      r.maShort = s[i];
      r.maLong = l[i];
    });
  }

  if (strategy === "ma_dca") {
    const p = params.ma_dca ?? { intervalDays: 7, amountKRW: 100000, maPeriod: 60 };
    const m = sma(closes, p.maPeriod);
    rows.forEach((r, i) => {
      r.maDca = m[i];
    });
  }

  if (strategy === "bollinger") {
    const p = params.bollinger ?? { period: 20, stddev: 2 };
    const mid = sma(closes, p.period);
    const sd = stddev(closes, p.period);
    rows.forEach((r, i) => {
      const m = mid[i];
      const s = sd[i];
      if (m == null || s == null) return;
      const upper = m + p.stddev * s;
      const lower = m - p.stddev * s;
      r.bbMid = m;
      r.bbUpper = upper;
      r.bbLower = lower;
      r.bbBand = [lower, upper];
    });
  }

  if (strategy === "ichimoku") {
    const p = params.ichimoku ?? { conversion: 9, base: 26, lagging: 52 };
    candles.forEach((_, i) => {
      if (i < p.lagging + p.base) return;
      const conv =
        (rangeHigh(candles, i, p.conversion) + rangeLow(candles, i, p.conversion)) / 2;
      const base =
        (rangeHigh(candles, i, p.base) + rangeLow(candles, i, p.base)) / 2;
      const spanA = (conv + base) / 2;
      const spanBIdx = i - p.base;
      const spanB =
        (rangeHigh(candles, spanBIdx, p.lagging) + rangeLow(candles, spanBIdx, p.lagging)) /
        2;
      const top = Math.max(spanA, spanB);
      const bot = Math.min(spanA, spanB);
      rows[i].ichiConv = conv;
      rows[i].ichiBase = base;
      rows[i].ichiCloudTop = top;
      rows[i].ichiCloudBot = bot;
      rows[i].ichiCloudBand = [bot, top];
      rows[i].ichiCloudSide = spanA >= spanB ? "up" : "down";
    });
  }

  let hasSubPanel = false;
  if (strategy === "rsi") {
    hasSubPanel = true;
    const p = params.rsi ?? { period: 14, oversold: 30, overbought: 70 };
    const r = rsiCalc(closes, p.period);
    rows.forEach((row, i) => {
      row.rsi = r[i];
    });
  }

  if (strategy === "macd") {
    hasSubPanel = true;
    const p = params.macd ?? { fast: 12, slow: 26, signal: 9 };
    const fastE = ema(closes, p.fast);
    const slowE = ema(closes, p.slow);
    const macdLine = closes.map((_, i) => {
      const f = fastE[i];
      const s = slowE[i];
      return f != null && s != null ? f - s : null;
    });
    const validMacd = macdLine.map((v) => (v == null ? 0 : v));
    const signalLine = ema(validMacd, p.signal);
    rows.forEach((row, i) => {
      row.macd = macdLine[i];
      row.macdSignal = signalLine[i];
      if (macdLine[i] != null && signalLine[i] != null) {
        row.macdHist = (macdLine[i] as number) - (signalLine[i] as number);
      }
    });
  }

  if (strategy === "stoch") {
    hasSubPanel = true;
    const p = params.stoch ?? { period: 14, smooth: 3, oversold: 20, overbought: 80 };
    const kVals: (number | null)[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < p.period - 1) {
        kVals.push(null);
        continue;
      }
      const hh = rangeHigh(candles, i, p.period);
      const ll = rangeLow(candles, i, p.period);
      kVals.push(hh === ll ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100);
    }
    const kValid = kVals.map((v) => (v == null ? 50 : v));
    const dVals = sma(kValid, p.smooth);
    rows.forEach((row, i) => {
      row.stochK = kVals[i];
      row.stochD = dVals[i];
    });
  }

  const priceMin = Math.min(...candles.map((c) => c.low));
  const priceMax = Math.max(...candles.map((c) => c.high));
  const priceDomain: [number, number] = [priceMin * 0.98, priceMax * 1.02];

  return (
    <div>
      <div className="mb-2 text-xs text-neutral-500">
        {strategy === "bollinger" &&
          "볼린저 상/하단 밴드와 가격, 매수·매도 지점이 함께 표시됩니다. 밴드 터치와 실제 매매 위치가 맞는지 확인해 보세요."}
        {strategy === "rsi" &&
          "아래 RSI 패널의 과매도/과매수 선을 넘나드는 순간이 매매 지점과 일치하는지 확인해 보세요."}
        {strategy === "ma_cross" &&
          "단기·장기 이평 교차 시점이 매매 지점과 일치하는지 확인해 보세요."}
        {strategy === "macd" &&
          "MACD와 시그널 라인의 교차, 히스토그램 부호 변화가 매매 시점과 맞는지 확인해 보세요."}
        {strategy === "stoch" &&
          "%K가 %D를 과매도/과매수 구간에서 교차하는 지점이 매매와 일치하는지 확인해 보세요."}
        {strategy === "ichimoku" &&
          "구름대 위/아래 돌파와 전환선·기준선 교차가 매매와 맞는지 확인해 보세요."}
        {strategy === "ma_dca" && "이평선 아래 구간에서만 적립 매수가 집행됩니다."}
      </div>

      <div className="h-80 sm:h-96 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" minTickGap={50} stroke="currentColor" opacity={0.4} />
            <YAxis
              domain={priceDomain}
              tickFormatter={(v: number) => fmtKRW(v)}
              stroke="currentColor"
              opacity={0.4}
              width={80}
            />
            <Tooltip
              formatter={(v: number | string, name: string) => {
                const n = typeof v === "number" ? v : Number(v);
                return [Number.isFinite(n) ? fmtKRW(n) : "-", name];
              }}
              labelStyle={{ color: "#000" }}
            />
            <Legend />

            {strategy === "bollinger" && (
              <Area
                type="monotone"
                dataKey="bbBand"
                fill="#60a5fa"
                fillOpacity={0.12}
                stroke="none"
                name="BB 범위"
                isAnimationActive={false}
              />
            )}
            {strategy === "ichimoku" && (
              <Area
                type="monotone"
                dataKey="ichiCloudBand"
                fill="#86efac"
                fillOpacity={0.2}
                stroke="none"
                name="구름대"
                isAnimationActive={false}
              />
            )}

            <Line
              type="monotone"
              dataKey="price"
              stroke="#111"
              dot={false}
              strokeWidth={1.8}
              name="종가"
              isAnimationActive={false}
            />

            {strategy === "ma_cross" && (
              <>
                <Line
                  type="monotone"
                  dataKey="maShort"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={1.5}
                  name="단기 이평"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="maLong"
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={1.5}
                  name="장기 이평"
                  isAnimationActive={false}
                />
              </>
            )}
            {strategy === "ma_dca" && (
              <Line
                type="monotone"
                dataKey="maDca"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={1.5}
                name="기준 이평"
                isAnimationActive={false}
              />
            )}
            {strategy === "bollinger" && (
              <>
                <Line
                  type="monotone"
                  dataKey="bbUpper"
                  stroke="#60a5fa"
                  dot={false}
                  strokeWidth={1.2}
                  name="상단"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="bbMid"
                  stroke="#60a5fa"
                  dot={false}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  name="중심선"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="bbLower"
                  stroke="#60a5fa"
                  dot={false}
                  strokeWidth={1.2}
                  name="하단"
                  isAnimationActive={false}
                />
              </>
            )}
            {strategy === "ichimoku" && (
              <>
                <Line
                  type="monotone"
                  dataKey="ichiConv"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={1.2}
                  name="전환선"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="ichiBase"
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={1.2}
                  name="기준선"
                  isAnimationActive={false}
                />
              </>
            )}

            <Scatter dataKey="buy" fill="#10b981" name="매수" shape={<TriangleUp />} />
            <Scatter dataKey="sell" fill="#ef4444" name="매도" shape={<TriangleDown />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {hasSubPanel && (
        <div className="mt-3 h-40 sm:h-48 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" minTickGap={50} stroke="currentColor" opacity={0.4} />
              <YAxis stroke="currentColor" opacity={0.4} width={40} />
              <Tooltip labelStyle={{ color: "#000" }} />
              <Legend />

              {strategy === "rsi" && (
                <>
                  <ReferenceLine
                    y={params.rsi?.overbought ?? 70}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: "과매수", fontSize: 10, fill: "#ef4444" }}
                  />
                  <ReferenceLine
                    y={params.rsi?.oversold ?? 30}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    label={{ value: "과매도", fontSize: 10, fill: "#10b981" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rsi"
                    stroke="#8b5cf6"
                    dot={false}
                    strokeWidth={1.5}
                    name="RSI"
                    isAnimationActive={false}
                  />
                </>
              )}

              {strategy === "macd" && (
                <>
                  <ReferenceLine y={0} stroke="currentColor" opacity={0.3} />
                  <Bar dataKey="macdHist" name="히스토그램" fill="#94a3b8" />
                  <Line
                    type="monotone"
                    dataKey="macd"
                    stroke="#3b82f6"
                    dot={false}
                    strokeWidth={1.5}
                    name="MACD"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="macdSignal"
                    stroke="#ef4444"
                    dot={false}
                    strokeWidth={1.5}
                    name="Signal"
                    isAnimationActive={false}
                  />
                </>
              )}

              {strategy === "stoch" && (
                <>
                  <ReferenceLine
                    y={params.stoch?.overbought ?? 80}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                  />
                  <ReferenceLine
                    y={params.stoch?.oversold ?? 20}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="stochK"
                    stroke="#8b5cf6"
                    dot={false}
                    strokeWidth={1.5}
                    name="%K"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="stochD"
                    stroke="#f59e0b"
                    dot={false}
                    strokeWidth={1.5}
                    name="%D"
                    isAnimationActive={false}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function TriangleUp(props: { cx?: number; cy?: number; fill?: string }) {
  const { cx = 0, cy = 0, fill = "#10b981" } = props;
  const s = 6;
  return (
    <polygon
      points={`${cx},${cy - s} ${cx - s},${cy + s} ${cx + s},${cy + s}`}
      fill={fill}
      stroke="#064e3b"
      strokeWidth={0.5}
    />
  );
}

function TriangleDown(props: { cx?: number; cy?: number; fill?: string }) {
  const { cx = 0, cy = 0, fill = "#ef4444" } = props;
  const s = 6;
  return (
    <polygon
      points={`${cx},${cy + s} ${cx - s},${cy - s} ${cx + s},${cy - s}`}
      fill={fill}
      stroke="#7f1d1d"
      strokeWidth={0.5}
    />
  );
}
