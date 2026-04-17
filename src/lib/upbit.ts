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

const BASE = "/api/upbit";

class UpbitError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "UpbitError";
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  url: string,
  opts: { retries?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const retries = opts.retries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 10000;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 429) {
        if (attempt < retries) {
          await sleep(800 * Math.pow(2, attempt));
          continue;
        }
        throw new UpbitError("업비트 요청 제한에 걸렸습니다. 잠시 후 다시 시도해주세요.", 429);
      }
      if (!res.ok) {
        throw new UpbitError(`업비트 응답 오류 (${res.status})`, res.status);
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (e instanceof UpbitError) throw e;

      const isAbort = e instanceof DOMException && e.name === "AbortError";
      const isNetwork = e instanceof TypeError;

      if (attempt < retries && (isAbort || isNetwork)) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }

      if (isAbort) {
        throw new UpbitError("업비트 응답이 너무 느립니다. 네트워크를 확인해주세요.");
      }
      if (isNetwork) {
        throw new UpbitError("네트워크 오류입니다. 잠시 후 다시 시도해주세요.");
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new UpbitError("알 수 없는 오류");
}

export async function fetchMarkets(): Promise<UpbitMarket[]> {
  const res = await fetchWithRetry(`${BASE}/market/all?isDetails=false`);
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
  const res = await fetchWithRetry(`${BASE}/candles/days?${params.toString()}`);
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
    await sleep(150);
  }
  return out;
}

export async function fetchDailyCandlesBetween(
  market: string,
  startMs: number,
  endMs: number,
): Promise<Candle[]> {
  if (endMs <= startMs) throw new Error("시작일이 종료일보다 늦습니다");
  const out: Candle[] = [];
  const days = Math.ceil((endMs - startMs) / 86400000) + 1;
  let remaining = days;
  let to: string | undefined = new Date(endMs + 86400000).toISOString().replace(/\.\d{3}Z$/, "Z");

  while (remaining > 0) {
    const batch = Math.min(200, remaining);
    const chunk = await fetchDailyCandles(market, batch, to);
    if (chunk.length === 0) break;
    const inRange = chunk.filter((c) => c.timestamp >= startMs && c.timestamp <= endMs + 86400000);
    out.unshift(...inRange);
    remaining -= chunk.length;
    const earliest = chunk[0];
    to = new Date(earliest.timestamp - 1).toISOString().replace(/\.\d{3}Z$/, "Z");
    if (chunk.length < batch || earliest.timestamp < startMs) break;
    await sleep(150);
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}
