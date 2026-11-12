// 사이트 광고 설정. 배너 교체·문구 수정은 이 파일만 고치면 된다.

// 쿠팡 파트너스 다이나믹 배너 (파트너스 → 링크 생성 → 다이나믹 배너 에서 발급한 값)
export const COUPANG_BOTTOM_BANNER = {
  id: 976950,
  trackingCode: "AF0866991",
  subId: null,
  template: "carousel",
  width: 320,
  height: 100,
} as const;

export const COUPANG_SCRIPT_SRC = "https://ads-partners.coupang.com/g.js";

// 쿠팡 배너가 광고 차단 등으로 안 뜰 때 대신 보여줄 자체 배너
// (link.coupang.com 파트너스 링크라 클릭·구매 수수료는 정상 집계)
export const COUPANG_FALLBACK = {
  href: "https://link.coupang.com/a/iCc9fK1iSa", // 골드박스(오늘의 특가)
  emoji: "🚀",
  title: "오늘의 쿠팡 특가",
  subtitle: "로켓배송 할인 상품",
  cta: "보러가기",
} as const;

// 이 시간 안에 쿠팡 배너가 안 뜨면 대체 배너로 전환
export const COUPANG_LOAD_TIMEOUT_MS = 8000;

// 공정위 추천·보증 심사지침상 필수 고지 문구 (배너 바로 아래 노출)
export const COUPANG_DISCLOSURE =
  "이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

// 하단 배너를 숨길 경로 (앞부분 일치)
export const BOTTOM_BANNER_HIDDEN_PATHS = ["/admin"];
