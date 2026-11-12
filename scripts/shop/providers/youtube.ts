// YouTube Data API v3. 키는 쿼리스트링 key= 로 전달.

import { MISSING, describeError, type CheckResult, type Secrets } from "./types";

const HOST = "https://www.googleapis.com/youtube/v3";

export async function youtubeGet<T>(
  secrets: Secrets,
  resource: string,
  params: Record<string, string | number>,
): Promise<T> {
  const key = secrets.YOUTUBE_API_KEY;
  if (!key) throw new Error("유튜브 키 미등록");
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    key,
  });
  const res = await fetch(`${HOST}/${resource}?${qs}`);
  if (!res.ok) throw new Error(await describeError(res));
  return (await res.json()) as T;
}

export async function checkYoutube(secrets: Secrets): Promise<CheckResult> {
  if (!secrets.YOUTUBE_API_KEY) return MISSING;
  try {
    // 할당량 1 단위짜리 가벼운 호출
    const r = await youtubeGet<{ items?: unknown[] }>(secrets, "videoCategories", {
      part: "snippet",
      regionCode: "KR",
    });
    return { ok: true, message: `정상 (카테고리 ${r.items?.length ?? 0}개 조회)` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
