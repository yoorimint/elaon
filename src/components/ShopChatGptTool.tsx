"use client";

// 관리자 ⚙️ 설정 → "챗GPT 연결": 챗GPT 맞춤 GPT 가 우리 서버의 쿠팡 도구 API(/api/tools/coupang/*)를 부르게 하는 설정.
// 쿠팡 키는 서버에만 두고, 챗GPT 에는 별도 "도구 토큰"만 넣는다. 토큰은 만들 때 한 번만 화면에 보여 준다 (서버는 원문을 다시 돌려주지 않음).
// 처리: src/lib/coupang-tools.ts, 스키마: src/lib/coupang-openapi.ts

import { useCallback, useEffect, useState } from "react";
import { DEEPLINK_CALLS_PER_HOUR, SEARCH_CACHE_HOURS, SEARCH_CALLS_PER_HOUR } from "@/lib/coupang-limits";
import { OPENAPI_PATH, TOOL_SERVER_URL } from "@/lib/coupang-openapi";
import { createToolToken } from "@/lib/coupang-tool-client";
import { getSecretStatus, type SecretStatus } from "@/lib/shop-config";
import { timeAgo } from "@/lib/time-ago";

// src/lib/tool-token.ts 의 TOOL_TOKEN_NAME 과 같아야 한다 (그 파일은 서버 전용이라 여기서 import 하지 않음)
const TOOL_TOKEN_NAME = "CHATGPT_TOOL_TOKEN";
const SCHEMA_URL = `${TOOL_SERVER_URL}${OPENAPI_PATH}`;

type Status = { token: SecretStatus | null; coupangKeys: boolean };

export function ShopChatGptTool({ reloadKey = 0 }: { reloadKey?: number }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null); // 방금 만든 토큰 (이 화면에서만, 한 번)
  const [copied, setCopied] = useState<"token" | "schema" | null>(null);

  const reload = useCallback(async () => {
    try {
      // 키 상태 목록에는 허용 목록 밖의 이름(도구 토큰)도 끝 4자리로 온다
      const st = (await getSecretStatus()) as Record<string, SecretStatus | undefined>;
      setStatus({ token: st[TOOL_TOKEN_NAME] ?? null, coupangKeys: !!st.COUPANG_ACCESS_KEY && !!st.COUPANG_SECRET_KEY });
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, reloadKey]);

  async function create() {
    if (status?.token && !window.confirm("새 토큰을 만들면 지금 챗GPT 에 넣어 둔 토큰은 바로 못 쓰게 돼요. 새 토큰을 챗GPT 에 다시 넣어야 해요.\n\n계속할까요?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await createToolToken();
      setFresh(r.token);
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "만들기 실패");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, what: "token" | "schema") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setMsg("복사하지 못했어요 — 칸을 눌러 직접 복사해 주세요");
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
      <h2 className="font-bold">🤖 챗GPT 연결 (쿠팡 상품 찾기·파트너스 링크 만들기)</h2>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
        챗GPT 맞춤 GPT 에서 &ldquo;상품 찾아줘&rdquo;, &ldquo;링크 만들어줘&rdquo;를 하면 우리 서버가 쿠팡 API 를 대신 불러요. 쿠팡 키는 서버에만 있고 챗GPT 에는 아래 <b>도구 토큰</b>만 넣어요.
      </p>
      {loadError && <p className="mt-3 text-sm text-red-600">상태 불러오기 실패: {loadError}</p>}

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-3">
          <div className="text-xs text-neutral-500">쿠팡 키 (위 &lsquo;쿠팡 파트너스 API&rsquo; 칸)</div>
          <div className="mt-0.5 font-semibold">{status === null ? "…" : status.coupangKeys ? "✅ 넣어 둠" : "⚠️ 아직 없음 — 위 칸에 Access Key·Secret Key 를 넣어 주세요"}</div>
        </div>
        <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-3">
          <div className="text-xs text-neutral-500">도구 토큰</div>
          <div className="mt-0.5 font-semibold">
            {status === null ? "…" : status.token ? `✅ 있음 ${status.token.hint} · ${timeAgo(status.token.updated_at)} 만듦` : "아직 없음"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {msg && <span className="text-xs text-red-600">{msg}</span>}
        <button
          onClick={create}
          disabled={busy || status === null}
          className="rounded-full bg-brand px-5 py-2 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "만드는 중…" : "도구 토큰 새로 만들기"}
        </button>
      </div>

      {fresh && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/30">
          <p className="font-semibold text-amber-800 dark:text-amber-200">새 도구 토큰 — 지금 한 번만 보여요</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            채팅창에 붙여넣지 마세요. 챗GPT 의 GPT 편집 화면 → Actions → <b>인증(Authentication)</b> 칸에만 넣으세요. 잃어버리면 새로 만들면 돼요.
          </p>
          <div className="mt-2 flex gap-2">
            <input readOnly value={fresh} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 font-mono text-xs" />
            <button onClick={() => copy(fresh, "token")} className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">
              {copied === "token" ? "복사됨" : "복사"}
            </button>
            <button onClick={() => setFresh(null)} className="shrink-0 rounded-full border border-neutral-300 px-4 py-2 text-xs dark:border-neutral-700">
              숨기기
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
        <p className="font-semibold">챗GPT 연결 순서</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          <li>위에서 쿠팡 키를 넣고 &lsquo;도구 토큰 새로 만들기&rsquo;</li>
          <li>chatgpt.com → GPT 탐색 → 만들기 → 구성(Configure) → 맨 아래 &lsquo;새 작업 만들기(Create new action)&rsquo;</li>
          <li>스키마: &lsquo;URL 에서 가져오기(Import from URL)&rsquo;에 아래 주소</li>
          <li>인증(Authentication): API 키 → 인증 유형 Bearer → 방금 만든 도구 토큰 붙여넣기 → 저장</li>
          <li>GPT 에게 &ldquo;무선 청소기 찾아줘&rdquo;, &ldquo;이 쿠팡 주소 파트너스 링크로 바꿔줘&rdquo;라고 시험</li>
        </ol>
        <div className="mt-2 flex gap-2">
          <input readOnly value={SCHEMA_URL} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 font-mono text-xs" />
          <button onClick={() => copy(SCHEMA_URL, "schema")} className="shrink-0 rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold dark:border-neutral-700">
            {copied === "schema" ? "복사됨" : "주소 복사"}
          </button>
        </div>
        <p className="mt-2 text-neutral-500">
          쿠팡은 시간당 호출 수를 제한해요 (공식 수치는 확인 못 함 — 계정 정지를 피하려고 서버가 검색 시간당 {SEARCH_CALLS_PER_HOUR}번, 링크 만들기 {DEEPLINK_CALLS_PER_HOUR}번까지만 부르고, 같은 검색어는 {SEARCH_CACHE_HOURS}시간 동안 저장해 둔 결과를 써요).
        </p>
      </div>
    </section>
  );
}
