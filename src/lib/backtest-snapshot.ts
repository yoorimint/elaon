// 백테스트 페이지 상태 스냅샷. 사용자가 결과 화면에서 공유/게시글/모의투자
// 같은 다른 페이지로 이동했다가 뒤로가기로 돌아왔을 때 이전에 계산한 결과가
// 그대로 보이도록 sessionStorage 에 저장한다. 탭을 닫으면 사라짐 (sessionStorage).

import type { BacktestResult } from "./backtest";
import type { Candle, Timeframe } from "./upbit";
import type { Signal, StrategyId, StrategyParams } from "./strategies";
import type { Condition } from "./diy-strategy";

const KEY = "eloan_backtest_snapshot_v1";

export type BacktestSnapshot = {
  // 입력 폼
  market: string;
  timeframe: Timeframe;
  strategy: StrategyId;
  rangePreset: string;
  dateFrom: string;
  dateTo: string;
  shortMa: number;
  longMa: number;
  rsiPeriod: number;
  rsiLow: number;
  rsiHigh: number;
  bbPeriod: number;
  bbStddev: number;
  bbTouch: "close" | "wick";
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  breakoutK: number;
  stochPeriod: number;
  stochSmooth: number;
  stochLow: number;
  stochHigh: number;
  ichimokuConv: number;
  ichimokuBase: number;
  ichimokuLag: number;
  dcaInterval: number;
  dcaAmount: number;
  maDcaMaPeriod: number;
  gridLow: number;
  gridHigh: number;
  gridCount: number;
  gridMode: "arith" | "geom";
  customBuy: Condition[];
  customSell: Condition[];
  stopLoss: number;
  takeProfit: number;
  diyAllowReentry?: boolean;
  diySellFraction?: number;
  initialCash: number;
  feeBps: number;
  // 사이징/리스크 옵션
  positionSizePct?: number;
  martingaleFactor?: number;
  slippageBps?: number;
  walkForward?: boolean;
  rebalanceTP?: number;
  rebalanceDrop?: number;
  // 실행 결과
  result: BacktestResult;
  priceCandles: Candle[];
  runSignals: Signal[];
  runStrategy: StrategyId;
  runParams: StrategyParams;
  runCustomBuy: Condition[] | null;
  runCustomSell: Condition[] | null;
  shareUrl: string | null;
  savedPrivate: boolean | null;
};

export function saveBacktestSnapshot(snap: BacktestSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    // quota exceeded 등은 무시 (복원 안 돼도 기능 자체는 동작)
  }
}

export function loadBacktestSnapshot(): BacktestSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BacktestSnapshot;
  } catch {
    return null;
  }
}

export function clearBacktestSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {}
}
