"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StrategyId, StrategyParams } from "@/lib/strategies";
import type { Condition } from "@/lib/diy-strategy";
import type { Timeframe } from "@/lib/upbit";
import { setHandoff } from "@/lib/paper-trade";

// 공유 백테스트 페이지 하단 액션. 봇이 작성한 백테스트든 유저가 공유한
// 백테스트든 /r/[slug] 를 통해 보게 되면 같은 버튼 세트가 노출된다.
//
// - 모의투자: 현재 공유에 저장된 파라미터(전략·기간·DIY 조건·손절익절·수수료)를
//   handoff 로 세팅하고 /paper-trade/new 로 이동 → 그대로 실시간 모의투자 시작.
// - 링크 공유: 모바일은 Web Share API, 데스크톱은 클립보드 복사.
export function SharedActions(props: {
  slug: string;
  market: string;
  timeframe: string | null;
  strategy: string;
  params: Record<string, unknown>;
  customBuy: Condition[] | null;
  customSell: Condition[] | null;
  stopLossPct: number | null;
  takeProfitPct: number | null;
  initialCash: number;
  feeBps: number;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  async function onShare() {
    const url = `${window.location.origin}/r/${props.slug}`;
    const shareData = { title: "eloan 백테스트 결과", url };
    // 모바일 Web Share 지원 브라우저면 네이티브 시트, 아니면 클립보드.
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share(shareData);
        return;
      } catch {
        // 사용자 취소 등 → 클립보드 폴백
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(`링크 복사 실패. 주소: ${url}`);
    }
  }

  function onPaperTrade() {
    if (starting) return;
    setStarting(true);
    setHandoff({
      market: props.market,
      timeframe: (props.timeframe ?? "1d") as Timeframe,
      strategy: props.strategy as StrategyId,
      params: props.params as StrategyParams,
      customBuy: (props.customBuy ?? undefined) as Condition[] | undefined,
      customSell: (props.customSell ?? undefined) as Condition[] | undefined,
      stopLossPct: props.stopLossPct ?? undefined,
      takeProfitPct: props.takeProfitPct ?? undefined,
      initialCash: props.initialCash,
      feeBps: props.feeBps,
    });
    router.push("/paper-trade/new");
  }

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onPaperTrade}
        disabled={starting}
        className="inline-flex items-center rounded-full bg-brand px-6 py-3 text-white font-semibold hover:bg-brand-dark disabled:opacity-60"
      >
        {starting ? "준비 중…" : "이 전략으로 모의투자하기 →"}
      </button>
      <button
        type="button"
        onClick={onShare}
        className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-6 py-3 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900"
      >
        {copied ? "링크 복사됨 ✓" : "링크 공유"}
      </button>
    </div>
  );
}
