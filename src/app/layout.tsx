import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "eloan 코인 백테스트",
  description: "업비트 데이터로 전략을 빠르게 검증하세요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
