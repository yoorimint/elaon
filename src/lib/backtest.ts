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
  let avgCost = 0;
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
      avgCost = price;
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
      avgCost = 0;
    } else if (typeof signal === "object" && "buy_krw" in signal) {
      const want = Math.min(signal.buy_krw, cash);
      if (want > 0) {
        const spend = want * (1 - feeRate);
        const qty = spend / price;
        const newAvg =
          position === 0
            ? price
            : (avgCost * position + price * qty) / (position + qty);
        position += qty;
        avgCost = newAvg;
        cash -= want;
        trades.push({
          entryIndex: i,
          entryPrice: price,
          exitIndex: null,
          exitPrice: null,
          pnlPct: null,
        });
      }
    } else if (typeof signal === "object" && "sell_qty_frac" in signal) {
      const frac = Math.min(Math.max(signal.sell_qty_frac, 0), 1);
      const qty = position * frac;
      if (qty > 0) {
        // 진입가는 signal에 명시됐으면 그걸 쓰고(grid 레벨별 정확), 없으면
        // 직전 open trade의 entryPrice, 그것도 없으면 현재 avgCost를 사용.
        // 반드시 position/avgCost 변경 전에 캡처해야 한다.
        const last = trades[trades.length - 1];
        const entryPrice =
          signal.entry_price ??
          (last && last.exitIndex === null ? last.entryPrice : avgCost);

        cash += qty * price * (1 - feeRate);
        position -= qty;
        if (position < 1e-12) {
          position = 0;
          avgCost = 0;
        }
        trades.push({
          entryIndex: i,
          entryPrice,
          exitIndex: i,
          exitPrice: price,
          pnlPct:
            ((price * (1 - feeRate)) / (entryPrice * (1 + feeRate)) - 1) * 100,
        });
      }
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

  // Mark-to-market any unmatched open entries (DCA buys, leftover grid lots) so
  // every recorded trade has a meaningful exit price + P&L. Without this DCA
  // surfaces as "0회" with 72 null-exit rows in the trade table.
  if (candles.length > 0) {
    const finalIdx = candles.length - 1;
    const finalPrice = candles[finalIdx].close;
    for (const t of trades) {
      if (t.exitIndex === null) {
        t.exitIndex = finalIdx;
        t.exitPrice = finalPrice;
        t.pnlPct =
          ((finalPrice * (1 - feeRate)) / (t.entryPrice * (1 + feeRate)) - 1) * 100;
      }
    }
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

  const closedTrades = trades.filter((t) => t.pnlPct !== null);
  const wins = closedTrades.filter((t) => (t.pnlPct ?? 0) > 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

  return {
    trades,
    equity,
    finalEquity,
    benchmarkEquity,
    returnPct: (finalEquity / initialCash - 1) * 100,
    benchmarkReturnPct: (benchmarkEquity / initialCash - 1) * 100,
    maxDrawdownPct: maxDd * 100,
    winRate,
    tradeCount: closedTrades.length,
  };
}
