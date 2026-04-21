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

export type MonthlyReturn = {
  year: number;
  month: number; // 1~12
  returnPct: number;
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
  // 아래는 v2 확장 지표. 구 공유 결과엔 없을 수 있어 ResultView 에서 조건부 렌더.
  sharpeRatio: number; // 연환산 샤프 비율
  sortinoRatio: number; // 연환산 소르티노 비율
  calmarRatio: number; // 연환산 수익률 / |MDD|
  profitFactor: number; // 총 이익 / 총 손실
  expectancyPct: number; // 거래당 기대값 (%)
  avgWinPct: number;
  avgLossPct: number;
  maxConsecWins: number;
  maxConsecLosses: number;
  bestTradePct: number;
  worstTradePct: number;
  avgHoldBars: number;
  maxDrawdownDurationBars: number; // 최대 낙폭 회복까지 걸린 봉 수
  monthly: MonthlyReturn[];
};

export type BacktestOptions = {
  initialCash: number;
  feeRate: number;
  // 실전 슬리피지. 매수 시 price * (1+slip), 매도 시 price * (1-slip). bps 단위.
  slippageBps?: number;
};

export function runBacktest(
  candles: Candle[],
  signals: Signal[],
  opts: BacktestOptions,
): BacktestResult {
  const { initialCash, feeRate } = opts;
  const slip = (opts.slippageBps ?? 0) / 10000;
  // 실전 체결가: 매수는 가산, 매도는 차감. feeRate 과 독립적으로 적용.
  const buyPx = (p: number) => p * (1 + slip);
  const sellPx = (p: number) => p * (1 - slip);
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
      const execPx = buyPx(price);
      const spend = cash * (1 - feeRate);
      position = spend / execPx;
      avgCost = execPx;
      cash = 0;
      currentTrade = {
        entryIndex: i,
        entryPrice: execPx,
        exitIndex: null,
        exitPrice: null,
        pnlPct: null,
      };
    } else if (signal === "sell" && position > 0) {
      const execPx = sellPx(price);
      cash = position * execPx * (1 - feeRate);
      if (currentTrade) {
        currentTrade.exitIndex = i;
        currentTrade.exitPrice = execPx;
        currentTrade.pnlPct =
          ((execPx * (1 - feeRate)) / (currentTrade.entryPrice * (1 + feeRate)) - 1) * 100;
        trades.push(currentTrade);
        currentTrade = null;
      }
      position = 0;
      avgCost = 0;
    } else if (typeof signal === "object" && "buy_krw" in signal) {
      const want = Math.min(signal.buy_krw, cash);
      if (want > 0) {
        const execPx = buyPx(price);
        const spend = want * (1 - feeRate);
        const qty = spend / execPx;
        const newAvg =
          position === 0
            ? execPx
            : (avgCost * position + execPx * qty) / (position + qty);
        position += qty;
        avgCost = newAvg;
        cash -= want;
        trades.push({
          entryIndex: i,
          entryPrice: execPx,
          exitIndex: null,
          exitPrice: null,
          pnlPct: null,
        });
      }
    } else if (typeof signal === "object" && "sell_qty_frac" in signal) {
      const frac = Math.min(Math.max(signal.sell_qty_frac, 0), 1);
      const qty = position * frac;
      if (qty > 0) {
        const execPx = sellPx(price);
        const last = trades[trades.length - 1];
        const entryPrice =
          signal.entry_price ??
          (last && last.exitIndex === null ? last.entryPrice : avgCost);

        cash += qty * execPx * (1 - feeRate);
        position -= qty;
        if (position < 1e-12) {
          position = 0;
          avgCost = 0;
        }
        trades.push({
          entryIndex: i,
          entryPrice,
          exitIndex: i,
          exitPrice: execPx,
          pnlPct:
            ((execPx * (1 - feeRate)) / (entryPrice * (1 + feeRate)) - 1) * 100,
        });
      }
    }

    const eq = cash + position * price;
    const bm = (initialCash / firstPrice) * price;
    equity.push({ timestamp: candles[i].timestamp, equity: eq, benchmark: bm });
  }

  if (currentTrade && position > 0) {
    const last = candles[candles.length - 1];
    const finalSellPx = sellPx(last.close);
    currentTrade.exitIndex = candles.length - 1;
    currentTrade.exitPrice = finalSellPx;
    currentTrade.pnlPct =
      ((finalSellPx * (1 - feeRate)) / (currentTrade.entryPrice * (1 + feeRate)) - 1) * 100;
    trades.push(currentTrade);
  }

  // Mark-to-market any unmatched open entries (DCA buys, leftover grid lots)
  if (candles.length > 0) {
    const finalIdx = candles.length - 1;
    const finalPx = sellPx(candles[finalIdx].close);
    for (const t of trades) {
      if (t.exitIndex === null) {
        t.exitIndex = finalIdx;
        t.exitPrice = finalPx;
        t.pnlPct =
          ((finalPx * (1 - feeRate)) / (t.entryPrice * (1 + feeRate)) - 1) * 100;
      }
    }
  }

  const finalEquity = equity[equity.length - 1]?.equity ?? initialCash;
  const benchmarkEquity = equity[equity.length - 1]?.benchmark ?? initialCash;

  // ==== 최대 낙폭 + 낙폭 기간 ====
  let peak = initialCash;
  let peakIdx = 0;
  let maxDd = 0;
  let maxDdDurationBars = 0;
  let currentDdStartIdx = 0;
  for (let i = 0; i < equity.length; i++) {
    const p = equity[i];
    if (p.equity >= peak) {
      peak = p.equity;
      peakIdx = i;
      currentDdStartIdx = i;
    } else {
      const dd = (peak - p.equity) / peak;
      if (dd > maxDd) {
        maxDd = dd;
      }
      const duration = i - currentDdStartIdx;
      if (duration > maxDdDurationBars) maxDdDurationBars = duration;
    }
  }

  const closedTrades = trades.filter((t) => t.pnlPct !== null);
  const wins = closedTrades.filter((t) => (t.pnlPct ?? 0) > 0);
  const losses = closedTrades.filter((t) => (t.pnlPct ?? 0) <= 0);
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

  // ==== 거래 상세 ====
  const avgWinPct = wins.length
    ? wins.reduce((s, t) => s + (t.pnlPct ?? 0), 0) / wins.length
    : 0;
  const avgLossPct = losses.length
    ? losses.reduce((s, t) => s + (t.pnlPct ?? 0), 0) / losses.length
    : 0;
  const bestTradePct = closedTrades.length
    ? Math.max(...closedTrades.map((t) => t.pnlPct ?? 0))
    : 0;
  const worstTradePct = closedTrades.length
    ? Math.min(...closedTrades.map((t) => t.pnlPct ?? 0))
    : 0;
  const avgHoldBars = closedTrades.length
    ? closedTrades.reduce((s, t) => s + ((t.exitIndex ?? 0) - t.entryIndex), 0) / closedTrades.length
    : 0;

  // 연승/연패 streak
  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let curW = 0;
  let curL = 0;
  for (const t of closedTrades) {
    if ((t.pnlPct ?? 0) > 0) {
      curW += 1;
      curL = 0;
      if (curW > maxConsecWins) maxConsecWins = curW;
    } else {
      curL += 1;
      curW = 0;
      if (curL > maxConsecLosses) maxConsecLosses = curL;
    }
  }

  // Profit Factor
  const grossWin = wins.reduce((s, t) => s + (t.pnlPct ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnlPct ?? 0), 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);

  // Expectancy per trade (%)
  const winP = wins.length / Math.max(1, closedTrades.length);
  const lossP = losses.length / Math.max(1, closedTrades.length);
  const expectancyPct = avgWinPct * winP + avgLossPct * lossP;

  // ==== 일간 수익률 → Sharpe / Sortino ====
  const dailyReturns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    const prev = equity[i - 1].equity;
    if (prev > 0) dailyReturns.push(equity[i].equity / prev - 1);
  }
  const n = dailyReturns.length;
  const mean = n > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / n : 0;
  let variance = 0;
  let downVariance = 0;
  for (const r of dailyReturns) {
    variance += (r - mean) ** 2;
    if (r < 0) downVariance += r * r; // 하방 표준편차는 mean=0 가정
  }
  const std = n > 1 ? Math.sqrt(variance / (n - 1)) : 0;
  const downStd = n > 0 ? Math.sqrt(downVariance / n) : 0;
  // 연환산 상수: 일봉이면 √252 (주식), 암호화폐면 √365 — 실무상 √252 가 표준
  const ANNUAL = Math.sqrt(252);
  const sharpeRatio = std > 0 ? (mean / std) * ANNUAL : 0;
  const sortinoRatio = downStd > 0 ? (mean / downStd) * ANNUAL : 0;

  // Calmar: 연환산 수익률 / |MDD|
  const days = candles.length > 1
    ? Math.max(1, (candles[candles.length - 1].timestamp - candles[0].timestamp) / 86400000)
    : 1;
  const totalReturn = finalEquity / initialCash - 1;
  const annualReturn = days > 0 ? Math.pow(1 + totalReturn, 365 / days) - 1 : 0;
  const calmarRatio = maxDd > 0.0001 ? annualReturn / maxDd : (annualReturn > 0 ? Infinity : 0);

  // ==== 월별 수익률 ====
  const monthly = computeMonthlyReturns(equity);

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
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    profitFactor,
    expectancyPct,
    avgWinPct,
    avgLossPct,
    maxConsecWins,
    maxConsecLosses,
    bestTradePct,
    worstTradePct,
    avgHoldBars,
    maxDrawdownDurationBars: maxDdDurationBars,
    monthly,
  };
}

// 월별 수익률: 각 월의 첫 equity → 마지막 equity.
function computeMonthlyReturns(equity: EquityPoint[]): MonthlyReturn[] {
  if (equity.length === 0) return [];
  const buckets = new Map<string, { first: number; last: number }>();
  for (const p of equity) {
    const d = new Date(p.timestamp);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(key);
    if (!b) buckets.set(key, { first: p.equity, last: p.equity });
    else b.last = p.equity;
  }
  const out: MonthlyReturn[] = [];
  for (const [key, { first, last }] of buckets) {
    const [y, m] = key.split("-").map((s) => parseInt(s, 10));
    out.push({ year: y, month: m, returnPct: first > 0 ? (last / first - 1) * 100 : 0 });
  }
  out.sort((a, b) => a.year - b.year || a.month - b.month);
  return out;
}
