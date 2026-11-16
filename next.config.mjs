import { MOVED } from "./src/lib/removed-routes.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 2026-11 없앤 주식·코인 도구 중 유입이 있던 경로 → 301 (목록·이유: src/lib/removed-routes.mjs).
  // 라우팅 단계에서 바로 응답해 서버 함수가 돌지 않는다. 나머지 없앤 경로는 src/middleware.ts 가 410.
  async redirects() {
    // permanent: true 는 308 이라, 오래된 클라이언트·검색엔진 모두 확실히 알아듣는 301 로 명시
    return MOVED.map(({ source, destination }) => ({ source, destination, statusCode: 301 }));
  },
  images: {
    remotePatterns: [
      // 개미팔자 광고 마스코트 (sajuday.kr) — /ads/ 로 로컬 프록시 안 쓰고
      // next/image 가 원본 도메인에서 최적화해 가져오게.
      {
        protocol: "https",
        hostname: "sajuday.kr",
        pathname: "/static/images/**",
      },
      // 비교 페이지 브랜드 아이콘 (구글 favicon 서비스)
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons**",
      },
    ],
  },
};

export default nextConfig;
