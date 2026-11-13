// 쇼핑 글 RSS (/shop/rss.xml) — 공개된 쇼핑 글만. 사이트 전체 피드는 /rss.xml
import { buildRss, rssResponse } from "@/lib/rss";
import { listPublishedPosts } from "@/lib/shop-posts-server";

export const revalidate = 600;

const SITE = "https://www.eloan.kr";

export async function GET() {
  const posts = await listPublishedPosts(50).catch(() => []);
  return rssResponse(
    buildRss({
      title: "eloan 쇼핑 비교",
      link: `${SITE}/shop`,
      self: `${SITE}/shop/rss.xml`,
      description: "네이버 블로그·카페, 유튜브의 실사용 후기를 모아 분석한 제품 후기·비교 글",
      items: posts.map((p) => ({
        title: p.title,
        link: `${SITE}/shop/${p.slug}`,
        description: p.description ?? "",
        date: p.published_at,
      })),
    }),
  );
}
