// 자동 작성 비교글의 구조. 생성 스크립트(scripts/shop)와 사이트 화면이 같이 쓴다.
// 이 파일은 Supabase 등 런타임 의존성 없이 타입만 둔다.

export type ShopPostStatus = "draft" | "published";

// 관리자가 입력한 상품 (링크는 항상 이 값만 사용)
export type ShopPostInputProduct = { name: string; link: string; image?: string };

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

export type ShopPostContent = {
  summary: string; // 한 줄 결론 (2~3문장)
  intro: string; // 도입
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
  | "youtube";

export const SOURCE_LABEL: Record<ShopSourceKind, string> = {
  naver_blog: "블로그",
  naver_cafe: "카페",
  naver_kin: "지식iN",
  naver_web: "웹문서",
  naver_news: "뉴스",
  youtube: "유튜브",
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

export type ShopPost = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: ShopPostContent;
  products: ShopPostInputProduct[];
  sources: ShopPostSource[];
  stats: ShopPostStats;
  status: ShopPostStatus;
  created_at: string;
  published_at: string | null;
  updated_at: string;
};

// "함께 보면 좋은 글" 링크용 (공개된 글만)
export type RelatedPost = Pick<ShopPost, "slug" | "title" | "products">;
