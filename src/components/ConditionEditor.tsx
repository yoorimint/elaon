"use client";

import {
  INDICATOR_LABELS,
  OP_LABELS,
  type Condition,
  type ConditionOp,
  type IndicatorRef,
} from "@/lib/diy-strategy";
import { NumInput } from "./NumInput";

const INDICATOR_KINDS: IndicatorRef["kind"][] = [
  "close",
  "open",
  "high",
  "low",
  "volume",
  "sma",
  "ema",
  "rsi",
  "bb_upper",
  "bb_middle",
  "bb_lower",
  "macd",
  "macd_signal",
  "stoch_k",
  "stoch_d",
  "atr",
  "williams_r",
  "cci",
  "adx",
  "roc",
  "obv",
  "mfi",
  "sar",
  "vwap",
  "ichimoku_conv",
  "ichimoku_base",
  "const",
];

const OP_ORDER: ConditionOp[] = ["gt", "lt", "gte", "lte", "cross_up", "cross_down"];

function defaultIndicator(kind: IndicatorRef["kind"]): IndicatorRef {
  switch (kind) {
    case "close":
    case "open":
    case "high":
    case "low":
    case "volume":
    case "obv":
    case "vwap":
      return { kind };
    case "sma":
    case "ema":
      return { kind, period: 20 };
    case "rsi":
    case "atr":
    case "williams_r":
    case "cci":
    case "adx":
    case "roc":
    case "mfi":
      return { kind, period: 14 };
    case "stoch_k":
      return { kind, period: 14 };
    case "stoch_d":
      return { kind, period: 14, smooth: 3 };
    case "bb_middle":
      return { kind, period: 20 };
    case "bb_upper":
    case "bb_lower":
      return { kind, period: 20, stddev: 2 };
    case "macd":
      return { kind, fast: 12, slow: 26 };
    case "macd_signal":
      return { kind, fast: 12, slow: 26, signal: 9 };
    case "sar":
      return { kind, step: 0.02, max: 0.2 };
    case "ichimoku_conv":
      return { kind, period: 9 };
    case "ichimoku_base":
      return { kind, period: 26 };
    case "const":
      return { kind, value: 0 };
  }
}

const SMALL_NUM =
  "w-14 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-1.5 py-1 text-xs";
const TINY_NUM =
  "w-16 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-1.5 py-1 text-xs";

