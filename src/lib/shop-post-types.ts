// 자동 작성 비교글의 구조. 생성 스크립트(scripts/shop)와 사이트 화면이 같이 쓴다.
// 이 파일은 Supabase 등 런타임 의존성 없이 타입만 둔다.

export type ShopPostStatus = "draft" | "published";

// 글 안의 상품 사진 자리
// main: 맨 위 상품 카드 (대표 사진 — 검색·공유 미리보기에도 씀)
// feature: 단일 글 "주요 특징" 큰 사진, detail: 장단점 큰 사진
// table: 비교표 머리 작은 사진, thumb: 비교글 장단점 이름 옆 작은 사진, bottom: 맨 아래 상품 카드
export type PhotoSpot = "main" | "feature" | "table" | "thumb" | "detail" | "bottom";

// 따로 넣은 사진이 없을 때 대표 사진을 대신 보여줄 자리 (작은 사진·구매 카드).
// 본문 큰 사진(feature·detail)은 같은 사진이 반복돼 보이지 않게 따로 넣은 사진만 보여준다.
const BORROWS_MAIN: Record<PhotoSpot, boolean> = {
  main: false,
  feature: false,
  detail: false,
  table: true,
  thumb: true,
  bottom: true,
};

// 관리자가 입력한 상품 (링크는 항상 이 값만 사용)
// image: 대표 사진(main 자리). images: 다른 자리에 따로 넣은 사진 — 없으면 대표 사진을 보여준다
export type ShopPostInputProduct = {
  name: string;
  link: string;
  image?: string;
  images?: Partial<Record<Exclude<PhotoSpot, "main">, string>>;
};

// 이 자리에 따로 넣은 사진 (없으면 undefined)
export function ownPhoto(p: ShopPostInputProduct, spot: PhotoSpot): string | undefined {
  return spot === "main" ? p.image : p.images?.[spot];
}

// 이 자리에 보여줄 사진: 따로 넣은 사진 → 없으면 (빌려 쓰는 자리만) 대표 사진
export function photoFor(p: ShopPostInputProduct, spot: PhotoSpot): string | undefined {
  return ownPhoto(p, spot) ?? (BORROWS_MAIN[spot] ? p.image : undefined);
}

// 상품 정보에 이 자리 사진을 넣은 새 객체
export function withPhoto(p: ShopPostInputProduct, spot: PhotoSpot, url: string): ShopPostInputProduct {
  return spot === "main" ? { ...p, image: url } : { ...p, images: { ...p.images, [spot]: url } };
}

// AI 가 작성하는 상품별 내용
export type ShopPostProductContent = {
  name: string;
  oneLiner: string; // 한 줄 특징
  pros: string[];
  cons: string[];
  bestFor: string; // 이런 분께 추천
  review?: string; // 후기 경향 요약 문단 (3~4문장)
  notFor?: string; // 이런 분께는 비추천
};

// 1단계 분석에서 나온 장단점 언급 빈도 (화면 막대그래프용, weight 0~1 상대값)
export type ShopPostInsight = {
  strengths: { point: string; weight: number }[];
  weaknesses: { point: string; weight: number }[];
};

// "후기 읽어주는 에디터" 칼럼 구성 (2026-11-13~, 단일 상품 글). 이 필드가 있으면 화면이 칼럼 순서로 그린다.
// 칼럼 글에서 기존 필드의 뜻: intro = 도입(hook), summary = 한 줄 판정 박스, verdict = 에디터 판정 첫머리 문장,
//  comparison = 한눈에 보기 사양 표, products[0].pros/cons = 장단점 요약 칩, faq = 한눈에 보기 FAQ.
//  recommendations·commonComplaints·buyingGuide 는 비워 둔다 (이야기 꼭지·솔직한 단점·에디터 판정이 그 역할을 맡음).
// 이 필드가 없는 글(예전 8칸 양식, 비교글)은 예전 화면 그대로 나온다.
export type ShopPostColumn = {
  question: string; // 글을 끌고 가는 핵심 질문 (예: "로봇청소기 다 비슷한데 S10은 왜 비쌀까?")
  stories: ShopPostStory[]; // 본문 이야기 꼭지 3~4개
  downsides: { title: string; detail: string; tip: string }[]; // 솔직한 단점: 누구에게 문제/누구는 괜찮은지 + 대처 팁
  buyIf: string[]; // 에디터 판정: 이런 분은 사세요
  skipIf: string[]; // 에디터 판정: 이런 분은 다른 걸 보세요
};
export type ShopPostStory = {
  heading: string; // 소제목(h2) — 제품마다 다르게, 검색 키워드를 자연스럽게
  body: string; // 무엇이 → 왜 중요한지(생활 장면) → 주의점/누구에게. 빈 줄로 나눈 짧은 문단
  quote?: string; // 실제 사용자 말 (원자료와 대조 — 지어낸 인용 금지)
  basis?: string; // 이 꼭지를 뒷받침하는 후기 분석의 장점·단점 항목 (화면에 안 나옴 — 여러 후기로 뒷받침되는 주제인지 검사용)
};

