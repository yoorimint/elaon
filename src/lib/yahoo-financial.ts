// 야후 파이낸스 quote summary API — 재무 지표 fallback.
// DART 가 Vercel runtime IP 풀을 차단하는 경우 대안 데이터 소스.
// 기존 /api/yahoo Edge proxy 통해 호출 (server runtime 429 우회).

type YahooQuoteModule = {
  defaultKeyStatistics?: {
    forwardPE?: { raw?: number };
    trailingEps?: { raw?: number };
    priceToBook?: { raw?: number };
  };
  financialData?: {
    returnOnEquity?: { raw?: number };
    operatingMargins?: { raw?: number };
    debtToEquity?: { raw?: number };
    profitMargins?: { raw?: number };
  };
  summaryDetail?: {
    trailingPE?: { raw?: number };
    dividendYield?: { raw?: number };
    marketCap?: { raw?: number };
  };
  price?: {
    marketCap?: { raw?: number };
  };
};

export type YahooFinancial = {
  per: number | null;
  pbr: number | null;
  roe: number | null;
  eps: number | null;
  operatingMargin: number | null;
  debtRatio: number | null;
  marketCap: number | null;
  dividendYield: number | null;
  source: "Yahoo";
};

const PROXY = "https://www.eloan.kr/api/yahoo";

export async function fetchYahooFinancial(
  symbol: string,
): Promise<YahooFinancial | null> {
  try {
    const modules = "defaultKeyStatistics,financialData,summaryDetail,price";
    const url = `${PROXY}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json();
    const r: YahooQuoteModule | undefined = json?.quoteSummary?.result?.[0];
    if (!r) return null;
    const ks = r.defaultKeyStatistics ?? {};
    const fd = r.financialData ?? {};
    const sd = r.summaryDetail ?? {};

    const per = sd.trailingPE?.raw ?? ks.forwardPE?.raw ?? null;
    const pbr = ks.priceToBook?.raw ?? null;
    const eps = ks.trailingEps?.raw ?? null;
    const roeRaw = fd.returnOnEquity?.raw;
    const roe = roeRaw != null ? roeRaw * 100 : null;
    const opmRaw = fd.operatingMargins?.raw;
    const operatingMargin = opmRaw != null ? opmRaw * 100 : null;
    const debtRatio = fd.debtToEquity?.raw ?? null;
    const marketCap = sd.marketCap?.raw ?? r.price?.marketCap?.raw ?? null;
    const dyRaw = sd.dividendYield?.raw;
    const dividendYield = dyRaw != null ? dyRaw * 100 : null;

    // 모든 값이 null 이면 의미 없음
    if (
      per === null &&
      pbr === null &&
      roe === null &&
      eps === null &&
      operatingMargin === null &&
      marketCap === null
    ) {
      return null;
    }

    return {
      per,
      pbr,
      roe,
      eps,
      operatingMargin,
      debtRatio,
      marketCap,
      dividendYield,
      source: "Yahoo",
    };
  } catch (e) {
    console.error("[yahoo-financial] fetch failed:", symbol, e);
    return null;
  }
}
