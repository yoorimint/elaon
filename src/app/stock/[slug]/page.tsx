import type { Metadata } from "next";
import Link from "next/link";
import { fetchYahooCandles } from "@/lib/yahoo";
import { fetchStooqCandles } from "@/lib/stooq";
import { STOCK_MARKETS } from "@/lib/market";
import { resolveStock, slugToSymbol, symbolToSlug } from "@/lib/stock-resolver";
import { buildStockReport, type StockReport } from "@/lib/stock-report";
import { JsonLd, breadcrumbLd } from "@/components/JsonLd";
import { StockChart } from "@/components/StockChart";
import { fetchDartBundle, type DartBundle } from "@/lib/dart";
import { fetchNaverNews, type NaverNews } from "@/lib/naver-news";
import { fetchYahooFinancial, type YahooFinancial } from "@/lib/yahoo-financial";

function relatedStocks(report: StockReport, count = 6) {
  const pool = STOCK_MARKETS.filter((m) => {
    if (report.exchange === "KOSPI" || report.exchange === "KOSDAQ") {
      return m.kind === "stock_kr";
    }
    return m.kind === "stock_us";
  }).filter((m) => m.id.replace(/^yahoo:/, "") !== report.symbol);
  // 단순화: 시드 기반 셔플이 아니라 보고서 종목 코드 기준 분산 선택
  const seed = report.symbol
    .split("")
    .reduce((a, c) => (a + c.charCodeAt(0)) % pool.length, 0);
  const picks: typeof pool = [];
  for (let i = 0; i < count && i < pool.length; i++) {
    const idx = (seed + i * 7) % pool.length;
    if (!picks.includes(pool[idx])) picks.push(pool[idx]);
  }
  return picks;
}

const SITE = "https://www.eloan.kr";

// 검색 시 on-demand 생성 + ISR 1시간 캐시. force-dynamic 제거해서
// 첫 요청 후 1시간 캐싱 — 다음 사용자들은 빠른 응답.
export const revalidate = 3600;

// server-side 에서 자기 /api/yahoo proxy 호출용 절대 URL.
// production 사이트 도메인 사용 — Edge runtime proxy 가 yahoo 로 요청.
const PROXY_BASE = "https://www.eloan.kr/api/yahoo";

async function fetchYahooViaProxy(
  symbol: string,
  startMs: number,
  endMs: number,
): Promise<import("@/lib/upbit").Candle[]> {
  const p1 = Math.floor(startMs / 1000);
  const p2 = Math.floor(endMs / 1000);
  const url = `${PROXY_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=1d&events=history`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`proxy ${res.status}`);
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  const ts: number[] = r?.timestamp ?? [];
  const q = r?.indicators?.quote?.[0];
  if (!q || ts.length === 0) return [];
  const out: import("@/lib/upbit").Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    const v = q.volume?.[i];
    if (
      o == null || h == null || l == null || c == null ||
      !Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)
    ) continue;
    out.push({
      timestamp: ts[i] * 1000,
      open: o, high: h, low: l, close: c,
      volume: Number.isFinite(v ?? NaN) ? v : 0,
    });
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}

type FetchResult = {
  candles: import("@/lib/upbit").Candle[];
  log: { source: string; status: string }[];
};

