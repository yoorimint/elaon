// 쇼핑 글 조회수 집계 규칙(src/lib/shop-views.ts) 회귀 테스트 — 외부 호출 없음
// 실행: npm run test:shop
// 고친 문제마다 여기에 테스트를 하나씩 추가한다.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { aggregatePostViews, daysBefore } from "@/lib/post-view-calc";
import {
  BOT_UA_PATTERN,
  autoExcludeForAdmin,
  decideView,
  excludeRaw,
  formatViews,
  hasSeen,
  isBotUserAgent,
  kstDay,
  markSeen,
  parseExclude,
  parseSeen,
  sortByViews,
  statsFor,
  type PostViewStats,
} from "@/lib/shop-views";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const NAVER_APP =
  "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.8.5)";
const KAKAO_INAPP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0";
const DAUM_APP = "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 DaumApps/5.6.1";

console.log("조회수 집계 규칙");

test("봇 판별: 검색 로봇·미리보기 수집기·자동화 도구는 봇", () => {
  for (const ua of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (compatible; Daum/4.1; +http://cs.daum.net/faq/15/4118.html?faqId=28966)",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "kakaotalk-scrap/1.0; +https://devtalk.kakao.com/",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/129.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 Chrome-Lighthouse",
    "curl/8.5.0",
    "python-requests/2.32.3",
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
  ]) {
    assert.equal(isBotUserAgent(ua), true, ua);
  }
});

test("봇 판별: 빈 user-agent 는 봇으로 본다", () => {
  assert.equal(isBotUserAgent(""), true);
  assert.equal(isBotUserAgent("   "), true);
  assert.equal(isBotUserAgent(null), true);
  assert.equal(isBotUserAgent(undefined), true);
});

test("봇 판별: 휴대폰·앱 내 브라우저 사람은 봇 아님 (다음 앱 DaumApps 포함)", () => {
  for (const ua of [IPHONE, ANDROID_CHROME, NAVER_APP, KAKAO_INAPP, DAUM_APP]) {
    assert.equal(isBotUserAgent(ua), false, ua);
  }
});

test("봇 패턴: DB 함수(supabase/shop-views.sql)와 같은 문자열", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/shop-views.sql"), "utf8");
  assert.ok(sql.includes(`v_ua ~* '${BOT_UA_PATTERN}'`), "shop-views.sql 의 로봇 패턴이 BOT_UA_PATTERN 과 다름");
  // Postgres 정규식과 문법이 갈리는 기호를 쓰지 않는다 (\b·(?i) 등)
  assert.ok(/^[a-z/|-]+$/.test(BOT_UA_PATTERN), "패턴에는 소문자·/·-·| 만");
});

test("한국시간 날짜: UTC 15시 = 다음 날", () => {
  assert.equal(kstDay(new Date("2026-11-14T14:59:59Z")), "2026-11-14");
  assert.equal(kstDay(new Date("2026-11-14T15:00:00Z")), "2026-11-15");
});

test("하루 1회: 같은 날 같은 글은 이미 본 것, 다른 글·다른 날은 아님", () => {
  const day = "2026-11-14";
  const s = markSeen(parseSeen(null, day), "a", day);
  assert.equal(hasSeen(s, "a", day), true);
  assert.equal(hasSeen(s, "b", day), false);
  assert.equal(hasSeen(s, "a", "2026-11-15"), false);
});

test("하루 1회: 저장값을 읽어 이어 쓰고, 날짜가 바뀌면 비운다", () => {
  const raw = JSON.stringify(markSeen(parseSeen(null, "2026-11-14"), "a", "2026-11-14"));
  assert.deepEqual(parseSeen(raw, "2026-11-14"), { day: "2026-11-14", slugs: ["a"] });
  assert.deepEqual(parseSeen(raw, "2026-11-15"), { day: "2026-11-15", slugs: [] });
  // 어제 상태에 오늘 글을 더하면 어제 목록은 버린다
  assert.deepEqual(markSeen({ day: "2026-11-14", slugs: ["a"] }, "b", "2026-11-15"), { day: "2026-11-15", slugs: ["b"] });
});

test("하루 1회: 깨진 저장값은 빈 상태, 300개 넘으면 오래된 것부터", () => {
  assert.deepEqual(parseSeen("{깨짐", "2026-11-14"), { day: "2026-11-14", slugs: [] });
  assert.deepEqual(parseSeen('{"day":"2026-11-14","slugs":[1,"x"]}', "2026-11-14"), { day: "2026-11-14", slugs: ["x"] });
  let s = parseSeen(null, "d");
  for (let i = 0; i < 305; i++) s = markSeen(s, `p${i}`, "d");
  assert.equal(s.slugs.length, 300);
  assert.equal(s.slugs[0], "p5");
  // 같은 글을 다시 넣어도 중복 없음
  assert.equal(markSeen(s, "p10", "d").slugs.filter((x) => x === "p10").length, 1);
});

