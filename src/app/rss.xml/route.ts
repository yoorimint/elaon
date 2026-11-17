// 사이트 전체 RSS (/rss.xml) — 네이버 서치어드바이저 "RSS 제출"에 이 주소를 넣는다.
// 쇼핑 후기·비교 글 + 생활정보 글(공개된 것만) + 서비스 비교 글(picks/vs)을 최신순으로 담는다.
// 쇼핑 글이 아직 없어도 비교 글이 있어 피드가 비지 않는다 (빈 피드는 네이버가 형식 오류로 거절).

import { COMPARISONS } from "@/lib/comparisons";
import { buildRss, rssResponse, type RssItem } from "@/lib/rss";
import { sectionPostPath, type PostSection } from "@/lib/post-section";
import { listPublishedPosts } from "@/lib/shop-posts-server";

// 글이 바뀌면 revalidateSection() 이 바로 새로 만든다 → 평소엔 1시간 캐시면 충분
export const revalidate = 3600;

const SITE = "https://www.eloan.kr";

export async function GET() {
  const postsOf = async (section: PostSection): Promise<RssItem[]> =>
    (await listPublishedPosts(50, section).catch(() => [])).map((p) => ({
      title: p.title,
      link: `${SITE}${sectionPostPath(section, p.slug)}`,
      description: p.description ?? "",
      date: p.published_at,
    }));
  const shop = await postsOf("shop");
  const info = await postsOf("info");
  const comparisons: RssItem[] = COMPARISONS.map((c) => ({
    title: c.title,
    link: `${SITE}/picks/vs/${c.slug}`,
    description: c.description,
    date: c.updatedAt,
  }));
  const items = [...shop, ...info, ...comparisons]
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, 50);
  return rssResponse(
    buildRss({
      title: "eloan",
      link: SITE,
      self: `${SITE}/rss.xml`,
      description: "실사용 후기로 비교한 제품 글, 생활정보 글과 서비스 비교 글",
      items,
    }),
  );
}
