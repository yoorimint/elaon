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

// 글 정보: 제목·설명·작성일·수정일·작성 주체 (구글·AI 검색이 "언제, 누가 쓴 글인지" 파악)
export function articleLd(opts: {
  url: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  images?: string[];
  keywords?: string[];
}) {
  const org = { "@type": "Organization", name: "eloan", url: "https://www.eloan.kr" };
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.url },
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    author: org,
    publisher: org,
    inLanguage: "ko-KR",
    ...(opts.images?.length ? { image: opts.images } : {}),
    ...(opts.keywords?.length ? { keywords: opts.keywords.join(", ") } : {}),
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
