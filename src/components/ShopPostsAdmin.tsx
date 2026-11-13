"use client";

// 관리자 페이지: 자동 작성된 비교글 목록과 발행/비공개/삭제.

import { useCallback, useEffect, useState } from "react";
import { ShopPostProductsEditor } from "@/components/ShopPostProductsEditor";
import { timeAgo } from "@/lib/community";
import { POST_WORKFLOW_URL } from "@/lib/shop-config";
import type { ShopPostQa, ShopPostRunInfo } from "@/lib/shop-post-types";
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
  const [editingId, setEditingId] = useState<string | null>(null);

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
            // 자동 선정 글은 쿠팡 링크가 비어 있음 → 링크를 넣어야 발행 가능
            const needsLink = p.products.some((x) => !x.link?.trim());
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
                  <QaBadge qa={p.qa} />
                  {needsLink && (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                      링크 필요
                    </span>
                  )}
                  <span className="shrink-0 whitespace-nowrap">{timeAgo(p.created_at)}</span>
                  <span className="min-w-0 truncate">{p.products.map((x) => x.name).join(" vs ")}</span>
                </div>
                <div className="mt-1 font-semibold text-sm">{p.title}</div>
                <RunInfo run={p.run} />
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
                    disabled={busy || (!published && needsLink)}
                    title={!published && needsLink ? "쿠팡 링크를 먼저 넣어야 발행할 수 있어요" : undefined}
                    onClick={() => {
                      // 검수를 통과하지 못한 글은 발행 전에 남은 문제를 보여주고 확인
                      const st = qaState(p.qa);
                      if (!published && st && !st.ok && !confirm(`${st.label}\n\n${st.detail}\n\n그래도 발행할까요?`)) return;
                      run(p.id, async () => {
                        await setPostStatus(p, published ? "draft" : "published");
                        if (!published) void notifySearchEngines(p.slug);
                      });
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
                      published
                        ? "border border-neutral-300 dark:border-neutral-700"
                        : "bg-brand text-white hover:bg-brand-dark"
                    }`}
                  >
                    {published ? "비공개로" : "발행"}
                  </button>
                  <button
                    onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                    className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs font-semibold"
                  >
                    {needsLink ? "🔗 링크 넣기" : "링크 수정"}
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
                {editingId === p.id && (
                  <ShopPostProductsEditor
                    key={p.id}
                    post={p}
                    onSaved={reload}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// 자동 검수 결과: 통과 / 문제 남음 / AI 검수 못함
function qaState(qa?: ShopPostQa | null): { label: string; ok: boolean; detail: string } | null {
  if (!qa) return null;
  const left = qa.remaining.length;
  if (left) return { label: `검수 문제 ${left}`, ok: false, detail: qa.remaining.join("\n") };
  if (qa.aiChecked === false) {
    return { label: "AI 검수 못함", ok: false, detail: "AI 모델이 막혀 규칙 검사만 했어요. 미리보기에서 내용을 직접 확인하세요." };
  }
  const notes = qa.notes ?? [];
  return {
    label: notes.length ? `검수 통과 (참고 ${notes.length})` : "검수 통과",
    ok: true,
    detail: [`처음 ${qa.issuesFound}개 발견 → 자동 수정 완료`, ...notes].join("\n"),
  };
}

// 마우스를 올리면(휴대폰은 길게 누르면) 남은 문제 목록
function QaBadge({ qa }: { qa?: ShopPostQa | null }) {
  const st = qaState(qa);
  if (!st) return null;
  return (
    <span
      title={st.detail}
      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-semibold ${
        st.ok
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      {st.label}
    </span>
  );
}

// 작성 실행 리포트: 쓴 AI·비용·상품 선정 근거 (원화는 1달러 1,400원 기준 대략치)
const KRW_PER_USD = 1400;
function RunInfo({ run }: { run?: ShopPostRunInfo | null }) {
  if (!run) return null;
  const models = Object.entries(run.calls)
    .map(([m, n]) => `${m.replace(/^claude-|^gemini-/, "")} ${n}회`)
    .join(" · ");
  const won = Math.round(run.costUsd * KRW_PER_USD);
  const reviews = run.realReviews
    ? Object.entries(run.realReviews)
        .map(([name, n]) => `${name} ${n}건`)
        .join(", ")
    : "";
  return (
    <div className="mt-1 text-[11px] leading-relaxed text-neutral-500">
      AI 비용 {won > 0 ? `약 ${won}원` : "무료"} ({models || "기록 없음"})
      {reviews && <> · 실사용 후기 {reviews}</>}
    </div>
  );
}
