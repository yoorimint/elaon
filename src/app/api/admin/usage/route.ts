// GET /api/admin/usage — 관리자 "사용량" 카드 (src/components/AdminUsageCard.tsx) 가 부른다.
// 관리자 접속 토큰(Authorization: Bearer …)만 — 아니면 403. ?fresh=1 이면 10분 캐시 무시.
// 내용·계산은 src/lib/usage-report.ts.

import type { NextRequest } from "next/server";
import { defaultUsageApiDeps, handleUsageRequest } from "@/lib/usage-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: NextRequest) {
  return handleUsageRequest(req, defaultUsageApiDeps());
}
