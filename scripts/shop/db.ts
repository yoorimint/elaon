// 자동글 스크립트용 Supabase 접근 (service role — RLS 우회, 서버에서만 사용).

import { createClient } from "@supabase/supabase-js";
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
