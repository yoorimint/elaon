// 쿠팡 파트너스 Open API 의 순수 부분 (네트워크·DB 없음 — 테스트에서 그대로 부른다).
// 실제 호출·캐시·호출 한도는 src/lib/coupang-api.ts, 챗GPT 도구 API 는 src/lib/coupang-tools.ts.
//
// 확인한 자료 (공식 문서 partners.coupang.com 은 로그인이 필요해 공개 예제 코드로 교차 확인, 2026-11)
//  - 서명: HMAC-SHA256(secret, signed-date + method + path + query), 16진수. 헤더
//    "CEA algorithm=HmacSHA256, access-key=…, signed-date=yyMMdd'T'HHmmss'Z'(UTC), signature=…"
//    → gist soulduse/dc25855b13462569f7f59b052b560fae (Kotlin), github uju777/coupang-mcp server.py (Python),
//      github jinuksung/hotori_server src/utils/coupangPartners.ts, 이 저장소의 scripts/shop/providers/coupang.ts
//  - 상품 검색: GET /v2/providers/affiliate_open_api/apis/openapi/v1/products/search?keyword=&limit=
//    → { rCode: "0", rMessage, data: { landingUrl, productData: [{ productId, productName, productPrice, productImage,
//        productUrl, isRocket, isFreeShipping, rank, categoryName, keyword }] } }  (uju777/coupang-mcp, innovatorCho/dailypick)
//    limit 20 은 "limit is out of range" 로 거절된 예가 있어(innovatorCho/dailypick lib/coupang.ts) 10 까지만 쓴다
//  - 딥링크: POST /v2/providers/affiliate_open_api/apis/openapi/v1/deeplink  body { coupangUrls: [...] }
//    → { rCode: "0", rMessage, data: [{ originalUrl, shortenUrl, landingUrl }] }  (hotori_server, bobberrisford/affiliatemcp)
// 확인 못 한 모양(필드 없음·문자열 숫자·data 가 배열 등)은 방어적으로 읽고, 쓸 수 없는 줄은 버린다.

import { createHmac } from "node:crypto";
import { isPartnersLink, isPlainCoupangUrl } from "./coupang-link";

export const COUPANG_HOST = "https://api-gateway.coupang.com";
const API_BASE = "/v2/providers/affiliate_open_api/apis/openapi/v1";
export const COUPANG_PATHS = {
  search: `${API_BASE}/products/search`,
  deeplink: `${API_BASE}/deeplink`,
} as const;

export const SEARCH_LIMIT_MAX = 10; // 한 번 검색에서 받을 상품 수 상한 (위 주석)
export const KEYWORD_MAX = 50;
export const DEEPLINK_URLS_MAX = 5; // 한 요청에 바꿀 주소 수 (쿠팡 쪽 상한은 확인 못 함 — 넉넉히 작게)

// ---------- 오류 ----------

// code 별로 도구 API 가 HTTP 상태를 정한다 (src/lib/coupang-tools.ts). message 는 사람이 읽을 한국어 — 키·토큰은 넣지 않는다
export type CoupangErrorCode = "no_keys" | "rate_limited" | "auth" | "bad_input" | "upstream";

export class CoupangApiError extends Error {
  constructor(
    readonly code: CoupangErrorCode,
    message: string,
    readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = "CoupangApiError";
  }
}

export const NO_KEYS_MESSAGE = "쿠팡 키가 없어요 — 관리자 설정에서 쿠팡 키(Access Key·Secret Key)를 넣어 주세요";

export function rateLimitedMessage(retryAfterSec?: number): string {
  const min = retryAfterSec ? Math.max(1, Math.ceil(retryAfterSec / 60)) : 60;
  return `쿠팡 API 호출 한도에 걸렸어요 — 약 ${min}분 뒤에 다시 해 주세요 (쿠팡은 시간당 호출 수를 제한해요)`;
}

