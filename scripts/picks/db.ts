// 주소모음 봇용 DB 접근 (service role — 서버에서만). 표: auto_picks (supabase/picks.sql)

import { createClient } from "@supabase/supabase-js";

export type AutoPickKind = "item" | "vs";
export type AutoPickRow = {
  kind: AutoPickKind;
  category: string;
  group_title: string | null;
  slug: string;
  data: unknown;
  status: "draft" | "published";
  created_at: string;
};

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  return createClient(url, key, { auth: { persistSession: false } });
}
const sb = client();

// 초안 포함 전체 (중복 방지·카테고리 고르기용). 표가 없으면 안내와 함께 실패
export async function loadAutoRows(): Promise<AutoPickRow[]> {
  const { data, error } = await sb
    .from("auto_picks")
    .select("kind,category,group_title,slug,data,status,created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`auto_picks 읽기 실패 (supabase/picks.sql 실행 필요): ${error.message}`);
  return (data ?? []) as AutoPickRow[];
}

export type NewAutoPick = {
  kind: AutoPickKind;
  category: string;
  group_title: string | null;
  slug: string;
  data: unknown;
  status: "draft" | "published";
  qa: unknown;
};

export async function insertAutoPick(row: NewAutoPick): Promise<void> {
  const { error } = await sb
    .from("auto_picks")
    .insert({ ...row, published_at: row.status === "published" ? new Date().toISOString() : null });
  if (error) throw new Error(`auto_picks 저장 실패: ${error.message}`);
}
