// 건의함 — 유저가 관리자에게 1:1 로 보내는 건의. 다른 유저는 조회 불가.
// 관리자는 전체를 보고 답변할 수 있으며, 답변은 본인(작성자)에게만 표시된다.

import { supabase } from "./supabase";

export type SuggestionStatus = "open" | "replied" | "closed";

export type Suggestion = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  admin_reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
  status: SuggestionStatus;
  created_at: string;
  // 관리자 뷰에서만 채워짐
  author_username?: string | null;
  author_email?: string | null;
};

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error("로그인이 필요합니다");
  return uid;
}

export async function createSuggestion(
  title: string,
  body: string,
): Promise<Suggestion> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("suggestions")
    .insert({
      user_id: uid,
      title: title.trim(),
      body: body.trim(),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Suggestion;
}

// 본인이 보낸 건의 목록 (답변 포함). RLS 정책이 자동으로 본인 것만 반환.
export async function listMySuggestions(): Promise<Suggestion[]> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Suggestion[];
}

// 관리자용: 전체 건의 목록. 작성자 닉네임/이메일을 profiles/auth 에서 별도 조회해 붙인다.
export async function listAllSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .order("status", { ascending: true }) // open 먼저
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Suggestion[];
  if (rows.length === 0) return rows;

  // 작성자 닉네임 매핑 (profiles 에서)
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username")
    .in("user_id", userIds);
  const profileMap = new Map<string, string>();
  for (const p of (profiles ?? []) as { user_id: string; username: string }[]) {
    profileMap.set(p.user_id, p.username);
  }
  // 이메일까지 원하면 admin_list_users 로 이미 가져오는 구조가 있지만, 건의함
  // 용도로는 닉네임만 노출해도 충분.
  return rows.map((r) => ({
    ...r,
    author_username: profileMap.get(r.user_id) ?? null,
  }));
}

export async function adminReplySuggestion(
  id: string,
  reply: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_reply_suggestion", {
    p_id: id,
    p_reply: reply,
  });
  if (error) throw new Error(error.message);
}

export async function deleteSuggestion(id: string): Promise<void> {
  const { error } = await supabase.from("suggestions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function statusLabel(s: SuggestionStatus): string {
  switch (s) {
    case "open":
      return "답변 대기";
    case "replied":
      return "답변 완료";
    case "closed":
      return "종료";
  }
}