// 쿠팡 응답 → 사람이 읽을 오류. 본문은 그대로 옮기지 않고 rMessage 만 짧게 (쿠팡 응답에 무엇이 실려 올지 모르므로)
export function errorFromHttp(status: number, bodyText: string): CoupangApiError {
  const msg = upstreamMessage(bodyText);
  if (status === 429 || /too\s*many|rate\s*limit|exceed/i.test(msg)) return new CoupangApiError("rate_limited", rateLimitedMessage());
  if (status === 401 || status === 403) {
    return new CoupangApiError("auth", "쿠팡이 키를 받아 주지 않았어요 — 관리자 설정의 쿠팡 Access Key·Secret Key 를 확인해 주세요");
  }
  if (status >= 400 && status < 500) return new CoupangApiError("bad_input", `쿠팡이 요청을 거절했어요 (HTTP ${status}${msg ? ` · ${msg}` : ""})`);
  return new CoupangApiError("upstream", `쿠팡 서버 오류예요 (HTTP ${status}) — 잠시 뒤 다시 해 주세요`);
}

function upstreamMessage(bodyText: string): string {
  try {
    const j = JSON.parse(bodyText) as { rMessage?: unknown; message?: unknown };
    const m = typeof j.rMessage === "string" ? j.rMessage : typeof j.message === "string" ? j.message : "";
    return m.replace(/\s+/g, " ").trim().slice(0, 120);
  } catch {
    return "";
  }
}

// rCode 가 "0" 이 아니면 오류 (HTTP 200 이어도)
function checkRCode(json: unknown): Record<string, unknown> {
  const o = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  if (!o) throw new CoupangApiError("upstream", "쿠팡 응답을 읽지 못했어요");
  const code = o.rCode === undefined ? "0" : String(o.rCode);
  if (code !== "0") {
    const m = typeof o.rMessage === "string" ? o.rMessage.replace(/\s+/g, " ").trim().slice(0, 120) : "";
    if (/too\s*many|rate\s*limit|exceed|한도|초과/i.test(m)) throw new CoupangApiError("rate_limited", rateLimitedMessage());
    throw new CoupangApiError("upstream", `쿠팡 API 오류 (코드 ${code.slice(0, 20)}${m ? ` · ${m}` : ""})`);
  }
  return o;
}

// ---------- 서명 ----------

// yyMMdd'T'HHmmss'Z' (UTC)
export function coupangSignedDate(d: Date): string {
  const iso = d.toISOString(); // 2026-11-24T01:02:03.000Z
  return `${iso.slice(2, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`;
}

// query 는 ? 없이, 실제로 보내는 문자열과 글자 하나까지 같아야 한다
export function coupangSignature(secretKey: string, signedDate: string, method: string, path: string, query: string): string {
  return createHmac("sha256", secretKey).update(`${signedDate}${method}${path}${query}`, "utf8").digest("hex");
}

