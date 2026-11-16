// 2026-11 에 없앤 경로(주식·코인 도구, 커뮤니티·회원가입)에 410 Gone 을 돌려준다.
// 404 보다 410 이 "영구 삭제"라는 뜻이라 검색엔진이 색인에서 더 빨리 뺀다.
//
// 가볍게: matcher 에 적은 경로에서만 실행된다 (다른 모든 화면에는 미들웨어가 아예 안 돈다).
// DB·외부 호출 없이 고정 응답만 → Cloudflare 등 다른 호스팅으로 옮겨도 그대로 동작 (edge 미들웨어 표준 API 만 사용).
// 301 로 옮긴 경로(/backtest 등)는 next.config.mjs 의 redirects() 에 있다 — 그쪽은 미들웨어보다 먼저 처리된다.
//
// 경로 목록은 src/lib/removed-routes.mjs 한 곳에서 관리 (테스트가 matcher 와 같은지 확인한다).

import { NextResponse, type NextRequest } from "next/server";
import { GONE_HTML } from "@/lib/removed-routes.mjs";

export function middleware(_req: NextRequest) {
  return new NextResponse(GONE_HTML, {
    status: 410,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // 응답이 항상 같으니 CDN·브라우저가 오래 캐시해도 된다 (로봇 재방문 때 서버까지 안 오게)
      "cache-control": "public, max-age=86400, s-maxage=31536000",
      "x-robots-tag": "noindex",
    },
  });
}

// Next 는 matcher 를 빌드 때 정적으로 읽기 때문에 변수로 못 뺀다 → 여기 직접 적고,
// scripts/cache-config.test.ts 가 removed-routes.mjs 의 GONE_PREFIXES 와 같은지 검사한다.
export const config = {
  matcher: [
    "/stock/:path*",
    "/r/:path*",
    "/paper-trade/:path*",
    "/signals/:path*",
    "/watchlist/:path*",
    "/ranking/:path*",
    "/glossary/:path*",
    "/quiz/:path*",
    "/api/yahoo/:path*",
    "/api/upbit/:path*",
    "/api/okx/:path*",
    "/api/dart/:path*",
    "/api/signals/:path*",
    "/api/stock-resolve/:path*",
    "/api/admin/board-scan/:path*",
    "/api/admin/popular-scan/:path*",
    "/community/:path*",
    "/signup/:path*",
  ],
};
