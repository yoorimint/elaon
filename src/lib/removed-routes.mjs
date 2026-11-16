// 2026-11 주식·코인 도구 제거 — 없앤 경로를 어떻게 응답할지 한 곳에 정리.
// (사장님 결정: Vercel 사용량 초과 → 주식·코인 기능 제거, 사이트를 주소모음·쇼핑 중심으로)
//
// - 410 Gone: src/middleware.ts 가 처리 (matcher 와 이 목록이 같아야 함 — scripts/cache-config.test.ts 가 확인)
// - 301: next.config.mjs redirects() 가 이 파일의 MOVED 를 그대로 쓴다 (서버 함수 없이 라우팅 단계에서 바로 응답)
// next.config.mjs 에서도 읽어야 해서 .mjs (TS 는 allowJs 로 타입 추론)

// 410 으로 응답할 경로 (앞부분 일치: "/stock" 은 /stock 과 /stock/아무거나)
export const GONE_PREFIXES = [
  "/stock", // 종목 검색·종목 페이지 — 검색 유입 없음
  "/r", // 백테스트 공유 결과
  "/paper-trade", // 모의투자
  "/signals", // 오늘의 신호
  "/watchlist", // 관심종목
  "/ranking", // 전략 랭킹
  "/glossary", // 투자 지표 사전
  "/quiz", // 투자 전략 추천 퀴즈 (결과가 백테스트 프리셋)
  "/api/yahoo", // 시세 프록시들
  "/api/upbit",
  "/api/okx",
  "/api/dart",
  "/api/signals",
  "/api/stock-resolve",
  "/api/admin/board-scan", // 신호 스캔 크론
  "/api/admin/popular-scan",
];

// 301 로 옮길 경로. 유입이 조금이라도 있던 곳은 410 대신 가까운 새 화면으로 보낸다.
/** @type {{ source: string; destination: string; why: string }[]} */
export const MOVED = [
  // 홈 다음으로 많이 들어오던 도구 화면 — 즐겨찾기·외부 링크로 오는 사람을 새 홈(주소모음·쇼핑)으로
  { source: "/backtest", destination: "/", why: "예전 대표 기능, 외부 링크·즐겨찾기 유입" },
  // 주소모음 안의 자체 백테스트 소개 페이지 — 같은 카테고리(코인·주식 도구) 목록으로
  { source: "/picks/coin/eloan-backtest", destination: "/picks/coin", why: "주소모음 항목 삭제" },
];

export const GONE_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>종료된 페이지 — eloan</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.25rem;line-height:1.6;color:#262626"><h1 style="font-size:1.4rem">종료된 페이지입니다</h1><p>주식·코인 도구(백테스트·모의투자·종목 페이지 등)는 서비스를 종료했습니다.</p><p><a href="/picks" style="color:#2563eb">주소모음</a> · <a href="/shop" style="color:#2563eb">쇼핑</a> · <a href="/" style="color:#2563eb">홈</a></p></body></html>`;
