// shop_posts 공개 조회 중 서버·브라우저 양쪽에서 쓰는 것 (anon 키로 되는 조회만 — Supabase 클라이언트를 받아서 쓴다).
// 서버: src/lib/shop-posts-server.ts, 브라우저: 초안 미리보기(src/app/shop/[slug]/ShopDraftPreview.tsx)
// 테이블 하나를 쇼핑·생활정보가 같이 쓰므로 목록 조회에는 언제나 섹션 조건(whereSection — src/lib/post-section.ts)을 건다.

import type { SupabaseClient } from "@supabase/supabase-js";
import { whereSection, type PostSection } from "./post-section";
import type { RelatedPost, ShopPost } from "./shop-post-types";

export type ShopPostListItem = Pick<ShopPost, "slug" | "title" | "description" | "published_at" | "products">;

// 공개 글 목록 (최신순, 그 섹션만)
export async function fetchPublishedPosts(sb: SupabaseClient, section: PostSection, limit = 100): Promise<ShopPostListItem[]> {
  const { data } = await whereSection(sb.from("shop_posts").select("slug,title,description,published_at,products").eq("status", "published"), section)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ShopPostListItem[];
}

// 사이트맵용 (주소·실제 수정 시각만)
export async function fetchPublishedSlugs(sb: SupabaseClient, section: PostSection, limit = 1000): Promise<{ slug: string; updated_at: string }[]> {
  const { data, error } = await whereSection(sb.from("shop_posts").select("slug,updated_at").eq("status", "published"), section)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`글 목록 조회 실패: ${error.message}`);
  return (data ?? []) as { slug: string; updated_at: string }[];
}

// 공개 글 한 건 (섹션 상관없이 — 화면이 inSection 으로 자기 섹션인지 확인한다: 다른 섹션 글이면 404)
export async function fetchPublishedBySlug(sb: SupabaseClient, slug: string): Promise<ShopPost | null> {
  const { data, error } = await sb.from("shop_posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  // 글 화면은 하루 캐시라, DB 일시 오류를 "공개 글 없음(초안 화면)"으로 캐시하지 않게 오류로 던진다
  if (error) throw new Error(`글 조회 실패: ${error.message}`);
  return (data as ShopPost | null) ?? null;
}

// 초안 포함 한 건 (주소를 아는 경우). RPC 가 없으면(SQL 미실행) null. 섹션은 부르는 쪽이 확인
export async function fetchPostBySlugAnyStatus(sb: SupabaseClient, slug: string): Promise<ShopPost | null> {
  const { data, error } = await sb.rpc("get_shop_post_by_slug", { p_slug: slug });
  if (error) return null;
  const rows = (data ?? []) as ShopPost[];
  return rows[0] ?? null;
}

// 섹션의 공개 글 (최신순, excludeSlug 는 뺌) — 관련 글 조회의 뼈대
function relatedQuery(sb: SupabaseClient, section: PostSection, excludeSlug: string, limit: number) {
  return whereSection(sb.from("shop_posts").select("slug,title,products").eq("status", "published").neq("slug", excludeSlug), section)
    .order("published_at", { ascending: false })
    .limit(limit);
}

// 같은 카테고리(노션 "카테고리" = content.category)의 공개 글만 (최신순). 카테고리가 없으면 빈 목록 — 다른 글로 채우지 않는다
export async function fetchSameCategoryPosts(
  sb: SupabaseClient,
  category: string | undefined,
  excludeSlug: string,
  limit: number,
  section: PostSection,
): Promise<RelatedPost[]> {
  if (!category) return [];
  return ((await relatedQuery(sb, section, excludeSlug, limit).eq("content->>category", category)).data ?? []) as RelatedPost[];
}

// "함께 보면 좋은 글": 우리가 이미 공개한 같은 섹션 글만. 같은 카테고리 우선, 모자라면 최신 글로 채움
export async function fetchRelatedPosts(
  sb: SupabaseClient,
  category: string | undefined,
  excludeSlug: string,
  limit = 4,
  section: PostSection = "shop",
): Promise<RelatedPost[]> {
  const out = await fetchSameCategoryPosts(sb, category, excludeSlug, limit, section);
  if (out.length < limit) {
    const recent = ((await relatedQuery(sb, section, excludeSlug, limit)).data ?? []) as RelatedPost[];
    for (const p of recent) {
      if (out.length >= limit) break;
      if (!out.some((x) => x.slug === p.slug)) out.push(p);
    }
  }
  return out;
}

// 생활정보 글 하단 "관련 구매 가이드" 바 (src/components/InfoShopGuideBar.tsx): 같은 카테고리의 공개 쇼핑 글 중 최신 1편.
// 같은 카테고리 쇼핑 글이 없거나 카테고리가 비어 있으면 null (바 없음 — 아무 쇼핑 글로 대신하지 않는다)
export async function fetchShopGuideForInfo(sb: SupabaseClient, category: string | undefined, infoSlug: string): Promise<RelatedPost | null> {
  const [guide] = await fetchSameCategoryPosts(sb, category?.trim() ? category : undefined, infoSlug, 1, "shop");
  return guide ?? null;
}
