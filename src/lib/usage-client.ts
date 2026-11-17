// 브라우저용: 관리자 "사용량" 카드가 서버 API(GET /api/admin/usage, src/lib/usage-report.ts)를 관리자 접속 토큰으로 부른다.

import { supabase } from "./supabase";
import type { UsageReport } from "./usage-report";

export async function fetchUsageReport(fresh = false): Promise<UsageReport> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("관리자 로그인이 풀렸어요. 다시 로그인해 주세요");
  const res = await fetch(`/api/admin/usage${fresh ? "?fresh=1" : ""}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as UsageReport & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `서버 오류 ${res.status}`);
  return body;
}
