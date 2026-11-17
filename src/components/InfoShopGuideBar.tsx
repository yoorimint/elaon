// 생활정보 글 화면 하단 고정 바: 같은 카테고리의 쇼핑 글(구매 가이드) 1편으로 가는 한 줄 링크.
// - 어떤 글을 띄울지는 서버가 글 화면을 만들 때 고른다 (src/lib/shop-posts-public.ts fetchShopGuideForInfo). 없으면 바 없음.
// - 사이트 안 링크(광고 아님)라 rel·새 창·쿠팡 고지 문구가 없다. 틀은 BottomBarFrame (--bottom-ad-h 공유).
// - 공용 쿠팡 배너는 이 화면에서 숨긴다 (src/lib/ads-config.ts isInfoPostPath).
// 광고 차단 필터에 안 걸리게 클래스·ID 에 ad·banner 같은 단어를 쓰지 않는다 (CoupangBottomBanner 와 같은 규칙).

import { BottomBarFrame } from "@/components/CoupangBottomBanner";
import { INFO_GUIDE_BAR_LABEL } from "@/lib/ads-config";
import { sectionPostPath } from "@/lib/post-section";
import type { RelatedPost } from "@/lib/shop-post-types";

export function InfoShopGuideBar({ guide }: { guide: Pick<RelatedPost, "slug" | "title"> | null }) {
  if (!guide) return null;
  return (
    <BottomBarFrame>
      <a
        href={sectionPostPath("shop", guide.slug)}
        className="mx-auto flex h-12 max-w-3xl items-center gap-1.5 px-4 text-sm text-neutral-800 hover:text-brand dark:text-neutral-100"
      >
        <span className="shrink-0 font-semibold text-brand">{INFO_GUIDE_BAR_LABEL}</span>
        <span className="shrink-0 text-neutral-400" aria-hidden="true">
          ·
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{guide.title}</span>
        <span className="shrink-0 text-base text-neutral-400" aria-hidden="true">
          ›
        </span>
      </a>
    </BottomBarFrame>
  );
}
