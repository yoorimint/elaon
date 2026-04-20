"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AdminNav } from "@/components/AdminNav";
import {
  adminDeletePost,
  adminUnblindPost,
  isAdmin,
  listReportedPosts,
  reportReasonLabel,
  timeAgo,
  type ReportedPost,
} from "@/lib/community";

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState<ReportedPost[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const r = await listReportedPosts();
      setRows(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록 불러오기 실패");
    } finally {
      setLoadingList(false);
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

  async function onUnblind(id: string) {
    if (!confirm("이 글을 복원할까요? (블라인드 해제 + 기존 신고 내역 삭제)")) return;
    setBusyId(id);
    try {
      await adminUnblindPost(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "복원 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("이 글을 영구 삭제할까요?")) return;
    setBusyId(id);
    try {
      await adminDeletePost(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || checking) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 text-center text-sm text-neutral-500">
        권한 확인 중…
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 text-center">
        <h1 className="text-xl font-bold">접근 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-neutral-500">
          관리자 계정으로 로그인해야 볼 수 있습니다.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm"
        >
          홈으로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold">신고 관리</h1>
        <p className="mt-1 text-sm text-neutral-500">
          신고가 접수된 게시글 목록입니다. 10회 누적 시 자동 블라인드 처리됩니다.
          복원하면 신고 내역이 초기화됩니다.
        </p>
      </div>
      <AdminNav />

      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={load}
          disabled={loadingList}
          className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm"
        >
          {loadingList ? "불러오는 중…" : "새로고침"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {rows.length === 0 && !loadingList ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center text-sm text-neutral-500">
          신고된 게시글이 없습니다.
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`rounded-xl border p-4 ${
                r.blinded
                  ? "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/60"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    {r.blinded && (
                      <span className="rounded-full bg-amber-200/60 text-amber-800 dark:text-amber-200 dark:bg-amber-800/40 px-2 py-0.5 font-semibold">
                        블라인드 중
                      </span>
                    )}
                    <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                      신고 {r.report_count}회
                    </span>
                    <span>·</span>
                    <span>{timeAgo(r.created_at)}</span>
                    {r.author_username && (
                      <>
                        <span>·</span>
                        <span>{r.author_username}</span>
                      </>
                    )}
                  </div>
                  <Link
                    href={`/community/${r.slug}`}
                    className="mt-2 block font-semibold hover:underline truncate"
                  >
                    {r.title}
                  </Link>
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap line-clamp-3">
                    {r.body}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.reports.map((rr) => (
                      <span
                        key={rr.reason}
                        className="rounded-full bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-2 py-0.5 text-xs"
                      >
                        {reportReasonLabel(rr.reason)} × {rr.count}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => onUnblind(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-60"
                  >
                    복원
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-full bg-red-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
