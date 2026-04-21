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
    "비트코인·알트코인·한국주식·미국주식을 실제 과거 데이터로 백테스트하고 모의투자로 이어 검증하세요. 이동평균·RSI·볼린저·MACD·그리드 등 12종 전략 + DIY 조건 빌더 제공. 회원가입·결제 없이 바로 실행.",
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
      "이동평균·RSI·볼린저·MACD·그리드 등 12종 전략을 실제 시세로 백테스트. 모의투자로 이어서 검증하고 커뮤니티에 결과 공유까지.",
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
  // 검색엔진 사이트 소유 확인: 서치어드바이저/구글 콘솔에서 받은 코드 여기 넣으면
  // <meta name="..." content="..."/> 로 주입됨.
  verification: {
    // google: "GOOGLE_VERIFICATION_CODE",
    other: {
      // 네이버는 naver-site-verification 메타태그 사용
      // "naver-site-verification": "NAVER_VERIFICATION_CODE",
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
    <html lang="ko">
      <body className="min-h-screen antialiased">
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
