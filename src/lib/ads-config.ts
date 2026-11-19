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

// 글 화면(/섹션/글주소) 판정 — RSS 같은 .xml 주소는 글 화면이 아님
const isPostPathIn = (base: string, path: string): boolean => path.startsWith(`${base}/`) && /^[^/]+$/.test(path.slice(base.length + 1)) && !path.endsWith(".xml");

// 쇼핑 글 화면(/shop/글주소)은 공용 배너 대신 그 글의 상품 바를 글 화면이 직접 띄운다 (ShopProductBottomBar)
export function isShopPostPath(path: string): boolean {
  return isPostPathIn("/shop", path);
}

// 생활정보 글 화면(/info/글주소)은 공용 쿠팡 배너를 띄우지 않고, 글 화면이 같은 카테고리 쇼핑 글로 가는 바를 띄운다
// (InfoShopGuideBar — 같은 카테고리 쇼핑 글이 없으면 하단 바 없음. 2026-11-17 사장님 결정)
export function isInfoPostPath(path: string): boolean {
  return isPostPathIn("/info", path);
}

// 공용 하단 배너(CoupangBottomBanner)를 띄우지 않을 화면: 관리자 + 글 화면이 자기 바를 직접 띄우는 곳
export function hidesSiteBottomBar(path: string): boolean {
  return BOTTOM_BANNER_HIDDEN_PATHS.some((p) => path.startsWith(p)) || isShopPostPath(path) || isInfoPostPath(path);
}

// 상품 바 버튼 문구
export const SHOP_PRODUCT_BAR_CTA = "오늘 가격 확인하기";

// 생활정보 글 하단 "관련 쇼핑 글" 바 앞머리 (광고가 아닌 사이트 안 링크라 쿠팡 고지 문구 없음)
export const INFO_GUIDE_BAR_LABEL = "📖 관련 구매 가이드";

// 생활정보 글 하단 "관련 쇼핑 글" 바를 띄울지. 2026-11-17 사장님 결정으로 일단 끔 → 생활정보 글은 하단 바 없음
// (공용 쿠팡 배너도 생활정보 글에서는 숨김 그대로 — hidesSiteBottomBar). 다시 켜려면 true 로.
export const INFO_GUIDE_BAR_ENABLED = false;

// 하단 고정 "사주데이" 이미지 바 (사장님의 다른 사이트로 보내는 자체 홍보 — SajudayBar).
//  - 생활정보 글(2026-11-17), 주소모음 전체(/picks…, 2026-11-19) 사장님 결정
// 이미지: public/img/sajuday-640.webp (사장님이 준 2172×724 원본을 640px WebP 로 줄임, 화면에는 가로 320px).
// 주소 끝 utm_* 은 사주데이 쪽 방문 통계에서 eloan 의 어느 자리에서 넘어왔는지 구분하려는 것. 끄려면 enabled 를 false 로.
export const SAJUDAY_BAR = {
  enabled: true,
  src: "/img/sajuday-640.webp",
  width: 320,
  height: 107, // 640×213 이미지를 가로 320 으로 보인 높이
  alt: "사주데이 — 내 사주가 알려주는 지금, 가장 좋은 선택은? 사주풀이 바로가기",
} as const;

export type SajudayBarMedium = "info_bottom" | "picks_bottom";
export const sajudayHref = (medium: SajudayBarMedium): string => `https://sajuday.kr/?utm_source=eloan&utm_medium=${medium}`;

// 공용 쿠팡 배너 대신 사주데이 바를 띄울 화면 (앞부분 일치): 주소모음 전체
export const SAJUDAY_BAR_PATH_PREFIXES = ["/picks"];
export function showsSajudayBar(path: string): boolean {
  return SAJUDAY_BAR_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

// 주소모음 우측 하단 "내 재물운은?" 알약(사주데이 링크) 노출 여부.
// 코드는 남겨두고 숨김. 다시 보이게 하려면 true 로.
export const SHOW_SAJUDAY_PILL = false;
