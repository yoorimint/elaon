import type { Candle } from "./upbit";

export type StrategyId =
  | "buy_hold"
  | "ma_cross"
  | "rsi"
  | "bollinger"
  | "macd"
  | "breakout"
  | "stoch"
  | "ichimoku"
  | "dca"
  | "ma_dca"
  | "grid"
  | "custom";

export type Signal =
  | "buy"
  | "sell"
  | "hold"
  | { buy_krw: number }
  | { sell_qty_frac: number };

export type StrategyParams = {
  ma_cross?: { short: number; long: number };
  rsi?: { period: number; oversold: number; overbought: number };
  bollinger?: { period: number; stddev: number };
  macd?: { fast: number; slow: number; signal: number };
  breakout?: { k: number };
  stoch?: { period: number; smooth: number; oversold: number; overbought: number };
  ichimoku?: { conversion: number; base: number; lagging: number };
  dca?: { intervalDays: number; amountKRW: number };
  ma_dca?: { intervalDays: number; amountKRW: number; maPeriod: number };
  grid?: { low: number; high: number; grids: number };
};

export type StrategyConfig = {
  id: StrategyId;
  name: string;
  description: string;
  group: "추세" | "역추세" | "적립" | "커스텀";
};

export const STRATEGIES: StrategyConfig[] = [
  {
    id: "buy_hold",
    name: "바이앤홀드",
    description: "시작일에 전액 매수 후 끝까지 보유. 모든 전략의 비교 기준.",
    group: "추세",
  },
  {
    id: "ma_cross",
    name: "이동평균 크로스",
    description:
      "단기 이평이 장기 이평을 위로 뚫으면 매수(골든크로스), 아래로 뚫으면 매도.",
    group: "추세",
  },
  {
    id: "macd",
    name: "MACD",
    description: "MACD 라인이 시그널을 위로 돌파하면 매수, 아래로 돌파하면 매도.",
    group: "추세",
  },
  {
    id: "breakout",
    name: "변동성 돌파 (래리 윌리엄스)",
    description:
      "전일 고저 변동폭의 k배(보통 0.5)만큼 당일 시가 위로 돌파하면 매수, 다음 날 청산. 단타 대표 전략.",
    group: "추세",
  },
  {
    id: "ichimoku",
    name: "일목균형표",
    description:
      "전환선이 기준선을 위로 뚫고 가격이 구름대 위에 있으면 매수, 반대면 매도.",
    group: "추세",
  },
  {
    id: "rsi",
    name: "RSI 역추세",
    description: "RSI 과매도(30 이하) 매수, 과매수(70 이상) 매도. 박스권 유리.",
    group: "역추세",
  },
  {
    id: "bollinger",
    name: "볼린저 밴드",
    description: "하단 밴드 터치 매수, 상단 밴드 터치 매도. 변동성 기반 역추세.",
    group: "역추세",
  },
  {
    id: "stoch",
    name: "스토캐스틱",
    description:
      "%K가 %D를 과매도(20 이하)에서 위로 돌파하면 매수, 과매수(80 이상)에서 아래로 돌파하면 매도.",
    group: "역추세",
  },
  {
    id: "dca",
    name: "DCA (적립식 매수)",
    description:
      "정해진 주기마다 고정 금액을 매수하여 평균 단가를 낮춥니다. 초보자용 장기 전략.",
    group: "적립",
  },
  {
    id: "ma_dca",
    name: "이동평균 DCA",
    description:
      "DCA인데 가격이 이평선 아래일 때만 매수. 비싼 구간은 건너뛰어 평단 더 낮춤.",
    group: "적립",
  },
  {
    id: "grid",
    name: "그리드 매매",
    description:
      "가격 범위를 N구간으로 나눠 구간 하단 닿으면 1/N씩 매수, 상단 닿으면 1/N씩 매도. 박스권 최강.",
    group: "적립",
  },
  {
    id: "custom",
    name: "커스텀 (DIY)",
    description:
      "여러 지표 조건을 AND로 조합해 매수, OR로 조합해 매도. 손절/익절 설정 가능. 나만의 전략을 만드세요.",
    group: "커스텀",
  },
];

// ===== 지표 계산 =====

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

