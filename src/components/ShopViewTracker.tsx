"use client";

// 공개 글 화면(/shop/[slug])에 넣는 조회수 기록기. 화면에는 아무것도 그리지 않는다.
// 화면이 실제로 보일 때(백그라운드 미리 불러오기 제외) 1번만 기록. 초안 미리보기에는 넣지 않는다.
// 관리자로 로그인돼 있으면 세지 않고, 이 기기 "조회수 제외" 표시도 자동으로 켠다(정한 적 없을 때만).

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { isAdmin } from "@/lib/community";
import { autoExcludeIfAdmin, recordShopView } from "@/lib/shop-views-client";

export function ShopViewTracker({ slug }: { slug: string }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (loading || done.current === slug) return;

    // 한 번 시작하면 끝까지 (중간에 로그인 정보가 다시 들어와도 기록이 빠지지 않게)
    async function run() {
      if (done.current === slug) return;
      done.current = slug;
      let admin = false;
      if (userId) {
        admin = await isAdmin().catch(() => false);
        if (admin) autoExcludeIfAdmin();
      }
      await recordShopView(slug, admin);
    }

    if (document.visibilityState === "visible") {
      void run();
      return;
    }
    // 백그라운드 탭·미리 불러오기: 실제로 화면에 보일 때까지 기다린다
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        document.removeEventListener("visibilitychange", onVisible);
        void run();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [slug, userId, loading]);

  return null;
}
