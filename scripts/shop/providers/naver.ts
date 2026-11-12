// NAVER API HUB 검색 (2026-06 개발자센터에서 이관).
// - 주소: naverapihub.apigw.ntruss.com/search/v1/{type}
// - 헤더: X-NCP-APIGW-API-KEY-ID / X-NCP-APIGW-API-KEY (HUB 앱에서 발급한 키)
// - 쇼핑 검색은 2026-07-31 종료되어 HUB 에 없음

import { MISSING, describeError, type CheckResult, type Secrets } from "./types";

const HOST = "https://naverapihub.apigw.ntruss.com";

export type NaverSearchType = "blog" | "cafearticle" | "kin"; // kin = 지식iN

export type NaverSearchItem = {
  title: string;
  link: string;
  description: string;
  postdate?: string;
};

export async function naverSearch(
  secrets: Secrets,
  type: NaverSearchType,
  query: string,
  display = 10,
): Promise<NaverSearchItem[]> {
  const id = secrets.NAVER_CLIENT_ID;
  const key = secrets.NAVER_CLIENT_SECRET;
  if (!id || !key) throw new Error("네이버 키 미등록");
  const qs = new URLSearchParams({ query, display: String(display), sort: "sim" });
  const res = await fetch(`${HOST}/search/v1/${type}?${qs}`, {
    headers: { "X-NCP-APIGW-API-KEY-ID": id, "X-NCP-APIGW-API-KEY": key },
  });
  if (!res.ok) throw new Error(await describeError(res));
  const json = (await res.json()) as { items?: NaverSearchItem[] };
  return json.items ?? [];
}

export async function checkNaver(secrets: Secrets): Promise<CheckResult> {
  if (!secrets.NAVER_CLIENT_ID || !secrets.NAVER_CLIENT_SECRET) return MISSING;
  try {
    const items = await naverSearch(secrets, "blog", "로봇청소기 후기", 1);
    return { ok: true, message: `정상 (블로그 ${items.length}건 조회)` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

// 검색 결과의 <b> 태그·HTML 엔티티 제거
export function cleanNaverText(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
