// 초보자용 원클릭 프리셋. /backtest?preset=btc-rsi-2y 처럼 URL 로 넘어오면
// 백테스트 페이지에서 applyConfig 로 적용된다. 홈 화면의 "처음이신가요"
// 카드들이 이 목록을 그대로 노출한다.

import { defaultCondition, type Condition } from "./diy-strategy";
import type { BacktestConfig } from "./user-strategies";
import type { StrategyParams } from "./strategies";
import type { Timeframe } from "./upbit";

export type BeginnerPreset = {
  id: string;
  title: string; // "BTC 초보용 RSI 전략"
  blurb: string; // 한 줄 설명
  badge: string; // 뱃지 라벨 (난이도/특성)
  market: string;
  strategy: BacktestConfig["strategy"];
  days: number;
  rangePreset: string;
};

export const BEGINNER_PRESETS: BeginnerPreset[] = [
  {
    id: "btc-buyhold-2y",
    title: "비트코인 2년 묻어두기",
    blurb: "가장 단순한 전략. 시작일에 사서 2년 내내 들고만 있기. 다른 전략과의 비교 기준선.",
    badge: "★ 가장 쉬움",
    market: "KRW-BTC",
    strategy: "buy_hold",
    days: 730,
    rangePreset: "730d",
  },
  {
    id: "btc-rsi-2y",
    title: "비트코인 RSI 30/70 2년",
    blurb: "과매도(RSI<30)일 때 사고, 과매수(RSI>70)일 때 파는 클래식 전략. 반등 노리는 매매.",
    badge: "초급",
    market: "KRW-BTC",
    strategy: "rsi",
    days: 730,
    rangePreset: "730d",
  },
  {
    id: "eth-ma-1y",
    title: "이더리움 이평 20/60 교차 1년",
    blurb: "단기 이평이 장기 이평을 뚫고 올라가면 사고, 내려가면 파는 추세 추종 전략.",
    badge: "초급",
    market: "KRW-ETH",
    strategy: "ma_cross",
    days: 365,
    rangePreset: "365d",
  },
  {
    id: "sol-bb-1y",
    title: "솔라나 볼린저밴드 1년",
    blurb: "가격이 밴드 하단 터치할 때 사고, 상단 터치할 때 파는 변동성 역추세 전략.",
    badge: "중급",
    market: "KRW-SOL",
    strategy: "bollinger",
    days: 365,
    rangePreset: "365d",
  },
];

