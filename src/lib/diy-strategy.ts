import type { Candle } from "./upbit";
import {
  adx,
  atr,
  awesomeOscillator,
  cci,
  donchianHigh,
  donchianLow,
  ema,
  heikinAshi,
  ichimokuConvLine,
  mfi,
  momentum,
  obv,
  parabolicSAR,
  roc,
  rsi,
  slowStochD,
  slowStochK,
  sma,
  stddev,
  stochD,
  stochK,
  vwap,
  williamsR,
} from "./strategies";

export type IndicatorRef =
  | { kind: "close" }
  | { kind: "open" }
  | { kind: "high" }
  | { kind: "low" }
  | { kind: "volume" }
  | { kind: "sma"; period: number }
  | { kind: "ema"; period: number }
  | { kind: "rsi"; period: number }
  | { kind: "bb_upper"; period: number; stddev: number }
  | { kind: "bb_middle"; period: number }
  | { kind: "bb_lower"; period: number; stddev: number }
  | { kind: "macd"; fast: number; slow: number }
  | { kind: "macd_signal"; fast: number; slow: number; signal: number }
  | { kind: "stoch_k"; period: number }
  | { kind: "stoch_d"; period: number; smooth: number }
  | { kind: "slow_stoch_k"; period: number; slowSmooth: number }
  | { kind: "slow_stoch_d"; period: number; slowSmooth: number; dSmooth: number }
  | { kind: "atr"; period: number }
  | { kind: "williams_r"; period: number }
  | { kind: "cci"; period: number }
  | { kind: "adx"; period: number }
  | { kind: "roc"; period: number }
  | { kind: "obv" }
  | { kind: "mfi"; period: number }
  | { kind: "sar"; step: number; max: number }
  | { kind: "vwap" }
  | { kind: "ichimoku_conv"; period: number }
  | { kind: "ichimoku_base"; period: number }
  | { kind: "donchian_upper"; period: number }
  | { kind: "donchian_lower"; period: number }
  | { kind: "ao" }
  | { kind: "momentum"; period: number }
  | { kind: "ha_open" }
  | { kind: "ha_high" }
  | { kind: "ha_low" }
  | { kind: "ha_close" }
  | { kind: "const"; value: number };

export type ConditionOp = "gt" | "lt" | "gte" | "lte" | "cross_up" | "cross_down";

export type Condition = {
  id: string;
  left: IndicatorRef;
  op: ConditionOp;
  right: IndicatorRef;
};

export type DIYStrategy = {
  buy: Condition[]; // AND
  sell: Condition[]; // OR
  stopLossPct?: number;
  takeProfitPct?: number;
};

export const INDICATOR_LABELS: Record<IndicatorRef["kind"], string> = {
  close: "종가",
  open: "시가",
  high: "고가",
  low: "저가",
  volume: "거래량",
  sma: "SMA(단순 이평)",
  ema: "EMA(지수 이평)",
  rsi: "RSI",
  bb_upper: "볼린저 상단",
  bb_middle: "볼린저 중단",
  bb_lower: "볼린저 하단",
  macd: "MACD 라인",
  macd_signal: "MACD 시그널",
  stoch_k: "스토캐스틱 %K (Fast)",
  stoch_d: "스토캐스틱 %D (Fast)",
  slow_stoch_k: "슬로우 스토캐스틱 %K",
  slow_stoch_d: "슬로우 스토캐스틱 %D",
  atr: "ATR (변동폭)",
  williams_r: "Williams %R",
  cci: "CCI",
  adx: "ADX (추세강도)",
  roc: "ROC (변화율)",
  obv: "OBV (누적 거래량)",
  mfi: "MFI",
  sar: "Parabolic SAR",
  vwap: "VWAP",
  ichimoku_conv: "일목 전환선",
  ichimoku_base: "일목 기준선",
  donchian_upper: "돈치안 상단",
  donchian_lower: "돈치안 하단",
  ao: "AO (어썸 오실레이터)",
  momentum: "모멘텀",
  ha_open: "하이킨아시 시가",
  ha_high: "하이킨아시 고가",
  ha_low: "하이킨아시 저가",
  ha_close: "하이킨아시 종가",
  const: "숫자값",
};

export const OP_LABELS: Record<ConditionOp, string> = {
  gt: ">",
  lt: "<",
  gte: ">=",
  lte: "<=",
  cross_up: "위로 돌파",
  cross_down: "아래로 돌파",
};

