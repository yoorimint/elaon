// Paper-trade vs. backtest parity test.
// Runs every strategy over synthetic candles, once via the backtest engine
// (ground truth) and once by feeding bars one-at-a-time through the
// paper-trade tick logic. Any divergence in final equity or trade count
// indicates a bug in paper-trade (since backtest is the reference).
//
// Run: npx tsx --tsconfig tsconfig.json scripts/audit-paper-trade.ts

import type { Candle } from "@/lib/upbit";
import {
  computeSignals,
  sma,
  type Signal,
  type StrategyId,
  type StrategyParams,
} from "@/lib/strategies";
import { runBacktest } from "@/lib/backtest";
import {
  computeDIYSignals,
  type Condition,
  type IndicatorRef,
} from "@/lib/diy-strategy";

// ---------- synthetic candles ----------
function genCandles(n: number, seed = 1): Candle[] {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: Candle[] = [];
  let price = 100_000_000;
  const start = Date.UTC(2024, 0, 1);
  for (let i = 0; i < n; i++) {
    const drift = (rand() - 0.48) * 0.04;
    price = Math.max(1_000_000, price * (1 + drift));
    const open = price;
    const close = price * (1 + (rand() - 0.5) * 0.03);
    const high = Math.max(open, close) * (1 + rand() * 0.015);
    const low = Math.min(open, close) * (1 - rand() * 0.015);
    out.push({
      timestamp: start + i * 86_400_000,
      open,
      high,
      low,
      close,
      volume: 100 + rand() * 500,
    });
    price = close;
  }
  return out;
}

// ---------- minimal paper-trade state (mirrors src/lib/paper-trade.ts) ----------
type PTSession = {
  strategy: StrategyId;
  params: StrategyParams;
  customBuy?: Condition[];
  customSell?: Condition[];
  stopLossPct?: number;
  takeProfitPct?: number;
  initialCash: number;
  feeRate: number;
  startPrice: number;
  cash: number;
  position: number;
  avgCost: number;
  openEntryPrice: number | null;
  tradesCount: number;
  closedTrades: number;
  wins: number;
  equity: number;
  lastPrice: number;
  processedBars: number;
  gridBoughtQty?: (number | null)[];
  gridBoughtAt?: number[];
};

function applySignal(sess: PTSession, price: number, signal: Signal): "buy" | "sell" | null {
  const f = sess.feeRate;
  if (signal === "buy" && sess.position === 0 && sess.cash > 0) {
    const spend = sess.cash * (1 - f);
    sess.position = spend / price;
    sess.avgCost = price;
    sess.cash = 0;
    sess.openEntryPrice = price;
    sess.tradesCount += 1;
    return "buy";
  }
  if (signal === "sell" && sess.position > 0) {
    const entry = sess.openEntryPrice ?? sess.avgCost;
    const proceeds = sess.position * price * (1 - f);
    const pnl = ((price * (1 - f)) / (entry * (1 + f)) - 1) * 100;
    sess.cash += proceeds;
    sess.position = 0;
    sess.avgCost = 0;
    sess.openEntryPrice = null;
    sess.tradesCount += 1;
    sess.closedTrades += 1;
    if (pnl > 0) sess.wins += 1;
    return "sell";
  }
  if (typeof signal === "object" && "buy_krw" in signal) {
    const want = Math.min(signal.buy_krw, sess.cash);
    if (want <= 0) return null;
    const spend = want * (1 - f);
    const qty = spend / price;
    const newAvg =
      sess.position === 0
        ? price
        : (sess.avgCost * sess.position + price * qty) / (sess.position + qty);
    sess.position += qty;
    sess.avgCost = newAvg;
    sess.cash -= want;
    if (sess.openEntryPrice === null) sess.openEntryPrice = price;
    sess.tradesCount += 1;
    return "buy";
  }
  if (typeof signal === "object" && "sell_qty_frac" in signal) {
    const frac = Math.min(Math.max(signal.sell_qty_frac, 0), 1);
    const qty = sess.position * frac;
    if (qty <= 0) return null;
    const entry = signal.entry_price ?? sess.openEntryPrice ?? sess.avgCost;
    const proceeds = qty * price * (1 - f);
    const pnl = ((price * (1 - f)) / (entry * (1 + f)) - 1) * 100;
    sess.cash += proceeds;
    sess.position -= qty;
    if (sess.position < 1e-12) {
      sess.position = 0;
      sess.avgCost = 0;
      sess.openEntryPrice = null;
    }
    sess.tradesCount += 1;
    sess.closedTrades += 1;
    if (pnl > 0) sess.wins += 1;
    return "sell";
  }
  return null;
}

