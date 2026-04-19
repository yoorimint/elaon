export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold">전략 랭킹</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        사용자들이 공유한 백테스트를 수익률 순으로 정렬했습니다.
      </p>

      {/* Period tabs skeleton */}
      <div className="mt-5 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-900"
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="h-9 bg-neutral-50 dark:bg-neutral-900" />
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-3">
              <div className="h-4 w-6 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/5 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
              </div>
              <div className="h-4 w-14 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 text-xs text-neutral-500">
        * 랭킹은 실제 수익과 무관하며, 사용자가 특정 기간/코인/파라미터로 돌린
        결과입니다. 맹신하지 마세요.
      </div>
    </main>
  );
}
