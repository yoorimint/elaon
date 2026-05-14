/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