export function coupangAuthorization(o: { accessKey: string; secretKey: string; method: "GET" | "POST"; path: string; query: string; date: Date }): string {
  const signedDate = coupangSignedDate(o.date);
  const signature = coupangSignature(o.secretKey, signedDate, o.method, o.path, o.query);
  return `CEA algorithm=HmacSHA256, access-key=${o.accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

// 검색 쿼리 문자열 (서명과 주소에 같은 값을 쓴다). 공백은 + (Python urlencode 예제와 같은 꼴)
export function searchQuery(keyword: string, limit: number): string {
  return new URLSearchParams({ keyword, limit: String(limit) }).toString();
}

// ---------- 입력 정리 ----------

// 검색어: 앞뒤 공백·연속 공백 정리. 비었거나 너무 길면 오류
export function normalizeKeyword(input: unknown): string {
  const k = typeof input === "string" ? input.replace(/\s+/g, " ").trim() : "";
  if (!k) throw new CoupangApiError("bad_input", "검색어를 넣어 주세요");
  if (k.length > KEYWORD_MAX) throw new CoupangApiError("bad_input", `검색어는 ${KEYWORD_MAX}자까지만 돼요`);
  return k;
}

export function clampLimit(input: unknown, fallback = 5): number {
  const n = typeof input === "number" ? input : typeof input === "string" ? Number(input) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(SEARCH_LIMIT_MAX, Math.max(1, Math.round(n)));
}

// 쿠팡 상품 주소의 상품 번호 (coupang.com/vp/products/123…)
export function coupangProductId(url: string): string | null {
  return /^https?:\/\/(?:www\.|m\.)?coupang\.com\/vp\/products\/(\d{1,20})(?:[/?#]|$)/i.exec(url.trim())?.[1] ?? null;
}

export const productUrlOf = (productId: string) => `https://www.coupang.com/vp/products/${productId}`;

// 딥링크로 바꿀 주소: 일반 쿠팡 주소만 (http → https). 상품 번호만 줘도 된다.
// 이미 파트너스 링크(link.coupang.com/a/…, coupa.ng/…)는 바꿀 필요가 없어 따로 알려 준다
export type DeeplinkInput = { input: string; url: string } | { input: string; already: true } | { input: string; invalid: true };

export function deeplinkInput(raw: unknown): DeeplinkInput {
  const input = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  if (/^\d{1,20}$/.test(input)) return { input, url: productUrlOf(input) };
  if (isPartnersLink(input)) return { input, already: true };
  if (input.length <= 2000 && /^https?:\/\/\S+$/i.test(input) && isPlainCoupangUrl(input)) {
    return { input, url: input.replace(/^http:\/\//i, "https://") };
  }
  return { input, invalid: true };
}

// ---------- 응답 읽기 ----------

export type CoupangProduct = {
  productId: string;
  name: string;
  price: number | null; // 원
  image: string | null;
  url: string; // 쿠팡이 검색 결과로 준 상품 주소 (productUrl)
  isRocket: boolean;
  isFreeShipping: boolean;
  rank: number | null;
  categoryName: string | null;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v.replace(/,/g, "")) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const bool = (v: unknown) => v === true || v === "true" || v === "Y" || v === 1;
const httpsUrl = (v: unknown) => {
  const s = str(v);
  return /^https:\/\/\S+$/i.test(s) ? s : null;
};
// 쿠팡 쪽 주소만 (coupang.com, coupa.ng, 쿠팡 이미지 서버 coupangcdn.com)
const coupangHost = (u: string | null) => {
  if (!u) return null;
  try {
    const h = new URL(u).hostname.toLowerCase();
    return /(?:^|\.)(?:coupang\.com|coupa\.ng|coupangcdn\.com)$/.test(h) ? u : null;
  } catch {
    return null;
  }
};

export function parseSearchResponse(json: unknown): CoupangProduct[] {
  const o = checkRCode(json);
  const data = o.data;
  const rows = Array.isArray(data) ? data : Array.isArray((data as { productData?: unknown } | null)?.productData) ? (data as { productData: unknown[] }).productData : [];
  const out: CoupangProduct[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const p = r as Record<string, unknown>;
    const productId = str(p.productId);
    const name = str(p.productName).replace(/\s+/g, " ");
    const url = coupangHost(httpsUrl(p.productUrl)) ?? (/^\d+$/.test(productId) ? productUrlOf(productId) : null);
    if (!productId || !name || !url) continue;
    out.push({
      productId,
      name: name.slice(0, 200),
      price: num(p.productPrice),
      image: coupangHost(httpsUrl(p.productImage)),
      url,
      isRocket: bool(p.isRocket),
      isFreeShipping: bool(p.isFreeShipping),
      rank: num(p.rank),
      categoryName: str(p.categoryName) || null,
    });
  }
  return out;
}

export type CoupangDeeplink = { originalUrl: string; shortenUrl: string; landingUrl: string | null };

// 응답 줄을 보낸 주소에 짝짓는다: originalUrl 이 같은 줄 → 없으면 같은 순서 (개수가 같을 때만)
export function parseDeeplinkResponse(json: unknown, sent: string[]): Map<string, CoupangDeeplink> {
  const o = checkRCode(json);
  const rows = (Array.isArray(o.data) ? o.data : []).filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
  const out = new Map<string, CoupangDeeplink>();
  rows.forEach((r, i) => {
    const original = str(r.originalUrl);
    const target = sent.find((u) => u === original) ?? (rows.length === sent.length ? sent[i] : undefined);
    if (!target || out.has(target)) return;
    const shorten = coupangHost(httpsUrl(r.shortenUrl));
    const landing = coupangHost(httpsUrl(r.landingUrl));
    const link = shorten ?? landing;
    if (link) out.set(target, { originalUrl: target, shortenUrl: link, landingUrl: landing });
  });
  return out;
}

export const priceText = (price: number | null) => (price === null ? null : `${Math.round(price).toLocaleString("ko-KR")}원`);
