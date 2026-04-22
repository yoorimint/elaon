// 초보자용 원클릭 프리셋. /backtest?preset=btc-rsi-2y 처럼 URL 로 넘어오면
// 백테스트 페이지에서 applyConfig 로 적용된다. 홈 화면의 "처음이신가요"
// 카드들이 이 목록을 그대로 노출한다.

import { defaultCondition, type Condition } from "./diy-strategy";
import type { BacktestConfig } from "./user-strategies";
import type { StrategyParams } from "./strategies";
import type { Timeframe } from "./upbit";

export type PresetCategory = "crypto" | "stock" | "futures";

export type BeginnerPreset = {
  id: string;
  title: string; // "BTC 초보용 RSI 전략"
  blurb: string; // 한 줄 설명
  badge: string; // 뱃지 라벨 (기존 호환용 — 카드엔 더 이상 직접 노출 안 함)
  category: PresetCategory;
  difficulty: 1 | 2 | 3 | 4 | 5; // 1 가장 쉬움 → 5 고급
  forWhom: string; // "이런 분께" 한 줄
  market: string;
  strategy: BacktestConfig["strategy"];
  days: number;
  rangePreset: string;
  // true 면 "처음이신가요" 카드에선 숨기고, "오늘의 신호" 보드 스캔 풀로만 쓰임.
  // 보드가 조건(10%+ & 보유 이김) 통과하는 후보를 찾을 확률을 높이는 용도.
  hidden?: boolean;
};

