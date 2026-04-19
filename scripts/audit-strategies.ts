// Audit harness: exercises every preset strategy + representative DIY combos
// against synthetic candles and verifies invariants. Run with:
//   npx tsx --tsconfig tsconfig.json scripts/audit-strategies.ts

import type { Candle } from "@/lib/upbit";
import {
  computeSignals,
  type StrategyId,
  type StrategyParams,
} from "@/lib/strategies";
import { runBacktest, type BacktestResult } from "@/lib/backtest";
import {
  computeDIYSignals,
  type Condition,
  type IndicatorRef,
} from "@/lib/diy-strategy";

function genCandles(n: number, seed = 1): Candle[] {
  // Deterministic pseudo-random walk so runs are reproducible.
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: Candle[] = [];
  let price = 100_000_000;
  const start = Date.UTC(2024, 0, 1);
  for (let i = 0; i < n; i++) {
    const drift = (rand() - 0.48) * 0.035;
    price = Math.max(1_000_000, price * (1 + drift));
    const open = price;
    const close = price * (1 + (rand() - 0.5) * 0.02);
    const high = Math.max(open, close) * (1 + rand() * 0.01);
    const low = Math.min(open, close) * (1 - rand() * 0.01);
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

type Issue = { scope: string; msg: string };
const issues: Issue[] = [];
const flag = (scope: string, msg: string) => issues.push({ scope, msg });

function assertInvariants(
  scope: string,
  r: BacktestResult,
  initialCash: number,
) {
  if (!Number.isFinite(r.finalEquity) || r.finalEquity < 0)
    flag(scope, `finalEquity invalid: ${r.finalEquity}`);
  if (!Number.isFinite(r.benchmarkEquity) || r.benchmarkEquity < 0)
    flag(scope, `benchmark invalid: ${r.benchmarkEquity}`);
  if (!Number.isFinite(r.returnPct))
    flag(scope, `returnPct NaN`);
  if (!Number.isFinite(r.maxDrawdownPct) || r.maxDrawdownPct < -0.0001)
    flag(scope, `MDD invalid: ${r.maxDrawdownPct}`);
  if (r.winRate < -0.0001 || r.winRate > 100.0001)
    flag(scope, `winRate out of range: ${r.winRate}`);
  if (r.tradeCount < 0) flag(scope, `negative tradeCount: ${r.tradeCount}`);

  // equity curve sanity
  if (r.equity.length === 0) {
    flag(scope, `empty equity curve`);
    return;
  }
  for (const p of r.equity) {
    if (!Number.isFinite(p.equity) || p.equity < 0)
      flag(scope, `equity point invalid: ${p.equity}`);
  }

  // Trade invariants
  for (const t of r.trades) {
    if (!Number.isFinite(t.entryPrice) || t.entryPrice <= 0)
      flag(scope, `trade entryPrice invalid: ${t.entryPrice}`);
    if (t.exitPrice !== null) {
      if (!Number.isFinite(t.exitPrice) || t.exitPrice <= 0)
        flag(scope, `trade exitPrice invalid: ${t.exitPrice}`);
      if (t.pnlPct === null) flag(scope, `closed trade has null pnlPct`);
      else if (!Number.isFinite(t.pnlPct))
        flag(scope, `pnlPct NaN: ${t.pnlPct}`);
    }
  }

  // Benchmark should equal buy&hold exactly (initialCash * lastClose / firstClose)
  // No fee on benchmark so this is deterministic.
  // runPct formula: (finalEquity/initialCash - 1) * 100
  const expectedRet = (r.finalEquity / initialCash - 1) * 100;
  if (Math.abs(expectedRet - r.returnPct) > 1e-6)
    flag(scope, `returnPct mismatch: ${r.returnPct} vs ${expectedRet}`);
}

function run(
  scope: string,
  candles: Candle[],
  strategy: StrategyId,
  params: StrategyParams,
  opts: { initialCash: number; feeBps: number },
) {
  const signals = computeSignals(candles, strategy, params, {
    initialCash: opts.initialCash,
  });
  const r = runBacktest(candles, signals, {
    initialCash: opts.initialCash,
    feeRate: opts.feeBps / 10000,
  });
  assertInvariants(scope, r, opts.initialCash);
  return { signals, r };
}

function runDIY(
  scope: string,
  candles: Candle[],
  def: { buy: Condition[]; sell: Condition[]; stopLossPct?: number; takeProfitPct?: number },
  opts: { initialCash: number; feeBps: number },
) {
  const signals = computeDIYSignals(candles, def);
  const r = runBacktest(candles, signals, {
    initialCash: opts.initialCash,
    feeRate: opts.feeBps / 10000,
  });
  assertInvariants(scope, r, opts.initialCash);
  return { signals, r };
}

// Utility: make a condition.
function C(
  left: IndicatorRef,
  op: Condition["op"],
  right: IndicatorRef,
): Condition {
  return { id: Math.random().toString(36).slice(2), left, op, right };
}

// =============== TESTS ===============

const candles = genCandles(500, 42);
const opts = { initialCash: 1_000_000, feeBps: 5 };

console.log(
  `=== synthetic ${candles.length} daily candles, first=${candles[0].close.toFixed(0)} last=${candles[candles.length - 1].close.toFixed(0)} ===`,
);

const presetTests: [string, StrategyId, StrategyParams][] = [
  ["buy_hold", "buy_hold", {}],
  ["ma_cross default", "ma_cross", { ma_cross: { short: 20, long: 60 } }],
  ["ma_cross 5/20", "ma_cross", { ma_cross: { short: 5, long: 20 } }],
  ["rsi default", "rsi", { rsi: { period: 14, oversold: 30, overbought: 70 } }],
  ["bollinger default", "bollinger", { bollinger: { period: 20, stddev: 2 } }],
  ["macd default", "macd", { macd: { fast: 12, slow: 26, signal: 9 } }],
  ["breakout default", "breakout", { breakout: { k: 0.5 } }],
  ["stoch default", "stoch", { stoch: { period: 14, smooth: 3, oversold: 20, overbought: 80 } }],
  ["ichimoku default", "ichimoku", { ichimoku: { conversion: 9, base: 26, lagging: 52 } }],
  ["dca weekly 100k", "dca", { dca: { intervalDays: 7, amountKRW: 100_000 } }],
  ["ma_dca weekly 100k/60", "ma_dca", { ma_dca: { intervalDays: 7, amountKRW: 100_000, maPeriod: 60 } }],
  // grid: auto compute low/high
  [
    "grid 10 slots",
    "grid",
    (() => {
      const lows = candles.map((c) => c.close);
      return {
        grid: { low: Math.min(...lows), high: Math.max(...lows), grids: 10 },
      };
    })(),
  ],
];

for (const [name, strategy, params] of presetTests) {
  const { r, signals } = run(name, candles, strategy, params, opts);
  const buys = signals.filter(
    (s) => s === "buy" || (typeof s === "object" && s !== null && "buy_krw" in s),
  ).length;
  const sells = signals.filter(
    (s) =>
      s === "sell" ||
      (typeof s === "object" && s !== null && "sell_qty_frac" in s),
  ).length;
  console.log(
    `[${name.padEnd(26)}] buys=${buys} sells=${sells} trades=${r.tradeCount.toString().padStart(3)} ret=${r.returnPct.toFixed(2).padStart(7)}% bench=${r.benchmarkReturnPct.toFixed(2).padStart(7)}% MDD=${r.maxDrawdownPct.toFixed(2).padStart(6)}% win=${r.winRate.toFixed(1).padStart(5)}%`,
  );
}

// === DIY combos ===
console.log("\n=== DIY combinations ===");

const diyTests: [
  string,
  { buy: Condition[]; sell: Condition[]; stopLossPct?: number; takeProfitPct?: number },
][] = [
  // 1) Single RSI oversold buy + RSI overbought sell (classic)
  [
    "RSI<30 buy / RSI>70 sell",
    {
      buy: [C({ kind: "rsi", period: 14 }, "lt", { kind: "const", value: 30 })],
      sell: [C({ kind: "rsi", period: 14 }, "gt", { kind: "const", value: 70 })],
    },
  ],
  // 2) Two-condition AND buy (RSI + BB)
  [
    "RSI<30 AND close<BB lower",
    {
      buy: [
        C({ kind: "rsi", period: 14 }, "lt", { kind: "const", value: 30 }),
        C({ kind: "close" }, "lt", { kind: "bb_lower", period: 20, stddev: 2 }),
      ],
      sell: [C({ kind: "rsi", period: 14 }, "gt", { kind: "const", value: 70 })],
    },
  ],
  // 3) MA cross_up buy / cross_down sell
  [
    "SMA20 cross_up SMA60 / cross_down",
    {
      buy: [C({ kind: "sma", period: 20 }, "cross_up", { kind: "sma", period: 60 })],
      sell: [C({ kind: "sma", period: 20 }, "cross_down", { kind: "sma", period: 60 })],
    },
  ],
  // 4) MACD cross
  [
    "MACD cross_up signal / cross_down",
    {
      buy: [
        C(
          { kind: "macd", fast: 12, slow: 26 },
          "cross_up",
          { kind: "macd_signal", fast: 12, slow: 26, signal: 9 },
        ),
      ],
      sell: [
        C(
          { kind: "macd", fast: 12, slow: 26 },
          "cross_down",
          { kind: "macd_signal", fast: 12, slow: 26, signal: 9 },
        ),
      ],
    },
  ],
  // 5) Stop-loss and take-profit only (buy every day — verifies SL/TP logic)
  [
    "close>0 buy + SL 5% / TP 10%",
    {
      buy: [C({ kind: "close" }, "gt", { kind: "const", value: 0 })],
      sell: [],
      stopLossPct: 5,
      takeProfitPct: 10,
    },
  ],
  // 6) User-reported mis-config: RSI<30 AND BB lower buy / RSI<70 sell (should sell almost always)
  [
    "MISCONFIG RSI<30 AND BB / RSI<70 sell",
    {
      buy: [
        C({ kind: "rsi", period: 14 }, "lt", { kind: "const", value: 30 }),
        C({ kind: "close" }, "lt", { kind: "bb_lower", period: 20, stddev: 2 }),
      ],
      sell: [C({ kind: "rsi", period: 14 }, "lt", { kind: "const", value: 70 })],
      takeProfitPct: 1,
    },
  ],
  // 7) Empty sell (stop-loss only)
  [
    "close<SMA20 buy / no sell / SL 3%",
    {
      buy: [C({ kind: "close" }, "lt", { kind: "sma", period: 20 })],
      sell: [],
      stopLossPct: 3,
    },
  ],
  // 8) Stochastic cross
  [
    "stoch_k cross_up stoch_d",
    {
      buy: [
        C(
          { kind: "stoch_k", period: 14 },
          "cross_up",
          { kind: "stoch_d", period: 14, smooth: 3 },
        ),
      ],
      sell: [
        C(
          { kind: "stoch_k", period: 14 },
          "cross_down",
          { kind: "stoch_d", period: 14, smooth: 3 },
        ),
      ],
    },
  ],
  // 9) Heikin-Ashi close > open buy (trend-follow)
  [
    "HA close>open buy / close<SMA5 sell",
    {
      buy: [C({ kind: "ha_close" }, "gt", { kind: "ha_open" })],
      sell: [C({ kind: "close" }, "lt", { kind: "sma", period: 5 })],
    },
  ],
  // 10) Empty buy (should error in UI; here computeDIYSignals just returns all holds)
  [
    "EMPTY BUY (no signals expected)",
    { buy: [], sell: [] },
  ],
];

for (const [name, def] of diyTests) {
  try {
    const { r, signals } = runDIY(name, candles, def, opts);
    const buys = signals.filter((s) => s === "buy").length;
    const sells = signals.filter((s) => s === "sell").length;
    console.log(
      `[${name.padEnd(42)}] buys=${buys.toString().padStart(3)} sells=${sells.toString().padStart(3)} trades=${r.tradeCount.toString().padStart(3)} ret=${r.returnPct.toFixed(2).padStart(7)}% MDD=${r.maxDrawdownPct.toFixed(2).padStart(6)}% win=${r.winRate.toFixed(1).padStart(5)}%`,
    );
  } catch (e) {
    flag(name, `threw: ${(e as Error).message}`);
  }
}

// === Specific math spot-checks ===
console.log("\n=== math spot-checks ===");

// Buy-and-hold benchmark should equal final equity (no fees for bench, one buy for strategy with fees).
{
  const { r } = run("bh-bench-check", candles, "buy_hold", {}, {
    initialCash: 1_000_000,
    feeBps: 0,
  });
  if (Math.abs(r.finalEquity - r.benchmarkEquity) > 0.01)
    flag(
      "bh-bench-check",
      `B&H equity(${r.finalEquity.toFixed(2)}) != benchmark(${r.benchmarkEquity.toFixed(2)}) with 0 fees`,
    );
  else console.log(`✓ B&H == benchmark at 0 fees`);
}

// Fee applied: B&H with 50bps should have finalEquity slightly lower than benchmark
{
  const { r } = run("bh-with-fee", candles, "buy_hold", {}, {
    initialCash: 1_000_000,
    feeBps: 50,
  });
  if (r.finalEquity >= r.benchmarkEquity - 0.01)
    flag(
      "bh-with-fee",
      `fee not applied on B&H: equity=${r.finalEquity} bench=${r.benchmarkEquity}`,
    );
  else console.log(`✓ B&H fee 50bps discounts equity by ${((1 - r.finalEquity / r.benchmarkEquity) * 100).toFixed(3)}%`);
}

// Win rate sanity: closed-trade wins/total == winRate
{
  const { r } = run(
    "winrate-check",
    candles,
    "ma_cross",
    { ma_cross: { short: 10, long: 30 } },
    opts,
  );
  const closed = r.trades.filter((t) => t.pnlPct !== null);
  const wins = closed.filter((t) => (t.pnlPct ?? 0) > 0).length;
  const expected = closed.length === 0 ? 0 : (wins / closed.length) * 100;
  if (Math.abs(expected - r.winRate) > 0.01)
    flag(
      "winrate-check",
      `winRate mismatch: got ${r.winRate.toFixed(2)} expected ${expected.toFixed(2)}`,
    );
  else console.log(`✓ winRate matches hand count: ${r.winRate.toFixed(2)}% (${wins}/${closed.length})`);
}

// MDD sanity: must be non-negative, and never exceed 100%
{
  const { r } = run("mdd-sanity", candles, "buy_hold", {}, opts);
  if (r.maxDrawdownPct < 0 || r.maxDrawdownPct > 100)
    flag("mdd-sanity", `MDD out of range: ${r.maxDrawdownPct}`);
  else console.log(`✓ MDD in range: ${r.maxDrawdownPct.toFixed(2)}%`);
}

// DCA: number of buy signals should equal floor(days / interval) + 1 (day 0, 7, 14, ...)
{
  const intervalDays = 7;
  const amount = 50_000;
  const { signals, r } = run(
    "dca-count",
    candles,
    "dca",
    { dca: { intervalDays, amountKRW: amount } },
    { initialCash: 10_000_000, feeBps: 5 },
  );
  const expected = Math.floor((candles.length - 1) / intervalDays) + 1;
  const actual = signals.filter(
    (s) => typeof s === "object" && s !== null && "buy_krw" in s,
  ).length;
  if (actual !== expected)
    flag("dca-count", `DCA buy-signal count mismatch: got ${actual} expected ${expected}`);
  else console.log(`✓ DCA buy signals: ${actual} (=${expected}) trades=${r.tradeCount}`);
}

// Summary
console.log("\n=== summary ===");
if (issues.length === 0) {
  console.log(`✅ NO ISSUES found across ${presetTests.length} presets + ${diyTests.length} DIY + math spot checks.`);
} else {
  console.log(`⚠️  ${issues.length} ISSUES:`);
  for (const it of issues) console.log(`  [${it.scope}] ${it.msg}`);
  process.exit(1);
}
