import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase 환경 변수가 없습니다");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
