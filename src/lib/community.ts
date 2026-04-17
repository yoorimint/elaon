import { supabase } from "./supabase";

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

type PostRow = Omit<Post, "author_username"> & {
  profiles: { username: string } | null;
};

export async function listPosts(opts: { category?: Category; limit?: number } = {}): Promise<Post[]> {
  let q = supabase
    .from("posts")
    .select("*, profiles(username)")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.category) q = q.eq("category", opts.category);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as PostRow[]).map((p) => ({
    ...p,
    author_username: p.profiles?.username,
  }));
}

export async function getPost(slug: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles(username)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as PostRow;
  return { ...row, author_username: row.profiles?.username };
}

export async function createPost(input: {
  category: Category;
  title: string;
  body: string;
  backtest_slug?: string | null;
}): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("로그인이 필요합니다");

  const slug = randomSlug();
  const { error } = await supabase.from("posts").insert({
    slug,
    author_id: userData.user.id,
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

type CommentRow = Omit<Comment, "author_username"> & {
  profiles: { username: string } | null;
};

export async function listComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles(username)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as CommentRow[]).map((c) => ({
    ...c,
    author_username: c.profiles?.username,
  }));
}

export async function createComment(postId: string, body: string): Promise<Comment> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("로그인이 필요합니다");

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: userData.user.id, body })
    .select("*, profiles(username)")
    .single();
  if (error) throw new Error(error.message);
  const row = data as CommentRow;
  return { ...row, author_username: row.profiles?.username };
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from("comments").delete().eq("id", id);
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
