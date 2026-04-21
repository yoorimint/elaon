import type { MetadataRoute } from "next";

const SITE = "https://www.eloan.kr";

// /robots.txt 자동 생성. 공개 페이지만 긁게 하고, 관리자/유저 개인영역/API 는
// 차단. 네이버 Yeti / 다음 Daumoa 도 명시적으로 허용 (일부 파서에서 유리).
const DISALLOW_PATHS = [
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
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
      // 네이버 검색 로봇
      {
        userAgent: "Yeti",
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
      // 다음 검색 로봇
      {
        userAgent: "Daumoa",
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
      // 구글 로봇
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
