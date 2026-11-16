// 관리자 권한 확인 + 회원 목록·제재 (예전 src/lib/community.ts 에서 옮김 — 커뮤니티는 2026-11 제거).
// 실제 데이터 보호는 Supabase RLS·RPC 안의 is_admin 검사가 맡는다. 여기 함수는 화면용 호출일 뿐.
import { supabase } from "./supabase";

export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return Boolean(data);
}

// ===== 회원 목록 + 제재 =====
// 제재(banned)는 건의 등록 등 쓰기를 막는다 (supabase/community.sql 의 is_banned 정책).

export type AdminUser = {
  user_id: string;
  email: string;
  username: string | null;
  created_at: string;
  is_admin: boolean;
  banned: boolean;
  banned_reason: string | null;
  banned_at: string | null;
};

export async function listAllUsers(limit = 200): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_list_users", { p_limit: limit });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    user_id: String(r.user_id),
    email: String(r.email ?? ""),
    username: (r.username as string) ?? null,
    created_at: String(r.created_at),
    is_admin: Boolean(r.is_admin),
    banned: Boolean(r.banned),
    banned_reason: (r.banned_reason as string) ?? null,
    banned_at: (r.banned_at as string) ?? null,
  }));
}

export async function banUser(userId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc("admin_ban_user", {
    p_user_id: userId,
    p_reason: reason?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function unbanUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_unban_user", { p_user_id: userId });
  if (error) throw new Error(error.message);
}