test("제외 표시: 1=켬, 0=직접 끔, 그 외=정한 적 없음", () => {
  assert.equal(parseExclude("1"), "on");
  assert.equal(parseExclude("0"), "off");
  assert.equal(parseExclude(null), "unset");
  assert.equal(parseExclude("yes"), "unset");
  assert.equal(excludeRaw(true), "1");
  assert.equal(excludeRaw(false), "0");
});

test("관리자 로그인 자동 제외: 정한 적 없을 때만 켜고, 직접 끈 건 존중", () => {
  assert.equal(autoExcludeForAdmin("unset"), "1");
  assert.equal(autoExcludeForAdmin("on"), null);
  assert.equal(autoExcludeForAdmin("off"), null);
});

test("셀지 말지: 일반 방문자 첫 방문만 센다", () => {
  const day = "2026-11-14";
  const base = { slug: "a", today: day, userAgent: IPHONE, seen: parseSeen(null, day), exclude: "unset" as const, isAdmin: false };
  assert.equal(decideView(base), "count");
  assert.equal(decideView({ ...base, seen: markSeen(base.seen, "a", day) }), "seen");
  assert.equal(decideView({ ...base, seen: markSeen(base.seen, "b", day) }), "count");
  assert.equal(decideView({ ...base, isAdmin: true }), "admin");
  assert.equal(decideView({ ...base, exclude: "on" }), "excluded");
  assert.equal(decideView({ ...base, exclude: "off" }), "count");
  assert.equal(decideView({ ...base, userAgent: "Googlebot/2.1" }), "bot");
  assert.equal(decideView({ ...base, preview: true }), "preview");
});

test("관리자 표시: 조회 오늘 · 7일 · 전체 (천 단위 쉼표)", () => {
  assert.equal(formatViews({ today: 3, week: 12, total: 1234 }), "조회 오늘 3 · 7일 12 · 전체 1,234");
});

test("정렬: 최신순·전체 조회순·오늘 조회순, 조회수 없으면 최신순 유지", () => {
  const posts = [
    { id: "old", published_at: "2026-11-01T00:00:00Z", created_at: "2026-11-01T00:00:00Z" },
    { id: "new", published_at: "2026-11-10T00:00:00Z", created_at: "2026-11-10T00:00:00Z" },
    { id: "mid", published_at: null, created_at: "2026-11-05T00:00:00Z" },
  ];
  const stats = new Map<string, PostViewStats>([
    ["old", { today: 1, week: 5, total: 100 }],
    ["mid", { today: 9, week: 9, total: 9 }],
  ]);
  assert.deepEqual(sortByViews(posts, stats, "latest").map((p) => p.id), ["new", "mid", "old"]);
  assert.deepEqual(sortByViews(posts, stats, "total").map((p) => p.id), ["old", "mid", "new"]);
  assert.deepEqual(sortByViews(posts, stats, "today").map((p) => p.id), ["mid", "old", "new"]);
  assert.deepEqual(sortByViews(posts, null, "total").map((p) => p.id), ["new", "mid", "old"]);
  assert.equal(posts[0].id, "old", "원본 배열은 그대로");
});

// ---------- 생활정보 글 조회수 (2026-11-17 사장님 결정: 생활정보 글도 쇼핑 글처럼 센다 — SQL 변경 없이) ----------

const src = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8");

test("생활정보: DB 함수가 섹션과 상관없이 slug·공개 여부로만 센다 (SQL 다시 실행할 필요 없음)", () => {
  const sql = src("supabase", "shop-views.sql");
  const body = sql.slice(sql.indexOf("function public.shop_post_view("), sql.indexOf("function public.admin_shop_post_view_stats("));
  assert.ok(body.includes("where slug = p_slug and status = 'published'"), "slug·공개 글 조건");
  assert.ok(!/section/.test(body), "shop_post_view 에 섹션 조건이 생기면 생활정보 글이 안 셀 수 있음");
  const stats = sql.slice(sql.indexOf("function public.admin_shop_post_view_stats("));
  assert.ok(!/section|shop_posts/.test(stats), "관리자 집계는 글 id 별 — 섹션 상관없음");
});

