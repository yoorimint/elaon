// 브라우저용: 관리자 화면 "챗GPT 연결" 칸이 도구 토큰을 새로 만든다 (POST /api/admin/coupang/tool-token, 관리자 접속 토큰으로).

import { supabase } from "./supabase";

export async function createToolToken(): Promise<{ token: string; createdAt: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("관리자 로그인이 풀렸어요. 다시 로그인해 주세요");
  const res = await fetch("/api/admin/coupang/tool-token", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { token?: string; createdAt?: string; error?: string };
  if (!res.ok || !body.token) throw new Error(body.error ?? `서버 오류 ${res.status}`);
  return { token: body.token, createdAt: body.createdAt ?? new Date().toISOString() };
}
