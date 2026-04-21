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

// 브라우저 → /api/upbit 프록시, 서버 → Upbit 직통
const BASE =
  typeof window === "undefined" ? "https://api.upbit.com/v1" : "/api/upbit";

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

export type Timeframe =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "1d"
  | "1w"
  | "1M";

export const TIMEFRAMES: { id: Timeframe; label: string; seconds: number }[] = [
  { id: "1m", label: "1분", seconds: 60 },
  { id: "5m", label: "5분", seconds: 60 * 5 },
  { id: "15m", label: "15분", seconds: 60 * 15 },
  { id: "30m", label: "30분", seconds: 60 * 30 },
  { id: "1h", label: "1시간", seconds: 60 * 60 },
  { id: "4h", label: "4시간", seconds: 60 * 60 * 4 },
  { id: "1d", label: "1일", seconds: 86400 },
  { id: "1w", label: "1주", seconds: 86400 * 7 },
  { id: "1M", label: "1달", seconds: 86400 * 30 },
];

function timeframeEndpoint(tf: Timeframe): string {
  switch (tf) {
    case "1m":
      return "candles/minutes/1";
    case "5m":
      return "candles/minutes/5";
    case "15m":
      return "candles/minutes/15";
    case "30m":
      return "candles/minutes/30";
    case "1h":
      return "candles/minutes/60";
    case "4h":
      return "candles/minutes/240";
    case "1d":
      return "candles/days";
    case "1w":
      return "candles/weeks";
    case "1M":
      return "candles/months";
  }
}

async function fetchCandlesPage(
  endpoint: string,
  market: string,
  count: number,
  to?: string,
): Promise<Candle[]> {
  const params = new URLSearchParams({ market, count: String(count) });
  if (to) params.set("to", to);
  const res = await fetchWithRetry(`${BASE}/${endpoint}?${params.toString()}`);
  const raw = (await res.json()) as Array<{
    candle_date_time_utc: string;
    timestamp: number;
    opening_price: number;
    high_price: number;
    low_price: number;
    trade_price: number;
    candle_acc_trade_volume: number;
  }>;
  // Upbit의 `timestamp` 필드는 "봉 안에서 마지막 체결 시각"이라 아직 닫히지 않은
  // 봉은 매 체결마다 값이 바뀐다. 모의투자의 중복 처리 방지가 깨지므로, 불변인
  // 봉 시작 시각(`candle_date_time_utc`)을 파싱해서 timestamp로 사용한다.
  return raw
    .map((c) => ({
      timestamp: Date.parse(c.candle_date_time_utc + "Z"),
      open: c.opening_price,
      high: c.high_price,
      low: c.low_price,
      close: c.trade_price,
      volume: c.candle_acc_trade_volume,
    }))
    .reverse();
}

export async function fetchDailyCandles(
  market: string,
  count: number,
  to?: string,
): Promise<Candle[]> {
  return fetchCandlesPage("candles/days", market, count, to);
}

export async function fetchCandlesBetween(
  market: string,
  tf: Timeframe,
  startMs: number,
  endMs: number,
  maxBars = 5000,
): Promise<Candle[]> {
  if (endMs <= startMs) throw new Error("시작일이 종료일보다 늦습니다");
  const endpoint = timeframeEndpoint(tf);
  const tfEntry = TIMEFRAMES.find((t) => t.id === tf)!;
  const estBars = Math.ceil((endMs - startMs) / (tfEntry.seconds * 1000)) + 2;
  let remaining = Math.min(estBars, maxBars);

  const out: Candle[] = [];
  let to: string | undefined = new Date(endMs + tfEntry.seconds * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");

  while (remaining > 0) {
    const batch = Math.min(200, remaining);
    const chunk = await fetchCandlesPage(endpoint, market, batch, to);
    if (chunk.length === 0) break;
    const inRange = chunk.filter(
      (c) => c.timestamp >= startMs && c.timestamp <= endMs + tfEntry.seconds * 1000,
    );
    out.unshift(...inRange);
    remaining -= chunk.length;
    const earliest = chunk[0];
    to = new Date(earliest.timestamp - 1).toISOString().replace(/\.\d{3}Z$/, "Z");
    if (chunk.length < batch || earliest.timestamp < startMs) break;
    await sleep(150);
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
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
