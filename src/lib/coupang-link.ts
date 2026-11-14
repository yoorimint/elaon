// 쿠팡 파트너스 링크 검사·추출 (순수 함수 — 브라우저·서버·테스트 어디서든 쓴다).
// shop-config.ts 는 Supabase 클라이언트를 만들어 테스트에서 import 할 수 없으므로 여기에 둔다.

// 쿠팡 파트너스 링크 형식 (간편 링크 / 단축 링크)
export function isPartnersLink(url: string): boolean {
  return /^https:\/\/(link\.coupang\.com\/a\/|coupa\.ng\/)[A-Za-z0-9]+/.test(url.trim());
}

// 쿠팡으로 가는 링크 전부 (파트너스 간편·단축·딥링크 link.coupang.com/re/…, 일반 쿠팡 주소).
// 사장님 결정(2026-11-14): 글에 넣은 쿠팡 링크는 형식 검사로 막지 않고 그대로 옮긴다.
// 수수료가 안 잡히는 일반 주소인지는 알림(메모)으로만 알려 준다 (isPlainCoupangUrl).
export function isCoupangLink(url: string): boolean {
  return /^https?:\/\/(?:[a-z0-9-]+\.)*coupang\.com\/|^https?:\/\/coupa\.ng\//i.test(url.trim());
}

// 일반 쿠팡 상품 주소 (수수료가 안 잡힘 — 파트너스 링크로 바꿔야 함)
export function isPlainCoupangUrl(url: string): boolean {
  return /^https?:\/\/(?:www\.|m\.)?coupang\.com\//i.test(url.trim());
}

// 쿠팡 파트너스 "이미지+텍스트" 등의 HTML 을 붙여넣으면 링크와 이미지 주소를 뽑는다.
// 일반 링크를 넣으면 그대로 링크로 쓴다.
export function parsePartnersInput(input: string): { link: string; image?: string } {
  const text = input.trim();
  if (!text.includes("<")) return { link: text };
  const link =
    /(?:href|src)\s*=\s*["'](https:\/\/(?:link\.coupang\.com\/a\/|coupa\.ng\/)[^"']+)["']/i.exec(text)?.[1] ?? "";
  // 이미지는 쿠팡 이미지 서버 것만 허용 (외부 이미지가 사이트에 실리지 않게)
  const image = /<img[^>]+src\s*=\s*["'](https:\/\/[a-z0-9.-]*coupangcdn\.com\/[^"']+)["']/i.exec(text)?.[1];
  return { link, image };
}
