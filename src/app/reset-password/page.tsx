"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 이메일 링크로 들어오면 Supabase가 URL 해시의 recovery 토큰으로
  // 자동 세션을 만들어줌. PASSWORD_RECOVERY 이벤트로 폼 활성화.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // 이미 세션이 있으면(새로고침 후 등) 바로 활성화
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <h1 className="text-2xl font-bold">비밀번호 재설정</h1>

      {!ready && !done && (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          재설정 링크를 확인하는 중입니다. 이메일에서 받은 링크를 통해 들어와
          주세요.
        </p>
      )}

      {ready && !done && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">새 비밀번호 (6자 이상)</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">새 비밀번호 확인</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand px-5 py-3 text-white font-semibold hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "변경 중…" : "비밀번호 변경"}
          </button>
        </form>
      )}

      {done && (
        <div className="mt-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          비밀번호가 변경됐습니다. 홈으로 이동합니다…
        </div>
      )}

      <div className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">
        <Link href="/login" className="text-brand underline">
          로그인으로
        </Link>
      </div>
    </main>
  );
}
