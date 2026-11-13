"use client";

// 쇼핑 글 관리 (2026-11-13~ 직접 쓴 글 중심으로 개편).
// 다른 곳에서 쓴 글을 붙여넣으면 사진 자리·구매 버튼 자리를 자동으로 만들고, 사진은 사이트에 올리고,
// 구매 링크는 쿠팡 파트너스 링크를 붙여넣어 건다.
// 탭: ✍️ 붙여넣어 초안 만들기 / 📝 초안 / ✅ 발행된 글 / ⚙️ 설정(쿠팡 파트너스 API 키·고지 문구)
// 매시간 AI 자동 글은 꺼 둠 (.github/workflows/shop-post.yml). 자동 글 설정 화면(실행·상품 선정·정보 수집·직접 입력 상품·
// 실행 기록·Gemini/Claude/네이버 키)은 화면에서만 뺐다 — 코드(scripts/shop, ShopRunsAdmin 등)와 저장된 값은 그대로.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { ShopAdminPosts } from "@/components/ShopAdminPosts";
import { ShopApiKeys } from "@/components/ShopApiKeys";
import { ShopPasteDraft } from "@/components/ShopPasteDraft";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { getShopConfig, updateDisclosureText, type ShopConfig } from "@/lib/shop-config";
import { DEFAULT_POST_DISCLOSURE } from "@/lib/shop-post-types";

type Tab = "paste" | "draft" | "published" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "paste", label: "✍️ 붙여넣어 초안 만들기" },
  { id: "draft", label: "📝 초안" },
  { id: "published", label: "✅ 발행된 글" },
  { id: "settings", label: "⚙️ 설정" },
];

export default function AdminShopPage() {
  const guard = useAdminGuard("/admin/shop");
  const [tab, setTab] = useState<Tab>("paste");
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 초안·발행 탭에서 열어 둔 글
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    try {
      setConfig(await getShopConfig());
      setLoadError(null);
    } catch (e) {
      setLoadError(`설정 불러오기 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  useEffect(() => {
    if (guard === "authorized") load();
  }, [guard, load]);

  function go(next: Tab) {
    setTab(next);
    setOpenId(null);
    setNotice(null);
  }

  if (guard === "checking") {
    return <main className="mx-auto max-w-4xl px-5 py-12 text-center text-sm text-neutral-500">권한 확인 중…</main>;
  }
  if (guard === "denied") {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 text-center">
        <h1 className="text-xl font-bold">접근 권한이 없습니다</h1>
        <Link href="/" className="mt-5 inline-block rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm">
          홈으로
        </Link>
      </main>
    );
  }

  const disclosure = config?.disclosure_text?.trim() || DEFAULT_POST_DISCLOSURE;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-5 py-8 sm:py-12 pb-16">
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold">쇼핑 글 관리</h1>
        <p className="mt-1 text-sm text-neutral-500">
          다른 곳에서 쓴 글을 붙여넣으면 사진 자리·구매 버튼 자리를 자동으로 만들어요. 사진을 올리고 쿠팡 파트너스 링크를 넣어 발행하세요.
        </p>
      </div>
      <AdminNav />

      <div className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t.id
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {loadError} — 고지 문구는 기본 문구를 씁니다.
        </div>
      )}

      {tab === "paste" && (
        <ShopPasteDraft
          disclosure={disclosure}
          onCreated={(p) => {
            // 저장한 초안을 바로 열어 사진을 올릴 수 있게
            setTab("draft");
            setOpenId(p.id);
            setNotice("초안 저장됨 — 미리보기의 사진 자리를 눌러 사진을 올리고, 링크를 채운 뒤 발행하세요.");
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {(tab === "draft" || tab === "published") && (
        <ShopAdminPosts
          status={tab}
          openId={openId}
          notice={notice}
          reloadKey={reloadKey}
          onOpen={(id) => {
            setOpenId(id);
            setNotice(null);
          }}
        />
      )}

      {tab === "settings" && <SettingsTab config={config} onSaved={load} />}
    </main>
  );
}

function SettingsTab({ config, onSaved }: { config: ShopConfig | null; onSaved: () => Promise<void> }) {
  const [text, setText] = useState(config?.disclosure_text ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setText(config?.disclosure_text ?? "");
  }, [config?.disclosure_text]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await updateDisclosureText(text);
      await onSaved();
      setMsg("저장됨 — 앞으로 만드는 글에 들어가요");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 쿠팡 그룹만 보여 줌 (다른 키는 화면에서만 숨김 — 저장된 값은 지우지 않음) */}
      <ShopApiKeys check={config?.key_check ?? {}} checkedAt={config?.key_check_at ?? null} only={["coupang"]} />

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
        <h2 className="font-bold">쿠팡 파트너스 고지 문구</h2>
        <p className="mt-1 text-xs text-neutral-500">공정위 지침상 필수. 모든 글 맨 위에 들어가요 (이미 만든 글은 만들 때 문구 그대로).</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={DEFAULT_POST_DISCLOSURE}
          className="mt-3 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          {msg && <span className="text-xs text-neutral-500">{msg}</span>}
          <button
            onClick={save}
            disabled={busy || !config}
            className="rounded-full bg-brand px-5 py-2 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </section>

      <p className="text-xs leading-relaxed text-neutral-500">
        매시간 AI 자동 글은 꺼져 있어요. 다시 켜려면 <code>.github/workflows/shop-post.yml</code> 의 주석대로 schedule 을 되살리면 돼요.
      </p>
    </div>
  );
}
