import type { Candle } from "./upbit";
import { fetchCandlesBetween, type Timeframe, type UpbitMarket } from "./upbit";
import { fetchYahooCandles } from "./yahoo";

export type Currency = "KRW" | "USD";

export type MarketKind = "crypto" | "stock_kr" | "stock_us";

export type MarketEntry = {
  // Canonical id used throughout the app.
  //   "KRW-BTC"                → Upbit crypto (backward compatible)
  //   "yahoo:005930.KS"        → KOSPI (Korean stock, KRW)
  //   "yahoo:035720.KQ"        → KOSDAQ (Korean stock, KRW)
  //   "yahoo:AAPL"             → US stock (USD)
  id: string;
  name: string; // 한국어 이름 (있으면)
  subtitle?: string; // 영문명 또는 티커 부가설명
  kind: MarketKind;
  currency: Currency;
};

// 주요 코스피 종목 (시총 상위 + 인지도)
const KOSPI: MarketEntry[] = [
  ["005930.KS", "삼성전자", "Samsung Electronics"],
  ["000660.KS", "SK하이닉스", "SK Hynix"],
  ["373220.KS", "LG에너지솔루션", "LG Energy Solution"],
  ["207940.KS", "삼성바이오로직스", "Samsung Biologics"],
  ["005380.KS", "현대차", "Hyundai Motor"],
  ["000270.KS", "기아", "Kia"],
  ["068270.KS", "셀트리온", "Celltrion"],
  ["005490.KS", "POSCO홀딩스", "POSCO Holdings"],
  ["035420.KS", "NAVER", "Naver"],
  ["051910.KS", "LG화학", "LG Chem"],
  ["006400.KS", "삼성SDI", "Samsung SDI"],
  ["105560.KS", "KB금융", "KB Financial"],
  ["055550.KS", "신한지주", "Shinhan Financial"],
  ["012330.KS", "현대모비스", "Hyundai Mobis"],
  ["028260.KS", "삼성물산", "Samsung C&T"],
  ["066570.KS", "LG전자", "LG Electronics"],
  ["003550.KS", "LG", "LG Corp"],
  ["017670.KS", "SK텔레콤", "SK Telecom"],
  ["030200.KS", "KT", "KT"],
  ["096770.KS", "SK이노베이션", "SK Innovation"],
  ["316140.KS", "우리금융지주", "Woori Financial"],
  ["086790.KS", "하나금융지주", "Hana Financial"],
  ["015760.KS", "한국전력", "KEPCO"],
  ["034730.KS", "SK", "SK Holdings"],
  ["032830.KS", "삼성생명", "Samsung Life"],
  ["018260.KS", "삼성에스디에스", "Samsung SDS"],
  ["010130.KS", "고려아연", "Korea Zinc"],
  ["009150.KS", "삼성전기", "Samsung Electro-Mechanics"],
  ["011200.KS", "HMM", "HMM"],
  ["259960.KS", "크래프톤", "Krafton"],
].map(([id, name, subtitle]) => ({
  id: `yahoo:${id}`,
  name,
  subtitle,
  kind: "stock_kr" as const,
  currency: "KRW" as const,
}));

const KOSDAQ: MarketEntry[] = [
  ["035720.KS", "카카오", "Kakao"], // note: Kakao is actually on KOSPI, not KOSDAQ
  ["293490.KQ", "카카오게임즈", "Kakao Games"],
  ["041510.KQ", "에스엠", "SM Entertainment"],
  ["035900.KQ", "JYP Ent.", "JYP"],
  ["352820.KQ", "하이브", "HYBE"],
  ["091990.KQ", "셀트리온헬스케어", "Celltrion Healthcare"],
  ["247540.KQ", "에코프로비엠", "Ecopro BM"],
  ["086520.KQ", "에코프로", "Ecopro"],
  ["196170.KQ", "알테오젠", "Alteogen"],
  ["068760.KQ", "셀트리온제약", "Celltrion Pharm"],
].map(([id, name, subtitle]) => ({
  id: `yahoo:${id}`,
  name,
  subtitle,
  kind: "stock_kr" as const,
  currency: "KRW" as const,
}));

