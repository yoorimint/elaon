// 로그인 사용자가 백테스트 설정(종목/타임프레임/전략/파라미터)을 이름 붙여
// 저장하고 재사용할 수 있게 해준다. 미로그인이어도 마지막 설정은
// localStorage 에 자동 저장돼 다음 방문 때 복원된다.

import { supabase } from "./supabase";
import type { Timeframe } from "./upbit";
import type { StrategyId } from "./strategies";
import type { Condition } from "./diy-strategy";

export type BacktestConfig = {
  market: string;
  timeframe: Timeframe;
  strategy: StrategyId;
  rangePreset: string;
  dateFrom: string;
  dateTo: string;
  shortMa: number;
  longMa: number;
  rsiPeriod: number;
  rsiLow: number;
  rsiHigh: number;
  bbPeriod: number;
  bbStddev: number;
  bbTouch: "close" | "wick";
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  breakoutK: number;
  stochPeriod: number;
  stochSmooth: number;
  stochLow: number;
  stochHigh: number;
  ichimokuConv: number;
  ichimokuBase: number;
  ichimokuLag: number;
  dcaInterval: number;
  dcaAmount: number;
  maDcaMaPeriod: number;
  gridLow: number;
  gridHigh: number;
  gridCount: number;
  gridMode: "arith" | "geom";
  customBuy: Condition[];
  customSell: Condition[];
  stopLoss: number;
  takeProfit: number;
  // 연속 매수 허용 (커스텀 전략 한정). true 면 포지션 있어도 매수 조건 재검사.
  diyAllowReentry?: boolean;
  // 분할 매도 비중 (0~1). 1 = 전량 (기본). 0.25 = 신호마다 25% 매도.
  diySellFraction?: number;
  initialCash: number;
  feeBps: number;
  positionSizePct?: number;
  martingaleFactor?: number;
  slippageBps?: number;
  walkForward?: boolean;
  rebalanceTP?: number;
  rebalanceDrop?: number;
};

export type SavedStrategy = {
  id: string;
  name: string;
  config: BacktestConfig;
  created_at: string;
  updated_at: string;
};

export const MAX_SAVED = 20;
const LAST_KEY = "eloan_last_config_v1";
const CLONE_HANDOFF_KEY = "eloan_backtest_clone_v1";

// localStorage: 모든 방문자의 "마지막 설정" 자동 기억.
// 탭을 닫아도 남고 다음 방문 때 자동 복원된다.
export function saveLastConfig(cfg: BacktestConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_KEY, JSON.stringify(cfg));
  } catch {}
}

export function loadLastConfig(): BacktestConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BacktestConfig;
  } catch {
    return null;
  }
}

// "내 전략으로 복제" 인계용 sessionStorage 버킷. 공유 페이지에서 복제 버튼을
// 누르면 여기에 한 번 던져두고 /backtest 페이지가 최초 마운트 시 꺼내 쓴다.
// 탭 닫으면 사라지고, 한 번 consume 하면 바로 제거돼 뒤로가기 재진입 시
// "자동 복제"가 반복되지 않는다.
export function setCloneHandoff(cfg: BacktestConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CLONE_HANDOFF_KEY, JSON.stringify(cfg));
  } catch {}
}

export function consumeCloneHandoff(): BacktestConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CLONE_HANDOFF_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(CLONE_HANDOFF_KEY);
    return JSON.parse(raw) as BacktestConfig;
  } catch {
    return null;
  }
}

type Row = {
  id: string;
  name: string;
  config: BacktestConfig;
  created_at: string;
  updated_at: string;
};

export async function listMyStrategies(): Promise<SavedStrategy[]> {
  const { data, error } = await supabase
    .from("user_strategies")
    .select("id,name,config,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Row[] | null) ?? [];
}

// 같은 이름이 이미 있으면 덮어쓰고, 없으면 새로 만든다. 사용자 입장에서
// "같은 이름으로 다시 저장 = 업데이트" 가 자연스럽다.
export async function saveStrategy(
  name: string,
  config: BacktestConfig,
): Promise<SavedStrategy> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("이름을 입력해주세요");
  if (trimmed.length > 40) throw new Error("이름은 40자 이하여야 해요");

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("로그인이 필요해요");

  // 이미 같은 이름이면 update, 없으면 insert.
  const { data: existing } = await supabase
    .from("user_strategies")
    .select("id")
    .eq("user_id", userId)
    .eq("name", trimmed)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("user_strategies")
      .update({ config, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("id,name,config,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return data as Row;
  }

  // 새 저장. 개수 상한 체크.
  const { count } = await supabase
    .from("user_strategies")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) >= MAX_SAVED) {
    throw new Error(`저장은 최대 ${MAX_SAVED}개까지 가능해요`);
  }

  const { data, error } = await supabase
    .from("user_strategies")
    .insert({ user_id: userId, name: trimmed, config })
    .select("id,name,config,created_at,updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data as Row;
}

export async function deleteStrategy(id: string): Promise<void> {
  const { error } = await supabase.from("user_strategies").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function renameStrategy(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("이름을 입력해주세요");
  if (trimmed.length > 40) throw new Error("이름은 40자 이하여야 해요");
  const { error } = await supabase
    .from("user_strategies")
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
