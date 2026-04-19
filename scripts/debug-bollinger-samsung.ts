// 삼성전자 1년 볼린저 백테스트의 모든 시그널 위치를 dump해서
// 왜 특정 구간에 매수/매도 마커가 없는지 확인.

import type { Candle } from "@/lib/upbit";
import { computeSignals, sma, stddev } from "@/lib/strategies";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchSamsung(): Promise<Candle[]> {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 365 * 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/005930.KS?period1=${start}&period2=${now}&interval=1d&events=history`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const json = await res.json();
  const r = json.chart.result[0];
  const ts: number[] = r.timestamp;
  const q = r.indicators.quote[0];
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    if (q.close[i] == null) continue;
    out.push({
      timestamp: ts[i] * 1000,
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
      volume: q.volume[i] ?? 0,
    });
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}

function d(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

async function main() {
  const candles = await fetchSamsung();
  const closes = candles.map((c) => c.close);
  const BB_PERIOD = 20;
  const BB_STD = 2;
  const signals = computeSignals(candles, "bollinger", {
    bollinger: { period: BB_PERIOD, stddev: BB_STD },
  });

  const mid = sma(closes, BB_PERIOD);
  const sd = stddev(closes, BB_PERIOD);

  console.log(`총 ${candles.length}봉`);

  let buys = 0;
  let sells = 0;
  for (let i = 0; i < candles.length; i++) {
    if (signals[i] === "buy") buys++;
    if (signals[i] === "sell") sells++;
  }
  console.log(`매수 시그널: ${buys}, 매도 시그널: ${sells}`);

  console.log("\n=== 시그널 발생 지점 ===");
  for (let i = 0; i < candles.length; i++) {
    if (signals[i] === "buy" || signals[i] === "sell") {
      const m = mid[i]!;
      const s = sd[i]!;
      const lower = m - BB_STD * s;
      const upper = m + BB_STD * s;
      console.log(
        `[${String(signals[i]).padEnd(4)}] ${d(candles[i].timestamp)}  close=${candles[i].close.toFixed(0).padStart(7)}  low=${candles[i].low.toFixed(0).padStart(7)}  BB lower=${lower.toFixed(0).padStart(7)} upper=${upper.toFixed(0).padStart(7)}`,
      );
    }
  }

  // 3~4월 구간 (화면에 보인 구간) 상세
  console.log("\n=== 3~4월 근처 구간 상세 (꼬리만 하단 이탈 포함) ===");
  for (let i = 0; i < candles.length; i++) {
    const t = new Date(candles[i].timestamp);
    const y = t.getUTCFullYear();
    const mo = t.getUTCMonth();
    if (!((y === 2025 || y === 2026) && (mo === 2 || mo === 3))) continue;
    const m = mid[i];
    const s = sd[i];
    if (m == null || s == null) continue;
    const lower = m - BB_STD * s;
    const closeBelow = candles[i].close <= lower;
    const lowBelow = candles[i].low <= lower;
    const mark =
      signals[i] === "buy"
        ? "▲매수"
        : signals[i] === "sell"
          ? "▼매도"
          : closeBelow
            ? " 종가↓하단"
            : lowBelow
              ? " 꼬리만↓하단"
              : "";
    console.log(
      `${d(candles[i].timestamp)}  open=${candles[i].open.toFixed(0).padStart(7)}  close=${candles[i].close.toFixed(0).padStart(7)}  low=${candles[i].low.toFixed(0).padStart(7)}  BB lower=${lower.toFixed(0).padStart(7)}  ${mark}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
