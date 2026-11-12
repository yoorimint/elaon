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

export async function countPostsSince(sinceIso: string): Promise<number> {
  const { count, error } = await sb
    .from("shop_posts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  if (error) throw new Error(`shop_posts 조회 실패: ${error.message}`);
  return count ?? 0;
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