function ymd(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 프리셋 id 로부터 BacktestConfig 를 조립한다. 전략별 파라미터는 통상적인
// 기본값을 쓰고, 프리셋에서 중요한 것만 override.
function daysToRangePreset(days: number): string {
  switch (days) {
    case 7: return "7d";
    case 30: return "30d";
    case 90: return "90d";
    case 180: return "180d";
    case 365: return "365d";
    case 730: return "730d";
    default: return "custom";
  }
}

// 전략별 디폴트 파라미터 (기존 buildPresetConfig 와 일치). 복제 시에는 여기
// 위에 공유 기록의 params 를 얹어서 실제 공유된 설정을 그대로 재현한다.
function defaultConfigShape(): Omit<
  BacktestConfig,
  "market" | "timeframe" | "strategy" | "rangePreset" | "dateFrom" | "dateTo"
> {
  return {
    shortMa: 20,
    longMa: 60,
    rsiPeriod: 14,
    rsiLow: 30,
    rsiHigh: 70,
    bbPeriod: 20,
    bbStddev: 2,
    bbTouch: "close",
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    breakoutK: 0.5,
    stochPeriod: 14,
    stochSmooth: 3,
    stochLow: 20,
    stochHigh: 80,
    ichimokuConv: 9,
    ichimokuBase: 26,
    ichimokuLag: 52,
    dcaInterval: 7,
    dcaAmount: 100_000,
    maDcaMaPeriod: 60,
    gridLow: 0,
    gridHigh: 0,
    gridCount: 10,
    gridMode: "geom",
    customBuy: [defaultCondition()],
    customSell: [],
    stopLoss: 0,
    takeProfit: 0,
    initialCash: 1_000_000,
    feeBps: 5,
    positionSizePct: 100,
    martingaleFactor: 1,
    slippageBps: 0,
    walkForward: false,
    rebalanceTP: 10,
    rebalanceDrop: 5,
  };
}

// 공유된 백테스트(`/r/[slug]`)의 저장값을 /backtest 폼이 쓰는 평평한
// BacktestConfig 로 변환한다. params 는 StrategyParams 중첩 구조(예:
// { ma_cross: { short, long } })로 저장돼 있어 각 전략별로 풀어서 얹는다.
// rangePreset 은 days → "7d"/"365d"/... 역매핑, 매치 안 되면 "custom" 으로.
export function buildCloneConfig(args: {
  market: string;
  timeframe: string | null;
  strategy: BacktestConfig["strategy"];
  params: Record<string, unknown>;
  days: number;
  initialCash: number;
  feeBps: number;
  customBuy?: Condition[] | null;
  customSell?: Condition[] | null;
  stopLossPct?: number | null;
  takeProfitPct?: number | null;
}): BacktestConfig {
  const base = defaultConfigShape();
  const p = args.params as Partial<StrategyParams>;

  if (p.ma_cross) {
    if (typeof p.ma_cross.short === "number") base.shortMa = p.ma_cross.short;
    if (typeof p.ma_cross.long === "number") base.longMa = p.ma_cross.long;
  }
  if (p.rsi) {
    if (typeof p.rsi.period === "number") base.rsiPeriod = p.rsi.period;
    if (typeof p.rsi.oversold === "number") base.rsiLow = p.rsi.oversold;
    if (typeof p.rsi.overbought === "number") base.rsiHigh = p.rsi.overbought;
  }
  if (p.bollinger) {
    if (typeof p.bollinger.period === "number") base.bbPeriod = p.bollinger.period;
    if (typeof p.bollinger.stddev === "number") base.bbStddev = p.bollinger.stddev;
    if (p.bollinger.touch === "wick" || p.bollinger.touch === "close") {
      base.bbTouch = p.bollinger.touch;
    }
  }
  if (p.macd) {
    if (typeof p.macd.fast === "number") base.macdFast = p.macd.fast;
    if (typeof p.macd.slow === "number") base.macdSlow = p.macd.slow;
    if (typeof p.macd.signal === "number") base.macdSignal = p.macd.signal;
  }
  if (p.breakout && typeof p.breakout.k === "number") {
    base.breakoutK = p.breakout.k;
  }
  if (p.stoch) {
    if (typeof p.stoch.period === "number") base.stochPeriod = p.stoch.period;
    if (typeof p.stoch.smooth === "number") base.stochSmooth = p.stoch.smooth;
    if (typeof p.stoch.oversold === "number") base.stochLow = p.stoch.oversold;
    if (typeof p.stoch.overbought === "number") base.stochHigh = p.stoch.overbought;
  }
  if (p.ichimoku) {
    if (typeof p.ichimoku.conversion === "number") base.ichimokuConv = p.ichimoku.conversion;
    if (typeof p.ichimoku.base === "number") base.ichimokuBase = p.ichimoku.base;
    if (typeof p.ichimoku.lagging === "number") base.ichimokuLag = p.ichimoku.lagging;
  }
  if (p.dca) {
    if (typeof p.dca.intervalDays === "number") base.dcaInterval = p.dca.intervalDays;
    if (typeof p.dca.amountKRW === "number") base.dcaAmount = p.dca.amountKRW;
  }
  if (p.ma_dca) {
    if (typeof p.ma_dca.intervalDays === "number") base.dcaInterval = p.ma_dca.intervalDays;
    if (typeof p.ma_dca.amountKRW === "number") base.dcaAmount = p.ma_dca.amountKRW;
    if (typeof p.ma_dca.maPeriod === "number") base.maDcaMaPeriod = p.ma_dca.maPeriod;
  }
  if (p.grid) {
    if (typeof p.grid.low === "number") base.gridLow = p.grid.low;
    if (typeof p.grid.high === "number") base.gridHigh = p.grid.high;
    if (typeof p.grid.grids === "number") base.gridCount = p.grid.grids;
    if (p.grid.mode === "arith" || p.grid.mode === "geom") base.gridMode = p.grid.mode;
  }
  if (p.rebalance) {
    if (typeof p.rebalance.takeProfitPct === "number") base.rebalanceTP = p.rebalance.takeProfitPct;
    if (typeof p.rebalance.rebuyDropPct === "number") base.rebalanceDrop = p.rebalance.rebuyDropPct;
  }

  if (args.customBuy && args.customBuy.length > 0) base.customBuy = args.customBuy;
  if (args.customSell && args.customSell.length > 0) base.customSell = args.customSell;
  if (typeof args.stopLossPct === "number" && args.stopLossPct > 0) base.stopLoss = args.stopLossPct;
  if (typeof args.takeProfitPct === "number" && args.takeProfitPct > 0) base.takeProfit = args.takeProfitPct;

  base.initialCash = args.initialCash;
  base.feeBps = args.feeBps;

  return {
    market: args.market,
    timeframe: (args.timeframe ?? "1d") as Timeframe,
    strategy: args.strategy,
    rangePreset: daysToRangePreset(args.days),
    dateFrom: ymd(-args.days),
    dateTo: ymd(0),
    ...base,
  };
}

export function buildPresetConfig(id: string): BacktestConfig | null {
  const preset = BEGINNER_PRESETS.find((p) => p.id === id);
  if (!preset) return null;

  return {
    market: preset.market,
    timeframe: "1d",
    strategy: preset.strategy,
    rangePreset: preset.rangePreset,
    dateFrom: ymd(-preset.days),
    dateTo: ymd(0),
    shortMa: 20,
    longMa: 60,
    rsiPeriod: 14,
    rsiLow: 30,
    rsiHigh: 70,
    bbPeriod: 20,
    bbStddev: 2,
    bbTouch: "close",
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    breakoutK: 0.5,
    stochPeriod: 14,
    stochSmooth: 3,
    stochLow: 20,
    stochHigh: 80,
    ichimokuConv: 9,
    ichimokuBase: 26,
    ichimokuLag: 52,
    dcaInterval: 7,
    dcaAmount: 100_000,
    maDcaMaPeriod: 60,
    gridLow: 0,
    gridHigh: 0,
    gridCount: 10,
    gridMode: "geom",
    customBuy: [defaultCondition()],
    customSell: [],
    stopLoss: 0,
    takeProfit: 0,
    initialCash: 1_000_000,
    feeBps: 5,
    positionSizePct: 100,
    martingaleFactor: 1,
    slippageBps: 0,
    walkForward: false,
    rebalanceTP: 10,
    rebalanceDrop: 5,
  };
}
