// 쿠팡 파트너스 Open API 호출 (서버 전용 — 키는 shop_secrets 에서 service role 로만 읽는다. 브라우저에서 import 하지 않는다).
// 사장님 결정(2026-11-24): 쿠팡 키는 챗GPT 도구(MCP 서버 src/app/api/mcp/*, 도구 API src/app/api/tools/coupang/*)에만 쓴다. 사이트 글·노션 동기화는 쓰지 않는다.
// 서명·응답 읽기는 src/lib/coupang-api-core.ts (순수 — 테스트).
//
// 호출 한도: 공식 수치는 확인 못 함 (공식 문서는 로그인 필요). 공개 자료 두 곳이
//  "검색 API 는 시간당 약 10회"(github bobberrisford/affiliatemcp adapter.ts 주석),
//  "시간당 30회를 넘기면 24시간 정지, 정지 3번이면 계정 정지"(npm n8n-nodes-coupang-partners 설명)라고 적고 있다.
//  → 계정 정지를 피하려고 우리 쪽에서 먼저 막는다: 검색 시간당 10회, 딥링크 시간당 15회 (합쳐도 30회 미만 — src/lib/coupang-limits.ts).
//  같은 검색어는 6시간, 같은 주소의 딥링크는 7일 동안 메모리 캐시에서 돌려준다 (쿠팡을 다시 부르지 않음).
//  쿠팡이 한도 초과(429)라고 답하면 1시간 동안 그 종류 호출을 막는다.
// 로그에는 키·토큰·서명을 찍지 않는다.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COUPANG_HOST,
  COUPANG_PATHS,
  CoupangApiError,
  NO_KEYS_MESSAGE,
  SEARCH_LIMIT_MAX,
  coupangAuthorization,
  errorFromHttp,
  parseDeeplinkResponse,
  parseSearchResponse,
  rateLimitedMessage,
  searchQuery,
  type CoupangDeeplink,
  type CoupangProduct,
} from "./coupang-api-core";
import { DEEPLINK_CACHE_DAYS, DEEPLINK_CALLS_PER_HOUR, SEARCH_CACHE_HOURS, SEARCH_CALLS_PER_HOUR } from "./coupang-limits";
import { createWindowLimiter, type WindowLimiter } from "./rate-limit";

export { SEARCH_CALLS_PER_HOUR, DEEPLINK_CALLS_PER_HOUR };
export const SEARCH_CACHE_MS = SEARCH_CACHE_HOURS * 3600_000;
export const DEEPLINK_CACHE_MS = DEEPLINK_CACHE_DAYS * 24 * 3600_000;
export const RATE_LIMITED_BLOCK_MS = 3600_000;
const HOUR_MS = 3600_000;
const REQUEST_TIMEOUT_MS = 15_000;
const CACHE_MAX = 500;

export type CoupangKeys = { accessKey: string; secretKey: string };

export type SearchResult = { keyword: string; products: CoupangProduct[]; fetchedAt: string; cached: boolean };

export type CoupangClient = {
  search(keyword: string, limit?: number): Promise<SearchResult>;
  // 주소 → 파트너스 링크. 돌려받지 못한 주소는 Map 에 없다
  deeplink(urls: string[]): Promise<Map<string, CoupangDeeplink & { cached: boolean }>>;
};

export type CoupangClientDeps = {
  loadKeys(): Promise<CoupangKeys | null>;
  fetch?: typeof fetch;
  now?: () => number;
  limits?: { search?: WindowLimiter; deeplink?: WindowLimiter };
};

type Cached<T> = { at: number; value: T };

function remember<T>(map: Map<string, Cached<T>>, key: string, value: T, at: number) {
  map.delete(key);
  if (map.size >= CACHE_MAX) map.delete(map.keys().next().value as string);
  map.set(key, { at, value });
}

