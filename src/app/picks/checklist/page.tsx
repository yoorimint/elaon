import type { Metadata } from "next";
import Link from "next/link";
import {
  CHECKLISTS,
  totalChecklistCount,
  checklistItemCount,
  checklistImportantCount,
} from "@/lib/checklists";
import { DdayBadge } from "@/components/DdayBadge";
import {
  JsonLd,
  breadcrumbLd,
  collectionPageLd,
  itemListLd,
} from "@/components/JsonLd";

const SITE = "https://www.eloan.kr";
const HUB_URL = `${SITE}/picks/checklist`;
const TODAY = "2026-05-14";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "체크리스트 — 부수입·세금·환급금 빠뜨림 방지 인터랙티브 가이드",
  description:
    "유튜버·블로거 종합소득세, 부수입 세금, 정부 환급금 등 한국 사용자를 위한 인터랙티브 체크리스트. 본인 상황별 자동 필터링과 진행률 저장.",
  alternates: { canonical: HUB_URL },
  keywords: [
    "체크리스트",
    "유튜버 종합소득세",
    "부수입 세금 신고",
    "프리랜서 종소세",
    "정부 환급금 체크리스트",
    "eloan",
  ],
  openGraph: {
    type: "website",
    title: "체크리스트 — 부수입·세금·환급금 빠뜨림 방지 인터랙티브 가이드",
    description:
      "본인 상황에 맞는 항목만 필터링해서 체크하고 진행률을 저장합니다.",
    url: HUB_URL,
    locale: "ko_KR",
    siteName: "eloan",
  },
};

export default function ChecklistHubPage() {
  const total = totalChecklistCount();

  return (
    <>
      <JsonLd
        data={collectionPageLd({
          name: "체크리스트 — eloan.kr",
          description:
            "유튜버·블로거 종합소득세, 부수입 세금, 정부 환급금 등 한국 사용자를 위한 인터랙티브 체크리스트.",
          url: HUB_URL,
          dateModified: TODAY,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", url: `${SITE}/` },
          { name: "주소모음", url: `${SITE}/picks` },
          { name: "체크리스트", url: HUB_URL },
        ])}
      />
      <JsonLd
        data={itemListLd({
          name: "체크리스트 목록",
          url: HUB_URL,
          items: CHECKLISTS.map((c) => ({
            name: c.shortTitle,
            url: `${HUB_URL}/${c.slug}`,
            description: c.oneLiner,
          })),
        })}
      />

      <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <nav className="text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">
            홈
          </Link>
          {" / "}
          <Link href="/picks" className="hover:text-neutral-900 dark:hover:text-white">
            주소모음
          </Link>
          {" / "}
          <span className="text-neutral-700 dark:text-neutral-300">체크리스트</span>
        </nav>

        <header className="mt-3 mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold">✅ 체크리스트</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
            부수입·세금·환급금처럼 마감이 정해진 일을 빠뜨리지 않고 처리할 수 있게 정리한 인터랙티브 체크리스트입니다. 본인 상황에 맞는 항목만 자동으로 필터링되고, 체크 진행률은 브라우저에 저장되어 다음 방문에도 유지됩니다.
          </p>
          <div className="mt-3 text-xs text-neutral-500">
            현재 {total}개 체크리스트
          </div>
        </header>

        <section className="space-y-4">
          {CHECKLISTS.map((c) => {
            const itemCount = checklistItemCount(c);
            const importantCount = checklistImportantCount(c);
            return (
              <Link
                key={c.slug}
                href={`/picks/checklist/${c.slug}`}
                className="block rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 hover:border-brand hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl shrink-0">{c.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-neutral-100">
                        {c.shortTitle}
                      </h2>
                      {c.deadline && (
                        <span className="text-sm">
                          <DdayBadge deadline={c.deadline} />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {c.oneLiner}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-neutral-600 dark:text-neutral-400">
                      <span>📋 {itemCount}개 항목</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">⚠ 필수 {importantCount}개</span>
                      {c.deadline && <span>📅 {c.deadline}</span>}
                      {c.totalImpact && <span className="text-amber-700 dark:text-amber-400 font-bold">💰 {c.totalImpact}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="mt-12">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            앞으로 추가될 체크리스트
          </h2>
          <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1.5 list-disc list-inside">
            <li>AI 도구 + 토스 사이드잡으로 부수입 시작하기</li>
            <li>유튜브 AI 자동영상 수익화 금지 대응 가이드</li>
            <li>외주·프리랜서 첫 계약 체크리스트</li>
            <li>해외 송금 받을 때 외국환·세금 체크리스트</li>
            <li>유튜버·인플루언서 첫 협찬 세금 체크리스트</li>
          </ul>
        </section>
      </main>
    </>
  );
}
