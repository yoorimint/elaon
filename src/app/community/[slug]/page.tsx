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
  hasReported,
  incrementPostView,
  isAdmin,
  isLiked,
  likePost,
  listComments,
  REPORT_REASONS,
  reportPost,
  timeAgo,
  unlikePost,
  type Comment,
  type Post,
  type ReportReason,
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
  // 신고 관련 상태
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("ad");
  const [reportNote, setReportNote] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  // 본인이 관리자면 블라인드된 본문도 볼 수 있게 토글
  const [admin, setAdmin] = useState(false);
  const [revealBlinded, setRevealBlinded] = useState(false);

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
          hasReported(p.id, user.id).then(setAlreadyReported);
          isAdmin().then(setAdmin);
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

  function onOpenReport() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (alreadyReported) {
      alert("이미 신고한 게시글입니다.");
      return;
    }
    setReportReason("ad");
    setReportNote("");
    setReportOpen(true);
  }

  async function onSubmitReport() {
    if (!post) return;
    if (reportBusy) return;
    setReportBusy(true);
    try {
      await reportPost(post.id, reportReason, reportNote);
      setAlreadyReported(true);
      // 카운터 낙관적 업데이트. 10회 달성 시 서버 트리거가 blinded=true 세팅,
      // 다음 조회 때 반영된다.
      setPost({
        ...post,
        report_count: post.report_count + 1,
        blinded: post.report_count + 1 >= 10 ? true : post.blinded,
      });
      setReportOpen(false);
      alert("신고가 접수되었습니다. 검토 후 처리됩니다.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "신고 실패");
    } finally {
      setReportBusy(false);
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

        {post.blinded && !revealBlinded ? (
          <div className="mt-6 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-5 text-sm text-amber-800 dark:text-amber-200">
            <div className="font-semibold">신고 누적으로 블라인드 처리된 글입니다</div>
            <p className="mt-1 text-xs opacity-80">
              검토 후 삭제되거나 복원됩니다. 누적 신고 {post.report_count}회.
            </p>
            {admin && (
              <button
                type="button"
                onClick={() => setRevealBlinded(true)}
                className="mt-3 rounded-full border border-amber-400 bg-white/60 dark:bg-neutral-900/60 px-3 py-1.5 text-xs font-semibold hover:bg-white"
              >
                관리자 권한으로 본문 보기
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed">
              {post.body}
            </div>
            {post.backtest_slug && <BacktestPreviewCard slug={post.backtest_slug} />}
          </>
        )}

        {/* 봇 카테고리 글은 좋아요/신고 버튼 숨김 (댓글만 허용) */}
        {post.category !== "bot" && (
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onToggleLike}
            disabled={likeBusy}
            className={`flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
              liked
                ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40"
                : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            <span>{liked ? "♥" : "♡"}</span>
            <span>좋아요 {post.like_count}</span>
          </button>
          <button
            onClick={onOpenReport}
            disabled={alreadyReported}
            className={`flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
              alreadyReported
                ? "border-neutral-300 dark:border-neutral-700 text-neutral-400"
                : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            <span>⚑</span>
            <span>{alreadyReported ? "신고됨" : "신고하기"}</span>
            {post.report_count > 0 && (
              <span className="text-xs text-neutral-500">({post.report_count})</span>
            )}
          </button>
        </div>
        )}
        {post.category === "bot" && (
          <div className="mt-6 rounded-xl bg-brand/5 border border-brand/20 p-3 text-xs text-neutral-600 dark:text-neutral-300">
            🤖 이 글은 자동 생성된 전략 분석입니다. 좋아요·신고는 비활성, 댓글만 가능합니다.
            수치는 실제 백테스트 결과이며 투자 권유가 아닙니다.
          </div>
        )}
      </article>

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !reportBusy && setReportOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold">신고 사유 선택</h3>
            <p className="mt-1 text-xs text-neutral-500">
              신고는 1회만 가능하며 10회 누적되면 자동 블라인드 처리됩니다.
            </p>
            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                    reportReason === r.id
                      ? "border-brand bg-brand/5"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={r.id}
                    checked={reportReason === r.id}
                    onChange={() => setReportReason(r.id)}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm">
              <span className="text-xs text-neutral-500">추가 설명 (선택)</span>
              <textarea
                rows={2}
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value.slice(0, 500))}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
                placeholder="어떤 점이 문제인지 간단히 적어주세요."
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={reportBusy}
                onClick={() => setReportOpen(false)}
                className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm"
              >
                취소
              </button>
              <button
                type="button"
                disabled={reportBusy}
                onClick={onSubmitReport}
                className="rounded-full bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {reportBusy ? "접수 중…" : "신고 제출"}
              </button>
            </div>
          </div>
        </div>
      )}

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
