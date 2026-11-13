// 공식 사이트 확인: 주소가 실제로 열리는지, 열리면 제목·설명·본문 글자를 가져온다 (근거 자료용).

const TIMEOUT_MS = 15_000;
const MAX_TEXT = 4_000;
// 자동 접속임을 밝히는 일반 이름 (개인 정보 없음)
const USER_AGENT = "Mozilla/5.0 (compatible; eloan-picks-bot/1.0)";

export type OfficialPage = { ok: boolean; status: number; finalUrl: string; title: string; description: string; text: string };

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

function meta(html: string, name: string): string {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, "i");
  return decode((re.exec(html) ?? re2.exec(html))?.[1] ?? "").trim();
}

export function pageText(html: string): string {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
}

export async function fetchOfficial(url: string): Promise<OfficialPage> {
  const empty = { ok: false, status: 0, finalUrl: url, title: "", description: "", text: "" };
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
    });
    if (!res.ok) return { ...empty, status: res.status, finalUrl: res.url || url };
    const html = (await res.text()).slice(0, 500_000);
    const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim();
    const description = meta(html, "description") || meta(html, "og:description");
    return { ok: true, status: res.status, finalUrl: res.url || url, title, description, text: pageText(html) };
  } catch {
    return empty;
  }
}
