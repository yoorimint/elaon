// 개미팔자 (사주데이) 네이티브 광고 카드.
// 홈 · 백테스트 결과 · 봇 커뮤니티 글 — 세 곳 전부 동일 카피로 노출.
// 클릭은 `https://sajuday.kr/lp/ant` 랜딩 페이지로 직행. 외부라 target=_blank +
// rel=sponsored nofollow 로 SEO 오염 방지 + 광고 공시.

import Link from "next/link";
import Image from "next/image";

const AD_URL = "https://sajuday.kr/lp/ant";
const AD_IMG_URL = "https://sajuday.kr/static/images/ant_ranks/ant_1_queen.png";

const HOOK = "당신은 몇 등급 개미입니까?";
const BODY = "상위 5% 건물주 개미 vs 손절 개미 · 사주로 진단";

// variant prop 은 이전 호환용 — 받긴 해도 무시하고 한 가지 카피만 렌더.
type Props = { variant?: "home" | "backtest" };

export function SajudayAd(_props: Props = {}) {
  return (
    <aside className="mb-6" aria-label="광고">
      <Link
        href={AD_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group relative flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-950/40 dark:to-rose-950/30 px-3 py-2.5 transition hover:shadow-sm"
      >
        <span className="absolute top-1 right-2 text-[9px] font-medium text-neutral-500 uppercase tracking-wide">
          AD · 광고
        </span>

        <span className="shrink-0 -my-2 flex items-center justify-center w-16 h-16 rounded-full bg-white/80 dark:bg-neutral-900/60 border border-amber-200 dark:border-amber-900/60 overflow-hidden">
          <Image
            src={AD_IMG_URL}
            alt="개미팔자 마스코트"
            width={96}
            height={96}
            className="h-full w-full object-cover scale-110"
            unoptimized
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold leading-tight text-neutral-900 dark:text-neutral-100 truncate">
            🔥 {HOOK}
          </div>
          <div className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400 truncate">
            {BODY}
          </div>
        </div>

        <span className="shrink-0 text-sm font-semibold text-amber-700 dark:text-amber-300 group-hover:translate-x-0.5 transition">
          →
        </span>
      </Link>
    </aside>
  );
}
