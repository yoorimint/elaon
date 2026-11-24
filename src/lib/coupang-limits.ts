// 쿠팡 API 를 우리 쪽에서 먼저 막는 호출 한도·캐시 시간 (서버 src/lib/coupang-api.ts 와 관리자 화면 안내가 같은 값을 쓴다).
// 쿠팡 공식 한도는 확인 못 함 — 근거는 src/lib/coupang-api.ts 맨 위 주석.

export const SEARCH_CALLS_PER_HOUR = 10;
export const DEEPLINK_CALLS_PER_HOUR = 15;
export const SEARCH_CACHE_HOURS = 6;
export const DEEPLINK_CACHE_DAYS = 7;
