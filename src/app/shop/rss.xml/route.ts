// 쇼핑 글 RSS 피드 (/shop/rss.xml) — 네이버 서치어드바이저에 제출하면 새 글을 더 빨리 수집한다.
// 공개된 글만 (초안은 목록 조회에서 제외됨)

import { listPublishedPosts } from "@/lib/shop-posts-server";

export const revalidate = 600;

const SITE = "https://www.eloan.kr";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const posts = await listPublishedPosts(50);
  const items = posts
    .map((p) => {
      const url = `${SITE}/shop/${p.slug}`;
      const date = p.published_at ? new Date(p.published_at).toUTCString() : "";
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(p.description ?? "")}</description>
      ${date ? `<pubDate>${date}</pubDate>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>eloan 쇼핑 비교</title>
    <link>${SITE}/shop</link>
    <description>네이버 블로그·카페, 유튜브의 실사용 후기를 모아 분석한 제품 후기·비교 글</description>
    <language>ko</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" },
  });
}
