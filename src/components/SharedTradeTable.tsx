"use client";

import { useState } from "react";
import { formatMoney, type Currency } from "@/lib/market";

type SharedTrade = {
  entryIndex: number;
  entryPrice: number;
  exitIndex: number | null;
  exitPrice: number | null;
  pnlPct: number | null;
};

const INITIAL_ROWS = 5;
const MAX_ROWS = 100;

// 공유 페이지에서 거래 내역 표로 보여주기. 기본 5건, 더보기 누르면 최근 100건.
export function SharedTradeTable({
  trades,
  currency,
}: {
  trades: SharedTrade[];
  currency: Currency;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!trades || trades.length === 0) return null;
  const capped = trades.slice(-MAX_ROWS).reverse(); // 최근순 (최대 100건)
  const shown = expanded ? capped : capped.slice(0, INITIAL_ROWS);
  const remaining = capped.length - shown.length;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold mb-3">거래 내역 ({trades.length}회)</h2>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-right">진입가</th>
              <th className="px-3 py-2 text-right">청산가</th>
              <th className="px-3 py-2 text-right">손익</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t, i) => {
              const pnl = t.pnlPct ?? null;
              return (
                <tr
                  key={`${t.entryIndex}-${i}`}
                  className="border-t border-neutral-200 dark:border-neutral-800"
                >
                  <td className="px-3 py-2 text-neutral-500">
                    {trades.length - i}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(t.entryPrice, currency)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {t.exitPrice != null ? formatMoney(t.exitPrice, currency) : "-"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-semibold ${
                      pnl == null
                        ? ""
                        : pnl >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {pnl == null
                      ? "-"
                      : `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!expanded && remaining > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full border-t border-neutral-200 dark:border-neutral-800 px-3 py-2.5 text-sm font-medium text-brand hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
          >
            더보기 ({remaining}건)
          </button>
        )}
        {expanded && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-full border-t border-neutral-200 dark:border-neutral-800 px-3 py-2.5 text-sm text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
          >
            접기
          </button>
        )}
        {expanded && trades.length > MAX_ROWS && (
          <div className="px-3 py-2 text-xs text-neutral-500 border-t border-neutral-200 dark:border-neutral-800">
            최근 {MAX_ROWS}건만 표시 · 총 {trades.length}건
          </div>
        )}
      </div>
    </div>
  );
}
