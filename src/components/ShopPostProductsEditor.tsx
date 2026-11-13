"use client";

// 작성된 글의 쿠팡 파트너스 링크 입력·수정. 저장만 하고 발행은 하지 않는다
// (링크·사진을 넣은 뒤 미리보기에서 확인하고 목록의 "발행" 버튼으로 공개).
// 사진은 초안 미리보기에서 사진 자리를 눌러 등록. 글 본문은 그대로.

import { useState } from "react";
import { isPartnersLink, parsePartnersInput } from "@/lib/shop-config";
import { updatePostProducts, type AdminPostRow } from "@/lib/shop-posts";
import type { ShopPostInputProduct } from "@/lib/shop-post-types";

export function ShopPostProductsEditor({
  post,
  onSaved,
}: {
  post: AdminPostRow;
  onSaved: () => Promise<void>;
}) {
  const postId = post.id;
  const products: ShopPostInputProduct[] = post.products;
  const [draft, setDraft] = useState(products);
  const [inputs, setInputs] = useState(products.map(() => ""));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function applyInput(i: number, text: string) {
    setInputs((xs) => xs.map((x, j) => (j === i ? text : x)));
    if (!text.trim()) return;
    const parsed = parsePartnersInput(text);
    setDraft((ps) =>
      ps.map((p, j) =>
        j === i
          ? {
              ...p,
              ...(parsed.link ? { link: parsed.link } : {}),
              ...(parsed.image ? { image: parsed.image } : {}),
            }
          : p,
      ),
    );
  }

  async function save() {
    // 비어 있는 링크는 허용(나중에 채움), 채운 링크는 파트너스 형식이어야 함
    if (draft.some((p) => p.link.trim() && !isPartnersLink(p.link))) {
      setMsg("쿠팡 파트너스 링크가 아닌 상품이 있어요");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      // 링크는 항상, 대표 사진은 여기서 붙여넣어 바꾼 경우에만 보낸다
      await updatePostProducts(
        postId,
        draft.map((p, i) => ({ link: p.link, ...(p.image !== products[i].image ? { image: p.image } : {}) })),
      );
      const complete = draft.every((p) => p.link.trim());
      setMsg(complete ? "저장됨 — 미리보기에서 확인 후 발행하세요" : "저장됨 (링크가 남았어요)");
      await onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-3">
      <p className="text-xs text-neutral-500">
        쿠팡 파트너스 링크(link.coupang.com/a/…)를 붙여넣고 저장하세요. 사진은 미리보기에서 사진 자리를
        눌러 등록해요. 저장만 되고 발행은 목록의 <b>발행</b> 버튼으로 해요.
      </p>
      {draft.map((p, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-neutral-200 dark:border-neutral-700 bg-white">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xl" aria-hidden="true">🛒</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{p.name}</div>
            <input
              type="text"
              value={inputs[i]}
              onChange={(e) => applyInput(i, e.target.value)}
              placeholder="https://link.coupang.com/a/..."
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 font-mono text-xs"
            />
            <div className="mt-0.5 truncate text-[11px] text-neutral-500">{p.link}</div>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-end gap-2">
        {msg && <span className="text-xs text-neutral-500">{msg}</span>}
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}
