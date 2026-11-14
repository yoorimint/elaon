"use client";

// "이 기기 조회수 제외" 켜기/끄기 — 사장님이 로그인 안 한 휴대폰 등으로 글을 봐도 조회수에 안 들어가게.
// 이 브라우저(localStorage)에만 저장된다. 다른 브라우저·시크릿 창은 따로 켜야 한다.
// 관리자 화면을 열면 정한 적 없을 때 자동으로 켠다(관리자 로그인 = 사장님 기기로 보고). 일부러 끄면 다시 켜지 않는다.

import { useEffect, useState } from "react";
import { autoExcludeIfAdmin, getExcludeSetting, setExcludeThisDevice } from "@/lib/shop-views-client";
import type { ExcludeSetting } from "@/lib/shop-views";

export function ShopViewExcludeToggle() {
  const [setting, setSetting] = useState<ExcludeSetting | null>(null);

  useEffect(() => {
    autoExcludeIfAdmin(); // 이 화면은 관리자만 열 수 있다
    setSetting(getExcludeSetting());
  }, []);

  if (setting === null) return null;
  const on = setting === "on";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-900">
      <span className={`font-semibold ${on ? "text-green-700 dark:text-green-400" : "text-neutral-600 dark:text-neutral-300"}`}>
        {on ? "✓ 이 기기는 조회수에서 빠져요" : "이 기기도 조회수에 들어가요"}
      </span>
      <button
        onClick={() => {
          setExcludeThisDevice(!on);
          setSetting(getExcludeSetting());
        }}
        className="rounded-full border border-neutral-300 px-3 py-1 font-semibold dark:border-neutral-700"
      >
        {on ? "제외 끄기" : "이 기기 조회수 제외"}
      </button>
      <span className="w-full text-[11px] leading-relaxed text-neutral-500">
        관리자로 로그인된 동안은 언제나 안 세요. 평소 로그인 안 하는 휴대폰은 그 휴대폰으로 한 번 로그인해 이 화면을 열면 켜지고, 로그아웃해도 유지돼요. 브라우저마다 따로라 다른 브라우저·시크릿 창은 각각 켜야 해요.
      </span>
    </div>
  );
}
