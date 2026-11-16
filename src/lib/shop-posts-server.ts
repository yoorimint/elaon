// 서버 컴포넌트용 쇼핑 비교글 조회 (anon 키 → RLS 상 공개 글만 보임)

import { createServerClient } from "./supabase-server";
import type { RelatedPost, ShopPost } from "./shop-post-types";
import { fetchRelatedPosts } from "./shop-posts-public";

export async function getPublishedPost(slug: string): Promise<ShopPost | null> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("shop_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  // 글 화면은 하루 캐시라, DB 일시 오류를 "공개 글 없음(초안 화면)"으로 캐시하지 않게 오류로 던진다
  if (error) throw new Error(`쇼핑 글 조회 실패: ${error.message}`);
  return (data as ShopPost | null) ?? null;
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

// "함께 보면 좋은 글" — 본문은 src/lib/shop-posts-public.ts (초안 미리보기 화면도 같은 함수를 브라우저에서 씀)
export async function listRelatedPosts(
  category: string | undefined,
  excludeSlug: string,
  limit = 4,
): Promise<RelatedPost[]> {
  return fetchRelatedPosts(createServerClient(), category, excludeSlug, limit);
}