export const BEGINNER_PRESETS: BeginnerPreset[] = [
  // ── 코인 ─────────────────────────────────────────────
  {
    id: "btc-buyhold-2y",
    title: "비트코인 2년 묻어두기",
    blurb: "가장 단순한 전략. 시작일에 사서 2년 내내 들고만 있기. 다른 전략과의 비교 기준선.",
    badge: "★ 가장 쉬움",
    category: "crypto",
    difficulty: 1,
    forWhom: "매매 타이밍 고민하기 싫은 장기 투자자",
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
    category: "crypto",
    difficulty: 2,
    forWhom: "급락 때 줍고 급등 때 털고 싶은 사람",
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
    category: "crypto",
    difficulty: 2,
    forWhom: "추세 따라 타는 게 편한 사람",
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
    category: "crypto",
    difficulty: 3,
    forWhom: "변동성 큰 구간에서 단타 돌려보고 싶은 사람",
    market: "KRW-SOL",
    strategy: "bollinger",
    days: 365,
    rangePreset: "365d",
  },

  // ── 주식 ─────────────────────────────────────────────
  {
    id: "aapl-buyhold-2y",
    title: "애플 2년 묻어두기",
    blurb: "미국 대표 우량주를 2년간 그냥 들고 있기. 주식 초보의 가장 쉬운 출발점.",
    badge: "★ 가장 쉬움",
    category: "stock",
    difficulty: 1,
    forWhom: "미국 우량주를 꾸준히 보유하고 싶은 사람",
    market: "yahoo:AAPL",
    strategy: "buy_hold",
    days: 730,
    rangePreset: "730d",
  },
  {
    id: "samsung-ma-1y",
    title: "삼성전자 이평 20/60 1년",
    blurb: "국내 대표주를 이동평균 크로스 추세 추종으로 1년 돌려보는 전략.",
    badge: "초급",
    category: "stock",
    difficulty: 2,
    forWhom: "국내 우량주에 추세 매매를 시도해보고 싶은 사람",
    market: "yahoo:005930.KS",
    strategy: "ma_cross",
    days: 365,
    rangePreset: "365d",
  },
  {
    id: "qqq-buyhold-2y",
    title: "QQQ 2년 묻어두기",
    blurb: "미국 나스닥 100 ETF 를 2년 보유. 개별주 고민 없이 지수에 베팅.",
    badge: "★ 가장 쉬움",
    category: "stock",
    difficulty: 1,
    forWhom: "개별 종목 고르기 싫은 분산투자자",
    market: "yahoo:QQQ",
    strategy: "buy_hold",
    days: 730,
    rangePreset: "730d",
  },

  // ── 선물 ─────────────────────────────────────────────
  {
    id: "btcfut-ma-1y",
    title: "BTC 선물 이평 20/60 1년",
    blurb: "OKX 비트코인 영구선물에 이동평균 추세 추종. 현물보다 변동성 크고 방향 맞추기 어려움.",
    badge: "중급",
    category: "futures",
    difficulty: 3,
    forWhom: "선물 레버리지 전에 전략부터 검증하려는 사람",
    market: "okx_fut:BTC-USDT-SWAP",
    strategy: "ma_cross",
    days: 365,
    rangePreset: "365d",
  },
  {
    id: "solfut-rsi-1y",
    title: "SOL 선물 RSI 1년",
    blurb: "솔라나 영구선물에 RSI 역추세. 변동성 큰 알트 선물 구간에서 반등 노리기.",
    badge: "고급",
    category: "futures",
    difficulty: 4,
    forWhom: "선물 변동성 써본 경험 있는 트레이더",
    market: "okx_fut:SOL-USDT-SWAP",
    strategy: "rsi",
    days: 365,
    rangePreset: "365d",
  },

  // ── 히든 (오늘의 신호 보드 스캔 풀 전용) ──────────────
  // 아래는 "처음이신가요" 섹션엔 안 뜨고, /api/signals 에 실제 백테스트를
  // 돌려서 조건(수익 10%+ 이면서 보유 이김) 통과하는 것만 홈 보드에 노출.
  // hidden 덕에 beginner 그리드 혼잡 없이 후보 풀만 넓어진다.
  { id: "btc-ma-2y", title: "BTC 이평 20/60 2년", blurb: "비트코인에 이동평균 교차 추세추종 2년.", badge: "", category: "crypto", difficulty: 2, forWhom: "", market: "KRW-BTC", strategy: "ma_cross", days: 730, rangePreset: "730d", hidden: true },
  { id: "btc-bb-1y", title: "BTC 볼린저밴드 1년", blurb: "비트코인에 볼린저밴드 역추세 1년.", badge: "", category: "crypto", difficulty: 3, forWhom: "", market: "KRW-BTC", strategy: "bollinger", days: 365, rangePreset: "365d", hidden: true },
  { id: "btc-macd-1y", title: "BTC MACD 1년", blurb: "비트코인 MACD 추세 1년.", badge: "", category: "crypto", difficulty: 3, forWhom: "", market: "KRW-BTC", strategy: "macd", days: 365, rangePreset: "365d", hidden: true },
  { id: "eth-rsi-2y", title: "ETH RSI 2년", blurb: "이더리움 RSI 역추세 2년.", badge: "", category: "crypto", difficulty: 2, forWhom: "", market: "KRW-ETH", strategy: "rsi", days: 730, rangePreset: "730d", hidden: true },
  { id: "eth-bb-1y", title: "ETH 볼린저밴드 1년", blurb: "이더리움 볼린저밴드 1년.", badge: "", category: "crypto", difficulty: 3, forWhom: "", market: "KRW-ETH", strategy: "bollinger", days: 365, rangePreset: "365d", hidden: true },
  { id: "sol-rsi-2y", title: "SOL RSI 2년", blurb: "솔라나 RSI 역추세 2년.", badge: "", category: "crypto", difficulty: 3, forWhom: "", market: "KRW-SOL", strategy: "rsi", days: 730, rangePreset: "730d", hidden: true },
  { id: "sol-ma-1y", title: "SOL 이평 20/60 1년", blurb: "솔라나 이동평균 교차 1년.", badge: "", category: "crypto", difficulty: 3, forWhom: "", market: "KRW-SOL", strategy: "ma_cross", days: 365, rangePreset: "365d", hidden: true },
  { id: "aapl-ma-1y", title: "애플 이평 20/60 1년", blurb: "애플 이동평균 교차 1년.", badge: "", category: "stock", difficulty: 2, forWhom: "", market: "yahoo:AAPL", strategy: "ma_cross", days: 365, rangePreset: "365d", hidden: true },
  { id: "nvda-ma-1y", title: "엔비디아 이평 20/60 1년", blurb: "엔비디아 이동평균 교차 1년.", badge: "", category: "stock", difficulty: 2, forWhom: "", market: "yahoo:NVDA", strategy: "ma_cross", days: 365, rangePreset: "365d", hidden: true },
  { id: "tsla-rsi-1y", title: "테슬라 RSI 1년", blurb: "테슬라 RSI 역추세 1년.", badge: "", category: "stock", difficulty: 3, forWhom: "", market: "yahoo:TSLA", strategy: "rsi", days: 365, rangePreset: "365d", hidden: true },
  { id: "qqq-ma-1y", title: "QQQ 이평 20/60 1년", blurb: "QQQ ETF 이동평균 교차 1년.", badge: "", category: "stock", difficulty: 2, forWhom: "", market: "yahoo:QQQ", strategy: "ma_cross", days: 365, rangePreset: "365d", hidden: true },
  { id: "btcfut-rsi-1y", title: "BTC 선물 RSI 1년", blurb: "BTC 영구선물 RSI 1년.", badge: "", category: "futures", difficulty: 3, forWhom: "", market: "okx_fut:BTC-USDT-SWAP", strategy: "rsi", days: 365, rangePreset: "365d", hidden: true },
  { id: "ethfut-ma-1y", title: "ETH 선물 이평 1년", blurb: "ETH 영구선물 이동평균 교차 1년.", badge: "", category: "futures", difficulty: 3, forWhom: "", market: "okx_fut:ETH-USDT-SWAP", strategy: "ma_cross", days: 365, rangePreset: "365d", hidden: true },
];

