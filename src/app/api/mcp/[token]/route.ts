// POST /api/mcp/<도구 토큰> — 쿠팡 도구 MCP 서버, 토큰을 주소에 넣는 방식 (챗GPT "사용자 지정 MCP 서버"를 "인증 없음"으로 붙일 때의 주 경로).
// 주소 자체가 비밀번호다: 토큰은 로그·응답에 찍지 않고, 상수 시간으로 비교한다 (src/lib/mcp-coupang.ts).
// iwinv nginx 사이트 설정은 access_log off — 접근 로그를 켜게 되면 이 경로를 빼야 토큰이 로그에 남지 않는다.

import { defaultToolApiDeps } from "@/lib/coupang-tools";
import { handleCoupangMcp } from "@/lib/mcp-coupang";
import { mcpMethodNotAllowed } from "@/lib/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request, { params }: { params: { token: string } }) {
  return handleCoupangMcp(req, defaultToolApiDeps(), params.token);
}

// 토큰 검사 없이 405 (주소가 맞는지 알려 주지 않는다)
export const GET = mcpMethodNotAllowed;
export const DELETE = mcpMethodNotAllowed;
