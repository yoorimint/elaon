// 종목 보고서용 기술·재무 지표 계산 유틸.
// 야후 일봉 데이터를 입력받아 모든 지표를 순수 함수로 계산.
// 외부 API 추가 호출 없이 가격·거래량 시계열만으로 동작.

import type { Candle } from "./upbit";

export type IndicatorScore = {
  value: number;
  score: number; // 0~100 점수 환산
  interpretation: string;
  tone: "good" | "neutral" | "bad";
};

// ===========================================================================
// 기본 통계
// ===========================================================================

export function lastClose(candles: Candle[]): number {
  if (candles.length === 0) return 0;
  return candles[candles.length - 1].close;
}

export function changePercent(candles: Candle[], days: number): number {
  if (candles.length < days + 1) return 0;
  const last = candles[candles.length - 1].close;
  const prev = candles[candles.length - 1 - days].close;
  if (prev === 0) return 0;
  return ((last - prev) / prev) * 100;
}

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    out.push(sum / period);
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out: number[] = [];
  const k = 2 / (period + 1);
  let prev = NaN;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (i === 0) {
      prev = v;
      out.push(v);
      continue;
    }
    prev = v * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

// ===========================================================================
// 추세·모멘텀 지표
// ===========================================================================

export function rsi(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].close - candles[i - 1].close;
    if (d > 0) gains += d;
    else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].close - candles[i - 1].close;
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function adx(candles: Candle[], period = 14): number {
  if (candles.length < period * 2) return 0;
  const tr: number[] = [0];
  const pdm: number[] = [0];
  const ndm: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    const t = Math.max(
      c.high - c.low,
      Math.abs(c.high - p.close),
      Math.abs(c.low - p.close),
    );
    const upMove = c.high - p.high;
    const downMove = p.low - c.low;
    tr.push(t);
    pdm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    ndm.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  const smooth = (arr: number[]) => {
    const out: number[] = [];
    let sum = arr.slice(1, period + 1).reduce((a, b) => a + b, 0);
    out[period] = sum;
    for (let i = period + 1; i < arr.length; i++) {
      sum = sum - sum / period + arr[i];
      out[i] = sum;
    }
    return out;
  };
  const trS = smooth(tr);
  const pdmS = smooth(pdm);
  const ndmS = smooth(ndm);
  const dx: number[] = [];
  for (let i = period; i < candles.length; i++) {
    const pdi = (100 * (pdmS[i] ?? 0)) / (trS[i] || 1);
    const ndi = (100 * (ndmS[i] ?? 0)) / (trS[i] || 1);
    const sum = pdi + ndi;
    dx.push(sum === 0 ? 0 : (100 * Math.abs(pdi - ndi)) / sum);
  }
  if (dx.length < period) return 0;
  const tail = dx.slice(-period);
  return tail.reduce((a, b) => a + b, 0) / tail.length;
}

export function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    trs.push(
      Math.max(
        c.high - c.low,
        Math.abs(c.high - p.close),
        Math.abs(c.low - p.close),
      ),
    );
  }
  let val = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    val = (val * (period - 1) + trs[i]) / period;
  }
  return val;
}

export function vwap(candles: Candle[]): number {
  if (candles.length === 0) return 0;
  let pv = 0;
  let v = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    pv += tp * c.volume;
    v += c.volume;
  }
  return v === 0 ? candles[candles.length - 1].close : pv / v;
}

export function maxDrawdown(candles: Candle[]): number {
  if (candles.length === 0) return 0;
  let peak = candles[0].close;
  let mdd = 0;
  for (const c of candles) {
    if (c.close > peak) peak = c.close;
    const dd = (peak - c.close) / peak;
    if (dd > mdd) mdd = dd;
  }
  return mdd * 100;
}

