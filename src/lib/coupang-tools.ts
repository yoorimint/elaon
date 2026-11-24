// 챗GPT 도구 API 의 처리 (서버 전용). 라우트는 얇게 두고 여기서 토큰 검사·호출 제한·입력 정리·응답 모양을 맡는다 → 테스트는 가짜 의존성으로.
//  POST /api/tools/coupang/search   { keyword, limit? }                → 쿠팡 상품 검색 결과
//  POST /api/tools/coupang/deeplink { urls?, url?, productIds? }        → 쿠팡 파트너스 링크
//  POST /api/admin/coupang/tool-token (관리자 접속 토큰)                → 도구 토큰 새로 만들기 (한 번만 보여 줌)
// 쿠팡 키는 서버에만 있다 (src/lib/coupang-api.ts). 챗GPT 는 도구 토큰만 안다.
// 로그·응답에 키·토큰을 넣지 않는다 (오류 문구도 code 별 고정 한국어).

import { bearerToken } from "./admin-token";
import { loadCoupangKeys, sharedCoupangClient, type CoupangClient } from "./coupang-api";
import {
  CoupangApiError,
  DEEPLINK_URLS_MAX,
  clampLimit,
  deeplinkInput,
  normalizeKeyword,
  priceText,
  productUrlOf,
  type CoupangErrorCode,
} from "./coupang-api-core";
import { createWindowLimiter, type WindowLimiter } from "./rate-limit";
import { DEFAULT_POST_DISCLOSURE } from "./shop-post-types";
import { createServiceClient } from "./supabase-server";
import { generateToolToken, loadToolToken, saveToolToken, sameToolToken } from "./tool-token";

// 도구 API 호출 제한: 접속 주소(IP)마다 분당 10회, 전체 분당 30회 (토큰 맞히기 시도도 센다)
export const TOOL_CALLS_PER_MINUTE_PER_IP = 10;
export const TOOL_CALLS_PER_MINUTE_TOTAL = 30;

export type ToolApiDeps = {
  loadToken(): Promise<string | null>;
  client(): CoupangClient;
  perIp: WindowLimiter;
  total: WindowLimiter;
};

const NO_STORE = { "cache-control": "no-store" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

const STATUS_OF: Record<CoupangErrorCode, number> = { no_keys: 503, rate_limited: 429, auth: 502, bad_input: 400, upstream: 502 };

function errorResponse(e: unknown): Response {
  if (e instanceof CoupangApiError) {
    const retry: Record<string, string> = e.code === "rate_limited" ? { "retry-after": String(e.retryAfterSec ?? 3600) } : {};
    return json({ error: e.message, code: e.code }, STATUS_OF[e.code], retry);
  }
  // 모르는 오류는 내용을 내보내지 않는다 (키·내부 정보가 섞일 수 있음)
  console.error("[도구 API] 처리 중 오류", e instanceof Error ? e.name : typeof e);
  return json({ error: "서버 오류예요 — 잠시 뒤 다시 해 주세요", code: "server" }, 500);
}

// nginx 뒤에서 돈다 → 맨 앞 x-forwarded-for, 없으면 x-real-ip
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (xff || req.headers.get("x-real-ip")?.trim() || "unknown").slice(0, 64);
}

const tooMany = (retryAfterSec: number) =>
  json({ error: `요청이 너무 잦아요 — ${retryAfterSec}초 뒤에 다시 해 주세요`, code: "too_many_requests" }, 429, { "retry-after": String(retryAfterSec) });

// 통과하면 null, 아니면 돌려줄 응답.
// IP별 제한은 토큰 검사 전에(틀린 토큰 반복 시도도 센다), 전체 제한은 토큰을 통과한 요청만 센다
// — 토큰 없는 요청을 쏟아부어 전체 한도를 바닥내 사장님 챗GPT 까지 막는 일이 없게 (2026-11-24 검수)
async function authorizeTool(req: Request, deps: ToolApiDeps): Promise<Response | null> {
  const ip = deps.perIp.take(clientIp(req));
  if (!ip.ok) return tooMany(ip.retryAfterSec);
  const expected = await deps.loadToken().catch(() => null);
  if (!expected) {
    return json({ error: "도구 토큰이 아직 없어요 — 사이트 관리자 화면(⚙️ 설정 → 챗GPT 연결)에서 '도구 토큰 새로 만들기'를 먼저 해 주세요", code: "not_configured" }, 503);
  }
  const given = bearerToken(req.headers.get("authorization")).trim();
  if (!given || !sameToolToken(given, expected)) {
    return json({ error: "도구 토큰이 없거나 맞지 않아요 — 챗GPT Actions 인증에 관리자 화면에서 만든 토큰을 넣어 주세요", code: "forbidden" }, 403);
  }
  const total = deps.total.take("");
  if (!total.ok) return tooMany(total.retryAfterSec);
  return null;
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const b: unknown = await req.json().catch(() => null);
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
}

