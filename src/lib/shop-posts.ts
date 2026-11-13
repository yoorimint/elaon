// 브라우저용 쇼핑 비교글 관리 (관리자 페이지·초안 미리보기).
// 권한은 Supabase RLS: 초안 조회·수정·삭제는 관리자만.

import { supabase } from "./supabase";
import type { ShopPost, ShopPostInputProduct, ShopPostQa, ShopPostRunInfo, ShopPostStatus } from "./shop-post-types";

export type AdminPostRow = Pick<ShopPost, "id" | "slug" | "title" | "status" | "created_at" | "published_at" | "products"> & {
  qa?: ShopPostQa | null; // 자동 검수 결과 (content.qa)
  run?: ShopPostRunInfo | null; // 작성 실행 리포트 (content.run)
};

export async function listAllPosts(limit = 100): Promise<AdminPostRow[]> {
  const { data, error } = await supabase
    .from("shop_posts")
    .select("id,slug,title,status,created_at,published_at,products,qa:content->qa,run:content->run")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPostRow[];
}

export async function getPostBySlug(slug: string): Promise<ShopPost | null> {
  const { data, error } = await supabase.from("shop_posts").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ShopPost | null) ?? null;
}

export async function setPostStatus(post: AdminPostRow, status: ShopPostStatus): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("shop_posts")
    .update({
      status,
      // 처음 발행할 때만 발행일 기록 (비공개 → 재발행 시 원래 날짜 유지)
      published_at: status === "published" ? post.published_at ?? now : post.published_at,
      updated_at: now,
    })
    .eq("id", post.id);
  if (error) throw new Error(error.message);
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from("shop_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// 발행 직후 검색엔진(네이버 등)에 새 글 알림. 실패해도 발행에는 영향 없음.
export async function notifySearchEngines(slug: string): Promise<void> {
  await fetch("/api/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug }),
  }).catch(() => undefined);
}

// 이미 작성된 글의 상품 링크·사진 수정 (글을 다시 쓰지 않고 사진만 넣을 때)
// 상품별로 바뀐 값(링크, 붙여넣은 대표 사진)만 최신 상품 목록에 합쳐 저장한다.
// (편집기를 연 뒤 미리보기에서 올린 사진을 예전 목록으로 덮어쓰지 않게)
export type ProductPatch = Partial<Pick<ShopPostInputProduct, "link" | "image">>;

export async function updatePostProducts(id: string, patches: ProductPatch[]): Promise<void> {
  const cur = await supabase.from("shop_posts").select("products").eq("id", id).single();
  if (cur.error) throw new Error(cur.error.message);
  const products = (cur.data.products as ShopPostInputProduct[]).map((p, i) => ({ ...p, ...patches[i] }));
  const { error } = await supabase
    .from("shop_posts")
    .update({ products, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
