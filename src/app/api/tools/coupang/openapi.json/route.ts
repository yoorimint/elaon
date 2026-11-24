// GET /api/tools/coupang/openapi.json — 챗GPT Actions 의 "URL 에서 가져오기"에 넣는 스키마 (src/lib/coupang-openapi.ts).
// 비밀값이 없는 고정 문서라 누구나 읽어도 된다.

import { coupangOpenApiDoc } from "@/lib/coupang-openapi";

export const dynamic = "force-static";

export function GET() {
  return Response.json(coupangOpenApiDoc(), { headers: { "cache-control": "public, max-age=3600" } });
}
