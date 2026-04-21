"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  createSuggestion,
  deleteSuggestion,
  listMySuggestions,
  statusLabel,
  type Suggestion,
} from "@/lib/suggestions";
import { timeAgo } from "@/lib/community";

export default function SuggestPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listMySuggestions();
      setList(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/suggest");
      return;
    }
    load();
  }, [authLoading, user, router, load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("제목과 내용을 모두 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createSuggestion(title, body);
      setTitle("");
      setBody("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("이 건의를 삭제할까요?")) return;
    try {
      await deleteSuggestion(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  if (authLoading || !user) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 text-center text-sm text-neutral-500">
        확인 중…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <div className="mb-6">
        <Link
          href="/community"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          ← 커뮤니티로
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">건의하기</h1>
        <p className="mt-2 text-sm text-neutral-500">
          사이트에 건의하거나 문의하고 싶은 내용을 적어주세요. 운영자만 확인할 수 있고,
          답변이 달리면 이 페이지에서 확인할 수 있습니다. 다른 사용자에겐 노출되지 않습니다.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3"
      >
        <label className="block">
          <span className="text-sm font-medium">제목</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 200))}
            placeholder="예: 차트에 거래량 표시 추가해주세요"
            className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">내용</span>
          <textarea
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 10000))}
            placeholder="상세 내용을 적어주세요."
            className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
          />
        </label>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-brand px-5 py-2 text-white text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? "등록 중…" : "건의 등록"}
          </button>
        </div>
      </form>

      <h2 className="mt-10 text-lg font-bold">내가 보낸 건의</h2>
      {loading && list.length === 0 ? (
        <div className="mt-3 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center text-sm text-neutral-500">
          불러오는 중…
        </div>
      ) : list.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
          아직 보낸 건의가 없습니다.
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {list.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
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
                    <span>{timeAgo(s.created_at)}</span>
                  </div>
                  <div className="mt-2 font-semibold">{s.title}</div>
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                    {s.body}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(s.id)}
                  className="text-xs text-neutral-400 hover:text-red-600 shrink-0"
                >
                  삭제
                </button>
              </div>
              {s.admin_reply && (
                <div className="mt-3 rounded-lg bg-brand/5 border border-brand/20 p-3">
                  <div className="text-xs font-semibold text-brand mb-1">
                    운영자 답변 · {s.replied_at ? timeAgo(s.replied_at) : ""}
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-neutral-800 dark:text-neutral-100">
                    {s.admin_reply}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