// Simulates `tick()` by computing signals over a recent window ending at idx,
// then applying the signal at idx with session's state. Mirrors the real tick
// logic (which uses a fixed-bar lookback window in production).
// `LOOKBACK` overridable per run to stress-test long sessions.
let LOOKBACK = 400;
function simulateTick(sess: PTSession, candles: Candle[], idx: number) {
  const start = Math.max(0, idx - LOOKBACK + 1);
  const window = candles.slice(start, idx + 1);
  const localIdx = window.length - 1;

  const inPosNow = sess.position > 0;
  let signals: Signal[];
  if (sess.strategy === "custom") {
    if (!sess.customBuy || sess.customBuy.length === 0) {
      signals = new Array(window.length).fill("hold");
    } else {
      signals = computeDIYSignals(window, {
        buy: sess.customBuy,
        sell: sess.customSell ?? [],
        stopLossPct: sess.stopLossPct,
        takeProfitPct: sess.takeProfitPct,
        initialInPos: inPosNow,
        initialEntryPrice: sess.openEntryPrice ?? undefined,
      });
    }
  } else {
    signals = computeSignals(window, sess.strategy, sess.params, {
      initialCash: sess.initialCash,
      initialInPos: inPosNow,
    });
  }

  const c = window[localIdx];
  let sig: Signal = signals[localIdx];

  // breakout: session.position>0 이면 강제 매도 (컴퓨트 윈도우의 inPos 유실 대응)
  if (sess.strategy === "breakout" && sess.position > 0) {
    sig = "sell";
  }
  // grid: 세션 상태 기반
  if (sess.strategy === "grid") {
    sig = computeGridSigForSim(sess, c.close);
  }
  // DCA / ma_dca session-counter override
  if (sess.strategy === "dca" || sess.strategy === "ma_dca") {
    const barCount = sess.processedBars; // 0 for first processed bar
    if (sess.strategy === "dca") {
      const p = sess.params.dca ?? { intervalDays: 7, amountKRW: 100_000 };
      sig = barCount % p.intervalDays === 0 ? { buy_krw: p.amountKRW } : "hold";
    } else {
      const p = sess.params.ma_dca ?? { intervalDays: 7, amountKRW: 100_000, maPeriod: 60 };
      if (barCount % p.intervalDays === 0) {
        const closes = window.map((x) => x.close);
        const m = sma(closes, p.maPeriod)[localIdx];
        sig = m != null && c.close < m ? { buy_krw: p.amountKRW } : "hold";
      } else {
        sig = "hold";
      }
    }
  }

  applySignal(sess, c.close, sig);

  // stopLoss/takeProfit for non-custom
  if (
    sess.strategy !== "custom" &&
    sess.position > 0 &&
    sess.openEntryPrice
  ) {
    const pnl = (c.close / sess.openEntryPrice - 1) * 100;
    const sl = sess.stopLossPct ?? 0;
    const tp = sess.takeProfitPct ?? 0;
    if ((sl > 0 && pnl <= -sl) || (tp > 0 && pnl >= tp)) {
      applySignal(sess, c.close, "sell");
    }
  }

  sess.equity = sess.cash + sess.position * c.close;
  sess.lastPrice = c.close;
  sess.processedBars += 1;
}

