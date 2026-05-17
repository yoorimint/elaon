// Stooq.com 무료 일봉 데이터 fallback.
// 야후 파이낸스가 실패할 때 사용. CSV 응답.
// 한국 종목: 005930.KR (KOSPI 포함), 미국: AAPL.US 등.

import type { Candle } from "./upbit";

function stooqSymbol(yahooSymbol: string): string {
  // 005930.KS / 005930.KQ → 005930.kr
  if (/\.(KS|KQ)$/i.test(yahooSymbol)) {
    return yahooSymbol.replace(/\.(KS|KQ)$/i, ".kr").toLowerCase();
  }
  // 미국 티커 → AAPL.us
  if (/^[A-Z][A-Z0-9-]{0,5}$/i.test(yahooSymbol)) {
    return `${yahooSymbol.toLowerCase()}.us`;
  }
  return yahooSymbol.toLowerCase();
}

function parseCsv(csv: string): Candle[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  // header: Date,Open,High,Low,Close,Volume
  const out: Candle[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;
    const [date, o, h, l, c, v] = cols;
    const ts = new Date(date + "T00:00:00Z").getTime();
    if (!Number.isFinite(ts)) continue;
    const open = Number(o);
    const high = Number(h);
    const low = Number(l);
    const close = Number(c);
    const volume = v ? Number(v) : 0;
    if (
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }
    out.push({ timestamp: ts, open, high, low, close, volume });
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}

export async function fetchStooqCandles(
  yahooSymbol: string,
): Promise<Candle[]> {
  try {
    const sym = stooqSymbol(yahooSymbol);
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(sym)}&i=d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/csv,text/plain,*/*",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (text.startsWith("<") || text.toLowerCase().includes("no data")) return [];
    return parseCsv(text);
  } catch (e) {
    console.error("[stooq] fetch failed:", yahooSymbol, e);
    return [];
  }
}
