"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FILTER_CATEGORIES,
  categoryLabel,
  listPosts,
  timeAgo,
  type Category,
  type Post,
} from "@/lib/community";
import { useAuth } from "@/components/AuthProvider";

function CommunityList() {
  const router = useRouter();
  const params = useSearchParams();
  const catParam = params.get("c") as Category | null;
  const sortParam = (params.get("sort") === "hot" ? "hot" : "new") as "new" | "hot";
  const { user } = useAuth();
  const [category, setCategory] = useState<Category | null>(catParam);
  const [sort, setSort] = useState<"new" | "hot">(sortParam);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listPosts({ category: category ?? undefined, sort })
      .then(setPosts)
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"))
      .finally(() => setLoading(false));
  }, [category, sort]);

  function onWrite() {
    if (!user) {
      router.push("/login");
      return;
    }
    router.push("/community/new");
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">커뮤니티</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!user) {
                router.push("/login?redirect=/suggest");
                return;
              }
              router.push("/suggest");
            }}
            className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            건의하기
          </button>
          <button
            onClick={onWrite}
            className="rounded-full bg-brand px-5 py-2 text-white font-semibold text-sm hover:bg-brand-dark"
          >
            글쓰기
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory(null)}
            className={`rounded-full px-3 py-1 text-xs sm:text-sm border whitespace-nowrap ${
              category === null
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            전체
          </button>
          {FILTER_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-full px-3 py-1 text-xs sm:text-sm border whitespace-nowrap ${
                category === c.id
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1 text-sm">
          <button
            onClick={() => setSort("new")}
            className={`px-3 py-1 rounded ${
              sort === "new"
                ? "font-semibold text-neutral-900 dark:text-white"
                : "text-neutral-500"
            }`}
          >
            최신
          </button>
          <button
            onClick={() => setSort("hot")}
            className={`px-3 py-1 rounded ${
              sort === "hot"
                ? "font-semibold text-neutral-900 dark:text-white"
                : "text-neutral-500"
            }`}
          >
            인기
          </button>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="text-neutral-500 text-sm">불러오는 중…</div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : posts.length === 0 ? (
          <div className="text-neutral-500 text-sm py-12 text-center">
            아직 글이 없습니다. 첫 글을 남겨주세요.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-b border-neutral-200 dark:border-neutral-800">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/community/${p.slug}`}
                  className="flex items-start gap-3 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 px-2 -mx-2 rounded"
                >
                  <span className="shrink-0 mt-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs px-2 py-0.5">
                    {categoryLabel(p.category)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {p.blinded ? (
                        <span className="text-neutral-400 italic">
                          ⚑ 신고 누적으로 블라인드 처리된 글
                        </span>
                      ) : (
                        <>
                          {p.title}
                          {p.comment_count > 0 && (
                            <span className="ml-2 text-brand text-sm">
                              [{p.comment_count}]
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 flex gap-2 flex-wrap">
                      <span>{p.author_username ?? "익명"}</span>
                      <span>·</span>
                      <span>{timeAgo(p.created_at)}</span>
                      <span>·</span>
                      <span>조회 {p.view_count}</span>
                      {p.like_count > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-red-500">♥ {p.like_count}</span>
                        </>
                      )}
                      {p.backtest_slug && (
                        <>
                          <span>·</span>
                          <span className="text-brand">백테스트 첨부</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-5 py-8 text-neutral-500">불러오는 중…</div>}>
      <CommunityList />
    </Suspense>
  );
}
