// 관리자 대시보드(/admin) "글별 조회수" — 쇼핑·생활정보 글의 오늘·7일·30일 조회수 (조회된 글만).
// 2026-11-18 사장님 결정: "외부 유입 랜딩 페이지" 표를 빼고 이것으로. SQL 없이 기존 조회수 표(shop_post_views — supabase/shop-views.sql)를
// 관리자 권한으로 직접 읽어(관리자 읽기 정책 있음) 브라우저에서 합친다. 주소모음 등 다른 페이지는 조회수를 저장하지 않아서 없다.

import { supabase } from "./supabase";
import { kstDay } from "./shop-views";
import { aggregatePostViews, daysBefore, type PostViewRow } from "./post-view-calc";

export { sectionLabel, todayRows, type PostViewRow } from "./post-view-calc";

// 관리자 로그인 상태에서만 동작 (조회수 표는 관리자만 읽기). 표가 아직 없으면 오류를 던진다 — 화면이 안내
export async function getPostViewStats(now: Date = new Date()): Promise<PostViewRow[]> {
  const today = kstDay(now);
  const { data: views, error } = await supabase
    .from("shop_post_views")
    .select("post_id, view_day, view_count")
    .gte("view_day", daysBefore(today, 29))
    .limit(10000);
  if (error) throw new Error(`조회수를 못 읽었어요: ${error.message}`);
  const ids = Array.from(new Set((views ?? []).map((v) => (v as { post_id: string }).post_id)));
  if (!ids.length) return [];
  const { data: posts, error: e2 } = await supabase.from("shop_posts").select("id, slug, title, section:content->>section").in("id", ids);
  if (e2) throw new Error(`글 정보를 못 읽었어요: ${e2.message}`);
  return aggregatePostViews((views ?? []) as Parameters<typeof aggregatePostViews>[0], (posts ?? []) as Parameters<typeof aggregatePostViews>[1], today);
}