function IndicatorInline({
  value,
  onChange,
}: {
  value: IndicatorRef;
  onChange: (v: IndicatorRef) => void;
}) {
  function setKind(kind: IndicatorRef["kind"]) {
    onChange(defaultIndicator(kind));
  }

  return (
    <div className="inline-flex items-center gap-1 flex-wrap">
      <select
        value={value.kind}
        onChange={(e) => setKind(e.target.value as IndicatorRef["kind"])}
        className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-sm font-medium"
      >
        {INDICATOR_KINDS.map((k) => (
          <option key={k} value={k}>
            {INDICATOR_LABELS[k]}
          </option>
        ))}
      </select>

      {(value.kind === "sma" ||
        value.kind === "ema" ||
        value.kind === "rsi" ||
        value.kind === "atr" ||
        value.kind === "williams_r" ||
        value.kind === "cci" ||
        value.kind === "adx" ||
        value.kind === "roc" ||
        value.kind === "mfi" ||
        value.kind === "stoch_k" ||
        value.kind === "bb_middle" ||
        value.kind === "ichimoku_conv" ||
        value.kind === "ichimoku_base") && (
        <>
          <NumInput
            className={SMALL_NUM}
            value={value.period}
            min={2}
            onChange={(period) => onChange({ ...value, period })}
          />
          <span className="text-xs text-neutral-500">일</span>
        </>
      )}

      {value.kind === "stoch_d" && (
        <>
          <NumInput
            className={SMALL_NUM}
            value={value.period}
            min={3}
            onChange={(period) => onChange({ ...value, period })}
          />
          <span className="text-xs text-neutral-500">일</span>
          <span className="text-xs text-neutral-300">·</span>
          <NumInput
            className={SMALL_NUM}
            value={value.smooth}
            min={1}
            onChange={(smooth) => onChange({ ...value, smooth })}
          />
          <span className="text-xs text-neutral-500">평활</span>
        </>
      )}

      {(value.kind === "bb_upper" || value.kind === "bb_lower") && (
        <>
          <NumInput
            className={SMALL_NUM}
            value={value.period}
            min={5}
            onChange={(period) => onChange({ ...value, period })}
          />
          <span className="text-xs text-neutral-500">일</span>
          <span className="text-xs text-neutral-300">·</span>
          <NumInput
            className={SMALL_NUM}
            value={value.stddev}
            min={0.5}
            step={0.1}
            onChange={(stddev) => onChange({ ...value, stddev })}
          />
          <span className="text-xs text-neutral-500">σ배</span>
        </>
      )}

      {value.kind === "macd" && (
        <>
          <NumInput
            className={SMALL_NUM}
            value={value.fast}
            min={2}
            onChange={(fast) => onChange({ ...value, fast })}
          />
          <span className="text-xs text-neutral-500">빠름</span>
          <span className="text-xs text-neutral-300">·</span>
          <NumInput
            className={SMALL_NUM}
            value={value.slow}
            min={5}
            onChange={(slow) => onChange({ ...value, slow })}
          />
          <span className="text-xs text-neutral-500">느림</span>
        </>
      )}

      {value.kind === "macd_signal" && (
        <>
          <NumInput
            className={SMALL_NUM}
            value={value.fast}
            min={2}
            onChange={(fast) => onChange({ ...value, fast })}
          />
          <span className="text-xs text-neutral-500">빠름</span>
          <span className="text-xs text-neutral-300">·</span>
          <NumInput
            className={SMALL_NUM}
            value={value.slow}
            min={5}
            onChange={(slow) => onChange({ ...value, slow })}
          />
          <span className="text-xs text-neutral-500">느림</span>
          <span className="text-xs text-neutral-300">·</span>
          <NumInput
            className={SMALL_NUM}
            value={value.signal}
            min={2}
            onChange={(signal) => onChange({ ...value, signal })}
          />
          <span className="text-xs text-neutral-500">시그널</span>
        </>
      )}

      {value.kind === "sar" && (
        <>
          <NumInput
            className={SMALL_NUM}
            value={value.step}
            min={0.01}
            step={0.01}
            onChange={(step) => onChange({ ...value, step })}
          />
          <span className="text-xs text-neutral-500">가속</span>
          <span className="text-xs text-neutral-300">·</span>
          <NumInput
            className={SMALL_NUM}
            value={value.max}
            min={0.05}
            step={0.05}
            onChange={(max) => onChange({ ...value, max })}
          />
          <span className="text-xs text-neutral-500">최대</span>
        </>
      )}

      {value.kind === "const" && (
        <NumInput
          className={TINY_NUM}
          value={value.value}
          step={0.1}
          onChange={(v) => onChange({ ...value, value: v })}
        />
      )}
    </div>
  );
}

function indicatorUnit(ref: IndicatorRef): "price" | "oscillator" | "volume" | "other" {
  switch (ref.kind) {
    case "close":
    case "open":
    case "high":
    case "low":
    case "sma":
    case "ema":
    case "bb_upper":
    case "bb_middle":
    case "bb_lower":
    case "vwap":
    case "sar":
    case "ichimoku_conv":
    case "ichimoku_base":
      return "price";
    case "volume":
    case "obv":
      return "volume";
    case "rsi":
    case "stoch_k":
    case "stoch_d":
    case "williams_r":
    case "cci":
    case "adx":
    case "mfi":
    case "roc":
    case "macd":
    case "macd_signal":
    case "atr":
      return "oscillator";
    case "const":
      return "other";
  }
}

