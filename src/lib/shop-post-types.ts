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
  // 공정위 고지 문구. AI 가 아니라 스크립트가 작성 시점의 설정값을 넣는다.
  disclosure?: string;
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
