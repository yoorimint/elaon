// 쿠팡 파트너스 Open API. 모든 요청은 HMAC-SHA256 서명 헤더가 필요하다.
// 서명 메시지 = signed-date + method + path + query (query 는 ? 없이)

import { createHmac } from "node:crypto";
import { MISSING, describeError, type CheckResult, type Secrets } from "./types";

const HOST = "https://api-gateway.coupang.com";
export const COUPANG_API_BASE = "/v2/providers/affiliate_open_api/apis/openapi/v1";

function signedDate(d = new Date()): string {
  // yyMMddTHHmmssZ (UTC)
  const iso = d.toISOString(); // 2026-11-12T08:35:22.123Z
  return `${iso.slice(2, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`;
}

function authorization(method: string, path: string, query: string, access: string, secret: string) {
  const date = signedDate();
  const signature = createHmac("sha256", secret)
    .update(`${date}${method}${path}${query}`)
    .digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${access}, signed-date=${date}, signature=${signature}`;
}

export type CoupangResponse<T> = { rCode: string; rMessage: string; data: T };

export async function coupangGet<T>(
  secrets: Secrets,
  path: string,
  params: Record<string, string | number> = {},
): Promise<CoupangResponse<T>> {
  const access = secrets.COUPANG_ACCESS_KEY;
  const secret = secrets.COUPANG_SECRET_KEY;
  if (!access || !secret) throw new Error("쿠팡 키 미등록");
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  const res = await fetch(`${HOST}${path}${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: authorization("GET", path, query, access, secret),
      "Content-Type": "application/json;charset=UTF-8",
    },
  });
  if (!res.ok) throw new Error(await describeError(res));
  const json = (await res.json()) as CoupangResponse<T>;
  if (json.rCode !== "0") throw new Error(`rCode ${json.rCode} — ${json.rMessage}`);
  return json;
}

export async function checkCoupang(secrets: Secrets): Promise<CheckResult> {
  if (!secrets.COUPANG_ACCESS_KEY || !secrets.COUPANG_SECRET_KEY) return MISSING;
  try {
    // 가볍게 카테고리 베스트 1개만 조회 (1016 = 가전디지털)
    const r = await coupangGet<unknown[]>(secrets, `${COUPANG_API_BASE}/products/bestcategories/1016`, {
      limit: 1,
    });
    return { ok: true, message: `정상 (상품 ${Array.isArray(r.data) ? r.data.length : 0}개 조회)` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
