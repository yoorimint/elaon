import { supabase } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Category = "free" | "strategy" | "question";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "free", label: "자유" },
  { id: "strategy", label: "전략공유" },
  { id: "question", label: "질문" },
];

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
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
  created_at: string;
  author_username?: string;
};

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

export function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return d.toLocaleDateString("ko-KR");
}
