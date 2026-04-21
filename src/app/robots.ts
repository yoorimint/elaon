import type { MetadataRoute } from "next";

const SITE = "https://www.eloan.kr";

// /robots.txt 자동 생성. 검색엔진이 공개 페이지만 긁게 하고, 관리자/유저
// 개인영역/API 는 차단.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/me",
          "/suggest",
          "/paper-trade",
          "/paper-trade/",
          "/api/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
