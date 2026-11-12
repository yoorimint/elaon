// 글 종류 결정과 중복 판별 키. (외부 호출 없는 순수 함수)

import type { AutoMode, ManualProduct } from "@/lib/shop-config";

export type PostKind = "single" | "compare";

// 상품 식별: 링크가 있으면 링크, 없으면(자동 선정) 정규화한 상품명
export function productKey(p: ManualProduct): string {
  const link = p.link?.trim();
  return link ? link : `name:${p.name.toLowerCase().replace(/\s+/g, "")}`;
}

// 글 중복 판별 키 (DB shop_posts.pair_key): 상품 키 정렬 후 연결
export function pairKeyOf(products: ManualProduct[]): string {
  return products.map(productKey).sort().join("|");
}

// 자동 글 종류 → 이번 글 종류. mixed 는 직전 글과 번갈아
export function nextKind(mode: AutoMode, lastKind: PostKind | null): PostKind {
  if (mode === "single" || mode === "compare") return mode;
  return lastKind === "single" ? "compare" : "single";
}
