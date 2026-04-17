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
  "w-20 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-1.5 py-1 text-xs";

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

type UnitKind = "price" | "oscillator" | "volume" | "macd" | "other";

function indicatorUnit(ref: IndicatorRef): UnitKind {
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
    case "atr":
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
      return "oscillator";
    case "macd":
    case "macd_signal":
      return "macd";
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
      return `${ref.period}일 ATR(변동폭)`;
    case "williams_r":
      return `${ref.period}일 Williams %R`;
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
      return `${ref.period}일 스토캐스틱 %D(${ref.smooth}일 평활)`;
    case "bb_middle":
      return `${ref.period}일 볼린저 중단선`;
    case "bb_upper":
      return `${ref.period}일 볼린저 상단(${ref.stddev}σ)`;
    case "bb_lower":
      return `${ref.period}일 볼린저 하단(${ref.stddev}σ)`;
    case "macd":
      return `MACD 라인(${ref.fast},${ref.slow})`;
    case "macd_signal":
      return `MACD 시그널선(${ref.signal})`;
    case "sar":
      return "Parabolic SAR";
    case "ichimoku_conv":
      return `일목 전환선(${ref.period}일)`;
    case "ichimoku_base":
      return `일목 기준선(${ref.period}일)`;
    case "const":
      return String(ref.value);
  }
}

// 한글 받침 판정 (영어/숫자/특수문자로 끝나면 받침 없는 것으로 간주하고 '가/를' 사용)
function hasJongseong(word: string): boolean {
  if (!word) return false;
  const last = word[word.length - 1];
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 !== 0;
  }
  const digit = /[0-9]/.test(last);
  if (digit) {
    const digitJong: Record<string, boolean> = {
      "0": false,
      "1": true,
      "2": false,
      "3": true,
      "4": false,
      "5": false,
      "6": true,
      "7": true,
      "8": true,
      "9": false,
    };
    return digitJong[last] ?? false;
  }
  const englishJong: Record<string, boolean> = {
    L: true, M: true, N: true, R: true,
    l: true, m: true, n: true, r: true,
  };
  return englishJong[last] ?? false;
}

function josaGa(word: string): string {
  return word + (hasJongseong(word) ? "이" : "가");
}
function josaReul(word: string): string {
  return word + (hasJongseong(word) ? "을" : "를");
}
function josaBoda(word: string): string {
  return word + "보다";
}

function opToNaturalPost(op: ConditionOp): string {
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
    if (v <= 30) return "과매도 구간";
    if (v >= 70) return "과매수 구간";
    if (v === 50) return "중립";
  }
  if (left === "williams_r") {
    if (v <= -80) return "과매도 구간";
    if (v >= -20) return "과매수 구간";
  }
  if (left === "cci") {
    if (v <= -100) return "과매도 구간";
    if (v >= 100) return "과매수 구간";
  }
  if (left === "adx") {
    if (v >= 25) return "강한 추세";
  }
  return null;
}

function unitMismatchWarning(cond: Condition): string | null {
  const l = indicatorUnit(cond.left);

  if (cond.right.kind === "const") {
    const v = cond.right.value;
    if (l === "price" && Math.abs(v) > 0 && Math.abs(v) < 10_000 && cond.left.kind !== "atr") {
      return "⚠ 가격 지표인데 작은 숫자와 비교 중 — 의도한 게 맞나요?";
    }
    if (l === "volume" && Math.abs(v) > 0 && Math.abs(v) < 100_000) {
      return "⚠ 거래량은 보통 수십억~수천억 단위입니다. 기준값 확인하세요.";
    }
    if (l === "macd" && Math.abs(v) > 0 && v !== 0) {
      return "⚠ MACD는 보통 0 또는 시그널선과 비교합니다. 작은 숫자와 비교는 의미 없을 수 있어요.";
    }
    return null;
  }

  const r = indicatorUnit(cond.right);
  if (l !== "other" && r !== "other" && l !== r) {
    return "⚠ 서로 다른 스케일의 지표 비교 — 결과가 이상할 수 있습니다.";
  }
  return null;
}

export function conditionNatural(cond: Condition): string {
  const leftText = indToNatural(cond.left);
  const rightText = indToNatural(cond.right);
  const hint = contextHint(cond);
  const rightWithHint = hint ? `${rightText}(${hint})` : rightText;

  if (cond.op === "cross_up") {
    return `${josaGa(leftText)} ${josaReul(rightWithHint)} 위로 돌파하면`;
  }
  if (cond.op === "cross_down") {
    return `${josaGa(leftText)} ${josaReul(rightWithHint)} 아래로 돌파하면`;
  }
  if (cond.op === "gt") {
    return `${josaGa(leftText)} ${josaBoda(rightWithHint)} 크면`;
  }
  if (cond.op === "lt") {
    return `${josaGa(leftText)} ${josaBoda(rightWithHint)} 작으면`;
  }
  if (cond.op === "gte") {
    return `${josaGa(leftText)} ${rightWithHint} 이상이면`;
  }
  return `${josaGa(leftText)} ${rightWithHint} 이하이면`;
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
    default:
      return null;
  }
}

function smartRightForLeft(left: IndicatorRef, currentRight: IndicatorRef): IndicatorRef {
  if (left.kind === "macd") {
    return { kind: "macd_signal", fast: left.fast, slow: left.slow, signal: 9 };
  }
  if (left.kind === "macd_signal") {
    return { kind: "macd", fast: left.fast, slow: left.slow };
  }
  if (left.kind === "atr") {
    return currentRight.kind === "const"
      ? currentRight
      : { kind: "const", value: 0 };
  }
  if (left.kind === "volume" || left.kind === "obv") {
    return currentRight.kind === "const"
      ? currentRight
      : { kind: "const", value: 0 };
  }

  const lUnit = indicatorUnit(left);
  const rUnit = indicatorUnit(currentRight);

  if (lUnit === rUnit) return currentRight;

  if (lUnit === "price") {
    return { kind: "close" };
  }
  if (lUnit === "oscillator") {
    const s = sensibleConstFor(left.kind);
    return s !== null ? { kind: "const", value: s } : currentRight;
  }
  return currentRight;
}

const REFERENCE_LEVEL_KINDS: IndicatorRef["kind"][] = [
  "bb_upper",
  "bb_middle",
  "bb_lower",
  "vwap",
  "sar",
  "ichimoku_conv",
  "ichimoku_base",
];

function isReferenceLevel(kind: IndicatorRef["kind"]): boolean {
  return REFERENCE_LEVEL_KINDS.includes(kind);
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

    if (isReferenceLevel(newLeft.kind)) {
      onChange({
        ...cond,
        left: { kind: "close" },
        right: newLeft,
        op: cond.op === "gt" || cond.op === "lt" || cond.op === "gte" || cond.op === "lte"
          ? cond.op
          : "lte",
      });
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

// opToNaturalPost exported in case we need it elsewhere
export { opToNaturalPost };
