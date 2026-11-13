// 자동글 스크립트용 Supabase 접근 (service role — RLS 우회, 서버에서만 사용).

import { createClient } from "@supabase/supabase-js";
// 타입만 가져온다(런타임 import 아님) — shop-config.ts 는 브라우저용 클라이언트를 만든다
import type { ShopConfig } from "@/lib/shop-config";
import type {
  ShopPostContent,
  ShopPostInputProduct,
  ShopPostSource,
  ShopPostStats,
  ShopPostStatus,
} from "@/lib/shop-post-types";
import type { CheckResult, SecretName, Secrets } from "./providers/types";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  return createClient(url, key, { auth: { persistSession: false } });
}

const sb = client();

// 관리자 페이지에서 저장한 API 키 (shop_secrets)
export async function loadSecrets(): Promise<Secrets> {
  const { data, error } = await sb.from("shop_secrets").select("name,value");
  if (error) throw new Error(`shop_secrets 읽기 실패: ${error.message}`);
  const out: Secrets = {};
  for (const row of (data ?? []) as { name: SecretName; value: string }[]) {
    out[row.name] = row.value;
  }
  return out;
}

export type KeyCheckMap = Record<string, CheckResult>;

export async function saveKeyCheck(results: KeyCheckMap): Promise<void> {
  const { error } = await sb
    .from("shop_config")
    .update({ key_check: results, key_check_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(`key_check 저장 실패: ${error.message}`);
}

export async function loadConfig(): Promise<ShopConfig> {
  const { data, error } = await sb.from("shop_config").select("*").eq("id", 1).single();
  if (error) throw new Error(`shop_config 읽기 실패: ${error.message}`);
  return data as ShopConfig;
}

// 기간 안에 쓴 글 수. passed 를 주면 합격선 통과/미달 글만 (content.qa.passed)
export async function countPostsSince(sinceIso: string, filter: { passed?: boolean } = {}): Promise<number> {
  let q = sb.from("shop_posts").select("id", { count: "exact", head: true }).gte("created_at", sinceIso);
  if (filter.passed !== undefined) q = q.eq("content->qa->>passed", String(filter.passed));
  const { count, error } = await q;
  if (error) throw new Error(`shop_posts 조회 실패: ${error.message}`);
  return count ?? 0;
}

// ---------- 실행 기록 (관리자 "최근 실행" 표시용, supabase/shop.sql 의 shop_runs) ----------
export type RunOutcome = "published" | "draft" | "below_bar" | "skipped" | "error";
export type RunLog = {
  outcome: RunOutcome;
  reason: string;
  title?: string;
  slug?: string;
  cost_usd?: number;
  detail?: Record<string, unknown>;
};

// 기록 실패(표가 아직 없음 등)는 글쓰기를 막지 않는다
export async function logRun(run: RunLog): Promise<void> {
  const { error } = await sb.from("shop_runs").insert(run);
  if (error) console.warn(`  (실행 기록 저장 실패 — supabase/shop.sql 의 shop_runs 표가 필요: ${error.message.slice(0, 100)})`);
}

export async function pairExists(pairKey: string): Promise<boolean> {
  const { count, error } = await sb
    .from("shop_posts")
    .select("id", { count: "exact", head: true })
    .eq("pair_key", pairKey);
  if (error) throw new Error(`shop_posts 조회 실패: ${error.message}`);
  return (count ?? 0) > 0;
}

export type NewShopPost = {
  slug: string;
  title: string;
  description: string;
  content: ShopPostContent;
  products: ShopPostInputProduct[];
  sources: ShopPostSource[];
  stats: ShopPostStats;
  pair_key: string;
  status: ShopPostStatus;
};

export async function insertPost(post: NewShopPost): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("shop_posts")
    .insert({ ...post, published_at: post.status === "published" ? now : null })
    .select("slug")
    .single();
  if (error) throw new Error(`글 저장 실패: ${error.message}`);
  return (data as { slug: string }).slug;
}

// 자동 선정용 이력: 이미 쓴 조합 키, 직전 글의 상품 수, 최근 14일 카테고리
export async function loadPostHistory(): Promise<{
  usedPairKeys: Set<string>;
  lastProductCount: number | null;
  recentCategories: Set<string>;
}> {
  const { data, error } = await sb
    .from("shop_posts")
    .select("pair_key, products, created_at, category:content->>category")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(`shop_posts 조회 실패: ${error.message}`);
  const rows = (data ?? []) as { pair_key: string; products: unknown[]; created_at: string; category: string | null }[];
  const since = Date.now() - 14 * 24 * 3600 * 1000;
  return {
    usedPairKeys: new Set(rows.map((r) => r.pair_key)),
    lastProductCount: rows[0] && Array.isArray(rows[0].products) ? rows[0].products.length : null,
    recentCategories: new Set(
      rows.filter((r) => r.category && new Date(r.created_at).getTime() >= since).map((r) => r.category as string),
    ),
  };
}
