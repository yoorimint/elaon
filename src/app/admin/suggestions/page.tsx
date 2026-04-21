"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AdminNav } from "@/components/AdminNav";
import { isAdmin, timeAgo } from "@/lib/community";
import {
  adminReplySuggestion,
  deleteSuggestion,
  listAllSuggestions,
  statusLabel,
  type Suggestion,
} from "@/lib/suggestions";

export default function AdminSuggestionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "replied">("open");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAllSuggestions();
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
      router.replace("/login?redirect=/admin/suggestions");
      return;
    }
    isAdmin().then((ok) => {
      setAuthorized(ok);
      setChecking(false);
      if (ok) load();
    });
  }, [user, authLoading, router, load]);

  async function onReply(s: Suggestion) {
    const draft = (replyDrafts[s.id] ?? "").trim();
    if (!draft) {
      alert("답변 내용을 입력해주세요.");
      return;
    }
    setBusyId(s.id);
    try {
      await adminReplySuggestion(s.id, draft);
      setReplyDrafts((d) => ({ ...d, [s.id]: "" }));
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "답변 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(s: Suggestion) {
    if (!confirm(`"${s.title}" 건의를 삭제할까요?`)) return;
    setBusyId(s.id);
    try {
      await deleteSuggestion(s.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = rows.filter((r) =>
    filter === "all" ? true : r.status === filter,
  );

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
        <h1 className="text-2xl sm:text-3xl font-bold">건의함</h1>
        <p className="mt-1 text-sm text-neutral-500">
          유저가 직접 보낸 건의/문의입니다. 답변을 작성하면 작성자 본인에게만 노출됩니다.
        </p>
      </div>
      <AdminNav />

      <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1">
          {(["open", "replied", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs border ${
                filter === f
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {f === "open" ? "답변 대기" : f === "replied" ? "답변 완료" : "전체"}
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

      {filtered.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center text-sm text-neutral-500">
          해당하는 건의가 없습니다.
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((s) => {
            const draft = replyDrafts[s.id] ?? s.admin_reply ?? "";
            return (
              <li
                key={s.id}
                className={`rounded-xl border p-4 ${
                  s.status === "open"
                    ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/60"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          s.status === "replied"
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                        }`}
                      >
                        {statusLabel(s.status)}
                      </span>
                      <span>·</span>
                      <span>{s.author_username ?? "(탈퇴한 회원)"}</span>
                      <span>·</span>
                      <span>{timeAgo(s.created_at)}</span>
                    </div>
                    <div className="mt-2 font-semibold">{s.title}</div>
                    <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                      {s.body}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(s)}
                    disabled={busyId === s.id}
                    className="text-xs text-neutral-400 hover:text-red-600 shrink-0"
                  >
                    삭제
                  </button>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-brand mb-1">
                    {s.status === "replied" ? "답변 수정" : "답변"}
                  </label>
                  <textarea
                    rows={3}
                    value={draft}
                    onChange={(e) =>
                      setReplyDrafts((d) => ({ ...d, [s.id]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
                    placeholder="작성자에게만 보이는 답변을 적어주세요."
                  />
                  <div className="mt-2 flex justify-between items-center">
                    {s.admin_reply && s.replied_at && (
                      <span className="text-xs text-neutral-500">
                        기존 답변 {timeAgo(s.replied_at)}
                      </span>
                    )}
                    <button
                      onClick={() => onReply(s)}
                      disabled={busyId === s.id}
                      className="ml-auto rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                    >
                      {busyId === s.id
                        ? "저장 중…"
                        : s.status === "replied"
                          ? "답변 수정"
                          : "답변 등록"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
