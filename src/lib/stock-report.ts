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
// CAN SLIM 7요소 (가격·거래량 데이터만으로 계산 가능한 항목)
// 윌리엄 오닐 기준을 일봉 데이터에 맞춰 단순화. 재무(C·A) 는 DART 연동 시 정확화.
// ===========================================================================

export type CanSlimItem = {
  code: "C" | "A" | "N" | "S" | "L" | "I" | "M";
  label: string;
  pass: boolean | null; // null = 데이터 부족 (재무 필요)
  note: string;
};

export function evaluateCanSlim(candles: Candle[]): CanSlimItem[] {
  const closes = candles.map((c) => c.close);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const last = closes[closes.length - 1] ?? 0;
  const e50 = ema50[ema50.length - 1] ?? last;
  const e200 = ema200[ema200.length - 1] ?? last;

  // N: 52주 고점 8% 이내 (신고가 영역)
  const dist52 = distance52WeekHigh(candles);
  // S: 거래량 비율 (수요)
  const volR = volumeRatio(candles, 50);
  // L: 시장 상대 강도 (12개월 수익률 상위 — 80↑ 이면 PASS 로 가정)
  const ret12 = changePercent(candles, 252);
  // M: 시장 방향 (본 종목 EMA200 위 + 1년 수익 양수)
  const marketUp = last > e200 && ret12 > 0;

  return [
    {
      code: "C",
      label: "Current Earnings (분기 이익 성장)",
      pass: null,
      note: "분기 EPS +25%↑ 기준. 재무 데이터 필요 (DART 연동 시 활성화).",
    },
    {
      code: "A",
      label: "Annual Earnings (연간 이익 성장)",
      pass: null,
      note: "연간 ROE 17%↑ + EPS 3년 연속 성장. 재무 필요.",
    },
    {
      code: "N",
      label: "New High (신고가·신제품)",
      pass: dist52 >= -8,
      note:
        dist52 >= -8
          ? `52주 고점 ${(-dist52).toFixed(1)}% 이내 — 신고가 영역`
          : `52주 고점 ${(-dist52).toFixed(1)}% 아래 — 거리 큼`,
    },
    {
      code: "S",
      label: "Supply & Demand (수요·공급)",
      pass: volR >= 1.5,
      note:
        volR >= 1.5
          ? `최근 거래량 평소의 ${volR.toFixed(2)}배 — 수급 강함`
          : `거래량 ${volR.toFixed(2)}배 — 평소 수준`,
    },
    {
      code: "L",
      label: "Leader or Laggard (주도주 여부)",
      pass: ret12 >= 30,
      note:
        ret12 >= 30
          ? `1년 수익률 +${ret12.toFixed(1)}% — 주도주 수준`
          : `1년 수익률 ${ret12.toFixed(1)}% — 주도주 미달`,
    },
    {
      code: "I",
      label: "Institutional Sponsorship (기관 자금)",
      pass: e50 > e200 && volR >= 1.2,
      note:
        e50 > e200
          ? "EMA50 > EMA200 + 거래량 증가 — 기관 매수 추정"
          : "추세선 정배열 미달 — 기관 자금 약함",
    },
    {
      code: "M",
      label: "Market Direction (시장 방향)",
      pass: marketUp,
      note: marketUp
        ? "본 종목 200일선 위 + 12개월 수익 양수 — 시장 강세"
        : "시장 약세 또는 추세 전환 구간",
    },
  ];
}

// ===========================================================================
// Quant 보조 지표 (가격 데이터로 직접 계산)
// ===========================================================================

export type QuantItem = {
  label: string;
  value: number; // 0~100 스케일
  note: string;
  tone: "good" | "neutral" | "bad";
};

// Z-Score (최근 종가가 60일 평균 대비 몇 표준편차인지)
function zScore60(candles: Candle[]): number {
  if (candles.length < 60) return 0;
  const window = candles.slice(-60).map((c) => c.close);
  const mean = window.reduce((a, b) => a + b, 0) / 60;
  const sd = Math.sqrt(
    window.reduce((s, x) => s + (x - mean) ** 2, 0) / 60,
  );
  if (sd === 0) return 0;
  const last = candles[candles.length - 1].close;
  return (last - mean) / sd;
}

