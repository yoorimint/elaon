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
const TODAY = "2026-05-13";

export const metadata: Metadata = {
  title: "주소모음 — AI·정부지원금·무료리소스·코인 도구 추천",
  description:
    "AI 도구 30개, 정부지원금·환급금 22개, 상업용 무료 리소스 28개, 코인·주식 무료 도구 22개. 한국에서 바로 쓰는 사이트만 손으로 골라 카테고리별로 정리.",
  alternates: { canonical: HUB_URL },
  keywords: [
    "주소모음",
    "사이트 모음",
    "AI 도구 추천",
    "정부지원금 사이트",
    "무료 리소스 사이트",
    "유용한 사이트 모음",
    "큐레이션",
  ],
  openGraph: {
    type: "website",
    title: "주소모음 — AI·정부지원금·무료리소스·코인 도구 추천",
    description:
      "한국에서 바로 쓰는 사이트만 손으로 골라 카테고리별로 정리.",
    url: HUB_URL,
    locale: "ko_KR",
    siteName: "eloan",
  },
};

export default function PicksHubPage() {
  const total = totalPickCount();

  return (
    <>
      <JsonLd
        data={collectionPageLd({
          name: "주소모음 — AI·정부지원금·무료리소스·코인 도구",
          description:
            "한국에서 바로 쓰는 사이트만 카테고리별로 정리.",
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
        <nav className="text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">
            홈
          </Link>
          {" / "}
          <span className="text-neutral-700 dark:text-neutral-300">
            주소모음
          </span>
        </nav>

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

        <section className="mb-10 space-y-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          <p>
            한국 인터넷에서 주소모음이라는 단어는 도박·성인·불법 스트리밍 애그리게이터를 떠올리게 한다. 이 페이지는 그것과 정반대다. 합법·공식 서비스만, 운영자가 직접 결제·이용해본 것만, 어필리에이트 링크 없이 손으로 골라 카테고리별로 정리한다.
          </p>
          <p>
            큐레이션 기준은 단순하다. 한국에서 바로 쓸 수 있을 것(한국어 또는 한국 결제수단), 정부·공공기관·메이저 회사가 운영해 폐업 리스크 낮을 것, 운영자가 본업에서 실제로 쓰는 도구일 것. 매월 1회 전수 점검으로 사이트 폐쇄·서비스 중단·라이선스 변경을 반영한다.
          </p>
          <p>
            각 카테고리는 단순 링크 나열이 아니라 1줄 요약 + 자세한 설명 + 사용 시나리오 + 가격·대안까지 정리된 작은 매거진. 어떤 사이트가 어떤 용도에 어울리고 어떤 함정이 있는지 같이 적었다.
          </p>
        </section>

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

        <section className="mb-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-5">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-3">
            🧭 큐레이션 원칙
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-[14px] text-neutral-700 dark:text-neutral-300">
            <li>합법·공식 사이트만 등록 — 정부·공공기관·메이저 운영사</li>
            <li>한국 사용자 검색 의도 우선 — 한국어 지원·한국 서비스 우선 노출</li>
            <li>각 항목에 요약 + 자세한 설명 + 사용 시나리오 + 가격·대안 부여</li>
            <li>어필리에이트·광고 추천 일절 없음 — 운영자가 직접 검증한 서비스만</li>
            <li>매월 1회 점검 — 최근 업데이트일은 각 카테고리 상단 표기</li>
          </ul>
        </section>

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
