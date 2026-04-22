import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase-server";
import { STRATEGIES } from "@/lib/strategies";
import { timeAgo } from "@/lib/community";
import { BeginnerPresetSection } from "@/components/BeginnerPresetSection";
import { SupportedStrategiesGrid } from "@/components/SupportedStrategiesGrid";
import { TodaySignalBoard } from "@/components/TodaySignalBoard";
import { TodayBuyHighlight } from "@/components/TodayBuyHighlight";

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

export type BoardCandidate = {
  slug: string;
  market: string;
  strategy: string;
  timeframe: string | null;
  days: number;
  params: Record<string, unknown>;
  custom_buy: unknown[] | null;
  custom_sell: unknown[] | null;
  diy_allow_reentry: boolean | null;
  diy_sell_fraction: number | null;
  return_pct: number;
  benchmark_return_pct: number;
  trade_count: number;
};

async function loadHomeData() {
  const sb = createServerClient();
  // 두 쿼리 병렬:
  //  (1) "최근 공유된 백테스트" 섹션용 3개 (최신순)
  //  (2) "오늘의 신호" 보드 풀 — 조건(10%+ & 보유 이김) 통과 중 수익률 상위.
  //      봇 + 유저가 공유한 결과에서 가져옴. market 중복은 클라에서 dedup.
  const [recentRes, topRes] = await Promise.all([
    sb
      .from("shared_backtests")
      .select("slug,market,strategy,days,return_pct,benchmark_return_pct,trade_count,created_at")
      .eq("is_private", false)
      .order("created_at", { ascending: false })
      .limit(3),
    sb
      .from("shared_backtests")
      .select("slug,market,strategy,timeframe,days,params,custom_buy,custom_sell,diy_allow_reentry,diy_sell_fraction,return_pct,benchmark_return_pct,trade_count")
      .eq("is_private", false)
      .gte("return_pct", 10)
      .order("return_pct", { ascending: false })
      .limit(40),
  ]);

  const topRaw = (topRes.data ?? []) as (BoardCandidate & {
    return_pct: number;
    benchmark_return_pct: number;
  })[];
  // 보유 대비 초과수익만 + market 당 1개 (최고 수익) — variety 확보
  const seen = new Set<string>();
  const topCandidates: BoardCandidate[] = [];
  for (const r of topRaw) {
    if (r.return_pct <= r.benchmark_return_pct) continue;
    if (seen.has(r.market)) continue;
    seen.add(r.market);
    topCandidates.push(r);
    if (topCandidates.length >= 20) break;
  }

  return {
    shared: (recentRes.data ?? []) as SharedRow[],
    topCandidates,
  };
}

function strategyName(id: string) {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

export default async function HomePage() {
  const { shared, topCandidates } = await loadHomeData();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <section className="mb-12">
        <div className="text-brand text-xs sm:text-sm font-semibold tracking-widest">
          ELOAN BACKTEST
        </div>
        <h1 className="mt-2 text-3xl sm:text-5xl font-bold leading-tight">
          유튜브에서 본 전략,
          <br />
          진짜 돈 벌었는지 3분 만에 확인.
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

      <TodayBuyHighlight />

      <TodaySignalBoard candidates={topCandidates} />

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
