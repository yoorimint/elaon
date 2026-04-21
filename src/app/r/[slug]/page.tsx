import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase-server";
import { STRATEGIES } from "@/lib/strategies";
import { SharedChart } from "@/components/SharedChart";
import type { SharedBacktest } from "@/lib/supabase";

export const revalidate = 60;

async function loadShare(slug: string): Promise<SharedBacktest | null> {
  const sb = createServerClient();
  const { data } = await sb
    .from("shared_backtests")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as SharedBacktest | null) ?? null;
}

function formatKRW(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}

function strategyName(id: string) {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await loadShare(params.slug);
  if (!data) return { title: "공유 결과" };

  const sName = strategyName(data.strategy);
  const ret = data.return_pct.toFixed(1);
  const title = `${data.market} ${sName} ${data.days}일 → ${ret}% | eloan 백테스트`;
  const description = `전략 수익률 ${ret}% (단순 보유 ${data.benchmark_return_pct.toFixed(1)}%) · MDD ${data.max_drawdown_pct.toFixed(1)}% · 거래 ${data.trade_count}회`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/r/${data.slug}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color =
    tone === "pos"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "neg"
        ? "text-red-600 dark:text-red-400"
        : "";
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

export default async function SharedPage({ params }: { params: { slug: string } }) {
  const data = await loadShare(params.slug);
  if (!data) notFound();

  const beat = data.return_pct > data.benchmark_return_pct;
  const sName = strategyName(data.strategy);

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          ← 홈으로
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">공유된 백테스트 결과</h1>
      </div>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            {data.market}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            {sName}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            {data.days}일
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            초기 ₩{formatKRW(data.initial_cash)}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            수수료 {data.fee_bps}bps
          </span>
        </div>
        <div className="mt-3 text-xs text-neutral-500">
          {new Date(data.created_at).toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
          })}{" "}
          · 조회 {data.view_count + 1}
        </div>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="전략 수익률"
          value={`${data.return_pct.toFixed(2)}%`}
          tone={data.return_pct >= 0 ? "pos" : "neg"}
        />
        <Stat
          label="단순 보유 수익률"
          value={`${data.benchmark_return_pct.toFixed(2)}%`}
          tone={data.benchmark_return_pct >= 0 ? "pos" : "neg"}
        />
        <Stat label="최대 낙폭(MDD)" value={`${data.max_drawdown_pct.toFixed(2)}%`} tone="neg" />
        <Stat
          label="승률"
          value={data.trade_count === 0 ? "-" : `${Number(data.win_rate).toFixed(1)}%`}
        />
      </div>

      <div className="mt-4 text-sm">
        {beat ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            ✓ 단순 보유보다 {(data.return_pct - data.benchmark_return_pct).toFixed(2)}%p 초과 수익
          </span>
        ) : (
          <span className="text-neutral-500">
            단순 보유 대비 {(data.return_pct - data.benchmark_return_pct).toFixed(2)}%p
          </span>
        )}
      </div>

      <SharedChart equity={data.equity_curve} />

      <div className="mt-8">
        <Link
          href="/backtest"
          className="inline-flex items-center rounded-full bg-brand px-6 py-3 text-white font-semibold hover:bg-brand-dark"
        >
          내 전략도 돌려보기
        </Link>
      </div>
    </main>
  );
}
