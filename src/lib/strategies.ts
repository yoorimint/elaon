import type { Candle } from "./upbit";

export type StrategyId = "buy_hold" | "ma_cross" | "rsi";

export type Signal = "buy" | "sell" | "hold";

export type StrategyParams = {
  ma_cross?: { short: number; long: number };
  rsi?: { period: number; oversold: number; overbought: number };
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

  return signals;
}
