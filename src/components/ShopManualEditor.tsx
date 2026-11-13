"use client";

// 직접 쓴 글 편집기: 붙여넣어 인식한 블록을 고치고(삭제·위아래 이동·끼워 넣기), 상품(이름·쿠팡 파트너스 링크)을 넣고,
// 오른쪽(휴대폰은 아래) 실제 글 화면 미리보기에서 사진 자리를 눌러 사진을 올린다. 저장·발행·내리기·삭제도 여기서.
//  - post 가 없으면 아직 저장 안 한 새 글 → "초안 저장" 만 (사진은 저장 뒤에 올릴 수 있음: 사진 폴더가 글 id 라서)
//  - 사진을 올리면 글 전체를 바로 저장한다. 저장이 실패하면 그 사진 자리에 "저장 안 됨"을 띄운다
//  - 발행: 구매 버튼 자리의 링크가 비었거나 파트너스 링크가 아니면 막고 이유를 보여 준다 (src/lib/shop-manual.ts publishProblems)
//  - 원문은 저장하지 않는다. 인식이 잘못된 글은 "원문 다시 붙여넣기"로 본문 블록만 새로 만든다 (상품·링크·올린 사진은 유지)

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImageIcon, Loader2, Plus, Trash2, X } from "lucide-react";
import { ShopManualArticle } from "@/components/ShopManualArticle";
import { isPartnersLink, isPlainCoupangUrl, parsePartnersInput } from "@/lib/coupang-link";
import { uploadBlockImage } from "@/lib/shop-images";
import { looksLikeFlatTable, reparseInto, tableFromText } from "@/lib/shop-paste";
import {
  addTableColumn,
  addTableRow,
  autoDescription,
  countBlocks,
  insertBlock,
  makeBlock,
  moveBlock,
  publishNotes,
  publishProblems,
  removeBlock,
  removeProduct,
  removeTableColumn,
  removeTableRow,
  setBlockImage,
  setTableCell,
  updateBlock,
  type ManualPostInput,
} from "@/lib/shop-manual";
import type { ManualShopPost, ShopManualBlock, ShopManualBlockType, ShopPostInputProduct, ShopPostStatus } from "@/lib/shop-post-types";
import {
  createManualPost,
  deletePost,
  notifySearchEngines,
  refreshShopPages,
  setPostStatus,
  updateManualPost,
} from "@/lib/shop-posts";

export type ManualDraft = {
  title: string;
  category: string;
  description: string; // "" = 본문 앞부분으로 자동
  blocks: ShopManualBlock[];
  products: ShopPostInputProduct[];
  disclosure: string;
};

export type SavedPostRef = { id: string; slug: string; status: ShopPostStatus; published_at: string | null; created_at: string };

// 저장된 글 → 편집기 값
export function draftFromPost(p: ManualShopPost): ManualDraft {
  return {
    title: p.title,
    category: p.content.category ?? "",
    description: p.content.descriptionAuto ? "" : p.description,
    blocks: p.content.blocks,
    products: p.products.length ? p.products : [{ name: "", link: "" }],
    disclosure: p.content.disclosure ?? "",
  };
}

function toInput(d: ManualDraft): ManualPostInput {
  const auto = !d.description.trim();
  return {
    title: d.title.trim(),
    description: auto ? autoDescription(d.blocks) : d.description.trim(),
    content: {
      kind: "manual",
      blocks: d.blocks,
      ...(d.category.trim() ? { category: d.category.trim() } : {}),
      ...(d.disclosure.trim() ? { disclosure: d.disclosure.trim() } : {}),
      ...(auto ? { descriptionAuto: true } : {}),
    },
    products: d.products,
  };
}

// 발행 검사용 (제목·블록·상품만)
const checkOf = (i: ManualPostInput) => ({ title: i.title, blocks: i.content.blocks, products: i.products });

const BLOCK_LABEL: Record<ShopManualBlockType, string> = {
  paragraph: "문단",
  heading: "소제목",
  list: "목록",
  image: "사진",
  link: "구매 버튼",
  table: "표",
};
const INSERTABLE: ShopManualBlockType[] = ["image", "link", "paragraph", "heading", "list", "table"];

const INPUT = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm";
const BTN = "rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-semibold disabled:opacity-50";
const BTN_PRIMARY = "rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60";

