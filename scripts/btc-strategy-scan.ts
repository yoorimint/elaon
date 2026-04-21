// KRW-BTC 일봉 실제 데이터로 전 프리셋 전략을 돌려 수익률 상위를 뽑는 스캔.
// Run: npx tsx --tsconfig tsconfig.json scripts/btc-strategy-scan.ts

import type { Candle } from "@/lib/upbit";
import {
  computeSignals,
  type StrategyId,
  type StrategyParams,
} from "@/lib/strategies";
import { runBacktest } from "@/lib/backtest";

// 업비트 공개 API 직접 호출 (스크립트라 내부 프록시 못 씀)
async function fetchBtcDailyCandles(count = 800): Promise<Candle[]> {
  const all: Candle[] = [];
  let to: string | undefined;
  let remaining = count;
  while (remaining > 0) {
    const batch = Math.min(200, remaining);
    const url = new URL("https://api.upbit.com/v1/candles/days");
    url.searchParams.set("market", "KRW-BTC");
    url.searchParams.set("count", String(batch));
    if (to) url.searchParams.set("to", to);
    const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Upbit ${res.status}`);
    const raw = (await res.json()) as Array<{
      timestamp: number;
      opening_price: number;
      high_price: number;
      low_price: number;
      trade_price: number;
      candle_acc_trade_volume: number;
    }>;
    if (raw.length === 0) break;
    const chunk = raw
      .map((c) => ({
        timestamp: c.timestamp,
        open: c.opening_price,
        high: c.high_price,
        low: c.low_price,
        close: c.trade_price,
        volume: c.candle_acc_trade_volume,
      }))
      .reverse();
    all.unshift(...chunk);
    remaining -= chunk.length;
    const earliest = chunk[0];
    to = new Date(earliest.timestamp - 1).toISOString().replace(/\.\d{3}Z$/, "Z");
    if (chunk.length < batch) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

type Preset = { name: string; strategy: StrategyId; params: StrategyParams };
const PRESETS: Preset[] = [
  { name: "buy_hold", strategy: "buy_hold", params: {} },
  { name: "MA 20/60", strategy: "ma_cross", params: { ma_cross: { short: 20, long: 60 } } },
  { name: "MA 5/20", strategy: "ma_cross", params: { ma_cross: { short: 5, long: 20 } } },
  { name: "MA 10/30", strategy: "ma_cross", params: { ma_cross: { short: 10, long: 30 } } },
  { name: "MA 50/200", strategy: "ma_cross", params: { ma_cross: { short: 50, long: 200 } } },
  { name: "RSI 14/30-70", strategy: "rsi", params: { rsi: { period: 14, oversold: 30, overbought: 70 } } },
  { name: "RSI 14/25-75", strategy: "rsi", params: { rsi: { period: 14, oversold: 25, overbought: 75 } } },
  { name: "Bollinger 20/2 close", strategy: "bollinger", params: { bollinger: { period: 20, stddev: 2, touch: "close" } } },
  { name: "Bollinger 20/2 wick", strategy: "bollinger", params: { bollinger: { period: 20, stddev: 2, touch: "wick" } } },
  { name: "MACD 12/26/9", strategy: "macd", params: { macd: { fast: 12, slow: 26, signal: 9 } } },
  { name: "Breakout k=0.5", strategy: "breakout", params: { breakout: { k: 0.5 } } },
  { name: "Breakout k=0.3", strategy: "breakout", params: { breakout: { k: 0.3 } } },
  { name: "Stoch 14/3", strategy: "stoch", params: { stoch: { period: 14, smooth: 3, oversold: 20, overbought: 80 } } },
  { name: "Ichimoku 9/26/52", strategy: "ichimoku", params: { ichimoku: { conversion: 9, base: 26, lagging: 52 } } },
  { name: "DCA 7d 100k", strategy: "dca", params: { dca: { intervalDays: 7, amountKRW: 100_000 } } },
  { name: "DCA 30d 500k", strategy: "dca", params: { dca: { intervalDays: 30, amountKRW: 500_000 } } },
  { name: "MA-DCA 7d 100k/60", strategy: "ma_dca", params: { ma_dca: { intervalDays: 7, amountKRW: 100_000, maPeriod: 60 } } },
];

type ScanResult = {
  name: string;
  period: string;
  ret: number;
  bh: number;
  mdd: number;
  winRate: number;
  trades: number;
};

function runScan(candles: Candle[], periodLabel: string): ScanResult[] {
  const opts = { initialCash: 1_000_000, feeRate: 0.0005 };
  const results: ScanResult[] = [];
  for (const preset of PRESETS) {
    try {
      const params =
        preset.strategy === "grid"
          ? {
              grid: {
                low: Math.min(...candles.map((c) => c.close)),
                high: Math.max(...candles.map((c) => c.close)),
                grids: 10,
                mode: "geom" as const,
              },
            }
          : preset.params;
      const signals = computeSignals(candles, preset.strategy, params, {
        initialCash: opts.initialCash,
      });
      const r = runBacktest(candles, signals, opts);
      results.push({
        name: preset.name,
        period: periodLabel,
        ret: r.returnPct,
        bh: r.benchmarkReturnPct,
        mdd: r.maxDrawdownPct,
        winRate: r.winRate,
        trades: r.tradeCount,
      });
    } catch (e) {
      results.push({
        name: preset.name,
        period: periodLabel,
        ret: NaN,
        bh: NaN,
        mdd: NaN,
        winRate: NaN,
        trades: 0,
      });
    }
  }
  // 그리드는 BTC 구간에 맞춰 별도 계산
  try {
    const closes = candles.map((c) => c.close);
    const gp = {
      grid: {
        low: Math.min(...closes),
        high: Math.max(...closes),
        grids: 10,
        mode: "geom" as const,
      },
    };
    const sig = computeSignals(candles, "grid", gp, { initialCash: opts.initialCash });
    const r = runBacktest(candles, sig, opts);
    results.push({
      name: "Grid 10-geom (auto range)",
      period: periodLabel,
      ret: r.returnPct,
      bh: r.benchmarkReturnPct,
      mdd: r.maxDrawdownPct,
      winRate: r.winRate,
      trades: r.tradeCount,
    });
  } catch {}
  return results;
}

(async function main() {
  console.log("Fetching KRW-BTC daily candles from Upbit…");
  const all = await fetchBtcDailyCandles(800);
  console.log(`got ${all.length} daily candles (${new Date(all[0].timestamp).toISOString().slice(0, 10)} → ${new Date(all[all.length - 1].timestamp).toISOString().slice(0, 10)})`);

  const PERIODS: { label: string; days: number }[] = [
    { label: "1Y", days: 365 },
    { label: "2Y", days: 730 },
  ];
  const all2Y = all.slice(-730);
  const all1Y = all.slice(-365);
  console.log(`\n1Y  price  ${Math.round(all1Y[0].close).toLocaleString()} → ${Math.round(all1Y[all1Y.length - 1].close).toLocaleString()}`);
  console.log(`2Y  price  ${Math.round(all2Y[0].close).toLocaleString()} → ${Math.round(all2Y[all2Y.length - 1].close).toLocaleString()}`);

  const r1 = runScan(all1Y, "1Y");
  const r2 = runScan(all2Y, "2Y");
  const allRes = [...r1, ...r2].filter((r) => Number.isFinite(r.ret));
  allRes.sort((a, b) => b.ret - a.ret);

  console.log("\n=== TOP 전략 by 수익률 (전체) ===");
  console.log("name".padEnd(30), "period", "return", "B&H", "MDD", "trades");
  for (const r of allRes.slice(0, 20)) {
    console.log(
      r.name.padEnd(30),
      r.period.padEnd(6),
      `${r.ret >= 0 ? "+" : ""}${r.ret.toFixed(1)}%`.padStart(9),
      `${r.bh >= 0 ? "+" : ""}${r.bh.toFixed(1)}%`.padStart(9),
      `${r.mdd.toFixed(1)}%`.padStart(7),
      String(r.trades).padStart(5),
    );
  }

  // B&H 대비 초과 수익 순위
  const vsBh = allRes.slice().sort((a, b) => (b.ret - b.bh) - (a.ret - a.bh));
  console.log("\n=== B&H 대비 초과 수익 순위 ===");
  console.log("name".padEnd(30), "period", "excess", "return", "B&H");
  for (const r of vsBh.slice(0, 10)) {
    const excess = r.ret - r.bh;
    console.log(
      r.name.padEnd(30),
      r.period.padEnd(6),
      `${excess >= 0 ? "+" : ""}${excess.toFixed(1)}%p`.padStart(9),
      `${r.ret >= 0 ? "+" : ""}${r.ret.toFixed(1)}%`.padStart(9),
      `${r.bh >= 0 ? "+" : ""}${r.bh.toFixed(1)}%`.padStart(9),
    );
  }
})();
