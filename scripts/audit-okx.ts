// E2E check: OKX perp candles → backtest pipeline.
import type { Candle } from "@/lib/upbit";
import { computeSignals } from "@/lib/strategies";
import { runBacktest } from "@/lib/backtest";
import { formatMoney, formatMoneyShort } from "@/lib/market";

type Row = [string, string, string, string, string, string, string, string, string];

async function fetchOkxHistoryCandles(
  instId: string,
  bar: string,
  days: number,
): Promise<Candle[]> {
  const endMs = Date.now();
  const startMs = endMs - days * 86400000;
  const collected: Candle[] = [];
  let after: number | undefined = endMs;
  for (let guard = 0; guard < 50; guard++) {
    const qs = new URLSearchParams({ instId, bar, limit: "100" });
    if (after) qs.set("after", String(after));
    const res = await fetch(
      `https://www.okx.com/api/v5/market/history-candles?${qs.toString()}`,
    );
    if (!res.ok) throw new Error(`OKX ${res.status}`);
    const json = (await res.json()) as { code?: string; data?: Row[] };
    if (json.code !== "0") throw new Error(`OKX ${json.code}`);
    const rows = json.data ?? [];
    if (rows.length === 0) break;
    let oldest = Infinity;
    for (const r of rows) {
      const ts = Number(r[0]);
      if (ts < startMs) continue;
      collected.push({
        timestamp: ts,
        open: Number(r[1]),
        high: Number(r[2]),
        low: Number(r[3]),
        close: Number(r[4]),
        volume: Number(r[5]),
      });
      oldest = Math.min(oldest, ts);
    }
    if (oldest <= startMs || !Number.isFinite(oldest)) break;
    after = oldest;
  }
  return collected.sort((a, b) => a.timestamp - b.timestamp);
}

async function test(label: string, instId: string) {
  const candles = await fetchOkxHistoryCandles(instId, "1D", 365);
  console.log(
    `\n=== ${label} (${instId}) — ${candles.length}봉, ${formatMoneyShort(candles[0].close, "USD")} → ${formatMoneyShort(candles[candles.length - 1].close, "USD")} ===`,
  );
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].timestamp <= candles[i - 1].timestamp) {
      console.log("  ⚠️ 타임스탬프 단조성 위반 at", i);
      break;
    }
  }
  const tests: [string, "buy_hold" | "ma_cross" | "rsi" | "bollinger"][] = [
    ["buy_hold", "buy_hold"],
    ["MA 20/60", "ma_cross"],
    ["RSI 14", "rsi"],
    ["볼린저 20/2", "bollinger"],
  ];
  const cash = 10_000;
  for (const [name, strat] of tests) {
    const signals = computeSignals(
      candles,
      strat,
      {
        ma_cross: { short: 20, long: 60 },
        rsi: { period: 14, oversold: 30, overbought: 70 },
        bollinger: { period: 20, stddev: 2 },
      },
      { initialCash: cash },
    );
    const r = runBacktest(candles, signals, { initialCash: cash, feeRate: 0.0005 });
    console.log(
      `  ${name.padEnd(12)} trades=${r.tradeCount.toString().padStart(3)}  ret=${r.returnPct.toFixed(2).padStart(7)}%  bench=${r.benchmarkReturnPct.toFixed(2).padStart(7)}%  MDD=${r.maxDrawdownPct.toFixed(2).padStart(6)}%  finalEq=${formatMoney(r.finalEquity, "USD")}`,
    );
  }
}

(async () => {
  for (const [l, id] of [
    ["비트코인 선물", "BTC-USDT-SWAP"],
    ["이더리움 선물", "ETH-USDT-SWAP"],
    ["솔라나 선물", "SOL-USDT-SWAP"],
  ]) {
    try {
      await test(l, id);
    } catch (e) {
      console.log(`[${l}] 실패: ${(e as Error).message}`);
    }
  }
})();
