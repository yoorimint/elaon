"use client";

// 화면 하단 고정 쿠팡 배너 + 공정위 고지 문구.
// 바의 실제 높이를 --bottom-ad-h 로 내보내고, body 가 그만큼 아래 여백을 가져서
// 끝까지 스크롤하면 본문이 배너 위로 올라온다(본문을 가리지 않음).

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BOTTOM_BANNER_HIDDEN_PATHS,
  COUPANG_BOTTOM_BANNER,
  COUPANG_DISCLOSURE,
  COUPANG_SCRIPT_SRC,
} from "@/lib/ads-config";

const HEIGHT_VAR = "--bottom-ad-h";

type PartnersCoupangGlobal = {
  G: new (options: Record<string, unknown>) => unknown;
};

declare global {
  interface Window {
    PartnersCoupang?: PartnersCoupangGlobal;
  }
}

// g.js 는 페이지당 한 번만 로드
let scriptPromise: Promise<PartnersCoupangGlobal> | null = null;

function loadCoupangScript(): Promise<PartnersCoupangGlobal> {
  if (window.PartnersCoupang) return Promise.resolve(window.PartnersCoupang);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = COUPANG_SCRIPT_SRC;
      s.async = true;
      s.onload = () =>
        window.PartnersCoupang
          ? resolve(window.PartnersCoupang)
          : reject(new Error("PartnersCoupang not found"));
      s.onerror = () => {
        scriptPromise = null; // 다음 마운트 때 재시도
        reject(new Error("coupang script load failed"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export function CoupangBottomBanner() {
  const pathname = usePathname() ?? "";
  const hidden = BOTTOM_BANNER_HIDDEN_PATHS.some((p) => pathname.startsWith(p));
  if (hidden) return null;
  return <BannerBar />;
}

function BannerBar() {
  const barRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // 배너 생성. container 옵션으로 이 슬롯 안에만 iframe 을 넣게 한다.
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    let cancelled = false;
    loadCoupangScript()
      .then((pc) => {
        if (cancelled) return;
        new pc.G({ ...COUPANG_BOTTOM_BANNER, container: slot });
      })
      .catch(() => {
        if (!cancelled) setFailed(true); // 광고 차단 등 → 바 자체를 숨김
      });
    return () => {
      cancelled = true;
      slot.innerHTML = "";
    };
  }, []);

  // 바 높이를 CSS 변수로 공유 (body 하단 여백, 다른 플로팅 버튼 위치에 사용)
  useEffect(() => {
    const bar = barRef.current;
    const root = document.documentElement;
    if (!bar || failed) {
      root.style.removeProperty(HEIGHT_VAR);
      return;
    }
    const update = () => root.style.setProperty(HEIGHT_VAR, `${bar.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(bar);
    return () => {
      ro.disconnect();
      root.style.removeProperty(HEIGHT_VAR);
    };
  }, [failed]);

  if (failed) return null;

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex flex-col items-center px-1 pt-1 pb-1">
        <div
          ref={slotRef}
          className="max-w-full overflow-hidden"
          style={{ width: COUPANG_BOTTOM_BANNER.width, height: COUPANG_BOTTOM_BANNER.height }}
        />
        <p className="mt-0.5 px-2 text-center text-[11px] leading-tight text-neutral-500">
          {COUPANG_DISCLOSURE}
        </p>
      </div>
    </div>
  );
}