export function isColumnPost(c: Pick<ShopPostContent, "column">): c is { column: ShopPostColumn } {
  return !!c.column && Array.isArray(c.column.stories) && c.column.stories.length > 0;
}

export type ShopPostContent = {
  summary: string; // 한 줄 결론 (2~3문장). 칼럼 글은 한 줄 판정 박스 (1~2문장)
  intro: string; // 도입. 칼럼 글은 hook
  column?: ShopPostColumn; // 칼럼 구성 (있으면 칼럼 화면)
  products: ShopPostProductContent[]; // 입력 상품 순서와 같음
  comparison: { label: string; values: string[] }[]; // 항목별 비교, values[i] = 상품 i
  recommendations: { situation: string; pick: number; reason: string }[]; // pick = 상품 index
  commonComplaints: string[]; // 후기에서 반복되는 불만
  verdict: string; // 마무리
  faq: { q: string; a: string }[];
  buyingGuide?: { criterion: string; detail: string }[]; // 고르는 기준
  category?: string; // 자동 선정 시 카테고리 (같은 카테고리 반복 방지용)
  alternatives?: string[]; // 같은 카테고리에서 많이 언급되는 다른 제품 (자동 선정 시)
  qa?: ShopPostQa; // 자동 검수 결과 (관리자 표시용)
  run?: ShopPostRunInfo; // 작성 실행 리포트: 쓴 모델·비용·상품 선정 근거 (관리자 표시용)
  seoKeyword?: string; // 제목 맨 앞에 쓴 검색 키워드 (네이버 데이터랩으로 고름)
  insights?: (ShopPostInsight | null)[]; // 상품 순서와 같음. 스크립트가 분석 결과로 채움
  // 공정위 고지 문구. AI 가 아니라 스크립트가 작성 시점의 설정값을 넣는다.
  disclosure?: string;
};

// 작성 실행 리포트
export type ShopPostRunInfo = {
  costUsd: number; // 이 글을 쓰는 데 든 AI 비용 (무료 Gemini 는 0)
  calls: Record<string, number>; // 모델별 호출 수
  realReviews?: Record<string, number>; // 상품별 실사용 후기 수 (자동 선정 기준)
};

// 자동 검수 결과
export type ShopPostQa = {
  checkedAt: string;
  issuesFound: number; // 처음 발견한 문제 수
  remaining: string[]; // 수정 후에도 남은 문제
  aiChecked?: boolean; // false = AI 검수를 못 함(모델 막힘) → 통과로 보지 않음
  passed?: boolean; // 합격선 통과 (scripts/shop/quality.ts). 합격한 글만 하루 글 수에 세고 자동 발행
  notes?: string[]; // 참고(수정 대상 아님): 5~6곳 반복 등
  revisions?: number; // 자동 수정 횟수
};

export const DEFAULT_POST_DISCLOSURE =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

export type ShopSourceKind =
  | "naver_blog"
  | "naver_cafe"
  | "naver_kin"
  | "naver_web"
  | "naver_news"
  | "youtube"
  | "web_review"; // 웹 리뷰 원문 발췌 (scripts/shop/providers/webreviews.ts)

export const SOURCE_LABEL: Record<ShopSourceKind, string> = {
  naver_blog: "블로그",
  naver_cafe: "카페",
  naver_kin: "지식iN",
  naver_web: "웹문서",
  naver_news: "뉴스",
  youtube: "유튜브",
  web_review: "웹 리뷰",
};

export type ShopPostSource = {
  kind: ShopSourceKind;
  title: string;
  url: string;
  product: number; // 상품 index
};

export type ShopPostStats = {
  naverReviews: number;
  youtubeVideos: number;
  youtubeComments: number;
  webSources: number;
};

