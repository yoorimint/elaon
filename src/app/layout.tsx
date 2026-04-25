import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/components/Header";
import { VisitLogger } from "@/components/VisitLogger";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.eloan.kr"),
  title: {
    default: "eloan 백테스트 — 코인·주식 전략을 3분 안에 검증하는 무료 도구",
    template: "%s | eloan 백테스트",
  },
  description:
    "코인·주식 투자 전략을 과거 시세로 백테스트하고 모의투자로 검증하는 무료 도구. 12종 전략 제공.",
  keywords: [
    "백테스트",
    "코인 백테스트",
    "비트코인 백테스트",
    "주식 백테스트",
    "모의투자",
    "퀀트 투자",
    "퀀트",
    "투자 전략",
    "이동평균",
    "RSI",
    "볼린저 밴드",
    "MACD",
    "그리드 매매",
    "DCA",
    "업비트 백테스트",
    "eloan",
  ],
  authors: [{ name: "eloan" }],
  applicationName: "eloan 백테스트",
  openGraph: {
    type: "website",
    siteName: "eloan 백테스트",
    locale: "ko_KR",
    url: "https://www.eloan.kr",
    title: "eloan 백테스트 — 코인·주식 전략을 3분 안에 검증",
    description:
      "코인·주식 투자 전략을 과거 시세로 백테스트하고 모의투자로 검증하는 무료 도구.",
  },
  twitter: {
    card: "summary_large_image",
    title: "eloan 백테스트",
    description: "코인·주식 전략을 실제 데이터로 3분 만에 백테스트",
  },
  alternates: {
    canonical: "https://www.eloan.kr",
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
  name: "eloan 백테스트",
  url: "https://www.eloan.kr",
  inLanguage: "ko-KR",
  description:
    "코인·주식 투자 전략을 과거 데이터로 백테스트하고 모의투자로 검증하는 무료 도구",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://www.eloan.kr/backtest",
    "query-input": "required name=search_term_string",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "eloan 백테스트",
  url: "https://www.eloan.kr",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
  },
  inLanguage: "ko-KR",
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
      </head>
      <body className="min-h-screen antialiased bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <AuthProvider>
          <VisitLogger />
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
