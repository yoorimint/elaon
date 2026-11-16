"use client";

// 내정보 — 2026-11 커뮤니티·회원가입을 없애면서 로그인한 사람(주로 관리자)용 최소 기능만 남겼다:
// 닉네임·비밀번호 변경 + 관리자 화면·건의함으로 가는 링크.
// (닉네임은 이제 관리자 건의함에만 보이지만, 개인정보처리방침에 "변경 가능"으로 적혀 있어 남긴다)

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

type Profile = { user_id: string; username: string };

export default function MyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [admin, setAdmin] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    isAdmin().then(setAdmin);
    supabase
      .from("profiles")
      .select("user_id,username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setProfile(data as Profile);
        setUsernameInput((data as Profile).username);
      });
  }, [user]);

  async function onSaveUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    setNameMessage(null);
    const name = usernameInput.trim();
    if (!/^[a-zA-Z0-9_가-힣]{2,20}$/.test(name)) {
      setNameMessage({ kind: "err", text: "2~20자, 한글/영문/숫자/밑줄만 가능합니다" });
      return;
    }
    if (name === profile.username) return;

    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ username: name }).eq("user_id", user.id);
    setSavingName(false);

    if (error) {
      setNameMessage({
        kind: "err",
        text: error.code === "23505" || error.message.includes("duplicate") ? "이미 사용 중인 닉네임입니다" : error.message,
      });
      return;
    }
    setProfile({ ...profile, username: name });
    setNameMessage({ kind: "ok", text: "변경되었습니다" });
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);
    if (pw1.length < 6) {
      setPwMessage({ kind: "err", text: "비밀번호는 6자 이상" });
      return;
    }
    if (pw1 !== pw2) {
      setPwMessage({ kind: "err", text: "비밀번호가 일치하지 않습니다" });
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setSavingPw(false);
    if (error) {
      setPwMessage({ kind: "err", text: error.message });
      return;
    }
    setPw1("");
    setPw2("");
    setPwMessage({ kind: "ok", text: "비밀번호 변경 완료" });
  }

  if (authLoading || !user) {
    return <main className="mx-auto max-w-3xl px-5 py-12 text-neutral-500">확인 중…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-2xl font-bold">내정보</h1>
      <p className="mt-1 text-sm text-neutral-500">{user.email}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {admin && (
          <Link
            href="/admin"
            className="rounded-full bg-brand px-5 py-2 text-white text-sm font-semibold hover:bg-brand-dark"
          >
            관리자 화면
          </Link>
        )}
        <Link
          href="/suggest"
          className="rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          건의하기
        </Link>
      </div>

      {profile && (
        <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
          <h2 className="text-base font-semibold">닉네임</h2>
          <form onSubmit={onSaveUsername} className="mt-3 flex gap-2">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            />
            <button
              type="submit"
              disabled={savingName}
              className="rounded-full bg-brand px-5 py-2 text-white text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
            >
              {savingName ? "저장 중…" : "저장"}
            </button>
          </form>
          {nameMessage && (
            <div className={`mt-2 text-sm ${nameMessage.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>
              {nameMessage.text}
            </div>
          )}
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="text-base font-semibold">비밀번호 변경</h2>
        <form onSubmit={onChangePassword} className="mt-3 space-y-2">
          <input
            type="password"
            placeholder="새 비밀번호"
            autoComplete="new-password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          />
          <input
            type="password"
            placeholder="새 비밀번호 확인"
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          />
          <button
            type="submit"
            disabled={savingPw || !pw1}
            className="rounded-full bg-brand px-5 py-2 text-white text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
          >
            {savingPw ? "저장 중…" : "변경"}
          </button>
        </form>
        {pwMessage && (
          <div
            className={`mt-2 text-sm ${
              pwMessage.kind === "ok" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {pwMessage.text}
          </div>
        )}
      </section>
    </main>
  );
}
