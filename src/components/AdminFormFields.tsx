"use client";

// 관리자 설정 화면용 입력 컴포넌트 모음. 스타일을 한 곳에서 관리한다.

import { useState, type ReactNode } from "react";

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm";

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
      <h2 className="font-bold">{title}</h2>
      {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <>
      <span className="font-medium">{label}</span>
      {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
    </>
  );
}

export function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0"
      />
      <span>
        <FieldLabel label={label} hint={hint} />
      </span>
    </label>
  );
}

export function NumberField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <FieldLabel label={label} hint={hint} />
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={INPUT_CLASS}
      />
    </label>
  );
}

export function TextField({
  label,
  hint,
  value,
  placeholder,
  rows,
  wide,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  rows?: number; // 지정하면 textarea
  wide?: boolean; // 2칸 전체 사용
  onChange: (v: string) => void;
}) {
  return (
    <label className={`block text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <FieldLabel label={label} hint={hint} />
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
        />
      )}
    </label>
  );
}

// 문자열 배열 입력. 줄바꿈/쉼표로 구분. 입력 중 텍스트는 그대로 두고
// 파싱 결과만 부모에 넘겨서, 엔터·쉼표 입력이 지워지지 않게 한다.
export function ListField({
  label,
  hint,
  value,
  placeholder,
  rows = 5,
  parse,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string[];
  placeholder?: string;
  rows?: number;
  parse: (text: string) => string[];
  onChange: (v: string[]) => void;
}) {
  const [text, setText] = useState(() => value.join("\n"));
  return (
    <label className="block text-sm sm:col-span-2">
      <FieldLabel label={label} hint={hint} />
      <textarea
        rows={rows}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parse(e.target.value));
        }}
        className={INPUT_CLASS}
      />
      <span className="mt-1 block text-xs text-neutral-500">{value.length}개</span>
    </label>
  );
}

export function RadioField<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string; description?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="text-sm sm:col-span-2">
      <legend>
        <FieldLabel label={label} hint={hint} />
      </legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
              value === o.value
                ? "border-brand bg-brand/5"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            <input
              type="radio"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">{o.label}</span>
              {o.description && (
                <span className="block text-xs text-neutral-500">{o.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
