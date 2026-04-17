"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { BacktestPreviewCard } from "@/components/BacktestPreviewCard";
import {
  categoryLabel,
  createComment,
  deleteComment,
  deletePost,
  getPost,
  incrementPostView,
  isLiked,
  likePost,
  listComments,
  timeAgo,
  unlikePost,
  type Comment,
  type Post,
} from "@/lib/community";

export default function PostDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([getPost(slug), null])
      .then(async ([p]) => {
        if (!p) {
          setError("글을 찾을 수 없습니다");
          return;
        }
        setPost(p);
        const cs = await listComments(p.id);
        setComments(cs);
        incrementPostView(slug).catch(() => {});
        if (user) {
          isLiked(p.id, user.id).then(setLiked);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"))
      .finally(() => setLoading(false));
  }, [slug, user]);

  async function onToggleLike() {
    if (!post) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    const was = liked;
    setLiked(!was);
    setPost({ ...post, like_count: post.like_count + (was ? -1 : 1) });
    try {
      if (was) await unlikePost(post.id);
      else await likePost(post.id);
    } catch {
      setLiked(was);
      setPost((prev) =>
        prev ? { ...prev, like_count: prev.like_count + (was ? 1 : -1) } : prev,
      );
    } finally {
      setLikeBusy(false);
    }
  }

  async function onSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!post || !newComment.trim()) return;
    if (!user) {
      router.push("/login");
      return;
    }
    setCommentSubmitting(true);
    try {
      const c = await createComment(post.id, newComment.trim());
      setComments((prev) => [...prev, c]);
      setNewComment("");
      setPost({ ...post, comment_count: post.comment_count + 1 });
    } catch (e) {
      alert(e instanceof Error ? e.message : "댓글 등록 실패");
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function onDeleteComment(id: string) {
    if (!confirm("댓글을 삭제하시겠어요?")) return;
    try {
      await deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      if (post) setPost({ ...post, comment_count: Math.max(0, post.comment_count - 1) });
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  async function onDeletePost() {
    if (!post) return;
    if (!confirm("이 글을 삭제하시겠어요?")) return;
    try {
      await deletePost(post.id);
      router.push("/community");
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-3xl px-5 py-8 text-neutral-500">불러오는 중…</main>;
  }
  if (error || !post) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-8">
        <Link href="/community" className="text-sm text-neutral-500 hover:underline">
          ← 커뮤니티로
        </Link>
        <div className="mt-4 text-red-600">{error ?? "알 수 없는 오류"}</div>
      </main>
    );
  }

  const isAuthor = user?.id === post.author_id;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <Link href="/community" className="text-sm text-neutral-500 hover:underline">
        ← 커뮤니티로
      </Link>

      <article className="mt-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
            {categoryLabel(post.category)}
          </span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">{post.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <span>{post.author_username ?? "익명"}</span>
          <span>·</span>
          <span>{timeAgo(post.created_at)}</span>
          <span>·</span>
          <span>조회 {post.view_count + 1}</span>
          <span>·</span>
          <span>댓글 {post.comment_count}</span>
          {isAuthor && (
            <>
              <span className="ml-auto" />
              <button
                onClick={onDeletePost}
                className="text-xs text-red-500 hover:underline"
              >
                삭제
              </button>
            </>
          )}
        </div>

        <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed">
          {post.body}
        </div>

        {post.backtest_slug && <BacktestPreviewCard slug={post.backtest_slug} />}

        <div className="mt-6 flex justify-center">
          <button
            onClick={onToggleLike}
            disabled={likeBusy}
            className={`flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition ${
              liked
                ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40"
                : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            <span>{liked ? "♥" : "♡"}</span>
            <span>좋아요 {post.like_count}</span>
          </button>
        </div>
      </article>

      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-3">댓글 {comments.length}</h2>

        <form onSubmit={onSubmitComment} className="mb-6">
          <textarea
            rows={3}
            placeholder={user ? "댓글을 남겨주세요" : "댓글을 쓰려면 로그인하세요"}
            disabled={!user || commentSubmitting}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 disabled:opacity-60"
          />
          <div className="mt-2 flex justify-end">
            {!user ? (
              <Link
                href="/login"
                className="rounded-full bg-brand text-white px-5 py-2 text-sm font-semibold hover:bg-brand-dark"
              >
                로그인하고 댓글
              </Link>
            ) : (
              <button
                type="submit"
                disabled={commentSubmitting || !newComment.trim()}
                className="rounded-full bg-brand px-5 py-2 text-white text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
              >
                {commentSubmitting ? "등록 중…" : "댓글 등록"}
              </button>
            )}
          </div>
        </form>

        {comments.length === 0 ? (
          <div className="text-neutral-500 text-sm py-4">첫 댓글을 남겨주세요.</div>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3"
              >
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {c.author_username ?? "익명"}
                  </span>
                  <span>·</span>
                  <span>{timeAgo(c.created_at)}</span>
                  {user?.id === c.author_id && (
                    <button
                      onClick={() => onDeleteComment(c.id)}
                      className="ml-auto text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-[14px]">{c.body}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
