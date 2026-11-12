"use client";

// 쿠팡 API 승인 전까지 쓰는 "직접 입력 상품" 칸.
// 상품명은 후기 검색용, 링크는 글에 들어갈 쿠팡 파트너스 구매 링크.
// 값은 상위 폼(form.manual_products)에 들어가고 "설정 저장"으로 함께 저장된다.

import { isPartnersLink, type ManualProduct } from "@/lib/shop-config";

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm";

export function ShopManualProducts({
  value,
  onChange,
}: {
  value: ManualProduct[];
  onChange: (next: ManualProduct[]) => void;
}) {
  function update(index: number, patch: Partial<ManualProduct>) {
    onChange(value.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
      <h2 className="font-bold">직접 입력 상품 (쿠팡 API 대신)</h2>
      <p className="mt-1 text-xs text-neutral-500">
        두 상품을 비교하는 글을 씁니다. 상품명으로 네이버·유튜브·구글 후기를 찾고, 링크는 글의
        구매 버튼에 들어갑니다. 입력 후 아래 <b>설정 저장</b>을 누르세요.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {value.map((p, i) => {
          const linkInvalid = p.link.trim() !== "" && !isPartnersLink(p.link);
          return (
            <div
              key={i}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3"
            >
              <div className="text-sm font-semibold">상품 {i + 1}</div>
              <label className="mt-2 block text-sm">
                <span className="font-medium">상품명</span>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="예: 로보락 Q8 Max"
                  className={INPUT_CLASS}
                />
              </label>
              <label className="mt-2 block text-sm">
                <span className="font-medium">쿠팡 파트너스 링크</span>
                <input
                  type="url"
                  inputMode="url"
                  value={p.link}
                  onChange={(e) => update(i, { link: e.target.value })}
                  placeholder="https://link.coupang.com/a/..."
                  className={`${INPUT_CLASS} font-mono text-xs`}
                />
              </label>
              {linkInvalid && (
                <p className="mt-1 text-xs text-red-600">
                  쿠팡 파트너스 링크가 아닙니다 (link.coupang.com/a/… 형식). 일반 쿠팡 주소는
                  수수료가 안 잡혀요.
                </p>
              )}
              {p.link.trim() !== "" && !linkInvalid && (
                <a
                  href={p.link.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-brand hover:underline"
                >
                  링크 열어서 확인 ↗
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
