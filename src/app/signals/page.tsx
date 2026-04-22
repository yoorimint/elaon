import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "오늘의 신호 — eloan",
  description:
    "인기 종목 × 검증된 전략의 오늘 매수/매도 신호. 매일 장 마감 후 자동 갱신.",
  alternates: { canonical: "https://www.eloan.kr/signals" },
};

// 아직 크론 + board_top_signals 테이블 구축 전. 스텁 — 나중에 서버 컴포넌트로
// 테이블 읽어서 필터·정렬 UI 붙일 예정.
export default function SignalsPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold">오늘의 신호</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        인기 종목에 검증된 전략을 적용한 오늘 결과를 모아보여요.
      </p>

      <div className="mt-8 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
        <div className="text-sm text-neutral-500">곧 출시</div>
        <h2 className="mt-2 text-lg font-semibold">
          종목 풀 확장 + 매일 자동 스캔 준비 중
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          현재는 홈 "오늘의 신호" 섹션에 큐레이션 일부만 노출되고 있어요.
          <br />
          전체 풀 + 필터·정렬 UI 는 작업 중.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            홈으로
          </Link>
          <Link
            href="/watchlist"
            className="inline-flex items-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            내 관심 종목 보기 →
          </Link>
        </div>
      </div>
    </main>
  );
}
