import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase-server";
import { STRATEGIES } from "@/lib/strategies";
import { timeAgo } from "@/lib/community";
import { BeginnerPresetSection } from "@/components/BeginnerPresetSection";
import { SupportedStrategiesGrid } from "@/components/SupportedStrategiesGrid";
import { TodayBuyHighlight } from "@/components/TodayBuyHighlight";
import { PopularCoinsTop } from "@/components/PopularCoinsTop";
import { SajudayAd } from "@/components/SajudayAd";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StockSearchBox } from "@/components/StockSearchBox";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "코인·주식 전략 백테스트 & 모의투자 무료 도구",
  description:
    "코인·주식 투자 전략을 3분 만에 백테스트하고 모의투자로 검증하세요. 12종 전략 무료 제공.",
  alternates: { canonical: "https://www.eloan.kr" },
  openGraph: {
    title: "eloan — 코인·주식 백테스트 무료 도구",
    description:
      "코인·주식 전략을 3분 만에 백테스트하고 모의투자로 검증하는 무료 도구.",
    url: "https://www.eloan.kr",
  },
};

type SharedRow = {
  slug: string;
  market: string;
  strategy: string;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
  trade_count: number;
  created_at: string;
};

async function loadHomeData() {
  const sb = createServerClient();
  // "최근 공유된 백테스트" 섹션용 — 사회적 증거 (봇 + 유저가 자발적으로 공유한 것).
  // "검증된 전략" 은 TodayBuyHighlight 컴포넌트가 board_top_signals 직접 SELECT.
  const sharedRes = await sb
    .from("shared_backtests")
    .select("slug,market,strategy,days,return_pct,benchmark_return_pct,trade_count,created_at")
    .eq("is_private", false)
    // SNS 봇 전용 자동 스캔 결과는 리스트에서 제외 (슬러그로는 접근 가능)
    .or("source.is.null,source.neq.social-scan")
    .order("created_at", { ascending: false })
    .limit(3);
  return {
    shared: (sharedRes.data ?? []) as SharedRow[],
  };
}

function strategyName(id: string) {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

export default async function HomePage() {
  const { shared } = await loadHomeData();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <div className="mb-4 flex justify-end">
        <ThemeToggle />
      </div>
      <section className="mb-12">
        <div className="text-brand text-xs sm:text-sm font-semibold tracking-widest">
          ELOAN BACKTEST
        </div>
        <h1 className="mt-2 text-[22px] sm:text-4xl font-bold leading-tight whitespace-nowrap">
          아직 소문 듣고 매매하세요?
          <br />
          전략이 없으면 수익도 없어요.
        </h1>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400 text-base sm:text-lg">
          업비트·Yahoo Finance·OKX 실제 과거 시세로 돌려봅니다. 결과 보고 모의투자로 이어서 검증까지.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/backtest"
            className="inline-flex items-center rounded-full bg-brand px-6 py-3 text-white font-semibold hover:bg-brand-dark"
          >
            백테스트 시작
          </Link>
          <Link
            href="/community"
            className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-6 py-3 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            커뮤니티 보기
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg sm:text-xl font-bold mb-3">
          🔍 종목 검색 — 일봉 차트·기술 지표·재무 한눈에
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
          종목명·코드(예: 삼성전자, 005930, AAPL) 를 입력하면 EMA·RSI·ADX·VWAP·CAN SLIM·Quant 지표 + 단순 전략 백테스트 미리보기를 한 페이지에서 확인할 수 있습니다.
        </p>
        <StockSearchBox />
      </section>

      <section className="mb-10">
        <h2 className="text-lg sm:text-xl font-bold mb-3">📚 사이트 도구 둘러보기</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/picks/checklist"
            className="block rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 hover:border-brand hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">✅</div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100">
              체크리스트
            </div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              부수입·세금·환급금 빠뜨림 방지. 본인 상황 분기 + 진행률 저장.
            </p>
          </Link>
          <Link
            href="/picks/vs"
            className="block rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 hover:border-brand hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">🆚</div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100">
              비교
            </div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              ChatGPT vs Claude, 디딤돌 vs 보금자리 등 사이드바이사이드.
            </p>
          </Link>
          <Link
            href="/picks"
            className="block rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 hover:border-brand hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">📚</div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100">
              주소모음
            </div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              AI·정부지원금·무료 리소스·코인 도구 등 카테고리 디렉토리.
            </p>
          </Link>
          <Link
            href="/glossary"
            className="block rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 hover:border-brand hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">📖</div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100">
              지표 사전
            </div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              RSI·ADX·VWAP·MACD 같은 기술 지표 뜻과 사용법.
            </p>
          </Link>
        </div>
      </section>

      <PopularCoinsTop />

      <SajudayAd />

      <TodayBuyHighlight />

      <BeginnerPresetSection />

      <section className="mb-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg sm:text-xl font-bold">최근 공유된 백테스트</h2>
          <Link href="/backtest" className="text-sm text-neutral-500 hover:underline">
            내 전략 돌려보기 →
          </Link>
        </div>
        {shared.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
            아직 공유된 결과가 없습니다. 첫 번째가 되어보세요.
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shared.map((s) => {
              const beat = s.return_pct > s.benchmark_return_pct;
              return (
                <li key={s.slug}>
                  <Link
                    href={`/r/${s.slug}`}
                    className="block rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-brand/50 hover:bg-brand/5 transition"
                  >
                    <div className="flex flex-wrap gap-1.5 text-xs text-neutral-500">
                      <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                        {s.market}
                      </span>
                      <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                        {strategyName(s.strategy)}
                      </span>
                      <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                        {s.days}일
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-3">
                      <span
                        className={`text-2xl font-bold ${
                          s.return_pct >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {s.return_pct.toFixed(1)}%
                      </span>
                      <span className="text-xs text-neutral-500">
                        vs 보유 {s.benchmark_return_pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-neutral-500 flex gap-2">
                      <span>거래 {s.trade_count}회</span>
                      <span>·</span>
                      <span>{timeAgo(s.created_at)}</span>
                      {beat && (
                        <span className="ml-auto text-emerald-600 dark:text-emerald-400 font-semibold">
                          ✓ 초과수익
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <SupportedStrategiesGrid />

      <footer className="mt-12 pb-8 text-xs text-neutral-500 space-y-2">
        <div>
          * 투자 판단은 본인 책임입니다. 과거 수익률이 미래 수익을 보장하지 않습니다.
        </div>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-white">
            이용약관
          </Link>
          <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-white font-semibold">
            개인정보처리방침
          </Link>
        </div>
      </footer>
    </main>
  );
}
