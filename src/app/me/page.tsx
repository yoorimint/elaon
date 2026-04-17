"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { STRATEGIES } from "@/lib/strategies";
import { categoryLabel, timeAgo, type Category } from "@/lib/community";

type Profile = { user_id: string; username: string };

type MyPost = {
  slug: string;
  title: string;
  category: Category;
  comment_count: number;
  created_at: string;
};

type MyShare = {
  slug: string;
  market: string;
  strategy: string;
  days: number;
  return_pct: number;
  benchmark_return_pct: number;
  created_at: string;
};

function strategyName(id: string) {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

export default function MyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [myShares, setMyShares] = useState<MyShare[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    (async () => {
      const [prof, posts, shares] = await Promise.all([
        supabase.from("profiles").select("user_id,username").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("posts")
          .select("slug,title,category,comment_count,created_at")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("shared_backtests")
          .select("slug,market,strategy,days,return_pct,benchmark_return_pct,created_at")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (prof.data) {
        setProfile(prof.data as Profile);
        setUsernameInput((prof.data as Profile).username);
      }
      setMyPosts((posts.data ?? []) as MyPost[]);
      setMyShares((shares.data ?? []) as MyShare[]);
      setLoading(false);
    })();
  }, [user]);

  async function onSaveUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    setNameMessage(null);
    const name = usernameInput.trim();
    if (!/^[a-zA-Z0-9_가-힣]{2,20}$/.test(name)) {
      setNameMessage({
        kind: "err",
        text: "2~20자, 한글/영문/숫자/밑줄만 가능합니다",
      });
      return;
    }
    if (name === profile.username) return;

    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: name })
      .eq("user_id", user.id);
    setSavingName(false);

    if (error) {
      setNameMessage({
        kind: "err",
        text:
          error.code === "23505" || error.message.includes("duplicate")
            ? "이미 사용 중인 닉네임입니다"
            : error.message,
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
      <h1 className="text-2xl font-bold">마이페이지</h1>
      <p className="mt-1 text-sm text-neutral-500">{user.email}</p>

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
          <div
            className={`mt-2 text-sm ${
              nameMessage.kind === "ok" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {nameMessage.text}
          </div>
        )}
      </section>

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

      <section className="mt-8">
        <h2 className="text-lg font-bold">내 글 ({myPosts.length})</h2>
        {loading ? (
          <div className="mt-3 text-sm text-neutral-500">불러오는 중…</div>
        ) : myPosts.length === 0 ? (
          <div className="mt-3 text-sm text-neutral-500">아직 작성한 글이 없습니다.</div>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-b border-neutral-200 dark:border-neutral-800">
            {myPosts.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/community/${p.slug}`}
                  className="flex items-center gap-3 py-3 px-2 -mx-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <span className="shrink-0 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                    {categoryLabel(p.category)}
                  </span>
                  <span className="flex-1 truncate">
                    {p.title}
                    {p.comment_count > 0 && (
                      <span className="ml-2 text-brand text-sm">[{p.comment_count}]</span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-500 shrink-0">
                    {timeAgo(p.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">내 백테스트 ({myShares.length})</h2>
        {loading ? (
          <div className="mt-3 text-sm text-neutral-500">불러오는 중…</div>
        ) : myShares.length === 0 ? (
          <div className="mt-3 text-sm text-neutral-500">
            아직 공유한 백테스트가 없습니다. 결과 공유 시 로그인되어 있어야 이 목록에 남습니다.
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {myShares.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/r/${s.slug}`}
                  className="block rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-brand/50"
                >
                  <div className="flex flex-wrap gap-1.5 text-xs text-neutral-500">
                    <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                      {s.market}
                    </span>
                    <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                      {strategyName(s.strategy)}
                    </span>
                    <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                      {s.days}일
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className={`text-xl font-bold ${
                        s.return_pct >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {s.return_pct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-neutral-500">
                      vs {s.benchmark_return_pct.toFixed(1)}%
                    </span>
                    <span className="ml-auto text-xs text-neutral-500">
                      {timeAgo(s.created_at)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