// ---------- 직접 쓴 글 (붙여넣어 만든 글, 2026-11-13~) ----------
// 다른 곳에서 쓴 글을 관리자 화면에 붙여넣으면 src/lib/shop-paste.ts 가 블록으로 나눈다.
// 블록 순서 그대로 화면에 그린다 (src/components/ShopManualArticle.tsx).
// 블록 id 는 글 안에서 유일 — 사진은 블록마다 따로 저장해 위아래에 같은 사진이 들어가지 않게 한다.
export type ShopManualBlock =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "heading"; level: 2 | 3; text: string }
  | { id: string; type: "list"; ordered: boolean; items: string[] }
  // src: 올린 사진 주소 (없으면 빈 사진 자리 — 공개 글에선 안 보임). alt: 사진 설명(대체 텍스트)
  | { id: string; type: "image"; src?: string; alt: string }
  // product: 이 구매 버튼이 가리키는 상품 (shop_posts.products 의 index)
  | { id: string; type: "link"; product: number }
  // 표: head = 머리행 칸, rows = 나머지 행 (행마다 칸 수는 head 와 같게 맞춰 저장한다)
  | { id: string; type: "table"; head: string[]; rows: string[][] };

export type ShopManualBlockType = ShopManualBlock["type"];

export type ShopManualContent = {
  kind: "manual";
  blocks: ShopManualBlock[];
  category?: string; // 관련 글 묶음용 (AI 글의 content.category 와 같은 자리라 관련 글 조회가 그대로 동작)
  disclosure?: string; // 공정위 고지 문구 (작성 시점 설정값)
  descriptionAuto?: boolean; // true = 검색 설명을 비워 둬서 저장 때마다 본문 앞부분으로 다시 만든다
};

export function isManualContent(c: unknown): c is ShopManualContent {
  return !!c && typeof c === "object" && (c as { kind?: unknown }).kind === "manual" && Array.isArray((c as { blocks?: unknown }).blocks);
}

type ShopPostBase = {
  id: string;
  slug: string;
  title: string;
  description: string;
  products: ShopPostInputProduct[];
  sources: ShopPostSource[];
  stats: ShopPostStats;
  status: ShopPostStatus;
  created_at: string;
  published_at: string | null;
  updated_at: string;
};

// AI 가 쓴 글(예전 구성·칼럼)
export type AiShopPost = ShopPostBase & { content: ShopPostContent };
// 직접 붙여넣어 만든 글
export type ManualShopPost = ShopPostBase & { content: ShopManualContent };
export type ShopPost = AiShopPost | ManualShopPost;

export function isManualPost(p: ShopPost): p is ManualShopPost {
  return isManualContent(p.content);
}

// "함께 보면 좋은 글" 링크용 (공개된 글만)
export type RelatedPost = Pick<ShopPost, "slug" | "title" | "products">;

// 몇 건을 살펴봤는지: AI 가 쓰지 않고 실제 수집 건수(post.stats)로 보여 준다 (지어낸 숫자가 들어갈 틈을 없앰).
// 2026-11-13 운영자 지적: "네이버 블로그·카페 등 글 100건 … 읽고"는 실제로는 검색 요약(2~3줄)이라 과장이고,
// 본문에서 수집 경로(플랫폼 이름)를 말할 필요도 없음 → "실사용 후기 100여 건과 리뷰 글 N편을 살펴봤어요"로.
// 리뷰 글 = 원문을 읽은 웹 리뷰 수 (sources 의 web_review — stats.webSources 에는 구글 검색 요약 출처도 섞여 있어 쓰지 않음).
// 짧은 후기(검색 요약·댓글)는 10단위로 내려 "~여 건"
export function readCountText(stats: ShopPostStats | undefined, webReviewCount = 0): string | null {
  const short = (stats?.naverReviews ?? 0) + (stats?.youtubeComments ?? 0);
  const long = webReviewCount;
  const shortText = short >= 20 ? `실사용 후기 ${Math.floor(short / 10) * 10}여 건` : short > 0 ? `실사용 후기 ${short}건` : "";
  const longText = long > 0 ? `리뷰 글 ${long}편` : "";
  const parts = [shortText, longText].filter(Boolean);
  if (!parts.length) return null;
  return `${parts.join("과 ")}을 살펴봤어요. 직접 써 본 리뷰가 아니라, 써 본 사람들의 이야기를 모아 정리한 글이에요.`;
}
