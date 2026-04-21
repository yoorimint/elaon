import { supabase } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Category = "free" | "strategy" | "question" | "bot";

// 유저가 글쓰기 폼에서 선택 가능한 카테고리 (bot 제외)
export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "free", label: "자유" },
  { id: "strategy", label: "전략공유" },
  { id: "question", label: "질문" },
];

// 커뮤니티 목록 페이지의 필터 버튼용 — bot 카테고리도 노출해서 유저가
// 봇 글만 모아볼 수 있게 한다.
export const FILTER_CATEGORIES: { id: Category; label: string }[] = [
  ...CATEGORIES,
  { id: "bot", label: "봇 분석" },
];

// 표시용 라벨 — bot 포함 전체
const CATEGORY_LABELS: Record<Category, string> = {
  free: "자유",
  strategy: "전략공유",
  question: "질문",
  bot: "봇 분석",
};

export function categoryLabel(id: string) {
  return CATEGORY_LABELS[id as Category] ?? id;
}

export type Post = {
  id: string;
  slug: string;
  author_id: string;
  category: Category;
  title: string;
  body: string;
  backtest_slug: string | null;
  view_count: number;
  comment_count: number;
  like_count: number;
  report_count: number;
  blinded: boolean;
  created_at: string;
  author_username?: string;
};

export type ReportReason = "ad" | "obscene" | "abuse" | "spam" | "other";

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "ad", label: "광고" },
  { id: "obscene", label: "음란물" },
  { id: "abuse", label: "욕설·비방" },
  { id: "spam", label: "스팸" },
  { id: "other", label: "기타" },
];

export function reportReasonLabel(id: ReportReason): string {
  return REPORT_REASONS.find((r) => r.id === id)?.label ?? id;
}

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_username?: string;
};

const SLUG_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
export function randomSlug(len = 8) {
  let out = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += SLUG_CHARS[buf[i] % SLUG_CHARS.length];
  return out;
}

// posts/comments는 author_id가 auth.users(id)를 참조하지만 profiles도
// auth.users(id)를 참조해서 PostgREST 임베드(`profiles(...)`)가 모호 관계
// 오류를 냄. 항상 두 쿼리로 나눠 코드에서 author_username을 붙인다.
export async function fetchUsernameMap(
  client: SupabaseClient,
  authorIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = Array.from(new Set(authorIds.filter(Boolean)));
  if (ids.length === 0) return map;
  const { data, error } = await client
    .from("profiles")
    .select("user_id, username")
    .in("user_id", ids);
  if (error) return map;
  for (const p of (data ?? []) as { user_id: string; username: string }[]) {
    map.set(p.user_id, p.username);
  }
  return map;
}

export async function listPosts(
  opts: { category?: Category; limit?: number; sort?: "new" | "hot" } = {},
): Promise<Post[]> {
  let q = supabase.from("posts").select("*").limit(opts.limit ?? 50);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.sort === "hot") {
    q = q.order("like_count", { ascending: false }).order("created_at", { ascending: false });
  } else {
    q = q.order("created_at", { ascending: false });
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Omit<Post, "author_username">[];
  const usernames = await fetchUsernameMap(
    supabase,
    rows.map((r) => r.author_id),
  );
  return rows.map((r) => ({ ...r, author_username: usernames.get(r.author_id) }));
}

export async function getPost(slug: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Omit<Post, "author_username">;
  const usernames = await fetchUsernameMap(supabase, [row.author_id]);
  return { ...row, author_username: usernames.get(row.author_id) };
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error("로그인이 필요합니다");
  return uid;
}

export async function createPost(input: {
  category: Category;
  title: string;
  body: string;
  backtest_slug?: string | null;
}): Promise<string> {
  const uid = await requireUserId();

  const slug = randomSlug();
  const { error } = await supabase.from("posts").insert({
    slug,
    author_id: uid,
    category: input.category,
    title: input.title.trim(),
    body: input.body,
    backtest_slug: input.backtest_slug || null,
  });
  if (error) throw new Error(error.message);
  return slug;
}

export async function deletePost(id: string) {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function incrementPostView(slug: string) {
  await supabase.rpc("increment_post_view", { p_slug: slug });
}

export async function listComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Omit<Comment, "author_username">[];
  const usernames = await fetchUsernameMap(
    supabase,
    rows.map((r) => r.author_id),
  );
  return rows.map((r) => ({ ...r, author_username: usernames.get(r.author_id) }));
}

export async function createComment(postId: string, body: string): Promise<Comment> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: uid, body })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const row = data as Omit<Comment, "author_username">;
  const usernames = await fetchUsernameMap(supabase, [row.author_id]);
  return { ...row, author_username: usernames.get(row.author_id) };
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function isLiked(postId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function likePost(postId: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase
    .from("post_likes")
    .insert({ post_id: postId, user_id: uid });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
}

export async function unlikePost(postId: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", uid);
  if (error) throw new Error(error.message);
}

// ===== 신고하기 =====
// 한 유저당 한 글에 1회만 신고 가능. 10회 누적 시 서버 트리거가
// posts.blinded 를 true 로 바꿔 자동 블라인드한다.

export async function hasReported(postId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("post_reports")
    .select("post_id")
    .eq("post_id", postId)
    .eq("reporter_id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function reportPost(
  postId: string,
  reason: ReportReason,
  note?: string,
): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from("post_reports").insert({
    post_id: postId,
    reporter_id: uid,
    reason,
    note: note?.trim() || null,
  });
  if (error) {
    if (error.message.includes("duplicate")) {
      throw new Error("이미 신고한 게시글입니다.");
    }
    throw new Error(error.message);
  }
}

// ===== 관리자 =====

export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return Boolean(data);
}