// 허스트 지수 (단순화: R/S 분석 대신 ratio 기반 근사)
function hurstApprox(candles: Candle[]): number {
  if (candles.length < 100) return 0.5;
  const closes = candles.slice(-100).map((c) => c.close);
  const ret = [];
  for (let i = 1; i < closes.length; i++) ret.push(closes[i] / closes[i - 1] - 1);
  let pos = 0;
  for (let i = 1; i < ret.length; i++) {
    if (Math.sign(ret[i]) === Math.sign(ret[i - 1])) pos += 1;
  }
  return 0.3 + (pos / (ret.length - 1)) * 0.6; // 0.3~0.9 범위
}

// 모멘텀 점수 (3·6·12개월 가중 평균)
function momentumScore(candles: Candle[]): number {
  const m1 = changePercent(candles, 21);
  const m3 = changePercent(candles, 63);
  const m6 = changePercent(candles, 126);
  const m12 = changePercent(candles, 252);
  // 가중치: 12개월 40% + 6개월 30% + 3개월 20% + 1개월 10%
  const score = m12 * 0.4 + m6 * 0.3 + m3 * 0.2 + m1 * 0.1;
  return Math.max(0, Math.min(100, 50 + score / 2));
}

// 변동성 대비 수익 효율 (단순 Sharpe-like)
function efficiencyScore(candles: Candle[]): number {
  if (candles.length < 252) return 50;
  const ret12 = changePercent(candles, 252);
  const atrPct =
    candles.length === 0
      ? 0
      : (atr(candles, 14) / candles[candles.length - 1].close) * 100;
  if (atrPct === 0) return 50;
  const eff = ret12 / atrPct;
  return Math.max(0, Math.min(100, 50 + eff * 5));
}

export function evaluateQuant(candles: Candle[]): QuantItem[] {
  const mom = momentumScore(candles);
  const mdd = maxDrawdown(candles.slice(-252));
  const z = zScore60(candles);
  const h = hurstApprox(candles);
  const eff = efficiencyScore(candles);
  const volR = volumeRatio(candles, 20);

  return [
    {
      label: "모멘텀 점수 (12·6·3·1개월 가중)",
      value: Math.round(mom),
      note:
        mom >= 70
          ? "강한 모멘텀"
          : mom >= 50
            ? "양호"
            : "약함",
      tone: mom >= 70 ? "good" : mom >= 50 ? "neutral" : "bad",
    },
    {
      label: "낙폭 위험도 (1년 MDD)",
      value: Math.round(Math.max(0, 100 - mdd)),
      note: `1년 최대 낙폭 ${mdd.toFixed(1)}%`,
      tone: mdd < 20 ? "good" : mdd < 40 ? "neutral" : "bad",
    },
    {
      label: "통계적 Z-Score (60일)",
      value: Math.round(50 + z * 15),
      note:
        z > 2
          ? "60일 평균 대비 +2σ 초과 — 과매수 가능"
          : z < -2
            ? "60일 평균 대비 -2σ 이하 — 과매도 가능"
            : `평균 대비 ${z.toFixed(2)}σ`,
      tone: Math.abs(z) > 2 ? "bad" : "neutral",
    },
    {
      label: "허스트 지수 (추세 지속성)",
      value: Math.round(h * 100),
      note:
        h > 0.6
          ? "강한 추세 지속성 — 추세 매매 유리"
          : h < 0.4
            ? "평균 회귀 경향 — 박스권 매매 유리"
            : "혼합 — 명확한 패턴 없음",
      tone: "neutral",
    },
    {
      label: "변동성 대비 효율",
      value: Math.round(eff),
      note: eff >= 60 ? "수익 대비 변동성 효율 우수" : "변동성 대비 수익 낮음",
      tone: eff >= 60 ? "good" : eff >= 40 ? "neutral" : "bad",
    },
    {
      label: "수급 강도 (20일 거래량 비율)",
      value: Math.round(Math.min(100, volR * 40)),
      note: `현재 거래량 평소의 ${volR.toFixed(2)}배`,
      tone: volR >= 1.5 ? "good" : volR >= 1 ? "neutral" : "bad",
    },
  ];
}

// ===========================================================================
// 단순 백테스트 미리보기
// 보고서 페이지에서 본인 백테스트 도구를 열기 전 빠른 감을 잡기 위함.
// 본격 백테스트는 /backtest 에서 수행.
// ===========================================================================

export type BacktestPreview = {
  strategy: string;
  description: string;
  trades: number;
  winRate: number; // 0~100
  totalReturn: number; // %
  buyHoldReturn: number; // %
  maxDrawdown: number; // %
  verdict: "good" | "neutral" | "bad";
};

