"use client";

import { conditionToText } from "./ConditionEditor";
import type { Condition } from "@/lib/diy-strategy";

// 공유 결과 페이지에서 DIY 전략의 매수/매도 조건과 손절/익절 값을 텍스트로 나열.
export function SharedDIYDetails(props: {
  customBuy?: Condition[] | null;
  customSell?: Condition[] | null;
  stopLossPct?: number | null;
  takeProfitPct?: number | null;
  diyAllowReentry?: boolean | null;
  diySellFraction?: number | null;
}) {
  const {
    customBuy,
    customSell,
    stopLossPct,
    takeProfitPct,
    diyAllowReentry,
    diySellFraction,
  } = props;
  const hasBuy = (customBuy?.length ?? 0) > 0;
  const hasSell = (customSell?.length ?? 0) > 0;
  const hasSL = (stopLossPct ?? 0) > 0;
  const hasTP = (takeProfitPct ?? 0) > 0;
  const hasReentry = diyAllowReentry === true;
  const hasPartialSell =
    typeof diySellFraction === "number" &&
    diySellFraction > 0 &&
    diySellFraction < 1;
  if (!hasBuy && !hasSell && !hasSL && !hasTP && !hasReentry && !hasPartialSell)
    return null;

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 p-4 text-sm space-y-2">
      <div className="font-semibold">DIY 조건</div>
      {hasBuy && customBuy && (
        <div>
          <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs mr-2 font-semibold">
            매수
          </span>
          <span className="text-neutral-700 dark:text-neutral-200">
            {customBuy.map((c) => conditionToText(c)).join("  AND  ")}
          </span>
        </div>
      )}
      <div>
        <span className="inline-block rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 text-xs mr-2 font-semibold">
          매도
        </span>
        <span className="text-neutral-700 dark:text-neutral-200">
          {hasSell && customSell
            ? customSell.map((c) => conditionToText(c)).join("  OR  ")
            : "조건 없음 (손절/익절만 작동)"}
        </span>
      </div>
      {(hasSL || hasTP) && (
        <div className="text-xs text-neutral-500">
          {hasSL && <>손절 -{stopLossPct}% </>}
          {hasTP && <>익절 +{takeProfitPct}%</>}
        </div>
      )}
      {(hasReentry || hasPartialSell) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {hasReentry && (
            <span className="inline-flex items-center rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
              연속 매수 허용 (물타기)
            </span>
          )}
          {hasPartialSell && (
            <span className="inline-flex items-center rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
              분할 매도 {Math.round((diySellFraction as number) * 100)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
