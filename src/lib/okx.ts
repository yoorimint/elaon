import type { Candle, Timeframe } from "./upbit";

const BASE = "/api/okx";

// OKX uses uppercase H/D for 1h+. Lowercase for minutes.
function okxBar(tf: Timeframe): string {
  switch (tf) {
    case "1m":
      return "1m";
    case "5m":
      return "5m";
    case "15m":
      return "15m";
    case "30m":
      return "30m";
    case "1h":
      return "1H";
    case "4h":
      return "4H";
    case "1d":
      return "1D";
    case "1w":
      return "1W";
    case "1M":
      return "1M";
  }
}

// OKX history-candles response row:
// [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
type Row = [string, string, string, string, string, string, string, string, string];

type OkxResponse = {
  code?: string;
  msg?: string;
  data?: Row[];
};

export async function fetchOkxPerpCandles(
  instId: string,
  tf: Timeframe,
  startMs: number,
  endMs: number,
): Promise<Candle[]> {
  // history-candles paginates backwards from `after` (exclusive end).
  // We start from endMs and walk back until startMs or empty.
  const bar = okxBar(tf);
  const collected: Candle[] = [];
  let after: number | undefined = endMs;
  for (let guard = 0; guard < 50; guard++) {
    const qs = new URLSearchParams({
      instId,
      bar,
      limit: "100",
    });
    if (after) qs.set("after", String(after));
    const res = await fetch(`${BASE}/api/v5/market/history-candles?${qs.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`OKX 응답 오류 (${res.status})`);
    const json = (await res.json()) as OkxResponse;
    if (json.code !== "0") throw new Error(`OKX: ${json.msg ?? "unknown"}`);
    const rows = json.data ?? [];
    if (rows.length === 0) break;
    let oldest = Infinity;
    for (const r of rows) {
      const ts = Number(r[0]);
      if (!Number.isFinite(ts)) continue;
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
    if (!Number.isFinite(oldest) || oldest <= startMs) break;
    after = oldest;
  }
  return collected
    .filter(
      (c) =>
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close),
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}
