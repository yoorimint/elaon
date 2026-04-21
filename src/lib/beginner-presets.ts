// 초보자용 원클릭 프리셋. /backtest?preset=btc-rsi-2y 처럼 URL 로 넘어오면
// 백테스트 페이지에서 applyConfig 로 적용된다. 홈 화면의 "처음이신가요"
// 카드들이 이 목록을 그대로 노출한다.

import { defaultCondition } from "./diy-strategy";
import type { BacktestConfig } from "./user-strategies";

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
