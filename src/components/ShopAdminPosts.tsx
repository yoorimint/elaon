"use client";

// 관리자 "초안" / "발행된 글" 탭: 글 목록과, 직접 쓴 글을 열어 고치는 편집기.
//  - 직접 쓴 글(붙여넣어 만든 글): 열기 → 편집기(사진 등록·링크 채우기·발행/내리기·삭제)
//  - 예전 AI 글: 목록에서 보기·링크 수정·발행/내리기만 (본문 편집은 안 됨). 초안이면 삭제도.

import { useCallback, useEffect, useState } from "react";
import { ShopManualEditor, draftFromPost, type SavedPostRef } from "@/components/ShopManualEditor";
import { ShopPostProductsEditor } from "@/components/ShopPostProductsEditor";
import { timeAgo } from "@/lib/community";
import { isManualPost, type ManualShopPost } from "@/lib/shop-post-types";
import {
  deletePost,
  getPostById,
  listAllPosts,
  notifySearchEngines,
  refreshShopPages,
  setPostStatus,
  type AdminPostRow,
} from "@/lib/shop-posts";

const BTN = "rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs font-semibold disabled:opacity-60";

export function ShopAdminPosts({
  status,
  openId,
  onOpen,
  notice,
  reloadKey,
}: {
  status: "draft" | "published";
  openId: string | null;
  onOpen: (id: string | null) => void;
  notice?: string | null;
  reloadKey?: number;
}) {
  const [posts, setPosts] = useState<AdminPostRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, [reload, reloadKey]);

  if (openId) {
    return <OpenPost id={openId} notice={notice} onClose={() => onOpen(null)} onChanged={reload} />;
  }

  const shown = (posts ?? []).filter((p) => (status === "published" ? p.status === "published" : p.status !== "published"));
  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">{status === "published" ? "발행된 글" : "초안"}</h2>
        <button onClick={reload} className={BTN}>
          새로고침
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">글 목록 불러오기 실패: {error}</p>}
      {posts && shown.length === 0 && !error ? (
        <div className="mt-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center text-sm text-neutral-500">
          {status === "published" ? "아직 발행된 글이 없어요." : "초안이 없어요. ✍️ 탭에서 글을 붙여넣어 만드세요."}
        </div>
      ) : (
        <ul className="mt-4 grid gap-2">
          {shown.map((p) => (
            <PostRow key={p.id} post={p} onOpen={() => onOpen(p.id)} onChanged={reload} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PostRow({ post: p, onOpen, onChanged }: { post: AdminPostRow; onOpen: () => void; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [editLinks, setEditLinks] = useState(false);
  const manual = p.kind === "manual";
  const published = p.status === "published";
  const needsLink = p.products.some((x) => !x.link?.trim());

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-neutral-500">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${
            manual ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          }`}
        >
          {manual ? "직접 쓴 글" : "AI 글"}
        </span>
        {needsLink && (
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">링크 필요</span>
        )}
        <span className="shrink-0">{timeAgo(published ? p.published_at ?? p.created_at : p.created_at)}</span>
        <span className="min-w-0 truncate">{p.products.map((x) => x.name).filter(Boolean).join(" · ")}</span>
      </div>
      <div className="mt-1 text-sm font-semibold">{p.title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {manual && (
          <button onClick={onOpen} className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">
            {published ? "수정" : "열기"}
          </button>
        )}
        <a href={`/shop/${p.slug}`} target="_blank" rel="noopener noreferrer" className={BTN}>
          {published ? "보기 ↗" : "미리보기 ↗"}
        </a>
        {!manual && (
          <button onClick={() => setEditLinks((v) => !v)} className={BTN}>
            링크 수정
          </button>
        )}
        {(published || !manual) && (
          <button
            disabled={busy || (!published && needsLink)}
            title={!published && needsLink ? "쿠팡 링크를 먼저 넣어야 발행할 수 있어요" : undefined}
            onClick={() => {
              if (published && !confirm("이 글을 내려서 초안으로 돌릴까요?")) return;
              run(async () => {
                await setPostStatus(p, published ? "draft" : "published");
                await refreshShopPages(p.slug);
                if (!published) void notifySearchEngines(p.slug);
              });
            }}
            className={published ? BTN : "rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"}
          >
            {published ? "내리기" : "발행"}
          </button>
        )}
        {!published && (
          <button
            disabled={busy}
            onClick={() => {
              if (confirm("이 글을 삭제할까요? 되돌릴 수 없습니다.")) run(() => deletePost(p.id));
            }}
            className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            삭제
          </button>
        )}
      </div>
      {editLinks && <ShopPostProductsEditor post={p} onSaved={onChanged} />}
    </li>
  );
}

function OpenPost({
  id,
  notice,
  onClose,
  onChanged,
}: {
  id: string;
  notice?: string | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [post, setPost] = useState<ManualShopPost | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPostById(id)
      .then((p) => {
        if (p && !isManualPost(p)) throw new Error("AI 글은 여기서 본문을 고칠 수 없어요");
        setPost(p as ManualShopPost | null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  const ref: SavedPostRef | null = post
    ? { id: post.id, slug: post.slug, status: post.status, published_at: post.published_at, created_at: post.created_at }
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onClose} className={BTN}>
          ← 목록으로
        </button>
        {post && <span className="min-w-0 truncate text-sm font-semibold">{post.title}</span>}
      </div>
      {notice && (
        <div className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">{notice}</div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {post === undefined && !error && <p className="text-sm text-neutral-500">불러오는 중…</p>}
      {post === null && <p className="text-sm text-red-600">글을 찾을 수 없어요 (삭제됐을 수 있어요)</p>}
      {post && ref && (
        <ShopManualEditor
          key={post.id}
          initial={draftFromPost(post)}
          post={ref}
          onChanged={() => void onChanged()}
          onDeleted={() => {
            void onChanged();
            onClose();
          }}
        />
      )}
    </div>
  );
}
