import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchYahooCandles } from "@/lib/yahoo";
import { STOCK_MARKETS } from "@/lib/market";
import { resolveStock, slugToSymbol, symbolToSlug } from "@/lib/stock-resolver";
import { buildStockReport, type StockReport } from "@/lib/stock-report";
import { JsonLd, breadcrumbLd } from "@/components/JsonLd";
import { StockChart } from "@/components/StockChart";

const SITE = "https://www.eloan.kr";

// 검색 시 on-demand 생성. 미리 빌드 X.
export const dynamic = "force-dynamic";
export const revalidate = 3600;

async function loadReport(slug: string): Promise<StockReport | null> {
  const raw = slugToSymbol(slug);
  // 1) 정확 심볼이면 바로 시도
  let symbol: string | null = null;
  let name: string | null = null;
  let subtitle: string | undefined;

  if (/^[A-Z0-9.\-]+$/i.test(raw)) {
    // 내장 목록 우선
    const local = STOCK_MARKETS.find(
      (m) => m.id.replace(/^yahoo:/, "") === raw,
    );
    if (local) {
      symbol = raw;
      name = local.name;
      subtitle = local.subtitle;
    } else if (/^\d{6}(\.(KS|KQ))?$/.test(raw)) {
      // 6자리 코드 → .KS 먼저, 실패 시 .KQ
      symbol = raw.includes(".") ? raw : `${raw}.KS`;
      name = symbol;
    } else if (/^[A-Z]{1,5}$/.test(raw)) {
      // 미국 티커
      symbol = raw.toUpperCase();
      name = symbol;
    }
  }

  // 2) 정규 매칭 실패 시 야후 검색
  if (!symbol) {
    const entry = await resolveStock(raw);
    if (!entry) return null;
    symbol = entry.id.replace(/^yahoo:/, "");
    name = entry.name;
    subtitle = entry.subtitle;
  }

  // 3) 일봉 캔들 fetch (2년치)
  const endMs = Date.now();
  const startMs = endMs - 1000 * 60 * 60 * 24 * 365 * 2;
  let candles = await fetchYahooCandles(symbol!, "1d", startMs, endMs);

  // 4) 한국 종목 .KS 시도 후 빈 결과면 .KQ 재시도
  if (
    candles.length === 0 &&
    symbol!.endsWith(".KS") &&
    /^\d{6}\.KS$/.test(symbol!)
  ) {
    const alt = symbol!.replace(/\.KS$/, ".KQ");
    candles = await fetchYahooCandles(alt, "1d", startMs, endMs);
    if (candles.length > 0) symbol = alt;
  }

  if (candles.length === 0) return null;

  // 이름이 심볼 그대로면 내장 목록에서 다시 찾기
  if (name === symbol) {
    const local = STOCK_MARKETS.find(
      (m) => m.id.replace(/^yahoo:/, "") === symbol,
    );
    if (local) {
      name = local.name;
      subtitle = local.subtitle;
    }
  }

  return buildStockReport({
    symbol: symbol!,
    name: name ?? symbol!,
    subtitle,
    candles,
  });
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

export default async function StockDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const report = await loadReport(params.slug);
  if (!report) notFound();

  const url = `${SITE}/stock/${symbolToSlug(report.symbol)}`;

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", url: `${SITE}/` },
          { name: "종목 검색", url: `${SITE}/stock` },
          { name: report.name, url },
        ])}
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

        <section className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 p-5">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100">
              진입 타이밍 평가
            </h2>
            <span className="text-amber-700 dark:text-amber-400 font-extrabold text-lg">
              {"★".repeat(report.entry.stars)}
              <span className="text-neutral-300 dark:text-neutral-700">
                {"★".repeat(5 - report.entry.stars)}
              </span>
            </span>
          </div>
          <p className="mt-1 text-sm font-bold text-amber-900 dark:text-amber-200">
            {report.entry.verdict}
          </p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
            <FactorCell label="추세" score={report.entry.trend.score} max={5} note={report.entry.trend.note} />
            <FactorCell label="모멘텀" score={report.entry.momentum.score} max={4} note={report.entry.momentum.note} />
            <FactorCell label="변동성" score={report.entry.volatility.score} max={5} note={report.entry.volatility.note} />
            <FactorCell label="수급" score={report.entry.liquidity.score} max={5} note={report.entry.liquidity.note} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3 text-neutral-900 dark:text-neutral-100">
            📊 일봉 차트
          </h2>
          <StockChart candles={report.candles} />
          <p className="mt-2 text-[12px] text-neutral-500 dark:text-neutral-500">
            최근 1년 일봉 종가 + EMA20·50·200 + 거래량. 실시간 X.
          </p>
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

        <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 bg-neutral-50/60 dark:bg-neutral-900/30">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            🧪 이 종목으로 백테스트 해보기
          </h2>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
            본인 전략 (이동평균·RSI·MACD·볼린저 등) 을 {report.name} 과거 데이터에 적용해 수익률·승률·최대낙폭을 계산할 수 있습니다.
          </p>
          <Link
            href={`/backtest?market=yahoo:${encodeURIComponent(report.symbol)}`}
            className="mt-3 inline-block text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline"
          >
            백테스트 도구로 이동 →
          </Link>
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
  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          {label}
        </div>
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