async function safeFetchYahooCandles(
  symbol: string,
  startMs: number,
  endMs: number,
): Promise<FetchResult> {
  const log: FetchResult["log"] = [];

  // 1차: 야후 직접 호출
  try {
    const out = await fetchYahooCandles(symbol, "1d", startMs, endMs);
    if (out.length > 0) {
      log.push({ source: "yahoo-direct", status: `OK ${out.length}개` });
      return { candles: out, log };
    }
    log.push({ source: "yahoo-direct", status: "빈 결과" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stock] yahoo direct fetch failed:", symbol, e);
    log.push({ source: "yahoo-direct", status: `실패: ${msg}` });
  }

  // 2차: /api/yahoo Edge proxy
  try {
    const out = await fetchYahooViaProxy(symbol, startMs, endMs);
    if (out.length > 0) {
      console.log("[stock] used yahoo proxy fallback for", symbol);
      log.push({ source: "yahoo-proxy", status: `OK ${out.length}개` });
      return { candles: out, log };
    }
    log.push({ source: "yahoo-proxy", status: "빈 결과" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stock] yahoo proxy fetch failed:", symbol, e);
    log.push({ source: "yahoo-proxy", status: `실패: ${msg}` });
  }

  // 3차: Stooq
  try {
    const stooq = await fetchStooqCandles(symbol);
    if (stooq.length > 0) {
      console.log("[stock] used stooq fallback for", symbol);
      const filtered = stooq.filter(
        (c) => c.timestamp >= startMs && c.timestamp <= endMs,
      );
      log.push({ source: "stooq", status: `OK ${filtered.length}개` });
      return { candles: filtered, log };
    }
    log.push({ source: "stooq", status: "빈 결과" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stock] stooq fetch failed:", symbol, e);
    log.push({ source: "stooq", status: `실패: ${msg}` });
  }

  return { candles: [], log };
}

type LoadResult =
  | { ok: true; report: StockReport }
  | { ok: false; symbolTried: string[]; log: { source: string; status: string }[]; reason?: string };

async function loadReport(slug: string): Promise<LoadResult> {
  const symbolTried: string[] = [];
  const allLog: { source: string; status: string }[] = [];
  try {
    const raw = slugToSymbol(slug);
    let symbol: string | null = null;
    let name: string | null = null;
    let subtitle: string | undefined;

    if (/^[A-Z0-9.\-]+$/i.test(raw)) {
      const local = STOCK_MARKETS.find(
        (m) => m.id.replace(/^yahoo:/, "") === raw,
      );
      if (local) {
        symbol = raw;
        name = local.name;
        subtitle = local.subtitle;
      } else if (/^\d{6}(\.(KS|KQ))?$/.test(raw)) {
        symbol = raw.includes(".") ? raw : `${raw}.KS`;
        name = symbol;
      } else if (/^[A-Z]{1,5}$/.test(raw)) {
        symbol = raw.toUpperCase();
        name = symbol;
      }
    }

    if (!symbol) {
      const entry = await resolveStock(raw).catch(() => null);
      if (!entry) {
        return { ok: false, symbolTried: [raw], log: [], reason: "심볼 매칭 실패" };
      }
      symbol = entry.id.replace(/^yahoo:/, "");
      name = entry.name;
      subtitle = entry.subtitle;
    }

    const endMs = Date.now();
    const startMs = endMs - 1000 * 60 * 60 * 24 * 365 * 2;
    symbolTried.push(symbol!);
    let result = await safeFetchYahooCandles(symbol!, startMs, endMs);
    allLog.push(...result.log.map((l) => ({ ...l, source: `${l.source} (${symbol})` })));
    let candles = result.candles;

    if (
      candles.length === 0 &&
      symbol!.endsWith(".KS") &&
      /^\d{6}\.KS$/.test(symbol!)
    ) {
      const alt = symbol!.replace(/\.KS$/, ".KQ");
      symbolTried.push(alt);
      result = await safeFetchYahooCandles(alt, startMs, endMs);
      allLog.push(...result.log.map((l) => ({ ...l, source: `${l.source} (${alt})` })));
      if (result.candles.length > 0) {
        candles = result.candles;
        symbol = alt;
      }
    }

    if (candles.length === 0) {
      return { ok: false, symbolTried, log: allLog, reason: "모든 데이터 소스에서 빈 결과" };
    }

    if (name === symbol) {
      const local = STOCK_MARKETS.find(
        (m) => m.id.replace(/^yahoo:/, "") === symbol,
      );
      if (local) {
        name = local.name;
        subtitle = local.subtitle;
      }
    }

    return {
      ok: true,
      report: buildStockReport({
        symbol: symbol!,
        name: name ?? symbol!,
        subtitle,
        candles,
      }),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stock] loadReport error:", slug, e);
    return { ok: false, symbolTried, log: allLog, reason: `예외: ${msg}` };
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = params.slug;
  const symbol = slugToSymbol(slug);
  const url = `${SITE}/stock/${symbolToSlug(symbol)}`;
  const local = STOCK_MARKETS.find(
    (m) => m.id.replace(/^yahoo:/, "") === symbol,
  );
  const name = local?.name ?? symbol;
  return {
    title: `${name} (${symbol.replace(/^yahoo:/, "")}) — 일봉 차트·기술 지표·재무 보고서`,
    description: `${name} 의 일봉 차트, EMA·RSI·ADX·VWAP·볼린저 등 기술 지표, 진입 타이밍 신호, 52주 가격 범위, 변동성 분석을 한 페이지에서 확인.`,
    alternates: { canonical: url },
    keywords: [name, symbol, "주가", "차트", "기술 지표", "주식 분석", "eloan"],
    openGraph: {
      type: "article",
      title: `${name} (${symbol}) — 종목 보고서`,
      description: `${name} 일봉 차트·기술 지표·재무 보고서.`,
      url,
      locale: "ko_KR",
      siteName: "eloan",
    },
  };
}

function NotFoundFallback({
  slug,
  result,
}: {
  slug: string;
  result: Extract<LoadResult, { ok: false }>;
}) {
  const decoded = (() => {
    try { return decodeURIComponent(slug); } catch { return slug; }
  })();
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <nav className="text-sm text-neutral-500 mb-6">
        <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">홈</Link>
        {" / "}
        <Link href="/stock" className="hover:text-neutral-900 dark:hover:text-white">종목 검색</Link>
      </nav>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
        종목 데이터를 불러올 수 없습니다
      </h1>
      <p className="mt-3 text-[15px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
        입력한 코드 ‘<span className="font-bold">{decoded}</span>’ 의 일봉 데이터를 가져오지 못했습니다.
      </p>

      <section className="mt-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-900/10 p-4">
        <h2 className="text-sm font-extrabold text-rose-900 dark:text-rose-200 mb-2">
          진단 로그
        </h2>
        <div className="text-[12.5px] text-rose-900 dark:text-rose-100 space-y-1 font-mono leading-relaxed">
          <div>사유: <span className="font-bold">{result.reason ?? "알 수 없음"}</span></div>
          {result.symbolTried.length > 0 && (
            <div>시도한 심볼: {result.symbolTried.join(", ")}</div>
          )}
          {result.log.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {result.log.map((l, i) => (
                <div key={i}>· {l.source} → {l.status}</div>
              ))}
            </div>
          )}
        </div>
      </section>

      <p className="mt-5 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
        다음 경우 발생할 수 있습니다.
      </p>
      <ul className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 list-disc list-inside space-y-1">
        <li>존재하지 않거나 상장폐지된 종목코드</li>
        <li>야후·Stooq 일시 응답 지연 (잠시 후 재시도)</li>
        <li>한국 종목인데 .KS / .KQ 접미사 없이 입력 (예: <code>005930</code>, <code>005930.KS</code>)</li>
      </ul>
      <div className="mt-6 flex gap-2">
        <Link
          href="/stock"
          className="inline-flex items-center px-5 py-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold hover:opacity-90 transition"
        >
          다시 검색하기
        </Link>
        <Link
          href="/"
          className="inline-flex items-center px-5 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}

export default async function StockDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const result = await loadReport(params.slug);
  if (!result.ok) return <NotFoundFallback slug={params.slug} result={result} />;
  const report = result.report;

  const url = `${SITE}/stock/${symbolToSlug(report.symbol)}`;
  const isKR = report.exchange === "KOSPI" || report.exchange === "KOSDAQ";
  const emptyDart: DartBundle = {
    enabled: false,
    hasMapping: false,
    financial: null,
    filings: [],
    diagnostics: { keyPresent: false, corpCode: null, mappingSize: 0 },
  };
  const [dart, news, yfin]: [DartBundle, NaverNews[], YahooFinancial | null] = await Promise.all([
    isKR
      ? fetchDartBundle(report.ticker).catch((e) => {
          console.error("[stock] dart fetch failed:", e);
          return emptyDart;
        })
      : Promise.resolve(emptyDart),
    fetchNaverNews(`${report.name} 주가`, 8).catch((e) => {
      console.error("[stock] naver news failed:", e);
      return [] as NaverNews[];
    }),
    fetchYahooFinancial(report.symbol).catch(() => null),
  ]);
  // DART 가 실패하면 야후 재무로 fallback
  const hasFinancial = dart.financial !== null || yfin !== null;

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", url: `${SITE}/` },
          { name: "종목 검색", url: `${SITE}/stock` },
          { name: report.name, url },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FinancialProduct",
          name: report.name,
          identifier: report.ticker,
          url,
          inLanguage: "ko-KR",
          category: report.exchange,
          description: `${report.name} (${report.ticker}) 일봉 차트와 EMA·RSI·ADX·VWAP·볼린저·CAN SLIM·Quant 지표 종합 보고서.`,
          provider: {
            "@type": "Organization",
            name: "eloan.kr",
            url: SITE,
          },
        }}
      />

      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <nav className="text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">
            홈
          </Link>
          {" / "}
          <Link href="/stock" className="hover:text-neutral-900 dark:hover:text-white">
            종목 검색
          </Link>
          {" / "}
          <span className="text-neutral-700 dark:text-neutral-300">{report.name}</span>
        </nav>

        <header className="mt-3 mb-6">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
              {report.name}
            </h1>
            <span className="text-sm text-neutral-500 dark:text-neutral-500">
              {report.ticker} · {report.exchange}
            </span>
          </div>
          {report.subtitle && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {report.subtitle}
            </p>
          )}
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
              {formatPrice(report.price, report.exchange)}
            </span>
            <span
              className={`text-base font-bold ${
                report.change1d >= 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {report.change1d >= 0 ? "+" : ""}
              {report.change1d.toFixed(2)}%
            </span>
          </div>
          <p className="mt-1 text-[12px] text-neutral-500 dark:text-neutral-500">
            야후 파이낸스 일봉 종가 기준 · 최종 갱신 {report.lastUpdate}
          </p>
        </header>

        <section className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 p-5">
            <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
              종합 점수 (재무·기술·진입 종합)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-amber-900 dark:text-amber-100">
                {report.overall}
              </span>
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">점</span>
            </div>
            <div className="mt-2 inline-block px-3 py-1 rounded-full bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 text-xs font-extrabold">
              {report.entry.verdict}
            </div>
            <p className="mt-3 text-[13px] text-amber-900 dark:text-amber-200 leading-relaxed">
              {report.headline}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
            <div className="text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-2">
              4축 진입 평가 ({"★".repeat(report.entry.stars)}{"☆".repeat(5 - report.entry.stars)})
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <FactorCell label="추세" score={report.entry.trend.score} max={5} note={report.entry.trend.note} />
              <FactorCell label="모멘텀" score={report.entry.momentum.score} max={4} note={report.entry.momentum.note} />
              <FactorCell label="변동성" score={report.entry.volatility.score} max={5} note={report.entry.volatility.note} />
              <FactorCell label="수급" score={report.entry.liquidity.score} max={5} note={report.entry.liquidity.note} />
            </div>
          </div>
        </section>

        {report.trade && (
          <section className="mt-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/30 p-5">
            <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
              <h2 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100">
                💡 매수·손절·익절 가격 제안
              </h2>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-500">
                {report.trade.basis} · R:R {report.trade.rrRatio.toFixed(2)}:1
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <TradeBox label="매수가" value={formatPrice(report.trade.entry, report.exchange)} sub="현재가" tone="neutral" />
              <TradeBox
                label="손절가"
                value={formatPrice(report.trade.stop, report.exchange)}
                sub={`-${report.trade.riskPct.toFixed(1)}%`}
                tone="bad"
              />
              <TradeBox
                label="1차 익절"
                value={formatPrice(report.trade.target1, report.exchange)}
                sub={`+${report.trade.reward1Pct.toFixed(1)}%`}
                tone="good"
              />
              <TradeBox
                label="2차 익절"
                value={formatPrice(report.trade.target2, report.exchange)}
                sub={`+${report.trade.reward2Pct.toFixed(1)}%`}
                tone="good"
              />
            </div>
            <p className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-500 leading-relaxed">
              ATR(14) 변동성에 기반한 일반적 권장값입니다. 본인 매매 스타일·자금 관리에 맞춰 조정하세요.
            </p>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
            📊 일봉 차트
          </h2>
          <StockChart candles={report.candles} tradeLines={report.trade} />
          <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-500 flex-wrap">
            <span>최근 1년 일봉 + EMA20·50·200 + 거래량</span>
            {report.trade && (
              <>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-amber-500" /> 매수
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-rose-500" /> 손절
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-emerald-500" /> 익절
                </span>
              </>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
            📐 52주 가격 위치
          </h2>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
            <div className="flex items-baseline justify-between text-sm mb-2">
              <span className="text-neutral-500 font-bold">
                저점 {formatPrice(report.low52w, report.exchange)}
              </span>
              <span className="font-extrabold text-lg text-neutral-900 dark:text-neutral-100">
                현재 {formatPrice(report.price, report.exchange)} ({report.pricePosition52w.toFixed(0)}%)
              </span>
              <span className="text-neutral-500 font-bold">
                고점 {formatPrice(report.high52w, report.exchange)}
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-gradient-to-r from-blue-300 via-neutral-200 to-rose-300 dark:from-blue-900/40 dark:via-neutral-800 dark:to-rose-900/40 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 w-1 bg-neutral-900 dark:bg-neutral-100"
                style={{ left: `${Math.max(0, Math.min(100, report.pricePosition52w))}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-neutral-600 dark:text-neutral-400">
              {report.pricePosition52w >= 80
                ? "고점 부근 — 상승 모멘텀 있으나 단기 조정 위험"
                : report.pricePosition52w >= 50
                  ? "중상위 구간 — 추세 진행 중"
                  : report.pricePosition52w >= 20
                    ? "중하위 구간 — 반등 또는 추가 하락 분기점"
                    : "저점 부근 — 반등 기회 또는 추세 약화"}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
            📈 가격 변동
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="1일" value={fmtPct(report.change1d)} tone={toneOf(report.change1d)} />
            <Stat label="1주" value={fmtPct(report.change1w)} tone={toneOf(report.change1w)} />
            <Stat label="1개월" value={fmtPct(report.change1m)} tone={toneOf(report.change1m)} />
            <Stat label="3개월" value={fmtPct(report.change3m)} tone={toneOf(report.change3m)} />
            <Stat label="12개월" value={fmtPct(report.change12m)} tone={toneOf(report.change12m)} />
            <Stat label="52주 고점 대비" value={fmtPct(report.distFrom52wHigh)} tone={toneOf(report.distFrom52wHigh)} />
          </div>
          <div className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            52주 고점 {formatPrice(report.high52w, report.exchange)} · 저점 {formatPrice(report.low52w, report.exchange)}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
            🔧 기술 지표
          </h2>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
            <IndicatorRow
              label="RSI(14)"
              value={report.rsi14.toFixed(1)}
              note={
                report.rsi14 >= 70
                  ? "과매수 — 단기 조정 가능성"
                  : report.rsi14 <= 30
                    ? "과매도 — 단기 반등 가능성"
                    : "중립 구간"
              }
              tone={report.rsi14 >= 70 ? "bad" : report.rsi14 <= 30 ? "good" : "neutral"}
            />
            <IndicatorRow
              label="ADX(14)"
              value={report.adx14.toFixed(1)}
              note={
                report.adx14 >= 40
                  ? "강한 추세"
                  : report.adx14 >= 25
                    ? "추세 존재"
                    : "횡보·약한 추세"
              }
              tone={report.adx14 >= 25 ? "good" : "neutral"}
            />
            <IndicatorRow
              label="ATR%"
              value={`${report.atrPct.toFixed(2)}%`}
              note={
                report.atrPct < 3
                  ? "변동성 안정"
                  : report.atrPct < 5
                    ? "보통 변동성"
                    : "변동성 큼"
              }
              tone={report.atrPct < 3 ? "good" : report.atrPct < 5 ? "neutral" : "bad"}
            />
            <IndicatorRow
              label="VWAP(20일) 거리"
              value={`${report.vwapDistPct >= 0 ? "+" : ""}${report.vwapDistPct.toFixed(2)}%`}
              note={
                report.vwapDistPct > 0
                  ? "현재가 VWAP 위 (강세)"
                  : "현재가 VWAP 아래 (약세)"
              }
              tone={report.vwapDistPct > 0 ? "good" : "bad"}
            />
            <IndicatorRow
              label="거래량 비율"
              value={`${report.volRatio20.toFixed(2)}x`}
              note={
                report.volRatio20 >= 2
                  ? "평소의 2배 — 강한 관심"
                  : report.volRatio20 >= 1
                    ? "평소 이상"
                    : "거래량 적음"
              }
              tone={report.volRatio20 >= 1.5 ? "good" : "neutral"}
            />
            <IndicatorRow
              label="볼린저 폭"
              value={`${report.bollWidth.toFixed(2)}%`}
              note={
                report.bollWidth < 10
                  ? "수축 — 변동성 확대 전조"
                  : "확장 — 변동성 진행 중"
              }
              tone="neutral"
            />
            <IndicatorRow
              label="최근 1년 최대낙폭(MDD)"
              value={`-${report.mdd1y.toFixed(1)}%`}
              note="최근 1년간 고점 대비 가장 크게 빠진 비율"
              tone={report.mdd1y < 20 ? "good" : report.mdd1y < 40 ? "neutral" : "bad"}
            />
            <IndicatorRow
              label="MACD(12,26,9)"
              value={
                report.macdHist > 0
                  ? `+${report.macdHist.toFixed(2)} (강세)`
                  : `${report.macdHist.toFixed(2)} (약세)`
              }
              note={
                report.macdHist > 0
                  ? "MACD 가 시그널선 위 — 매수 우위"
                  : "MACD 가 시그널선 아래 — 매도 우위"
              }
              tone={report.macdHist > 0 ? "good" : "bad"}
            />
            <IndicatorRow
              label="스토캐스틱 %K(14)"
              value={`${report.stochK.toFixed(1)}`}
              note={
                report.stochK >= 80
                  ? "과매수 — 단기 조정 가능"
                  : report.stochK <= 20
                    ? "과매도 — 단기 반등 가능"
                    : "중립 구간"
              }
              tone={report.stochK >= 80 ? "bad" : report.stochK <= 20 ? "good" : "neutral"}
            />
            <IndicatorRow
              label="EMA 정배열"
              value={
                report.price > report.ema20 &&
                report.ema20 > report.ema50 &&
                report.ema50 > report.ema200
                  ? "완벽 정배열"
                  : report.price > report.ema200
                    ? "200일선 위"
                    : "200일선 아래"
              }
              note={`EMA20 ${formatPrice(report.ema20, report.exchange)} / EMA50 ${formatPrice(
                report.ema50,
                report.exchange,
              )} / EMA200 ${formatPrice(report.ema200, report.exchange)}`}
              tone={
                report.price > report.ema20 &&
                report.ema20 > report.ema50 &&
                report.ema50 > report.ema200
                  ? "good"
                  : report.price > report.ema200
                    ? "neutral"
                    : "bad"
              }
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
            🎯 CAN SLIM 7요소
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            윌리엄 오닐의 종목 선정 7요소. 가격·거래량 데이터로 계산 가능한 5개 (N·S·L·I·M) 만 평가, 재무(C·A) 는 DART 연동 시 활성화.
          </p>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
            {report.canSlim.map((item) => (
              <div key={item.code} className="flex items-start gap-3 p-3">
                <div
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm ${
                    item.pass === true
                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                      : item.pass === false
                        ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {item.code}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {item.label}
                  </div>
                  <p className="text-[12px] text-neutral-600 dark:text-neutral-400 leading-snug mt-0.5">
                    {item.note}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-extrabold ${
                    item.pass === true
                      ? "text-emerald-600 dark:text-emerald-400"
                      : item.pass === false
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-neutral-400"
                  }`}
                >
                  {item.pass === true ? "PASS" : item.pass === false ? "FAIL" : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
            🧮 Quant 보조 지표
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {report.quant.map((q) => (
              <div
                key={q.label}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"
              >
                <div className="text-[11px] text-neutral-500 dark:text-neutral-500 font-bold">
                  {q.label}
                </div>
                <div
                  className={`mt-1 text-2xl font-extrabold ${
                    q.tone === "good"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : q.tone === "bad"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {q.value}
                  <span className="text-xs text-neutral-400 ml-0.5">/100</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className={`h-full ${
                      q.tone === "good"
                        ? "bg-emerald-500"
                        : q.tone === "bad"
                          ? "bg-rose-500"
                          : "bg-neutral-500"
                    }`}
                    style={{ width: `${q.value}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                  {q.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
            🧭 신호 종합 (Conviction)
          </h2>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-bold text-neutral-500">7개 신호 일치도</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-4xl font-extrabold ${
                    report.convictionBias === "long"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : report.convictionBias === "short"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-neutral-700 dark:text-neutral-300"
                  }`}>
                    {report.conviction}
                  </span>
                  <span className="text-base text-neutral-500">/100</span>
                </div>
              </div>
              <span className={`text-sm font-extrabold px-3 py-1 rounded-full ${
                report.convictionBias === "long"
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  : report.convictionBias === "short"
                    ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              }`}>
                {report.convictionBias === "long" ? "매수 우위" : report.convictionBias === "short" ? "매도 우위" : "중립"}
              </span>
            </div>
            <p className="mt-3 text-[12px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              EMA 정배열·200일선 위치·RSI·MACD·스토캐스틱·3개월 수익률·거래량 동행 7가지 신호의 같은 방향 일치 비율. 80 이상이면 강한 신호.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
            🔬 보조 지표
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MiniStat
              label="OBV 스마트머니"
              value={
                report.obvTrend === "up"
                  ? "↑ 유입"
                  : report.obvTrend === "down"
                    ? "↓ 유출"
                    : "→ 횡보"
              }
              tone={report.obvTrend === "up" ? "good" : report.obvTrend === "down" ? "bad" : "neutral"}
              note="거래량 기반 자금 흐름 추세"
            />
            <MiniStat
              label="NR7 압축"
              value={report.nr7Signal ? "감지" : "없음"}
              tone={report.nr7Signal ? "good" : "neutral"}
              note="최근 7일 중 가장 좁은 변동폭 — 큰 움직임 임박 신호"
            />
            <MiniStat
              label="변동성 백분위"
              value={`${report.volPercentile.toFixed(0)}%`}
              tone={
                report.volPercentile < 30 ? "good" : report.volPercentile > 70 ? "bad" : "neutral"
              }
              note={
                report.volPercentile < 30
                  ? "1년 기준 낮은 변동성 — 안정"
                  : report.volPercentile > 70
                    ? "1년 기준 높은 변동성 — 주의"
                    : "보통"
              }
            />
            <MiniStat
              label="이격도 (20일)"
              value={`${report.disparity20.toFixed(1)}%`}
              tone={
                Math.abs(report.disparity20 - 100) < 5 ? "neutral" : report.disparity20 > 105 ? "bad" : "good"
              }
              note={
                report.disparity20 > 105
                  ? "단기 이평선 대비 5% 이상 위 — 단기 과열"
                  : report.disparity20 < 95
                    ? "단기 이평선 아래 — 반등 가능 구간"
                    : "이평선 부근 — 중립"
              }
            />
            <MiniStat
              label="이격도 (60일)"
              value={`${report.disparity60.toFixed(1)}%`}
              tone={
                Math.abs(report.disparity60 - 100) < 7 ? "neutral" : report.disparity60 > 110 ? "bad" : "good"
              }
              note="중기 이평선 대비 가격 위치"
            />
            <MiniStat
              label="이격도 (120일)"
              value={`${report.disparity120.toFixed(1)}%`}
              tone={
                Math.abs(report.disparity120 - 100) < 10 ? "neutral" : report.disparity120 > 115 ? "bad" : "good"
              }
              note="장기 이평선 대비 — 대형 추세 위치"
            />
          </div>
        </section>

        {report.backtests.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
              🧪 단순 전략 백테스트 (최근 1년)
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              본인 전략을 본격적으로 테스트하기 전 빠른 감을 위한 미리보기. 매수 후 보유(Buy & Hold) 수익률과 비교.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {report.backtests.map((b, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 ${
                    b.verdict === "good"
                      ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/10"
                      : b.verdict === "bad"
                        ? "border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-900/10"
                        : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/30"
                  }`}
                >
                  <div className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                    {b.strategy}
                  </div>
                  <p className="mt-1 text-[12px] text-neutral-600 dark:text-neutral-400 leading-snug">
                    {b.description}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-[10px] text-neutral-500 font-bold">전략 수익률</div>
                      <div className={`font-extrabold ${
                        b.totalReturn >= 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}>
                        {b.totalReturn >= 0 ? "+" : ""}{b.totalReturn.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-500 font-bold">매수 후 보유</div>
                      <div className={`font-extrabold ${
                        b.buyHoldReturn >= 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}>
                        {b.buyHoldReturn >= 0 ? "+" : ""}{b.buyHoldReturn.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-500 font-bold">거래 횟수</div>
                      <div className="font-bold text-neutral-700 dark:text-neutral-300">
                        {b.trades}회
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-500 font-bold">승률</div>
                      <div className="font-bold text-neutral-700 dark:text-neutral-300">
                        {b.winRate.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href={`/backtest?market=yahoo:${encodeURIComponent(report.symbol)}`}
              className="mt-4 inline-block text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline"
            >
              본격 백테스트 도구로 이동 (RSI·MACD·볼린저 등 12 전략) →
            </Link>
          </section>
        )}

        {isKR && !dart.financial && !dart.filings.length && (
          <section className="mt-8 rounded-2xl border border-dashed border-rose-300 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-900/10 p-4 text-[12.5px] leading-relaxed">
            <div className="font-extrabold text-rose-900 dark:text-rose-200 mb-2">
              💼 재무·공시(DART) 진단
            </div>
            <div className="space-y-1 font-mono text-rose-900 dark:text-rose-100">
              <div>· OPEN_DART_API_KEY 환경변수: {dart.diagnostics.keyPresent ? "✓ 인식" : "✗ 누락 — Vercel Settings → Environment Variables 에서 설정 + Redeploy 필요"}</div>
              {dart.diagnostics.keyPresent && (
                <>
                  <div>· corpCode.xml 매핑 다운로드: {dart.diagnostics.mappingSize > 0 ? `✓ ${dart.diagnostics.mappingSize}개 종목 캐시` : "✗ 0개 — DART 응답 실패 또는 첫 다운로드 진행 중"}</div>
                  <div>· 이 종목(<strong>{report.ticker}</strong>) corp_code: {dart.diagnostics.corpCode ? `✓ ${dart.diagnostics.corpCode}` : "✗ 매핑에서 발견 안 됨"}</div>
                  {dart.diagnostics.financialError && (
                    <div>· 재무 API 실패: {dart.diagnostics.financialError}</div>
                  )}
                  {dart.diagnostics.filingsError && (
                    <div>· 공시 API 실패: {dart.diagnostics.filingsError}</div>
                  )}
                </>
              )}
            </div>
            <div className="mt-3 text-[11px] text-rose-800 dark:text-rose-300">
              {!dart.diagnostics.keyPresent
                ? "환경변수 추가 후 반드시 Redeploy 해야 반영됩니다."
                : dart.diagnostics.mappingSize === 0
                  ? "Vercel 함수가 corpCode.xml(10MB) 을 첫 다운받는 중이거나 메모리/타임아웃 한계 가능. 1분 후 새로고침."
                  : "환경변수·매핑 모두 정상. API 응답 메시지 확인."}
            </div>
          </section>
        )}
        {!dart.financial && yfin && (
          <section className="mt-8">
            <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
              💼 재무 지표 (야후 파이낸스)
            </h2>
            <p className="text-[12px] text-neutral-500 dark:text-neutral-500 mb-3">
              DART 직접 접속이 차단되어 야후 파이낸스 데이터로 표시. 정확한 한국 회계 기준 수치는 DART 공식 보고서를 확인하세요.
            </p>
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
              {yfin.per !== null && (
                <IndicatorRow label="PER (주가수익비율)" value={yfin.per.toFixed(1)} note={yfin.per < 15 ? "저평가 영역 (15 미만)" : yfin.per < 30 ? "보통" : "고평가 영역"} tone={yfin.per < 15 ? "good" : yfin.per < 30 ? "neutral" : "bad"} />
              )}
              {yfin.pbr !== null && (
                <IndicatorRow label="PBR (주가순자산비율)" value={yfin.pbr.toFixed(2)} note={yfin.pbr < 1 ? "순자산 대비 저평가" : yfin.pbr < 3 ? "보통" : "고평가"} tone={yfin.pbr < 1 ? "good" : yfin.pbr < 3 ? "neutral" : "bad"} />
              )}
              {yfin.roe !== null && (
                <IndicatorRow label="ROE (자기자본이익률)" value={`${yfin.roe.toFixed(1)}%`} note={yfin.roe >= 17 ? "오닐 기준 17%↑ 충족" : yfin.roe >= 10 ? "양호" : "수익성 점검 필요"} tone={yfin.roe >= 17 ? "good" : yfin.roe >= 10 ? "neutral" : "bad"} />
              )}
              {yfin.eps !== null && (
                <IndicatorRow label="EPS (주당순이익)" value={`${yfin.eps.toFixed(0)}${isKR ? "원" : "$"}`} note="최근 12개월 기준" tone="neutral" />
              )}
              {yfin.operatingMargin !== null && (
                <IndicatorRow label="영업이익률" value={`${yfin.operatingMargin.toFixed(1)}%`} note={yfin.operatingMargin >= 20 ? "우수" : yfin.operatingMargin >= 10 ? "양호" : "수익성 약함"} tone={yfin.operatingMargin >= 20 ? "good" : yfin.operatingMargin >= 10 ? "neutral" : "bad"} />
              )}
              {yfin.debtRatio !== null && (
                <IndicatorRow label="부채비율" value={`${yfin.debtRatio.toFixed(1)}%`} note={yfin.debtRatio < 100 ? "안정" : yfin.debtRatio < 200 ? "주의" : "위험"} tone={yfin.debtRatio < 100 ? "good" : yfin.debtRatio < 200 ? "neutral" : "bad"} />
              )}
              {yfin.dividendYield !== null && yfin.dividendYield > 0 && (
                <IndicatorRow label="배당수익률" value={`${yfin.dividendYield.toFixed(2)}%`} note={yfin.dividendYield >= 3 ? "배당주" : "저배당"} tone={yfin.dividendYield >= 3 ? "good" : "neutral"} />
              )}
              {yfin.marketCap !== null && (
                <IndicatorRow
                  label="시가총액"
                  value={
                    isKR
                      ? `${(yfin.marketCap / 1e12).toFixed(2)}조원`
                      : `$${(yfin.marketCap / 1e9).toFixed(2)}B`
                  }
                  note="기업 규모"
                  tone="neutral"
                />
              )}
            </div>
          </section>
        )}

        {dart.financial && (
          <section className="mt-8">
            <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
              💼 재무 지표 (DART 사업보고서 {dart.financial.reportYear})
            </h2>
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
              {dart.financial.roe !== null && (
                <IndicatorRow
                  label="ROE (자기자본이익률)"
                  value={`${dart.financial.roe.toFixed(1)}%`}
                  note={
                    dart.financial.roe >= 17
                      ? "오닐 기준 17% 충족 — 수익성 우수"
                      : dart.financial.roe >= 10
                        ? "양호한 수익성"
                        : "수익성 점검 필요"
                  }
                  tone={
                    dart.financial.roe >= 17
                      ? "good"
                      : dart.financial.roe >= 10
                        ? "neutral"
                        : "bad"
                  }
                />
              )}
              {dart.financial.operatingMargin !== null && (
                <IndicatorRow
                  label="영업이익률"
                  value={`${dart.financial.operatingMargin.toFixed(1)}%`}
                  note={
                    dart.financial.operatingMargin >= 20
                      ? "20% 이상 — 우수"
                      : dart.financial.operatingMargin >= 10
                        ? "양호"
                        : "수익성 약함"
                  }
                  tone={
                    dart.financial.operatingMargin >= 20
                      ? "good"
                      : dart.financial.operatingMargin >= 10
                        ? "neutral"
                        : "bad"
                  }
                />
              )}
              {dart.financial.debtRatio !== null && (
                <IndicatorRow
                  label="부채비율"
                  value={`${dart.financial.debtRatio.toFixed(1)}%`}
                  note={
                    dart.financial.debtRatio < 100
                      ? "100% 미만 — 안정"
                      : dart.financial.debtRatio < 200
                        ? "100~200% — 주의"
                        : "200% 초과 — 위험"
                  }
                  tone={
                    dart.financial.debtRatio < 100
                      ? "good"
                      : dart.financial.debtRatio < 200
                        ? "neutral"
                        : "bad"
                  }
                />
              )}
            </div>
          </section>
        )}

        {news.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
              📰 최근 뉴스 (네이버)
            </h2>
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
              {news.slice(0, 8).map((n, i) => (
                <a
                  key={i}
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition"
                >
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2">
                    {n.title}
                  </div>
                  <div className="mt-1 text-[12px] text-neutral-500 dark:text-neutral-500">
                    {new Date(n.pubDate).toLocaleDateString("ko-KR")}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {dart.filings.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
              📄 최근 공시 (DART)
            </h2>
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
              {dart.filings.map((f) => (
                <a
                  key={f.reportNo}
                  href={`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${f.reportNo}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition"
                >
                  <span className="text-xs text-neutral-500 dark:text-neutral-500 shrink-0">
                    {f.date}
                  </span>
                  <span className="flex-1 text-sm text-neutral-800 dark:text-neutral-200 truncate">
                    {f.title}
                  </span>
                  <span className="text-xs text-neutral-400">↗</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-base font-bold mb-3 text-neutral-900 dark:text-neutral-100">
            🔗 같은 거래소의 다른 종목
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {relatedStocks(report).map((m) => {
              const symbol = m.id.replace(/^yahoo:/, "");
              return (
                <Link
                  key={m.id}
                  href={`/stock/${symbolToSlug(symbol)}`}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 hover:border-brand hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition"
                >
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-500">
                    {symbol.replace(/\.(KS|KQ)$/, "")}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-base font-bold mb-3 text-neutral-900 dark:text-neutral-100">
            📚 함께 보면 좋은 글
          </h2>
          <div className="space-y-2">
            <Link
              href="/picks/checklist/loan-before-checklist"
              className="block px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-brand hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition"
            >
              <span className="text-xs text-neutral-500 dark:text-neutral-500">체크리스트</span>
              <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                ✅ 대출 받기 전 체크리스트 — DSR·LTV·정책 금융 →
              </div>
            </Link>
            <Link
              href="/picks/money"
              className="block px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-brand hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition"
            >
              <span className="text-xs text-neutral-500 dark:text-neutral-500">사이트</span>
              <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                💰 정부지원금·환급금 디렉토리 →
              </div>
            </Link>
            <Link
              href="/glossary"
              className="block px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-brand hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition"
            >
              <span className="text-xs text-neutral-500 dark:text-neutral-500">사전</span>
              <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                📖 RSI·ADX·VWAP 같은 지표 뜻 정리 →
              </div>
            </Link>
          </div>
        </section>

        <section className="mt-10 text-xs text-neutral-500 dark:text-neutral-500 leading-relaxed">
          본 페이지의 모든 지표는 야후 파이낸스 일봉 데이터를 기반으로 본 사이트에서 계산한 결과입니다. 매수·매도 의사결정은 본인 책임이며 본 데이터는 참고용입니다. 정확한 매매 가격은 본인 증권사에서 재확인하시기 바랍니다.
        </section>
      </main>
    </>
  );
}

// ===========================================================================
// 시각 컴포넌트
// ===========================================================================

function MiniStat({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone: "good" | "neutral" | "bad";
  note: string;
}) {
  const color =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
        ? "text-rose-600 dark:text-rose-400"
        : "text-neutral-700 dark:text-neutral-300";
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="text-[11px] font-bold text-neutral-500 dark:text-neutral-500">
        {label}
      </div>
      <div className={`mt-1 text-base font-extrabold ${color}`}>{value}</div>
      <div className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
        {note}
      </div>
    </div>
  );
}

function TradeBox({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "good" | "neutral" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40"
      : tone === "bad"
        ? "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40"
        : "text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800";
  return (
    <div className={`rounded-xl border bg-white dark:bg-neutral-950 p-3 ${color.split(" ").filter(c => c.startsWith("border")).join(" ")}`}>
      <div className="text-[11px] font-bold text-neutral-500 dark:text-neutral-500">
        {label}
      </div>
      <div className={`mt-1 text-base font-extrabold ${color.split(" ").filter(c => !c.startsWith("border")).join(" ")}`}>
        {value}
      </div>
      <div className={`text-[11px] font-bold ${color.split(" ").filter(c => !c.startsWith("border")).join(" ")}`}>
        {sub}
      </div>
    </div>
  );
}

function FactorCell({
  label,
  score,
  max,
  note,
}: {
  label: string;
  score: number;
  max: number;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-neutral-950 px-3 py-2">
      <div className="text-[10px] text-neutral-500 dark:text-neutral-500 font-bold">
        {label}
      </div>
      <div className="text-base font-extrabold text-neutral-900 dark:text-neutral-100">
        {score}/{max}
      </div>
      <div className="text-[10px] text-neutral-600 dark:text-neutral-400 leading-tight">
        {note}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "up" | "down" | "neutral";
}) {
  const color =
    tone === "up"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "down"
        ? "text-blue-600 dark:text-blue-400"
        : "text-neutral-700 dark:text-neutral-300";
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2.5">
      <div className="text-[11px] text-neutral-500 dark:text-neutral-500 font-bold">
        {label}
      </div>
      <div className={`mt-0.5 text-base font-extrabold ${color}`}>{value}</div>
    </div>
  );
}

// 지표 라벨 → 글로서리 anchor 매핑
const GLOSSARY_ANCHOR: Record<string, string> = {
  "RSI(14)": "rsi-ind",
  "ADX(14)": "adx",
  "ATR%": "atr",
  "VWAP(20일) 거리": "vwap",
  "거래량 비율": "volume",
  "볼린저 폭": "bollinger",
  "최근 1년 최대낙폭(MDD)": "mdd",
  "EMA 정배열": "ema",
  "MACD(12,26,9)": "macd",
  "스토캐스틱 %K(14)": "stoch",
  "ROE (자기자본이익률)": "roe",
  "영업이익률": "operating-margin",
  "부채비율": "debt-ratio",
};

function IndicatorRow({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: "good" | "neutral" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
        ? "text-rose-600 dark:text-rose-400"
        : "text-neutral-700 dark:text-neutral-300";
  const anchor = GLOSSARY_ANCHOR[label];
  const labelNode = anchor ? (
    <Link
      href={`/glossary#${anchor}`}
      className="text-sm font-bold text-neutral-900 dark:text-neutral-100 hover:text-amber-600 dark:hover:text-amber-400 hover:underline"
    >
      {label} <span className="text-[10px] text-neutral-400">↗</span>
    </Link>
  ) : (
    <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
      {label}
    </span>
  );
  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        {labelNode}
        <div className="text-[12px] text-neutral-600 dark:text-neutral-400 leading-snug mt-0.5">
          {note}
        </div>
      </div>
      <div className={`text-base font-extrabold whitespace-nowrap ${color}`}>
        {value}
      </div>
    </div>
  );
}

function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function toneOf(v: number): "up" | "down" | "neutral" {
  if (v > 0.1) return "up";
  if (v < -0.1) return "down";
  return "neutral";
}

function formatPrice(v: number, exchange: StockReport["exchange"]): string {
  if (exchange === "KOSPI" || exchange === "KOSDAQ") {
    return `${Math.round(v).toLocaleString("ko-KR")}원`;
  }
  return `$${v.toFixed(2)}`;
}
