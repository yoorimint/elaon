// 쿠팡 파트너스 API·챗GPT 도구 API 회귀 테스트 — 실제 쿠팡은 부르지 않는다 (가짜 fetch). 실행: npm run test:shop
//  - 서명 문자열 (src/lib/coupang-api-core.ts) · 응답 읽기 · 입력 정리
//  - 호출·캐시·한도 (src/lib/coupang-api.ts) · 키 없음 오류
//  - 도구 API 토큰 검사·호출 제한·응답 (src/lib/coupang-tools.ts) · 관리자 도구 토큰 만들기 · OpenAPI 문서
// 키·토큰은 전부 가짜 값이다.

import assert from "node:assert/strict";
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

function toolDeps(o: { token?: string | null; client?: ReturnType<typeof createCoupangClient>; perIp?: number } = {}): ToolApiDeps {
  const fake = fakeFetch(() => ({ body: searchSample(["무선 청소기 A", "무선 청소기 B"]) }));
  return {
    loadToken: async () => (o.token === undefined ? TOKEN : o.token),
    client: () => o.client ?? createCoupangClient({ loadKeys: async () => KEYS, fetch: fake.fn }),
    perIp: createWindowLimiter({ limit: o.perIp ?? 100, windowMs: 60_000 }),
    total: createWindowLimiter({ limit: 1000, windowMs: 60_000 }),
  };
}

const post = (path: string, body: unknown, auth?: string, ip = "203.0.113.7") =>
  new Request(`https://www.eloan.kr${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  });

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

  await test("한국 시간 표시", () => {
    assert.equal(kstLabel("2026-11-24T01:02:03.000Z"), "11월 24일 10:02");
    assert.equal(kstLabel("이상한 값"), "");
  });

  console.log(`\n쿠팡·도구 API 테스트 ${passed}개 통과`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
