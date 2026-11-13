"use client";

// 2026-11-13~ 관리자 화면(/admin/shop)에서 뺐음 — AI 자동 글을 끄면서 숨김. 자동 글을 다시 켜면 다시 붙여 쓰면 된다 (파일은 보존).

// 관리자: 자동글 최근 실행 기록 — 사람이 매번 로그를 보지 않아도 무엇이 왜 일어났는지 알 수 있게.
// 데이터: shop_runs (supabase/shop.sql). 표가 없으면 SQL 실행 안내.

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/community";
import { supabase } from "@/lib/supabase";

type Run = {
  id: number;
  created_at: string;
  outcome: "published" | "draft" | "below_bar" | "skipped" | "error";
  reason: string | null;
  title: string | null;
  slug: string | null;
  cost_usd: number | null;
};

const OUTCOME: Record<Run["outcome"], { label: string; cls: string }> = {
  published: { label: "발행", cls: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  draft: { label: "초안(합격)", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  below_bar: { label: "품질 미달", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  skipped: { label: "건너뜀", cls: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
  error: { label: "오류", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

const KRW_PER_USD = 1400;

export function ShopRunsAdmin() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("shop_runs")
      .select("id,created_at,outcome,reason,title,slug,cost_usd")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setRuns((data ?? []) as Run[]);
      });
  }, []);

  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
      <h2 className="font-bold">최근 실행 기록</h2>
      <p className="mt-1 text-xs text-neutral-500">
        자동글이 실행될 때마다 결과(발행·초안·품질 미달·건너뜀·오류)와 이유, AI 비용이 남아요. 평범한 대기(작성 시각 전 등)는 남기지 않아요.
      </p>
      {error ? (
        <p className="mt-3 text-sm text-amber-700">
          실행 기록 표가 아직 없어요. Supabase 에서 shop.sql 의 &quot;shop_runs&quot; 부분을 실행하면 보여요. ({error.slice(0, 80)})
        </p>
      ) : runs === null ? (
        <p className="mt-3 text-sm text-neutral-500">불러오는 중…</p>
      ) : runs.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">아직 기록이 없어요.</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
          {runs.map((r) => {
            const o = OUTCOME[r.outcome] ?? OUTCOME.skipped;
            const won = r.cost_usd ? Math.round(Number(r.cost_usd) * KRW_PER_USD) : 0;
            return (
              <li key={r.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${o.cls}`}>{o.label}</span>
                  <span>{timeAgo(r.created_at)}</span>
                  {won > 0 && <span>AI 비용 약 {won}원</span>}
                </div>
                {r.title && (
                  <div className="mt-1 font-medium">
                    {r.slug ? (
                      <a href={`/shop/${r.slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {r.title}
                      </a>
                    ) : (
                      r.title
                    )}
                  </div>
                )}
                {r.reason && <div className="mt-0.5 text-xs text-neutral-500">{r.reason}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
