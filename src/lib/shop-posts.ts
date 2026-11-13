// 브라우저용 쇼핑 비교글 관리 (관리자 페이지·초안 미리보기).
// 권한은 Supabase RLS: 초안 조회·수정·삭제는 관리자만.

import { supabase } from "./supabase";
import { sanitizeManualInput, type ManualPostInput } from "./shop-manual";
import type { ShopPost, ShopPostInputProduct, ShopPostQa, ShopPostRunInfo, ShopPostStatus } from "./shop-post-types";

export type AdminPostRow = Pick<ShopPost, "id" | "slug" | "title" | "status" | "created_at" | "published_at" | "products"> & {
  qa?: ShopPostQa | null; // 자동 검수 결과 (content.qa)
  run?: ShopPostRunInfo | null; // 작성 실행 리포트 (content.run)
  kind?: string | null; // "manual" = 직접 붙여넣어 만든 글 (content.kind), 없으면 AI 글
};

export async function listAllPosts(limit = 100): Promise<AdminPostRow[]> {
  const { data, error } = await supabase
    .from("shop_posts")
    .select("id,slug,title,status,created_at,published_at,products,qa:content->qa,run:content->run,kind:content->>kind")
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

export async function getPostById(id: string): Promise<ShopPost | null> {
  const { data, error } = await supabase.from("shop_posts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ShopPost | null) ?? null;
}

// ---------- 직접 쓴 글 (붙여넣어 만든 글) ----------

async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("저장 안 됨 — 관리자 로그인이 풀렸어요. 다시 로그인해 주세요");
  return token;
}

// 새 초안 저장: 브라우저에는 글쓰기 권한이 없어 서버 API 가 관리자 확인 후 넣는다 (src/app/api/shop/manual-post)
export async function createManualPost(input: ManualPostInput): Promise<{ id: string; slug: string }> {
  const clean = sanitizeManualInput(input);
  if (!clean) throw new Error("글 형식이 올바르지 않아요");
  const res = await fetch("/api/shop/manual-post", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify(clean),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; slug?: string; error?: string };
  if (!res.ok || !body.id || !body.slug) throw new Error(`저장 안 됨 — ${body.error ?? `서버 오류 ${res.status}`}`);
  return { id: body.id, slug: body.slug };
}

// 저장된 글 수정 (초안·공개 글 공통). 관리자 권한(RLS)으로 바로 고친다
export async function updateManualPost(id: string, input: ManualPostInput): Promise<void> {
  const clean = sanitizeManualInput(input);
  if (!clean) throw new Error("글 형식이 올바르지 않아요");
  const { data, error } = await supabase
    .from("shop_posts")
    .update({ ...clean, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`저장 안 됨 — ${error.message}`);
  // 권한이 없으면 오류 없이 0건만 바뀐다
  if (!data?.length) throw new Error("저장 안 됨 — 관리자 로그인 상태를 확인하세요");
}

export async function setPostStatus(post: Pick<AdminPostRow, "id" | "published_at">, status: ShopPostStatus): Promise<void> {
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

// 발행·비공개·삭제 직후 사이트의 쇼핑 목록·글 화면·RSS 를 바로 새로 만들게 요청 (관리자 로그인 필요).
// 실패해도 발행 자체에는 영향 없음 (화면은 최대 5분 뒤 자동 갱신).
export async function refreshShopPages(slug: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  await fetch("/api/shop/revalidate", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ slug }),
  }).catch(() => undefined);
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
  const { data, error } = await supabase
    .from("shop_posts")
    .update({ products, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("저장 안 됨 — 관리자 로그인 상태를 확인하세요");
}
