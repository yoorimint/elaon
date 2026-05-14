// 비교 페이지 데이터.
// 톤: 검색 데이터 기반 사실 중심. 한 쪽 편들지 않고 시나리오별 추천.

export type ComparisonSide = {
  name: string;
  blurb: string;
  emoji?: string;
  iconUrl?: string;
  pickRef?: { category: string; hub: string };
  recommendedFor: string[];
  pros: string[];
  cons: string[];
};

export type ScoreItem = {
  label: string;
  aScore: number;
  bScore: number;
  note?: string;
};

export type PricingItem = {
  plan: string;
  aPrice: string;
  bPrice: string;
  note?: string;
};

export type ScenarioMatch = {
  scenario: string;
  winner: "a" | "b" | "both";
  reason: string;
};

export type DetailRow = {
  label: string;
  aValue: string;
  bValue: string;
  bigger?: "a" | "b";
};

export type ComparisonFaq = { q: string; a: string };

export type Comparison = {
  slug: string;
  title: string;
  metaTitle: string;
  shortTitle: string;
  oneLiner: string;
  headline: string;
  description: string;
  longIntro: string[];
  a: ComparisonSide;
  b: ComparisonSide;
  scores: ScoreItem[];
  pricing: PricingItem[];
  scenarios: ScenarioMatch[];
  detailTable: DetailRow[];
  faq: ComparisonFaq[];
  relatedPicks?: { category: string; hub: string; label: string }[];
  relatedChecklists?: { slug: string; label: string }[];
  relatedKeywords: string[];
  publishedAt: string;
  updatedAt: string;
};

const TODAY = "2026-05-14";