export function createCoupangClient(deps: CoupangClientDeps): CoupangClient {
  const doFetch = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  const searchLimit = deps.limits?.search ?? createWindowLimiter({ limit: SEARCH_CALLS_PER_HOUR, windowMs: HOUR_MS, now });
  const deeplinkLimit = deps.limits?.deeplink ?? createWindowLimiter({ limit: DEEPLINK_CALLS_PER_HOUR, windowMs: HOUR_MS, now });
  const searchCache = new Map<string, Cached<{ products: CoupangProduct[]; fetchedAt: string }>>();
  const linkCache = new Map<string, Cached<CoupangDeeplink>>();

  async function keys(): Promise<CoupangKeys> {
    const k = await deps.loadKeys().catch(() => null);
    if (!k?.accessKey || !k.secretKey) throw new CoupangApiError("no_keys", NO_KEYS_MESSAGE);
    return k;
  }

  // 한 번 호출. 한도는 키를 확인한 뒤에 쓴다 (키가 없을 때 한도를 깎지 않게)
  async function call(limiter: WindowLimiter, method: "GET" | "POST", path: string, query: string, body?: unknown): Promise<unknown> {
    const k = await keys();
    const slot = limiter.take();
    if (!slot.ok) throw new CoupangApiError("rate_limited", rateLimitedMessage(slot.retryAfterSec), slot.retryAfterSec);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await doFetch(`${COUPANG_HOST}${path}${query ? `?${query}` : ""}`, {
        method,
        headers: {
          Authorization: coupangAuthorization({ accessKey: k.accessKey, secretKey: k.secretKey, method, path, query, date: new Date(now()) }),
          "Content-Type": "application/json;charset=UTF-8",
          Accept: "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: ctrl.signal,
        cache: "no-store",
      });
    } catch {
      throw new CoupangApiError("upstream", "쿠팡 서버에 연결하지 못했어요 — 잠시 뒤 다시 해 주세요");
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const err = errorFromHttp(res.status, text);
      if (err.code === "rate_limited") limiter.block(RATE_LIMITED_BLOCK_MS);
      throw err;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new CoupangApiError("upstream", "쿠팡 응답을 읽지 못했어요");
    }
  }

  const blockOnLimit = (limiter: WindowLimiter, e: unknown) => {
    if (e instanceof CoupangApiError && e.code === "rate_limited") limiter.block(RATE_LIMITED_BLOCK_MS);
    throw e;
  };

  return {
    async search(keyword, limit = SEARCH_LIMIT_MAX) {
      const key = keyword.toLowerCase();
      const n = Math.min(SEARCH_LIMIT_MAX, Math.max(1, limit));
      const hit = searchCache.get(key);
      if (hit && now() - hit.at < SEARCH_CACHE_MS) {
        return { keyword, products: hit.value.products.slice(0, n), fetchedAt: hit.value.fetchedAt, cached: true };
      }
      // 캐시를 잘 쓰려고 언제나 최대 개수로 받아 두고 잘라서 돌려준다
      const json = await call(searchLimit, "GET", COUPANG_PATHS.search, searchQuery(keyword, SEARCH_LIMIT_MAX));
      let products: CoupangProduct[];
      try {
        products = parseSearchResponse(json);
      } catch (e) {
        return blockOnLimit(searchLimit, e);
      }
      const fetchedAt = new Date(now()).toISOString();
      remember(searchCache, key, { products, fetchedAt }, now());
      return { keyword, products: products.slice(0, n), fetchedAt, cached: false };
    },

    async deeplink(urls) {
      const out = new Map<string, CoupangDeeplink & { cached: boolean }>();
      const todo: string[] = [];
      for (const u of Array.from(new Set(urls))) {
        const hit = linkCache.get(u);
        if (hit && now() - hit.at < DEEPLINK_CACHE_MS) out.set(u, { ...hit.value, cached: true });
        else todo.push(u);
      }
      if (!todo.length) return out;
      const json = await call(deeplinkLimit, "POST", COUPANG_PATHS.deeplink, "", { coupangUrls: todo });
      let got: Map<string, CoupangDeeplink>;
      try {
        got = parseDeeplinkResponse(json, todo);
      } catch (e) {
        return blockOnLimit(deeplinkLimit, e);
      }
      for (const [u, link] of Array.from(got)) {
        remember(linkCache, u, link, now());
        out.set(u, { ...link, cached: false });
      }
      return out;
    },
  };
}

// ---------- 서버 기본값 ----------

// 키: 관리자 화면 ⚙️ 설정에서 저장한 shop_secrets (service role 로만 읽힘 — RLS 정책 없음)
export async function loadCoupangKeys(sb: SupabaseClient): Promise<CoupangKeys | null> {
  const { data, error } = await sb.from("shop_secrets").select("name,value").in("name", ["COUPANG_ACCESS_KEY", "COUPANG_SECRET_KEY"]);
  if (error || !data) return null;
  const v = (n: string) => String((data as { name: string; value: unknown }[]).find((r) => r.name === n)?.value ?? "").trim();
  const accessKey = v("COUPANG_ACCESS_KEY");
  const secretKey = v("COUPANG_SECRET_KEY");
  return accessKey && secretKey ? { accessKey, secretKey } : null;
}

// 프로세스 하나에 클라이언트 하나 (캐시·한도를 라우트끼리 나눠 쓰게 globalThis 에 둔다 — 라우트마다 묶음이 따로여도 같은 값)
const GLOBAL_KEY = "__eloanCoupangClient";
type GlobalWithClient = typeof globalThis & { [GLOBAL_KEY]?: CoupangClient };

export function sharedCoupangClient(makeDeps: () => CoupangClientDeps): CoupangClient {
  const g = globalThis as GlobalWithClient;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = createCoupangClient(makeDeps());
  return g[GLOBAL_KEY]!;
}
