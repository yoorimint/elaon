import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/components/Header";
import { VisitLogger } from "@/components/VisitLogger";

export const metadata: Metadata = {
  title: "eloan 코인 백테스트",
  description: "업비트 데이터로 전략을 빠르게 검증하세요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <VisitLogger />
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
