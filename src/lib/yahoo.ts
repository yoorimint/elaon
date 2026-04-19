import type { Candle } from "./upbit";
import type { Timeframe } from "./upbit";
import type { MarketEntry, MarketKind, Currency } from "./market";
// NOTE: market.ts imports fetchYahooCandles from this module at runtime.
// We only use *type* imports from market.ts here, so the circular dep is
// flattened by TS and doesn't produce a runtime cycle.

const BASE = "/api/yahoo";

type YahooSearchQuote = {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string; // EQUITY, ETF, CRYPTOCURRENCY, INDEX, CURRENCY, FUTURE, OPTION, MUTUALFUND
  exchange?: string;
  exchDisp?: string;
};

type YahooSearchResponse = {
  quotes?: YahooSearchQuote[];
};

function classifySymbol(
  symbol: string,
): { kind: MarketKind; currency: Currency } | null {
  if (symbol.endsWith(".KS") || symbol.endsWith(".KQ")) {
    return { kind: "stock_kr", currency: "KRW" };
  }
  // Yahoo suffixes: .T (Tokyo), .HK, .L (London), .PA (Paris), .DE (Germany), etc.
  // We only whitelist symbols without a non-US exchange suffix.
  if (symbol.includes(".")) return null;
  // BRK-B, BF-B 형식의 대시는 허용 (NYSE share class)
  return { kind: "stock_us", currency: "USD" };
}

export async function searchYahoo(query: string): Promise<MarketEntry[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${BASE}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=30&newsCount=0&enableFuzzyQuery=false&lang=en-US&region=US`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const json = (await res.json()) as YahooSearchResponse;
  const quotes = json.quotes ?? [];
  const out: MarketEntry[] = [];
  for (const q of quotes) {
    if (!q.symbol) continue;
    if (q.quoteType !== "EQUITY" && q.quoteType !== "ETF") continue;
    const meta = classifySymbol(q.symbol);
    if (!meta) continue;
    const name = q.longname || q.shortname || q.symbol;
    out.push({
      id: `yahoo:${q.symbol}`,
      name,
      subtitle: q.symbol,
      kind: meta.kind,
      currency: meta.currency,
    });
  }
  return out;
}

// Yahoo supports: 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo,3mo
// Intraday intervals have short history windows (1m→7d, 5m→60d, etc.).
function yahooInterval(tf: Timeframe): string {
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
      return "60m";
    case "4h":
      // Yahoo has no native 4h. Use 1h; caller can resample if needed.
      return "60m";
    case "1d":
      return "1d";
    case "1w":
      return "1wk";
    case "1M":
      return "1mo";
  }
}

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

export async function fetchYahooCandles(
  ticker: string,
  tf: Timeframe,
  startMs: number,
  endMs: number,
): Promise<Candle[]> {
  const p1 = Math.floor(startMs / 1000);
  const p2 = Math.floor(endMs / 1000);
  const url = `${BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${p1}&period2=${p2}&interval=${yahooInterval(tf)}&events=history`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`야후 응답 오류 (${res.status})`);
  const json = (await res.json()) as YahooChartResponse;
  const err = json.chart?.error?.description;
  if (err) throw new Error(`야후: ${err}`);
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
