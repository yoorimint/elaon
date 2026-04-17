import type { Candle } from "./upbit";

export type StrategyId = "buy_hold" | "ma_cross" | "rsi" | "bollinger" | "macd";

export type Signal = "buy" | "sell" | "hold";

export type StrategyParams = {
  ma_cross?: { short: number; long: number };
  rsi?: { period: number; oversold: number; overbought: number };
  bollinger?: { period: number; stddev: number };
  macd?: { fast: number; slow: number; signal: number };
};

export type StrategyConfig = {
  id: StrategyId;
  name: string;
  description: string;
};

export const STRATEGIES: StrategyConfig[] = [
  {
    id: "buy_hold",
    name: "바이앤홀드",
    description: "시작일에 사서 끝까지 보유. 모든 전략의 비교 기준입니다.",
  },
  {
    id: "ma_cross",
    name: "이동평균 크로스",
    description:
      "단기 이평선이 장기 이평선을 위로 뚫으면 매수(골든크로스), 아래로 뚫으면 매도(데드크로스)합니다.",
  },
  {
    id: "rsi",
    name: "RSI 역추세",
    description:
      "RSI가 과매도(보통 30 이하)면 매수, 과매수(보통 70 이상)면 매도합니다. 박스권에서 유리합니다.",
  },
  {
    id: "bollinger",
    name: "볼린저 밴드",
    description:
      "가격이 하단 밴드를 터치하면 매수, 상단 밴드를 터치하면 매도. 변동성 기반 역추세 전략.",
  },
  {
    id: "macd",
    name: "MACD",
    description:
      "MACD 라인이 시그널을 위로 돌파하면 매수, 아래로 돌파하면 매도. 추세 전환 포착.",
  },
];

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function stddev(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let k = i - period + 1; k <= i; k++) sum += values[k];
    const mean = sum / period;
    let sq = 0;
    for (let k = i - period + 1; k <= i; k++) sq += (values[k] - mean) ** 2;
    out.push(Math.sqrt(sq / period));
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      sum += values[i];
      out.push(null);
      continue;
    }
    if (prev === null) {
      sum += values[i];
      prev = sum / period;
      out.push(prev);
      continue;
    }
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function rsi(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let gain = 0;
  let loss = 0;
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      out.push(null);
      continue;
    }
    const diff = values[i] - values[i - 1];
    const g = Math.max(diff, 0);
    const l = Math.max(-diff, 0);
    if (i <= period) {
      gain += g;
      loss += l;
      if (i === period) {
        gain /= period;
        loss /= period;
        const rs = loss === 0 ? 100 : gain / loss;
        out.push(100 - 100 / (1 + rs));
      } else {
        out.push(null);
      }
    } else {
      gain = (gain * (period - 1) + g) / period;
      loss = (loss * (period - 1) + l) / period;
      const rs = loss === 0 ? 100 : gain / loss;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

export function computeSignals(
  candles: Candle[],
  strategy: StrategyId,
  params: StrategyParams,
): Signal[] {
  const closes = candles.map((c) => c.close);
  const signals: Signal[] = new Array(candles.length).fill("hold");

  if (strategy === "buy_hold") {
    signals[0] = "buy";
    return signals;
  }

  if (strategy === "ma_cross") {
    const p = params.ma_cross ?? { short: 20, long: 60 };
    const short = sma(closes, p.short);
    const long = sma(closes, p.long);
    for (let i = 1; i < candles.length; i++) {
      const s0 = short[i - 1], s1 = short[i];
      const l0 = long[i - 1], l1 = long[i];
      if (s0 == null || s1 == null || l0 == null || l1 == null) continue;
      if (s0 <= l0 && s1 > l1) signals[i] = "buy";
      else if (s0 >= l0 && s1 < l1) signals[i] = "sell";
    }
    return signals;
  }

  if (strategy === "rsi") {
    const p = params.rsi ?? { period: 14, oversold: 30, overbought: 70 };
    const r = rsi(closes, p.period);
    let inPos = false;
    for (let i = 1; i < candles.length; i++) {
      const v = r[i];
      if (v == null) continue;
      if (!inPos && v < p.oversold) {
        signals[i] = "buy";
        inPos = true;
      } else if (inPos && v > p.overbought) {
        signals[i] = "sell";
        inPos = false;
      }
    }
    return signals;
  }

  if (strategy === "bollinger") {
    const p = params.bollinger ?? { period: 20, stddev: 2 };
    const mid = sma(closes, p.period);
    const sd = stddev(closes, p.period);
    let inPos = false;
    for (let i = 1; i < candles.length; i++) {
      const m = mid[i];
      const s = sd[i];
      if (m == null || s == null) continue;
      const upper = m + p.stddev * s;
      const lower = m - p.stddev * s;
      const price = closes[i];
      if (!inPos && price <= lower) {
        signals[i] = "buy";
        inPos = true;
      } else if (inPos && price >= upper) {
        signals[i] = "sell";
        inPos = false;
      }
    }
    return signals;
  }

  if (strategy === "macd") {
    const p = params.macd ?? { fast: 12, slow: 26, signal: 9 };
    const fastEma = ema(closes, p.fast);
    const slowEma = ema(closes, p.slow);
    const macdLine = closes.map((_, i) => {
      const f = fastEma[i];
      const s = slowEma[i];
      return f != null && s != null ? f - s : null;
    });
    const validMacd = macdLine.map((v) => (v == null ? 0 : v));
    const signalLine = ema(validMacd, p.signal);

    for (let i = 1; i < candles.length; i++) {
      const m0 = macdLine[i - 1];
      const m1 = macdLine[i];
      const s0 = signalLine[i - 1];
      const s1 = signalLine[i];
      if (m0 == null || m1 == null || s0 == null || s1 == null) continue;
      if (m0 <= s0 && m1 > s1) signals[i] = "buy";
      else if (m0 >= s0 && m1 < s1) signals[i] = "sell";
    }
    return signals;
  }

  return signals;
}