// ===========================================================================
// 1. ChatGPT vs Claude — 한국 사용 비교
// ===========================================================================
const CHATGPT_VS_CLAUDE: Comparison = {
  slug: "chatgpt-vs-claude",
  title: "ChatGPT vs Claude 한국 사용 비교 — 가격·한국어·코딩·이미지·보안 한눈에",
  metaTitle: "ChatGPT vs Claude 한국 사용 비교",
  shortTitle: "ChatGPT vs Claude",
  oneLiner: "이미지·웹 검색·다목적은 ChatGPT, 코딩·긴 글·기밀 처리는 Claude 가 유리합니다.",
  headline: "둘 다 월 $20 동일. 본인 작업 비중이 어디 있는지로 갈립니다.",
  description:
    "ChatGPT 와 Claude 를 한국 사용자 관점에서 비교한 통합 가이드. 가격·한국어 품질·코딩·이미지 생성·회사 기밀 안전성·학생 할인까지. 본인 사용 시나리오별 추천 + 자주 묻는 질문.",
  longIntro: [
    "ChatGPT 와 Claude 는 한국에서 가장 많이 비교되는 두 AI 도구입니다. 기본 유료 플랜은 둘 다 월 $20 동일하지만 능력의 강점 영역이 명확히 다릅니다.",
    "한국에서 가입·결제 모두 가능하며, 한국어 답변 품질은 둘 다 충분히 자연스럽지만 영어 대비 토큰 소모가 2~3배 큽니다. 본인 사용 비중이 이미지·웹 검색·다목적이면 ChatGPT, 코딩·긴 문서·기밀 처리가 많으면 Claude 를 선택하는 것이 일반적인 결론입니다.",
    "이 가이드는 가격·점수·시나리오·자주 묻는 질문을 시각적으로 정리해 본인 결정을 빠르게 돕는 것이 목적입니다.",
  ],
  a: {
    name: "ChatGPT",
    blurb: "OpenAI 가 만든 가장 대중적인 AI. 이미지 생성·웹 검색·음성 대화·플러그인까지 다목적.",
    emoji: "💬",
    iconUrl: "https://www.google.com/s2/favicons?domain=openai.com&sz=128",
    pickRef: { category: "ai", hub: "chatgpt" },
    recommendedFor: [
      "이미지 생성 (DALL-E) 을 자주 쓰는 사람",
      "웹 검색·실시간 정보가 필요한 사람",
      "음성 대화·다양한 기능을 한 도구에서 쓰고 싶은 사람",
      "Custom GPTs·플러그인을 활용하는 사람",
    ],
    pros: [
      "이미지 생성 (DALL-E 3) 내장",
      "웹 브라우징·실시간 검색 강력",
      "음성 대화 자연스러움",
      "Custom GPTs·플러그인 생태계 넓음",
      "한국 사용자 수가 많아 자료·노하우 풍부",
    ],
    cons: [
      "코딩 능력이 Claude 대비 약함",
      "긴 글·문서 분석에서 답변 일관성 떨어짐",
      "데이터 보관 정책이 Claude 보다 명시적이지 않음",
    ],
  },
  b: {
    name: "Claude",
    blurb: "Anthropic 이 만든 AI. 코딩·긴 문서 분석·기밀 처리에 강함.",
    emoji: "🧠",
    iconUrl: "https://www.google.com/s2/favicons?domain=claude.ai&sz=128",
    pickRef: { category: "ai", hub: "claude" },
    recommendedFor: [
      "코드를 자주 작성하거나 디버깅하는 사람",
      "긴 문서 (계약서·논문·기술 문서) 를 분석하는 사람",
      "회사 기밀·민감 정보를 다루는 사람",
      "한국어 글쓰기 품질을 중시하는 사람",
    ],
    pros: [
      "코딩 능력 가장 강한 평가 (2026 기준)",
      "긴 글·문서 분석에서 답변 일관성 우수",
      "데이터 자동 삭제 정책 (3개월 이내) 명시",
      "한국어 글쓰기 자연스러움 평가 우세",
      "Artifacts 기능으로 결과물 시각화·편집",
    ],
    cons: [
      "이미지 생성 기능 없음",
      "웹 브라우징·실시간 검색 제한적",
      "음성 대화·플러그인 생태계 좁음",
      "Custom GPTs 같은 사용자 정의 봇 시스템 없음",
    ],
  },
  scores: [
    { label: "코딩 능력", aScore: 8, bScore: 10, note: "Claude 가 2026 평가에서 우세" },
    { label: "긴 글·문서 분석", aScore: 7, bScore: 9 },
    { label: "한국어 답변 자연스러움", aScore: 8, bScore: 9 },
    { label: "이미지 생성", aScore: 9, bScore: 0, note: "Claude 는 이미지 생성 불가" },
    { label: "웹 검색·실시간 정보", aScore: 9, bScore: 5 },
    { label: "음성 대화", aScore: 9, bScore: 3 },
    { label: "데이터 보안·기밀 처리", aScore: 7, bScore: 9, note: "Claude 자동 삭제 정책" },
    { label: "생태계·자료 풍부도", aScore: 10, bScore: 7 },
  ],
  pricing: [
    { plan: "무료 플랜", aPrice: "사용 가능", bPrice: "사용 가능", note: "사용량 제한 있음" },
    { plan: "유료 (기본)", aPrice: "월 $20 (Plus)", bPrice: "월 $20 (Pro)" },
    { plan: "상위 플랜", aPrice: "월 $200 (Pro)", bPrice: "월 $100~200 (Max)" },
    { plan: "한국 결제 시 부가세", aPrice: "+10%", bPrice: "+10%" },
    { plan: "학생 할인 (한국)", aPrice: "없음", bPrice: "없음", note: "두 곳 다 한국 학생 직접 할인 없음" },
  ],
  scenarios: [
    {
      scenario: "본인이 학생·직장인이고 글쓰기·번역·요약이 주 사용처",
      winner: "b",
      reason: "Claude 가 한국어 답변 자연스러움과 긴 글 일관성에서 우세",
    },
    {
      scenario: "본인이 이미지 생성·웹 검색을 자주 한다면",
      winner: "a",
      reason: "ChatGPT 내장 DALL-E·웹 브라우징이 강력함. Claude 는 이미지 생성 불가",
    },
    {
      scenario: "본인이 개발자이고 코드 작성·디버깅이 주 사용처",
      winner: "b",
      reason: "Claude 가 2026 평가에서 코딩 능력 가장 높음",
    },
    {
      scenario: "본인이 회사 기밀·민감 정보를 다룬다",
      winner: "b",
      reason: "Anthropic 데이터 3개월 자동 삭제 정책이 명시적",
    },
    {
      scenario: "본인이 음성 대화·여러 기능을 한 도구에서 쓰고 싶다",
      winner: "a",
      reason: "ChatGPT 음성 대화·플러그인·Custom GPTs 생태계가 가장 넓음",
    },
    {
      scenario: "본인이 처음 시작하고 자료·노하우를 찾기 쉬워야 한다",
      winner: "a",
      reason: "한국 사용자 수가 많아 블로그·유튜브 노하우가 풍부",
    },
    {
      scenario: "본인이 둘 중 어느 하나만 골라야 한다 — 종합 추천",
      winner: "both",
      reason: "글쓰기·코딩 중심이면 Claude, 다목적이면 ChatGPT. 본인 작업 비중으로 결정",
    },
  ],
  detailTable: [
    { label: "출시 회사", aValue: "OpenAI (미국)", bValue: "Anthropic (미국)" },
    { label: "한국 가입·결제", aValue: "가능", bValue: "가능" },
    { label: "한국어 인터페이스", aValue: "지원", bValue: "지원" },
    { label: "무료 플랜", aValue: "있음", bValue: "있음" },
    { label: "기본 유료 가격", aValue: "월 $20", bValue: "월 $20" },
    { label: "이미지 생성", aValue: "DALL-E 3 내장", bValue: "없음" },
    { label: "웹 검색", aValue: "지원 (실시간)", bValue: "제한적" },
    { label: "음성 대화", aValue: "지원", bValue: "제한적" },
    { label: "코드 작성", aValue: "양호", bValue: "최상", bigger: "b" },
    { label: "컨텍스트 윈도우", aValue: "128K (Plus)", bValue: "200K (Pro)", bigger: "b" },
    { label: "데이터 보관", aValue: "옵트아웃 가능", bValue: "3개월 자동 삭제", bigger: "b" },
    { label: "API 제공", aValue: "있음", bValue: "있음" },
    { label: "Custom GPTs·플러그인", aValue: "있음", bValue: "없음", bigger: "a" },
  ],
  faq: [
    {
      q: "두 개 다 구독하면 좋을까요?",
      a: "본인이 코딩·글쓰기 + 이미지 생성을 모두 자주 한다면 둘 다 구독하는 게 효율적입니다. 월 $40 (약 6만원) 이지만 작업 시간 절약이 비용보다 큽니다. 한 가지만 골라야 한다면 본인 작업의 60% 이상 비중을 차지하는 쪽을 선택합니다.",
    },
    {
      q: "회사 기밀을 입력해도 되나요?",
      a: "Claude 는 모든 사용자 데이터를 3개월 이내 자동 삭제하는 정책을 명시합니다. ChatGPT 는 설정에서 학습 데이터 사용을 옵트아웃할 수 있습니다. 그래도 진짜 기밀은 가명화 후 입력하거나 Team·Enterprise 플랜의 학습 거부 옵션을 활성화하는 게 안전합니다.",
    },
    {
      q: "한국어 답변 품질이 정말 차이가 나나요?",
      a: "둘 다 충분히 자연스럽지만, 긴 글·기술 문서에서는 Claude 가 일관성·문체 면에서 우세하다는 평가가 많습니다. 짧은 질문·간단한 답변은 둘 다 비슷한 품질입니다.",
    },
    {
      q: "한국에서 학생 할인 받을 수 있나요?",
      a: "두 곳 다 한국 학생에게 직접 할인을 제공하지 않습니다. 호주·콜롬비아 등 일부 국가만 ChatGPT Student 프로그램 적용. 한국 학생은 정상가로 사용하거나 그룹 공유 같은 변형 방식을 고려해야 합니다.",
    },
    {
      q: "한국어로 사용하면 토큰을 더 많이 쓴다고 하던데 사실인가요?",
      a: "사실입니다. 한국어·중국어 등은 영어 대비 토큰 소모가 2~3배 큽니다. API 사용 시 비용이 그만큼 증가하지만, 정액 구독(Plus·Pro) 사용자는 직접 비용 차이를 느끼지 않습니다. 최근 모델들은 한국어 효율을 개선하는 추세입니다.",
    },
    {
      q: "둘 중 더 빠른 건 어느 쪽인가요?",
      a: "응답 속도는 비슷하며 시점·서버 부하에 따라 다릅니다. ChatGPT 가 음성 대화에서 약간 더 빠르고, Claude 가 긴 문서 처리에서 효율적입니다.",
    },
    {
      q: "한국에서 결제 시 부가세가 추가되나요?",
      a: "네. 한국 IP·카드 사용 시 부가세 10% 가 자동 추가되어 실제 결제액은 약 $22 입니다. 본인 월 비용을 정확히 계산할 때 반영해야 합니다.",
    },
    {
      q: "Gemini·Perplexity·Grok 같은 다른 AI 와도 비교됩니까?",
      a: "Gemini 는 Google 생태계 연동·Grok 은 X(트위터) 연동·Perplexity 는 검색 특화입니다. 본인 작업 환경에 따라 다릅니다. 이 가이드는 가장 많이 비교되는 ChatGPT 와 Claude 두 도구에 한정합니다.",
    },
  ],
  relatedPicks: [
    { category: "ai", hub: "chatgpt", label: "ChatGPT 자세히" },
    { category: "ai", hub: "claude", label: "Claude 자세히" },
    { category: "ai", hub: "gemini", label: "Gemini" },
    { category: "ai", hub: "perplexity", label: "Perplexity" },
  ],
  relatedChecklists: [
    { slug: "ai-side-income-start", label: "AI 도구로 첫 부수입 시작" },
    { slug: "freelance-first-contract", label: "외주·프리랜서 첫 계약" },
  ],
  relatedKeywords: [
    "ChatGPT vs Claude",
    "ChatGPT Claude 비교",
    "ChatGPT Claude 한국어",
    "Claude Pro 가격",
    "ChatGPT Plus 가격",
    "AI 도구 추천",
    "한국 AI 사용",
    "ChatGPT Claude 보안",
    "Claude 코딩",
    "AI 학생 할인",
  ],
  publishedAt: TODAY,
  updatedAt: TODAY,
};

// ===========================================================================
// 전체 export
// ===========================================================================
export const COMPARISONS: Comparison[] = [CHATGPT_VS_CLAUDE];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

export function totalComparisonCount(): number {
  return COMPARISONS.length;
}
