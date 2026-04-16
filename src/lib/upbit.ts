export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type UpbitMarket = {
  market: string;
  korean_name: string;
  english_name: string;
};

const BASE = "https://api.upbit.com/v1";

export async function fetchMarkets(): Promise<UpbitMarket[]> {
  const res = await fetch(`${BASE}/market/all?isDetails=false`);
  if (!res.ok) throw new Error("업비트 마켓 조회 실패");
  const all = (await res.json()) as UpbitMarket[];
  return all.filter((m) => m.market.startsWith("KRW-"));
}

export async function fetchDailyCandles(
  market: string,
  count: number,
  to?: string,
): Promise<Candle[]> {
  const params = new URLSearchParams({ market, count: String(count) });
  if (to) params.set("to", to);
  const res = await fetch(`${BASE}/candles/days?${params.toString()}`);
  if (!res.ok) throw new Error("캔들 조회 실패");
  const raw = (await res.json()) as Array<{
    timestamp: number;
    opening_price: number;
    high_price: number;
    low_price: number;
    trade_price: number;
    candle_acc_trade_volume: number;
  }>;
  return raw
    .map((c) => ({
      timestamp: c.timestamp,
      open: c.opening_price,
      high: c.high_price,
      low: c.low_price,
      close: c.trade_price,
      volume: c.candle_acc_trade_volume,
    }))
    .reverse();
}

export async function fetchDailyCandlesRange(
  market: string,
  days: number,
): Promise<Candle[]> {
  const out: Candle[] = [];
  let remaining = days;
  let to: string | undefined;
  while (remaining > 0) {
    const batch = Math.min(200, remaining);
    const chunk = await fetchDailyCandles(market, batch, to);
    if (chunk.length === 0) break;
    out.unshift(...chunk);
    remaining -= chunk.length;
    const earliest = chunk[0];
    to = new Date(earliest.timestamp - 1).toISOString().replace(/\.\d{3}Z$/, "Z");
    if (chunk.length < batch) break;
  }
  return out;
}
