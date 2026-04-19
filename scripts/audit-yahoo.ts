// End-to-end verification for Yahoo Finance integration.
// Hits Yahoo directly (bypassing the Next.js proxy route) with the same
// normalization logic as src/lib/yahoo.ts, then runs real strategies on the
// resulting candles. Run:
//   npx tsx --tsconfig tsconfig.json scripts/audit-yahoo.ts

import type { Candle } from "@/lib/upbit";
import {
  computeSignals,
  type StrategyId,
  type StrategyParams,
} from "@/lib/strategies";
import { runBacktest } from "@/lib/backtest";
import {
  STOCK_MARKETS,
  currencyOf,
  marketKind,
  yahooTicker,
  formatMoney,
  formatMoneyShort,
} from "@/lib/market";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: { description?: string } | null;
  };
};

async function fetchYahooDirect(
  ticker: string,
  intervalYahoo: string,
  startMs: number,
  endMs: number,
): Promise<Candle[]> {
  const p1 = Math.floor(startMs / 1000);
  const p2 = Math.floor(endMs / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${p1}&period2=${p2}&interval=${intervalYahoo}&events=history`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`yahoo HTTP ${res.status}`);
  const json = (await res.json()) as YahooChartResponse;
  const err = json.chart?.error?.description;
  if (err) throw new Error(`yahoo: ${err}`);
  const r = json.chart?.result?.[0];
  const ts = r?.timestamp ?? [];
  const q = r?.indicators?.quote?.[0];
  if (!q || ts.length === 0) return [];
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    const v = q.volume?.[i];
    if (
      o == null ||
      h == null ||
      l == null ||
      c == null ||
      !Number.isFinite(o) ||
      !Number.isFinite(h) ||
      !Number.isFinite(l) ||
      !Number.isFinite(c)
    ) {
      continue;
    }
    out.push({
      timestamp: ts[i] * 1000,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: Number.isFinite(v ?? NaN) ? (v as number) : 0,
    });
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}

type Issue = { scope: string; msg: string };
const issues: Issue[] = [];
const flag = (scope: string, msg: string) => issues.push({ scope, msg });

async function testTicker(label: string, marketId: string) {
  const ticker = yahooTicker(marketId);
  if (!ticker) {
    flag(label, `not a yahoo market: ${marketId}`);
    return;
  }
  const kind = marketKind(marketId);
  const currency = currencyOf(marketId);

  const endMs = Date.now();
  const startMs = endMs - 365 * 86_400_000;

  let candles: Candle[];
  try {
    candles = await fetchYahooDirect(ticker, "1d", startMs, endMs);
  } catch (e) {
    flag(label, `fetch failed: ${(e as Error).message}`);
    return;
  }

  if (candles.length < 30) {
    flag(label, `too few candles returned: ${candles.length}`);
    return;
  }

  // Timestamp ordering + uniqueness
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].timestamp <= candles[i - 1].timestamp) {
      flag(label, `timestamps not strictly ascending at i=${i}`);
      break;
    }
  }
  // No NaN OHLC
  for (const c of candles) {
    if (
      !Number.isFinite(c.open) ||
      !Number.isFinite(c.high) ||
      !Number.isFinite(c.low) ||
      !Number.isFinite(c.close) ||
      c.low > c.high ||
      c.open <= 0 ||
      c.close <= 0
    ) {
      flag(label, `invalid OHLC: ${JSON.stringify(c)}`);
      break;
    }
  }

  // Run a handful of real strategies
  const tests: [string, StrategyId, StrategyParams][] = [
    ["buy_hold", "buy_hold", {}],
    ["ma_cross 20/60", "ma_cross", { ma_cross: { short: 20, long: 60 } }],
    ["rsi 14", "rsi", { rsi: { period: 14, oversold: 30, overbought: 70 } }],
    ["bollinger 20/2", "bollinger", { bollinger: { period: 20, stddev: 2 } }],
    ["macd 12/26/9", "macd", { macd: { fast: 12, slow: 26, signal: 9 } }],
  ];

  const cash = currency === "USD" ? 10_000 : 10_000_000;
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  const bhRet = (last / first - 1) * 100;

  console.log(
    `\n=== [${kind}/${currency}] ${ticker} (${label}) — ${candles.length} candles, ${formatMoneyShort(first, currency)} → ${formatMoneyShort(last, currency)} (B&H ${bhRet.toFixed(2)}%) ===`,
  );
  for (const [name, strat, params] of tests) {
    const signals = computeSignals(candles, strat, params, { initialCash: cash });
    const r = runBacktest(candles, signals, {
      initialCash: cash,
      feeRate: 0.001,
    });
    if (!Number.isFinite(r.finalEquity) || r.finalEquity < 0) {
      flag(label, `${name}: invalid finalEquity ${r.finalEquity}`);
      continue;
    }
    console.log(
      `  ${name.padEnd(20)} trades=${r.tradeCount.toString().padStart(3)}  ret=${r.returnPct.toFixed(2).padStart(7)}%  bench=${r.benchmarkReturnPct.toFixed(2).padStart(7)}%  MDD=${r.maxDrawdownPct.toFixed(2).padStart(6)}%  finalEq=${formatMoney(r.finalEquity, currency)}`,
    );
  }
}

// Pick representative markets from each group
const picks = [
  ["Apple (US)", "yahoo:AAPL"],
  ["SPY ETF (US)", "yahoo:SPY"],
  ["삼성전자 (KOSPI)", "yahoo:005930.KS"],
  ["카카오게임즈 (KOSDAQ)", "yahoo:293490.KQ"],
];

(async () => {
  // Sanity check: STOCK_MARKETS parsed as expected
  const expectedKinds = { crypto: 0, stock_kr: 0, stock_us: 0 };
  for (const m of STOCK_MARKETS) expectedKinds[m.kind]++;
  console.log(
    `STOCK_MARKETS: ${STOCK_MARKETS.length} entries (KR=${expectedKinds.stock_kr}, US=${expectedKinds.stock_us})`,
  );

  for (const [label, id] of picks) {
    try {
      await testTicker(label, id);
    } catch (e) {
      flag(label, `unexpected throw: ${(e as Error).message}`);
    }
  }

  console.log("\n=== summary ===");
  if (issues.length === 0) {
    console.log("✅ All yahoo fetches normalized cleanly; strategies ran without issue.");
  } else {
    console.log(`⚠️  ${issues.length} issue(s):`);
    for (const it of issues) console.log(`  [${it.scope}] ${it.msg}`);
    process.exit(1);
  }
})();
