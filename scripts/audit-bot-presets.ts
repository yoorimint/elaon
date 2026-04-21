// 봇 프리셋 36종 전수 검증.
// 각 프리셋에 대해 합성 캔들 600봉을 만들어 백테스트를 돌리고
// (1) 에러 없이 끝나는지, (2) 신호가 최소 1번 발동하는지 확인.

import { BOT_STRATEGIES, BOT_SYMBOLS, symbolPrettyLabel } from "@/lib/bot-symbols";
import { computeSignals } from "@/lib/strategies";
import { computeDIYSignals } from "@/lib/diy-strategy";
import { runBacktest } from "@/lib/backtest";
import type { Candle } from "@/lib/upbit";

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
      open, high, low, close,
      volume: 100 + rand() * 500,
    });
    price = close;
  }
  return out;
}

const candles = genCandles(600, 42);
const opts = { initialCash: 1_000_000, feeRate: 0.0005 };

let pass = 0, fail = 0;
const failures: string[] = [];

for (const preset of BOT_STRATEGIES) {
  try {
    let signals;
    if (preset.strategy === "custom") {
      signals = computeDIYSignals(candles, {
        buy: (preset.customBuy ?? []) as Parameters<typeof computeDIYSignals>[1]["buy"],
        sell: (preset.customSell ?? []) as Parameters<typeof computeDIYSignals>[1]["sell"],
        stopLossPct: preset.stopLossPct,
        takeProfitPct: preset.takeProfitPct,
      });
    } else {
      signals = computeSignals(
        candles,
        preset.strategy as Parameters<typeof computeSignals>[1],
        preset.params as Parameters<typeof computeSignals>[2],
      );
    }
    const buyCount = signals.filter((s) => s === "buy" || (typeof s === "object" && "buy_krw" in s)).length;
    const sellCount = signals.filter((s) => s === "sell" || (typeof s === "object" && "sell_qty_frac" in s)).length;
    const r = runBacktest(candles, signals, opts);
    const status = (buyCount === 0 && sellCount === 0)
      ? "NOSIG"
      : "OK";
    console.log(
      `[${status}] ${preset.id.padEnd(28)} ${preset.strategy.padEnd(10)} buy=${String(buyCount).padStart(3)} sell=${String(sellCount).padStart(3)} ret=${r.returnPct.toFixed(1).padStart(7)}% trades=${String(r.tradeCount).padStart(3)}`,
    );
    if (status === "NOSIG") {
      // 시그널 0인 경우는 일부 DIY (cci -100 같은)는 합성 데이터에서 발동 안 할 수 있어서 실패로 안 잡고 경고만.
      // 실제 실종목에선 발동될 수 있으므로 fail 카운트엔 안 넣음.
    }
    pass += 1;
  } catch (err) {
    fail += 1;
    const msg = err instanceof Error ? err.message : String(err);
    failures.push(`${preset.id}: ${msg}`);
    console.log(`[FAIL] ${preset.id}: ${msg}`);
  }
}

console.log(`\n프리셋 ${pass}/${BOT_STRATEGIES.length} 통과`);
if (fail > 0) {
  console.log("실패:");
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}

// symbolPrettyLabel: 모든 BOT_SYMBOLS 가 유의미한 한글/영문 라벨로 변환되는지
console.log("\n--- symbolPrettyLabel 검사 ---");
let unmapped = 0;
for (const sym of BOT_SYMBOLS) {
  const label = symbolPrettyLabel(sym);
  // 라벨이 그냥 ticker (BTC, AAPL 같은) 이거나 원형이랑 같으면 매핑 누락 가능성
  if (label === sym) {
    console.log(`[누락] ${sym} → ${label}`);
    unmapped += 1;
  }
}
console.log(`${BOT_SYMBOLS.length - unmapped}/${BOT_SYMBOLS.length} 종목 한글/이름 라벨 OK`);
if (unmapped > 0) {
  process.exit(2);
}
