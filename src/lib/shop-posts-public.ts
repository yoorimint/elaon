// 쇼핑 비교글 조회 중 서버·브라우저 양쪽에서 쓰는 것 (anon 키로 되는 조회만 — Supabase 클라이언트를 받아서 쓴다).
// 서버: src/lib/shop-posts-server.ts, 브라우저: 초안 미리보기(src/app/shop/[slug]/ShopDraftPreview.tsx)

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RelatedPost, ShopPost } from "./shop-post-types";

// 초안 포함 한 건 (주소를 아는 경우). RPC 가 없으면(SQL 미실행) null
export async function fetchPostBySlugAnyStatus(sb: SupabaseClient, slug: string): Promise<ShopPost | null> {
  const { data, error } = await sb.rpc("get_shop_post_by_slug", { p_slug: slug });
  if (error) return null;
  const rows = (data ?? []) as ShopPost[];
  return rows[0] ?? null;
}

// "함께 보면 좋은 글": 우리가 이미 공개한 글만. 같은 카테고리 우선, 모자라면 최신 글로 채움
export async function fetchRelatedPosts(
  sb: SupabaseClient,
  category: string | undefined,
  excludeSlug: string,
  limit = 4,
): Promise<RelatedPost[]> {
  const base = () =>
    sb
      .from("shop_posts")
      .select("slug,title,products")
      .eq("status", "published")
      .neq("slug", excludeSlug)
      .order("published_at", { ascending: false })
      .limit(limit);

  const same = category ? ((await base().eq("content->>category", category)).data ?? []) : [];
  const out = same as RelatedPost[];
  if (out.length < limit) {
    const recent = ((await base()).data ?? []) as RelatedPost[];
    for (const p of recent) {
      if (out.length >= limit) break;
      if (!out.some((x) => x.slug === p.slug)) out.push(p);
    }
  }
  return out;
}