function indicatorKey(ref: IndicatorRef): string {
  switch (ref.kind) {
    case "close":
    case "open":
    case "high":
    case "low":
    case "volume":
    case "obv":
    case "vwap":
    case "ha_open":
    case "ha_high":
    case "ha_low":
    case "ha_close":
      return ref.kind;
    case "sma":
    case "ema":
    case "rsi":
    case "atr":
    case "williams_r":
    case "cci":
    case "adx":
    case "roc":
    case "mfi":
    case "stoch_k":
    case "bb_middle":
    case "ichimoku_conv":
    case "ichimoku_base":
      return `${ref.kind}_${ref.period}`;
    case "stoch_d":
      return `stoch_d_${ref.period}_${ref.smooth}`;
    case "slow_stoch_k":
      return `slow_stoch_k_${ref.period}_${ref.slowSmooth}`;
    case "slow_stoch_d":
      return `slow_stoch_d_${ref.period}_${ref.slowSmooth}_${ref.dSmooth}`;
    case "donchian_upper":
    case "donchian_lower":
    case "momentum":
      return `${ref.kind}_${ref.period}`;
    case "ao":
      return "ao";
    case "bb_upper":
    case "bb_lower":
      return `${ref.kind}_${ref.period}_${ref.stddev}`;
    case "macd":
      return `macd_${ref.fast}_${ref.slow}`;
    case "macd_signal":
      return `macd_signal_${ref.fast}_${ref.slow}_${ref.signal}`;
    case "sar":
      return `sar_${ref.step}_${ref.max}`;
    case "const":
      return `const_${ref.value}`;
  }
}

function computeIndicator(
  ref: IndicatorRef,
  candles: Candle[],
): (number | null)[] {
  const closes = candles.map((c) => c.close);
  switch (ref.kind) {
    case "close":
      return closes;
    case "open":
      return candles.map((c) => c.open);
    case "high":
      return candles.map((c) => c.high);
    case "low":
      return candles.map((c) => c.low);
    case "volume":
      return candles.map((c) => c.volume);
    case "sma":
      return sma(closes, ref.period);
    case "ema":
      return ema(closes, ref.period);
    case "rsi":
      return rsi(closes, ref.period);
    case "bb_middle":
      return sma(closes, ref.period);
    case "bb_upper": {
      const mid = sma(closes, ref.period);
      const sd = stddev(closes, ref.period);
      return mid.map((m, i) => {
        const s = sd[i];
        return m == null || s == null ? null : m + ref.stddev * s;
      });
    }
    case "bb_lower": {
      const mid = sma(closes, ref.period);
      const sd = stddev(closes, ref.period);
      return mid.map((m, i) => {
        const s = sd[i];
        return m == null || s == null ? null : m - ref.stddev * s;
      });
    }
    case "macd": {
      const fast = ema(closes, ref.fast);
      const slow = ema(closes, ref.slow);
      return closes.map((_, i) => {
        const f = fast[i];
        const s = slow[i];
        return f == null || s == null ? null : f - s;
      });
    }
    case "macd_signal": {
      const fast = ema(closes, ref.fast);
      const slow = ema(closes, ref.slow);
      const macd = closes.map((_, i) => {
        const f = fast[i];
        const s = slow[i];
        return f != null && s != null ? f - s : null;
      });
      // 워밍업 구간 null을 0으로 메우면 signal line이 0에서 녹아들어오는 허위
      // 시그널이 발생. 첫 유효 인덱스부터 EMA 돌리고 앞은 null로 둔다.
      const firstValid = macd.findIndex((v) => v != null);
      const out: (number | null)[] = new Array(macd.length).fill(null);
      if (firstValid >= 0) {
        const trimmed = macd.slice(firstValid).map((v) => v as number);
        const sig = ema(trimmed, ref.signal);
        for (let i = 0; i < sig.length; i++) out[firstValid + i] = sig[i];
      }
      return out;
    }
    case "stoch_k":
      return stochK(candles, ref.period);
    case "stoch_d":
      return stochD(candles, ref.period, ref.smooth);
    case "slow_stoch_k":
      return slowStochK(candles, ref.period, ref.slowSmooth);
    case "slow_stoch_d":
      return slowStochD(candles, ref.period, ref.slowSmooth, ref.dSmooth);
    case "atr":
      return atr(candles, ref.period);
    case "williams_r":
      return williamsR(candles, ref.period);
    case "cci":
      return cci(candles, ref.period);
    case "adx":
      return adx(candles, ref.period);
    case "roc":
      return roc(closes, ref.period);
    case "obv":
      return obv(candles);
    case "mfi":
      return mfi(candles, ref.period);
    case "sar":
      return parabolicSAR(candles, ref.step, ref.max);
    case "vwap":
      return vwap(candles);
    case "ichimoku_conv":
      return ichimokuConvLine(candles, ref.period);
    case "ichimoku_base":
      return ichimokuConvLine(candles, ref.period);
    case "donchian_upper":
      return donchianHigh(candles, ref.period);
    case "donchian_lower":
      return donchianLow(candles, ref.period);
    case "ao":
      return awesomeOscillator(candles);
    case "momentum":
      return momentum(closes, ref.period);
    case "ha_open":
      return heikinAshi(candles).open;
    case "ha_high":
      return heikinAshi(candles).high;
    case "ha_low":
      return heikinAshi(candles).low;
    case "ha_close":
      return heikinAshi(candles).close;
    case "const":
      return candles.map(() => ref.value);
  }
}

