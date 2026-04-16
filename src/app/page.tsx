import Link from "next/link";
import { STRATEGIES } from "@/lib/strategies";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
      <header className="mb-10">
        <div className="text-brand text-sm font-semibold tracking-widest">ELOAN BACKTEST</div>
        <h1 className="mt-2 text-3xl sm:text-5xl font-bold leading-tight">
          코인 전략,
          <br />
          숫자로 증명하세요.
        </h1>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400 text-base sm:text-lg">
          업비트 실제 과거 데이터로 전략을 돌려봅니다.
          3분 안에 결과가 나옵니다.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/backtest"
            className="inline-flex items-center rounded-full bg-brand px-6 py-3 text-white font-semibold hover:bg-brand-dark"
          >
            백테스트 시작
          </Link>
        </div>
      </header>

      <section className="mt-12">
        <h2 className="text-lg font-semibold mb-4">지원 전략</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {STRATEGIES.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
            >
              <div className="font-semibold">{s.name}</div>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {s.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 text-xs text-neutral-500">
        * 투자 판단은 본인 책임입니다. 과거 수익률이 미래 수익을 보장하지 않습니다.
      </footer>
    </main>
  );
}
