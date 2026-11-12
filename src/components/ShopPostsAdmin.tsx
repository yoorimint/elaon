"use client";

// 관리자 페이지: 자동 작성된 비교글 목록과 발행/비공개/삭제.

import { useCallback, useEffect, useState } from "react";
import { timeAgo } from "@/lib/community";
import { POST_WORKFLOW_URL } from "@/lib/shop-config";
import {
  deletePost,
  listAllPosts,
  notifySearchEngines,
  setPostStatus,
  type AdminPostRow,
} from "@/lib/shop-posts";

export function ShopPostsAdmin() {
  const [posts, setPosts] = useState<AdminPostRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setPosts(await listAllPosts());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    try {
      await action();
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "실패");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-bold">작성된 글 ({posts.length})</h2>
          <p className="mt-1 text-xs text-neutral-500">
            지금 글 쓰기 → Run workflow → 2~3분 뒤 새로고침. 위의 직접 입력 상품 2개로 작성합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reload}
            className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-xs font-semibold"
          >
            새로고침
          </button>
          <a
            href={POST_WORKFLOW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-xs font-semibold hover:opacity-90"
          >
            지금 글 쓰기 ↗
          </a>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">글 목록 불러오기 실패: {error}</p>}

      {posts.length === 0 && !error ? (
        <div className="mt-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center text-sm text-neutral-500">
          아직 작성된 글이 없습니다.
        </div>
      ) : (
        <ul className="mt-4 grid gap-2">
          {posts.map((p) => {
            const published = p.status === "published";
            const busy = busyId === p.id;
            return (
              <li key={p.id} className="min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
                <div className="flex min-w-0 items-center gap-2 text-xs text-neutral-500">
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-semibold ${
                      published
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {published ? "공개" : "초안"}
                  </span>
                  <span className="shrink-0 whitespace-nowrap">{timeAgo(p.created_at)}</span>
                  <span className="min-w-0 truncate">{p.products.map((x) => x.name).join(" vs ")}</span>
                </div>
                <div className="mt-1 font-semibold text-sm">{p.title}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href={`/shop/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs font-semibold"
                  >
                    {published ? "보기 ↗" : "미리보기 ↗"}
                  </a>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(p.id, async () => {
                        await setPostStatus(p, published ? "draft" : "published");
                        if (!published) void notifySearchEngines(p.slug);
                      })
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
                      published
                        ? "border border-neutral-300 dark:border-neutral-700"
                        : "bg-brand text-white hover:bg-brand-dark"
                    }`}
                  >
                    {published ? "비공개로" : "발행"}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (confirm("이 글을 삭제할까요? 되돌릴 수 없습니다.")) run(p.id, () => deletePost(p.id));
                    }}
                    className="rounded-full bg-red-600 text-white px-3 py-1 text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                  >
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
