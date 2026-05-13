import type { Metadata } from "next";
import Link from "next/link";
import { PICK_CATEGORIES, HUB_FAQ, totalPickCount } from "@/lib/picks";
import {
  JsonLd,
  breadcrumbLd,
  faqLd,
  collectionPageLd,
} from "@/components/JsonLd";

const SITE = "https://www.eloan.kr";
const HUB_URL = `${SITE}/picks`;

export const metadata: Metadata = {
  title: "주소모음 — AI·정부지원금·무료리소스·코인 도구 큐레이션",
  description:
    "한국에서 바로 쓰는 사이트만 카테고리별로 손으로 골랐습니다. AI 도구 19개, 정부지원금·환급금 13개, 상업용 무료 리소스 18개, 코인·주식 무료 도구 14개. 매월 1회 점검.",
  alternates: { canonical: HUB_URL },
  keywords: [
    "주소모음",
    "사이트 모음",
    "AI 도구 모음",
    "정부지원금 모음",
    "무료 리소스 모음",
    "유용한 사이트",
    "큐레이션",
  ],
  openGraph: {
    type: "website",
    title: "주소모음 — AI·정부지원금·무료리소스·코인 도구 큐레이션",
    description:
      "한국에서 바로 쓰는 사이트만 카테고리별로 손으로 골랐습니다. 매월 1회 점검.",
    url: HUB_URL,
    locale: "ko_KR",
    siteName: "eloan",
  },
};

const TODAY = "2026-05-13";

export default function PicksHubPage() {
  const total = totalPickCount();

  return (
    <>
      <JsonLd
        data={collectionPageLd({
          name: "주소모음 — AI·정부지원금·무료리소스·코인 도구",
          description:
            "한국에서 바로 쓰는 사이트만 카테고리별로 손으로 골랐습니다.",
          url: HUB_URL,
          dateModified: TODAY,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", url: `${SITE}/` },
          { name: "주소모음", url: HUB_URL },
        ])}
      />
      <JsonLd data={faqLd(HUB_FAQ)} />

      <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        {/* Breadcrumb */}
        <nav className="text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">
            홈
          </Link>
          {" / "}
          <span className="text-neutral-700 dark:text-neutral-300">
            주소모음
          </span>
        </nav>

        {/* Hero */}
        <header className="mt-3 mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold">📚 주소모음</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
            <span>
              총 {total}개 사이트 · {PICK_CATEGORIES.length}개 카테고리
            </span>
            <span>·</span>
            <span>
              마지막 업데이트 <time dateTime={TODAY}>{TODAY}</time>
            </span>
            <span>·</span>
            <span>매월 1회 점검</span>
          </div>
        </header>

        {/* 인트로 */}
        <section className="mb-10 space-y-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          <p>
            한국 인터넷에서 '주소모음' 이라는 단어는 도박·성인·불법 스트리밍
            애그리게이터를 떠올리게 합니다. 본 사이트의 주소모음은 그것과 정반대
            방향에 있습니다. <strong>합법·공식 서비스만</strong>, 운영자가{" "}
            <strong>직접 사용해 검증</strong> 한 사이트만, <strong>어필리에이트
            링크 없이</strong> 손으로 골라 카테고리별로 정리합니다.
          </p>
          <p>
            큐레이션 기준은 단순합니다. ① 한국에서 바로 쓸 수 있을 것 (한국어 또는
            한국 결제수단), ② 정부·공공기관·메이저 운영사가 운영해 폐업 리스크가
            낮을 것, ③ 운영자가 본업에서 실제로 사용 중인 도구일 것. 매월 1회
            전수 점검으로 서비스 중단·라이선스 변경·요금 변동을 반영합니다.
          </p>
          <p>
            각 카테고리는 '단순 링크 나열' 이 아니라 <strong>1줄 요약 + 자세한
            설명 + 사용 시나리오 + 가격·대안</strong> 까지 정리된 작은 매거진
            형식입니다. 사이트마다 어울리는 용도와 함정을 함께 적었으니, '뭘 써야
            하지' 고민할 때 다시 돌아와 보세요.
          </p>
        </section>

        {/* 카테고리 카드 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-neutral-800 dark:text-neutral-200 border-l-4 border-brand pl-3">
            카테고리
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {PICK_CATEGORIES.map((cat) => {
              const count = cat.groups.reduce((s, g) => s + g.items.length, 0);
              return (
                <Link
                  key={cat.slug}
                  href={`/picks/${cat.slug}`}
                  className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 hover:border-brand hover:shadow-md transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl shrink-0">{cat.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-lg font-bold group-hover:text-brand transition">
                          {cat.shortTitle}
                        </h3>
                        <span className="text-xs text-neutral-500">
                          {count}개
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {cat.oneLiner}
                      </p>
                      <div className="mt-2 text-[11px] text-neutral-400">
                        업데이트 {cat.updatedAt}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 큐레이션 기준 */}
        <section className="mb-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-5">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-3">
            🧭 큐레이션 원칙
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-[14px] text-neutral-700 dark:text-neutral-300">
            <li>
              <strong>합법·공식</strong> 사이트만 등록 — 정부·공공기관·메이저
              운영사
            </li>
            <li>
              <strong>한국 사용자 검색 의도</strong> 우선 — 한국어 지원·한국
              서비스 우선 노출
            </li>
            <li>
              각 항목에 <strong>요약 + 자세한 설명 + 사용 시나리오 + 가격·대안</strong>{" "}
              부여 — 단순 링크 나열 X
            </li>
            <li>
              <strong>어필리에이트·광고 추천 일절 없음</strong> — 운영자가 직접
              검증한 서비스만
            </li>
            <li>매월 1회 점검 — 최근 업데이트일은 각 카테고리 상단 표기</li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">❓ 자주 묻는 질문</h2>
          <div className="space-y-3">
            {HUB_FAQ.map((f, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 open:border-brand transition"
              >
                <summary className="cursor-pointer font-semibold text-[15px] text-neutral-800 dark:text-neutral-100 list-none flex items-start gap-2">
                  <span className="text-brand shrink-0">Q.</span>
                  <span className="flex-1">{f.q}</span>
                  <span className="text-neutral-400 group-open:rotate-180 transition shrink-0">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 pl-6 text-[14px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
