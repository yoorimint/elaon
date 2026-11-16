import { MOVED } from "./src/lib/removed-routes.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // iwinv 서버(메모리 2GB, 다른 사이트와 함께 씀)에서 `node server.js` 로 돌린다 (.github/workflows/deploy.yml).
  // standalone = 실행에 필요한 파일만 모은 묶음 → 서버에서 npm install·빌드를 하지 않아 메모리를 아낀다.
  output: "standalone",
  // 2026-11 없앤 주식·코인 도구 중 유입이 있던 경로 → 301 (목록·이유: src/lib/removed-routes.mjs).
  // 라우팅 단계에서 바로 응답해 서버 함수가 돌지 않는다. 나머지 없앤 경로는 src/middleware.ts 가 410.
  async redirects() {
    // permanent: true 는 308 이라, 오래된 클라이언트·검색엔진 모두 확실히 알아듣는 301 로 명시
    return MOVED.map(({ source, destination }) => ({ source, destination, statusCode: 301 }));
  },
  images: {
    // 서버에서 이미지 변환을 하지 않는다 — 작은 아이콘·광고 이미지뿐이고, 변환은 CPU·메모리를 많이 먹어
    // 같은 서버의 다른 사이트까지 느려질 수 있어서 (2026-11 Vercel → iwinv 이전).
    unoptimized: true,
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