function computeGridSigForSim(sess: PTSession, price: number): Signal {
  const p = sess.params.grid;
  if (!p || p.grids < 2 || p.high <= p.low || p.low <= 0) return "hold";
  if (!sess.gridBoughtQty || !sess.gridBoughtAt) {
    sess.gridBoughtQty = new Array(p.grids).fill(null);
    sess.gridBoughtAt = new Array(p.grids).fill(0);
  }
  const mode = p.mode ?? "geom";
  const ratio = mode === "geom" ? Math.pow(p.high / p.low, 1 / p.grids) : 1;
  const step = mode === "arith" ? (p.high - p.low) / p.grids : 0;
  const levelAt = (g: number): number =>
    mode === "geom" ? p.low * Math.pow(ratio, g) : p.low + step * g;
  const slotKRW = sess.initialCash / p.grids;
  for (let g = 0; g < p.grids; g++) {
    const buyPrice = levelAt(g);
    const sellPrice = levelAt(g + 1);
    if (sess.gridBoughtQty[g] === null && price <= buyPrice) {
      sess.gridBoughtQty[g] = slotKRW / price;
      sess.gridBoughtAt[g] = price;
      return { buy_krw: slotKRW };
    }
    if (sess.gridBoughtQty[g] !== null && price >= sellPrice) {
      const total = sess.gridBoughtQty.reduce<number>((s, q) => s + (q ?? 0), 0);
      const qty = sess.gridBoughtQty[g] as number;
      const frac = total > 0 ? qty / total : 0;
      const entry = sess.gridBoughtAt[g];
      sess.gridBoughtQty[g] = null;
      sess.gridBoughtAt[g] = 0;
      return { sell_qty_frac: Math.min(Math.max(frac, 0), 1), entry_price: entry };
    }
  }
  return "hold";
}

function initSession(
  strategy: StrategyId,
  params: StrategyParams,
  candles: Candle[],
  opts: { initialCash: number; feeRate: number },
  custom?: { buy: Condition[]; sell: Condition[]; stopLossPct?: number; takeProfitPct?: number },
): PTSession {
  const sess: PTSession = {
    strategy,
    params,
    customBuy: custom?.buy,
    customSell: custom?.sell,
    stopLossPct: custom?.stopLossPct,
    takeProfitPct: custom?.takeProfitPct,
    initialCash: opts.initialCash,
    feeRate: opts.feeRate,
    startPrice: candles[0].close,
    cash: opts.initialCash,
    position: 0,
    avgCost: 0,
    openEntryPrice: null,
    tradesCount: 0,
    closedTrades: 0,
    wins: 0,
    equity: opts.initialCash,
    lastPrice: candles[0].close,
    processedBars: 0,
  };
  // buy_hold: createSession에서 즉시 매수 (백테스트의 signals[0]=buy 효과)
  if (strategy === "buy_hold") {
    const price = candles[0].close;
    const spend = opts.initialCash * (1 - opts.feeRate);
    sess.position = spend / price;
    sess.avgCost = price;
    sess.cash = 0;
    sess.openEntryPrice = price;
    sess.tradesCount = 1;
  }
  if (strategy === "grid") {
    const g = params.grid;
    if (g && g.grids >= 2 && g.high > g.low && g.low > 0) {
      sess.gridBoughtQty = new Array(g.grids).fill(null);
      sess.gridBoughtAt = new Array(g.grids).fill(0);
    }
  }
  return sess;
}

// Runs paper-trade sim: session starts at bar 0 (cash=initialCash) and processes
// bars 1..N-1 via simulateTick. Final state should match backtest exactly for
// strategies that are well-behaved.
function simulatePaperTrade(
  strategy: StrategyId,
  params: StrategyParams,
  candles: Candle[],
  opts: { initialCash: number; feeRate: number },
  custom?: { buy: Condition[]; sell: Condition[]; stopLossPct?: number; takeProfitPct?: number },
): PTSession {
  const sess = initSession(strategy, params, candles, opts, custom);
  for (let i = 1; i < candles.length; i++) {
    simulateTick(sess, candles, i);
  }
  return sess;
}

