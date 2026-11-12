"use client";

// 작성된 글의 상품 사진·링크 수정. 쿠팡 파트너스 "이미지+텍스트" HTML 을 붙여넣으면
// 링크와 사진이 함께 바뀐다. 글 본문은 그대로.

import { useState } from "react";
import { isPartnersLink, parsePartnersInput } from "@/lib/shop-config";
import {
  notifySearchEngines,
  setPostStatus,
  updatePostProducts,
  type AdminPostRow,
} from "@/lib/shop-posts";
import type { ShopPostInputProduct } from "@/lib/shop-post-types";

export function ShopPostProductsEditor({
  post,
  publishWhenComplete,
  onSaved,
}: {
  post: AdminPostRow;
  // 링크 필요 초안: 링크를 모두 넣고 저장하면 바로 발행
  publishWhenComplete: boolean;
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
      await updatePostProducts(postId, draft);
      const complete = draft.every((p) => p.link.trim());
      if (publishWhenComplete && complete) {
        await setPostStatus({ ...post, products: draft }, "published");
        void notifySearchEngines(post.slug);
        setMsg("저장 후 발행됨");
      } else {
        setMsg(complete ? "저장됨" : "저장됨 (링크가 남았어요)");
      }
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
        쿠팡 파트너스 → 상품 검색 → 링크 생성 → &quot;이미지+텍스트&quot; HTML 을 복사해 붙여넣으세요.
      </p>
      {publishWhenComplete && (
        <p className="text-xs font-semibold text-brand">링크를 모두 넣고 저장하면 바로 발행돼요.</p>
      )}
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
              placeholder="이미지+텍스트 HTML 또는 링크 붙여넣기"
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
          {saving ? "저장 중…" : publishWhenComplete ? "저장하고 발행" : "사진·링크 저장"}
        </button>
      </div>
    </div>
  );
}
