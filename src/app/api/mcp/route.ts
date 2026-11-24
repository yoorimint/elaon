// POST /api/mcp — 쿠팡 도구 MCP 서버 (Streamable HTTP, 상태 없음). 헤더 Authorization: Bearer <도구 토큰> 으로 인증.
// 챗GPT 에서 "인증 없음"으로 붙일 때는 토큰을 주소에 넣는 /api/mcp/<토큰> (./[token]/route.ts) 을 쓴다.
// 처리·토큰 검사·호출 제한은 src/lib/mcp-coupang.ts, 프로토콜 규칙은 src/lib/mcp-server.ts.

import { defaultToolApiDeps } from "@/lib/coupang-tools";
import { handleCoupangMcp } from "@/lib/mcp-coupang";
import { mcpMethodNotAllowed } from "@/lib/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handleCoupangMcp(req, defaultToolApiDeps());
}

// 서버가 먼저 보내는 SSE 스트림(GET)·세션 끝내기(DELETE)는 쓰지 않는다 → 405
export const GET = mcpMethodNotAllowed;
export const DELETE = mcpMethodNotAllowed;
