"use client";

// 초안 미리보기에서 사진 자리를 눌러 상품 사진을 등록·변경 (관리자만).
// 사진 자리(위 카드·표·장단점·아래 카드)마다 따로 등록한다. 따로 넣지 않은 자리는 대표 사진(위 카드)을 보여준다.
// 관리자가 아니면 사진 자리 표시만 보인다.

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { isAdmin } from "@/lib/community";
import { uploadProductImage } from "@/lib/shop-images";
import { ownPhoto, photoFor, withPhoto, type PhotoSpot, type ShopPostInputProduct } from "@/lib/shop-post-types";

type Ctx = {
  postId: string;
  products: ShopPostInputProduct[];
  setPhoto: (index: number, spot: PhotoSpot, url: string) => void;
  admin: boolean;
};

const PhotoEditContext = createContext<Ctx | null>(null);

export function PhotoEditProvider({
  postId,
  initialProducts,
  children,
}: {
  postId: string;
  initialProducts: ShopPostInputProduct[];
  children: React.ReactNode;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    isAdmin().then(setAdmin).catch(() => setAdmin(false));
  }, []);

  const setPhoto = (index: number, spot: PhotoSpot, url: string) =>
    setProducts((prev) => prev.map((p, i) => (i === index ? withPhoto(p, spot, url) : p)));

  return <PhotoEditContext.Provider value={{ postId, products, setPhoto, admin }}>{children}</PhotoEditContext.Provider>;
}

// 사진 자리 하나. 관리자면 누르면 사진 선택 → 업로드 → 이 자리에만 반영
export function PhotoSlot({
  index,
  spot,
  name,
  className = "",
}: {
  index: number;
  spot: PhotoSpot;
  name: string;
  className?: string;
}) {
  const ctx = useContext(PhotoEditContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const product = ctx?.products[index];
  const image = product ? photoFor(product, spot) : undefined;
  // 이 자리에 따로 넣은 사진이 없어 대표 사진을 빌려 보여주는 중
  const borrowed = !!image && !!product && !ownPhoto(product, spot);
  const canEdit = !!ctx?.admin;

  async function onFile(file: File | undefined) {
    if (!file || !ctx) return;
    setBusy(true);
    setError("");
    try {
      ctx.setPhoto(index, spot, await uploadProductImage(ctx.postId, index, spot, file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // 사진 자리가 구매 링크 안에 있어도 링크로 이동하지 않고 사진 선택을 연다
  function open(e: React.MouseEvent) {
    if (!canEdit || busy) return;
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.click();
  }

  return (
    <span
      onClick={open}
      role={canEdit ? "button" : undefined}
      aria-label={canEdit ? `${name} 사진 ${image ? "변경" : "등록"}` : `${name} 상품 사진 자리`}
      className={`relative flex items-center justify-center ${canEdit ? "cursor-pointer" : ""} ${
        image ? "" : "rounded-[inherit] border-2 border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
      } ${className}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} className="h-full w-full object-contain" />
      ) : (
        <span className="flex flex-col items-center gap-1 text-neutral-400">
          <ImageIcon className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-[11px] font-medium">{canEdit ? "눌러서 사진 등록" : "상품 사진"}</span>
        </span>
      )}

      {canEdit && image && !busy && (
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
          {borrowed ? "대표 사진 · 눌러서 따로 등록" : "사진 변경"}
        </span>
      )}
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/60">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-600" />
        </span>
      )}
      {error && (
        <span className="absolute inset-x-1 bottom-1 rounded bg-red-600 px-1.5 py-0.5 text-center text-[10px] text-white">
          {error}
        </span>
      )}
      {canEdit && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          // 사진 선택 창을 연 클릭이 위(사진 자리·링크)로 다시 전달되지 않게
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      )}
    </span>
  );
}
