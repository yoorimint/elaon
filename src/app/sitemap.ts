import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase-server";

const SITE = "https://www.eloan.kr";

// Next.js App Router 가 /sitemap.xml 엔드포인트를 자동 생성.
// 네이버 서치어드바이저 / 구글 Search Console 에서 이 URL 을 제출하면 된다.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/backtest`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/ranking`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/community`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // 공개 공유 백테스트 + 커뮤니티 글도 색인에 노출
  try {
    const sb = createServerClient();
    const [shares, posts] = await Promise.all([
      sb
        .from("shared_backtests")
        .select("slug, created_at")
        .eq("is_private", false)
        .order("created_at", { ascending: false })
        .limit(1000),
      sb
        .from("posts")
        .select("slug, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    const shareRoutes = (shares.data ?? []).map((s: { slug: string; created_at: string }) => ({
      url: `${SITE}/r/${s.slug}`,
      lastModified: new Date(s.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
    const postRoutes = (posts.data ?? []).map((p: { slug: string; created_at: string }) => ({
      url: `${SITE}/community/${p.slug}`,
      lastModified: new Date(p.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
    return [...staticRoutes, ...shareRoutes, ...postRoutes];
  } catch {
    // DB 조회 실패 시에도 정적 경로만이라도 반환 (sitemap 자체가 깨지지 않게)
    return staticRoutes;
  }
}
