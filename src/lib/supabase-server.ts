import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase 환경 변수가 없습니다");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 크론/관리용. RLS 우회해서 board_top_signals 같은 시스템 테이블 쓰기 가능.
// SUPABASE_SERVICE_ROLE_KEY 환경변수 필요 (Vercel secrets 로 추가).
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role 환경 변수가 없습니다");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
