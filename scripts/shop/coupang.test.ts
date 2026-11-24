// 쿠팡 파트너스 API·챗GPT 도구 API 회귀 테스트 — 실제 쿠팡은 부르지 않는다 (가짜 fetch). 실행: npm run test:shop
//  - 서명 문자열 (src/lib/coupang-api-core.ts) · 응답 읽기 · 입력 정리
//  - 호출·캐시·한도 (src/lib/coupang-api.ts) · 키 없음 오류
//  - 도구 API 토큰 검사·호출 제한·응답 (src/lib/coupang-tools.ts) · 관리자 도구 토큰 만들기 · OpenAPI 문서
//  - MCP 서버 (src/lib/mcp-server.ts · src/lib/mcp-coupang.ts, 라우트 /api/mcp · /api/mcp/<토큰>)
// 키·토큰은 전부 가짜 값이다.

import assert from "node:assert/strict";
import { DELETE as mcpDelete, GET as mcpGet } from "@/app/api/mcp/route";
import { GET as mcpTokenGet } from "@/app/api/mcp/[token]/route";
import { GET as openApiGet } from "@/app/api/tools/coupang/openapi.json/route";
import { createCoupangClient, SEARCH_CACHE_MS, type CoupangKeys } from "@/lib/coupang-api";
import {
  COUPANG_HOST,
  COUPANG_PATHS,
  CoupangApiError,
  coupangAuthorization,
  coupangProductId,
  coupangSignature,
  coupangSignedDate,
  deeplinkInput,
  errorFromHttp,
  parseDeeplinkResponse,
  parseSearchResponse,
  searchQuery,
} from "@/lib/coupang-api-core";
import { TOOL_PATHS } from "@/lib/coupang-openapi";
import { handleToolDeeplink, handleToolSearch, handleToolTokenCreate, kstLabel, type ToolApiDeps } from "@/lib/coupang-tools";
import { mcpUrlWithToken } from "@/lib/mcp-endpoint";
import { MCP_TOOL_NAMES, handleCoupangMcp } from "@/lib/mcp-coupang";
import { LEGACY_VERSIONS, decodeHeaderValue, negotiateLegacyVersion } from "@/lib/mcp-server";
import { createWindowLimiter } from "@/lib/rate-limit";
import { generateToolToken, sameToolToken } from "@/lib/tool-token";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// 가짜 키 (실제 값 아님)
const KEYS: CoupangKeys = { accessKey: "AK-test-0000", secretKey: "test-secret-key" };
const FIXED = Date.parse("2026-11-24T01:02:03.456Z");

const searchSample = (names: string[]) => ({
  rCode: "0",
  rMessage: "",
  data: {
    landingUrl: "https://link.coupang.com/re/AFFSRP?lptag=AF0000000&keyword=x",
    productData: names.map((n, i) => ({
      rank: i + 1,
      isRocket: i === 0,
      isFreeShipping: true,
      productId: 1000 + i,
      productImage: `https://static.coupangcdn.com/image/${i}.jpg`,
      productName: n,
      productPrice: 129000 + i,
      productUrl: `https://link.coupang.com/re/AFFSDP?lptag=AF0000000&pageKey=${1000 + i}`,
      categoryName: "생활가전",
      keyword: "청소기",
    })),
  },
});

