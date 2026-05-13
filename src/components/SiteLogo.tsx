"use client";

import { useState } from "react";

type Props = {
  host: string;
  alt: string;
  size: number; // 픽셀 (32, 48, 96 등)
  className?: string;
};

// 사이트 공식 로고를 단계적으로 시도하는 컴포넌트.
//   1. Iconhorse  — favicon, apple-touch-icon, manifest 아이콘 중 가장 큰 것
//   2. Google s2  — 작은 favicon (fallback)
//   3. 이모지     — 둘 다 실패하면 🔗
export function SiteLogo({ host, alt, size, className }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  if (!host) {
    return (
      <div
        className={
          (className ?? "") +
          " flex items-center justify-center bg-neutral-100 dark:bg-neutral-900"
        }
        style={{ width: size, height: size }}
        aria-hidden
      >
        <span style={{ fontSize: size * 0.5 }}>🔗</span>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div
        className={
          (className ?? "") +
          " flex items-center justify-center bg-neutral-100 dark:bg-neutral-900"
        }
        style={{ width: size, height: size }}
        aria-hidden
      >
        <span style={{ fontSize: size * 0.5 }}>🔗</span>
      </div>
    );
  }
  const src =
    step === 0
      ? `https://icon.horse/icon/${host}`
      : `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setStep((step + 1) as 0 | 1 | 2)}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
