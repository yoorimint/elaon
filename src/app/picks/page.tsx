import type { Metadata } from "next";
import Link from "next/link";
import { PICK_CATEGORIES, HUB_FAQ, totalPickCount } from "@/lib/picks";
import {
  JsonLd,
  breadcrumbLd,
  faqLd,
  collectionPageLd,
} from "@/components/JsonLd";
import { PicksFab } from "@/components/PicksFab";

const SITE = "https://www.eloan.kr";
const HUB_URL = `${SITE}/picks`;
const TODAY = "2026-05-13";

export const metadata: Metadata = {
  title: "주소모음 — AI·정부지원금·무료리소스·코인 도구 디렉토리",
  description:
    "AI 도구 31개, 정부지원금·환급금 33개, 상업용 무료 리소스 28개, 코인·주식 무료 도구 23개. 한국에서 바로 쓰는 사이트만 카테고리별로 정리한 디렉토리입니다.",
  alternates: { canonical: HUB_URL },
  keywords: [
    "주소모음",
    "사이트 모음",
    "AI 도구 디렉토리",
    "정부지원금 사이트",
    "무료 리소스 사이트",
    "유용한 사이트 모음",
  ],
  openGraph: {
    type: "website",
    title: "주소모음 — AI·정부지원금·무료리소스·코인 도구 디렉토리",
    description:
      "한국에서 바로 쓰는 사이트만 카테고리별로 정리한 디렉토리입니다.",
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
            "한국에서 바로 쓰는 사이트만 카테고리별로 정리한 디렉토리입니다.",
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
            <span>총 {total}개 사이트</span>
            <span>·</span>
            <span>{PICK_CATEGORIES.length}개 카테고리</span>
          </div>
        </header>

        <section className="mb-10 space-y-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          <p>
            AI 도구, 정부지원금·환급금, 상업용 무료 리소스, 코인·주식 무료 도구를 카테고리별로 정리한 디렉토리입니다. 한국에서 가입·결제·이용이 가능한 합법·공식 서비스만 포함합니다.
          </p>
          <p>
            각 항목에는 한 줄 요약, 자세한 설명, 사용 시나리오, 가격 정보, 같은 카테고리의 대안 서비스가 함께 표기되어 있습니다. 어떤 사이트가 어떤 용도에 어울리고 어떤 함정이 있는지 카드 형태로 비교할 수 있습니다.
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
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
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
      <PicksFab />
    </>
  );
}
