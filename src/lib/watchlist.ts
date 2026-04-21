// 로그인 사용자의 관심 종목. 각 행은 (market, 선택적 strategy_id) 짝.
// 전략이 연결돼 있으면 /watchlist 페이지에서 해당 전략 기준 오늘 신호 뱃지가 뜬다.

import { supabase } from "./supabase";

export const MAX_WATCHLIST = 20;

export type WatchItem = {
  id: string;
  market: string;
  strategy_id: string | null;
  created_at: string;
};

export async function listWatchlist(): Promise<WatchItem[]> {
  const { data, error } = await supabase
    .from("user_watchlist")
    .select("id,market,strategy_id,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as WatchItem[] | null) ?? [];
}

export async function addToWatchlist(market: string): Promise<WatchItem> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("로그인이 필요해요");

  const { count } = await supabase
    .from("user_watchlist")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) >= MAX_WATCHLIST) {
    throw new Error(`관심 종목은 최대 ${MAX_WATCHLIST}개까지 담을 수 있어요`);
  }

  const { data, error } = await supabase
    .from("user_watchlist")
    .insert({ user_id: userId, market })
    .select("id,market,strategy_id,created_at")
    .single();
  if (error) {
    // unique 충돌은 "이미 있음" 으로 친절히 처리
    if (error.code === "23505") throw new Error("이미 관심 종목에 담겨 있어요");
    throw new Error(error.message);
  }
  return data as WatchItem;
}

export async function removeFromWatchlist(market: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("로그인이 필요해요");
  const { error } = await supabase
    .from("user_watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("market", market);
  if (error) throw new Error(error.message);
}

// 전략 연결 / 해제. null 이면 "연결 끊기".
export async function setWatchStrategy(
  watchId: string,
  strategyId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("user_watchlist")
    .update({ strategy_id: strategyId })
    .eq("id", watchId);
  if (error) throw new Error(error.message);
}
