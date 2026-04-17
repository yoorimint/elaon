"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { incrementView, loadShare } from "@/lib/share";
import { STRATEGIES } from "@/lib/strategies";
import type { SharedBacktest } from "@/lib/supabase";

function formatKRW(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
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

function SharedContent() {
  const params = useSearchParams();
  const slug = params.get("id");
  const [data, setData] = useState<SharedBacktest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("공유 ID가 없습니다");
      setLoading(false);
      return;
    }
    loadShare(slug)
      .then((r) => {
        if (!r) setError("공유된 결과를 찾을 수 없습니다");
        else {
          setData(r);
          incrementView(slug).catch(() => {});
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="mt-12 text-neutral-500">불러오는 중…</div>;
  if (error) return <div className="mt-12 text-red-600">{error}</div>;
  if (!data) return null;

  const strategyName = STRATEGIES.find((s) => s.id === data.strategy)?.name ?? data.strategy;
  const chartData = data.equity_curve.map((p) => ({
    date: new Date(p.t).toISOString().slice(0, 10),
    전략: p.e,
    보유: p.b,
  }));
  const beat = data.return_pct > data.benchmark_return_pct;

  return (
    <>
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            {data.market}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1">
            {strategyName}
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
          {new Date(data.created_at).toLocaleString("ko-KR")} · 조회 {data.view_count + 1}
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

      <div className="mt-6 h-72 sm:h-96 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" minTickGap={40} stroke="currentColor" opacity={0.4} />
            <YAxis
              tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`}
              stroke="currentColor"
              opacity={0.4}
              width={60}
            />
            <Tooltip formatter={(v: number) => `₩${formatKRW(v)}`} labelStyle={{ color: "#000" }} />
            <Legend />
            <Line type="monotone" dataKey="전략" stroke="#f7931a" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="보유" stroke="#888" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8">
        <Link
          href="/backtest"
          className="inline-flex items-center rounded-full bg-brand px-6 py-3 text-white font-semibold hover:bg-brand-dark"
        >
          내 전략도 돌려보기
        </Link>
      </div>
    </>
  );
}

export default function SharedPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <div className="mb-6">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          ← 홈으로
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">공유된 백테스트 결과</h1>
      </div>
      <Suspense fallback={<div className="mt-12 text-neutral-500">불러오는 중…</div>}>
        <SharedContent />
      </Suspense>
    </main>
  );
}
