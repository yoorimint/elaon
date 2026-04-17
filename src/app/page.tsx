import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { STRATEGIES } from "@/lib/strategies";
import { categoryLabel, timeAgo, type Category } from "@/lib/community";

export const revalidate = 30;

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

type PostRow = {
  slug: string;
  title: string;
  category: Category;
  comment_count: number;
  view_count: number;
  backtest_slug: string | null;
  created_at: string;
  profiles: { username: string } | null;
};

async function loadHomeData() {
  const sb = createServerClient();
  const [sharedRes, postsRes] = await Promise.all([
    sb
      .from("shared_backtests")
      .select("slug,market,strategy,days,return_pct,benchmark_return_pct,trade_count,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    sb
      .from("posts")
      .select("slug,title,category,comment_count,view_count,backtest_slug,created_at,profiles(username)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  return {
    shared: (sharedRes.data ?? []) as SharedRow[],
    posts: (postsRes.data ?? []) as unknown as PostRow[],
  };
}

function strategyName(id: string) {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

export default async function HomePage() {
  const { shared, posts } = await loadHomeData();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <section className="mb-12">
        <div className="text-brand text-xs sm:text-sm font-semibold tracking-widest">
          ELOAN BACKTEST
        </div>
        <h1 className="mt-2 text-3xl sm:text-5xl font-bold leading-tight">
          코인 전략,
          <br />
          숫자로 증명하세요.
        </h1>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400 text-base sm:text-lg">
          업비트 실제 과거 데이터로 전략을 돌려봅니다. 3분 안에 결과가 나옵니다.
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

      <section className="mb-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg sm:text-xl font-bold">최신 커뮤니티 글</h2>
          <Link href="/community" className="text-sm text-neutral-500 hover:underline">
            전체 보기 →
          </Link>
        </div>
        {posts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
            아직 글이 없습니다. 첫 글을 남겨주세요.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-b border-neutral-200 dark:border-neutral-800">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/community/${p.slug}`}
                  className="flex items-start gap-3 py-3 px-2 -mx-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <span className="shrink-0 mt-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs px-2 py-0.5">
                    {categoryLabel(p.category)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      <span className="font-medium">{p.title}</span>
                      {p.comment_count > 0 && (
                        <span className="ml-2 text-brand text-sm">[{p.comment_count}]</span>
                      )}
                      {p.backtest_slug && (
                        <span className="ml-2 text-xs text-brand">📊</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {p.profiles?.username ?? "익명"} · {timeAgo(p.created_at)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-lg sm:text-xl font-bold">지원 전략</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {STRATEGIES.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
            >
              <div className="font-semibold">{s.name}</div>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {s.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-12 pb-8 text-xs text-neutral-500">
        * 투자 판단은 본인 책임입니다. 과거 수익률이 미래 수익을 보장하지 않습니다.
      </footer>
    </main>
  );
}
