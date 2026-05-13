import type { Metadata } from "next";
import Link from "next/link";
import { PICK_CATEGORIES, totalPickCount } from "@/lib/picks";

export const metadata: Metadata = {
  title: "주소모음 — AI·정부지원금·무료리소스·코인 도구 큐레이션",
  description:
    "한국에서 바로 쓰는 AI 도구, 정부지원금·환급금, 상업용 무료 폰트·이미지·PPT, 코인·주식 무료 도구를 카테고리별로 모았습니다.",
  alternates: { canonical: "https://www.eloan.kr/picks" },
};

export default function PicksHubPage() {
  const total = totalPickCount();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          ← 홈으로
        </Link>
        <h1 className="mt-3 text-2xl sm:text-4xl font-bold">
          📚 주소모음
        </h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400 leading-relaxed">
          진짜 쓸만한 사이트만 손으로 골라 카테고리별로 정리합니다. 도박·성인·불법
          스트리밍 같은 회색지대 링크는 없습니다. 현재{" "}
          <strong>총 {total}개 사이트</strong>를{" "}
          <strong>{PICK_CATEGORIES.length}개 카테고리</strong>로 정리했고, 매월 1회
          점검합니다.
        </p>
      </div>

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
                    <h2 className="text-lg font-bold group-hover:text-brand transition">
                      {cat.shortTitle}
                    </h2>
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

      <section className="mt-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-5 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
        <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-2">
          🧭 큐레이션 기준
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>합법·공식</strong> 사이트만 등록 — 정부·공공기관·메이저 서비스
          </li>
          <li>
            <strong>한국 사용자 검색 의도</strong> 우선 — 한국어 지원·한국 서비스 우선 노출
          </li>
          <li>
            각 항목에 <strong>1~2줄 요약 + 사용 팁</strong> 부여 — 단순 링크 나열 X
          </li>
          <li>
            매월 1회 점검 — 최근 업데이트일은 각 카테고리 상단 표기
          </li>
        </ul>
      </section>
    </main>
  );
}
