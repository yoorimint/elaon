// Vercel 서버 CPU 회귀 테스트 — 공개 화면이 다시 "요청마다 서버에서 그리기(ƒ Dynamic)"로 돌아가지 않게 막는다.
// 배경: 2026-11 Vercel Hobby Active CPU 월 4시간 한도를 넘어 사이트 전체가 멈췄다.
//  주원인 = 검색·SNS 로봇이 부르는 동적 경로(/stock/[slug] 와 OG 이미지 등)가 매 요청 서버 렌더링.
// 실행: npm run test:shop (외부 호출 없음). 고친 문제마다 여기에 테스트를 하나씩 추가한다.

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { requestShopRevalidate, verifyRevalidate } from "@/lib/revalidate-signature";
import { startOfUtcDay } from "@/lib/scan-guard";

const ROOT = join(__dirname, "..");
const APP = join(ROOT, "src", "app");

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const rel = (p: string) => relative(ROOT, p);
const read = (p: string) => readFileSync(p, "utf8");
// 관리자·API 는 원래 동적 (로그인·POST) — 검사 대상 아님
const isPublic = (p: string) => !/[\\/]app[\\/](api|admin)[\\/]/.test(p);
const files = walk(APP).filter((p) => /\.(ts|tsx)$/.test(p));
const routeFiles = files.filter((p) => isPublic(p) && /[\\/](page|opengraph-image|twitter-image)\.tsx$/.test(p));

