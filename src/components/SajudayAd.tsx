// 개미팔자 (사주데이) 네이티브 광고 카드.
// 홈 피드와 백테스트 결과 하단에 맥락 맞춰 문구만 달리해서 붙인다.
// 클릭은 `https://sajuday.kr/lp/ant` 랜딩 페이지로 직행. 외부라 target=_blank +
// rel=sponsored nofollow 로 SEO 오염 방지 + 광고 공시.

import Link from "next/link";
import Image from "next/image";

type Variant = "home" | "backtest";

type Props = { variant: Variant };

const AD_URL = "https://sajuday.kr/lp/ant";
const AD_IMG_URL = "https://sajuday.kr/static/images/ant_ranks/ant_1_queen.png";

// 페이지별 맥락 맞춰 1줄 후킹. 한 줄이라 모바일에서도 카드 높이 컴팩트.
const COPY: Record<Variant, { hook: string; body: string }> = {
  home: {
    hook: "당신은 몇 등급 개미입니까?",
    body: "상위 5% 건물주 개미 vs 손절 개미 · 사주로 진단",
  },
  backtest: {
    hook: "이 전략, 나랑 진짜 맞는 걸까?",
    body: "백테스트로 못 찾는 내 투자 체질 · 사주로 확인",
  },
};

export function SajudayAd({ variant }: Props) {
  const { hook, body } = COPY[variant];
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

        <span className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-white/80 dark:bg-neutral-900/60 border border-amber-200 dark:border-amber-900/60 overflow-hidden">
          <Image
            src={AD_IMG_URL}
            alt="개미팔자 마스코트"
            width={48}
            height={48}
            className="h-full w-full object-contain"
            unoptimized
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold leading-tight text-neutral-900 dark:text-neutral-100 truncate">
            🔥 {hook}
          </div>
          <div className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400 truncate">
            {body}
          </div>
        </div>

        <span className="shrink-0 text-sm font-semibold text-amber-700 dark:text-amber-300 group-hover:translate-x-0.5 transition">
          →
        </span>
      </Link>
    </aside>
  );
}
