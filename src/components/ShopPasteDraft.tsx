"use client";

// 관리자 "붙여넣어 초안 만들기" 탭: 다른 곳에서 쓴 글을 붙여넣고 "인식하기" → 블록 편집기 + 미리보기 → 초안 저장.
// 인식 규칙은 src/lib/shop-paste.ts (테스트: scripts/shop/paste.test.ts).

import { useState } from "react";
import { ShopManualEditor, type ManualDraft, type SavedPostRef } from "@/components/ShopManualEditor";
import { countBlocks } from "@/lib/shop-manual";
import { parsePastedDraft, type PasteResult } from "@/lib/shop-paste";

export function ShopPasteDraft({
  disclosure,
  onCreated,
}: {
  disclosure: string;
  onCreated: (post: SavedPostRef) => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ draft: ManualDraft; info: PasteResult; key: number } | null>(null);

  function recognize() {
    if (!text.trim()) return;
    if (result && !confirm("다시 인식하면 지금 고친 내용이 사라져요. 계속할까요?")) return;
    const info = parsePastedDraft(text);
    setResult({
      key: Date.now(),
      info,
      draft: {
        title: info.title,
        category: "",
        description: "",
        blocks: info.blocks,
        products: info.products,
        disclosure,
      },
    });
  }

  const c = result ? countBlocks(result.info.blocks) : null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5">
        <h2 className="font-bold">붙여넣어 초안 만들기</h2>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
          다른 곳에서 쓴 글을 그대로 붙여넣으세요. <b>[사진]</b> <b>[이미지: 설명]</b> <b>(사진)</b> 📷 은 사진 자리로,{" "}
          <b>[쿠팡 링크]</b> <b>[구매하기 버튼]</b> <b>👉 … 보러가기</b> 와 쿠팡 파트너스 주소는 구매 버튼 자리로 바뀌어요.
          표시가 없으면 소제목마다 사진 자리, 글 맨 위·맨 끝에 구매 버튼 자리를 넣어요.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={result ? 5 : 14}
          placeholder={"글 제목\n\n본문 문단…\n\n[이미지: 제품 전체 모습]\n\n## 소제목\n\n본문…\n\n[쿠팡 링크]"}
          className="mt-3 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-sm leading-relaxed"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={recognize}
            disabled={!text.trim()}
            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {result ? "다시 인식하기" : "인식하기"}
          </button>
          <span className="text-xs text-neutral-500">{text.length ? `${text.length.toLocaleString()}자` : ""}</span>
        </div>

        {result && c && (
          <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-900/60">
            <div className="font-semibold">
              인식 결과: 사진 자리 {c.images} · 구매 버튼 자리 {c.links} · 소제목 {c.headings} · 문단 {c.paragraphs}
              {c.lists ? ` · 목록 ${c.lists}` : ""}
              {result.info.title ? " · 제목 찾음" : " · 제목 못 찾음 (직접 입력)"}
            </div>
            {(result.info.autoPlaced.images || result.info.autoPlaced.links) && (
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                {result.info.autoPlaced.images && "사진 표시가 없어 소제목마다 사진 자리를 넣었어요. "}
                {result.info.autoPlaced.links && "구매 버튼 표시가 없어 글 맨 위·맨 끝에 넣었어요."}
              </p>
            )}
            {result.info.warnings.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-amber-800 dark:text-amber-300">
                {result.info.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {result && (
        <ShopManualEditor
          key={result.key}
          initial={result.draft}
          post={null}
          onCreated={(p) => {
            setText("");
            setResult(null);
            onCreated(p);
          }}
        />
      )}
    </div>
  );
}
