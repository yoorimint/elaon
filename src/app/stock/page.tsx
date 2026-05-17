import type { Metadata } from "next";
import Link from "next/link";
import { STOCK_MARKETS } from "@/lib/market";
import { symbolToSlug } from "@/lib/stock-resolver";
import { StockSearchBox } from "@/components/StockSearchBox";

const SITE = "https://www.eloan.kr";
const HUB_URL = `${SITE}/stock`;

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "종목 검색 — 일봉 차트·기술 지표·재무 한눈에",
  description:
    "한국·미국 종목을 검색해 일봉 차트·기술 지표(RSI·ADX·VWAP·볼린저·EMA)·재무(PER·PBR·ROE)·진입 신호를 한 페이지에서 확인.",
  alternates: { canonical: HUB_URL },
  keywords: ["종목 검색", "주식 차트", "기술 지표", "주식 분석", "종목 보고서", "eloan"],
  openGraph: {
    type: "website",
    title: "종목 검색 — 일봉 차트·기술 지표·재무 한눈에",
    description: "종목명·코드를 입력하면 일봉 차트와 기술 지표·재무 정보를 보고서로 보여줍니다.",
    url: HUB_URL,
    locale: "ko_KR",
    siteName: "eloan",
  },
};

const KR_POPULAR = STOCK_MARKETS.filter((m) => m.kind === "stock_kr").slice(0, 24);
const US_POPULAR = STOCK_MARKETS.filter((m) => m.kind === "stock_us").slice(0, 18);

export default function StockHubPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <nav className="text-sm text-neutral-500">
        <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">
          홈
        </Link>
        {" / "}
        <span className="text-neutral-700 dark:text-neutral-300">종목 검색</span>
      </nav>

      <header className="mt-3 mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold">📈 종목 검색</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          종목명 또는 코드(예: 005930, 삼성전자, AAPL)를 입력하면 일봉 차트·EMA·RSI·ADX·VWAP·볼린저·재무 지표·진입 타이밍 신호를 한 페이지에서 확인할 수 있습니다. 검색 시점에 야후 파이낸스 일봉 데이터를 기반으로 보고서가 생성됩니다.
        </p>
      </header>

      <StockSearchBox />

      <section className="mt-12">
        <h2 className="text-lg font-bold mb-3 text-neutral-800 dark:text-neutral-200 border-l-4 border-brand pl-3">
          한국 인기 종목
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {KR_POPULAR.map((m) => {
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
                  {symbol.replace(/\.(KS|KQ)$/, "")} ·{" "}
                  {symbol.endsWith(".KS") ? "KOSPI" : "KOSDAQ"}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold mb-3 text-neutral-800 dark:text-neutral-200 border-l-4 border-brand pl-3">
          미국 인기 종목
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {US_POPULAR.map((m) => {
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
                  {symbol} · {m.subtitle}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-12 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
        <p>
          데이터는 야후 파이낸스 일봉 종가 기준이며 실시간 호가가 아닙니다. 정확한 매매 가격은 본인 증권사에서 재확인하시기 바랍니다.
        </p>
      </section>
    </main>
  );
}
