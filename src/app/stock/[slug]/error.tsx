"use client";

// 종목 보고서를 만들다 시세 서버(야후·Stooq) 일시 장애로 실패했을 때 보이는 화면.
// page.tsx 가 일시 장애를 오류로 던지는 이유: 실패 화면이 ISR 캐시에 6시간 동안 남지 않게 하려고.
// (이미 캐시된 정상 화면이 있으면 Next 가 그걸 계속 보여 주고, 이 화면은 첫 생성이 실패했을 때만 나온다)

import Link from "next/link";

export default function StockError() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <nav className="text-sm text-neutral-500 mb-6">
        <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">홈</Link>
        {" / "}
        <Link href="/stock" className="hover:text-neutral-900 dark:hover:text-white">종목 검색</Link>
      </nav>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
        종목 데이터를 불러올 수 없습니다
      </h1>
      <p className="mt-3 text-[15px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
        시세 서버(야후·Stooq) 응답이 잠시 늦거나 비어 있었습니다. 잠시 후 다시 시도해 주세요.
      </p>
      <ul className="mt-4 text-sm text-neutral-700 dark:text-neutral-300 list-disc list-inside space-y-1">
        <li>존재하지 않거나 상장폐지된 종목코드</li>
        <li>한국 종목인데 .KS / .KQ 접미사 없이 입력 (예: <code>005930</code>, <code>005930.KS</code>)</li>
      </ul>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          // 서버에서 다시 만들어야 하므로 화면만 다시 그리는 reset() 대신 새로고침
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-5 py-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold hover:opacity-90 transition"
        >
          다시 시도
        </button>
        <Link
          href="/stock"
          className="inline-flex items-center px-5 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
        >
          다시 검색하기
        </Link>
      </div>
    </main>
  );
}