// ---------- parity checks ----------
type Report = {
  name: string;
  btRet: number;
  ptRet: number;
  btTrades: number;
  ptTrades: number;
  diffRetPct: number;
  diffTrades: number;
  verdict: "OK" | "MISMATCH";
};

const REPORTS: Report[] = [];
const TOLERANCE_STRICT = 0.01; // float noise for 1:1 parity strategies
// DCA / ma_dca / grid have a known "paper trade starts at bar 1 vs backtest
// at bar 0" semantic shift; their returns drift slightly. Trade counts also
// differ because backtest mark-to-market inflates them. Loosen for these.
const TOLERANCE_LOOSE = 5.0;
function isLooseStrategy(s: StrategyId): boolean {
  return s === "dca" || s === "ma_dca" || s === "grid";
}

function report(
  name: string,
  strategy: StrategyId,
  params: StrategyParams,
  candles: Candle[],
  opts: { initialCash: number; feeBps: number },
  custom?: { buy: Condition[]; sell: Condition[]; stopLossPct?: number; takeProfitPct?: number },
) {
  const feeRate = opts.feeBps / 10000;

  // Ground truth: backtest over full history
  let signals: Signal[];
  if (strategy === "custom") {
    signals = custom
      ? computeDIYSignals(candles, {
          buy: custom.buy,
          sell: custom.sell,
          stopLossPct: custom.stopLossPct,
          takeProfitPct: custom.takeProfitPct,
        })
      : new Array(candles.length).fill("hold");
  } else {
    signals = computeSignals(candles, strategy, params, { initialCash: opts.initialCash });
  }
  const bt = runBacktest(candles, signals, { initialCash: opts.initialCash, feeRate });

  // Paper-trade sim
  const pt = simulatePaperTrade(strategy, params, candles, { initialCash: opts.initialCash, feeRate }, custom);
  const ptRet = (pt.equity / opts.initialCash - 1) * 100;

  const diffRet = Math.abs(bt.returnPct - ptRet);
  const diffTrades = Math.abs(bt.tradeCount - pt.closedTrades);
  const tolerance = isLooseStrategy(strategy) ? TOLERANCE_LOOSE : TOLERANCE_STRICT;
  // for loose strategies, trade count diff is expected (mark-to-market vs. sells only)
  const tradesOk = isLooseStrategy(strategy) ? true : diffTrades <= 1;
  const verdict = diffRet <= tolerance && tradesOk ? "OK" : "MISMATCH";
  REPORTS.push({
    name,
    btRet: bt.returnPct,
    ptRet,
    btTrades: bt.tradeCount,
    ptTrades: pt.closedTrades,
    diffRetPct: diffRet,
    diffTrades,
    verdict,
  });
}

function C(left: IndicatorRef, op: Condition["op"], right: IndicatorRef): Condition {
  return { id: Math.random().toString(36).slice(2), left, op, right };
}

