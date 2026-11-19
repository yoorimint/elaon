"use client";

// 화면 하단 고정 쿠팡 배너 + 공정위 고지 문구.
// - 쇼핑 글 화면은 공용 배너 대신 그 글의 상품 바(ShopProductBottomBar — 같은 BottomBarShell 사용)를 띄운다.
// - 생활정보 글 화면은 공용 배너 대신 사주데이 이미지 바(SajudayBar — 글 화면이 직접), 주소모음은 이 컴포넌트가 사주데이 바를 띄운다.
//   어느 화면에서 공용 배너를 숨기는지는 src/lib/ads-config.ts hidesSiteBottomBar.
// - 쿠팡 다이나믹 배너(g.js)를 먼저 시도하고, 광고 차단·로드 실패·광고 없음·시간 초과면
//   자체 대체 배너(파트너스 링크)로 바꾼다.
// - 바의 실제 높이를 --bottom-ad-h 로 내보내고 body 가 그만큼 아래 여백을 가져서
//   끝까지 스크롤하면 본문이 배너 위로 올라온다(본문을 가리지 않음).
// - 요소 숨김 필터에 걸리지 않도록 클래스/ID 에 ad·banner 같은 단어를 쓰지 않는다.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomBarFrame } from "@/components/BottomBarFrame";
import { SajudayBar } from "@/components/SajudayBar";
import {
  COUPANG_BOTTOM_BANNER,
  COUPANG_DISCLOSURE,
  COUPANG_FALLBACK,
  COUPANG_LOAD_TIMEOUT_MS,
  COUPANG_SCRIPT_SRC,
  hidesSiteBottomBar,
  showsSajudayBar,
} from "@/lib/ads-config";

// 예전 import 경로 호환 (InfoShopGuideBar 등)
export { BottomBarFrame };

const { width: SLOT_W, height: SLOT_H } = COUPANG_BOTTOM_BANNER;

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
        reject(new Error("coupang script blocked or failed"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

// 사이트 공용 (layout.tsx). 관리자 화면·쇼핑 글·생활정보 글 화면에서는 안 띄운다.
// 주소모음(/picks…)은 쿠팡 대신 사주데이 이미지 바 (2026-11-19 사장님 결정 — showsSajudayBar)
export function CoupangBottomBanner() {
  const pathname = usePathname() ?? "";
  if (hidesSiteBottomBar(pathname)) return null;
  if (showsSajudayBar(pathname)) return <SajudayBar medium="picks_bottom" />;
  return <GenericBottomBar />;
}

type Mode = "coupang" | "fallback";

// 쿠팡 다이나믹 배너 → 실패하면 대체 배너 (쿠팡 링크가 없는 쇼핑 글도 이것을 쓴다)
export function GenericBottomBar() {
  const [mode, setMode] = useState<Mode>("coupang");
  return (
    <BottomBarShell>
      {mode === "coupang" ? <CoupangSlot onFail={() => setMode("fallback")} /> : <FallbackCard />}
    </BottomBarShell>
  );
}

// 쿠팡 바 틀: BottomBarFrame + 내용 아래에 공정위 고지 문구
export function BottomBarShell({ children }: { children: ReactNode }) {
  return (
    <BottomBarFrame>
      <div className="flex flex-col items-center px-1 pt-1 pb-1">
        {children}
        <p className="mt-0.5 px-2 text-center text-[11px] leading-tight text-neutral-500">
          {COUPANG_DISCLOSURE}
        </p>
      </div>
    </BottomBarFrame>
  );
}

// 쿠팡 다이나믹 배너. container 옵션으로 이 슬롯 안에만 iframe 을 넣게 한다.
function CoupangSlot({ onFail }: { onFail: () => void }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    let done = false; // 성공/실패 중 먼저 온 것만 처리
    const fail = () => {
      if (done) return;
      done = true;
      onFailRef.current();
    };
    const timer = window.setTimeout(fail, COUPANG_LOAD_TIMEOUT_MS);

    loadCoupangScript()
      .then((pc) => {
        if (done) return;
        new pc.G({
          ...COUPANG_BOTTOM_BANNER,
          container: slot,
          onLoaded: (hasAd?: boolean) => {
            if (hasAd === false) return fail(); // 명시적으로 광고 없음일 때만
            done = true;
            window.clearTimeout(timer);
          },
        });
      })
      .catch(fail);

    return () => {
      done = true;
      window.clearTimeout(timer);
      slot.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={slotRef}
      className="max-w-full overflow-hidden"
      style={{ width: SLOT_W, height: SLOT_H }}
    />
  );
}

// 대체 배너: 외부 이미지 없이 직접 그려서 차단 목록의 광고 도메인을 거치지 않는다.
function FallbackCard() {
  const f = COUPANG_FALLBACK;
  return (
    <a
      href={f.href}
      target="_blank"
      rel="sponsored nofollow noopener"
      className="flex max-w-full items-center gap-3 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-sky-50 to-white dark:from-sky-950/40 dark:to-neutral-900 px-3"
      style={{ width: SLOT_W, height: SLOT_H }}
    >
      <span className="text-3xl" aria-hidden="true">
        {f.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold text-neutral-900 dark:text-white">
          {f.title}
        </span>
        <span className="block truncate text-xs text-neutral-600 dark:text-neutral-300">
          {f.subtitle}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
        {f.cta} ›
      </span>
    </a>
  );
}
