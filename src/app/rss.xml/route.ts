// 사이트 전체 RSS (/rss.xml) — 네이버 서치어드바이저 "RSS 제출"에 이 주소를 넣는다.
// 쇼핑 후기·비교 글(공개된 것만) + 서비스 비교 글(picks/vs)을 최신순으로 담는다.
// 쇼핑 글이 아직 없어도 비교 글이 있어 피드가 비지 않는다 (빈 피드는 네이버가 형식 오류로 거절).

import { getComparisonsMerged } from "@/lib/picks-auto";
import { buildRss, rssResponse, type RssItem } from "@/lib/rss";
import { listPublishedPosts } from "@/lib/shop-posts-server";

export const revalidate = 600;

const SITE = "https://www.eloan.kr";

export async function GET() {
  const shop: RssItem[] = (await listPublishedPosts(50).catch(() => [])).map((p) => ({
    title: p.title,
    link: `${SITE}/shop/${p.slug}`,
    description: p.description ?? "",
    date: p.published_at,
  }));
  const comparisons: RssItem[] = (await getComparisonsMerged()).map((c) => ({
    title: c.title,
    link: `${SITE}/picks/vs/${c.slug}`,
    description: c.description,
    date: c.updatedAt,
  }));
  const items = [...shop, ...comparisons]
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, 50);
  return rssResponse(
    buildRss({
      title: "eloan",
      link: SITE,
      self: `${SITE}/rss.xml`,
      description: "실사용 후기로 비교한 제품·서비스 글과 코인·주식 백테스트 정보",
      items,
    }),
  );
}
