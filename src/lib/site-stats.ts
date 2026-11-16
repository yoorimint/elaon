// 방문 통계 — 관리자 대시보드 지표와 헤더의 공개 방문자 카운터.
// (예전 src/lib/community.ts 에서 옮김 — 커뮤니티는 2026-11 제거)
import { supabase } from "./supabase";

// ===== 관리자: 사이트 지표 =====
// admin_site_stats RPC 는 게시글·댓글·신고 수도 돌려주지만 커뮤니티를 없애서 화면에 쓰는 값만 받는다.

export type SiteStats = {
  today_visits: number;
  today_uniques: number;
  yesterday_uniques: number;
  week_uniques: number;
  today_signups: number;
  total_users: number;
  banned_users: number;
  open_suggestions: number;
};

export async function getSiteStats(): Promise<SiteStats | null> {
  const { data, error } = await supabase.rpc("admin_site_stats");
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  // Postgres 가 bigint 를 string 으로 줄 수도 있어서 숫자 변환.
  const num = (v: unknown) => (v == null ? 0 : Number(v));
  return {
    today_visits: num(row.today_visits),
    today_uniques: num(row.today_uniques),
    yesterday_uniques: num(row.yesterday_uniques),
    week_uniques: num(row.week_uniques),
    today_signups: num(row.today_signups),
    total_users: num(row.total_users),
    banned_users: num(row.banned_users),
    open_suggestions: num(row.open_suggestions),
  };
}

export type VisitTrendRow = {
  date: string;
  uniques: number;
  views: number;
};

export async function getVisitsTrend(): Promise<VisitTrendRow[]> {
  const { data, error } = await supabase.rpc("admin_visits_trend");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{
    visited_date: string;
    uniques: number | string;
    views: number | string;
  }>;
  return rows.map((r) => ({
    date: r.visited_date,
    uniques: Number(r.uniques),
    views: Number(r.views),
  }));
}

export type ReferrerRow = {
  domain: string;
  visits: number;
  uniques: number;
};

export async function getReferrerStats(): Promise<ReferrerRow[]> {
  const { data, error } = await supabase.rpc("admin_referrer_stats");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{
    referrer_domain: string | null;
    visits: number | string;
    uniques: number | string;
  }>;
  return rows.map((r) => ({
    domain: r.referrer_domain ?? "(알 수 없음)",
    visits: Number(r.visits),
    uniques: Number(r.uniques),
  }));
}

export type LandingRow = {
  path: string;
  visits: number;
  uniques: number;
};

export async function getLandingStats(): Promise<LandingRow[]> {
  const { data, error } = await supabase.rpc("admin_landing_stats");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{
    landing_path: string | null;
    visits: number | string;
    uniques: number | string;
  }>;
  return rows.map((r) => ({
    path: r.landing_path ?? "(알 수 없음)",
    visits: Number(r.visits),
    uniques: Number(r.uniques),
  }));
}

// ===== 공개 방문자 카운터 =====
// anon 권한으로 호출 가능. 오늘 유니크 + 누적 유니크만 반환한다.

export type VisitCounters = {
  today: number;
  total: number;
};

export async function getVisitCounters(): Promise<VisitCounters> {
  const { data, error } = await supabase.rpc("get_visit_counters");
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    today: Number(row?.today_uniques ?? 0),
    total: Number(row?.total_uniques ?? 0),
  };
}
