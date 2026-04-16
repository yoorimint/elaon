import type { Candle } from "./upbit";
import type { Signal } from "./strategies";

export type Trade = {
  entryIndex: number;
  entryPrice: number;
  exitIndex: number | null;
  exitPrice: number | null;
  pnlPct: number | null;
};

export type EquityPoint = {
  timestamp: number;
  equity: number;
  benchmark: number;
};

export type BacktestResult = {
  trades: Trade[];
  equity: EquityPoint[];
  finalEquity: number;
  benchmarkEquity: number;
  returnPct: number;
  benchmarkReturnPct: number;
  maxDrawdownPct: number;
  winRate: number;
  tradeCount: number;
};

export type BacktestOptions = {
  initialCash: number;
  feeRate: number;
};

export function runBacktest(
  candles: Candle[],
  signals: Signal[],
  opts: BacktestOptions,
): BacktestResult {
  const { initialCash, feeRate } = opts;
  let cash = initialCash;
  let position = 0;
  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];

  const firstPrice = candles[0]?.close ?? 1;
  let currentTrade: Trade | null = null;

  for (let i = 0; i < candles.length; i++) {
    const price = candles[i].close;
    const signal = signals[i];

    if (signal === "buy" && position === 0 && cash > 0) {
      const spend = cash * (1 - feeRate);
      position = spend / price;
      cash = 0;
      currentTrade = {
        entryIndex: i,
        entryPrice: price,
        exitIndex: null,
        exitPrice: null,
        pnlPct: null,
      };
    } else if (signal === "sell" && position > 0) {
      cash = position * price * (1 - feeRate);
      if (currentTrade) {
        currentTrade.exitIndex = i;
        currentTrade.exitPrice = price;
        currentTrade.pnlPct =
          ((price * (1 - feeRate)) / (currentTrade.entryPrice * (1 + feeRate)) - 1) * 100;
        trades.push(currentTrade);
        currentTrade = null;
      }
      position = 0;
    }

    const eq = cash + position * price;
    const bm = (initialCash / firstPrice) * price;
    equity.push({ timestamp: candles[i].timestamp, equity: eq, benchmark: bm });
  }

  if (currentTrade && position > 0) {
    const last = candles[candles.length - 1];
    currentTrade.exitIndex = candles.length - 1;
    currentTrade.exitPrice = last.close;
    currentTrade.pnlPct =
      ((last.close * (1 - feeRate)) / (currentTrade.entryPrice * (1 + feeRate)) - 1) * 100;
    trades.push(currentTrade);
  }

  const finalEquity = equity[equity.length - 1]?.equity ?? initialCash;
  const benchmarkEquity = equity[equity.length - 1]?.benchmark ?? initialCash;

  let peak = initialCash;
  let maxDd = 0;
  for (const p of equity) {
    peak = Math.max(peak, p.equity);
    const dd = (peak - p.equity) / peak;
    if (dd > maxDd) maxDd = dd;
  }

  const wins = trades.filter((t) => (t.pnlPct ?? 0) > 0).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  return {
    trades,
    equity,
    finalEquity,
    benchmarkEquity,
    returnPct: (finalEquity / initialCash - 1) * 100,
    benchmarkReturnPct: (benchmarkEquity / initialCash - 1) * 100,
    maxDrawdownPct: maxDd * 100,
    winRate,
    tradeCount: trades.length,
  };
}