(async () => {
  await test("공개 화면·OG 이미지에 force-dynamic 없음", () => {
    const bad = files.filter((p) => isPublic(p) && /dynamic\s*=\s*["']force-dynamic["']/.test(read(p)));
    assert.deepEqual(bad.map(rel), []);
  });

  await test("동적 경로([slug] 등) 화면·OG 이미지는 generateStaticParams 가 있어 ISR 로 캐시된다 (파일 또는 같은 폴더 layout)", () => {
    // generateStaticParams 가 없으면 Next 14 는 동적 경로를 ƒ(요청마다 서버 렌더링)로 만든다.
    // 빈 배열을 돌려주면 빌드 때는 안 만들고 첫 요청 때 만들어 캐시한다.
    const missing = routeFiles
      .filter((p) => /\[[^\]]+\]/.test(rel(p)))
      .filter((p) => {
        const layout = join(dirname(p), "layout.tsx");
        const has = (f: string) => existsSync(f) && /export (async )?function generateStaticParams/.test(read(f));
        return !has(p) && !has(layout);
      });
    assert.deepEqual(missing.map(rel), []);
  });

  await test("서버 화면은 cookies()·headers()·searchParams 를 쓰지 않는다 (쓰면 요청마다 서버 렌더링)", () => {
    const bad = routeFiles.filter((p) => {
      const s = read(p);
      if (/^\s*["']use client["']/.test(s)) return false; // 클라이언트 화면은 브라우저에서 읽음
      return /\bcookies\(\)|\bheaders\(\)|\bsearchParams\b/.test(s);
    });
    assert.deepEqual(bad.map(rel), []);
  });

  await test("공개 화면 revalidate 는 10분 이상 (짧으면 방문마다 거의 매번 다시 그림)", () => {
    const short = files
      .filter(isPublic)
      .map((p) => ({ p, m: /export const revalidate\s*=\s*(\d+)/.exec(read(p)) }))
      .filter((x) => x.m && Number(x.m[1]) < 600)
      .map((x) => `${rel(x.p)} (${x.m![1]})`);
    assert.deepEqual(short, []);
  });

  await test("/stock/[slug]: no-store fetch 가 있어도 정적으로 캐시 (force-static + force-no-store)", () => {
    const s = read(join(APP, "stock", "[slug]", "page.tsx"));
    assert.match(s, /export const dynamic = "force-static"/);
    assert.match(s, /export const fetchCache = "force-no-store"/);
    // 시세 일시 장애는 캐시되면 안 되므로 오류로 던진다 (error.tsx 가 안내)
    assert.match(s, /if \(result\.transient\)/);
    assert.ok(existsSync(join(APP, "stock", "[slug]", "error.tsx")));
  });

  await test("/shop/[slug]: 초안은 서버에서 캐시 끄지 않고(noStore 금지) 브라우저가 불러온다", () => {
    // ISR 화면에서 noStore()/no-store 를 부르면 Next 14 는 'Page changed from static to dynamic' 오류(500)를 낸다
    const s = read(join(APP, "shop", "[slug]", "page.tsx"));
    assert.ok(!/noStore|no-store/.test(s));
    assert.match(s, /<ShopDraftPreview slug=/);
  });

  await test("홈 초보자 프리셋은 캐시되는 GET(/api/signals/presets)을 쓴다 (방문자마다 POST 계산 금지)", () => {
    const c = read(join(ROOT, "src", "components", "BeginnerPresetSection.tsx"));
    assert.match(c, /fetch\("\/api\/signals\/presets"\)/);
    assert.ok(!/method:\s*"POST"/.test(c));
    const r = read(join(APP, "api", "signals", "presets", "route.ts"));
    assert.match(r, /export const revalidate = \d+/);
    assert.match(r, /export const dynamic = "force-static"/);
  });

  await test("크론 스캔 하루 기준: UTC 0시", () => {
    assert.equal(startOfUtcDay(new Date("2026-11-15T00:44:59Z")).toISOString(), "2026-11-15T00:00:00.000Z");
    assert.equal(startOfUtcDay(new Date("2026-11-14T23:59:59Z")).toISOString(), "2026-11-14T00:00:00.000Z");
  });

  await test("board-scan·popular-scan: 같은 날 두 번째 실행은 건너뛴다 (force=1 이면 다시)", () => {
    for (const name of ["board-scan", "popular-scan"]) {
      const s = read(join(APP, "api", "admin", name, "route.ts"));
      assert.match(s, /computedToday\(/, name);
      assert.match(s, /isForced\(/, name);
    }
    const wf = read(join(ROOT, ".github", "workflows", "board-scan.yml"));
    assert.match(wf, /workflow_dispatch' && '&force=1'/);
  });

  await test("스크립트 화면 갱신 요청: 서명 헤더로 보내고, 실패해도 던지지 않고 한 줄로 알린다", async () => {
    const seen: { url: string; sig: string; body: string }[] = [];
    const ok = (async (url: string, init: RequestInit) => {
      seen.push({ url, sig: (init.headers as Record<string, string>)["x-shop-signature"], body: String(init.body) });
      return { ok: true, status: 200 } as Response;
    }) as unknown as typeof fetch;
    const line = await requestShopRevalidate("key", ["a-b"], { siteUrl: "https://x.test", fetchImpl: ok });
    assert.equal(line, "화면 갱신 요청: 완료");
    assert.equal(seen[0].url, "https://x.test/api/shop/revalidate");
    assert.ok(verifyRevalidate("key", ["a-b"], seen[0].sig));
    assert.deepEqual(JSON.parse(seen[0].body), { slugs: ["a-b"] });

    const down = (async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    assert.match(await requestShopRevalidate("key", ["a"], { fetchImpl: down }), /^화면 갱신 요청: 실패/);
    assert.equal(await requestShopRevalidate("key", [], { fetchImpl: down }), "화면 갱신 요청: 바뀐 글 없음");
  });

  await test("글을 공개·삭제하는 스크립트는 화면 갱신을 요청한다 (글 화면 하루·목록 1시간 캐시)", () => {
    for (const f of ["generate-post.ts", "maintain.ts", "notion-sync.ts"]) {
      assert.match(read(join(ROOT, "scripts", "shop", f)), /requestShopRevalidate\(/, f);
    }
  });

  await test("/r/[slug] 공유 결과·OG 이미지는 고정 결과라 영구 캐시 (revalidate = false)", () => {
    for (const f of ["page.tsx", "opengraph-image.tsx"]) {
      const s = read(join(APP, "r", "[slug]", f));
      assert.match(s, /export const revalidate = false;/, f);
      assert.ok(!/runtime = "edge"/.test(s), `${f}: edge 런타임은 ISR 캐시가 안 됨`);
    }
  });

  await test("사이트맵에는 사용자가 직접 공유한 결과만 (매일 지워지는 크론 자동 공유 제외)", () => {
    assert.match(read(join(APP, "sitemap.ts")), /\.is\("source", null\)/);
  });

  await test("야후 프록시: 성공(200)만 CDN 캐시, 실패는 no-store", () => {
    const s = read(join(APP, "api", "yahoo", "[...path]", "route.ts"));
    assert.match(s, /upstream\.status === 200 \? cdnCacheFor\(subpath\) : "no-store"/);
    assert.match(s, /s-maxage=/);
  });

  await test("데이터 자동 갱신 워크플로는 하루 한 번만 push (push 마다 배포 → ISR 캐시 초기화)", () => {
    const wf = read(join(ROOT, ".github", "workflows", "update-dart-corps.yml"));
    assert.equal((wf.match(/git push/g) ?? []).length, 1);
    assert.match(wf, /if: always\(\)/);
  });

  console.log(`\n캐시 설정 테스트 ${passed}개 통과`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
