"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage(
      "재설정 링크를 이메일로 보냈습니다. 받은편지함(스팸함 포함)을 확인해주세요.",
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <h1 className="text-2xl font-bold">비밀번호 찾기</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
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

        {error && <div className="text-sm text-red-600">{error}</div>}
        {message && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand px-5 py-3 text-white font-semibold hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "보내는 중…" : "재설정 링크 보내기"}
        </button>
      </form>

      <div className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        <Link href="/login" className="text-brand underline">
          로그인으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
