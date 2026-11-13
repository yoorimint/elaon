// API 라우트용: 요청의 관리자 접속 토큰(Authorization: Bearer …)이 진짜 관리자인지 확인 (Supabase is_admin()).
import { createClient } from "@supabase/supabase-js";

export function bearerToken(header: string | null): string {
  return header?.replace(/^Bearer\s+/i, "") ?? "";
}

export async function isAdminToken(token: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return false;
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await sb.rpc("is_admin");
  return !error && data === true;
}