// 2026-11-24 01:02 UTC → "11월 24일 10:02"
export function kstLabel(iso: string): string {
  const d = new Date(Date.parse(iso) + 9 * 3600_000);
  if (!Number.isFinite(d.getTime())) return "";
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export async function handleToolSearch(req: Request, deps: ToolApiDeps): Promise<Response> {
  const denied = await authorizeTool(req, deps);
  if (denied) return denied;
  try {
    const body = await readBody(req);
    const keyword = normalizeKeyword(body.keyword);
    const r = await deps.client().search(keyword, clampLimit(body.limit));
    return json({
      keyword: r.keyword,
      fetchedAt: r.fetchedAt,
      cached: r.cached,
      notice: `가격·로켓배송 여부는 ${kstLabel(r.fetchedAt)}(한국 시간) 기준이고 바뀔 수 있어요. 파트너스 링크는 deeplink 작업에 productId 를 넣어 만드세요.`,
      products: r.products.map((p) => ({
        productId: p.productId,
        name: p.name,
        price: p.price,
        priceText: priceText(p.price),
        isRocket: p.isRocket,
        isFreeShipping: p.isFreeShipping,
        image: p.image,
        url: p.url,
        productPageUrl: /^\d+$/.test(p.productId) ? productUrlOf(p.productId) : null,
        categoryName: p.categoryName,
        rank: p.rank,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

type LinkRow =
  | { input: string; status: "ok"; originalUrl: string; partnersUrl: string; cached: boolean }
  | { input: string; status: "already"; partnersUrl: string; message: string }
  | { input: string; status: "invalid" | "failed"; message: string };

export async function handleToolDeeplink(req: Request, deps: ToolApiDeps): Promise<Response> {
  const denied = await authorizeTool(req, deps);
  if (denied) return denied;
  try {
    const body = await readBody(req);
    const raw: unknown[] = [
      ...(Array.isArray(body.urls) ? body.urls : []),
      ...(body.url !== undefined ? [body.url] : []),
      ...(Array.isArray(body.productIds) ? body.productIds : []),
    ];
    if (!raw.length) throw new CoupangApiError("bad_input", "바꿀 쿠팡 상품 주소(url·urls)나 상품 번호(productIds)를 넣어 주세요");
    if (raw.length > DEEPLINK_URLS_MAX) throw new CoupangApiError("bad_input", `한 번에 ${DEEPLINK_URLS_MAX}개까지만 바꿀 수 있어요`);
    const inputs = raw.map(deeplinkInput);
    const urls = inputs.flatMap((i) => ("url" in i ? [i.url] : []));
    if (!urls.length && !inputs.some((i) => "already" in i)) {
      throw new CoupangApiError("bad_input", "쿠팡 상품 주소(https://www.coupang.com/vp/products/…)나 상품 번호만 바꿀 수 있어요");
    }
    const got = urls.length ? await deps.client().deeplink(urls) : new Map();
    const links: LinkRow[] = inputs.map((i) => {
      if ("already" in i) return { input: i.input, status: "already", partnersUrl: i.input, message: "이미 쿠팡 파트너스 링크예요 — 그대로 쓰면 돼요" };
      if ("invalid" in i) return { input: i.input, status: "invalid", message: "쿠팡 상품 주소나 상품 번호가 아니에요" };
      const link = got.get(i.url);
      if (!link) return { input: i.input, status: "failed", message: "쿠팡이 이 주소의 링크를 돌려주지 않았어요 — 주소를 확인해 주세요" };
      return { input: i.input, status: "ok", originalUrl: link.originalUrl, partnersUrl: link.shortenUrl, cached: link.cached };
    });
    return json({ links, disclosure: `글에 링크를 넣을 때는 이 문구를 함께 적어야 해요: "${DEFAULT_POST_DISCLOSURE}"` });
  } catch (e) {
    return errorResponse(e);
  }
}

// ---------- 관리자: 도구 토큰 새로 만들기 ----------

export type ToolTokenDeps = { isAdmin(token: string): Promise<boolean>; save(token: string): Promise<string> };

export async function handleToolTokenCreate(req: Request, deps: ToolTokenDeps): Promise<Response> {
  const admin = bearerToken(req.headers.get("authorization"));
  if (!admin || !(await deps.isAdmin(admin).catch(() => false))) return json({ error: "관리자만 가능 — 다시 로그인해 주세요" }, 403);
  const token = generateToolToken();
  try {
    const createdAt = await deps.save(token);
    return json({ token, createdAt });
  } catch {
    return json({ error: "토큰을 저장하지 못했어요 — 서버의 SUPABASE_SERVICE_ROLE_KEY 설정을 확인해 주세요" }, 500);
  }
}

// ---------- 서버 기본 의존성 ----------

const LIMITS_KEY = "__eloanToolLimits";
type GlobalWithLimits = typeof globalThis & { [LIMITS_KEY]?: { perIp: WindowLimiter; total: WindowLimiter } };

function sharedToolLimits() {
  const g = globalThis as GlobalWithLimits;
  g[LIMITS_KEY] ??= {
    perIp: createWindowLimiter({ limit: TOOL_CALLS_PER_MINUTE_PER_IP, windowMs: 60_000 }),
    total: createWindowLimiter({ limit: TOOL_CALLS_PER_MINUTE_TOTAL, windowMs: 60_000 }),
  };
  return g[LIMITS_KEY];
}

// service role 이 없으면(서버 설정 누락) 토큰을 못 읽음 → "토큰 없음"(503)으로 안내된다
function serviceClientOrNull() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

export function defaultToolApiDeps(): ToolApiDeps {
  const sb = serviceClientOrNull();
  return {
    loadToken: async () => (sb ? loadToolToken(sb) : null),
    client: () =>
      sharedCoupangClient(() => ({
        // 키는 호출할 때마다 읽는다 (관리자 화면에서 바꾸면 바로 반영). 캐시에서 답하면 읽지 않는다
        loadKeys: async () => {
          const c = serviceClientOrNull();
          return c ? loadCoupangKeys(c) : null;
        },
      })),
    ...sharedToolLimits(),
  };
}

