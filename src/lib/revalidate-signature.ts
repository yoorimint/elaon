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
