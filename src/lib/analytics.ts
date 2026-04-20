// 방문 로깅. 서버/백엔드 의존 없이 localStorage 에 client_id 하나 심어두고
// 로그인 여부와 무관하게 매 세션 한 번씩 RPC 호출. 하루 내 재방문은 visit_count
// 증가로 집계되고, 유니크는 client_id 단위.

import { supabase } from "./supabase";

const CLIENT_ID_KEY = "eloan_client_id_v1";
const LAST_LOGGED_KEY = "eloan_last_visit_logged_v1";

function getOrCreateClientId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export async function logVisit(): Promise<void> {
  if (typeof window === "undefined") return;
  const clientId = getOrCreateClientId();
  if (!clientId) return;
  // 같은 세션에서 여러 페이지 이동할 때마다 RPC 때리지 않도록 6시간 쿨다운.
  // 서버도 (date, client_id) 유니크 제약이라 그 안에선 visit_count 만 증가.
  try {
    const last = Number(window.sessionStorage.getItem(LAST_LOGGED_KEY) ?? 0);
    if (Date.now() - last < 6 * 60 * 60 * 1000) return;
    await supabase.rpc("log_visit", { p_client_id: clientId });
    window.sessionStorage.setItem(LAST_LOGGED_KEY, String(Date.now()));
  } catch {
    // 실패해도 사용자에게 보이지 않게 무시
  }
}
