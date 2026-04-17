"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadShare } from "@/lib/share";
import type { SharedBacktest } from "@/lib/supabase";
import { STRATEGIES } from "@/lib/strategies";

export function BacktestPreviewCard({ slug }: { slug: string }) {
  const [data, setData] = useState<SharedBacktest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShare(slug)
      .then(setData)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-sm text-neutral-500">
        백테스트 결과 불러오는 중…
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-sm text-neutral-500">
        첨부된 백테스트 결과를 찾을 수 없습니다.
      </div>
    );
  }

  const strategyName = STRATEGIES.find((s) => s.id === data.strategy)?.name ?? data.strategy;
  const beat = data.return_pct > data.benchmark_return_pct;

  return (
    <Link
      href={`/r/?id=${data.slug}`}
      className="mt-4 block rounded-xl border border-brand/40 bg-brand/5 p-4 hover:bg-brand/10 transition"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-white dark:bg-neutral-900 px-2 py-0.5 border border-neutral-200 dark:border-neutral-800">
          {data.market}
        </span>
        <span className="rounded-full bg-white dark:bg-neutral-900 px-2 py-0.5 border border-neutral-200 dark:border-neutral-800">
          {strategyName}
        </span>
        <span className="rounded-full bg-white dark:bg-neutral-900 px-2 py-0.5 border border-neutral-200 dark:border-neutral-800">
          {data.days}일
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-4">
        <div>
          <div className="text-xs text-neutral-500">전략 수익률</div>
          <div
            className={`text-2xl font-bold ${
              data.return_pct >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {data.return_pct.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">단순 보유</div>
          <div className="text-lg font-semibold text-neutral-500">
            {data.benchmark_return_pct.toFixed(2)}%
          </div>
        </div>
        <div className="ml-auto text-xs">
          {beat ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              ✓ +{(data.return_pct - data.benchmark_return_pct).toFixed(2)}%p
            </span>
          ) : (
            <span className="text-neutral-500">
              {(data.return_pct - data.benchmark_return_pct).toFixed(2)}%p
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-neutral-500">
        MDD {data.max_drawdown_pct.toFixed(1)}% · 거래 {data.trade_count}회 · 상세보기 →
      </div>
    </Link>
  );
}