type PhotoState = { busy?: boolean; error?: string; saved?: boolean };

export function ShopManualEditor({
  initial,
  post: initialPost,
  onCreated,
  onChanged,
  onDeleted,
}: {
  initial: ManualDraft;
  post: SavedPostRef | null; // null = 아직 저장 안 한 새 글
  onCreated?: (post: SavedPostRef) => void;
  onChanged?: () => void; // 저장·발행·내리기 뒤 목록 새로고침
  onDeleted?: () => void;
}) {
  const [draft, setDraftState] = useState<ManualDraft>(initial);
  const latest = useRef<ManualDraft>(initial); // 사진 업로드 직후 저장에 최신 값을 쓰기 위해
  const [post, setPost] = useState<SavedPostRef | null>(initialPost);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "error" | "info" } | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());

  const published = post?.status === "published";

  function setDraft(fn: (d: ManualDraft) => ManualDraft) {
    setDraftState((prev) => {
      const next = fn(prev);
      latest.current = next;
      return next;
    });
    setDirty(true);
    setProblems([]);
  }
  const setBlocks = (fn: (b: ShopManualBlock[]) => ShopManualBlock[]) => setDraft((d) => ({ ...d, blocks: fn(d.blocks) }));

  // 저장은 한 번에 하나씩 (사진 여러 장을 연달아 올려도 순서대로)
  function persist(d: ManualDraft): Promise<void> {
    const run = saveChain.current.then(async () => {
      if (!post) throw new Error("먼저 초안 저장을 눌러 주세요");
      // 공개 글은 링크가 비면 저장하지 않는다 (공개 화면에서 구매 버튼이 사라짐)
      if (published) {
        const p = publishProblems(checkOf(toInput(d)));
        if (p.length) {
          setProblems(p);
          throw new Error("공개 글이라 아래 문제를 고친 뒤 저장돼요");
        }
      }
      await updateManualPost(post.id, toInput(d));
      if (published) await refreshShopPages(post.slug);
    });
    saveChain.current = run.catch(() => undefined);
    return run;
  }

  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "실패", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    action(async () => {
      if (!post) {
        const created = await createManualPost(toInput(latest.current));
        const ref: SavedPostRef = { ...created, status: "draft", published_at: null, created_at: new Date().toISOString() };
        setPost(ref);
        setDirty(false);
        setMsg({ text: "초안 저장됨 — 이제 사진 자리를 눌러 사진을 올릴 수 있어요", tone: "ok" });
        onCreated?.(ref);
        return;
      }
      await persist(latest.current);
      setDirty(false);
      setMsg({ text: published ? "수정 저장됨 — 공개 글에 반영했어요" : "저장됨", tone: "ok" });
      onChanged?.();
    });

  const publish = () =>
    action(async () => {
      if (!post) return;
      const input = toInput(latest.current);
      const p = publishProblems(checkOf(input));
      if (p.length) {
        setProblems(p);
        throw new Error("발행 안 됨 — 아래 문제를 먼저 고쳐 주세요");
      }
      const notes = publishNotes(checkOf(input));
      if (notes.length && !confirm(`${notes.join("\n")}\n\n그래도 발행할까요?`)) return;
      await persist(latest.current);
      await setPostStatus(post, "published");
      const now = post.published_at ?? new Date().toISOString();
      setPost({ ...post, status: "published", published_at: now });
      setDirty(false);
      // 목록·글 화면을 바로 갱신 (안 하면 1분 뒤에 보임) + 검색엔진에 새 글 알림
      await refreshShopPages(post.slug);
      void notifySearchEngines(post.slug);
      setMsg({ text: "발행됨", tone: "ok" });
      onChanged?.();
    });

  const unpublish = () =>
    action(async () => {
      if (!post || !confirm("이 글을 내려서 초안으로 돌릴까요? (공개 화면에서 바로 사라져요)")) return;
      await setPostStatus(post, "draft");
      setPost({ ...post, status: "draft" });
      await refreshShopPages(post.slug);
      setMsg({ text: "내렸어요 — 초안으로 돌아갔어요", tone: "ok" });
      onChanged?.();
    });

  const remove = () =>
    action(async () => {
      if (!post || !confirm("이 초안을 삭제할까요? 되돌릴 수 없습니다.")) return;
      await deletePost(post.id);
      onDeleted?.();
    });

  async function uploadPhoto(blockId: string, file: File) {
    if (!post) return;
    setPhotos((s) => ({ ...s, [blockId]: { busy: true } }));
    let url: string;
    try {
      url = await uploadBlockImage(post.id, blockId, file);
    } catch (e) {
      setPhotos((s) => ({ ...s, [blockId]: { error: `저장 안 됨 — ${e instanceof Error ? e.message : "업로드 실패"}` } }));
      return;
    }
    setDraft((d) => ({ ...d, blocks: setBlockImage(d.blocks, blockId, url) }));
    try {
      await persist({ ...latest.current, blocks: setBlockImage(latest.current.blocks, blockId, url) });
      setDirty(false);
      setPhotos((s) => ({ ...s, [blockId]: { saved: true } }));
      onChanged?.();
    } catch (e) {
      // 사진 파일은 올라갔지만 글에 연결이 안 된 상태 — 분명히 알린다
      setPhotos((s) => ({
        ...s,
        [blockId]: { error: `저장 안 됨 — ${e instanceof Error ? e.message : "글 저장 실패"}. 저장 버튼을 다시 눌러 주세요` },
      }));
    }
  }

  const counts = countBlocks(draft.blocks);
  const input = toInput(draft);
  const pending = publishProblems(checkOf(input));
  const linkUses = (i: number) => draft.blocks.filter((b) => b.type === "link" && b.product === i).length;

  const slot = (b: Extract<ShopManualBlock, { type: "image" }>, compact = false) => (
    <ImageSlot
      key={b.id}
      block={b}
      canUpload={!!post}
      state={photos[b.id]}
      compact={compact}
      onFile={(f) => uploadPhoto(b.id, f)}
    />
  );

  const previewPost: ManualShopPost = {
    id: post?.id ?? "new",
    slug: post?.slug ?? "new",
    title: draft.title || "제목을 입력하세요",
    description: input.description,
    content: input.content,
    products: draft.products,
    sources: [],
    stats: { naverReviews: 0, youtubeVideos: 0, youtubeComments: 0, webSources: 0 },
    status: post?.status ?? "draft",
    created_at: post?.created_at ?? new Date().toISOString(),
    published_at: post?.published_at ?? null,
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
        {/* 글 정보 */}
        <section className="space-y-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
          <label className="block text-sm">
            <span className="font-medium">글 제목</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="검색 키워드로 시작하는 제목"
              className={`mt-1 ${INPUT}`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">카테고리</span>
              <span className="ml-1 text-xs text-neutral-500">관련 글 묶음용</span>
              <input
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                placeholder="예: 무선청소기"
                className={`mt-1 ${INPUT}`}
              />
            </label>
            <div className="text-xs text-neutral-500 sm:pt-6">
              사진 {counts.images} · 구매 버튼 {counts.links} · 소제목 {counts.headings} · 문단 {counts.paragraphs}
              {counts.lists ? ` · 목록 ${counts.lists}` : ""}
              {counts.tables ? ` · 표 ${counts.tables}` : ""}
            </div>
          </div>
          <label className="block text-sm">
            <span className="font-medium">검색 설명</span>
            <span className="ml-1 text-xs text-neutral-500">비우면 본문 앞부분으로 자동</span>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              rows={2}
              placeholder={autoDescription(draft.blocks) || "검색 결과에 보일 설명 (80~150자)"}
              className={`mt-1 ${INPUT}`}
            />
          </label>
        </section>

        {/* 상품 */}
        <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">상품 · 쿠팡 파트너스 링크</h3>
            <button
              type="button"
              className={BTN}
              onClick={() => setDraft((d) => ({ ...d, products: [...d.products, { name: "", link: "" }] }))}
            >
              + 상품 추가
            </button>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            구매 버튼은 모두 이 상품으로 연결돼요. 상품이 둘 이상이면 구매 버튼마다 고를 수 있어요. 링크 또는 파트너스
            &quot;이미지+텍스트&quot; HTML 을 붙여넣으세요.
          </p>
          <div className="mt-3 space-y-3">
            {draft.products.map((p, i) => (
              <ProductRow
                key={i}
                index={i}
                product={p}
                uses={linkUses(i)}
                removable={draft.products.length > 1}
                onChange={(next) => setDraft((d) => ({ ...d, products: d.products.map((x, j) => (j === i ? next : x)) }))}
                onRemove={() =>
                  setDraft((d) => {
                    const r = removeProduct(d.products, d.blocks, i);
                    return { ...d, products: r.products, blocks: r.blocks };
                  })
                }
              />
            ))}
          </div>
        </section>

        {/* 블록 */}
        <section>
          <h3 className="text-sm font-bold">본문 블록</h3>
          <p className="mt-1 text-xs text-neutral-500">
            블록마다 삭제·위아래 이동, 블록 사이 <b>+</b> 로 사진·구매 버튼·표 끼워 넣기. 사진은 자리마다 따로 올려요.
          </p>
          <Repaste
            onApply={(text) => {
              const r = reparseInto(latest.current, text);
              const c = countBlocks(r.draft.blocks);
              const lost = r.lostPhotos ? `\n올린 사진 ${r.lostPhotos}장은 옮길 자리가 없어 빠져요.` : "";
              const ask = `본문 블록을 새로 인식한 내용으로 바꿀까요? (소제목 ${c.headings} · 사진 자리 ${c.images} · 구매 버튼 ${c.links} · 표 ${c.tables})`;
              if (!confirm(`${ask}\n상품·링크와 올린 사진은 그대로 둬요.${lost}`)) return false;
              setDraft(() => r.draft);
              const warn = r.warnings.length ? ` · ⚠ ${r.warnings.join(" · ")}` : "";
              setMsg({ text: `본문을 다시 인식했어요 — 저장을 눌러야 반영돼요${warn}`, tone: "info" });
              return true;
            }}
          />
          <div className="mt-3">
            <InsertBar onInsert={(t) => setBlocks((bs) => insertBlock(bs, 0, makeBlock(t)))} />
            {draft.blocks.map((b, i) => (
              <div key={b.id}>
                <BlockCard
                  block={b}
                  index={i}
                  total={draft.blocks.length}
                  products={draft.products}
                  imageSlot={b.type === "image" ? slot(b, true) : null}
                  onChange={(patch) => setBlocks((bs) => updateBlock(bs, b.id, patch))}
                  onReplace={(next) => setBlocks((bs) => bs.map((x) => (x.id === b.id ? next : x)))}
                  onMove={(dir) => setBlocks((bs) => moveBlock(bs, b.id, dir))}
                  onRemove={() => setBlocks((bs) => removeBlock(bs, b.id))}
                />
                <InsertBar onInsert={(t) => setBlocks((bs) => insertBlock(bs, i + 1, makeBlock(t)))} />
              </div>
            ))}
          </div>
        </section>

        {/* 저장·발행 */}
        <div className="sticky bottom-0 z-10 -mx-1 rounded-t-2xl border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          {problems.length > 0 && (
            <ul className="mb-2 space-y-0.5 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {problems.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                published
                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {post ? (published ? "공개" : "초안") : "저장 전"}
            </span>
            <button type="button" onClick={save} disabled={busy} className={post && !published ? BTN : BTN_PRIMARY}>
              {busy ? "저장 중…" : !post ? "초안 저장" : published ? "수정 저장" : "저장"}
            </button>
            {post && !published && (
              <button
                type="button"
                onClick={publish}
                disabled={busy}
                title={pending.length ? pending.join("\n") : undefined}
                className={BTN_PRIMARY}
              >
                발행
              </button>
            )}
            {post && (
              <a href={`/shop/${post.slug}`} target="_blank" rel="noopener noreferrer" className={BTN}>
                {published ? "보기 ↗" : "미리보기 ↗"}
              </a>
            )}
            {published && (
              <button type="button" onClick={unpublish} disabled={busy} className={BTN}>
                내리기
              </button>
            )}
            {post && !published && (
              <button type="button" onClick={remove} disabled={busy} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                삭제
              </button>
            )}
          </div>
          <div className="mt-1.5 text-xs">
            {msg ? (
              <span className={msg.tone === "error" ? "text-red-600" : msg.tone === "ok" ? "text-green-700 dark:text-green-400" : "text-neutral-500"}>
                {msg.text}
              </span>
            ) : (
              <span className="text-neutral-500">
                {dirty ? "저장 안 한 변경이 있어요 · " : ""}
                {pending.length ? `발행 전 고칠 것 ${pending.length}개 (${pending[0]})` : "발행할 준비가 됐어요"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 미리보기: 실제 글 화면 */}
      <aside className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
        <div className="mb-2 text-xs font-semibold text-neutral-500">미리보기 — 실제 글 화면 (사진 자리를 눌러 사진 등록)</div>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <ShopManualArticle post={previewPost} preview imageSlot={(b) => slot(b)} />
        </div>
      </aside>
    </div>
  );
}

function ProductRow({
  index,
  product: p,
  uses,
  removable,
  onChange,
  onRemove,
}: {
  index: number;
  product: ShopPostInputProduct;
  uses: number;
  removable: boolean;
  onChange: (p: ShopPostInputProduct) => void;
  onRemove: () => void;
}) {
  const link = p.link.trim();
  const problem = !link
    ? "링크가 비었어요 — 발행하려면 필요해요"
    : isPlainCoupangUrl(link)
      ? "일반 쿠팡 주소예요 — 수수료가 안 잡히니 파트너스 링크(link.coupang.com/a/…)로 바꾸세요"
      : !isPartnersLink(link)
        ? "쿠팡 파트너스 링크(link.coupang.com/a/…) 형식이 아니에요"
        : "";
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold">
          상품 {index + 1} <span className="font-normal text-neutral-500">· 구매 버튼 {uses}곳</span>
        </span>
        {removable && (
          <button type="button" onClick={onRemove} className="text-neutral-500 underline">
            상품 빼기
          </button>
        )}
      </div>
      <input
        value={p.name}
        onChange={(e) => onChange({ ...p, name: e.target.value })}
        placeholder="상품 이름 (예: 샘플 A100)"
        className={`mt-2 ${INPUT}`}
      />
      <input
        value={p.link}
        inputMode="url"
        onChange={(e) => {
          const v = e.target.value;
          // HTML 을 붙여넣었으면 링크·사진 주소로 나눠 넣는다
          if (v.includes("<")) {
            const parsed = parsePartnersInput(v);
            onChange({ ...p, link: parsed.link, ...(parsed.image ? { image: parsed.image } : {}) });
          } else onChange({ ...p, link: v });
        }}
        placeholder="https://link.coupang.com/a/..."
        className={`mt-2 ${INPUT} font-mono text-xs`}
      />
      {problem ? (
        <p className="mt-1 text-xs text-red-600">{problem}</p>
      ) : (
        <a href={link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-brand hover:underline">
          링크 열어서 확인 ↗
        </a>
      )}
    </div>
  );
}

function InsertBar({ onInsert }: { onInsert: (t: ShopManualBlockType) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="group flex items-center gap-2 py-1">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="여기에 블록 끼워 넣기"
          className="flex h-6 items-center gap-0.5 rounded-full border border-neutral-300 px-2 text-[11px] text-neutral-500 hover:border-brand hover:text-brand dark:border-neutral-700"
        >
          <Plus className="h-3 w-3" /> 끼워 넣기
        </button>
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 py-1.5">
      {INSERTABLE.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => {
            onInsert(t);
            setOpen(false);
          }}
          className="rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-neutral-900"
        >
          + {BLOCK_LABEL[t]}
        </button>
      ))}
      <button type="button" onClick={() => setOpen(false)} className="px-2 text-[11px] text-neutral-500 underline">
        닫기
      </button>
    </div>
  );
}

