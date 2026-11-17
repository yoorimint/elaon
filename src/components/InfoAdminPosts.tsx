"use client";

// 관리자 "📰 생활정보 글" 탭: 공개된 생활정보 글(/info) 목록과 글마다 "조회 오늘 n · 7일 n · 전체 n".
// 보기 전용 — 생활정보 글은 노션 "일반 글"에서만 고친다 (사이트 편집기 없음).
// 조회수는 쇼핑 "발행된 글" 탭과 같은 집계 RPC 하나(getShopViewStats — 글 id 기준이라 섹션 상관없음)와
// 같은 조작 칸(ViewControls: 이 기기 제외·정렬·SQL 실행 전 "조회수 준비 중")을 쓴다.

import { useCallback, useEffect, useState } from "react";
import { ViewControls, ViewsLine } from "@/components/ShopAdminPosts";
import { sectionPostPath } from "@/lib/post-section";
import { listPublishedInfoPosts } from "@/lib/shop-posts";
import type { SectionAdminRow } from "@/lib/shop-posts-public";
import { kstDay, sortByViews, statsFor, type PostViewStats, type ViewSort } from "@/lib/shop-views";
import { getShopViewStats } from "@/lib/shop-views-client";

const BTN = "rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs font-semibold disabled:opacity-60";

export function InfoAdminPosts() {
  const [posts, setPosts] = useState<SectionAdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 조회수: undefined = 불러오는 중, null = 준비 중(SQL 실행 전·실패)
  const [views, setViews] = useState<Map<string, PostViewStats> | null | undefined>(undefined);
  const [sort, setSort] = useState<ViewSort>("latest");

  const reload = useCallback(async () => {
    void getShopViewStats().then(setViews);
    try {
      setPosts(await listPublishedInfoPosts());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const shown = sortByViews(posts ?? [], views ?? null, sort);
  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">생활정보 글</h2>
        <button onClick={reload} className={BTN}>
          새로고침
        </button>
      </div>
      <p className="mt-1 text-xs text-neutral-500">공개된 생활정보 글만 보여요. 글은 노션 &lsquo;일반 글&rsquo;에서 고치세요.</p>
      <ViewControls views={views} sort={sort} onSort={setSort} />
      {error && <p className="mt-3 text-sm text-red-600">글 목록 불러오기 실패: {error}</p>}
      {posts && shown.length === 0 && !error ? (
        <div className="mt-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center text-sm text-neutral-500">
          아직 공개된 생활정보 글이 없어요.
        </div>
      ) : (
        <ul className="mt-4 grid gap-2">
          {shown.map((p) => (
            <li key={p.id} className="min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              <div className="text-xs text-neutral-500">발행 {kstDay(new Date(p.published_at ?? p.created_at))}</div>
              <a
                href={sectionPostPath("info", p.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-sm font-semibold hover:underline"
              >
                {p.title} ↗
              </a>
              <ViewsLine views={statsFor(views, p.id)} />
              {p.notion_url && (
                <a href={p.notion_url} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-block ${BTN}`}>
                  노션에서 고치기 ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
