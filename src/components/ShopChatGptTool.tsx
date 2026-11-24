"use client";

// 관리자 ⚙️ 설정 → "챗GPT 연결": 챗GPT 의 "사용자 지정 MCP 서버"가 우리 서버의 쿠팡 도구(/api/mcp)를 부르게 하는 설정.
// 쿠팡 키는 서버에만 두고, 챗GPT 에는 별도 "도구 토큰"이 들어간 MCP 주소만 넣는다.
// 토큰(과 토큰이 든 MCP 주소)은 만들 때 한 번만 화면에 보여 준다 (서버는 원문을 다시 돌려주지 않음).
// 처리: src/lib/mcp-coupang.ts · src/lib/coupang-tools.ts. 예전 Actions 스키마(src/lib/coupang-openapi.ts)는 팀·기업 계정용으로 남겨 둠

import { useCallback, useEffect, useState } from "react";
import { DEEPLINK_CALLS_PER_HOUR, SEARCH_CACHE_HOURS, SEARCH_CALLS_PER_HOUR } from "@/lib/coupang-limits";
import { createToolToken } from "@/lib/coupang-tool-client";
import { MCP_URL, mcpUrlWithToken } from "@/lib/mcp-endpoint";
import { getSecretStatus, type SecretStatus } from "@/lib/shop-config";
import { timeAgo } from "@/lib/time-ago";

// src/lib/tool-token.ts 의 TOOL_TOKEN_NAME 과 같아야 한다 (그 파일은 서버 전용이라 여기서 import 하지 않음)
const TOOL_TOKEN_NAME = "CHATGPT_TOOL_TOKEN";

type Status = { token: SecretStatus | null; coupangKeys: boolean };

export function ShopChatGptTool({ reloadKey = 0 }: { reloadKey?: number }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null); // 방금 만든 토큰 (이 화면에서만, 한 번)
  const [copied, setCopied] = useState<"mcp" | "token" | null>(null);

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
    if (status?.token && !window.confirm("새 토큰을 만들면 지금 챗GPT 에 넣어 둔 MCP 주소는 바로 못 쓰게 돼요. 새 MCP 주소를 챗GPT 에 다시 넣어야 해요.\n\n계속할까요?")) return;
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

  async function copy(text: string, what: "mcp" | "token") {
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
        챗GPT 에 우리 서버를 &lsquo;사용자 지정 MCP 서버&rsquo;로 붙이면 &ldquo;상품 찾아줘&rdquo;, &ldquo;링크 만들어줘&rdquo;에 우리 서버가 쿠팡 API 를 대신 불러요. 쿠팡 키는 서버에만 있고 챗GPT 에는 <b>도구 토큰이 든 MCP 주소</b>만 넣어요.
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
          <p className="font-semibold text-amber-800 dark:text-amber-200">새 MCP 주소(토큰 포함) — 지금 한 번만 보여요</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            이 주소 자체가 비밀번호예요. <b>채팅창에 붙여넣지 마세요.</b> 챗GPT 설정의 &lsquo;사용자 지정 MCP 서버 추가&rsquo; 화면 <b>서버 URL</b> 칸에만 넣으세요. 잃어버리면 새로 만들면 돼요.
          </p>
          <SecretRow value={mcpUrlWithToken(fresh)} copied={copied === "mcp"} onCopy={() => copy(mcpUrlWithToken(fresh), "mcp")} label="MCP 주소 복사" primary />
          <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">토큰만 (헤더 인증을 쓰는 다른 MCP 프로그램용 — {MCP_URL} + Authorization: Bearer 토큰)</p>
          <SecretRow value={fresh} copied={copied === "token"} onCopy={() => copy(fresh, "token")} label="토큰 복사" />
          <div className="mt-2 text-right">
            <button onClick={() => setFresh(null)} className="rounded-full border border-neutral-300 px-4 py-2 text-xs dark:border-neutral-700">
              숨기기
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
        <p className="font-semibold">챗GPT 연결 순서</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          <li>위에서 쿠팡 키를 넣고 &lsquo;도구 토큰 새로 만들기&rsquo; → 나온 &lsquo;MCP 주소(토큰 포함)&rsquo; 복사</li>
          <li>챗GPT(웹) → 설정 → 플러그인 → <b>+</b> → &lsquo;사용자 지정 MCP 서버 추가&rsquo;</li>
          <li>
            서버 URL: 복사한 MCP 주소 붙여넣기 (<span className="font-mono">{MCP_URL}/…토큰…</span>)
          </li>
          <li>
            인증: <b>인증 없음</b> 선택 (토큰이 주소에 들어 있어요) → 추가
          </li>
          <li>새 채팅에서 &ldquo;무선 청소기 찾아줘&rdquo;, &ldquo;이 쿠팡 주소 파트너스 링크로 바꿔줘&rdquo;라고 시험</li>
        </ol>
        <p className="mt-2 text-neutral-500">예전 방식(맞춤 GPT 의 Actions)은 개인 계정에서 GPT 만들기가 막혀 있어 쓰지 않아요.</p>
        <p className="mt-2 text-neutral-500">
          쿠팡은 시간당 호출 수를 제한해요 (공식 수치는 확인 못 함 — 계정 정지를 피하려고 서버가 검색 시간당 {SEARCH_CALLS_PER_HOUR}번, 링크 만들기 {DEEPLINK_CALLS_PER_HOUR}번까지만 부르고, 같은 검색어는 {SEARCH_CACHE_HOURS}시간 동안 저장해 둔 결과를 써요).
        </p>
      </div>
    </section>
  );
}

// 읽기 전용 칸 + 복사 버튼 (방금 만든 비밀값을 보여 줄 때)
function SecretRow({ value, copied, onCopy, label, primary = false }: { value: string; copied: boolean; onCopy: () => void; label: string; primary?: boolean }) {
  return (
    <div className="mt-2 flex gap-2">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 font-mono text-xs" />
      <button
        onClick={onCopy}
        className={
          primary
            ? "shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900"
            : "shrink-0 rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold dark:border-neutral-700"
        }
      >
        {copied ? "복사됨" : label}
      </button>
    </div>
  );
}
