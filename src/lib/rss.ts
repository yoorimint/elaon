// RSS 2.0 피드 만들기 (네이버 서치어드바이저·구글 제출용). 사이트 전체 /rss.xml 과 쇼핑 /shop/rss.xml 이 함께 쓴다.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export type RssItem = { title: string; link: string; description: string; date?: string | null };

export function buildRss(opts: { title: string; link: string; self: string; description: string; items: RssItem[] }): string {
  const items = opts.items
    .map((it) => {
      const d = it.date ? new Date(it.date) : null;
      return `    <item>
      <title>${esc(it.title)}</title>
      <link>${esc(it.link)}</link>
      <guid isPermaLink="true">${esc(it.link)}</guid>
      <description>${esc(it.description)}</description>${d && !isNaN(d.getTime()) ? `\n      <pubDate>${d.toUTCString()}</pubDate>` : ""}
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(opts.title)}</title>
    <link>${esc(opts.link)}</link>
    <description>${esc(opts.description)}</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${esc(opts.self)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

export function rssResponse(xml: string): Response {
  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" },
  });
}
