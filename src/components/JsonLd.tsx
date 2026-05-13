// JSON-LD 구조화 데이터 헬퍼.
// schema.org 의 ItemList / BreadcrumbList / FAQPage 를 <script> 태그로 렌더링.
// Google 리치 결과·Naver 검색 결과의 시그널이 됨.

type Json = unknown;

function safe(data: Json): string {
  // </script> 같은 종료 태그가 문자열에 들어가도 깨지지 않게 이스케이프
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: Json }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safe(data) }}
    />
  );
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function itemListLd(opts: {
  name: string;
  description?: string;
  url: string;
  items: { name: string; url: string; description?: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    numberOfItems: opts.items.length,
    itemListElement: opts.items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: it.url,
      name: it.name,
      ...(it.description ? { description: it.description } : {}),
    })),
  };
}

export function faqLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.a,
      },
    })),
  };
}

export function collectionPageLd(opts: {
  name: string;
  description: string;
  url: string;
  dateModified: string; // YYYY-MM-DD
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    dateModified: opts.dateModified,
    inLanguage: "ko-KR",
  };
}