// /api/signals 로 보낼 때 필요한 전략 파라미터를 프리셋 id 로부터 조립.
// 프리셋은 전략별 기본값을 쓰기 때문에 strategies.ts 의 기본값과 동일.
export function presetStrategyParams(id: string): StrategyParams | null {
  const preset = BEGINNER_PRESETS.find((p) => p.id === id);
  if (!preset) return null;
  switch (preset.strategy) {
    case "ma_cross":
      return { ma_cross: { short: 20, long: 60 } };
    case "rsi":
      return { rsi: { period: 14, oversold: 30, overbought: 70 } };
    case "bollinger":
      return { bollinger: { period: 20, stddev: 2, touch: "close" } };
    case "macd":
      return { macd: { fast: 12, slow: 26, signal: 9 } };
    default:
      return {};
  }
}

// /quiz 3문항 답변으로 프리셋 1개를 결정. 해당 (market × style) 조합이
// 목록에 없으면 style 을 우선 살리는 방향으로 차선책을 고른다.
export type QuizAnswers = {
  market: PresetCategory;
  style: "hold" | "trend" | "reversion";
  risk: "low" | "medium" | "high";
};

export function recommendPreset(a: QuizAnswers): BeginnerPreset {
  const inMarket = BEGINNER_PRESETS.filter((p) => p.category === a.market);

  const match = (p: BeginnerPreset) => {
    if (a.style === "hold") return p.strategy === "buy_hold";
    if (a.style === "trend") return p.strategy === "ma_cross";
    return p.strategy === "rsi" || p.strategy === "bollinger";
  };

  const styleMatch = inMarket.filter(match);
  const pool = styleMatch.length > 0 ? styleMatch : inMarket;

  // 위험 선호에 따라 난이도 정렬: low=쉬운 것부터, high=어려운 것부터.
  const sorted = [...pool].sort((x, y) =>
    a.risk === "high" ? y.difficulty - x.difficulty : x.difficulty - y.difficulty,
  );
  return sorted[0] ?? BEGINNER_PRESETS[0];
}

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