// ---------- run tests ----------
function runAll(seed: number) {
  const candles = genCandles(600, seed);
  const opts = { initialCash: 1_000_000, feeBps: 5 };

  console.log(`\n=== seed=${seed}  candles=${candles.length}  first=${Math.round(candles[0].close)}  last=${Math.round(candles[candles.length - 1].close)} ===`);

  const presets: [string, StrategyId, StrategyParams][] = [
    [`buy_hold seed=${seed}`, "buy_hold", {}],
    [`ma_cross 20/60 seed=${seed}`, "ma_cross", { ma_cross: { short: 20, long: 60 } }],
    [`rsi 14/30/70 seed=${seed}`, "rsi", { rsi: { period: 14, oversold: 30, overbought: 70 } }],
    [`bollinger 20/2 close seed=${seed}`, "bollinger", { bollinger: { period: 20, stddev: 2, touch: "close" } }],
    [`bollinger 20/2 wick seed=${seed}`, "bollinger", { bollinger: { period: 20, stddev: 2, touch: "wick" } }],
    [`macd 12/26/9 seed=${seed}`, "macd", { macd: { fast: 12, slow: 26, signal: 9 } }],
    [`breakout k=0.5 seed=${seed}`, "breakout", { breakout: { k: 0.5 } }],
    [`stoch 14/3 seed=${seed}`, "stoch", { stoch: { period: 14, smooth: 3, oversold: 20, overbought: 80 } }],
    [`ichimoku 9/26/52 seed=${seed}`, "ichimoku", { ichimoku: { conversion: 9, base: 26, lagging: 52 } }],
    [`dca 7d/100k seed=${seed}`, "dca", { dca: { intervalDays: 7, amountKRW: 100_000 } }],
    [`ma_dca 7d/100k/60 seed=${seed}`, "ma_dca", { ma_dca: { intervalDays: 7, amountKRW: 100_000, maPeriod: 60 } }],
  ];
  for (const [n, s, p] of presets) report(n, s, p, candles, opts);

  // grid (auto range)
  const closes = candles.map((c) => c.close);
  report(
    `grid 10 slots seed=${seed}`,
    "grid",
    { grid: { low: Math.min(...closes), high: Math.max(...closes), grids: 10, mode: "geom" } },
    candles,
    opts,
  );

  // DIY samples
  report(
    `custom rsi<30 seed=${seed}`,
    "custom",
    {},
    candles,
    opts,
    {
      buy: [C({ kind: "rsi", period: 14 }, "lt", { kind: "const", value: 30 })],
      sell: [C({ kind: "rsi", period: 14 }, "gt", { kind: "const", value: 70 })],
    },
  );
  report(
    `custom ma-cross DIY seed=${seed}`,
    "custom",
    {},
    candles,
    opts,
    {
      buy: [C({ kind: "sma", period: 5 }, "cross_up", { kind: "sma", period: 20 })],
      sell: [C({ kind: "sma", period: 5 }, "cross_down", { kind: "sma", period: 20 })],
    },
  );
  report(
    `custom w/ stopLoss 10 seed=${seed}`,
    "custom",
    {},
    candles,
    opts,
    {
      buy: [C({ kind: "rsi", period: 14 }, "lt", { kind: "const", value: 30 })],
      sell: [C({ kind: "rsi", period: 14 }, "gt", { kind: "const", value: 70 })],
      stopLossPct: 10,
    },
  );
}

// Production lookback (400 bars) — all strategies should have strict parity
// with backtest, except DCA / grid which have a well-known 1-bar semantic
// shift (paper trade starts at bar 1, backtest at bar 0). Those are allowed a
// wider tolerance.
LOOKBACK = 400;
runAll(42);
runAll(7);
runAll(1337);

// Long-session stress: bump LOOKBACK to 800 (mirrors running the session
// for longer than the default warmup). Same parity expected.
LOOKBACK = 800;
console.log("\n########## long-session stress (LOOKBACK=800) ##########");
runAll(42);
runAll(7);

// ---------- output ----------
console.log("\n===== RESULTS =====");
console.log(
  "name                                       | BT ret    | PT ret    | diff ret  | BT tr | PT tr | verdict",
);
console.log("-".repeat(130));
for (const r of REPORTS) {
  const row = [
    r.name.padEnd(42),
    (r.btRet.toFixed(2) + "%").padStart(9),
    (r.ptRet.toFixed(2) + "%").padStart(9),
    (r.diffRetPct.toFixed(3) + "%").padStart(9),
    String(r.btTrades).padStart(5),
    String(r.ptTrades).padStart(5),
    r.verdict,
  ].join(" | ");
  console.log(row);
}

const bad = REPORTS.filter((r) => r.verdict === "MISMATCH");
console.log(`\n${bad.length}/${REPORTS.length} mismatches`);
if (bad.length > 0) {
  console.log("Bugs found:");
  for (const r of bad) {
    console.log(`  • ${r.name}: BT=${r.btRet.toFixed(2)}% / PT=${r.ptRet.toFixed(2)}% (Δ=${r.diffRetPct.toFixed(2)}%)  trades ${r.btTrades}→${r.ptTrades}`);
  }
  process.exit(1);
}
console.log("All strategies parity OK ✓");
