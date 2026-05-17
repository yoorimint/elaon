"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { symbolToSlug } from "@/lib/stock-resolver";

export function StockSearchBox() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = q.trim();
    if (!input) return;
    setError(null);

    // 6자리 숫자 또는 .KS/.KQ 포함 시 바로 라우팅 (서버에서 처리)
    if (/^\d{6}(\.(KS|KQ))?$/.test(input) || /^[A-Z]{1,5}$/.test(input.toUpperCase())) {
      router.push(`/stock/${symbolToSlug(input)}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/stock-resolve?q=${encodeURIComponent(input)}`);
      const json = await res.json();
      if (json?.symbol) {
        router.push(`/stock/${symbolToSlug(json.symbol)}`);
      } else {
        setError("종목을 찾지 못했습니다. 종목명 또는 6자리 코드로 다시 검색해보세요.");
      }
    } catch {
      setError("검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="종목명 또는 코드 (예: 삼성전자, 005930, AAPL)"
          className="flex-1 px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="px-5 py-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? "검색 중…" : "검색"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </form>
  );
}
