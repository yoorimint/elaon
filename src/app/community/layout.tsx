import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "커뮤니티 — 투자 전략·백테스트 토론",
  description:
    "eloan 사용자들이 공유한 코인·주식 백테스트 결과를 함께 토론하는 커뮤니티. 전략별 수익률, 손절·익절 세팅, DIY 조건 빌더 활용 팁까지.",
  alternates: { canonical: "https://www.eloan.kr/community" },
  openGraph: {
    title: "커뮤니티 | eloan",
    description: "다른 사용자들이 공유한 백테스트 결과를 보고 토론하세요",
    url: "https://www.eloan.kr/community",
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
