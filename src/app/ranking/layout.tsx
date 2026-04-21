import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "전략 랭킹 — 수익률 상위 백테스트",
  description:
    "사용자들이 공유한 코인·주식 백테스트 중 수익률 상위 전략을 한눈에. 이동평균, RSI, 볼린저, MACD 등 어떤 전략이 가장 잘 먹히는지 실시간 랭킹으로 확인.",
  alternates: { canonical: "https://www.eloan.kr/ranking" },
  openGraph: {
    title: "전략 랭킹 | eloan",
    description: "수익률 상위 백테스트 전략 랭킹",
    url: "https://www.eloan.kr/ranking",
  },
};

export default function RankingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