export function bollingerWidth(candles: Candle[], period = 20): number {
  if (candles.length < period) return 0;
  const closes = candles.slice(-period).map((c) => c.close);
  const mean = closes.reduce((a, b) => a + b, 0) / period;
  const variance = closes.reduce((s, x) => s + (x - mean) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return (sd * 4) / mean;
}

export function distance52WeekHigh(candles: Candle[]): number {
  if (candles.length === 0) return 0;
  const window = candles.slice(-252);
  const high = Math.max(...window.map((c) => c.high));
  const last = candles[candles.length - 1].close;
  return ((last - high) / high) * 100;
}

export function volumeRatio(candles: Candle[], period = 20): number {
  if (candles.length < period + 1) return 1;
  const recent = candles.slice(-period);
  const avg = recent.reduce((s, c) => s + c.volume, 0) / period;
  const last = candles[candles.length - 1].volume;
  if (avg === 0) return 1;
  return last / avg;
}

// ===========================================================================
// 진입 타이밍 4축 (추세·모멘텀·변동성·수급) 종합 평가
// ===========================================================================

export type EntrySignal = {
  trend: { score: number; note: string };
  momentum: { score: number; note: string };
  volatility: { score: number; note: string };
  liquidity: { score: number; note: string };
  total: number;
  stars: number;
  verdict: string;
};

export function evaluateEntry(candles: Candle[]): EntrySignal {
  const closes = candles.map((c) => c.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const last = closes[closes.length - 1] ?? 0;
  const e20 = ema20[ema20.length - 1] ?? last;
  const e50 = ema50[ema50.length - 1] ?? last;
  const e200 = ema200[ema200.length - 1] ?? last;

  // 1. 추세 (정배열 + 200일선 위)
  let trendScore = 0;
  if (last > e20) trendScore += 1;
  if (e20 > e50) trendScore += 1;
  if (e50 > e200) trendScore += 1;
  if (last > e200) trendScore += 1;
  const ch3m = changePercent(candles, 63);
  if (ch3m > 0) trendScore += 1;
  const trendNote =
    trendScore >= 5
      ? "완벽한 정배열 강세 추세"
      : trendScore >= 3
        ? "상승 추세"
        : trendScore >= 1
          ? "혼조"
          : "약세 추세";

  // 2. 모멘텀 (RSI + 52주 거리 + 단기 수익)
  const rsiVal = rsi(candles, 14);
  const dist52 = distance52WeekHigh(candles);
  let momScore = 0;
  if (rsiVal >= 50 && rsiVal <= 70) momScore += 2;
  else if (rsiVal > 70) momScore += 1;
  else if (rsiVal < 30) momScore += 1;
  if (dist52 >= -10) momScore += 2;
  else if (dist52 >= -20) momScore += 1;
  if (changePercent(candles, 20) > 0) momScore += 1;
  const momNote =
    momScore >= 4
      ? "강한 모멘텀"
      : momScore >= 2
        ? "양호한 모멘텀"
        : "약한 모멘텀";

  // 3. 변동성 (ATR · 볼린저 폭)
  const atrVal = atr(candles, 14);
  const atrPct = last === 0 ? 0 : (atrVal / last) * 100;
  const bw = bollingerWidth(candles, 20) * 100;
  let volScore = 0;
  if (atrPct < 3) volScore += 2;
  else if (atrPct < 5) volScore += 1;
  if (bw < 10) volScore += 2;
  else if (bw < 20) volScore += 1;
  if (atrPct > 0 && atrPct < 6) volScore += 1;
  const volNote =
    volScore >= 4
      ? "변동성 안정"
      : volScore >= 2
        ? "보통 변동성"
        : "변동성 큼";

  // 4. 수급 (거래량 비율 + VWAP)
  const volRatio = volumeRatio(candles, 20);
  const vwapVal = vwap(candles.slice(-20));
  let liqScore = 0;
  if (volRatio >= 1.5) liqScore += 2;
  else if (volRatio >= 1) liqScore += 1;
  if (last > vwapVal) liqScore += 2;
  if (changePercent(candles, 5) > 0) liqScore += 1;
  const liqNote =
    liqScore >= 4
      ? "강한 매수세"
      : liqScore >= 2
        ? "수급 양호"
        : "수급 약함";

  const total = trendScore + momScore + volScore + liqScore;
  const max = 5 + 4 + 5 + 5; // 19
  const stars = Math.round((total / max) * 5);
  const verdict =
    stars >= 4
      ? "강한 진입 신호"
      : stars >= 3
        ? "조건부 진입 검토"
        : stars >= 2
          ? "관망"
          : "진입 보류";

  return {
    trend: { score: trendScore, note: trendNote },
    momentum: { score: momScore, note: momNote },
    volatility: { score: volScore, note: volNote },
    liquidity: { score: liqScore, note: liqNote },
    total,
    stars,
    verdict,
  };
}

// ===========================================================================
// 종합 보고서 데이터
// ===========================================================================

export type StockReport = {
  symbol: string; // "005930.KS"
  ticker: string; // "005930"
  exchange: "KOSPI" | "KOSDAQ" | "OTHER";
  name: string;
  subtitle?: string;
  lastUpdate: string; // ISO 날짜

  // 가격·등락
  price: number;
  change1d: number;
  change1w: number;
  change1m: number;
  change3m: number;
  change12m: number;
  high52w: number;
  low52w: number;
  distFrom52wHigh: number;

  // 기술 지표
  ema20: number;
  ema50: number;
  ema200: number;
  rsi14: number;
  adx14: number;
  atrPct: number;
  vwap20: number;
  vwapDistPct: number;
  volRatio20: number;
  bollWidth: number;
  mdd1y: number;

  // 진입 신호
  entry: EntrySignal;

  // 캔들 (차트용)
  candles: Candle[];
};

export function buildStockReport(params: {
  symbol: string;
  name: string;
  subtitle?: string;
  candles: Candle[];
}): StockReport {
  const { symbol, name, subtitle, candles } = params;
  const ticker = symbol.replace(/\.(KS|KQ)$/, "");
  const exchange: StockReport["exchange"] = symbol.endsWith(".KS")
    ? "KOSPI"
    : symbol.endsWith(".KQ")
      ? "KOSDAQ"
      : "OTHER";

  const closes = candles.map((c) => c.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const last = closes[closes.length - 1] ?? 0;

  const window52 = candles.slice(-252);
  const high52 = window52.length > 0 ? Math.max(...window52.map((c) => c.high)) : last;
  const low52 = window52.length > 0 ? Math.min(...window52.map((c) => c.low)) : last;

  const atrVal = atr(candles, 14);
  const atrPct = last === 0 ? 0 : (atrVal / last) * 100;
  const vwap20 = vwap(candles.slice(-20));
  const vwapDistPct = vwap20 === 0 ? 0 : ((last - vwap20) / vwap20) * 100;

  return {
    symbol,
    ticker,
    exchange,
    name,
    subtitle,
    lastUpdate: new Date().toISOString().slice(0, 10),
    price: last,
    change1d: changePercent(candles, 1),
    change1w: changePercent(candles, 5),
    change1m: changePercent(candles, 21),
    change3m: changePercent(candles, 63),
    change12m: changePercent(candles, 252),
    high52w: high52,
    low52w: low52,
    distFrom52wHigh: distance52WeekHigh(candles),
    ema20: ema20[ema20.length - 1] ?? last,
    ema50: ema50[ema50.length - 1] ?? last,
    ema200: ema200[ema200.length - 1] ?? last,
    rsi14: rsi(candles, 14),
    adx14: adx(candles, 14),
    atrPct,
    vwap20,
    vwapDistPct,
    volRatio20: volumeRatio(candles, 20),
    bollWidth: bollingerWidth(candles, 20) * 100,
    mdd1y: maxDrawdown(candles.slice(-252)),
    entry: evaluateEntry(candles),
    candles,
  };
}