function BlockCard({
  block: b,
  index,
  total,
  products,
  imageSlot,
  onChange,
  onReplace,
  onMove,
  onRemove,
}: {
  block: ShopManualBlock;
  index: number;
  total: number;
  products: ShopPostInputProduct[];
  imageSlot: React.ReactNode;
  onChange: (patch: Partial<ShopManualBlock>) => void;
  onReplace: (block: ShopManualBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const tone =
    b.type === "image"
      ? "border-sky-300 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/20"
      : b.type === "link"
        ? "border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20"
        : "border-neutral-200 dark:border-neutral-800";
  const iconBtn = "rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800";
  return (
    <div className={`rounded-xl border p-2.5 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-neutral-500">
          {index + 1}. {BLOCK_LABEL[b.type]}
          {b.type === "heading" ? ` (h${b.level})` : ""}
        </span>
        <span className="flex items-center">
          <button type="button" className={iconBtn} disabled={index === 0} onClick={() => onMove(-1)} aria-label="위로">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={iconBtn} disabled={index === total - 1} onClick={() => onMove(1)} aria-label="아래로">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={`${iconBtn} hover:text-red-600`} onClick={onRemove} aria-label="블록 삭제">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <div className="mt-1.5">
        {b.type === "paragraph" && (
          <>
            <textarea
              value={b.text}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={Math.min(10, Math.max(2, Math.ceil(b.text.length / 32)))}
              className={`${INPUT} leading-relaxed`}
            />
            {/* 표처럼 보이는 문단(탭·|·여러 줄·한 줄로 붙은 표)에만 보여 준다 */}
            {(/[\t|\n]/.test(b.text.trim()) || looksLikeFlatTable(b.text)) && (
              <button
                type="button"
                className="mt-1 text-[11px] text-neutral-500 underline"
                onClick={() => {
                  const t = tableFromText(b.text);
                  if (!t) {
                    alert("표로 바꿀 수 없어요 — 한 줄에 한 행씩, 칸은 | 로 나눠 쓴 뒤 다시 눌러 주세요.\n예)\n모드 | 최대 가습량\n일반모드 | 시간당 360mL");
                    return;
                  }
                  onReplace({ id: b.id, type: "table", head: t.head, rows: t.rows });
                }}
              >
                표로 바꾸기
              </button>
            )}
          </>
        )}
        {b.type === "table" && <TableEditor block={b} onChange={(patch) => onChange(patch)} />}
        {b.type === "heading" && (
          <div className="flex gap-2">
            <select
              value={b.level}
              onChange={(e) => onChange({ level: Number(e.target.value) === 3 ? 3 : 2 })}
              className="rounded-lg border border-neutral-300 bg-transparent px-2 text-sm dark:border-neutral-700"
            >
              <option value={2}>큰 소제목</option>
              <option value={3}>작은 소제목</option>
            </select>
            <input value={b.text} onChange={(e) => onChange({ text: e.target.value })} className={`${INPUT} font-semibold`} />
          </div>
        )}
        {b.type === "list" && (
          <>
            <select
              value={b.ordered ? "o" : "u"}
              onChange={(e) => onChange({ ordered: e.target.value === "o" })}
              className="mb-1.5 rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-neutral-700"
            >
              <option value="u">점 목록</option>
              <option value="o">번호 목록</option>
            </select>
            <textarea
              value={b.items.join("\n")}
              onChange={(e) => onChange({ items: e.target.value.split("\n") })}
              rows={Math.max(2, b.items.length)}
              placeholder="한 줄에 하나"
              className={INPUT}
            />
          </>
        )}
        {b.type === "image" && (
          <div className="flex gap-3">
            <div className="w-28 shrink-0">{imageSlot}</div>
            <label className="block min-w-0 flex-1 text-xs">
              <span className="text-neutral-500">사진 설명 (대체 텍스트)</span>
              <input
                value={b.alt}
                onChange={(e) => onChange({ alt: e.target.value })}
                placeholder="예: 거치대에 꽂은 모습"
                className={`mt-1 ${INPUT}`}
              />
            </label>
          </div>
        )}
        {b.type === "link" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-600 dark:text-neutral-300">쿠팡에서 가격 보기 →</span>
            {products.length > 1 ? (
              <select
                value={b.product}
                onChange={(e) => onChange({ product: Number(e.target.value) })}
                className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
              >
                {products.map((p, i) => (
                  <option key={i} value={i}>
                    {p.name || `상품 ${i + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold">{products[0]?.name || "상품 1"}</span>
            )}
            {!products[b.product]?.link.trim() && <span className="text-xs font-semibold text-red-600">링크 비었음</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// 사진 자리: 누르면 사진 선택 → 업로드 → 이 자리에만 저장. compact = 블록 목록의 작은 칸
function ImageSlot({
  block,
  canUpload,
  state,
  compact,
  onFile,
}: {
  block: Extract<ShopManualBlock, { type: "image" }>;
  canUpload: boolean;
  state?: PhotoState;
  compact: boolean;
  onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      role={canUpload ? "button" : undefined}
      aria-label={canUpload ? `사진 ${block.src ? "변경" : "등록"}` : "사진 자리"}
      onClick={() => canUpload && !state?.busy && ref.current?.click()}
      className={`relative flex items-center justify-center overflow-hidden ${compact ? "aspect-square rounded-lg" : "aspect-[4/3] rounded-2xl"} ${
        canUpload ? "cursor-pointer" : ""
      } ${block.src ? "bg-neutral-100 dark:bg-neutral-900" : "border-2 border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"}`}
    >
      {block.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.src} alt={block.alt} className="h-full w-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 px-2 text-center text-neutral-400">
          <ImageIcon className={compact ? "h-4 w-4" : "h-6 w-6"} strokeWidth={1.5} />
          <span className={compact ? "text-[10px] leading-tight" : "text-[13px] font-medium"}>
            {canUpload ? "눌러서 사진 등록" : "초안 저장 후 사진 등록"}
            {!compact && block.alt ? ` · ${block.alt}` : ""}
          </span>
        </span>
      )}
      {state?.busy && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/60">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-600" />
        </span>
      )}
      {state?.error && (
        <span className="absolute inset-x-1 bottom-1 rounded bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-white">
          {state.error}
        </span>
      )}
      {state?.saved && !compact && (
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">저장됨</span>
      )}
      {canUpload && (
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      )}
    </div>
  );
}

// 표 편집: 칸 글자 고치기, 행·열 추가/삭제. 휴대폰에서는 표만 가로로 밀어서 본다
function TableEditor({
  block: t,
  onChange,
}: {
  block: Extract<ShopManualBlock, { type: "table" }>;
  onChange: (patch: { head: string[]; rows: string[][] }) => void;
}) {
  const cell = "w-32 rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700";
  const small = "rounded p-1 text-neutral-400 hover:text-red-600 disabled:opacity-30";
  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <table className="border-separate border-spacing-1">
          <tbody>
            <tr>
              {t.head.map((_, j) => (
                <td key={j} className="text-center">
                  <button
                    type="button"
                    className={small}
                    disabled={t.head.length <= 1}
                    onClick={() => onChange(removeTableColumn(t, j))}
                    aria-label={`${j + 1}번째 열 삭제`}
                    title="이 열 삭제"
                  >
                    <X className="mx-auto h-3 w-3" />
                  </button>
                </td>
              ))}
              <td />
            </tr>
            <tr>
              {t.head.map((c, j) => (
                <td key={j}>
                  <input value={c} placeholder="머리 칸" onChange={(e) => onChange(setTableCell(t, -1, j, e.target.value))} className={`${cell} font-semibold`} />
                </td>
              ))}
              <td className="text-[10px] text-neutral-400">머리행</td>
            </tr>
            {t.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>
                    <input value={c} onChange={(e) => onChange(setTableCell(t, i, j, e.target.value))} className={cell} />
                  </td>
                ))}
                <td>
                  <button type="button" className={small} onClick={() => onChange(removeTableRow(t, i))} aria-label={`${i + 1}번째 행 삭제`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-1 flex gap-1.5">
        <button type="button" className={BTN} onClick={() => onChange(addTableRow(t))}>
          + 행
        </button>
        <button type="button" className={BTN} onClick={() => onChange(addTableColumn(t))}>
          + 열
        </button>
      </div>
    </div>
  );
}

// 원문 다시 붙여넣기: 인식이 잘못 저장된 글을 원문으로 다시 인식해 본문 블록만 바꾼다 (원문은 저장하지 않으므로 다시 붙여넣어야 함)
function Repaste({ onApply }: { onApply: (text: string) => boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-xs text-neutral-500 underline">
        원문 다시 붙여넣어 본문 새로 인식하기
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="text-xs text-neutral-500">
        원문은 저장해 두지 않아요. 원문을 다시 붙여넣으면 본문 블록만 새로 만들고, 상품·링크·올린 사진은 그대로 둬요.
      </p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className={`mt-2 ${INPUT}`} placeholder="원문 전체를 붙여넣으세요" />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={!text.trim()}
          className={BTN_PRIMARY}
          onClick={() => {
            if (onApply(text)) {
              setText("");
              setOpen(false);
            }
          }}
        >
          다시 인식하기
        </button>
        <button type="button" className={BTN} onClick={() => setOpen(false)}>
          닫기
        </button>
      </div>
    </div>
  );
}
