"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    if (password !== password2) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <h1 className="text-2xl font-bold">회원가입</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        이메일과 비밀번호만 있으면 됩니다.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">이메일</span>
          <input
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">비밀번호 (6자 이상)</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">비밀번호 확인</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </label>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand px-5 py-3 text-white font-semibold hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "가입 중…" : "가입하기"}
        </button>
      </form>

      <div className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-brand underline">
          로그인
        </Link>
      </div>
    </main>
  );
}
