import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase 환경 변수가 없습니다");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 관리용 (쇼핑 글 수동 발행·노션 동기화). RLS 우회.
// SUPABASE_SERVICE_ROLE_KEY 환경변수 필요 (Vercel secrets 로 추가).
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role 환경 변수가 없습니다");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
