// POST /api/tools/coupang/deeplink { url? | urls? | productIds? } — 챗GPT 맞춤 GPT(Actions)가 부르는 쿠팡 파트너스 링크 만들기.
// 헤더 Authorization: Bearer <도구 토큰> 만 허용. 처리·토큰 검사·호출 제한은 src/lib/coupang-tools.ts.

import { defaultToolApiDeps, handleToolDeeplink } from "@/lib/coupang-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handleToolDeeplink(req, defaultToolApiDeps());
}