// ===== 시그널 생성 =====

export function computeSignals(
  candles: Candle[],
  strategy: StrategyId,
  params: StrategyParams,
  opts: { initialCash?: number } = {},
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

  if (strategy === "breakout") {
    const p = params.breakout ?? { k: 0.5 };
    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1];
      const cur = candles[i];
      const range = prev.high - prev.low;
      const target = cur.open + p.k * range;
      if (cur.high >= target) {
        signals[i] = "buy";
        if (i + 1 < candles.length) {
          signals[i + 1] = "sell";
        }
      }
    }
    return signals;
  }

  if (strategy === "stoch") {
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

    let inPos = false;
    for (let i = 1; i < candles.length; i++) {
      const k0 = kVals[i - 1];
      const k1 = kVals[i];
      const d0 = dVals[i - 1];
      const d1 = dVals[i];
      if (k0 == null || k1 == null || d0 == null || d1 == null) continue;
      if (!inPos && k0 <= d0 && k1 > d1 && k1 < p.oversold + 20) {
        signals[i] = "buy";
        inPos = true;
      } else if (inPos && k0 >= d0 && k1 < d1 && k1 > p.overbought - 20) {
        signals[i] = "sell";
        inPos = false;
      }
    }
    return signals;
  }

  if (strategy === "ichimoku") {
    const p = params.ichimoku ?? { conversion: 9, base: 26, lagging: 52 };
    let inPos = false;
    for (let i = 0; i < candles.length; i++) {
      if (i < p.lagging + p.base) continue;
      const conv =
        (rangeHigh(candles, i, p.conversion) + rangeLow(candles, i, p.conversion)) / 2;
      const base = (rangeHigh(candles, i, p.base) + rangeLow(candles, i, p.base)) / 2;
      const spanA = (conv + base) / 2;
      const spanBIdx = i - p.base;
      const spanB =
        (rangeHigh(candles, spanBIdx, p.lagging) + rangeLow(candles, spanBIdx, p.lagging)) / 2;
      const cloudTop = Math.max(spanA, spanB);
      const cloudBot = Math.min(spanA, spanB);
      const price = candles[i].close;

      if (!inPos && price > cloudTop && conv > base) {
        signals[i] = "buy";
        inPos = true;
      } else if (inPos && (price < cloudBot || conv < base)) {
        signals[i] = "sell";
        inPos = false;
      }
    }
    return signals;
  }

  if (strategy === "dca") {
    const p = params.dca ?? { intervalDays: 7, amountKRW: 100000 };
    for (let i = 0; i < candles.length; i++) {
      if (i % p.intervalDays === 0) {
        signals[i] = { buy_krw: p.amountKRW };
      }
    }
    return signals;
  }

  if (strategy === "ma_dca") {
    const p = params.ma_dca ?? { intervalDays: 7, amountKRW: 100000, maPeriod: 60 };
    const ma = sma(closes, p.maPeriod);
    for (let i = 0; i < candles.length; i++) {
      if (i % p.intervalDays !== 0) continue;
      const m = ma[i];
      if (m == null) continue;
      if (closes[i] < m) {
        signals[i] = { buy_krw: p.amountKRW };
      }
    }
    return signals;
  }

  if (strategy === "grid") {
    const p = params.grid ?? { low: 0, high: 0, grids: 10 };
    if (p.grids < 2 || p.high <= p.low) return signals;
    const initialCash = opts.initialCash ?? 1_000_000;
    const slotKRW = initialCash / p.grids;
    const step = (p.high - p.low) / p.grids;
    const bought = new Array(p.grids).fill(false);

    for (let i = 0; i < candles.length; i++) {
      const price = candles[i].close;
      for (let g = 0; g < p.grids; g++) {
        const buyPrice = p.low + step * g;
        const sellPrice = p.low + step * (g + 1);
        if (!bought[g] && price <= buyPrice) {
          signals[i] = { buy_krw: slotKRW };
          bought[g] = true;
          break;
        }
        if (bought[g] && price >= sellPrice) {
          signals[i] = { sell_qty_frac: 1 / p.grids };
          bought[g] = false;
          break;
        }
      }
    }
    return signals;
  }

  return signals;
}
