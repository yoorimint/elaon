"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
  Legend,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/components/AuthProvider";
import { AdminNav } from "@/components/AdminNav";
import {
  getSiteStats,
  getVisitsTrend,
  isAdmin,
  type SiteStats,
  type VisitTrendRow,
} from "@/lib/community";

function Card({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "pos" | "neg" | "warn";
}) {
  const color =
    tone === "pos"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "neg"
        ? "text-red-600 dark:text-red-400"
        : tone === "warn"
          ? "text-amber-600 dark:text-amber-400"
          : "";
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-neutral-500">{hint}</div>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [trend, setTrend] = useState<VisitTrendRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [s, t] = await Promise.all([getSiteStats(), getVisitsTrend()]);
      setStats(s);
      setTrend(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    isAdmin().then((ok) => {
      setAuthorized(ok);
      setChecking(false);
      if (ok) load();
    });
  }, [user, authLoading, router, load]);

  if (authLoading || checking) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-12 text-center text-sm text-neutral-500">
        권한 확인 중…
      </main>
    );
  }
  if (!authorized) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-12 text-center">
        <h1 className="text-xl font-bold">접근 권한이 없습니다</h1>
        <Link
          href="/"
          className="mt-5 inline-block rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm"
        >
          홈으로
        </Link>
      </main>
    );
  }

  const trendData = trend.map((r) => ({
    date: r.date.slice(5), // MM-DD
    유니크: r.uniques,
    페이지뷰: r.views,
  }));

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold">어드민 대시보드</h1>
        <p className="mt-1 text-sm text-neutral-500">
          사이트 운영 지표와 검토 대기 항목을 한눈에.
        </p>
      </div>
      <AdminNav />

      <div className="mb-4 flex justify-end">
        <button
          onClick={load}
          disabled={refreshing}
          className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm"
        >
          {refreshing ? "갱신 중…" : "새로고침"}
        </button>
      </div>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {stats && (
        <>
          <h2 className="text-sm font-semibold text-neutral-500 mb-2">오늘</h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Card
              label="방문자 (유니크)"
              value={stats.today_uniques.toLocaleString()}
              hint={`어제 ${stats.yesterday_uniques.toLocaleString()}명`}
              tone="pos"
            />
            <Card
              label="페이지뷰"
              value={stats.today_visits.toLocaleString()}
            />
            <Card
              label="신규 가입"
              value={stats.today_signups.toLocaleString()}
            />
            <Card
              label="신규 신고"
              value={stats.today_reports.toLocaleString()}
              tone={stats.today_reports > 0 ? "warn" : undefined}
            />
            <Card label="새 게시글" value={stats.today_posts.toLocaleString()} />
            <Card label="새 댓글" value={stats.today_comments.toLocaleString()} />
            <Card
              label="최근 7일 유니크"
              value={stats.week_uniques.toLocaleString()}
            />
            <Card
              label="누적 회원"
              value={stats.total_users.toLocaleString()}
            />
          </div>

          <h2 className="text-sm font-semibold text-neutral-500 mt-8 mb-2">
            관리 대기
          </h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Card
              label="블라인드 글"
              value={stats.blinded_posts.toLocaleString()}
              tone={stats.blinded_posts > 0 ? "warn" : undefined}
              hint="신고 10회 누적된 글"
            />
            <Card
              label="제재 계정"
              value={stats.banned_users.toLocaleString()}
              tone={stats.banned_users > 0 ? "neg" : undefined}
            />
            <Card
              label="답변 대기 건의"
              value={stats.open_suggestions.toLocaleString()}
              tone={stats.open_suggestions > 0 ? "warn" : undefined}
              hint="유저가 보낸 미답변 건의"
            />
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col justify-center">
              <Link
                href="/admin/reports"
                className="text-sm font-semibold text-brand hover:underline"
              >
                신고 관리로 →
              </Link>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col justify-center">
              <Link
                href="/admin/users"
                className="text-sm font-semibold text-brand hover:underline"
              >
                회원 관리로 →
              </Link>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-neutral-500 mt-8 mb-2">
            최근 14일 방문 추이
          </h2>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-2">
            {trendData.length < 2 ? (
              <div className="flex h-56 items-center justify-center text-sm text-neutral-500">
                데이터가 쌓이면 그래프가 표시됩니다.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="유니크" fill="#5b8cff" />
                    <Bar dataKey="페이지뷰" fill="#a3a3a3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