test("생활정보: 공개 글 화면에 조회수 기록기가 있고, 초안 미리보기에는 없다 (쇼핑과 같은 규칙)", () => {
  for (const [path, previewMarker] of [
    [["src", "app", "info", "[slug]", "page.tsx"], '<ShopDraftPreview slug={params.slug} section="info" />'],
    [["src", "app", "shop", "[slug]", "page.tsx"], "<ShopDraftPreview slug={params.slug} />"],
  ] as const) {
    const page = src(...path);
    const draftAt = page.indexOf(previewMarker);
    const trackerAt = page.indexOf("<ShopViewTracker slug={post.slug} />");
    assert.ok(draftAt > 0, `${path.join("/")}: 초안 미리보기 분기`);
    // 초안·없는 글이면 미리보기를 먼저 return 하고, 기록기는 그 뒤(공개 글 화면)에만 있다
    assert.ok(trackerAt > draftAt, `${path.join("/")}: 공개 글 화면에 기록기`);
    assert.equal(page.split("<ShopViewTracker").length - 1, 1, `${path.join("/")}: 기록기는 한 곳만`);
  }
  // 초안 미리보기 화면(두 섹션 공용)에는 기록기가 없다
  assert.ok(!src("src", "app", "shop", "[slug]", "ShopDraftPreview.tsx").includes("ShopViewTracker"));
});

test("관리자 목록: 글별 조회수 — 불러오는 중(undefined)·준비 중(null, SQL 실행 전)·기록 없는 글 0", () => {
  const stats = new Map<string, PostViewStats>([["a", { today: 1, week: 2, total: 3 }]]);
  assert.equal(statsFor(undefined, "a"), undefined);
  assert.equal(statsFor(null, "a"), null);
  assert.deepEqual(statsFor(stats, "a"), { today: 1, week: 2, total: 3 });
  assert.deepEqual(statsFor(stats, "b"), { today: 0, week: 0, total: 0 });
});

test("관리자 화면: 📰 생활정보 글 탭이 같은 조회수 함수·조작 칸을 쓰고, 생활정보 섹션 조회를 부른다", () => {
  const page = src("src", "app", "admin", "shop", "page.tsx");
  assert.match(page, /\{ id: "info", label: "📰 생활정보 글" \}/);
  assert.match(page, /\{tab === "info" && <InfoAdminPosts \/>\}/);
  const info = src("src", "components", "InfoAdminPosts.tsx");
  assert.match(info, /getShopViewStats\(\)/);
  assert.match(info, /<ViewControls /);
  assert.match(info, /listPublishedInfoPosts\(\)/);
  assert.match(src("src", "lib", "shop-posts.ts"), /fetchPublishedForAdmin\(supabase, "info", limit\)/);
  // 쇼핑 글 목록은 예전 그대로 쇼핑 섹션만
  assert.match(src("src", "lib", "shop-posts.ts"), /notion_url:content->notion->>url"\),\n    "shop",/);
});

// 2026-11-18 사장님 결정: 관리자 대시보드 "외부 유입 랜딩 페이지" 대신 글별 조회수 (오늘·7일·30일, 조회된 글만)
test("글별 조회수: 오늘·7일·30일 합계, 30일 0 인 글·지운 글은 빼고, 섹션별 주소, 많이 본 순", () => {
  const today = "2026-11-18";
  assert.equal(daysBefore(today, 6), "2026-11-12");
  assert.equal(daysBefore("2026-03-01", 1), "2026-02-28");
  const posts = [
    { id: "a", slug: "s-a", title: "쇼핑 A", section: null },
    { id: "b", slug: "i-b", title: "생활 B", section: "info" },
    { id: "c", slug: "s-c", title: "옛날만 C", section: null },
  ];
  const views = [
    { post_id: "a", view_day: today, view_count: 3 },
    { post_id: "a", view_day: "2026-11-12", view_count: 2 }, // 7일 안 (경계)
    { post_id: "a", view_day: "2026-11-11", view_count: 5 }, // 7일 밖·30일 안
    { post_id: "b", view_day: "2026-10-20", view_count: 4 }, // 30일 안 (경계: 10-20)
    { post_id: "c", view_day: "2026-10-19", view_count: 9 }, // 30일 밖 → 글째로 빠짐
    { post_id: "gone", view_day: today, view_count: 7 }, // 지운 글
    { post_id: "b", view_day: today, view_count: 0 },
  ];
  const rows = aggregatePostViews(views, posts, today);
  assert.deepEqual(rows.map((r) => [r.path, r.today, r.week, r.month]), [
    ["/shop/s-a", 3, 5, 10],
    ["/info/i-b", 0, 0, 4],
  ]);
  // 대시보드에 랜딩 표가 남아 있지 않고 글별 조회수 표가 들어 있다
  const page = readFileSync(join(process.cwd(), "src", "app", "admin", "page.tsx"), "utf8");
  assert.ok(!page.includes("랜딩 페이지"), "외부 유입 랜딩 페이지 표 제거");
  assert.match(page, /<PostViewsTable rows=\{postViews\} error=\{postViewsError\} \/>/);
});

console.log(`\n조회수 테스트 ${passed}개 통과`);