function indToNatural(ref: IndicatorRef): string {
  switch (ref.kind) {
    case "close":
      return "종가";
    case "open":
      return "시가";
    case "high":
      return "고가";
    case "low":
      return "저가";
    case "volume":
      return "거래량";
    case "obv":
      return "OBV(누적 거래량)";
    case "vwap":
      return "VWAP(거래량 평균가)";
    case "sma":
      return `${ref.period}일 단순이평`;
    case "ema":
      return `${ref.period}일 지수이평`;
    case "rsi":
      return `${ref.period}일 RSI`;
    case "atr":
      return `${ref.period}일 ATR`;
    case "williams_r":
      return `${ref.period}일 Williams%R`;
    case "cci":
      return `${ref.period}일 CCI`;
    case "adx":
      return `${ref.period}일 ADX`;
    case "roc":
      return `${ref.period}일 변화율`;
    case "mfi":
      return `${ref.period}일 MFI`;
    case "stoch_k":
      return `${ref.period}일 스토캐스틱 %K`;
    case "stoch_d":
      return `${ref.period}일 %D(${ref.smooth}평활)`;
    case "bb_middle":
      return `${ref.period}일 볼린저 중단`;
    case "bb_upper":
      return `${ref.period}일 볼린저 상단(${ref.stddev}σ)`;
    case "bb_lower":
      return `${ref.period}일 볼린저 하단(${ref.stddev}σ)`;
    case "macd":
      return `MACD(${ref.fast},${ref.slow})`;
    case "macd_signal":
      return `MACD 시그널선`;
    case "sar":
      return "Parabolic SAR";
    case "ichimoku_conv":
      return `${ref.period}일 일목 전환선`;
    case "ichimoku_base":
      return `${ref.period}일 일목 기준선`;
    case "const": {
      return String(ref.value);
    }
  }
}

function opToNatural(op: ConditionOp): string {
  switch (op) {
    case "gt":
      return "보다 크면";
    case "lt":
      return "보다 작으면";
    case "gte":
      return "이상이면";
    case "lte":
      return "이하이면";
    case "cross_up":
      return "을 위로 돌파하면";
    case "cross_down":
      return "을 아래로 돌파하면";
  }
}

function contextHint(cond: Condition): string | null {
  const left = cond.left.kind;
  if (cond.right.kind !== "const") return null;
  const v = cond.right.value;

  if (left === "rsi" || left === "mfi" || left === "stoch_k" || left === "stoch_d") {
    if (v <= 30) return "과매도 기준";
    if (v >= 70) return "과매수 기준";
    if (v === 50) return "중립선";
  }
  if (left === "williams_r") {
    if (v <= -80) return "과매도 기준";
    if (v >= -20) return "과매수 기준";
  }
  if (left === "cci") {
    if (v <= -100) return "과매도 기준";
    if (v >= 100) return "과매수 기준";
  }
  if (left === "adx") {
    if (v >= 25) return "강한 추세 기준";
  }
  return null;
}

function unitMismatchWarning(cond: Condition): string | null {
  const l = indicatorUnit(cond.left);
  const r = indicatorUnit(cond.right);

  if (cond.right.kind === "const") {
    if (l === "price" && Math.abs(cond.right.value) < 10_000) {
      return "⚠ 가격 지표인데 작은 숫자와 비교 중 — 의도한 게 맞나요?";
    }
    if (l === "volume" && Math.abs(cond.right.value) < 1) {
      return "⚠ 거래량과 비교하기엔 값이 너무 작습니다";
    }
    return null;
  }

  if (l !== "other" && r !== "other" && l !== r) {
    return "⚠ 서로 다른 스케일의 지표 비교 — 결과가 이상할 수 있습니다";
  }
  return null;
}

