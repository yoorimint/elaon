// 개미팔자 (사주데이) 네이티브 광고 카드.
// 홈 피드와 백테스트 결과 하단에 맥락 맞춰 문구만 달리해서 붙인다.
// 클릭은 `https://sajuday.kr/lp/ant` 랜딩 페이지로 직행. 외부라 target=_blank +
// rel=sponsored nofollow 로 SEO 오염 방지 + 광고 공시.

import Link from "next/link";

type Variant = "home" | "backtest";

type Props = { variant: Variant };

const AD_URL = "https://sajuday.kr/lp/ant";

// 홈 버전은 매수 신호 본 직후 "나는 어떤 개미인가" 자극.
// 백테스트 버전은 결과 확인 후 "왜 내 전략이 이 모양?" 맥락 강탈.
const COPY: Record<
  Variant,
  { hook: string; punch: string; body: string[]; cta: string }
> = {
  home: {
    hook: "당신은 몇 등급 개미입니까?",
    punch: "상위 5% 건물주 개미 vs 말라죽는 손절 개미",
    body: [
      "사주로 진단하는 내 투자 DNA.",
      "공격력 · 방어력 · 투자성향까지 한눈에.",
    ],
    cta: "내 개미 등급 확인 →",
  },
  backtest: {
    hook: "이 전략, 나랑 진짜 맞는 걸까?",
    punch: "백테스트로도 못 찾는 내 투자 체질",
    body: [
      "사주가 알려주는 나의 공격력/방어력,",
      "그리고 왜 자꾸 손절하게 되는지 이유.",
    ],
    cta: "내 투자 DNA 확인 →",
  },
};

export function SajudayAd({ variant }: Props) {
  const { hook, punch, body, cta } = COPY[variant];
  return (
    <aside className="mb-8" aria-label="광고">
      <Link
        href={AD_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group block rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/30 p-4 sm:p-5 transition hover:shadow-md"
      >
        <div className="flex items-center gap-2 text-[10px] font-medium text-neutral-500 uppercase tracking-wide">
          <span>AD · 광고</span>
        </div>

        <div className="mt-3 flex items-start gap-3 sm:gap-4">
          {/* 좌측 개미 비주얼 — 정식 이미지 받기 전엔 이모지. 나중에 URL
              주시면 Image 로 교체. */}
          <div className="shrink-0 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/70 dark:bg-neutral-900/50 border border-amber-200 dark:border-amber-900/60 text-3xl sm:text-4xl select-none">
            <span role="img" aria-label="개미">
              🐜
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              🔥 {hook}
            </div>
            <div className="mt-1 text-base sm:text-lg font-extrabold leading-snug text-neutral-900 dark:text-neutral-100">
              {punch}
            </div>
            <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {body.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 rounded-full bg-white/70 dark:bg-neutral-900/50 px-3 py-1.5 text-sm font-bold text-amber-700 dark:text-amber-300 group-hover:translate-x-0.5 transition">
            {cta}
          </div>
          <div className="text-[10px] text-neutral-500">무료 가입 후 확인</div>
        </div>
      </Link>
    </aside>
  );
}
