// GitHub Actions(노션 동기화 스크립트)가 사이트에 "쇼핑 화면 새로 만들기"를 요청할 때 쓰는 서명 (서버·스크립트 전용).
// 관리자 로그인 토큰이 없는 곳이라, 양쪽이 이미 가진 SUPABASE_SERVICE_ROLE_KEY 로 HMAC 서명만 보낸다 (키 원문은 보내지 않음).
// 서명 = "<시각ms>.<hex>" — 5분 지난 서명은 받지 않는다.

import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 5 * 60 * 1000;

const payload = (ts: number, slugs: string[]) => `shop-revalidate:${ts}:${slugs.join(",")}`;

export function signRevalidate(secret: string, slugs: string[], ts = Date.now()): string {
  return `${ts}.${createHmac("sha256", secret).update(payload(ts, slugs)).digest("hex")}`;
}

export function verifyRevalidate(secret: string, slugs: string[], signature: string, now = Date.now()): boolean {
  const [tsText, mac] = signature.split(".");
  const ts = Number(tsText);
  if (!secret || !mac || !Number.isFinite(ts) || Math.abs(now - ts) > MAX_AGE_MS) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(payload(ts, slugs)).digest("hex"));
  const got = Buffer.from(mac);
  return want.length === got.length && timingSafeEqual(want, got);
}

// 스크립트(GitHub Actions)에서 사이트에 "쇼핑 화면 새로 만들기" 요청 → 결과를 한 줄 글로 돌려준다 (로그용).
// 글 화면은 하루, 목록·RSS 는 1시간 캐시라, 글을 공개·삭제한 스크립트는 꼭 이걸 불러야 바로 반영된다.
// siteUrl 기본값은 SITE_URL 환경변수(없으면 운영 주소), fetchImpl 은 테스트용 (기본: 전역 fetch)
// section: 생활정보 글이면 "info" (/info 화면을 새로 만든다). 없으면 쇼핑 — 예전 요청과 같은 본문
export async function requestShopRevalidate(
  secret: string,
  slugs: string[],
  {
    siteUrl = (process.env.SITE_URL ?? "https://www.eloan.kr").replace(/\/$/, ""),
    fetchImpl = fetch,
    section,
  }: { siteUrl?: string; fetchImpl?: typeof fetch; section?: "info" } = {},
): Promise<string> {
  if (!slugs.length) return "화면 갱신 요청: 바뀐 글 없음";
  const res = await fetchImpl(`${siteUrl}/api/shop/revalidate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-shop-signature": signRevalidate(secret, slugs) },
    body: JSON.stringify(section ? { slugs, section } : { slugs }),
  }).catch((e: unknown) => ({ ok: false, status: String(e) }) as const);
  return `화면 갱신 요청: ${res.ok ? "완료" : `실패 (${res.status}) — 목록은 1시간, 글 화면은 하루 안에 저절로 갱신돼요`}`;
}
