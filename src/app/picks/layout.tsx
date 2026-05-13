// /picks 하위 모든 페이지 공통 layout.
// 우측 하단 플로팅 버튼(상단 바로가기 + 사주데이) 을 여기서 렌더 →
// /picks 허브와 /picks/[slug] 상세 모두 자동 노출.
// 새 파일이라 Vercel 빌드 캐시 무효화 강제.

import { PicksFloatingButtons } from "@/components/PicksFloatingButtons";

export default function PicksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PicksFloatingButtons />
    </>
  );
}