export type ReportedPost = Post & {
  reports: { reason: ReportReason; count: number }[];
};

export async function listReportedPosts(): Promise<ReportedPost[]> {
  // 신고가 1건 이상 있는 글을 최근 신고 순으로. 블라인드 여부와 무관하게 전부.
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .gt("report_count", 0)
    .order("blinded", { ascending: false })
    .order("report_count", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const postRows = (posts ?? []) as Post[];
  if (postRows.length === 0) return [];
  // 신고 사유별 카운트를 따로 조회
  const ids = postRows.map((p) => p.id);
  const { data: reports } = await supabase
    .from("post_reports")
    .select("post_id, reason")
    .in("post_id", ids);
  const grouped = new Map<string, Map<ReportReason, number>>();
  for (const r of (reports ?? []) as { post_id: string; reason: ReportReason }[]) {
    if (!grouped.has(r.post_id)) grouped.set(r.post_id, new Map());
    const m = grouped.get(r.post_id)!;
    m.set(r.reason, (m.get(r.reason) ?? 0) + 1);
  }
  return postRows.map((p) => {
    const m = grouped.get(p.id) ?? new Map<ReportReason, number>();
    return {
      ...p,
      reports: Array.from(m.entries()).map(([reason, count]) => ({ reason, count })),
    };
  });
}

export async function adminUnblindPost(postId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_unblind_post", { p_post_id: postId });
  if (error) throw new Error(error.message);
}

export async function adminDeletePost(postId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_post", { p_post_id: postId });
  if (error) throw new Error(error.message);
}

export function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  // 서버(UTC)에서 렌더되는 호출부가 있어 반드시 KST 로 고정.
  return d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

// ===== 어드민: 통계 =====

export type SiteStats = {
  today_visits: number;
  today_uniques: number;
  yesterday_uniques: number;
  week_uniques: number;
  today_signups: number;
  today_posts: number;
  today_comments: number;
  today_reports: number;
  total_users: number;
  banned_users: number;
  blinded_posts: number;
  open_suggestions: number;
};

export async function getSiteStats(): Promise<SiteStats | null> {
  const { data, error } = await supabase.rpc("admin_site_stats");
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  // Postgres 가 bigint 를 string 으로 줄 수도 있어서 숫자 변환.
  const num = (v: unknown) => (v == null ? 0 : Number(v));
  return {
    today_visits: num(row.today_visits),
    today_uniques: num(row.today_uniques),
    yesterday_uniques: num(row.yesterday_uniques),
    week_uniques: num(row.week_uniques),
    today_signups: num(row.today_signups),
    today_posts: num(row.today_posts),
    today_comments: num(row.today_comments),
    today_reports: num(row.today_reports),
    total_users: num(row.total_users),
    banned_users: num(row.banned_users),
    blinded_posts: num(row.blinded_posts),
    open_suggestions: num(row.open_suggestions),
  };
}

export type VisitTrendRow = {
  date: string;
  uniques: number;
  views: number;
};

export async function getVisitsTrend(): Promise<VisitTrendRow[]> {
  const { data, error } = await supabase.rpc("admin_visits_trend");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{
    visited_date: string;
    uniques: number | string;
    views: number | string;
  }>;
  return rows.map((r) => ({
    date: r.visited_date,
    uniques: Number(r.uniques),
    views: Number(r.views),
  }));
}

// ===== 어드민: 회원 목록 + 제재 =====

export type AdminUser = {
  user_id: string;
  email: string;
  username: string | null;
  created_at: string;
  is_admin: boolean;
  banned: boolean;
  banned_reason: string | null;
  banned_at: string | null;
  post_count: number;
  comment_count: number;
};

export async function listAllUsers(limit = 200): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_list_users", { p_limit: limit });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    user_id: String(r.user_id),
    email: String(r.email ?? ""),
    username: (r.username as string) ?? null,
    created_at: String(r.created_at),
    is_admin: Boolean(r.is_admin),
    banned: Boolean(r.banned),
    banned_reason: (r.banned_reason as string) ?? null,
    banned_at: (r.banned_at as string) ?? null,
    post_count: Number(r.post_count ?? 0),
    comment_count: Number(r.comment_count ?? 0),
  }));
}

export async function banUser(userId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc("admin_ban_user", {
    p_user_id: userId,
    p_reason: reason?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function unbanUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_unban_user", { p_user_id: userId });
  if (error) throw new Error(error.message);
}

// ===== 공개 방문자 카운터 =====
// anon 권한으로 호출 가능. 오늘 유니크 + 누적 유니크만 반환한다.

export type VisitCounters = {
  today: number;
  total: number;
};

export async function getVisitCounters(): Promise<VisitCounters> {
  const { data, error } = await supabase.rpc("get_visit_counters");
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    today: Number(row?.today_uniques ?? 0),
    total: Number(row?.total_uniques ?? 0),
  };
}
