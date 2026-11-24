// 챗GPT "사용자 지정 MCP 서버"로 여는 쿠팡 도구 (서버 전용). 프로토콜 규칙은 src/lib/mcp-server.ts.
//  도구 2개: search_coupang_products(상품 찾기) · create_coupang_partners_link(파트너스 링크 만들기)
//  처리 로직은 도구 API(/api/tools/coupang/*)와 같은 코드 — src/lib/coupang-tools.ts 의 searchProductsTool·partnersLinksTool.
//
// 인증 (OAuth 는 만들지 않는다 — 챗GPT 화면의 선택지는 OAuth / 인증 없음 / 둘 다, 2026-11-24 사장님 화면 확인)
//  1) 주 경로: POST /api/mcp/<도구 토큰> — 챗GPT 에서 "인증 없음"으로 붙일 때. 주소 자체가 비밀번호.
//  2) POST /api/mcp + 헤더 Authorization: Bearer <도구 토큰> — 헤더를 넣을 수 있는 다른 MCP 클라이언트용.
//  토큰 비교는 상수 시간(sameToolToken). 토큰은 로그·응답에 찍지 않는다.
//  주소에 토큰이 들어가므로 접근 로그가 문제인데, iwinv nginx 사이트 설정은 access_log off 이고 Next(node server.js)는 요청 주소를 찍지 않는다.
//  nginx 설정을 바꿔 접근 로그를 켜면 이 주소의 토큰이 로그에 남으니, 켤 때는 /api/mcp/ 를 빼야 한다.
//  호출 제한은 도구 API 와 같은 제한기(IP별 분당·전체 분당, 전체는 토큰 통과 뒤에만 센다 — checkToolAccess).

import { bearerToken } from "./admin-token";
import { CoupangApiError, DEEPLINK_URLS_MAX, KEYWORD_MAX, SEARCH_LIMIT_MAX } from "./coupang-api-core";
import type { CoupangClient } from "./coupang-api";
import {
  NOT_CONFIGURED_MESSAGE,
  checkToolAccess,
  clientIp,
  kstLabel,
  partnersLinksTool,
  searchProductsTool,
  tooManyRequestsMessage,
  type ToolApiDeps,
  type ToolDeeplinkResult,
  type ToolSearchResult,
} from "./coupang-tools";
import { McpAppErrorCode, handleMcpPost, originAllowed, rpcErrorResponse, type McpServerSpec, type McpTool, type McpToolResult } from "./mcp-server";

export const MCP_SERVER_NAME = "eloan-coupang";
export const MCP_SERVER_VERSION = "1.0.0";
export const MCP_TOOL_NAMES = { search: "search_coupang_products", deeplink: "create_coupang_partners_link" } as const;

// 브라우저가 우리 MCP 주소를 부를 때 Origin 이 붙는다. 챗GPT 는 서버에서 부르므로 보통 Origin 이 없다 (있으면 openai·chatgpt 쪽만 허용)
export const MCP_ALLOWED_ORIGIN = /^https:\/\/(?:[a-z0-9-]+\.)*(?:chatgpt\.com|openai\.com|eloan\.kr)$/i;

// 읽기 전용 표시 — 개인 계정 개발자 모드가 읽기 전용 도구만 허용할 수 있어서. 실제로도 우리 쪽 데이터를 바꾸지 않는다 (쿠팡에 조회·링크 발급만)
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: true } as const;

export const COUPANG_MCP_TOOLS: readonly McpTool[] = [
  {
    name: MCP_TOOL_NAMES.search,
    title: "쿠팡 상품 찾기",
    description:
      "쿠팡 파트너스 공식 API 로 쿠팡 상품을 검색해 상품명·가격·로켓배송·사진·상품 번호·상품 주소를 돌려준다. 가격은 조회 시각 기준이라 바뀔 수 있다. " +
      `수수료가 잡히는 링크는 결과의 상품 번호로 ${MCP_TOOL_NAMES.deeplink} 를 불러 만들 것. 쿠팡 호출 한도가 작으니 같은 검색을 되풀이하지 말 것.`,
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", minLength: 1, maxLength: KEYWORD_MAX, description: "검색어 (예: 무선 청소기)" },
        limit: { type: "integer", minimum: 1, maximum: SEARCH_LIMIT_MAX, default: 5, description: `받을 상품 수 1~${SEARCH_LIMIT_MAX} (기본 5)` },
      },
      required: ["keyword"],
      additionalProperties: false,
    },
    annotations: { title: "쿠팡 상품 찾기", ...READ_ONLY },
  },
  {
    name: MCP_TOOL_NAMES.deeplink,
    title: "쿠팡 파트너스 링크 만들기",
    description:
      "쿠팡 상품 주소(urls)나 상품 번호(productIds)를 수수료가 잡히는 쿠팡 파트너스 링크(link.coupang.com/a/…)로 바꾼다. " +
      `둘을 합쳐 한 번에 ${DEEPLINK_URLS_MAX}개까지. 글에 링크를 넣을 때는 결과의 파트너스 고지 문구를 함께 적을 것.`,
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          maxItems: DEEPLINK_URLS_MAX,
          description: "쿠팡 상품 주소 (https://www.coupang.com/vp/products/…)",
        },
        productIds: { type: "array", items: { type: "string" }, maxItems: DEEPLINK_URLS_MAX, description: `쿠팡 상품 번호 (${MCP_TOOL_NAMES.search} 결과의 상품 번호)` },
      },
      additionalProperties: false,
    },
    annotations: { title: "쿠팡 파트너스 링크 만들기", ...READ_ONLY },
  },
];

