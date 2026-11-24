// 챗GPT 맞춤 GPT 의 Actions 에 붙여넣을 OpenAPI 3.1 문서 (GET /api/tools/coupang/openapi.json).
// 작업 2개: 쿠팡 상품 찾기(searchCoupangProducts), 쿠팡 파트너스 링크 만들기(createCoupangPartnersLink).
// 인증은 Bearer (도구 토큰 — src/lib/tool-token.ts). 챗GPT 는 작업 설명을 300자까지만 읽으므로 짧게.
// 응답 모양은 src/lib/coupang-tools.ts 와 같아야 한다 (scripts/shop/coupang.test.ts 가 이름을 맞춰 본다).

export const TOOL_SERVER_URL = "https://www.eloan.kr";
export const TOOL_PATHS = { search: "/api/tools/coupang/search", deeplink: "/api/tools/coupang/deeplink" } as const;
export const OPENAPI_PATH = "/api/tools/coupang/openapi.json";

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

const commonErrors = {
  "400": errorResponse("입력이 잘못됨 (검색어·주소 확인)"),
  "403": errorResponse("도구 토큰이 없거나 틀림"),
  "429": errorResponse("호출이 너무 잦음 또는 쿠팡 시간당 한도 초과 — 잠시 뒤 다시"),
  "502": errorResponse("쿠팡 쪽 오류 (키 확인·잠시 뒤 다시)"),
  "503": errorResponse("서버 설정 안 됨 (쿠팡 키·도구 토큰 없음)"),
};

export function coupangOpenApiDoc(serverUrl = TOOL_SERVER_URL) {
  return {
    openapi: "3.1.0",
    info: {
      title: "이로운 쿠팡 도구",
      version: "1.0.0",
      description: "쿠팡 파트너스 Open API 로 상품을 찾고 파트너스 링크를 만든다. 쿠팡 키는 서버에만 있고, 이 도구는 도구 토큰으로만 부른다.",
    },
    servers: [{ url: serverUrl }],
    security: [{ bearerAuth: [] }],
    paths: {
      [TOOL_PATHS.search]: {
        post: {
          operationId: "searchCoupangProducts",
          summary: "쿠팡 상품 찾기",
          description:
            "검색어로 쿠팡 상품을 찾아 상품명·가격·사진·로켓배송 여부·상품 번호를 돌려준다. 쿠팡이 호출 수를 시간당으로 제한하므로 같은 검색어를 되풀이하지 말 것(6시간 캐시). 가격은 조회 시각 기준이라 바뀔 수 있다고 함께 알려 줄 것.",
          "x-openai-isConsequential": false,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["keyword"],
                  properties: {
                    keyword: { type: "string", maxLength: 50, description: "검색어 (예: 무선 청소기)" },
                    limit: { type: "integer", minimum: 1, maximum: 10, default: 5, description: "받을 상품 수 (1~10)" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "검색 결과", content: { "application/json": { schema: { $ref: "#/components/schemas/SearchResult" } } } },
            ...commonErrors,
          },
        },
      },
      [TOOL_PATHS.deeplink]: {
        post: {
          operationId: "createCoupangPartnersLink",
          summary: "쿠팡 파트너스 링크 만들기",
          description:
            "일반 쿠팡 상품 주소(https://www.coupang.com/vp/products/…)나 상품 번호를 수수료가 잡히는 쿠팡 파트너스 링크로 바꾼다. 한 번에 5개까지. 결과의 partnersUrl 을 쓰고, 글에 넣을 때는 disclosure 고지 문구를 함께 넣을 것.",
          "x-openai-isConsequential": false,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string", description: "쿠팡 상품 주소 하나" },
                    urls: { type: "array", items: { type: "string" }, maxItems: 5, description: "쿠팡 상품 주소 여러 개" },
                    productIds: { type: "array", items: { type: "string" }, maxItems: 5, description: "상품 찾기 결과의 productId" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "변환 결과 (주소마다 status)", content: { "application/json": { schema: { $ref: "#/components/schemas/DeeplinkResult" } } } },
            ...commonErrors,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "사이트 관리자 화면에서 만든 도구 토큰" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { error: { type: "string", description: "사람이 읽을 오류 설명" }, code: { type: "string" } },
        },
        Product: {
          type: "object",
          properties: {
            productId: { type: "string" },
            name: { type: "string" },
            price: { type: ["number", "null"], description: "원" },
            priceText: { type: ["string", "null"], description: "예: 129,000원" },
            isRocket: { type: "boolean", description: "로켓배송" },
            isFreeShipping: { type: "boolean" },
            image: { type: ["string", "null"] },
            url: { type: "string", description: "쿠팡이 검색 결과로 준 상품 주소" },
            productPageUrl: { type: ["string", "null"], description: "일반 쿠팡 상품 주소" },
            categoryName: { type: ["string", "null"] },
            rank: { type: ["number", "null"] },
          },
        },
        SearchResult: {
          type: "object",
          properties: {
            keyword: { type: "string" },
            fetchedAt: { type: "string", description: "쿠팡에서 받은 시각 (ISO)" },
            cached: { type: "boolean", description: "저장해 둔 결과면 true" },
            notice: { type: "string", description: "가격 기준 시각 안내 — 사용자에게 함께 알려 줄 것" },
            products: { type: "array", items: { $ref: "#/components/schemas/Product" } },
          },
        },
        DeeplinkResult: {
          type: "object",
          properties: {
            links: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  input: { type: "string" },
                  status: { type: "string", enum: ["ok", "already", "invalid", "failed"] },
                  partnersUrl: { type: "string", description: "쿠팡 파트너스 링크 (status ok·already)" },
                  originalUrl: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
            disclosure: { type: "string", description: "글에 함께 넣어야 하는 쿠팡 파트너스 고지 문구" },
          },
        },
      },
    },
  };
}
