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
  "sma",
  "ema",
  "rsi",
  "bb_upper",
  "bb_lower",
  "macd",
  "macd_signal",
  "const",
];

const OP_ORDER: ConditionOp[] = ["gt", "lt", "gte", "lte", "cross_up", "cross_down"];

function defaultIndicator(kind: IndicatorRef["kind"]): IndicatorRef {
  switch (kind) {
    case "close":
    case "open":
    case "high":
    case "low":
      return { kind };
    case "sma":
    case "ema":
      return { kind, period: 20 };
    case "rsi":
      return { kind, period: 14 };
    case "bb_upper":
    case "bb_lower":
      return { kind, period: 20, stddev: 2 };
    case "macd":
      return { kind, fast: 12, slow: 26 };
    case "macd_signal":
      return { kind, fast: 12, slow: 26, signal: 9 };
    case "const":
      return { kind, value: 0 };
  }
}

function IndicatorPicker({
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
    <div className="grid gap-2">
      <select
        value={value.kind}
        onChange={(e) => setKind(e.target.value as IndicatorRef["kind"])}
        className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
      >
        {INDICATOR_KINDS.map((k) => (
          <option key={k} value={k}>
            {INDICATOR_LABELS[k]}
          </option>
        ))}
      </select>

      {(value.kind === "sma" ||
        value.kind === "ema" ||
        value.kind === "rsi") && (
        <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
          기간
          <NumInput
            className="w-20 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
            value={value.period}
            min={2}
            onChange={(period) => onChange({ ...value, period })}
          />
        </label>
      )}

      {(value.kind === "bb_upper" || value.kind === "bb_lower") && (
        <div className="flex gap-2 text-xs text-neutral-600 dark:text-neutral-400 items-center">
          <label className="flex items-center gap-1">
            기간
            <NumInput
              className="w-16 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
              value={value.period}
              min={5}
              onChange={(period) => onChange({ ...value, period })}
            />
          </label>
          <label className="flex items-center gap-1">
            σ
            <NumInput
              className="w-16 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
              value={value.stddev}
              min={0.5}
              step={0.1}
              onChange={(stddev) => onChange({ ...value, stddev })}
            />
          </label>
        </div>
      )}

      {value.kind === "macd" && (
        <div className="flex gap-2 text-xs text-neutral-600 dark:text-neutral-400 items-center">
          <label className="flex items-center gap-1">
            빠름
            <NumInput
              className="w-14 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
              value={value.fast}
              min={2}
              onChange={(fast) => onChange({ ...value, fast })}
            />
          </label>
          <label className="flex items-center gap-1">
            느림
            <NumInput
              className="w-14 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
              value={value.slow}
              min={5}
              onChange={(slow) => onChange({ ...value, slow })}
            />
          </label>
        </div>
      )}

      {value.kind === "macd_signal" && (
        <div className="flex gap-2 text-xs text-neutral-600 dark:text-neutral-400 items-center flex-wrap">
          <label className="flex items-center gap-1">
            빠름
            <NumInput
              className="w-14 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
              value={value.fast}
              min={2}
              onChange={(fast) => onChange({ ...value, fast })}
            />
          </label>
          <label className="flex items-center gap-1">
            느림
            <NumInput
              className="w-14 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
              value={value.slow}
              min={5}
              onChange={(slow) => onChange({ ...value, slow })}
            />
          </label>
          <label className="flex items-center gap-1">
            시그널
            <NumInput
              className="w-14 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
              value={value.signal}
              min={2}
              onChange={(signal) => onChange({ ...value, signal })}
            />
          </label>
        </div>
      )}

      {value.kind === "const" && (
        <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
          값
          <NumInput
            className="w-28 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
            value={value.value}
            step={0.1}
            onChange={(v) => onChange({ ...value, value: v })}
          />
        </label>
      )}
    </div>
  );
}

export function ConditionRow({
  cond,
  onChange,
  onRemove,
}: {
  cond: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-start">
      <IndicatorPicker
        value={cond.left}
        onChange={(left) => onChange({ ...cond, left })}
      />
      <select
        value={cond.op}
        onChange={(e) => onChange({ ...cond, op: e.target.value as ConditionOp })}
        className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm self-start"
      >
        {OP_ORDER.map((op) => (
          <option key={op} value={op}>
            {OP_LABELS[op]}
          </option>
        ))}
      </select>
      <IndicatorPicker
        value={cond.right}
        onChange={(right) => onChange({ ...cond, right })}
      />
      <button
        type="button"
        onClick={onRemove}
        className="self-start text-xs text-red-500 hover:underline"
      >
        제거
      </button>
    </div>
  );
}
