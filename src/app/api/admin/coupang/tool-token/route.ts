// POST /api/admin/coupang/tool-token — 관리자 ⚙️ 설정 "챗GPT 연결"의 "도구 토큰 새로 만들기".
// 관리자 접속 토큰(Authorization: Bearer …)만. 새 토큰을 만들어 shop_secrets 에 저장하고 이 응답에서 한 번만 보여 준다 (예전 토큰은 바로 못 씀).

import { isAdminToken } from "@/lib/admin-token";
import { handleToolTokenCreate } from "@/lib/coupang-tools";
import { createServiceClient } from "@/lib/supabase-server";
import { saveToolToken } from "@/lib/tool-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handleToolTokenCreate(req, {
    isAdmin: isAdminToken,
    save: (token) => saveToolToken(createServiceClient(), token),
  });
}
