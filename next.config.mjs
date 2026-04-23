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
    ],
  },
};

export default nextConfig;
