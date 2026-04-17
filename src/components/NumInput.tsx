"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (v: number) => void;
};

export function NumInput({ value, onChange, ...rest }: Props) {
  const [str, setStr] = useState(() => String(value));
  const lastParsedRef = useRef(value);

  useEffect(() => {
    if (value !== lastParsedRef.current) {
      setStr(String(value));
      lastParsedRef.current = value;
    }
  }, [value]);

  return (
    <input
      {...rest}
      type="number"
      inputMode="numeric"
      value={str}
      onChange={(e) => {
        const v = e.target.value;
        setStr(v);
        if (v === "" || v === "-") return;
        const n = Number(v);
        if (!Number.isNaN(n)) {
          lastParsedRef.current = n;
          onChange(n);
        }
      }}
      onBlur={(e) => {
        if (str === "" || str === "-" || Number.isNaN(Number(str))) {
          setStr(String(value));
        }
        rest.onBlur?.(e);
      }}
    />
  );
}
