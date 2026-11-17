// 서버 CPU·사이트 구조 회귀 테스트 — 공개 화면이 다시 "요청마다 서버에서 그리기(ƒ Dynamic)"로 돌아가지 않게 막는다.
// 배경: 2026-11 Vercel Hobby Active CPU 월 4시간 한도를 넘어 사이트 전체가 멈췄다.
//  주원인 = 검색·SNS 로봇이 부르는 동적 경로(/stock/[slug] 와 OG 이미지 등)가 매 요청 서버 렌더링.
//  → 사장님 결정으로 주식·코인 도구를 통째로 없앴다 (아래 "제거한 주식·코인 도구" 테스트들이 되살아나지 않게 막음).
// 실행: npm run test:shop (외부 호출 없음). 고친 문제마다 여기에 테스트를 하나씩 추가한다.

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { requestShopRevalidate, verifyRevalidate } from "@/lib/revalidate-signature";
import { GONE_PREFIXES, MOVED } from "@/lib/removed-routes.mjs";

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

  await test("/shop/[slug]: 초안은 서버에서 캐시 끄지 않고(noStore 금지) 브라우저가 불러온다", () => {
    // ISR 화면에서 noStore()/no-store 를 부르면 Next 14 는 'Page changed from static to dynamic' 오류(500)를 낸다
    const s = read(join(APP, "shop", "[slug]", "page.tsx"));
    assert.ok(!/noStore|no-store/.test(s));
    assert.match(s, /<ShopDraftPreview slug=/);
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

  await test("revalidateSection 은 홈(/)도 새로 만든다 (홈에 최신 쇼핑 글이 있음)", () => {
    // 섹션별 화면 목록(SECTION_PAGES)의 쇼핑 몫 첫 칸이 홈
    assert.match(read(join(ROOT, "src", "lib", "shop-revalidate.ts")), /shop: \["\/",/);
  });

  // ─── 제거한 주식·코인 도구 (2026-11) ───────────────────────────────
  await test("제거한 주식·코인 화면·API 가 app/ 에 되살아나지 않는다", () => {
    const back = [...GONE_PREFIXES, ...MOVED.map((m) => m.source)].filter((p) => existsSync(join(APP, ...p.split("/").filter(Boolean))));
    assert.deepEqual(back, []);
  });

  await test("410 미들웨어 matcher = GONE_PREFIXES (한쪽만 고치면 깨짐)", () => {
    const mw = read(join(ROOT, "src", "middleware.ts"));
    const matcher = [...mw.matchAll(/"(\/[^"]*):path\*"/g)].map((m) => m[1].replace(/\/$/, ""));
    assert.deepEqual(matcher, [...GONE_PREFIXES]);
    assert.match(mw, /status: 410/);
    // 미들웨어는 matcher 경로에서만 돈다 — matcher 가 없으면 모든 요청에 실행돼 서버 비용이 다시 든다
    assert.match(mw, /export const config = \{\s*matcher:/);
  });

  await test("301 리다이렉트: next.config 가 MOVED 를 statusCode 301 로 쓴다", async () => {
    const cfg = (await import(join(ROOT, "next.config.mjs"))).default;
    const r = await cfg.redirects();
    assert.deepEqual(
      r,
      MOVED.map((m) => ({ source: m.source, destination: m.destination, statusCode: 301 })),
    );
    for (const m of MOVED) assert.ok(!GONE_PREFIXES.some((g) => m.source === g || m.source.startsWith(g + "/")), m.source);
  });

  // 생활정보(/info, 2026-11-17~): shop_posts 를 쇼핑과 같이 써서 slug 가 같은 공간 — 다른 섹션 글이 열리면 안 된다
  await test("쇼핑·생활정보 글 화면은 자기 섹션 글만 연다 (다른 섹션 글이면 notFound), 메뉴·사이트맵·RSS 에 생활정보", () => {
    for (const [file, section] of [["src/app/shop/[slug]/page.tsx", "shop"], ["src/app/info/[slug]/page.tsx", "info"]] as const) {
      const src = read(join(ROOT, ...file.split("/")));
      assert.match(src, new RegExp(`lookupPublishedPost\\([^,]+, "${section}"\\)`), file);
      assert.match(src, /otherSection[^\n]*\)\s*notFound\(\)/, file);
    }
    assert.match(read(join(ROOT, "src", "components", "Header.tsx")), /href: "\/info", label: "생활정보"/);
    assert.match(read(join(ROOT, "src", "app", "sitemap.ts")), /sectionRoutes\("info"\)/);
    assert.match(read(join(ROOT, "src", "app", "rss.xml", "route.ts")), /postsOf\("info"\)/);
  });

  await test("헤더 메뉴·사이트맵·RSS·홈에 제거한 경로 링크가 없다", () => {
    const removed = [...GONE_PREFIXES, ...MOVED.map((m) => m.source)];
    const targets = [
      "src/components/Header.tsx",
      "src/components/AdminNav.tsx",
      "src/app/sitemap.ts",
      "src/app/rss.xml/route.ts",
      "src/app/page.tsx",
      "src/app/layout.tsx",
      "src/app/me/page.tsx",
      "src/app/login/page.tsx",
      "src/app/suggest/page.tsx",
    ];
    const bad: string[] = [];
    for (const t of targets) {
      const s = read(join(ROOT, t));
      for (const p of removed) if (new RegExp(`["'\\x60]${p.replace(/\//g, "\\/")}(["'\\x60/?]|\\$\\{)`).test(s) || s.includes(`}${p}/`)) bad.push(`${t}: ${p}`);
    }
    assert.deepEqual(bad, []);
  });

  await test("주소모음 데이터에 사이트 내부 링크(제거한 도구)가 없다", () => {
    const s = read(join(ROOT, "src", "lib", "picks.ts"));
    assert.ok(!/url: "\/(backtest|stock|r|paper-trade|signals|ranking|glossary|quiz|watchlist)\b/.test(s));
    assert.ok(!s.includes('hubSlug: "eloan-backtest"'));
  });

  await test("주소모음 데이터에 없어진 eloan 자체 기능(백테스트·시세 조회) 언급이 없다", () => {
    // 2026-11 주식·코인 도구 제거 후에도 "eloan 백테스트 활용 가능" 같은 문장이 50여 곳 남아 있었다.
    // 다른 사이트의 백테스트 기능 설명은 괜찮고, 한 문장 안에 eloan(본 사이트)과 그 기능이 같이 나오면 안 된다.
    const s = read(join(ROOT, "src", "lib", "picks.ts"));
    const bad = s
      .split(/[."\n]/)
      .filter((x) => /eloan|본 사이트/.test(x) && /백테스트|시세 조회|빌트인 전략|모의투자/.test(x))
      .map((x) => x.trim().slice(0, 80));
    assert.deepEqual(bad, []);
  });

  // ─── 제거한 커뮤니티·회원가입 (2026-11, 사람이 쓴 글·댓글 0개) ─────────────
  await test("커뮤니티 코드(src/lib/community.ts·신고 관리)가 되살아나지 않는다", () => {
    assert.ok(!existsSync(join(ROOT, "src", "lib", "community.ts")), "src/lib/community.ts");
    assert.ok(!existsSync(join(APP, "admin", "reports")), "app/admin/reports");
    for (const p of ["/community", "/signup"]) assert.ok(GONE_PREFIXES.includes(p), `${p} 가 410 목록에 없음`);
    const srcFiles = walk(join(ROOT, "src")).filter((p) => /\.(ts|tsx|mjs)$/.test(p));
    const importers = srcFiles.filter((p) => /from ["'](@\/lib\/|\.\/)community["']/.test(read(p))).map(rel);
    assert.deepEqual(importers, []);
  });

  await test("헤더·로그인 화면에 회원가입 버튼이 없다", () => {
    for (const f of ["src/components/Header.tsx", "src/app/login/page.tsx"]) {
      assert.ok(!/href=["'{`]*\/signup/.test(read(join(ROOT, f))), f);
    }
  });

  await test("주식·코인 데이터 자동 갱신·스캔 워크플로가 없다 (데이터 커밋 push → 배포 → 캐시 초기화)", () => {
    for (const wf of ["update-dart-corps.yml", "board-scan.yml", "bot-post.yml", "social-bot.yml", "social-content-scan.yml"]) {
      assert.ok(!existsSync(join(ROOT, ".github", "workflows", wf)), wf);
    }
    assert.ok(!/build-corp-codes/.test(read(join(ROOT, "package.json"))), "build 스크립트에 DART 데이터 생성 단계");
  });

  // 2026-11-16: iwinv 이전 뒤 Supabase pg_cron 의 매시 요청이 사이트에 안 와서 13시 발행이 빠졌다 → 서버 crontab 으로 옮김
  await test("배포가 서버 매시 노션 동기화(crontab)와 그 비밀값을 설치한다", () => {
    const script = join(ROOT, "scripts", "server", "notion-cron.sh");
    assert.ok(existsSync(script), "scripts/server/notion-cron.sh 없음");
    assert.ok((statSync(script).mode & 0o111) !== 0, "notion-cron.sh 실행 권한 없음");
    const sh = read(script);
    assert.ok(/127\.0\.0\.1:3100\/api\/shop\/notion-sync/.test(sh), "서버 안 주소로 부르지 않음");
    assert.ok(/curl[^\n]*-K -/.test(sh), "비밀값을 명령줄 인자로 넘김 (ps 로 보임)");
    const deploy = read(join(ROOT, ".github", "workflows", "deploy.yml"));
    assert.ok(deploy.includes("cp scripts/server/notion-cron.sh deploy/ops/"), "배포 묶음에 스크립트 안 넣음");
    assert.ok(deploy.includes('echo "NOTION_CRON_SECRET=${CRON_SECRET}"'), ".env 에 NOTION_CRON_SECRET 안 적음");
    assert.ok(/grep -v 'eloan-notion-cron'.*\| crontab -/.test(deploy), "crontab 을 한 줄로 유지하며 설치하지 않음");
    assert.ok(/'2 \* \* \* \* \$DEPLOY_DIR\/ops\/notion-cron\.sh # eloan-notion-cron'/.test(deploy), "매시 2분 예약 줄 없음");
  });

  console.log(`\n캐시 설정 테스트 ${passed}개 통과`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
