"use client";

import { useEffect, useRef, useState } from "react";

// 초보자용 용어 설명 공용 컴포넌트. 지표 레이블 옆에 `?` 뱃지로 붙인다.
// 데스크톱은 호버, 모바일은 탭으로 토글. 공백만 주면 term 의 기본 설명을 찾아 씀.
const GLOSSARY: Record<string, string> = {
  MDD: "최대 낙폭(Maximum Drawdown). 전략이 기록한 고점에서 저점까지 최대로 얼마나 떨어졌는지. 작을수록 안전.",
  Sharpe:
    "수익률 대비 변동성. 연환산 초과수익 ÷ 변동성. 1 이상이면 양호, 2 이상이면 우수.",
  Sortino:
    "Sharpe 의 하방 버전. 손실 쪽 변동성만 벌점으로 계산해서, 상승 변동성 큰 전략이 불리하게 평가되는 문제를 보완.",
  Calmar:
    "연환산 수익률 ÷ 최대 낙폭(MDD). 1 이상이면 낙폭 대비 회수가 괜찮은 수준. 리스크 대비 수익 지표.",
  ProfitFactor:
    "총 이익 ÷ 총 손실. 1.0 이 손익분기점. 1.5 이상이면 안정적, 2.0 이상이면 우수.",
  WinRate:
    "이익으로 끝낸 거래 비율. 승률이 낮아도 1회 이익이 크면 총수익은 플러스일 수 있으니 Profit Factor 와 같이 봐야 함.",
  Expectancy:
    "거래 1회당 기대할 수 있는 평균 수익률. 양수여야 장기적으로 수익이 쌓인다.",
  Benchmark:
    "같은 종목을 전략 없이 사서 끝까지 들고 있었을 때의 수익률. 전략이 이걸 못 이기면 의미가 없다.",
  Walkforward:
    "과적합 방어 모드. 앞 구간에서 최적화한 파라미터를 뒷 구간에서 검증해서, 과거 데이터에만 잘 맞는 전략을 걸러냄.",
};

export function TermTooltip({
  term,
  children,
  text,
}: {
  // term: GLOSSARY 키워드. text 를 직접 넘기면 무시.
  term?: keyof typeof GLOSSARY | string;
  children?: React.ReactNode;
  text?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const body = text ?? (term ? GLOSSARY[term] : undefined);
  if (!body) return <>{children}</>;

  return (
    <span ref={ref} className="relative inline-flex items-center gap-1">
      {children}
      <button
        type="button"
        aria-label="용어 설명 보기"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onPointerEnter={(e) => {
          // 터치 디바이스는 탭 시 onMouseEnter/onClick 이 동시에 쏘여서
          // 토글이 상쇄된다. 호버는 마우스/펜만.
          if (e.pointerType !== "touch") setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "touch") setOpen(false);
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-600 text-[10px] font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-1 w-60 -translate-x-1/2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 text-[11px] leading-snug text-neutral-700 dark:text-neutral-200 shadow-lg"
        >
          {body}
        </span>
      )}
    </span>
  );
}
