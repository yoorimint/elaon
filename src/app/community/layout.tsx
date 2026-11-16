import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "커뮤니티 — 자유게시판·질문",
  description: "eloan 사용자들이 자유롭게 이야기하고 질문하는 커뮤니티.",
  alternates: { canonical: "https://www.eloan.kr/community" },
  openGraph: {
    title: "커뮤니티 | eloan",
    description: "eloan 사용자들이 자유롭게 이야기하고 질문하는 커뮤니티",
    url: "https://www.eloan.kr/community",
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