function buildCache(
  conditions: Condition[],
  candles: Candle[],
): Map<string, (number | null)[]> {
  const cache = new Map<string, (number | null)[]>();
  for (const c of conditions) {
    for (const side of [c.left, c.right]) {
      const key = indicatorKey(side);
      if (!cache.has(key)) {
        cache.set(key, computeIndicator(side, candles));
      }
    }
  }
  return cache;
}

function evalCondition(
  c: Condition,
  cache: Map<string, (number | null)[]>,
  i: number,
): boolean {
  const leftArr = cache.get(indicatorKey(c.left))!;
  const rightArr = cache.get(indicatorKey(c.right))!;
  const l1 = leftArr[i];
  const r1 = rightArr[i];
  if (l1 == null || r1 == null) return false;

  switch (c.op) {
    case "gt":
      return l1 > r1;
    case "lt":
      return l1 < r1;
    case "gte":
      return l1 >= r1;
    case "lte":
      return l1 <= r1;
    case "cross_up": {
      if (i === 0) return false;
      const l0 = leftArr[i - 1];
      const r0 = rightArr[i - 1];
      if (l0 == null || r0 == null) return false;
      return l0 <= r0 && l1 > r1;
    }
    case "cross_down": {
      if (i === 0) return false;
      const l0 = leftArr[i - 1];
      const r0 = rightArr[i - 1];
      if (l0 == null || r0 == null) return false;
      return l0 >= r0 && l1 < r1;
    }
  }
}

export type Signal = "buy" | "sell" | "hold";

export function computeDIYSignals(
  candles: Candle[],
  strategy: DIYStrategy,
): Signal[] {
  const signals: Signal[] = new Array(candles.length).fill("hold");
  if (strategy.buy.length === 0) return signals;

  const cache = buildCache([...strategy.buy, ...strategy.sell], candles);
  let inPos = false;
  let entryPrice = 0;

  for (let i = 1; i < candles.length; i++) {
    if (!inPos) {
      const allBuy = strategy.buy.every((c) => evalCondition(c, cache, i));
      if (allBuy) {
        signals[i] = "buy";
        inPos = true;
        entryPrice = candles[i].close;
      }
    } else {
      const price = candles[i].close;
      const pnlPct = ((price / entryPrice) - 1) * 100;

      if (strategy.stopLossPct != null && pnlPct <= -strategy.stopLossPct) {
        signals[i] = "sell";
        inPos = false;
        entryPrice = 0;
        continue;
      }
      if (strategy.takeProfitPct != null && pnlPct >= strategy.takeProfitPct) {
        signals[i] = "sell";
        inPos = false;
        entryPrice = 0;
        continue;
      }

      const anySell =
        strategy.sell.length > 0 &&
        strategy.sell.some((c) => evalCondition(c, cache, i));
      if (anySell) {
        signals[i] = "sell";
        inPos = false;
        entryPrice = 0;
      }
    }
  }

  return signals;
}

export function defaultCondition(): Condition {
  return {
    id: Math.random().toString(36).slice(2, 10),
    left: { kind: "rsi", period: 14 },
    op: "lt",
    right: { kind: "const", value: 30 },
  };
}
