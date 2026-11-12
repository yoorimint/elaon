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

// 공정위 추천·보증 심사지침상 필수 고지 문구 (배너 바로 아래 노출)
export const COUPANG_DISCLOSURE =
  "이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

// 하단 배너를 숨길 경로 (앞부분 일치)
export const BOTTOM_BANNER_HIDDEN_PATHS = ["/admin"];
