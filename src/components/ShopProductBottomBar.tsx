// 쇼핑 글 화면 하단 고정 바: 그 글의 상품(사진·이름·쿠팡 버튼). 쿠팡 링크가 없는 글이면 공용 쿠팡 배너.
// 어떤 상품을 띄울지는 src/lib/shop-manual.ts bottomBarProduct, 틀·고지 문구는 CoupangBottomBanner 의 BottomBarShell.
// 광고 차단 필터에 안 걸리게 클래스·ID 에 ad·banner 같은 단어를 쓰지 않는다 (CoupangBottomBanner 와 같은 규칙).

import { BottomBarShell, GenericBottomBar } from "@/components/CoupangBottomBanner";
import { COUPANG_BOTTOM_BANNER, SHOP_PRODUCT_BAR_CTA } from "@/lib/ads-config";
import type { ShopBottomProduct } from "@/lib/shop-manual";

const { width: BAR_W, height: BAR_H } = COUPANG_BOTTOM_BANNER;

export function ShopProductBottomBar({ product }: { product: ShopBottomProduct | null }) {
  if (!product) return <GenericBottomBar />;
  return (
    <BottomBarShell>
      <a
        href={product.href}
        target="_blank"
        rel="sponsored nofollow noopener"
        className="flex max-w-full items-center gap-3 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2"
        style={{ width: BAR_W, height: BAR_H }}
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- 이미지 최적화를 끈 사이트 (next.config images.unoptimized)
          <img
            src={product.image}
            alt={`${product.name} 사진`}
            width={80}
            height={80}
            loading="lazy"
            className="h-20 w-20 shrink-0 rounded-md object-cover bg-neutral-100"
          />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-3xl" aria-hidden="true">
            🛒
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <span className="line-clamp-2 text-sm font-bold leading-snug text-neutral-900 dark:text-white">{product.name}</span>
          <span className="self-start rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white">
            {SHOP_PRODUCT_BAR_CTA} ›
          </span>
        </span>
      </a>
    </BottomBarShell>
  );
}
