"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { isAdmin } from "./community";

export type AdminGuardState = "checking" | "authorized" | "denied";

// 관리자 페이지 공통 권한 확인. 비로그인이면 로그인 페이지로 보낸다.
// 실제 데이터 보호는 Supabase RLS(is_admin) 가 담당하고, 이 훅은 화면 분기용.
export function useAdminGuard(redirectPath: string): AdminGuardState {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [state, setState] = useState<AdminGuardState>("checking");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    isAdmin().then((ok) => setState(ok ? "authorized" : "denied"));
  }, [user, loading, router, redirectPath]);

  return state;
}
