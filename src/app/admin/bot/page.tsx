"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AdminNav } from "@/components/AdminNav";
import { isAdmin, timeAgo } from "@/lib/community";
import {
  deleteBotPost,
  getBotConfig,
  listBotPosts,
  updateBotConfig,
  updateBotPost,
  type BotConfig,
  type BotPostRow,
} from "@/lib/bot-config";

export default function AdminBotPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [posts, setPosts] = useState<BotPostRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([getBotConfig(), listBotPosts(100)]);
      setConfig(c);
      setPosts(p);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "불러오기 실패");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/admin/bot");
      return;
    }
    isAdmin().then((ok) => {
      setAuthorized(ok);
      setChecking(false);
      if (ok) load();
    });
  }, [user, authLoading, router, load]);

  async function onSaveConfig() {
    if (!config) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateBotConfig({
        enabled: config.enabled,
        daily_count: config.daily_count,
        window_start_hour: config.window_start_hour,
        window_end_hour: config.window_end_hour,
        bot_user_id: config.bot_user_id,
      });
      setMsg("저장됨");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(p: BotPostRow) {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditBody(p.body);
  }

  async function saveEdit() {
    if (!editingId) return;
    setBusyId(editingId);
    try {
      await updateBotPost(editingId, { title: editTitle, body: editBody });
      setEditingId(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function removePost(id: string) {
    if (!confirm("이 봇 글을 삭제할까요?")) return;
    setBusyId(id);
    try {
      await deleteBotPost(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || checking) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 text-center text-sm text-neutral-500">
        권한 확인 중…
      </main>
    );
  }
  if (!authorized) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 text-center">
        <h1 className="text-xl font-bold">접근 권한이 없습니다</h1>
        <Link
          href="/"
          className="mt-5 inline-block rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm"
        >
          홈으로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold">봇 운영</h1>
        <p className="mt-1 text-sm text-neutral-500">
          자동으로 하루 N회 전략 분석 글을 생성하는 봇. 종목·전략은 순차 로테이션이며
          한 쌍마다 실제 백테스트를 돌려 `/r/&lt;slug&gt;`와 함께 게시합니다.
        </p>
      </div>
      <AdminNav />

      {config && (
        <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">설정</h2>
            {msg && <span className="text-xs text-neutral-500">{msg}</span>}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="h-5 w-5"
              />
              <span className="font-medium">봇 활성화</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium">하루 포스트 수</span>
              <input
                type="number"
                min={0}
                max={20}
                value={config.daily_count}
                onChange={(e) => setConfig({ ...config, daily_count: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">시작 시각 (KST)</span>
              <input
                type="number"
                min={0}
                max={23}
                value={config.window_start_hour}
                onChange={(e) => setConfig({ ...config, window_start_hour: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">종료 시각 (KST)</span>
              <input
                type="number"
                min={0}
                max={23}
                value={config.window_end_hour}
                onChange={(e) => setConfig({ ...config, window_end_hour: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">봇 계정 user_id</span>
              <input
                type="text"
                value={config.bot_user_id ?? ""}
                onChange={(e) => setConfig({ ...config, bot_user_id: e.target.value || null })}
                placeholder="elaon봇 계정의 auth.users.id (UUID)"
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-xs font-mono"
              />
              <span className="text-xs text-neutral-500 mt-1 block">
                Supabase → Authentication → Users 에서 봇 계정의 UID 복사해 붙여넣기
              </span>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 items-center justify-between">
            <div className="text-xs text-neutral-500">
              현재 카운터 {config.post_counter} · 마지막 저장 {timeAgo(config.updated_at)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onSaveConfig}
                disabled={saving}
                className="rounded-full bg-brand text-white px-5 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
              >
                {saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-3 text-xs text-neutral-600 dark:text-neutral-300 space-y-2">
            <div className="font-semibold">수동 실행</div>
            <div>
              아래 버튼으로 GitHub Actions 페이지를 열고 <b>Run workflow</b> 클릭
              (&quot;force&quot; 체크하면 스케줄 무시하고 1회 즉시 실행).
            </div>
            <a
              href="https://github.com/yoorimint/elaon/actions/workflows/bot-post.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-xs font-semibold hover:opacity-90"
            >
              GitHub Actions 열기 ↗
            </a>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-bold mb-3">봇 포스트 ({posts.length})</h2>
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
            아직 생성된 봇 포스트가 없습니다.
          </div>
        ) : (
          <ul className="grid gap-3">
            {posts.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
              >
                {editingId === p.id ? (
                  <div className="space-y-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm font-semibold"
                    />
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={8}
                      className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-1.5 text-xs"
                      >
                        취소
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={busyId === p.id}
                        className="rounded-full bg-brand text-white px-4 py-1.5 text-xs font-semibold disabled:opacity-60"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-neutral-500">
                          {timeAgo(p.created_at)} · 댓글 {p.comment_count}
                          {p.backtest_slug && (
                            <>
                              {" · "}
                              <Link
                                href={`/r/${p.backtest_slug}`}
                                target="_blank"
                                className="text-brand hover:underline"
                              >
                                백테스트
                              </Link>
                            </>
                          )}
                          {" · "}
                          <Link
                            href={`/community/${p.slug}`}
                            target="_blank"
                            className="text-brand hover:underline"
                          >
                            글 보기
                          </Link>
                        </div>
                        <div className="mt-1 font-semibold">{p.title}</div>
                        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 line-clamp-3 whitespace-pre-wrap">
                          {p.body}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => beginEdit(p)}
                          className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs font-semibold"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => removePost(p.id)}
                          disabled={busyId === p.id}
                          className="rounded-full bg-red-600 text-white px-3 py-1 text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