// 미국 주식 (대형주 + 인기종목)
const US_STOCKS: MarketEntry[] = [
  ["AAPL", "Apple"],
  ["MSFT", "Microsoft"],
  ["NVDA", "NVIDIA"],
  ["GOOGL", "Alphabet (Google)"],
  ["AMZN", "Amazon"],
  ["META", "Meta"],
  ["TSLA", "Tesla"],
  ["BRK-B", "Berkshire Hathaway B"],
  ["AVGO", "Broadcom"],
  ["JPM", "JPMorgan Chase"],
  ["V", "Visa"],
  ["MA", "Mastercard"],
  ["WMT", "Walmart"],
  ["UNH", "UnitedHealth"],
  ["PG", "Procter & Gamble"],
  ["COST", "Costco"],
  ["HD", "Home Depot"],
  ["ORCL", "Oracle"],
  ["NFLX", "Netflix"],
  ["DIS", "Disney"],
  ["ADBE", "Adobe"],
  ["CRM", "Salesforce"],
  ["AMD", "AMD"],
  ["INTC", "Intel"],
  ["PEP", "PepsiCo"],
  ["KO", "Coca-Cola"],
  ["MCD", "McDonald's"],
  ["NKE", "Nike"],
  ["SBUX", "Starbucks"],
  ["BA", "Boeing"],
  ["COIN", "Coinbase"],
  ["MSTR", "MicroStrategy"],
  ["PLTR", "Palantir"],
  ["SNOW", "Snowflake"],
  ["UBER", "Uber"],
  ["ABNB", "Airbnb"],
  ["SHOP", "Shopify"],
  ["PYPL", "PayPal"],
  ["SQ", "Block (Square)"],
  ["QQQ", "Invesco QQQ Trust"],
  ["SPY", "SPDR S&P 500"],
  ["VOO", "Vanguard S&P 500"],
].map(([id, name]) => ({
  id: `yahoo:${id}`,
  name,
  subtitle: id,
  kind: "stock_us" as const,
  currency: "USD" as const,
}));

export const STOCK_MARKETS: MarketEntry[] = [...KOSPI, ...KOSDAQ, ...US_STOCKS];

export function cryptoToEntry(m: UpbitMarket): MarketEntry {
  return {
    id: m.market,
    name: m.korean_name,
    subtitle: m.english_name,
    kind: "crypto",
    currency: "KRW",
  };
}

export function marketKind(marketId: string): MarketKind {
  if (marketId.startsWith("yahoo:")) {
    const t = marketId.slice("yahoo:".length);
    return t.endsWith(".KS") || t.endsWith(".KQ") ? "stock_kr" : "stock_us";
  }
  return "crypto";
}

export function currencyOf(marketId: string): Currency {
  const kind = marketKind(marketId);
  return kind === "stock_us" ? "USD" : "KRW";
}

export function yahooTicker(marketId: string): string | null {
  if (!marketId.startsWith("yahoo:")) return null;
  return marketId.slice("yahoo:".length);
}

// Dispatch candle fetch to the right source.
export async function fetchCandlesForMarket(
  marketId: string,
  tf: Timeframe,
  startMs: number,
  endMs: number,
): Promise<Candle[]> {
  const yt = yahooTicker(marketId);
  if (yt) {
    return fetchYahooCandles(yt, tf, startMs, endMs);
  }
  return fetchCandlesBetween(marketId, tf, startMs, endMs);
}

// Formatting helpers.
export function formatMoney(v: number, currency: Currency): string {
  if (!Number.isFinite(v)) return "-";
  if (currency === "USD") {
    return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v)}`;
  }
  return `₩${new Intl.NumberFormat("ko-KR").format(Math.round(v))}`;
}

export function formatMoneyShort(v: number, currency: Currency): string {
  if (!Number.isFinite(v)) return "-";
  if (currency === "USD") {
    const abs = Math.abs(v);
    if (abs >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
    return `$${v.toFixed(2)}`;
  }
  const abs = Math.abs(v);
  if (abs >= 100_000_000) return `${(v / 100_000_000).toFixed(2)}억`;
  if (abs >= 10_000) return `${(v / 10_000).toFixed(1)}만`;
  if (abs >= 100) return v.toFixed(0);
  return v.toFixed(2);
}

export function currencySymbol(currency: Currency): string {
  return currency === "USD" ? "$" : "원";
}
