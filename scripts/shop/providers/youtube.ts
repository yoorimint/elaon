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

// ---------- 후기 수집용 ----------

export type YoutubeVideo = { id: string; title: string; channel: string; url: string };

export async function searchVideos(
  secrets: Secrets,
  query: string,
  max: number,
): Promise<YoutubeVideo[]> {
  // search.list = 할당량 100 단위
  const r = await youtubeGet<{
    items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }[];
  }>(secrets, "search", {
    part: "snippet",
    q: query,
    type: "video",
    maxResults: max,
    regionCode: "KR",
    relevanceLanguage: "ko",
  });
  return (r.items ?? [])
    .filter((i) => i.id?.videoId)
    .map((i) => ({
      id: i.id!.videoId!,
      title: decodeEntities(i.snippet?.title ?? ""),
      channel: i.snippet?.channelTitle ?? "",
      url: `https://www.youtube.com/watch?v=${i.id!.videoId}`,
    }));
}

export type YoutubeVideoDetail = YoutubeVideo & { description: string; commentCount: number };

// videos.list = 할당량 1 단위. 설명 전체와 댓글 수(댓글 막힌 영상은 0 또는 없음)
export async function videoDetails(secrets: Secrets, videos: YoutubeVideo[]): Promise<YoutubeVideoDetail[]> {
  if (!videos.length) return [];
  const r = await youtubeGet<{
    items?: { id?: string; snippet?: { description?: string }; statistics?: { commentCount?: string } }[];
  }>(secrets, "videos", { part: "snippet,statistics", id: videos.map((v) => v.id).join(",") });
  const byId = new Map((r.items ?? []).map((i) => [i.id, i]));
  return videos.map((v) => {
    const it = byId.get(v.id);
    return {
      ...v,
      description: it?.snippet?.description ?? "",
      commentCount: Number(it?.statistics?.commentCount ?? 0),
    };
  });
}

export async function topComments(secrets: Secrets, videoId: string, max: number): Promise<string[]> {
  try {
    // commentThreads.list = 할당량 1 단위. 댓글이 막힌 영상은 403 → 빈 배열
    const r = await youtubeGet<{
      items?: { snippet?: { topLevelComment?: { snippet?: { textDisplay?: string } } } }[];
    }>(secrets, "commentThreads", {
      part: "snippet",
      videoId,
      maxResults: max,
      order: "relevance",
      textFormat: "plainText",
    });
    return (r.items ?? [])
      .map((i) => i.snippet?.topLevelComment?.snippet?.textDisplay ?? "")
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter((t) => t.length >= 8);
  } catch {
    return [];
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
