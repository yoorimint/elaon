// 하단 고정 바: 사주데이(사장님의 다른 사이트) 이미지 한 장. 설정은 src/lib/ads-config.ts SAJUDAY_BAR.
// 쓰는 곳: 생활정보 글 화면(medium "info_bottom"), 주소모음 전체(CoupangBottomBanner 가 "picks_bottom").
// - 틀은 BottomBarFrame (--bottom-ad-h 공유 — 글 끝이 바에 가려지지 않게). 쿠팡 고지 문구는 없음(제휴 링크가 아님).
// - 다른 사이트로 가는 같은 링크가 여러 화면에 붙으므로 nofollow (검색엔진이 링크 주고받기로 오해하지 않게), 새 창으로 연다.
// - width/height 를 적어 이미지가 늦게 떠도 화면이 밀리지 않게 한다.
// 광고 차단 필터에 안 걸리게 클래스·ID·파일 이름에 ad·banner 같은 단어를 쓰지 않는다 (CoupangBottomBanner 와 같은 규칙).

import { BottomBarFrame } from "@/components/BottomBarFrame";
import { SAJUDAY_BAR, sajudayHref, type SajudayBarMedium } from "@/lib/ads-config";

export function SajudayBar({ medium }: { medium: SajudayBarMedium }) {
  const bar = SAJUDAY_BAR;
  if (!bar.enabled) return null;
  return (
    <BottomBarFrame>
      <div className="flex justify-center px-1 py-1">
        <a href={sajudayHref(medium)} target="_blank" rel="nofollow noopener" className="block max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- 이미지 최적화를 끈 사이트 (next.config images.unoptimized) */}
          <img src={bar.src} alt={bar.alt} width={bar.width} height={bar.height} className="block h-auto max-w-full rounded-lg" />
        </a>
      </div>
    </BottomBarFrame>
  );
}
