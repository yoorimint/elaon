// 서버 컴포넌트용 공개 글 조회 (anon 키 → RLS 상 공개 글만 보임). 본문은 src/lib/shop-posts-public.ts (클라이언트를 받는 함수)
// 섹션(쇼핑 /shop · 생활정보 /info)은 src/lib/post-section.ts — 섹션을 안 주면 쇼핑 (예전 호출 그대로)

import { createServerClient } from "./supabase-server";
import { inSection, type PostSection } from "./post-section";
import type { RelatedPost, ShopPost } from "./shop-post-types";
import { fetchPublishedBySlug, fetchPublishedPosts, fetchRelatedPosts, type ShopPostListItem } from "./shop-posts-public";

export type { ShopPostListItem };

export type PublishedLookup =
  | { post: ShopPost; otherSection?: undefined }
  | { post: null; otherSection: boolean }; // otherSection = 공개 글이지만 다른 섹션 글 (그 주소로는 404)

// 이 섹션의 공개 글 한 건. 같은 slug 가 다른 섹션 글이면 otherSection (화면은 notFound — /shop/<생활정보 글> 은 열리지 않게)
export async function lookupPublishedPost(slug: string, section: PostSection): Promise<PublishedLookup> {
  const post = await fetchPublishedBySlug(createServerClient(), slug);
  if (!post) return { post: null, otherSection: false };
  return inSection(post.content, section) ? { post } : { post: null, otherSection: true };
}

export async function getPublishedPost(slug: string, section: PostSection = "shop"): Promise<ShopPost | null> {
  return (await lookupPublishedPost(slug, section)).post;
}

export async function listPublishedPosts(limit = 100, section: PostSection = "shop"): Promise<ShopPostListItem[]> {
  return fetchPublishedPosts(createServerClient(), section, limit);
}

// "함께 보면 좋은 글" — 본문은 src/lib/shop-posts-public.ts (초안 미리보기 화면도 같은 함수를 브라우저에서 씀)
export async function listRelatedPosts(
  category: string | undefined,
  excludeSlug: string,
  limit = 4,
  section: PostSection = "shop",
): Promise<RelatedPost[]> {
  return fetchRelatedPosts(createServerClient(), category, excludeSlug, limit, section);
}
