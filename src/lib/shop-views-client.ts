// 쇼핑 글 조회수 — 브라우저 쪽 (기록 호출·관리자 집계 읽기·"이 기기 제외" 표시).
// 규칙은 ./shop-views.ts (순수 함수, 테스트 있음). SQL 실행 전(supabase/shop-views.sql)에도 사이트가 깨지지 않게
// 모든 호출 실패는 조용히 무시하고, 관리자 목록은 null 을 받아 "조회수 준비 중"을 보여 준다.

import { supabase } from "./supabase";
import {
  EXCLUDE_KEY,
  SEEN_KEY,
  autoExcludeForAdmin,
  decideView,
  excludeRaw,
  kstDay,
  markSeen,
  parseExclude,
  parseSeen,
  type CountDecision,
  type ExcludeSetting,
  type PostViewStats,
} from "./shop-views";

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // 시크릿 창 등 저장소를 못 쓰는 경우
  }
}

function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 저장 못 해도 넘어간다
  }
}

export function getExcludeSetting(): ExcludeSetting {
  if (typeof window === "undefined") return "unset";
  return parseExclude(storageGet(EXCLUDE_KEY));
}

export function setExcludeThisDevice(on: boolean): void {
  storageSet(EXCLUDE_KEY, excludeRaw(on));
}

/** 관리자 로그인이 확인됐을 때: 정한 적 없으면 이 기기 제외를 자동으로 켠다 */
export function autoExcludeIfAdmin(): void {
  const next = autoExcludeForAdmin(getExcludeSetting());
  if (next !== null) storageSet(EXCLUDE_KEY, next);
}

/**
 * 공개 글 화면이 열린 뒤 1번 부른다. 세지 않을 이유가 있으면 서버를 부르지 않는다.
 * 서버(shop_post_view)도 관리자·로봇·비공개 글을 한 번 더 거른다.
 */
export async function recordShopView(slug: string, isAdmin: boolean): Promise<CountDecision> {
  const today = kstDay();
  const seen = parseSeen(storageGet(SEEN_KEY), today);
  const decision = decideView({
    slug,
    today,
    userAgent: navigator.userAgent,
    seen,
    exclude: getExcludeSetting(),
    isAdmin,
  });
  if (decision !== "count") return decision;
  // 실패해도(SQL 실행 전·네트워크) 오늘은 다시 부르지 않게 먼저 표시
  storageSet(SEEN_KEY, JSON.stringify(markSeen(seen, slug, today)));
  try {
    await supabase.rpc("shop_post_view", { p_slug: slug });
  } catch {
    // 조회수는 부차적 기능 — 조용히 무시
  }
  return decision;
}

/** 관리자 목록용: 글 id → 조회수. 함수가 아직 없거나(SQL 실행 전) 실패하면 null */
export async function getShopViewStats(): Promise<Map<string, PostViewStats> | null> {
  try {
    const { data, error } = await supabase.rpc("admin_shop_post_view_stats");
    if (error || !Array.isArray(data)) return null;
    const map = new Map<string, PostViewStats>();
    for (const r of data as { post_id: string; today: number | string; week: number | string; total: number | string }[]) {
      map.set(r.post_id, { today: Number(r.today) || 0, week: Number(r.week) || 0, total: Number(r.total) || 0 });
    }
    return map;
  } catch {
    return null;
  }
}
