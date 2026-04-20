"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AdminNav } from "@/components/AdminNav";
import {
  banUser,
  isAdmin,
  listAllUsers,
  timeAgo,
  unbanUser,
  type AdminUser,
} from "@/lib/community";

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "banned" | "active">("all");

  // 제재 모달
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAllUsers(500);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
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

  async function doBan() {
    if (!banTarget) return;
    setBusyId(banTarget.user_id);
    try {
      await banUser(banTarget.user_id, banReason);
      setBanTarget(null);
      setBanReason("");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "제재 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function doUnban(u: AdminUser) {
    if (!confirm(`${u.username ?? u.email} 계정의 제재를 해제할까요?`)) return;
    setBusyId(u.user_id);
    try {
      await unbanUser(u.user_id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "해제 실패");
    } finally {
      setBusyId(null);
    }
  }

  const query = q.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (filter === "banned" && !r.banned) return false;
    if (filter === "active" && r.banned) return false;
    if (!query) return true;
    return (
      r.email.toLowerCase().includes(query) ||
      (r.username ?? "").toLowerCase().includes(query) ||
      r.user_id.toLowerCase().includes(query)
    );
  });

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

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold">회원 관리</h1>
        <p className="mt-1 text-sm text-neutral-500">
          제재 걸린 계정은 글/댓글/좋아요/신고 작성이 모두 차단됩니다. 해제하면 즉시 복구됩니다.
        </p>
      </div>
      <AdminNav />

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이메일, 닉네임, UID 검색"
          className="flex-1 min-w-[180px] rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
        <div className="flex gap-1">
          {(["all", "active", "banned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs border ${
                filter === f
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {f === "all" ? "전체" : f === "active" ? "정상" : "제재됨"}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs"
        >
          {loading ? "…" : "새로고침"}
        </button>
      </div>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">닉네임 / 이메일</th>
              <th className="px-3 py-2 text-left">가입</th>
              <th className="px-3 py-2 text-right">글</th>
              <th className="px-3 py-2 text-right">댓글</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr
                key={u.user_id}
                className={`border-t border-neutral-200 dark:border-neutral-800 ${
                  u.banned ? "bg-red-50/50 dark:bg-red-950/20" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <div className="font-semibold">
                    {u.username ?? "(닉네임 없음)"}
                    {u.is_admin && (
                      <span className="ml-2 rounded-full bg-brand/10 text-brand px-1.5 py-0.5 text-[10px] font-bold">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 truncate max-w-[260px]">{u.email}</div>
                </td>
                <td className="px-3 py-2 text-xs text-neutral-500 whitespace-nowrap">
                  {timeAgo(u.created_at)}
                </td>
                <td className="px-3 py-2 text-right">{u.post_count}</td>
                <td className="px-3 py-2 text-right">{u.comment_count}</td>
                <td className="px-3 py-2">
                  {u.banned ? (
                    <div>
                      <span className="rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2 py-0.5 text-xs font-semibold">
                        제재됨
                      </span>
                      {u.banned_reason && (
                        <div className="text-xs text-neutral-500 mt-1 max-w-[240px] line-clamp-2">
                          사유: {u.banned_reason}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-500">정상</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {u.is_admin ? (
                    <span className="text-xs text-neutral-400">—</span>
                  ) : u.banned ? (
                    <button
                      onClick={() => doUnban(u)}
                      disabled={busyId === u.user_id}
                      className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-60"
                    >
                      해제
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setBanTarget(u);
                        setBanReason("");
                      }}
                      disabled={busyId === u.user_id}
                      className="rounded-full bg-red-600 text-white px-3 py-1 text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                    >
                      제재
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-neutral-500">
                  해당하는 회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {banTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => busyId === null && setBanTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold">계정 제재</h3>
            <p className="mt-1 text-xs text-neutral-500">
              <span className="font-semibold">{banTarget.username ?? banTarget.email}</span> 계정의
              글·댓글·좋아요·신고 작성이 즉시 차단됩니다. 기존 게시물은 그대로 유지돼요.
            </p>
            <label className="mt-4 block text-sm">
              <span className="text-xs text-neutral-500">사유 (선택)</span>
              <textarea
                rows={3}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value.slice(0, 500))}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
                placeholder="예: 반복 스팸, 욕설 등"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => setBanTarget(null)}
                className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm"
              >
                취소
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={doBan}
                className="rounded-full bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {busyId === banTarget.user_id ? "처리 중…" : "제재 실행"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
