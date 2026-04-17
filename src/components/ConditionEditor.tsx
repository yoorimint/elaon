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
        <NumInput
          className={SMALL_NUM}
          value={value.period}
          min={2}
          onChange={(period) => onChange({ ...value, period })}
        />
      )}

      {value.kind === "stoch_d" && (
        <>
          <NumInput
            className={SMALL_NUM}
            value={value.period}
            min={3}
            onChange={(period) => onChange({ ...value, period })}
          />
          <span className="text-xs text-neutral-400">/</span>
          <NumInput
            className={SMALL_NUM}
            value={value.smooth}
            min={1}
            onChange={(smooth) => onChange({ ...value, smooth })}
          />
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
          <span className="text-xs text-neutral-400">/</span>
          <NumInput
            className={SMALL_NUM}
            value={value.stddev}
            min={0.5}
            step={0.1}
            onChange={(stddev) => onChange({ ...value, stddev })}
          />
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
          <span className="text-xs text-neutral-400">/</span>
          <NumInput
            className={SMALL_NUM}
            value={value.slow}
            min={5}
            onChange={(slow) => onChange({ ...value, slow })}
          />
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
          <span className="text-xs text-neutral-400">/</span>
          <NumInput
            className={SMALL_NUM}
            value={value.slow}
            min={5}
            onChange={(slow) => onChange({ ...value, slow })}
          />
          <span className="text-xs text-neutral-400">/</span>
          <NumInput
            className={SMALL_NUM}
            value={value.signal}
            min={2}
            onChange={(signal) => onChange({ ...value, signal })}
          />
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
          <span className="text-xs text-neutral-400">/</span>
          <NumInput
            className={SMALL_NUM}
            value={value.max}
            min={0.05}
            step={0.05}
            onChange={(max) => onChange({ ...value, max })}
          />
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
  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
      <span className="shrink-0 w-5 text-xs font-bold text-neutral-400">
        {index + 1}
      </span>
      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        <IndicatorInline
          value={cond.left}
          onChange={(left) => onChange({ ...cond, left })}
        />
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
  );
}

export function conditionToText(cond: Condition): string {
  function indToStr(ref: IndicatorRef): string {
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
        return "OBV";
      case "vwap":
        return "VWAP";
      case "sma":
        return `SMA(${ref.period})`;
      case "ema":
        return `EMA(${ref.period})`;
      case "rsi":
        return `RSI(${ref.period})`;
      case "atr":
        return `ATR(${ref.period})`;
      case "williams_r":
        return `Williams%R(${ref.period})`;
      case "cci":
        return `CCI(${ref.period})`;
      case "adx":
        return `ADX(${ref.period})`;
      case "roc":
        return `ROC(${ref.period})`;
      case "mfi":
        return `MFI(${ref.period})`;
      case "stoch_k":
        return `%K(${ref.period})`;
      case "stoch_d":
        return `%D(${ref.period},${ref.smooth})`;
      case "bb_middle":
        return `BB중단(${ref.period})`;
      case "bb_upper":
        return `BB상단(${ref.period},${ref.stddev}σ)`;
      case "bb_lower":
        return `BB하단(${ref.period},${ref.stddev}σ)`;
      case "macd":
        return `MACD(${ref.fast},${ref.slow})`;
      case "macd_signal":
        return `MACD시그널(${ref.fast},${ref.slow},${ref.signal})`;
      case "sar":
        return `SAR(${ref.step},${ref.max})`;
      case "ichimoku_conv":
        return `일목전환선(${ref.period})`;
      case "ichimoku_base":
        return `일목기준선(${ref.period})`;
      case "const":
        return String(ref.value);
    }
  }
  return `${indToStr(cond.left)} ${OP_LABELS[cond.op]} ${indToStr(cond.right)}`;
}