const INSTRUCTIONS =
  `쿠팡 상품 찾기·쿠팡 파트너스 링크 만들기 도구. 상품은 ${MCP_TOOL_NAMES.search} 로 찾고, 수수료가 잡히는 링크는 반드시 ${MCP_TOOL_NAMES.deeplink} 로 만들 것. ` +
  "가격·로켓배송은 조회 시각 기준이라 바뀔 수 있다고 함께 알릴 것.";

const LINK_HINT = `수수료가 잡히는 파트너스 링크는 ${MCP_TOOL_NAMES.deeplink} 에 상품 번호(productIds)를 넣어 만드세요.`;

// ---------- 사람이 읽을 요약 (content[0].text) ----------

const short = (s: string, n = 200) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function searchSummary(r: ToolSearchResult): string {
  const when = kstLabel(r.fetchedAt);
  const head = `"${r.keyword}" 쿠팡 검색 결과 ${r.products.length}개 — ${when}(한국 시간) 기준, 가격·로켓배송 여부는 바뀔 수 있어요.`;
  if (!r.products.length) return `${head}\n\n찾은 상품이 없어요. 검색어를 바꿔 보세요.`;
  const rows = r.products.map((p, i) => {
    const tags = [p.priceText ? `가격 ${p.priceText}` : "가격 정보 없음", p.isRocket ? "로켓배송" : null, p.isFreeShipping ? "무료배송" : null].filter(Boolean).join(" · ");
    return [
      `${i + 1}. ${p.name}`,
      `   ${tags}`,
      `   상품 번호 ${p.productId}`,
      `   상품 주소 ${p.productPageUrl ?? p.url}`,
      ...(p.image ? [`   사진 ${p.image}`] : []),
    ].join("\n");
  });
  return `${head}\n\n${rows.join("\n\n")}\n\n${LINK_HINT}`;
}

export function deeplinkSummary(r: ToolDeeplinkResult): string {
  const done = r.links.filter((l) => l.status === "ok" || l.status === "already").length;
  const rows = r.links.map((l, i) => {
    const result = l.status === "ok" ? l.partnersUrl : l.status === "already" ? `${l.partnersUrl} (${l.message})` : `만들지 못함: ${l.message}`;
    return `${i + 1}. ${short(l.input)}\n   → ${result}`;
  });
  return `쿠팡 파트너스 링크 (${r.links.length}개 중 ${done}개 준비됨)\n\n${rows.join("\n")}\n\n${r.disclosure}`;
}

// ---------- 도구 호출 ----------

export function coupangMcpSpec(client: () => CoupangClient): McpServerSpec {
  return {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    instructions: INSTRUCTIONS,
    tools: COUPANG_MCP_TOOLS,
    async callTool(name, args): Promise<McpToolResult> {
      try {
        if (name === MCP_TOOL_NAMES.search) {
          const r = await searchProductsTool(client(), args, LINK_HINT);
          return { content: [{ type: "text", text: searchSummary(r) }], structuredContent: r };
        }
        if (name === MCP_TOOL_NAMES.deeplink) {
          const r = await partnersLinksTool(client(), args);
          return { content: [{ type: "text", text: deeplinkSummary(r) }], structuredContent: r };
        }
        throw new Error(`도구 목록과 처리가 어긋남: ${name}`); // COUPANG_MCP_TOOLS 에 이름을 더하고 여기를 빠뜨린 경우
      } catch (e) {
        // 쿠팡 오류(키 없음·한도·인증·입력)는 JSON-RPC 오류가 아니라 도구 결과로 — 모델이 읽고 사람에게 알리거나 고쳐서 다시 부른다
        if (e instanceof CoupangApiError) {
          return { content: [{ type: "text", text: e.message }], structuredContent: { error: e.message, code: e.code }, isError: true };
        }
        throw e;
      }
    },
  };
}

// ---------- HTTP ----------

// pathToken: /api/mcp/<토큰> 으로 온 경우 그 토큰, /api/mcp 면 undefined (헤더 Bearer 를 본다)
export async function handleCoupangMcp(req: Request, deps: ToolApiDeps, pathToken?: string): Promise<Response> {
  if (!originAllowed(req.headers.get("origin"), MCP_ALLOWED_ORIGIN)) {
    return rpcErrorResponse(403, McpAppErrorCode.forbiddenOrigin, "허용하지 않은 Origin 이에요");
  }
  const given = pathToken ?? bearerToken(req.headers.get("authorization"));
  const denied = await checkToolAccess(clientIp(req), given, deps);
  if (denied) {
    switch (denied.kind) {
      case "too_many_requests":
        return rpcErrorResponse(429, McpAppErrorCode.tooManyRequests, tooManyRequestsMessage(denied.retryAfterSec), { "retry-after": String(denied.retryAfterSec) });
      case "not_configured":
        return rpcErrorResponse(503, McpAppErrorCode.notConfigured, NOT_CONFIGURED_MESSAGE);
      case "forbidden":
        return rpcErrorResponse(
          401,
          McpAppErrorCode.unauthorized,
          "도구 토큰이 없거나 맞지 않아요 — 사이트 관리자 화면(⚙️ 설정 → 챗GPT 연결)에서 만든 'MCP 주소(토큰 포함)'를 챗GPT 에 다시 넣어 주세요",
          { "www-authenticate": 'Bearer realm="eloan-mcp"' },
        );
    }
  }
  return handleMcpPost(req, coupangMcpSpec(deps.client));
}
