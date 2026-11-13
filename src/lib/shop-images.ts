// 쇼핑 글 상품 사진 업로드 (관리자 전용, 초안 미리보기에서 사진 자리를 눌러 등록)
// 저장소: Supabase Storage "shop-images" 버킷 (공개 읽기, 관리자만 업로드 — supabase/shop.sql)
// 휴대폰 사진은 크기가 커서 업로드 전에 긴 변 1000px JPEG 로 줄인다.

import { supabase } from "./supabase";
import { withPhoto, type PhotoSpot, type ShopPostInputProduct } from "./shop-post-types";

const BUCKET = "shop-images";
const MAX_SIDE = 1000;
const JPEG_QUALITY = 0.85;

// 이미지 파일 → 긴 변 MAX_SIDE 이하 JPEG (투명 배경은 흰색으로)
async function resizeToJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("사진을 읽을 수 없어요"));
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("사진 변환 실패");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("사진 변환 실패"))), "image/jpeg", JPEG_QUALITY),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 사진을 올리고 글의 index 번째 상품의 spot 자리 사진으로 저장. 저장된 사진 주소를 돌려준다.
export async function uploadProductImage(postId: string, index: number, spot: PhotoSpot, file: File): Promise<string> {
  const blob = await resizeToJpeg(file);
  const path = `${postId}/${index}-${spot}-${Date.now()}.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (up.error) throw new Error(`업로드 실패: ${up.error.message}`);
  const image = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  // 다른 사진을 덮어쓰지 않도록 최신 상품 목록을 다시 읽고 해당 자리만 바꾼다
  const cur = await supabase.from("shop_posts").select("products").eq("id", postId).single();
  if (cur.error) throw new Error(cur.error.message);
  const products = (cur.data.products as ShopPostInputProduct[]).map((p, i) => (i === index ? withPhoto(p, spot, image) : p));
  // 권한이 없으면 오류 없이 0건만 바뀌므로, 바뀐 글이 실제로 있는지 확인한다
  const res = await supabase
    .from("shop_posts")
    .update({ products, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .select("id");
  if (res.error) throw new Error(`저장 실패: ${res.error.message}`);
  if (!res.data?.length) throw new Error("저장 안 됨 — 관리자 로그인 상태를 확인하세요");
  return image;
}
