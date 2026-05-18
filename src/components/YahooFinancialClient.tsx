"use client";

import { useEffect, useState } from "react";
import type { YahooFinancial } from "@/lib/yahoo-financial";

type Props = {
  symbol: string;
  exchange: "KOSPI" | "KOSDAQ" | "OTHER" | "US";
};

// 야후 v7/v10 응답 파싱 (브라우저에서 직접 호출)
async function fetchFinancialClient(symbol: string): Promise<YahooFinancial | null> {
  // 1차: v10 quoteSummary (cookie/crumb 필요할 수 있음)
  try {
    const modules = "defaultKeyStatistics,financialData,summaryDetail,price";
    const url = `/api/yahoo/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const r = json?.quoteSummary?.result?.[0];
      if (r) {
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
        if (per !== null || pbr !== null || roe !== null || marketCap !== null) {
          return { per, pbr, roe, eps, operatingMargin, debtRatio, marketCap, dividendYield, source: "Yahoo" };
        }
      }
    }
  } catch {
    // 다음 fallback
  }

  // 2차: v7 quote (인증 불필요)
  try {
    const url = `/api/yahoo/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.quoteResponse?.result?.[0];
    if (!r) return null;
    const per = r.trailingPE ?? r.forwardPE ?? null;
    const pbr = r.priceToBook ?? null;
    const eps = r.epsTrailingTwelveMonths ?? null;
    const marketCap = r.marketCap ?? null;
    const dividendYield =
      typeof r.trailingAnnualDividendYield === "number"
        ? r.trailingAnnualDividendYield * 100
        : typeof r.dividendYield === "number"
          ? r.dividendYield
          : null;
    if (per === null && pbr === null && eps === null && marketCap === null) return null;
    return {
      per,
      pbr,
      roe: null,
      eps,
      operatingMargin: null,
      debtRatio: null,
      marketCap,
      dividendYield,
      source: "Yahoo",
    };
  } catch {
    return null;
  }
}

export function YahooFinancialClient({ symbol, exchange }: Props) {
  const [data, setData] = useState<YahooFinancial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isKR = exchange === "KOSPI" || exchange === "KOSDAQ";

  useEffect(() => {
    setLoading(true);
    fetchFinancialClient(symbol).then((d) => {
      setLoading(false);
      if (d) setData(d);
      else setError(true);
    });
  }, [symbol]);

  if (loading) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
          💼 재무 지표 (야후 파이낸스)
        </h2>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 text-sm text-neutral-500">
          재무 데이터 불러오는 중...
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
          💼 재무 지표 (야후 파이낸스)
        </h2>
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-5 text-sm text-neutral-500">
          야후 파이낸스에서 이 종목의 재무 데이터를 제공하지 않거나 응답이 없습니다.
        </div>
      </section>
    );
  }

  const fmtMcap = (v: number) =>
    isKR
      ? `${(v / 1e12).toFixed(2)}조원`
      : `$${(v / 1e9).toFixed(2)}B`;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
        💼 재무 지표 (야후 파이낸스)
      </h2>
      <p className="text-[12px] text-neutral-500 dark:text-neutral-500 mb-3">
        본인 한국 IP 에서 야후 quoteSummary API 호출. 정확한 K-IFRS 수치는 DART 공식 보고서를 참고하세요.
      </p>
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
        {data.per !== null && (
          <Row label="PER (주가수익비율)" value={data.per.toFixed(1)} tone={data.per < 15 ? "good" : data.per < 30 ? "neutral" : "bad"} note={data.per < 15 ? "저평가 영역" : data.per < 30 ? "보통" : "고평가 영역"} />
        )}
        {data.pbr !== null && (
          <Row label="PBR (주가순자산비율)" value={data.pbr.toFixed(2)} tone={data.pbr < 1 ? "good" : data.pbr < 3 ? "neutral" : "bad"} note={data.pbr < 1 ? "순자산 대비 저평가" : data.pbr < 3 ? "보통" : "고평가"} />
        )}
        {data.roe !== null && (
          <Row label="ROE (자기자본이익률)" value={`${data.roe.toFixed(1)}%`} tone={data.roe >= 17 ? "good" : data.roe >= 10 ? "neutral" : "bad"} note={data.roe >= 17 ? "오닐 기준 17%↑ 충족" : data.roe >= 10 ? "양호" : "수익성 점검 필요"} />
        )}
        {data.eps !== null && (
          <Row label="EPS (주당순이익)" value={`${data.eps.toFixed(0)}${isKR ? "원" : "$"}`} tone="neutral" note="최근 12개월 기준" />
        )}
        {data.operatingMargin !== null && (
          <Row label="영업이익률" value={`${data.operatingMargin.toFixed(1)}%`} tone={data.operatingMargin >= 20 ? "good" : data.operatingMargin >= 10 ? "neutral" : "bad"} note={data.operatingMargin >= 20 ? "우수" : data.operatingMargin >= 10 ? "양호" : "수익성 약함"} />
        )}
        {data.debtRatio !== null && (
          <Row label="부채비율" value={`${data.debtRatio.toFixed(1)}%`} tone={data.debtRatio < 100 ? "good" : data.debtRatio < 200 ? "neutral" : "bad"} note={data.debtRatio < 100 ? "안정" : data.debtRatio < 200 ? "주의" : "위험"} />
        )}
        {data.dividendYield !== null && data.dividendYield > 0 && (
          <Row label="배당수익률" value={`${data.dividendYield.toFixed(2)}%`} tone={data.dividendYield >= 3 ? "good" : "neutral"} note={data.dividendYield >= 3 ? "배당주" : "저배당"} />
        )}
        {data.marketCap !== null && (
          <Row label="시가총액" value={fmtMcap(data.marketCap)} tone="neutral" note="기업 규모" />
        )}
      </div>
    </section>
  );
}

function Row({ label, value, tone, note }: { label: string; value: string; tone: "good" | "neutral" | "bad"; note: string }) {
  const color = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-rose-600 dark:text-rose-400" : "text-neutral-700 dark:text-neutral-300";
  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{label}</div>
        <div className="text-[12px] text-neutral-600 dark:text-neutral-400 leading-snug mt-0.5">{note}</div>
      </div>
      <div className={`text-base font-extrabold whitespace-nowrap ${color}`}>{value}</div>
    </div>
  );
}
