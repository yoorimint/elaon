import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "백테스트 — 비트코인·주식 전략 시뮬레이터",
  description:
    "KRW 코인(업비트), 한국·미국 주식, 크립토 선물을 실제 과거 시세로 백테스트. 이동평균 크로스, RSI, 볼린저 밴드, MACD, 스토캐스틱, 일목균형표, DCA, 그리드 매매 등 12종 전략 + DIY 조건 빌더.",
  alternates: { canonical: "https://www.eloan.kr/backtest" },
  openGraph: {
    title: "백테스트 | eloan",
    description: "코인·주식 전략을 3분 안에 과거 데이터로 검증하는 무료 백테스트 도구",
    url: "https://www.eloan.kr/backtest",
  },
};

export default function BacktestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
