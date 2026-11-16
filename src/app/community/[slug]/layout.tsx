// 이 경로의 화면(page.tsx)은 클라이언트 컴포넌트라 서버가 그리는 HTML 은 모든 글에 같은 뼈대뿐이다.
// 글 내용·로그인 상태별 화면은 브라우저에서 불러온다 (page.tsx 의 useEffect).
// generateStaticParams 빈 배열 = 첫 요청 때 뼈대를 한 번 만들어 캐시 → 요청마다 서버 함수가 돌지 않는다.
// (없으면 동적 경로(ƒ)라 로봇·방문자 요청마다 서버에서 다시 그렸다)
export function generateStaticParams(): { slug: string }[] {
  return [];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
