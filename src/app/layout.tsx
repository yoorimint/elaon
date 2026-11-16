import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/components/Header";
import { VisitLogger } from "@/components/VisitLogger";
import { CoupangBottomBanner } from "@/components/CoupangBottomBanner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.eloan.kr"),
  title: {
    default: "eloan — 유용한 사이트 주소모음 · 실사용 후기 쇼핑 비교",
    // 하위 페이지 제목 뒤에 사이트 이름을 붙이지 않는다 (검색 결과에 도메인·사이트 이름이 따로 보이고,
    // 모바일에서 잘릴 때 키워드 자리만 차지함)
    template: "%s",
  },
  description:
    "AI 도구·정부지원금·무료 리소스·취업·여행·가격비교 사이트를 카테고리별로 정리한 주소모음과, 실사용 후기로 비교한 쇼핑 글.",
  keywords: [
    "주소모음",
    "사이트 모음",
    "유용한 사이트",
    "AI 도구 추천",
    "정부지원금 사이트",
    "무료 폰트 사이트",
    "가격비교 사이트",
    "최저가 사이트",
    "쇼핑 비교",
    "제품 후기 비교",
    "eloan",
  ],
  authors: [{ name: "eloan" }],
  applicationName: "eloan",
  openGraph: {
    type: "website",
    siteName: "eloan",
    locale: "ko_KR",
    url: "https://www.eloan.kr",
    title: "eloan — 유용한 사이트 주소모음 · 쇼핑 비교",
    description: "한국에서 바로 쓰는 사이트를 카테고리별로 정리한 주소모음과 실사용 후기 쇼핑 비교.",
  },
  twitter: {
    card: "summary_large_image",
    title: "eloan — 주소모음 · 쇼핑 비교",
    description: "한국에서 바로 쓰는 사이트 주소모음과 실사용 후기 쇼핑 비교",
  },
  alternates: {
    canonical: "https://www.eloan.kr",
    types: { "application/rss+xml": "https://www.eloan.kr/rss.xml" },
    languages: {
      "ko-KR": "https://www.eloan.kr",
      "x-default": "https://www.eloan.kr",
    },
  },
  robots: {
    index: true,
    follow: true,
  },
  // 검색엔진 사이트 소유 확인
  verification: {
    google: "HY8SW6xhz4-x1raJXYN7SEWE7PA5r2DyWFgLt4rYyjA",
    other: {
      "naver-site-verification": "4cb9fef10cd84e338345bdd5799db0881e0bbe83",
    },
  },
};

// 구조화 데이터 (JSON-LD) — 검색엔진이 사이트 성격을 더 잘 이해하도록
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  // 구글 검색 결과 위에 표시되는 사이트 이름
  name: "eloan",
  alternateName: ["eloan.kr", "eloan 주소모음"],
  url: "https://www.eloan.kr/",
  inLanguage: "ko-KR",
  description: "한국에서 바로 쓰는 사이트 주소모음과 실사용 후기로 비교한 쇼핑 정보",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/*
          첫 페인트 전에 다크모드 클래스 결정 → 라이트→다크 깜빡임(FOUC) 방지.
          localStorage 우선, 없으면 OS prefers-color-scheme.
          'system' 저장된 경우도 OS 따라감.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var pref = localStorage.getItem('theme');
    var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = pref === 'dark' || (pref !== 'light' && sys);
    if (dark) document.documentElement.classList.add('dark');
  } catch(_) {}
})();
`,
          }}
        />
        {/* Google AdSense — 전체 페이지 공통 광고 스크립트 */}
        <Script
          id="google-adsense"
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7521397660882740"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen antialiased bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <AuthProvider>
          <VisitLogger />
          <Header />
          {children}
          <CoupangBottomBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
