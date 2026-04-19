"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { CATEGORIES, createPost, type Category } from "@/lib/community";

export default function NewPostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const prefillSlug = searchParams.get("backtest_slug");
  const [category, setCategory] = useState<Category>(
    prefillSlug ? "strategy" : "free",
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [backtestUrl, setBacktestUrl] = useState(
    prefillSlug ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${prefillSlug}` : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  function extractBacktestSlug(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const pathMatch = trimmed.match(/\/r\/([a-z0-9]{4,16})(?:[/?#]|$)/i);
    if (pathMatch) return pathMatch[1];
    const queryMatch = trimmed.match(/[?&]id=([a-z0-9]{4,16})/i);
    if (queryMatch) return queryMatch[1];
    if (/^[a-z0-9]{4,16}$/i.test(trimmed)) return trimmed;
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError("제목은 2자 이상이어야 합니다");
      return;
    }
    if (body.trim().length < 2) {
      setError("본문을 입력해주세요");
      return;
    }

    let backtestSlug: string | null = null;
    if (backtestUrl.trim()) {
      backtestSlug = extractBacktestSlug(backtestUrl);
      if (!backtestSlug) {
        setError("백테스트 URL 형식이 올바르지 않습니다");
        return;
      }
    }

    setSubmitting(true);
    try {
      const slug = await createPost({ category, title, body, backtest_slug: backtestSlug });
      router.push(`/community/${slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "작성 실패");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) {
    return <main className="mx-auto max-w-2xl px-5 py-12 text-neutral-500">확인 중…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/community" className="text-sm text-neutral-500 hover:underline">
        ← 커뮤니티로
      </Link>
      <h1 className="mt-2 text-2xl font-bold">글쓰기</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">카테고리</span>
          <div className="mt-1 flex gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`rounded-full px-4 py-1.5 text-sm border ${
                  category === c.id
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium">제목</span>
          <input
            type="text"
            maxLength={200}
            required
            className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">본문</span>
          <textarea
            required
            rows={10}
            maxLength={20000}
            className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 font-[inherit]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">백테스트 결과 첨부 (선택)</span>
          <input
            type="text"
            placeholder="공유 URL 붙여넣기 (예: https://eloan.kr/r/abcd1234)"
            className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            value={backtestUrl}
            onChange={(e) => setBacktestUrl(e.target.value)}
          />
          <span className="mt-1 block text-xs text-neutral-500">
            백테스트 페이지에서 공유하기로 받은 링크를 붙여넣으면 글 하단에 결과 카드가 뜹니다.
          </span>
        </label>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-brand px-6 py-2.5 text-white font-semibold hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? "등록 중…" : "등록"}
          </button>
          <Link
            href="/community"
            className="rounded-full border border-neutral-300 dark:border-neutral-700 px-6 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            취소
          </Link>
        </div>
      </form>
    </main>
  );
}