// SMA 골든/데드 크로스 (50/200) 백테스트 — 최근 252일 기준
function backtestSmaCross(candles: Candle[]): BacktestPreview {
  const closes = candles.map((c) => c.close);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  // 최근 252일 윈도우
  const data = candles.slice(-252);
  const startIdx = candles.length - data.length;
  let position: "in" | "out" = "out";
  let entryPrice = 0;
  let cash = 100;
  const trades: { ret: number }[] = [];

  for (let i = 1; i < data.length; i++) {
    const idx = startIdx + i;
    const f = sma50[idx];
    const s = sma200[idx];
    const pf = sma50[idx - 1];
    const ps = sma200[idx - 1];
    if (!Number.isFinite(f) || !Number.isFinite(s)) continue;

    // 골든 크로스: 매수
    if (position === "out" && pf <= ps && f > s) {
      position = "in";
      entryPrice = data[i].close;
    }
    // 데드 크로스: 매도
    else if (position === "in" && pf >= ps && f < s) {
      const ret = ((data[i].close - entryPrice) / entryPrice) * 100;
      trades.push({ ret });
      cash *= 1 + ret / 100;
      position = "out";
    }
  }
  // 보유 중이면 마지막 가격으로 청산
  if (position === "in") {
    const ret = ((data[data.length - 1].close - entryPrice) / entryPrice) * 100;
    trades.push({ ret });
    cash *= 1 + ret / 100;
  }

  const wins = trades.filter((t) => t.ret > 0).length;
  const winRate = trades.length === 0 ? 0 : (wins / trades.length) * 100;
  const totalReturn = cash - 100;
  const buyHoldReturn = changePercent(data, data.length - 1);
  const mdd = maxDrawdown(data);

  const verdict: BacktestPreview["verdict"] =
    totalReturn > buyHoldReturn && totalReturn > 0
      ? "good"
      : totalReturn > 0
        ? "neutral"
        : "bad";

  return {
    strategy: "SMA 50/200 골든·데드 크로스",
    description: "50일 이동평균이 200일 이동평균 위로 올라가면 매수, 아래로 내려가면 매도. 가장 고전적인 추세 추종 전략.",
    trades: trades.length,
    winRate,
    totalReturn,
    buyHoldReturn,
    maxDrawdown: mdd,
    verdict,
  };
}

// RSI 반전 (RSI 30 미만 매수, 70 이상 매도) — 최근 252일 기준
function backtestRsiMeanRevert(candles: Candle[]): BacktestPreview {
  const data = candles.slice(-252);
  let position: "in" | "out" = "out";
  let entryPrice = 0;
  let cash = 100;
  const trades: { ret: number }[] = [];

  for (let i = 14; i < data.length; i++) {
    const slice = candles.slice(candles.length - data.length + i - 14, candles.length - data.length + i + 1);
    const r = rsi(slice, 14);
    if (position === "out" && r < 30) {
      position = "in";
      entryPrice = data[i].close;
    } else if (position === "in" && r > 70) {
      const ret = ((data[i].close - entryPrice) / entryPrice) * 100;
      trades.push({ ret });
      cash *= 1 + ret / 100;
      position = "out";
    }
  }
  if (position === "in") {
    const ret = ((data[data.length - 1].close - entryPrice) / entryPrice) * 100;
    trades.push({ ret });
    cash *= 1 + ret / 100;
  }

  const wins = trades.filter((t) => t.ret > 0).length;
  const winRate = trades.length === 0 ? 0 : (wins / trades.length) * 100;
  const totalReturn = cash - 100;
  const buyHoldReturn = changePercent(data, data.length - 1);
  const mdd = maxDrawdown(data);

  const verdict: BacktestPreview["verdict"] =
    totalReturn > buyHoldReturn && totalReturn > 0
      ? "good"
      : totalReturn > 0
        ? "neutral"
        : "bad";

  return {
    strategy: "RSI 30↓ 매수 / 70↑ 매도",
    description: "RSI 가 30 아래로 떨어지면 매수, 70 위로 올라가면 매도. 평균 회귀 전략.",
    trades: trades.length,
    winRate,
    totalReturn,
    buyHoldReturn,
    maxDrawdown: mdd,
    verdict,
  };
}

export function evaluateBacktests(candles: Candle[]): BacktestPreview[] {
  if (candles.length < 252) return [];
  return [backtestSmaCross(candles), backtestRsiMeanRevert(candles)];
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

  // CAN SLIM·Quant·백테스트
  canSlim: CanSlimItem[];
  quant: QuantItem[];
  backtests: BacktestPreview[];

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
    canSlim: evaluateCanSlim(candles),
    quant: evaluateQuant(candles),
    backtests: evaluateBacktests(candles),
    candles,
  };
}
