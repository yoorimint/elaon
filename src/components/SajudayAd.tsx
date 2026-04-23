// 개미팔자 (사주데이) 네이티브 광고 카드.
// 홈 피드와 백테스트 결과 하단에 맥락 맞춰 문구만 달리해서 붙인다.
// 클릭은 `https://sajuday.kr/lp/ant` 랜딩 페이지로 직행. 외부라 target=_blank +
// rel=sponsored nofollow 로 SEO 오염 방지 + 광고 공시.

import Link from "next/link";

type Variant = "home" | "backtest";

type Props = { variant: Variant };

const AD_URL = "https://sajuday.kr/lp/ant";

const COPY: Record<Variant, { title: string; sub: string }> = {
  home: {
    title: "💫 개미팔자 — 투자 개미의 사주",
    sub: "사주로 진단하는 나의 투자 체질. 무료 가입 후 확인",
  },
  backtest: {
    title: "📊 백테스트 결과가 마음에 안 드시나요?",
    sub: "사주로 진단하는 내 투자 체질 · 개미팔자 (무료 가입 후 확인)",
  },
};

export function SajudayAd({ variant }: Props) {
  const { title, sub } = COPY[variant];
  return (
    <aside className="mb-8" aria-label="광고">
      <Link
        href={AD_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group block rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-950/40 dark:to-rose-950/30 p-4 sm:p-5 transition hover:shadow-md"
      >
        <div className="flex items-center gap-2 text-[10px] font-medium text-neutral-500 uppercase tracking-wide">
          <span>Ad · 광고</span>
        </div>
        <div className="mt-1.5 font-bold text-neutral-900 dark:text-neutral-100">
          {title}
        </div>
        <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {sub}
        </div>
        <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-300 group-hover:translate-x-0.5 transition">
          확인하러 가기 →
        </div>
      </Link>
    </aside>
  );
}