type Call = { url: string; init: RequestInit };
function fakeFetch(respond: (c: Call) => { status?: number; body: unknown }) {
  const calls: Call[] = [];
  const fn = (async (url: string | URL, init?: RequestInit) => {
    const c = { url: String(url), init: init ?? {} };
    calls.push(c);
    const r = respond(c);
    return new Response(typeof r.body === "string" ? r.body : JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as typeof fetch;
  return { fn, calls };
}

const header = (c: Call, name: string) => new Headers(c.init.headers).get(name) ?? "";

async function rejectsCode(p: Promise<unknown>, code: string, msg?: RegExp) {
  await assert.rejects(p, (e: unknown) => {
    assert.ok(e instanceof CoupangApiError, "CoupangApiError 여야 함");
    assert.equal(e.code, code);
    if (msg) assert.match(e.message, msg);
    return true;
  });
}

const TOKEN = `eloan_tool_${"x".repeat(43)}`; // 가짜 도구 토큰

function toolDeps(o: { token?: string | null; client?: ReturnType<typeof createCoupangClient>; perIp?: number; total?: number } = {}): ToolApiDeps {
  const fake = fakeFetch(() => ({ body: searchSample(["무선 청소기 A", "무선 청소기 B"]) }));
  return {
    loadToken: async () => (o.token === undefined ? TOKEN : o.token),
    client: () => o.client ?? createCoupangClient({ loadKeys: async () => KEYS, fetch: fake.fn }),
    perIp: createWindowLimiter({ limit: o.perIp ?? 100, windowMs: 60_000 }),
    total: createWindowLimiter({ limit: o.total ?? 1000, windowMs: 60_000 }),
  };
}

const post = (path: string, body: unknown, auth?: string, ip = "203.0.113.7") =>
  new Request(`https://www.eloan.kr${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  });

type McpToolJson = { name: string; description: string; inputSchema: Record<string, unknown>; annotations: Record<string, boolean> };

// MCP 요청 — 기본은 주소 방식(/api/mcp/<토큰>). auth: "header" 는 /api/mcp + Bearer, "none" 은 토큰 없이 /api/mcp
function mcpCall(
  body: unknown,
  o: { deps?: ToolApiDeps; auth?: "path" | "header" | "none"; token?: string; ip?: string; extraHeaders?: Record<string, string> } = {},
): Promise<Response> {
  const auth = o.auth ?? "path";
  const token = o.token ?? TOKEN;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "x-forwarded-for": o.ip ?? "203.0.113.50",
    ...(auth === "header" ? { authorization: `Bearer ${token}` } : {}),
    ...o.extraHeaders,
  };
  const path = auth === "path" ? `/api/mcp/${token}` : "/api/mcp";
  const req = new Request(`https://www.eloan.kr${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  return handleCoupangMcp(req, o.deps ?? toolDeps(), auth === "path" ? token : undefined);
}

async function main() {
  console.log("쿠팡 API 서명·응답");

  await test("서명: signed-date 는 UTC yyMMdd'T'HHmmss'Z'", () => {
    assert.equal(coupangSignedDate(new Date(FIXED)), "261124T010203Z");
    assert.equal(coupangSignedDate(new Date("2027-01-05T23:59:09Z")), "270105T235909Z");
  });

  await test("서명: 공개 Python 예제(uju777/coupang-mcp 방식, hmac+urlencode)로 계산한 값과 같다", () => {
    // 기대값은 같은 고정 입력으로 Python hmac.new(secret, signed_date+method+path+urlencode(query), sha256).hexdigest() 로 계산
    const q = searchQuery("에어팟", 5);
    assert.equal(q, "keyword=%EC%97%90%EC%96%B4%ED%8C%9F&limit=5");
    assert.equal(coupangSignature(KEYS.secretKey, "261124T010203Z", "GET", COUPANG_PATHS.search, q), "abb97b3951873fb827b36e07e3f759ee2717497d4a5092ce373428c2978b339a");
    assert.equal(coupangSignature(KEYS.secretKey, "261124T010203Z", "POST", COUPANG_PATHS.deeplink, ""), "12ff8a7a68fac042406408d167d58f3df47bc2b52809bc3d63afd4e68e3d3877");
  });

  await test("서명: Authorization 헤더 모양", () => {
    const h = coupangAuthorization({ ...KEYS, method: "POST", path: COUPANG_PATHS.deeplink, query: "", date: new Date(FIXED) });
    assert.equal(h, "CEA algorithm=HmacSHA256, access-key=AK-test-0000, signed-date=261124T010203Z, signature=12ff8a7a68fac042406408d167d58f3df47bc2b52809bc3d63afd4e68e3d3877");
    assert.ok(!h.includes(KEYS.secretKey)); // 비밀키 원문은 헤더에 없다
  });

  await test("검색 응답: 숫자·문자열 가격, 쿠팡 밖 주소·빈 줄은 버림, data 가 배열이어도 읽음", () => {
    const sample = searchSample(["A 청소기", "B 청소기"]);
    const rows = sample.data.productData as Record<string, unknown>[];
    rows[1].productPrice = "12,900";
    rows[1].productImage = "https://evil.example.com/x.jpg";
    rows.push({ productId: 9, productName: "" }); // 이름 없음 → 버림
    const got = parseSearchResponse(sample);
    assert.equal(got.length, 2);
    assert.deepEqual(
      { id: got[0].productId, price: got[0].price, rocket: got[0].isRocket, image: got[0].image?.startsWith("https://static.coupangcdn.com/") },
      { id: "1000", price: 129000, rocket: true, image: true },
    );
    assert.equal(got[1].price, 12900);
    assert.equal(got[1].image, null);
    assert.equal(parseSearchResponse({ rCode: "0", data: [{ productId: "5", productName: "C", productUrl: "https://www.coupang.com/vp/products/5" }] }).length, 1);
    assert.deepEqual(parseSearchResponse({ rCode: "0", data: null }), []);
  });

  await test("검색 응답: rCode 오류는 사람이 읽을 오류, 한도 문구면 rate_limited", () => {
    assert.throws(() => parseSearchResponse({ rCode: "400", rMessage: "keyword is required" }), (e: unknown) => e instanceof CoupangApiError && e.code === "upstream" && /keyword is required/.test(e.message));
    assert.throws(() => parseSearchResponse({ rCode: "429", rMessage: "Too many requests" }), (e: unknown) => e instanceof CoupangApiError && e.code === "rate_limited");
    assert.equal(errorFromHttp(429, "").code, "rate_limited");
    assert.match(errorFromHttp(429, "").message, /한도/);
    assert.equal(errorFromHttp(401, "{}").code, "auth");
    assert.equal(errorFromHttp(500, "<html>").code, "upstream");
  });

  await test("딥링크 응답: originalUrl 로 짝짓고, 없으면 순서로, 쿠팡 밖 링크는 버림", () => {
    const a = "https://www.coupang.com/vp/products/1";
    const b = "https://www.coupang.com/vp/products/2";
    const m = parseDeeplinkResponse(
      { rCode: "0", data: [{ originalUrl: b, shortenUrl: "https://link.coupang.com/a/bbb", landingUrl: "https://link.coupang.com/re/AFFSDP?x=2" }, { originalUrl: a, shortenUrl: "https://link.coupang.com/a/aaa" }] },
      [a, b],
    );
    assert.equal(m.get(a)?.shortenUrl, "https://link.coupang.com/a/aaa");
    assert.equal(m.get(b)?.shortenUrl, "https://link.coupang.com/a/bbb");
    const byOrder = parseDeeplinkResponse({ rCode: "0", data: [{ shortenUrl: "https://link.coupang.com/a/ccc" }] }, [a]);
    assert.equal(byOrder.get(a)?.shortenUrl, "https://link.coupang.com/a/ccc");
    assert.equal(parseDeeplinkResponse({ rCode: "0", data: [{ originalUrl: a, shortenUrl: "https://evil.example.com/a" }] }, [a]).size, 0);
  });

  await test("딥링크 입력: 상품 번호·일반 주소(http→https)·이미 파트너스 링크·다른 사이트", () => {
    assert.deepEqual(deeplinkInput(123), { input: "123", url: "https://www.coupang.com/vp/products/123" });
    assert.deepEqual(deeplinkInput(" http://www.coupang.com/vp/products/77?itemId=8 "), { input: "http://www.coupang.com/vp/products/77?itemId=8", url: "https://www.coupang.com/vp/products/77?itemId=8" });
    assert.ok("already" in deeplinkInput("https://link.coupang.com/a/abc123"));
    assert.ok("invalid" in deeplinkInput("https://www.example.com/vp/products/1"));
    assert.ok("invalid" in deeplinkInput({}));
    assert.equal(coupangProductId("https://m.coupang.com/vp/products/12345?vendorItemId=1"), "12345");
    assert.equal(coupangProductId("https://link.coupang.com/a/abc"), null);
  });

  console.log("쿠팡 API 호출·캐시·한도");

  await test("키 없음: 쿠팡을 부르지 않고 '관리자 설정에서 쿠팡 키를 넣어 주세요' 오류", async () => {
    const f = fakeFetch(() => ({ body: {} }));
    const c = createCoupangClient({ loadKeys: async () => null, fetch: f.fn });
    await rejectsCode(c.search("청소기"), "no_keys", /관리자 설정에서 쿠팡 키/);
    await rejectsCode(c.deeplink(["https://www.coupang.com/vp/products/1"]), "no_keys");
    const half = createCoupangClient({ loadKeys: async () => ({ accessKey: "AK", secretKey: "" }), fetch: f.fn });
    await rejectsCode(half.search("청소기"), "no_keys");
    assert.equal(f.calls.length, 0);
  });

  await test("검색: 서명한 쿼리 = 보낸 쿼리, 10개 받아 잘라 주고, 같은 검색어는 6시간 캐시", async () => {
    let now = FIXED;
    const f = fakeFetch(() => ({ body: searchSample(["A", "B", "C"]) }));
    const c = createCoupangClient({ loadKeys: async () => KEYS, fetch: f.fn, now: () => now });
    const r1 = await c.search("무선 청소기", 2);
    const q = searchQuery("무선 청소기", 10);
    assert.equal(f.calls[0].url, `${COUPANG_HOST}${COUPANG_PATHS.search}?${q}`);
    assert.equal(header(f.calls[0], "authorization"), coupangAuthorization({ ...KEYS, method: "GET", path: COUPANG_PATHS.search, query: q, date: new Date(FIXED) }));
    assert.deepEqual([r1.products.length, r1.cached], [2, false]);
    const r2 = await c.search("무선 청소기", 3);
    assert.deepEqual([r2.products.length, r2.cached, f.calls.length], [3, true, 1]);
    now += SEARCH_CACHE_MS + 1;
    assert.equal((await c.search("무선 청소기")).cached, false);
    assert.equal(f.calls.length, 2);
  });

  await test("검색: 쿠팡 429 → 사람이 읽을 한도 오류, 그 뒤 1시간은 쿠팡을 부르지 않음", async () => {
    const f = fakeFetch(() => ({ status: 429, body: { rCode: "429", rMessage: "Too Many Requests" } }));
    const c = createCoupangClient({ loadKeys: async () => KEYS, fetch: f.fn });
    await rejectsCode(c.search("청소기"), "rate_limited", /한도/);
    await rejectsCode(c.search("가습기"), "rate_limited");
    assert.equal(f.calls.length, 1);
  });

  await test("검색: 우리 쪽 시간당 한도를 넘으면 쿠팡을 부르기 전에 막음", async () => {
    const f = fakeFetch(() => ({ body: searchSample(["A"]) }));
    const c = createCoupangClient({ loadKeys: async () => KEYS, fetch: f.fn, limits: { search: createWindowLimiter({ limit: 2, windowMs: 3600_000 }) } });
    await c.search("하나");
    await c.search("둘");
    await rejectsCode(c.search("셋"), "rate_limited", /분 뒤/);
    assert.equal(f.calls.length, 2);
    assert.equal((await c.search("하나")).cached, true); // 캐시는 한도와 상관없이
  });

  await test("딥링크: body {coupangUrls}, 받은 링크는 캐시 (두 번째는 안 부름)", async () => {
    const u = "https://www.coupang.com/vp/products/42";
    const f = fakeFetch((c) => {
      const body = JSON.parse(String(c.init.body)) as { coupangUrls: string[] };
      return { body: { rCode: "0", data: body.coupangUrls.map((x) => ({ originalUrl: x, shortenUrl: "https://link.coupang.com/a/zzz" })) } };
    });
    const c = createCoupangClient({ loadKeys: async () => KEYS, fetch: f.fn });
    const r1 = await c.deeplink([u, u]);
    assert.equal(f.calls[0].init.method, "POST");
    assert.deepEqual(JSON.parse(String(f.calls[0].init.body)), { coupangUrls: [u] });
    assert.deepEqual([r1.get(u)?.shortenUrl, r1.get(u)?.cached], ["https://link.coupang.com/a/zzz", false]);
    assert.equal((await c.deeplink([u])).get(u)?.cached, true);
    assert.equal(f.calls.length, 1);
  });

  await test("호출 제한기: 창이 지나면 다시 허용", () => {
    let t = 0;
    const l = createWindowLimiter({ limit: 1, windowMs: 1000, now: () => t });
    assert.equal(l.take("a").ok, true);
    assert.equal(l.take("a").ok, false);
    assert.equal(l.take("b").ok, true); // 키마다 따로
    t = 1001;
    assert.equal(l.take("a").ok, true);
    l.block(5000, "a");
    assert.equal(l.peek("a").ok, false);
  });

  console.log("챗GPT 도구 API");

  await test("도구 토큰: 상수 시간 비교 — 맞음·틀림·짧은 저장값·앞뒤 공백", () => {
    const t = generateToolToken();
    assert.ok(t.startsWith("eloan_tool_") && t.length >= 50);
    assert.notEqual(t, generateToolToken());
    assert.equal(sameToolToken(t, t), true);
    assert.equal(sameToolToken(` ${t} `, t), true);
    assert.equal(sameToolToken(`${t}x`, t), false);
    assert.equal(sameToolToken("", t), false);
    assert.equal(sameToolToken("short", "short"), false); // 저장값이 너무 짧으면 언제나 거절
  });

  await test("도구 API: 토큰을 아직 안 만들었으면 503 안내", async () => {
    const res = await handleToolSearch(post(TOOL_PATHS.search, { keyword: "청소기" }, `Bearer ${TOKEN}`), toolDeps({ token: null }));
    assert.equal(res.status, 503);
    assert.match(((await res.json()) as { error: string }).error, /도구 토큰 새로 만들기/);
  });

  await test("도구 API: 헤더 없음·틀린 토큰은 403, 맞는 토큰은 통과 (가짜 쿠팡)", async () => {
    const deps = toolDeps();
    assert.equal((await handleToolSearch(post(TOOL_PATHS.search, { keyword: "청소기" }), deps)).status, 403);
    assert.equal((await handleToolSearch(post(TOOL_PATHS.search, { keyword: "청소기" }, `Bearer ${TOKEN}y`), deps)).status, 403);
    assert.equal((await handleToolDeeplink(post(TOOL_PATHS.deeplink, { url: "https://www.coupang.com/vp/products/1" }, "Bearer wrong"), deps)).status, 403);
    const ok = await handleToolSearch(post(TOOL_PATHS.search, { keyword: " 무선  청소기 ", limit: 1 }, `Bearer ${TOKEN}`), deps);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("cache-control"), "no-store");
    const text = await ok.text();
    const body = JSON.parse(text) as { keyword: string; notice: string; products: { productId: string; priceText: string; isRocket: boolean; productPageUrl: string }[] };
    assert.equal(body.keyword, "무선 청소기");
    assert.deepEqual(body.products.map((p) => [p.productId, p.priceText, p.isRocket, p.productPageUrl]), [["1000", "129,000원", true, "https://www.coupang.com/vp/products/1000"]]);
    assert.match(body.notice, /기준.*바뀔 수 있어요/);
    // 응답에 쿠팡 키·도구 토큰이 실리지 않는다
    for (const secret of [KEYS.accessKey, KEYS.secretKey, TOKEN]) assert.ok(!text.includes(secret));
  });

  await test("도구 API: 쿠팡 키가 없으면 503 '관리자 설정에서 쿠팡 키', 검색어 없으면 400", async () => {
    const noKeys = toolDeps({ client: createCoupangClient({ loadKeys: async () => null, fetch: fakeFetch(() => ({ body: {} })).fn }) });
    const r = await handleToolSearch(post(TOOL_PATHS.search, { keyword: "청소기" }, `Bearer ${TOKEN}`), noKeys);
    assert.equal(r.status, 503);
    assert.match(((await r.json()) as { error: string }).error, /관리자 설정에서 쿠팡 키/);
    assert.equal((await handleToolSearch(post(TOOL_PATHS.search, { keyword: "  " }, `Bearer ${TOKEN}`), toolDeps())).status, 400);
  });

  await test("도구 API: 쿠팡 한도 초과는 429 + Retry-After", async () => {
    const limited = toolDeps({ client: createCoupangClient({ loadKeys: async () => KEYS, fetch: fakeFetch(() => ({ status: 429, body: "" })).fn }) });
    const r = await handleToolSearch(post(TOOL_PATHS.search, { keyword: "청소기" }, `Bearer ${TOKEN}`), limited);
    assert.equal(r.status, 429);
    assert.ok(Number(r.headers.get("retry-after")) > 0);
    assert.match(((await r.json()) as { error: string }).error, /한도/);
  });

  await test("도구 API: 같은 IP 가 분당 한도를 넘으면 429 (토큰 맞히기 시도도 셈)", async () => {
    const deps = toolDeps({ perIp: 2 });
    assert.equal((await handleToolSearch(post(TOOL_PATHS.search, { keyword: "a" }, "Bearer wrong", "198.51.100.1"), deps)).status, 403);
    assert.equal((await handleToolSearch(post(TOOL_PATHS.search, { keyword: "a" }, "Bearer wrong", "198.51.100.1"), deps)).status, 403);
    assert.equal((await handleToolSearch(post(TOOL_PATHS.search, { keyword: "a" }, `Bearer ${TOKEN}`, "198.51.100.1"), deps)).status, 429);
    assert.equal((await handleToolSearch(post(TOOL_PATHS.search, { keyword: "a" }, `Bearer ${TOKEN}`, "198.51.100.2"), deps)).status, 200);
  });

  // 2026-11-24 검수: 토큰 없는 요청이 전체 한도를 깎으면 사장님 챗GPT 까지 막힌다 → 전체 한도는 토큰 통과 뒤에만 센다
  await test("도구 API: 토큰 없는·틀린 요청은 전체 한도를 쓰지 않는다 (전체 한도는 통과한 요청만)", async () => {
    const deps = toolDeps({ total: 1 });
    for (const ip of ["192.0.2.1", "192.0.2.2", "192.0.2.3"]) {
      assert.equal((await handleToolSearch(post(TOOL_PATHS.search, { keyword: "a" }, "Bearer wrong", ip), deps)).status, 403, ip);
    }
    assert.equal((await handleToolSearch(post(TOOL_PATHS.search, { keyword: "a" }, `Bearer ${TOKEN}`, "192.0.2.9"), deps)).status, 200);
    assert.equal((await handleToolSearch(post(TOOL_PATHS.search, { keyword: "a" }, `Bearer ${TOKEN}`, "192.0.2.10"), deps)).status, 429);
  });

  await test("도구 API 딥링크: 주소마다 status (ok·already·invalid), 고지 문구, 너무 많으면 400", async () => {
    const f = fakeFetch((c) => {
      const body = JSON.parse(String(c.init.body)) as { coupangUrls: string[] };
      return { body: { rCode: "0", data: body.coupangUrls.map((x, i) => ({ originalUrl: x, shortenUrl: `https://link.coupang.com/a/t${i}` })) } };
    });
    const deps = toolDeps({ client: createCoupangClient({ loadKeys: async () => KEYS, fetch: f.fn }) });
    const r = await handleToolDeeplink(
      post(TOOL_PATHS.deeplink, { urls: ["https://www.coupang.com/vp/products/1", "https://link.coupang.com/a/old1", "https://naver.com"], productIds: ["2"] }, `Bearer ${TOKEN}`),
      deps,
    );
    assert.equal(r.status, 200);
    const body = (await r.json()) as { links: { status: string; partnersUrl?: string }[]; disclosure: string };
    assert.deepEqual(body.links.map((l) => l.status), ["ok", "already", "invalid", "ok"]);
    assert.deepEqual([body.links[0].partnersUrl, body.links[1].partnersUrl, body.links[3].partnersUrl], ["https://link.coupang.com/a/t0", "https://link.coupang.com/a/old1", "https://link.coupang.com/a/t1"]);
    assert.match(body.disclosure, /쿠팡 파트너스 활동/);
    assert.equal(f.calls.length, 1); // 바꿀 주소 2개를 한 번에
    const many = Array.from({ length: 6 }, (_, i) => `https://www.coupang.com/vp/products/${i}`);
    assert.equal((await handleToolDeeplink(post(TOOL_PATHS.deeplink, { urls: many }, `Bearer ${TOKEN}`), deps)).status, 400);
    assert.equal((await handleToolDeeplink(post(TOOL_PATHS.deeplink, { url: "https://naver.com" }, `Bearer ${TOKEN}`), deps)).status, 400);
  });

  await test("관리자 도구 토큰 만들기: 관리자가 아니면 403·저장 안 함, 관리자면 새 토큰을 저장하고 한 번 돌려줌", async () => {
    const saved: string[] = [];
    const deps = { isAdmin: async (t: string) => t === "admin-session", save: async (t: string) => (saved.push(t), "2026-11-24T01:02:03.000Z") };
    const denied = await handleToolTokenCreate(new Request("https://www.eloan.kr/api/admin/coupang/tool-token", { method: "POST", headers: { authorization: "Bearer someone" } }), deps);
    assert.equal(denied.status, 403);
    assert.equal(saved.length, 0);
    const ok = await handleToolTokenCreate(new Request("https://www.eloan.kr/api/admin/coupang/tool-token", { method: "POST", headers: { authorization: "Bearer admin-session" } }), deps);
    const body = (await ok.json()) as { token: string; createdAt: string };
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("cache-control"), "no-store");
    assert.deepEqual(saved, [body.token]);
    assert.ok(body.token.startsWith("eloan_tool_"));
    const failed = await handleToolTokenCreate(new Request("https://x/", { method: "POST", headers: { authorization: "Bearer admin-session" } }), { ...deps, save: async () => Promise.reject(new Error("db")) });
    assert.equal(failed.status, 500);
    assert.ok(!("token" in ((await failed.json()) as object))); // 저장 못 한 토큰은 보여 주지 않음
  });

  await test("OpenAPI 문서: 3.1, 서버 https://www.eloan.kr, bearer 인증, 작업 2개 한국어 설명 300자 이하", async () => {
    const res = openApiGet();
    const doc = (await res.json()) as {
      openapi: string;
      servers: { url: string }[];
      security: unknown[];
      components: { securitySchemes: Record<string, { type: string; scheme: string }> };
      paths: Record<string, { post: { operationId: string; description: string } }>;
    };
    assert.equal(doc.openapi, "3.1.0");
    assert.deepEqual(doc.servers, [{ url: "https://www.eloan.kr" }]);
    assert.deepEqual(doc.components.securitySchemes.bearerAuth, { type: "http", scheme: "bearer", description: "사이트 관리자 화면에서 만든 도구 토큰" });
    assert.deepEqual(doc.security, [{ bearerAuth: [] }]);
    assert.deepEqual(Object.keys(doc.paths).sort(), [TOOL_PATHS.deeplink, TOOL_PATHS.search].sort());
    assert.deepEqual(Object.values(doc.paths).map((p) => p.post.operationId).sort(), ["createCoupangPartnersLink", "searchCoupangProducts"]);
    for (const p of Object.values(doc.paths)) {
      assert.ok(p.post.description.length <= 300, "챗GPT 는 작업 설명 300자까지만");
      assert.match(p.post.description, /[가-힣]/);
    }
    assert.ok(!JSON.stringify(doc).includes("eloan_tool_")); // 문서에 토큰 없음
  });

  console.log("MCP 서버");

  await test("MCP initialize: 아는 버전은 그대로, 모르는 버전은 최신 legacy 버전, capabilities.tools·serverInfo", async () => {
    for (const v of ["2025-06-18", "2025-03-26", "2024-11-05", "2025-11-25"]) {
      const r = await mcpCall({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: v, capabilities: {}, clientInfo: { name: "t", version: "1" } } });
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-type") ?? "", /application\/json/);
      assert.equal(r.headers.get("mcp-session-id"), null); // 상태 없음 — 세션 id 를 만들지 않는다
      const b = (await r.json()) as { id: number; result: { protocolVersion: string; capabilities: unknown; serverInfo: { name: string; version: string } } };
      assert.equal(b.id, 1);
      assert.equal(b.result.protocolVersion, v);
      assert.deepEqual(b.result.capabilities, { tools: {} });
      assert.equal(b.result.serverInfo.name, "eloan-coupang");
      assert.ok(b.result.serverInfo.version);
    }
    const odd = (await (await mcpCall({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } })).json()) as { result: { protocolVersion: string } };
    assert.equal(odd.result.protocolVersion, LEGACY_VERSIONS[0]);
    assert.equal(negotiateLegacyVersion(undefined), "2025-11-25");
  });

  await test("MCP tools/list: 도구 2개, 읽기 전용 annotations, JSON Schema 입력, 한국어 설명에 파트너스 링크 안내", async () => {
    const b = (await (await mcpCall({ jsonrpc: "2.0", id: "l", method: "tools/list" })).json()) as { result: { tools: McpToolJson[] } };
    const tools = b.result.tools;
    assert.deepEqual(tools.map((t) => t.name), [MCP_TOOL_NAMES.search, MCP_TOOL_NAMES.deeplink]);
    for (const t of tools) {
      assert.deepEqual({ r: t.annotations.readOnlyHint, o: t.annotations.openWorldHint, d: t.annotations.destructiveHint }, { r: true, o: true, d: false });
      assert.equal(t.inputSchema.type, "object");
      assert.match(t.description, /[가-힣]/);
    }
    assert.ok(tools[0].description.includes(`수수료가 잡히는 링크는`) && tools[0].description.includes(MCP_TOOL_NAMES.deeplink)); // 검색 결과로 링크 만들기 안내
    assert.deepEqual(tools[0].inputSchema.required, ["keyword"]);
    assert.equal((tools[0].inputSchema.properties as { limit: { maximum: number } }).limit.maximum, 10);
    assert.equal((tools[1].inputSchema.properties as { urls: { maxItems: number } }).urls.maxItems, 5);
  });

  await test("MCP tools/call 검색: 사람이 읽을 요약(가격·로켓·상품 번호·주소·기준 시각) + structuredContent (가짜 쿠팡)", async () => {
    const r = await mcpCall({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: MCP_TOOL_NAMES.search, arguments: { keyword: "무선 청소기", limit: 2 } } });
    assert.equal(r.status, 200);
    const text = await r.text();
    const b = JSON.parse(text) as { result: { content: { type: string; text: string }[]; structuredContent: { products: { productId: string }[]; notice: string }; isError?: boolean } };
    assert.equal(b.result.isError, undefined);
    assert.equal(b.result.content[0].type, "text");
    const t = b.result.content[0].text;
    for (const want of ["무선 청소기 A", "129,000원", "로켓배송", "상품 번호 1000", "https://www.coupang.com/vp/products/1000", "https://static.coupangcdn.com/image/0.jpg", "기준", "바뀔 수 있어요", MCP_TOOL_NAMES.deeplink]) {
      assert.ok(t.includes(want), want);
    }
    assert.deepEqual(b.result.structuredContent.products.map((p) => p.productId), ["1000", "1001"]);
    assert.ok(b.result.structuredContent.notice.includes(MCP_TOOL_NAMES.deeplink));
    for (const secret of [KEYS.accessKey, KEYS.secretKey, TOKEN]) assert.ok(!text.includes(secret));
  });

  await test("MCP tools/call 링크: 파트너스 링크 + 고지 문구, 쿠팡 밖 주소는 줄마다 안내", async () => {
    const f = fakeFetch((c) => {
      const body = JSON.parse(String(c.init.body)) as { coupangUrls: string[] };
      return { body: { rCode: "0", data: body.coupangUrls.map((x, i) => ({ originalUrl: x, shortenUrl: `https://link.coupang.com/a/m${i}` })) } };
    });
    const deps = toolDeps({ client: createCoupangClient({ loadKeys: async () => KEYS, fetch: f.fn }) });
    const args = { urls: ["https://www.coupang.com/vp/products/1", "https://naver.com"], productIds: ["2"] };
    const b = (await (await mcpCall({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: MCP_TOOL_NAMES.deeplink, arguments: args } }, { deps })).json()) as {
      result: { content: { text: string }[]; structuredContent: { links: { status: string }[]; disclosure: string } };
    };
    const t = b.result.content[0].text;
    assert.ok(t.includes("https://link.coupang.com/a/m0") && t.includes("https://link.coupang.com/a/m1"));
    assert.match(t, /만들지 못함/);
    assert.match(t, /쿠팡 파트너스 활동/);
    assert.deepEqual(b.result.structuredContent.links.map((l) => l.status), ["ok", "invalid", "ok"]);
  });

  await test("MCP tools/call: 쿠팡 오류(키 없음·한도·입력)는 JSON-RPC 오류가 아니라 isError 결과, 모르는 도구는 -32602", async () => {
    const noKeys = toolDeps({ client: createCoupangClient({ loadKeys: async () => null, fetch: fakeFetch(() => ({ body: {} })).fn }) });
    const call = (name: string, args: unknown, deps = toolDeps()) => mcpCall({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name, arguments: args } }, { deps });
    const a = await call(MCP_TOOL_NAMES.search, { keyword: "청소기" }, noKeys);
    assert.equal(a.status, 200);
    const ab = (await a.json()) as { result: { isError: boolean; content: { text: string }[]; structuredContent: { code: string } } };
    assert.equal(ab.result.isError, true);
    assert.match(ab.result.content[0].text, /관리자 설정에서 쿠팡 키/);
    assert.equal(ab.result.structuredContent.code, "no_keys");
    const limited = toolDeps({ client: createCoupangClient({ loadKeys: async () => KEYS, fetch: fakeFetch(() => ({ status: 429, body: "" })).fn }) });
    const lb = (await (await call(MCP_TOOL_NAMES.search, { keyword: "청소기" }, limited)).json()) as { result: { isError: boolean; content: { text: string }[] } };
    assert.deepEqual([lb.result.isError, /한도/.test(lb.result.content[0].text)], [true, true]);
    const authFail = toolDeps({ client: createCoupangClient({ loadKeys: async () => KEYS, fetch: fakeFetch(() => ({ status: 401, body: "{}" })).fn }) });
    assert.equal(((await (await call(MCP_TOOL_NAMES.deeplink, { productIds: ["1"] }, authFail)).json()) as { result: { isError: boolean } }).result.isError, true);
    const empty = (await (await call(MCP_TOOL_NAMES.search, {})).json()) as { result: { isError: boolean; content: { text: string }[] } };
    assert.deepEqual([empty.result.isError, empty.result.content[0].text], [true, "검색어를 넣어 주세요"]);
    const unknown = (await (await call("delete_everything", {})).json()) as { error: { code: number } };
    assert.equal(unknown.error.code, -32602);
  });

  await test("MCP 토큰: 주소 방식(/api/mcp/<토큰>)·헤더 방식 둘 다 통과, 틀림·없음 401, 미설정 503 — 응답에 토큰 없음", async () => {
    const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } };
    assert.equal((await mcpCall(init, { auth: "path" })).status, 200);
    assert.equal((await mcpCall(init, { auth: "header" })).status, 200);
    for (const bad of [{ auth: "path" as const, token: `${TOKEN}x` }, { auth: "header" as const, token: "wrong" }, { auth: "none" as const }]) {
      const r = await mcpCall(init, bad);
      assert.equal(r.status, 401, bad.auth);
      const text = await r.text();
      const b = JSON.parse(text) as { jsonrpc: string; error: { code: number; message: string } };
      assert.equal(b.jsonrpc, "2.0");
      assert.equal(b.error.code, -31001);
      assert.match(b.error.message, /토큰/);
      assert.ok(!text.includes(TOKEN));
    }
    // 주소 방식이면 헤더 토큰은 보지 않는다 (주소의 토큰이 틀리면 헤더가 맞아도 거절)
    assert.equal((await mcpCall(init, { auth: "path", token: "wrong", extraHeaders: { authorization: `Bearer ${TOKEN}` } })).status, 401);
    const nc = await mcpCall(init, { deps: toolDeps({ token: null }) });
    assert.equal(nc.status, 503);
    assert.match(((await nc.json()) as { error: { message: string } }).error.message, /도구 토큰 새로 만들기/);
    assert.equal(mcpUrlWithToken("eloan_tool_abc-_"), "https://www.eloan.kr/api/mcp/eloan_tool_abc-_");
  });

  await test("MCP 호출 제한: 도구 API 와 같은 제한기 — IP별은 토큰 검사 전, 전체는 토큰 통과 뒤에만", async () => {
    const deps = toolDeps({ perIp: 2, total: 1 });
    const ping = { jsonrpc: "2.0", id: 1, method: "ping" };
    assert.equal((await mcpCall(ping, { deps, auth: "path", token: "wrong", ip: "198.51.100.9" })).status, 401);
    assert.equal((await mcpCall(ping, { deps, auth: "path", token: "wrong", ip: "198.51.100.9" })).status, 401);
    const blocked = await mcpCall(ping, { deps, ip: "198.51.100.9" });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("retry-after")) > 0);
    assert.equal((await mcpCall(ping, { deps, ip: "198.51.100.10" })).status, 200); // 틀린 토큰은 전체 한도를 쓰지 않았다
    assert.equal((await mcpCall(ping, { deps, ip: "198.51.100.11" })).status, 429); // 전체 1회를 썼다
    // 도구 API 와 MCP 가 같은 제한기를 쓴다
    const shared = toolDeps({ total: 1 });
    assert.equal((await handleToolSearch(post(TOOL_PATHS.search, { keyword: "a" }, `Bearer ${TOKEN}`), shared)).status, 200);
    assert.equal((await mcpCall(ping, { deps: shared })).status, 429);
  });

  await test("MCP: 모르는 메서드 -32601, 알림은 202 빈 응답, GET·DELETE 405 (Allow: POST), 깨진 JSON -32700", async () => {
    const m = (await (await mcpCall({ jsonrpc: "2.0", id: 7, method: "resources/list" })).json()) as { id: number; error: { code: number } };
    assert.deepEqual([m.id, m.error.code], [7, -32601]);
    for (const note of [{ jsonrpc: "2.0", method: "notifications/initialized" }, { jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 1 } }]) {
      const r = await mcpCall(note);
      assert.equal(r.status, 202);
      assert.equal(await r.text(), "");
    }
    for (const r of [mcpGet(), mcpDelete(), mcpTokenGet()]) {
      assert.equal(r.status, 405);
      assert.equal(r.headers.get("allow"), "POST");
    }
    const broken = await handleCoupangMcp(new Request("https://www.eloan.kr/api/mcp", { method: "POST", headers: { authorization: `Bearer ${TOKEN}` }, body: "{oops" }), toolDeps());
    assert.equal(broken.status, 400);
    assert.equal(((await broken.json()) as { error: { code: number } }).error.code, -32700);
    const ping = (await (await mcpCall({ jsonrpc: "2.0", id: "p", method: "ping" })).json()) as { result: unknown };
    assert.deepEqual(ping.result, {});
  });

  await test("MCP 배치 요청: 요청마다 답(순서대로), 알림은 답 없음, 알림만이면 202", async () => {
    const batch = [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      { jsonrpc: "2.0", id: 3, method: "nope" },
    ];
    const r = await mcpCall(batch);
    assert.equal(r.status, 200);
    const b = (await r.json()) as { id: number; result?: { protocolVersion?: string; tools?: unknown[] }; error?: { code: number } }[];
    assert.deepEqual(b.map((x) => x.id), [1, 2, 3]);
    assert.equal(b[0].result?.protocolVersion, "2025-03-26");
    assert.equal(b[1].result?.tools?.length, 2);
    assert.equal(b[2].error?.code, -32601);
    assert.equal((await mcpCall([{ jsonrpc: "2.0", method: "notifications/initialized" }])).status, 202);
    assert.equal((await mcpCall([])).status, 400);
  });

  await test("MCP 최신 방식(2026-07-28, 요청마다 _meta): server/discover·tools/list·tools/call, 헤더 검사, 모르는 버전 -32022", async () => {
    const meta = { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} };
    const modern = (method: string, params: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
      mcpCall({ jsonrpc: "2.0", id: 9, method, params: { ...params, _meta: meta } }, { extraHeaders: { "mcp-protocol-version": "2026-07-28", "mcp-method": method, ...headers } });
    const d = (await (await modern("server/discover")).json()) as { result: { resultType: string; supportedVersions: string[]; capabilities: unknown; _meta: Record<string, { name: string }> } };
    assert.equal(d.result.resultType, "complete");
    assert.ok(d.result.supportedVersions.includes("2026-07-28") && d.result.supportedVersions.includes("2025-06-18"));
    assert.deepEqual(d.result.capabilities, { tools: {} });
    assert.equal(d.result._meta["io.modelcontextprotocol/serverInfo"].name, "eloan-coupang");
    const l = (await (await modern("tools/list")).json()) as { result: { resultType: string; tools: unknown[] } };
    assert.deepEqual([l.result.resultType, l.result.tools.length], ["complete", 2]);
    const c = await modern("tools/call", { name: MCP_TOOL_NAMES.search, arguments: { keyword: "청소기" } }, { "mcp-name": MCP_TOOL_NAMES.search });
    assert.equal(((await c.json()) as { result: { resultType: string } }).result.resultType, "complete");
    // Mcp-Name 은 base64 표기로 와도 된다
    assert.equal(decodeHeaderValue(`=?base64?${Buffer.from("한글", "utf8").toString("base64")}?=`), "한글");
    const enc = await modern("tools/call", { name: MCP_TOOL_NAMES.search, arguments: { keyword: "청소기" } }, { "mcp-name": `=?base64?${Buffer.from(MCP_TOOL_NAMES.search).toString("base64")}?=` });
    assert.equal(enc.status, 200);
    const mismatch = await modern("tools/call", { name: MCP_TOOL_NAMES.search, arguments: { keyword: "a" } }, { "mcp-name": MCP_TOOL_NAMES.deeplink });
    assert.deepEqual([mismatch.status, ((await mismatch.json()) as { error: { code: number } }).error.code], [400, -32020]);
    const noHeader = await mcpCall({ jsonrpc: "2.0", id: 9, method: "tools/list", params: { _meta: meta } });
    assert.deepEqual([noHeader.status, ((await noHeader.json()) as { error: { code: number } }).error.code], [400, -32020]);
    const unknownMethod = await modern("resources/list");
    assert.deepEqual([unknownMethod.status, ((await unknownMethod.json()) as { error: { code: number } }).error.code], [404, -32601]);
    const future = await mcpCall(
      { jsonrpc: "2.0", id: 9, method: "tools/list", params: { _meta: { ...meta, "io.modelcontextprotocol/protocolVersion": "2099-01-01" } } },
      { extraHeaders: { "mcp-protocol-version": "2099-01-01", "mcp-method": "tools/list" } },
    );
    const fb = (await future.json()) as { error: { code: number; data: { supported: string[] } } };
    assert.deepEqual([future.status, fb.error.code, fb.error.data.supported.includes("2026-07-28")], [400, -32022, true]);
    // legacy 방식(initialize 뒤 헤더만 2025-06-18)은 헤더 검사 없이 그대로
    assert.equal((await mcpCall({ jsonrpc: "2.0", id: 1, method: "tools/list" }, { extraHeaders: { "mcp-protocol-version": "2025-06-18" } })).status, 200);
  });

  await test("MCP Origin: 없으면 통과, chatgpt.com 통과, 다른 사이트는 403", async () => {
    const ping = { jsonrpc: "2.0", id: 1, method: "ping" };
    assert.equal((await mcpCall(ping, { extraHeaders: { origin: "https://chatgpt.com" } })).status, 200);
    assert.equal((await mcpCall(ping, { extraHeaders: { origin: "https://evil.example.com" } })).status, 403);
    assert.equal((await mcpCall(ping, { extraHeaders: { origin: "https://chatgpt.com.evil.example" } })).status, 403);
  });

  await test("한국 시간 표시", () => {
    assert.equal(kstLabel("2026-11-24T01:02:03.000Z"), "11월 24일 10:02");
    assert.equal(kstLabel("이상한 값"), "");
  });

  console.log(`\n쿠팡·도구 API·MCP 테스트 ${passed}개 통과`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
