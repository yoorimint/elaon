// MCP 서버 주소 (브라우저에서도 import 하는 상수만 — 비밀값 없음).
// 서버 처리: src/lib/mcp-server.ts(프로토콜) · src/lib/mcp-coupang.ts(쿠팡 도구·토큰 검사), 라우트: src/app/api/mcp/*

import { TOOL_SERVER_URL } from "./coupang-openapi";

export const MCP_PATH = "/api/mcp";
export const MCP_URL = `${TOOL_SERVER_URL}${MCP_PATH}`;

// 챗GPT "사용자 지정 MCP 서버 추가"에서 인증을 "인증 없음"으로 붙일 때 쓰는 주소 — 주소 자체가 비밀번호다
export const mcpUrlWithToken = (token: string) => `${MCP_URL}/${encodeURIComponent(token)}`;