export function conditionNatural(cond: Condition): string {
  const leftText = indToNatural(cond.left);
  const rightText = indToNatural(cond.right);
  const hint = contextHint(cond);

  if (cond.op === "cross_up") {
    return `${leftText}이(가) ${rightText}${hint ? `(${hint})` : ""}을 위로 돌파`;
  }
  if (cond.op === "cross_down") {
    return `${leftText}이(가) ${rightText}${hint ? `(${hint})` : ""}을 아래로 돌파`;
  }
  return `${leftText}이(가) ${rightText}${hint ? `(${hint})` : ""}${opToNatural(cond.op)}`;
}

function sensibleConstFor(kind: IndicatorRef["kind"]): number | null {
  switch (kind) {
    case "rsi":
    case "mfi":
      return 30;
    case "stoch_k":
    case "stoch_d":
      return 20;
    case "williams_r":
      return -80;
    case "cci":
      return -100;
    case "adx":
      return 25;
    case "roc":
      return 0;
    case "macd":
    case "macd_signal":
    case "atr":
      return 0;
    default:
      return null;
  }
}

function smartRightForLeft(left: IndicatorRef, currentRight: IndicatorRef): IndicatorRef {
  const lUnit = indicatorUnit(left);
  const rUnit = indicatorUnit(currentRight);
  if (lUnit === "other" || rUnit === "other") {
    if (rUnit === "other" && lUnit === "price") {
      return { kind: "close" };
    }
    if (rUnit === "other" && lUnit === "oscillator") {
      const s = sensibleConstFor(left.kind);
      return s !== null ? { kind: "const", value: s } : currentRight;
    }
    if (rUnit === "other" && lUnit === "volume") {
      return { kind: "volume" };
    }
    return currentRight;
  }
  if (lUnit === rUnit) return currentRight;
  if (lUnit === "price") return { kind: "close" };
  if (lUnit === "oscillator") {
    const s = sensibleConstFor(left.kind);
    return s !== null ? { kind: "const", value: s } : { kind: "const", value: 0 };
  }
  if (lUnit === "volume") return { kind: "volume" };
  return currentRight;
}

export function ConditionRow({
  cond,
  index,
  onChange,
  onRemove,
}: {
  cond: Condition;
  index: number;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) {
  function handleLeftChange(newLeft: IndicatorRef) {
    if (newLeft.kind === cond.left.kind) {
      onChange({ ...cond, left: newLeft });
      return;
    }
    const newRight = smartRightForLeft(newLeft, cond.right);
    onChange({ ...cond, left: newLeft, right: newRight });
  }

  const natural = conditionNatural(cond);
  const warning = unitMismatchWarning(cond);

  return (
    <div className="py-2 px-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-start gap-2">
        <span className="shrink-0 w-5 mt-1.5 text-xs font-bold text-neutral-400">
          {index + 1}
        </span>
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          <IndicatorInline value={cond.left} onChange={handleLeftChange} />
          <select
            value={cond.op}
            onChange={(e) => onChange({ ...cond, op: e.target.value as ConditionOp })}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-sm font-semibold text-brand"
          >
            {OP_ORDER.map((op) => (
              <option key={op} value={op}>
                {OP_LABELS[op]}
              </option>
            ))}
          </select>
          <IndicatorInline
            value={cond.right}
            onChange={(right) => onChange({ ...cond, right })}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="조건 제거"
          className="shrink-0 text-neutral-400 hover:text-red-500 text-lg leading-none px-1"
        >
          ×
        </button>
      </div>

      <div className="mt-2 pl-7 text-xs text-neutral-600 dark:text-neutral-400">
        → {natural}
      </div>
      {warning && (
        <div className="mt-1 pl-7 text-xs text-amber-600 dark:text-amber-400">
          {warning}
        </div>
      )}
    </div>
  );
}

export function conditionToText(cond: Condition): string {
  return conditionNatural(cond);
}
