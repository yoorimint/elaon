// 네이버 뉴스 검색 API 클라이언트.
// 환경변수 NAVER_CLIENT_ID + NAVER_CLIENT_SECRET 설정 시 활성화.
// 키 없으면 사이트 정상 동작, 뉴스 섹션만 미표시.

const ID = process.env.NAVER_CLIENT_ID || "";
const SECRET = process.env.NAVER_CLIENT_SECRET || "";

export function isNaverNewsEnabled(): boolean {
  return ID.length > 0 && SECRET.length > 0;
}

export type NaverNews = {
  title: string;
  description: string;
  link: string;
  pubDate: string;
};

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'");
}

export async function fetchNaverNews(
  query: string,
  count = 10,
): Promise<NaverNews[]> {
  if (!isNaverNewsEnabled()) return [];
  try {
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${count}&sort=date`;
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": ID,
        "X-Naver-Client-Secret": SECRET,
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      items?: Array<{ title: string; description: string; link: string; pubDate: string }>;
    };
    return (json.items ?? []).map((it) => ({
      title: stripHtml(it.title),
      description: stripHtml(it.description),
      link: it.link,
      pubDate: it.pubDate,
    }));
  } catch {
    return [];
  }
}
