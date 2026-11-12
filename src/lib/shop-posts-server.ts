// 서버 컴포넌트용 쇼핑 비교글 조회 (anon 키 → RLS 상 공개 글만 보임)

import { createServerClient } from "./supabase-server";
import type { ShopPost } from "./shop-post-types";

export async function getPublishedPost(slug: string): Promise<ShopPost | null> {
  const sb = createServerClient();
  const { data } = await sb
    .from("shop_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as ShopPost | null) ?? null;
}

// 초안 포함 한 건 (주소를 아는 경우). RPC 가 없으면(SQL 미실행) null
export async function getPostBySlugAnyStatus(slug: string): Promise<ShopPost | null> {
  const sb = createServerClient();
  const { data, error } = await sb.rpc("get_shop_post_by_slug", { p_slug: slug });
  if (error) return null;
  const rows = (data ?? []) as ShopPost[];
  return rows[0] ?? null;
}

export type ShopPostListItem = Pick<ShopPost, "slug" | "title" | "description" | "published_at" | "products">;

export async function listPublishedPosts(limit = 100): Promise<ShopPostListItem[]> {
  const sb = createServerClient();
  const { data } = await sb
    .from("shop_posts")
    .select("slug,title,description,published_at,products")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ShopPostListItem[];
}
