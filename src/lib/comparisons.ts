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

const TODAY = "2026-05-15";

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

// 도메인 → favicon URL 헬퍼 (구글 favicon 서비스, 128px)
const fav = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

// ===========================================================================
// 2. ChatGPT vs Gemini
// ===========================================================================
const CHATGPT_VS_GEMINI: Comparison = {
  slug: "chatgpt-vs-gemini",
  title: "ChatGPT vs Gemini 한국 사용 비교 — Google 통합·이미지·코딩 한눈에",
  metaTitle: "ChatGPT vs Gemini 한국 사용 비교",
  shortTitle: "ChatGPT vs Gemini",
  oneLiner: "Google 생태계(Gmail·Docs·Drive) 사용자는 Gemini, 그 외 다목적은 ChatGPT 가 유리합니다.",
  headline: "Google 계정·Workspace 를 매일 쓰면 Gemini, 자료 풍부함·플러그인이 필요하면 ChatGPT.",
  description: "ChatGPT 와 Gemini 의 한국 사용자 비교. 가격·한국어·이미지 생성·코딩·Google 통합·검색·자료 풍부도까지 시나리오별 추천.",
  longIntro: [
    "ChatGPT 와 Gemini 는 한국에서 양강 구도를 이루는 AI 도구이지만 강점이 다릅니다. ChatGPT 는 자료·노하우·플러그인 생태계가 가장 넓고, Gemini 는 Gmail·Drive·Docs 같은 Google 생태계와 자동 연동되어 직장인 효율이 높습니다.",
    "한국 결제·가입 모두 가능. 기본 유료 플랜은 ChatGPT Plus 월 $20, Gemini Advanced 월 $19.99 로 거의 동일. 본인 평소 사용 환경에 따라 선택이 갈립니다.",
  ],
  a: {
    name: "ChatGPT", blurb: "OpenAI 가 만든 가장 대중적인 AI. 이미지·웹 검색·플러그인까지 다목적.",
    iconUrl: fav("openai.com"), emoji: "💬", pickRef: { category: "ai", hub: "chatgpt" },
    recommendedFor: ["자료·노하우 풍부함이 필요한 사람", "이미지 생성·웹 검색 자주 사용", "Custom GPTs·플러그인 활용"],
    pros: ["이미지 생성 (DALL-E 3) 강력", "Custom GPTs·플러그인 생태계 최대", "한국 사용자 자료·후기 풍부"],
    cons: ["Google 생태계 연동 없음", "Gemini 대비 컨텍스트 윈도우 작음"],
  },
  b: {
    name: "Gemini", blurb: "Google 이 만든 AI. Gmail·Docs·Drive 자동 통합, 긴 컨텍스트 윈도우.",
    iconUrl: fav("gemini.google.com"), emoji: "✨", pickRef: { category: "ai", hub: "gemini" },
    recommendedFor: ["Gmail·Docs·Drive 매일 쓰는 직장인", "Google Workspace 사용자", "긴 문서·논문 분석"],
    pros: ["Google 앱 자동 연동 (Gmail·Drive·Docs)", "컨텍스트 윈도우 매우 큼 (1M~2M 토큰)", "Workspace 통합 시 무료 사용 가능"],
    cons: ["플러그인·Custom Bot 생태계 좁음", "한국 사용자 자료가 ChatGPT 대비 적음"],
  },
  scores: [
    { label: "Google 앱 통합", aScore: 3, bScore: 10 },
    { label: "이미지 생성", aScore: 9, bScore: 8 },
    { label: "긴 문서 분석", aScore: 7, bScore: 10, note: "Gemini 컨텍스트 윈도우 1M+" },
    { label: "한국어 답변", aScore: 8, bScore: 8 },
    { label: "코딩 능력", aScore: 8, bScore: 8 },
    { label: "생태계·자료 풍부도", aScore: 10, bScore: 6 },
  ],
  pricing: [
    { plan: "무료 플랜", aPrice: "사용 가능", bPrice: "사용 가능" },
    { plan: "유료 (기본)", aPrice: "월 $20 (Plus)", bPrice: "월 $19.99 (Advanced)" },
    { plan: "Workspace 통합", aPrice: "별도 없음", bPrice: "Workspace 사용자 무료 옵션 있음" },
  ],
  scenarios: [
    { scenario: "본인이 Gmail·Drive·Docs 를 매일 쓴다", winner: "b", reason: "Gemini 가 메일·문서를 직접 읽고 답해 효율 큼" },
    { scenario: "본인이 이미지 생성·웹 검색·플러그인을 자주 쓴다", winner: "a", reason: "ChatGPT 의 다목적 기능·생태계가 압도적" },
    { scenario: "본인이 긴 논문·계약서·코드베이스를 분석한다", winner: "b", reason: "Gemini 컨텍스트 윈도우 1M~2M 토큰" },
    { scenario: "본인이 처음 시작하고 한국어 자료가 많이 필요하다", winner: "a", reason: "한국 사용자·블로그·유튜브 자료가 풍부" },
    { scenario: "둘 중 하나만 골라야 한다", winner: "both", reason: "Google 사용자는 Gemini, 그 외는 ChatGPT" },
  ],
  detailTable: [
    { label: "회사", aValue: "OpenAI", bValue: "Google" },
    { label: "한국 가입·결제", aValue: "가능", bValue: "가능" },
    { label: "기본 유료", aValue: "월 $20", bValue: "월 $19.99" },
    { label: "컨텍스트 윈도우", aValue: "128K (Plus)", bValue: "1M+ (Advanced)", bigger: "b" },
    { label: "이미지 생성", aValue: "DALL-E 3", bValue: "Imagen 3" },
    { label: "Google 앱 연동", aValue: "없음", bValue: "Gmail·Drive·Docs 직접", bigger: "b" },
    { label: "플러그인·Custom Bot", aValue: "있음", bValue: "제한적", bigger: "a" },
    { label: "한국 사용자 자료", aValue: "매우 풍부", bValue: "보통", bigger: "a" },
  ],
  faq: [
    { q: "Gemini 가 Gmail 을 진짜 읽을 수 있나요?", a: "네. Workspace 계정 연동 시 Gemini 가 본인 Gmail·Drive·Docs 를 직접 읽고 요약·답변·분석할 수 있습니다. 별도 복사·붙여넣기 불필요. ChatGPT 는 이 기능이 없습니다." },
    { q: "둘 다 한국어 답변 품질이 비슷한가요?", a: "비슷합니다. 짧은 질문·일반 답변은 둘 다 자연스러우며, 긴 문서·기술 문서에서 약간씩 차이가 날 수 있습니다." },
    { q: "Google Workspace 사용자는 Gemini 가 무료인가요?", a: "Workspace 플랜에 따라 Gemini 가 포함되거나 추가 요금 옵션이 있습니다. 본인 회사 Workspace 관리자에게 문의하면 정확히 확인 가능합니다." },
    { q: "Gemini 의 1M 컨텍스트는 어떤 의미인가요?", a: "약 책 1권 분량(70만 단어) 을 한 번에 읽고 답변할 수 있다는 뜻입니다. 긴 논문·계약서·코드베이스 분석에 압도적으로 유리합니다." },
    { q: "이미지 생성은 어느 게 더 좋나요?", a: "ChatGPT 의 DALL-E 3 가 사실적 묘사·인물 표현에서 우세, Gemini 의 Imagen 3 는 풍경·디자인에서 강합니다. 본인 용도에 따라 다릅니다." },
  ],
  relatedPicks: [
    { category: "ai", hub: "chatgpt", label: "ChatGPT 자세히" },
    { category: "ai", hub: "gemini", label: "Gemini 자세히" },
    { category: "ai", hub: "claude", label: "Claude" },
  ],
  relatedChecklists: [{ slug: "ai-side-income-start", label: "AI 도구로 첫 부수입 시작" }],
  relatedKeywords: ["ChatGPT vs Gemini", "Gemini 한국", "Gemini Advanced 가격", "Google AI 비교", "AI 도구 추천"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 3. Claude vs Gemini
// ===========================================================================
const CLAUDE_VS_GEMINI: Comparison = {
  slug: "claude-vs-gemini",
  title: "Claude vs Gemini 한국 사용 비교 — 글쓰기·코딩 vs Google 통합·긴 컨텍스트",
  metaTitle: "Claude vs Gemini 한국 사용 비교",
  shortTitle: "Claude vs Gemini",
  oneLiner: "Claude 는 코딩·글쓰기·기밀 처리, Gemini 는 Google 앱 통합·1M+ 컨텍스트가 강점입니다.",
  headline: "본인 작업이 코딩·긴 글쓰기면 Claude, Gmail·Drive·논문 분석이면 Gemini.",
  description: "Claude 와 Gemini 두 AI 도구의 한국 사용자 비교. 코딩·글쓰기·Google 통합·컨텍스트 윈도우·보안.",
  longIntro: [
    "Claude 는 Anthropic 의 AI 로 코딩과 긴 글쓰기에서 가장 높이 평가되며, Gemini 는 Google 의 AI 로 Workspace 통합·초장문 컨텍스트가 강점입니다.",
    "두 도구 모두 한국 결제 가능, 기본 유료 월 $20 수준. 본인 작업 환경(Google 생태계 사용 여부) 과 목적(코딩·글쓰기 vs 문서 분석) 으로 선택이 갈립니다.",
  ],
  a: {
    name: "Claude", blurb: "Anthropic 의 AI. 코딩·긴 글쓰기·기밀 처리에 강함.",
    iconUrl: fav("claude.ai"), emoji: "🧠", pickRef: { category: "ai", hub: "claude" },
    recommendedFor: ["코딩 자주 하는 사람", "한국어 긴 글쓰기", "회사 기밀 처리"],
    pros: ["코딩 능력 최상 (2026 평가)", "한국어 글쓰기 자연스러움", "데이터 3개월 자동 삭제"],
    cons: ["Google 앱 직접 연동 없음", "이미지 생성 불가"],
  },
  b: {
    name: "Gemini", blurb: "Google 의 AI. Workspace·Gmail·Drive·Docs 자동 통합.",
    iconUrl: fav("gemini.google.com"), emoji: "✨", pickRef: { category: "ai", hub: "gemini" },
    recommendedFor: ["Gmail·Drive 매일 쓰는 직장인", "긴 논문·문서 분석", "Workspace 사용자"],
    pros: ["1M~2M 토큰 초장문 컨텍스트", "Google 앱 자동 연동", "Workspace 통합 무료 옵션"],
    cons: ["코딩 능력이 Claude 대비 약함", "보안 정책 명시성 Claude 보다 약함"],
  },
  scores: [
    { label: "코딩 능력", aScore: 10, bScore: 8 },
    { label: "한국어 글쓰기", aScore: 9, bScore: 8 },
    { label: "Google 앱 통합", aScore: 0, bScore: 10 },
    { label: "긴 문서 분석", aScore: 9, bScore: 10 },
    { label: "기밀·보안", aScore: 9, bScore: 7 },
    { label: "이미지 생성", aScore: 0, bScore: 8 },
  ],
  pricing: [
    { plan: "무료 플랜", aPrice: "사용 가능", bPrice: "사용 가능" },
    { plan: "유료 기본", aPrice: "월 $20 (Pro)", bPrice: "월 $19.99 (Advanced)" },
    { plan: "Workspace 통합", aPrice: "별도", bPrice: "Workspace 포함 옵션" },
  ],
  scenarios: [
    { scenario: "본인이 개발자이고 코드 작성·디버깅이 주 업무", winner: "a", reason: "Claude 가 코딩에서 가장 높은 평가" },
    { scenario: "본인이 Gmail·Drive·Docs 사용자", winner: "b", reason: "Gemini 가 본인 메일·파일을 직접 읽고 답변" },
    { scenario: "본인이 한국어 글쓰기·번역·교정 중심", winner: "a", reason: "Claude 가 한국어 답변 자연스러움 우세" },
    { scenario: "본인이 긴 논문·계약서를 한 번에 분석", winner: "b", reason: "Gemini 컨텍스트 1M+ 토큰" },
    { scenario: "본인이 회사 기밀·민감 정보 처리", winner: "a", reason: "Claude 의 3개월 자동 삭제 정책이 명시적" },
  ],
  detailTable: [
    { label: "회사", aValue: "Anthropic", bValue: "Google" },
    { label: "기본 유료", aValue: "월 $20", bValue: "월 $19.99" },
    { label: "컨텍스트", aValue: "200K", bValue: "1M+", bigger: "b" },
    { label: "Google 앱 연동", aValue: "없음", bValue: "있음", bigger: "b" },
    { label: "이미지 생성", aValue: "없음", bValue: "Imagen 3", bigger: "b" },
    { label: "코딩 능력", aValue: "최상", bValue: "양호", bigger: "a" },
    { label: "데이터 보관", aValue: "3개월 자동 삭제", bValue: "Google 정책", bigger: "a" },
    { label: "한국 사용자 평가", aValue: "글쓰기·코딩 우세", bValue: "직장 통합 우세" },
  ],
  faq: [
    { q: "Claude 가 정말 코딩에서 Gemini 보다 나은가요?", a: "2026 기준 다수 벤치마크·개발자 평가에서 Claude 가 우세합니다. 다만 단순 코드 생성보다는 복잡한 리팩토링·아키텍처 설계에서 차이가 큽니다." },
    { q: "Gemini 가 Gmail 을 읽으면 프라이버시는?", a: "Google 의 일반 프라이버시 정책 적용. 본인 데이터가 학습에 사용되는지는 Workspace 플랜·설정에 따라 다릅니다." },
    { q: "둘 다 한국어 잘 하나요?", a: "둘 다 자연스럽지만 Claude 가 긴 한국어 글쓰기·문체 일관성에서 우세하다는 평가가 많습니다." },
    { q: "본인이 학생인데 어느 게 좋나요?", a: "학생은 Workspace 무료 옵션이 가능한 Gemini 가 비용 측면에서 유리. 코딩 학습이 주라면 Claude." },
    { q: "두 개 다 결제할 가치가 있나요?", a: "본인 작업이 코딩 + Google 앱 사용이면 둘 다 구독해도 시간 절약 효과가 큼. 한 가지만 골라야 하면 본인 60% 작업 비중 기준." },
  ],
  relatedPicks: [
    { category: "ai", hub: "claude", label: "Claude 자세히" },
    { category: "ai", hub: "gemini", label: "Gemini 자세히" },
  ],
  relatedChecklists: [{ slug: "ai-side-income-start", label: "AI 도구로 첫 부수입 시작" }],
  relatedKeywords: ["Claude vs Gemini", "AI 코딩 비교", "Google AI", "Workspace 연동", "긴 컨텍스트"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 4. Midjourney vs DALL-E
// ===========================================================================
const MIDJOURNEY_VS_DALLE: Comparison = {
  slug: "midjourney-vs-dalle",
  title: "Midjourney vs DALL-E 한국 사용 비교 — AI 이미지 생성 어느 게 본인한테 맞나",
  metaTitle: "Midjourney vs DALL-E 한국 사용 비교",
  shortTitle: "Midjourney vs DALL-E",
  oneLiner: "예술·일러스트·고품질은 Midjourney, 일상·실사·ChatGPT 통합은 DALL-E 가 유리합니다.",
  headline: "Midjourney 가 품질·스타일 다양성, DALL-E 가 사용 편의성·통합으로 갈립니다.",
  description: "Midjourney 와 DALL-E 의 AI 이미지 생성 비교. 가격·품질·스타일·한국어 프롬프트·상업 이용·접근성.",
  longIntro: [
    "AI 이미지 생성의 양대 도구. Midjourney 는 예술적 품질·스타일 다양성이 최상이며, DALL-E 는 ChatGPT 내장이라 별도 구독 없이 사용 편의성이 높습니다.",
    "Midjourney 는 단독 구독 (월 $10~120), DALL-E 는 ChatGPT Plus (월 $20) 에 포함. 본인이 이미지 생성만 주 사용처면 Midjourney 가 유리하지만 종합 AI 도구가 필요하면 ChatGPT + DALL-E 가 효율적입니다.",
  ],
  a: {
    name: "Midjourney", blurb: "이미지 생성 전용 AI. 품질·스타일 다양성 최상.",
    iconUrl: fav("midjourney.com"), emoji: "🎨",
    recommendedFor: ["디자이너·일러스트레이터", "예술적 품질 최우선", "스타일 다양성 필요"],
    pros: ["이미지 품질 최상 (2026 기준)", "스타일·아트 스킬 다양", "프롬프트 표현력 풍부"],
    cons: ["월 $10~120 별도 구독", "Discord 또는 웹 인터페이스 필요"],
  },
  b: {
    name: "DALL-E (ChatGPT 내장)", blurb: "OpenAI 의 이미지 생성. ChatGPT Plus 에 포함되어 사용 편함.",
    iconUrl: fav("openai.com"), emoji: "🖼️", pickRef: { category: "ai", hub: "chatgpt" },
    recommendedFor: ["ChatGPT 이미 사용자", "일상·실사 이미지", "별도 구독 부담 회피"],
    pros: ["ChatGPT Plus 에 자동 포함 (별도 구독 X)", "대화로 이미지 수정·반복 쉬움", "사실적·실사 표현 강함"],
    cons: ["Midjourney 대비 예술적 다양성 낮음", "프롬프트 표현력 다소 제한"],
  },
  scores: [
    { label: "이미지 품질 (예술·일러스트)", aScore: 10, bScore: 7 },
    { label: "이미지 품질 (실사·사진)", aScore: 8, bScore: 9 },
    { label: "스타일·아트 다양성", aScore: 10, bScore: 7 },
    { label: "사용 편의성", aScore: 6, bScore: 10 },
    { label: "한국어 프롬프트", aScore: 7, bScore: 8 },
    { label: "비용 효율 (이미지 외 다른 AI 도 쓸 때)", aScore: 5, bScore: 10 },
  ],
  pricing: [
    { plan: "무료 플랜", aPrice: "없음", bPrice: "ChatGPT 무료 (제한)" },
    { plan: "기본 유료", aPrice: "월 $10 (Basic)", bPrice: "월 $20 (ChatGPT Plus 포함)" },
    { plan: "상위 플랜", aPrice: "월 $30 (Standard)~$120 (Mega)", bPrice: "월 $200 (Pro)" },
  ],
  scenarios: [
    { scenario: "본인이 디자이너·일러스트레이터로 이미지 품질이 최우선", winner: "a", reason: "Midjourney 가 예술적 품질·다양성 압도" },
    { scenario: "본인이 이미 ChatGPT Plus 사용자", winner: "b", reason: "DALL-E 가 별도 구독 없이 포함" },
    { scenario: "본인이 SNS·블로그용 일러스트가 가끔 필요", winner: "b", reason: "ChatGPT 한 도구로 글·이미지 다 해결" },
    { scenario: "본인이 한 달에 100장 이상 생성하는 헤비 유저", winner: "a", reason: "Midjourney 가 대량 생성·품질 측면에서 유리" },
    { scenario: "본인이 이미지 + 텍스트 + 음성 다 쓰고 싶다", winner: "b", reason: "ChatGPT 가 다목적 강점" },
  ],
  detailTable: [
    { label: "회사", aValue: "Midjourney Inc.", bValue: "OpenAI" },
    { label: "기본 유료", aValue: "월 $10", bValue: "월 $20 (ChatGPT Plus)" },
    { label: "사용 환경", aValue: "Discord 또는 웹", bValue: "ChatGPT 인터페이스" },
    { label: "예술·스타일 품질", aValue: "최상", bValue: "양호", bigger: "a" },
    { label: "실사·사진 품질", aValue: "양호", bValue: "최상", bigger: "b" },
    { label: "다른 AI 기능", aValue: "이미지만", bValue: "텍스트·음성·웹검색 통합", bigger: "b" },
    { label: "한국 결제", aValue: "가능", bValue: "가능" },
    { label: "상업 이용", aValue: "Standard 이상 가능", bValue: "Plus 가능" },
  ],
  faq: [
    { q: "둘 다 상업 이용 가능한가요?", a: "Midjourney 는 Standard 플랜 이상($30/월), DALL-E 는 ChatGPT Plus($20/월) 부터 상업 이용 가능. 무료 플랜은 둘 다 제한 있음." },
    { q: "한국어 프롬프트로 써도 되나요?", a: "둘 다 가능하지만 영어 프롬프트가 결과가 더 좋습니다. 한국어로 시작 후 ChatGPT 로 영어 번역해 Midjourney 에 입력하는 패턴이 일반적." },
    { q: "Midjourney 가 ChatGPT 보다 정말 비싼가요?", a: "이미지만 쓴다면 Midjourney Basic($10) 이 ChatGPT Plus($20) 보다 저렴. 다만 ChatGPT 는 텍스트·음성·웹검색 등 모든 기능 포함." },
    { q: "Discord 안 쓰고 Midjourney 사용할 수 있나요?", a: "2026 기준 Midjourney 웹 인터페이스(midjourney.com)가 정식 운영되어 Discord 없이 사용 가능합니다." },
    { q: "두 개 다 결제하는 게 좋을까요?", a: "본인이 디자인·이미지가 주 업무면 Midjourney Standard + ChatGPT Plus 조합이 흔합니다. 가끔만 이미지 쓰면 ChatGPT Plus 단독." },
  ],
  relatedPicks: [
    { category: "ai", hub: "midjourney", label: "Midjourney 자세히" },
    { category: "ai", hub: "chatgpt", label: "ChatGPT (DALL-E 포함)" },
  ],
  relatedChecklists: [{ slug: "ai-side-income-start", label: "AI 도구로 첫 부수입 시작" }],
  relatedKeywords: ["Midjourney vs DALL-E", "AI 이미지 생성", "Midjourney 한국 가격", "DALL-E ChatGPT", "AI 일러스트"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 5. Cursor vs GitHub Copilot
// ===========================================================================
const CURSOR_VS_COPILOT: Comparison = {
  slug: "cursor-vs-copilot",
  title: "Cursor vs GitHub Copilot 비교 — AI 코딩 도구 어느 게 본인 흐름에 맞나",
  metaTitle: "Cursor vs GitHub Copilot 비교",
  shortTitle: "Cursor vs Copilot",
  oneLiner: "코드베이스 대화·리팩토링은 Cursor, VSCode·GitHub 통합·가격은 Copilot 이 유리합니다.",
  headline: "Cursor 는 AI 네이티브 IDE, Copilot 은 기존 에디터 보조. 본인 워크플로우로 결정.",
  description: "AI 코딩 도구 Cursor 와 GitHub Copilot 비교. 가격·통합성·코드베이스 이해·자동완성·리팩토링.",
  longIntro: [
    "Cursor 는 AI 를 위해 만들어진 IDE 로 코드베이스 전체를 한 번에 이해·리팩토링하는 강점이 있고, GitHub Copilot 은 VSCode·JetBrains 같은 기존 에디터에 플러그인으로 붙어 자동완성·인라인 채팅이 강합니다.",
    "Cursor 는 월 $20~40, Copilot 은 월 $10 (Pro) 부터 시작. 학생·오픈소스는 Copilot 무료 옵션이 있어 진입 장벽이 낮습니다.",
  ],
  a: {
    name: "Cursor", blurb: "AI 네이티브 IDE. 코드베이스 전체 이해·리팩토링 강점.",
    iconUrl: fav("cursor.com"), emoji: "🖱️", pickRef: { category: "dev", hub: "cursor" },
    recommendedFor: ["전체 코드베이스 리팩토링 자주 하는 개발자", "Claude/GPT-4 백엔드 활용", "VSCode 환경 익숙한 사람"],
    pros: ["코드베이스 전체 컨텍스트 이해", "Composer 로 다중 파일 동시 수정", "Claude/GPT-4/Gemini 백엔드 선택"],
    cons: ["월 $20~40 비교적 비싼 편", "별도 IDE 설치 필요"],
  },
  b: {
    name: "GitHub Copilot", blurb: "VSCode·JetBrains 플러그인. 자동완성·인라인 채팅 강함.",
    iconUrl: fav("github.com"), emoji: "🐙",
    recommendedFor: ["VSCode·JetBrains 기존 사용자", "학생·오픈소스 기여자", "비용 부담 작은 시작"],
    pros: ["기존 에디터에 그대로 붙음", "월 $10 으로 진입 장벽 낮음", "학생·오픈소스 무료"],
    cons: ["코드베이스 전체 이해 Cursor 대비 약함", "다중 파일 동시 수정 제한"],
  },
  scores: [
    { label: "코드베이스 전체 이해", aScore: 10, bScore: 7 },
    { label: "자동완성 정확도", aScore: 9, bScore: 9 },
    { label: "다중 파일 리팩토링", aScore: 10, bScore: 6 },
    { label: "기존 워크플로우 호환", aScore: 7, bScore: 10 },
    { label: "비용 효율", aScore: 6, bScore: 9 },
    { label: "백엔드 모델 선택권", aScore: 10, bScore: 5 },
  ],
  pricing: [
    { plan: "무료", aPrice: "Hobby (제한)", bPrice: "학생·오픈소스 무료" },
    { plan: "기본 유료", aPrice: "월 $20 (Pro)", bPrice: "월 $10 (Pro)" },
    { plan: "상위", aPrice: "월 $40 (Business)", bPrice: "월 $19 (Pro+)" },
  ],
  scenarios: [
    { scenario: "본인이 큰 코드베이스 리팩토링을 자주 한다", winner: "a", reason: "Cursor 의 Composer 가 다중 파일 동시 수정에 압도적" },
    { scenario: "본인이 VSCode·JetBrains 환경을 그대로 쓰고 싶다", winner: "b", reason: "Copilot 이 플러그인으로 기존 환경에 붙음" },
    { scenario: "본인이 학생·오픈소스 기여자", winner: "b", reason: "Copilot 무료 옵션이 있음" },
    { scenario: "본인이 Claude·GPT-4·Gemini 를 직접 선택해 쓰고 싶다", winner: "a", reason: "Cursor 가 백엔드 모델 선택권 제공" },
    { scenario: "본인이 입문자이고 비용 부담을 최소화하고 싶다", winner: "b", reason: "$10 부터 시작, 무료 옵션도 있음" },
  ],
  detailTable: [
    { label: "회사", aValue: "Anysphere", bValue: "GitHub (Microsoft)" },
    { label: "기본 유료", aValue: "월 $20", bValue: "월 $10", bigger: "b" },
    { label: "사용 환경", aValue: "전용 IDE", bValue: "VSCode·JetBrains 플러그인" },
    { label: "백엔드 모델", aValue: "GPT-4·Claude·Gemini 선택", bValue: "GPT-4·Claude 일부", bigger: "a" },
    { label: "코드베이스 이해", aValue: "전체 이해", bValue: "파일 단위 중심", bigger: "a" },
    { label: "다중 파일 수정", aValue: "Composer 강력", bValue: "제한적", bigger: "a" },
    { label: "학생 할인", aValue: "없음", bValue: "무료", bigger: "b" },
    { label: "한국 결제", aValue: "가능", bValue: "가능" },
  ],
  faq: [
    { q: "Cursor 와 Copilot 같이 쓸 수 있나요?", a: "둘 다 별도 결제·설치이지만 동시 사용 가능. 다만 자동완성이 겹쳐 혼란스러울 수 있어 보통 하나만 활성화." },
    { q: "Copilot 학생 무료는 어떻게 받나요?", a: "GitHub Student Developer Pack 신청 후 학교 메일 인증. 약 1~2주 소요. 졸업 후 자동 해지." },
    { q: "Cursor 가 정말 Copilot 보다 좋은가요?", a: "단순 자동완성은 비슷하지만 다중 파일·리팩토링·전체 코드베이스 작업에서 Cursor 가 우세. 본인 작업 패턴에 따라 다름." },
    { q: "한국어 주석·변수명 잘 처리하나요?", a: "둘 다 한국어 주석·변수명 인식·생성 가능. 영어 위주 코딩보다 약간 정확도는 떨어지지만 실용 수준." },
    { q: "Cursor 의 백엔드 모델은 어떻게 선택?", a: "설정에서 GPT-4·Claude 3.5 Sonnet·Gemini 등 선택. 작업 종류에 따라 바꿔 사용 가능 (예: 리팩토링은 Claude, 빠른 자동완성은 GPT-4)." },
  ],
  relatedPicks: [
    { category: "dev", hub: "cursor", label: "Cursor 자세히" },
    { category: "ai", hub: "claude", label: "Claude (Cursor 백엔드)" },
  ],
  relatedChecklists: [{ slug: "ai-side-income-start", label: "AI 도구로 첫 부수입 시작" }],
  relatedKeywords: ["Cursor vs Copilot", "AI 코딩 도구", "GitHub Copilot 가격", "Cursor IDE", "AI 개발자"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 6. Suno vs Udio (AI 음악)
// ===========================================================================
const SUNO_VS_UDIO: Comparison = {
  slug: "suno-vs-udio",
  title: "Suno vs Udio 비교 — AI 음악 생성 어느 게 더 자연스러운가",
  metaTitle: "Suno vs Udio AI 음악 비교",
  shortTitle: "Suno vs Udio",
  oneLiner: "다양성·인기·한국어 가사는 Suno, 사운드 품질·전문성은 Udio 가 유리합니다.",
  headline: "취미·SNS 콘텐츠는 Suno, 고품질 사운드·전문 작업은 Udio.",
  description: "AI 음악 생성 양대 도구 Suno 와 Udio 비교. 가격·음질·다양성·한국어 가사·상업 이용.",
  longIntro: [
    "Suno 와 Udio 는 AI 로 텍스트만으로 노래를 생성하는 양대 도구. Suno 는 사용 편의성·다양성·한국어 가사 처리가 강점이고, Udio 는 사운드 품질·전문가급 마스터링이 우수합니다.",
    "둘 다 무료 플랜이 있어 본인 비교 가능. 본격 사용 시 Suno 월 $10, Udio 월 $10 부터 시작.",
  ],
  a: {
    name: "Suno", blurb: "가장 대중적인 AI 음악 생성. 한국어 가사·다양한 장르.",
    iconUrl: fav("suno.com"), emoji: "🎵",
    recommendedFor: ["취미·SNS 콘텐츠 BGM", "한국어 가사 노래", "사용 편의성 최우선"],
    pros: ["한국어 가사 자연스러움 우세", "장르·스타일 다양성 큼", "사용 편의성 가장 좋음"],
    cons: ["음질이 Udio 대비 약간 부족", "상업 이용 플랜 요건 명확하지 않음"],
  },
  b: {
    name: "Udio", blurb: "고품질 사운드·전문가급 마스터링.",
    iconUrl: fav("udio.com"), emoji: "🎶",
    recommendedFor: ["전문 음악 작업", "사운드 품질 최우선", "상업 콘텐츠 제작"],
    pros: ["사운드 품질 최상", "전문 마스터링 수준", "상업 라이선스 정책 명확"],
    cons: ["한국어 가사 Suno 보다 약함", "사용 편의성 Suno 대비 학습 필요"],
  },
  scores: [
    { label: "사운드 품질", aScore: 8, bScore: 10 },
    { label: "한국어 가사", aScore: 9, bScore: 6 },
    { label: "장르·스타일 다양성", aScore: 10, bScore: 8 },
    { label: "사용 편의성", aScore: 10, bScore: 7 },
    { label: "상업 이용 명확성", aScore: 7, bScore: 9 },
  ],
  pricing: [
    { plan: "무료", aPrice: "사용 가능", bPrice: "사용 가능" },
    { plan: "기본 유료", aPrice: "월 $10 (Pro)", bPrice: "월 $10 (Standard)" },
    { plan: "상위", aPrice: "월 $30 (Premier)", bPrice: "월 $30 (Pro)" },
  ],
  scenarios: [
    { scenario: "본인이 한국어 가사 노래를 만들고 싶다", winner: "a", reason: "Suno 가 한국어 가사·발음 처리 우세" },
    { scenario: "본인이 유튜브·SNS 콘텐츠 BGM 가 필요", winner: "a", reason: "Suno 사용 편의성·다양성 강점" },
    { scenario: "본인이 전문 음악 작업·앨범 제작", winner: "b", reason: "Udio 사운드 품질·마스터링 우수" },
    { scenario: "본인이 상업 콘텐츠 제작·판매", winner: "b", reason: "Udio 상업 라이선스 정책 명확" },
    { scenario: "본인이 처음 시작하고 빠르게 결과를 보고 싶다", winner: "a", reason: "Suno 가 진입 장벽 가장 낮음" },
  ],
  detailTable: [
    { label: "회사", aValue: "Suno Inc.", bValue: "Udio" },
    { label: "기본 유료", aValue: "월 $10", bValue: "월 $10" },
    { label: "음질", aValue: "양호", bValue: "최상", bigger: "b" },
    { label: "한국어 가사", aValue: "자연스러움", bValue: "보통", bigger: "a" },
    { label: "장르 다양성", aValue: "매우 다양", bValue: "다양", bigger: "a" },
    { label: "사용 편의성", aValue: "최상", bValue: "양호", bigger: "a" },
    { label: "상업 이용", aValue: "Pro 가능", bValue: "Standard 가능" },
    { label: "한국 결제", aValue: "가능", bValue: "가능" },
  ],
  faq: [
    { q: "둘 다 상업 이용 가능한가요?", a: "유료 플랜에서 가능. Suno Pro($10), Udio Standard($10) 부터 상업 이용 권한 부여. 무료 플랜은 비상업 한정." },
    { q: "한국어 가사 입력하면 발음 자연스럽나요?", a: "Suno 가 비교적 자연스러우나 일부 발음·받침에서 어색할 수 있음. 영어 발음 표기로 가사 작성하면 더 매끄러움." },
    { q: "한 곡 만드는 데 얼마나 걸리나요?", a: "Suno·Udio 모두 30초~2분. 사용량 한도 내에서 여러 번 생성 후 마음에 드는 거 선택." },
    { q: "AI 가 만든 음원의 저작권은 누가 가지나요?", a: "Suno·Udio 유료 플랜은 사용자에게 저작권 양도. 다만 다른 작품을 복제·표절한 경우는 제외. 약관 확인 필수." },
    { q: "무료 플랜은 어디까지 가능한가요?", a: "둘 다 월 10~20곡 정도 무료 생성 가능. 워터마크·로고 일부 포함되며 상업 이용 불가." },
  ],
  relatedKeywords: ["Suno vs Udio", "AI 음악 생성", "Suno 한국어", "AI 음원 저작권", "유튜브 BGM AI"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 7. 디딤돌 vs 보금자리 (주담대 정책 금융)
// ===========================================================================
const DIDIMDOL_VS_BOGEUMJARI: Comparison = {
  slug: "didimdol-vs-bogeumjari",
  title: "디딤돌 대출 vs 보금자리론 비교 — 본인 자격에 어느 게 유리한가",
  metaTitle: "디딤돌 vs 보금자리론 비교",
  shortTitle: "디딤돌 vs 보금자리",
  oneLiner: "디딤돌은 무주택 서민·금리 최저, 보금자리론은 자격 폭 넓고 한도 큼.",
  headline: "본인이 디딤돌 자격이 되면 무조건 디딤돌 (금리 1~2%p 낮음). 자격 초과 시 보금자리론.",
  description: "정책 주담대 디딤돌·보금자리론 비교. 자격·금리·한도·LTV·우대 조건 한눈에.",
  longIntro: [
    "디딤돌 대출과 보금자리론은 한국 정부가 운영하는 정책 주담대 양대 상품. 디딤돌이 금리·한도 측면에서 더 유리하나 자격 요건이 까다롭고, 보금자리론은 자격 폭이 넓어 디딤돌 자격이 안 되는 사람에게 차선책.",
    "둘 다 한국주택금융공사(HF) 가 운영. 본인 소득·주택가격·무주택 여부로 자격이 갈립니다. 본인 자격을 확인한 뒤 유리한 쪽으로 신청합니다.",
  ],
  a: {
    name: "디딤돌 대출", blurb: "무주택 서민 대상 정책 주담대. 가장 낮은 금리.",
    iconUrl: fav("hf.go.kr"), emoji: "🏠",
    recommendedFor: ["연소득 6천만원 이하 무주택 서민", "신혼·다자녀·생애최초", "5억원 이하 주택 구매"],
    pros: ["금리 최저 2.45% 부터 (2026 3월 기준)", "다자녀 0.7%p 우대 등 다양", "LTV 70% 까지 (생애최초)"],
    cons: ["연소득 6천만원 이하 자격 까다로움", "주택가격 5억(특수 6억) 이하만"],
  },
  b: {
    name: "보금자리론", blurb: "자격 폭 넓은 정책 주담대. 디딤돌 자격 초과 시 차선책.",
    iconUrl: fav("hf.go.kr"), emoji: "🏘️",
    recommendedFor: ["디딤돌 자격 초과한 중산층", "9억 이하 주택 구매", "고정금리 안정성 선호"],
    pros: ["주택가격 9억원까지", "한도 최대 5억원", "10년·30년 고정금리 선택"],
    cons: ["금리 디딤돌보다 1%p 이상 높음", "디딤돌만큼 우대 폭 작음"],
  },
  scores: [
    { label: "금리 (낮을수록 좋음)", aScore: 10, bScore: 7 },
    { label: "자격 폭 (넓을수록 좋음)", aScore: 5, bScore: 9 },
    { label: "한도", aScore: 7, bScore: 9 },
    { label: "우대 조건 다양성", aScore: 10, bScore: 7 },
    { label: "신청 절차 편의", aScore: 8, bScore: 8 },
  ],
  pricing: [
    { plan: "금리 (기준)", aPrice: "2.45% ~", bPrice: "3.05% ~ 4.35%", note: "2026 3월 기준" },
    { plan: "주택가격 한도", aPrice: "5억 (특수 6억)", bPrice: "9억" },
    { plan: "한도", aPrice: "최대 2.5억", bPrice: "최대 5억" },
  ],
  scenarios: [
    { scenario: "본인이 연소득 6천 이하 무주택자 + 5억 이하 주택", winner: "a", reason: "디딤돌이 금리·우대 측면에서 압도적" },
    { scenario: "본인이 연소득 6천 초과 + 9억 이하 주택", winner: "b", reason: "디딤돌 자격 미달, 보금자리론이 차선책" },
    { scenario: "본인이 다자녀·신혼·생애최초", winner: "a", reason: "디딤돌의 우대 폭이 가장 큼" },
    { scenario: "본인이 고정금리 안정성을 가장 중시", winner: "b", reason: "보금자리론 10년·30년 고정금리 선택" },
    { scenario: "본인 자격 확인하기 어렵다", winner: "both", reason: "HF 홈페이지 모의 자격 진단 도구 활용 권장" },
  ],
  detailTable: [
    { label: "운영", aValue: "한국주택금융공사", bValue: "한국주택금융공사" },
    { label: "대상", aValue: "연소득 6천 이하 무주택", bValue: "무주택·9억 이하" },
    { label: "주택가격", aValue: "5억 이하", bValue: "9억 이하", bigger: "b" },
    { label: "기준 금리", aValue: "2.45%~", bValue: "3.05%~4.35%", bigger: "a" },
    { label: "한도", aValue: "최대 2.5억", bValue: "최대 5억", bigger: "b" },
    { label: "LTV", aValue: "최대 70%", bValue: "최대 60~70%" },
    { label: "우대 조건", aValue: "다자녀 0.7%p 등", bValue: "일부 우대" },
    { label: "금리 종류", aValue: "고정·변동", bValue: "고정 (10·30년)" },
  ],
  faq: [
    { q: "디딤돌 자격 확인은 어떻게 하나요?", a: "한국주택금융공사 홈페이지(hf.go.kr) 모의 자격 진단으로 본인 소득·주택·무주택 여부 확인. 5분 내 결과." },
    { q: "디딤돌 + 보금자리론 동시 가능한가요?", a: "동시는 불가. 본인 자격이 디딤돌에 해당하면 디딤돌 우선 신청." },
    { q: "보금자리론은 누구나 신청 가능한가요?", a: "무주택자 + 주택가격 9억 이하 조건 충족 시 가능. 소득 제한이 디딤돌보다 완화." },
    { q: "디딤돌 + 일반 시중은행 주담대 비교는?", a: "디딤돌이 금리 1~3%p 낮음. 본인 자격 가능하면 시중은행 대신 디딤돌이 평생 이자 수천만원 절약." },
    { q: "신혼·다자녀 우대는 얼마나 깎이나요?", a: "디딤돌 — 다자녀 0.7%p, 신혼 0.2%p, 생애최초 0.2%p. 중복 적용 가능. 본인 자격 모두 확인 후 신청." },
  ],
  relatedChecklists: [
    { slug: "loan-before-checklist", label: "대출 받기 전 체크리스트" },
    { slug: "jeonse-contract-safety", label: "전세 계약 체크리스트" },
  ],
  relatedKeywords: ["디딤돌 vs 보금자리", "디딤돌 대출 자격", "보금자리론 금리", "주담대 정책금융", "무주택 주담대"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 8. 버팀목 vs 일반 시중 전세대출
// ===========================================================================
const BEOTIMMOK_VS_BANK: Comparison = {
  slug: "beotimmok-vs-bank-jeonse",
  title: "버팀목 전세대출 vs 시중은행 전세대출 비교 — 청년·신혼 어느 게 유리한가",
  metaTitle: "버팀목 vs 시중은행 전세대출 비교",
  shortTitle: "버팀목 vs 시중은행",
  oneLiner: "본인이 자격이 되면 버팀목이 금리 1~2%p 낮아 무조건 유리합니다.",
  headline: "청년·신혼 자격 되면 버팀목, 자격 초과·한도 부족이면 시중은행.",
  description: "정책 전세대출 버팀목과 시중은행 전세대출 비교. 자격·금리·한도·신청 절차.",
  longIntro: [
    "버팀목 전세자금대출은 정부 정책 상품으로 청년·신혼부부 등 자격이 까다롭지만 금리가 시중은행보다 1~2%p 낮습니다. 시중은행 전세대출은 자격 폭이 넓고 신청·심사가 빠른 게 장점.",
    "본인 자격을 먼저 확인하고 가능하면 버팀목, 자격 안 되거나 한도가 부족하면 시중은행으로 결정.",
  ],
  a: {
    name: "버팀목 전세대출", blurb: "정부 정책 청년·신혼 전세대출. 금리 최저.",
    iconUrl: fav("nhuf.molit.go.kr"), emoji: "🪜",
    recommendedFor: ["만 19~34세 청년", "신혼부부 (연소득 6천 이하)", "보증금 3억 이하 전세"],
    pros: ["금리 최저 2.0% ~ 3.1%", "청년·신혼 우대 추가 (최대 0.7%p)", "DSR 적용 제외 (무주택자)"],
    cons: ["자격 까다로움 (소득·나이·무주택)", "한도 작음 (청년 2억, 신혼 3억)"],
  },
  b: {
    name: "시중은행 전세대출", blurb: "주거래은행·인터넷은행 전세대출. 자격 폭 넓음.",
    emoji: "🏦",
    recommendedFor: ["버팀목 자격 미달자", "보증금 3억 초과", "빠른 심사·실행 필요"],
    pros: ["자격 폭 넓음 (대부분 가능)", "한도 크게 받기 가능", "신청·심사 빠름"],
    cons: ["금리 1~2%p 높음", "1주택자는 DSR 적용"],
  },
  scores: [
    { label: "금리 (낮을수록 좋음)", aScore: 10, bScore: 6 },
    { label: "자격 폭", aScore: 5, bScore: 10 },
    { label: "한도", aScore: 6, bScore: 9 },
    { label: "신청 속도", aScore: 7, bScore: 9 },
    { label: "우대 조건", aScore: 10, bScore: 6 },
  ],
  pricing: [
    { plan: "금리", aPrice: "2.0% ~ 3.1%", bPrice: "3.5% ~ 5%", note: "2026 기준" },
    { plan: "한도", aPrice: "청년 2억 / 신혼 3억", bPrice: "보증금 80% 까지 (조건별)" },
    { plan: "DSR", aPrice: "무주택 제외", bPrice: "1주택자 포함" },
  ],
  scenarios: [
    { scenario: "본인이 만 19~34세 무주택 청년", winner: "a", reason: "청년버팀목이 무조건 유리" },
    { scenario: "본인이 신혼 (연소득 6천 이하)", winner: "a", reason: "신혼버팀목 + 자녀 우대까지 가능" },
    { scenario: "본인이 보증금 3억 초과 전세", winner: "b", reason: "버팀목 한도 초과, 시중은행 필수" },
    { scenario: "본인이 일주일 안에 빠르게 실행", winner: "b", reason: "시중은행 심사·실행이 더 빠름" },
    { scenario: "본인이 자격 모호하고 둘 다 알아보고 싶다", winner: "both", reason: "버팀목 자격부터 확인 후 차선책으로 시중" },
  ],
  detailTable: [
    { label: "운영", aValue: "주택도시기금", bValue: "시중은행" },
    { label: "대상", aValue: "청년·신혼·일반 (소득 제한)", bValue: "성인 누구나" },
    { label: "금리", aValue: "2.0% ~ 3.1%", bValue: "3.5% ~ 5%", bigger: "a" },
    { label: "한도", aValue: "청년 2억 / 신혼 3억", bValue: "보증금 80%", bigger: "b" },
    { label: "DSR 적용", aValue: "무주택 제외", bValue: "1주택자 포함", bigger: "a" },
    { label: "신청 속도", aValue: "2~4주", bValue: "1~2주", bigger: "b" },
    { label: "우대", aValue: "청년·신혼·자녀 0.2~0.7%p", bValue: "주거래·급여 0.1~0.3%p" },
    { label: "공급은행", aValue: "9개 시중·국책", bValue: "전 은행" },
  ],
  faq: [
    { q: "버팀목 자격은 어떻게 확인하나요?", a: "주택도시기금(nhuf.molit.go.kr) 또는 은행 전세대출 상담 시 자격 확인 가능. 본인 나이·소득·무주택 여부 기준." },
    { q: "버팀목 + 시중은행 동시 가능한가요?", a: "불가. 한 전세 계약에 한 가지만 적용. 본인 보증금에 맞춰 한 가지 선택." },
    { q: "버팀목 신청 후 거절되면?", a: "자격 미달·서류 보완 사유 확인 후 보완 또는 시중은행 신청. 거절 자체가 신용점수에 영향은 작음." },
    { q: "신혼은 결혼 몇 년까지 인정되나요?", a: "신혼버팀목은 혼인신고 후 7년 이내. 본인 혼인신고일 기준 확인." },
    { q: "전세 계약 후 신청도 가능한가요?", a: "계약 후 잔금일 전까지 가능. 잔금 후 신청은 일부 조건 한정. 가능하면 계약 직후 신청 시작." },
  ],
  relatedChecklists: [
    { slug: "jeonse-contract-safety", label: "전세 계약 체크리스트" },
    { slug: "loan-before-checklist", label: "대출 받기 전 체크리스트" },
  ],
  relatedKeywords: ["버팀목 vs 시중 전세대출", "청년버팀목", "신혼버팀목", "전세대출 금리 비교", "정책 전세대출"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 9. 청년 주택드림 vs 일반 청약통장
// ===========================================================================
const YOUTH_DREAM_VS_GENERAL: Comparison = {
  slug: "youth-housing-dream-vs-general-subscription",
  title: "청년 주택드림 vs 일반 주택청약종합저축 — 본인 자격이면 무조건 청년 드림",
  metaTitle: "청년 주택드림 vs 일반 청약통장 비교",
  shortTitle: "청년드림 vs 일반",
  oneLiner: "만 19~34세 + 연소득 5천 이하 + 무주택자라면 청년 주택드림이 무조건 유리합니다.",
  headline: "기본 금리 1.7%p 높음 + 이자 비과세 500만원. 자격 되면 즉시 전환.",
  description: "청년 주택드림 청약통장과 일반 주택청약종합저축 비교. 자격·금리·비과세·소득공제·청약 가점.",
  longIntro: [
    "두 상품 모두 청약 가점·예치금 기준은 동일하지만 청년 주택드림은 만 19~34세 + 연소득 5천 이하 + 무주택자를 위한 우대 상품입니다.",
    "본인이 청년 자격에 해당하면 우대 금리 1.7%p + 이자소득 500만원 비과세를 추가로 받을 수 있어 누적 5~10년 사이 수십만원 차이가 발생합니다.",
  ],
  a: {
    name: "청년 주택드림", blurb: "청년 전용 우대 청약통장. 금리 + 비과세 추가.",
    iconUrl: fav("nhuf.molit.go.kr"), emoji: "🌟",
    recommendedFor: ["만 19~34세 청년", "연소득 5천만원 이하", "무주택자"],
    pros: ["기본 2.8% + 우대 1.7%p = 최대 4.5%", "이자소득 500만원 비과세", "기존 청약 통장에서 전환 가능 (가입 기간 승계)"],
    cons: ["자격 까다로움 (나이·소득·무주택 모두)", "자격 미달 시 일반 통장으로 자동 전환"],
  },
  b: {
    name: "주택청약종합저축", blurb: "일반 청약통장. 누구나 가입 가능.",
    iconUrl: fav("nhuf.molit.go.kr"), emoji: "🏦",
    recommendedFor: ["만 35세 이상", "연소득 5천 초과", "이미 주택 보유"],
    pros: ["자격 제한 없음 누구나 가입", "청약 가점·예치금 기능 동일", "전환·승계 자유로움"],
    cons: ["우대 금리 없음 (기본 2.8% 만)", "이자 비과세 없음"],
  },
  scores: [
    { label: "금리 (높을수록 좋음)", aScore: 10, bScore: 6 },
    { label: "비과세 혜택", aScore: 10, bScore: 0 },
    { label: "자격 폭", aScore: 4, bScore: 10 },
    { label: "청약 가점·예치금 기능", aScore: 10, bScore: 10 },
    { label: "소득공제", aScore: 10, bScore: 10 },
  ],
  pricing: [
    { plan: "기본 금리", aPrice: "2.8%", bPrice: "2.8%" },
    { plan: "우대 금리", aPrice: "+1.7%p (총 4.5%)", bPrice: "없음" },
    { plan: "비과세", aPrice: "이자 500만원 비과세", bPrice: "없음" },
    { plan: "소득공제", aPrice: "연 240만 (40%)", bPrice: "연 240만 (40%)" },
  ],
  scenarios: [
    { scenario: "본인이 만 19~34세 무주택 청년", winner: "a", reason: "우대 금리 + 비과세로 무조건 청년 드림" },
    { scenario: "본인이 만 35세 이상", winner: "b", reason: "청년 자격 미달, 일반 통장 가입" },
    { scenario: "본인이 이미 주택 보유", winner: "b", reason: "청년 자격 미달, 일반 통장 또는 가입 불필요" },
    { scenario: "본인이 이미 일반 청약통장 보유 + 청년 자격", winner: "a", reason: "전환 신청으로 가입 기간 승계하며 청년 혜택 추가" },
    { scenario: "본인이 만 33~34세 (자격 끝나는 시점)", winner: "a", reason: "자격 끝나도 일반으로 자동 전환되어 가입 손해 없음" },
  ],
  detailTable: [
    { label: "운영", aValue: "주택도시기금", bValue: "주택도시기금" },
    { label: "가입 자격", aValue: "만 19~34세 + 무주택 + 연소득 5천 이하", bValue: "제한 없음", bigger: "b" },
    { label: "기본 금리", aValue: "2.8%", bValue: "2.8%" },
    { label: "우대 금리", aValue: "+1.7%p", bValue: "없음", bigger: "a" },
    { label: "비과세", aValue: "이자 500만원", bValue: "없음", bigger: "a" },
    { label: "소득공제 (무주택)", aValue: "연 240만 한도", bValue: "연 240만 한도" },
    { label: "납입 한도", aValue: "월 100만원", bValue: "월 100만원" },
    { label: "취급 은행", aValue: "9개 시중·국책", bValue: "9개 시중·국책" },
  ],
  faq: [
    { q: "이미 일반 통장 보유 중인데 청년 드림 전환 가능한가요?", a: "네. 청년 자격 충족 시 은행 방문으로 전환 신청. 가입일·납입 횟수·잔액 모두 승계. 당첨 이력 통장은 전환 불가." },
    { q: "청년 자격 잃으면 어떻게 되나요?", a: "만 34세 초과·연소득 5천 초과·주택 취득 시 일반 통장으로 자동 전환. 가입 기간·납입 횟수는 그대로 유지. 손해 없음." },
    { q: "둘 다 청약 1순위 조건 동일한가요?", a: "동일. 청약 가점·예치금 기준은 두 통장이 같음. 우대 혜택만 다름." },
    { q: "비과세 500만원이 정말 큰 차이인가요?", a: "10년 누적 시 약 50~100만원 세금 절약. 단기 큰 차이는 아니지만 10년 이상 보유 시 누적 효과 큼." },
    { q: "청년 자격 모호한데 신청해도 되나요?", a: "은행에서 자격 검증을 실시간 진행하므로 본인이 자격이 안 되면 자동으로 일반 통장으로 가입됨. 시도해도 손해 없음." },
  ],
  relatedChecklists: [{ slug: "housing-subscription-account", label: "청약통장 가입·전환 체크리스트" }],
  relatedKeywords: ["청년 주택드림", "청년 주택드림 청약통장", "청약통장 전환", "청년 청약 우대", "청년 비과세 청약"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 10. 노란우산공제 vs IRP
// ===========================================================================
const NORANUMBRELLA_VS_IRP: Comparison = {
  slug: "noranumbrella-vs-irp",
  title: "노란우산공제 vs IRP 비교 — 1인 사업자·프리랜서 절세 도구 어느 게 유리한가",
  metaTitle: "노란우산공제 vs IRP 비교",
  shortTitle: "노란우산 vs IRP",
  oneLiner: "비상금·폐업 보장은 노란우산, 은퇴 자산·세액공제 폭은 IRP. 둘 다 가능하면 중복 가입.",
  headline: "사업소득자라면 둘 다 가입이 표준. 자금 여유에 따라 한도 분배.",
  description: "노란우산공제와 IRP 의 1인 사업자·프리랜서 절세 비교. 한도·중복 적용·중도 인출.",
  longIntro: [
    "노란우산공제와 IRP 는 사업소득자·프리랜서가 활용할 수 있는 절세 양대 도구. 노란우산은 소득공제 + 폐업·퇴직 시 일시금, IRP 는 세액공제 + 은퇴 자산 운용 목적.",
    "두 제도는 중복 적용 가능. 자금 여유가 되면 둘 다 가입해 절세 효과 극대화. 자금이 한정되면 본인 우선순위에 따라 선택.",
  ],
  a: {
    name: "노란우산공제", blurb: "소상공인 전용 소득공제 + 폐업 보장.",
    iconUrl: fav("kbiz.or.kr"), emoji: "☂️", pickRef: { category: "money", hub: "noranumbrella" },
    recommendedFor: ["사업소득자 (개인사업자·프리랜서)", "비상금·폐업 자금 확보 필요", "단기 인출 가능성 있음"],
    pros: ["소득공제 연 200~500만원 (사업소득별)", "폐업·퇴직 시 일시금 수령", "압류·체납 보호"],
    cons: ["근로소득자는 가입 불가", "운용 수익률 낮음 (단리 약 4%)"],
  },
  b: {
    name: "IRP (개인형 퇴직연금)", blurb: "은퇴 자산 운용 + 세액공제.",
    emoji: "💰",
    recommendedFor: ["은퇴 자산 운용 목적", "근로소득자·사업소득자 모두", "장기 (55세 이후) 보유 가능"],
    pros: ["연 900만원까지 세액공제 (연금저축 + IRP)", "근로·사업·기타소득 모두 가입", "ETF·펀드 운용으로 수익률 추구"],
    cons: ["55세 전 중도 인출 시 16.5% 페널티", "운용 손실 가능 (시장 위험)"],
  },
  scores: [
    { label: "공제 한도", aScore: 7, bScore: 10, note: "IRP 900만원 vs 노란우산 200~500만원" },
    { label: "중도 인출 자유", aScore: 8, bScore: 4 },
    { label: "운용 수익률 가능성", aScore: 5, bScore: 9 },
    { label: "안정성·원금 보장", aScore: 9, bScore: 6 },
    { label: "가입 자격 폭", aScore: 6, bScore: 10 },
  ],
  pricing: [
    { plan: "공제 종류", aPrice: "소득공제", bPrice: "세액공제 (13.2~16.5%)" },
    { plan: "한도 (연)", aPrice: "200~500만원", bPrice: "900만원 (연금저축 + IRP)" },
    { plan: "중도 인출", aPrice: "가능 (수익 차감)", bPrice: "55세 전 16.5% 페널티" },
  ],
  scenarios: [
    { scenario: "본인이 1인 사업자·프리랜서이고 자금 여유 있음", winner: "both", reason: "둘 다 가입이 표준. 노란우산 + IRP 중복 가능" },
    { scenario: "본인이 근로소득자만", winner: "b", reason: "노란우산은 근로소득자 가입 불가" },
    { scenario: "본인이 비상금·단기 인출 가능성 있음", winner: "a", reason: "노란우산이 중도 인출 자유로움" },
    { scenario: "본인이 은퇴 자산 장기 운용 목적", winner: "b", reason: "IRP 의 ETF·펀드 운용 가능" },
    { scenario: "본인 사업소득 4천만원 이하", winner: "a", reason: "노란우산 한도 500만원으로 IRP 보다 유리할 수 있음" },
  ],
  detailTable: [
    { label: "공제 종류", aValue: "소득공제", bValue: "세액공제" },
    { label: "한도", aValue: "200~500만 (소득별)", bValue: "900만 (연금+IRP)", bigger: "b" },
    { label: "가입 자격", aValue: "사업소득자만", bValue: "전 소득자", bigger: "b" },
    { label: "중도 인출", aValue: "가능", bValue: "55세 전 페널티", bigger: "a" },
    { label: "운용 방법", aValue: "단리 약 4%", bValue: "ETF·펀드", bigger: "b" },
    { label: "원금 보장", aValue: "보장", bValue: "투자 상품 따라 다름", bigger: "a" },
    { label: "압류 보호", aValue: "있음", bValue: "있음" },
    { label: "절세 효과 (연소득 6천 기준)", aValue: "약 70~150만원", bValue: "약 100~150만원" },
  ],
  faq: [
    { q: "노란우산과 IRP 중복 가입 가능한가요?", a: "네. 두 제도는 중복 적용. 사업소득자가 둘 다 가입하면 절세 효과가 누적되어 가장 큼." },
    { q: "노란우산 한도는 어떻게 결정되나요?", a: "사업소득 기준 — 4천만 이하 500만, 4천~1억 300만, 1억 초과 200만. 본인 사업소득에 따라 자동 결정." },
    { q: "IRP 중도 인출 페널티는 얼마인가요?", a: "55세 전 인출 시 기타소득세 16.5% 부과. 단 무주택자 주택 구입·6개월 이상 요양 등 특정 사유는 일반세율 적용." },
    { q: "근로자도 노란우산 가입 가능한가요?", a: "아닙니다. 노란우산은 사업소득자(소상공인) 전용. 근로자는 IRP 만 가입 가능." },
    { q: "어느 게 더 큰 절세 효과인가요?", a: "사업소득 4천 이하면 노란우산 500만 + IRP 900만 = 약 1,400만원 공제. 둘 다 가입이 가장 큰 절세." },
  ],
  relatedChecklists: [{ slug: "business-registration-30day", label: "사업자등록 후 30일 체크리스트" }],
  relatedKeywords: ["노란우산공제 IRP", "사업자 절세", "프리랜서 절세", "노란우산 한도", "IRP 세액공제"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 11. 간이과세 vs 일반과세
// ===========================================================================
const SIMPLE_VS_GENERAL_TAX: Comparison = {
  slug: "simple-vs-general-tax",
  title: "간이과세자 vs 일반과세자 비교 — 본인 사업에 어느 게 유리한가",
  metaTitle: "간이과세 vs 일반과세 비교",
  shortTitle: "간이 vs 일반",
  oneLiner: "매출 1억 400만원 미만·소비자 거래 중심이면 간이, 매입세액 환급·세금계산서 발행 필요하면 일반.",
  headline: "간이는 세율 낮지만 세금계산서 발행·매입 환급 제한. 일반은 행정 부담 크지만 환급·발행 가능.",
  description: "사업자 과세 유형 간이과세와 일반과세 비교. 세율·신고 주기·세금계산서·매입세액 공제·전환.",
  longIntro: [
    "간이과세자는 직전 연도 매출 1억 400만원 미만 사업자 대상으로 세율이 낮은(1.5~4%) 대신 매입세액 공제와 세금계산서 발행이 제한됩니다.",
    "일반과세자는 매출 제한 없고 세금계산서 발행·매입세액 공제(전액) 가능하지만 부가세 신고 주기가 잦고(연 2회 + 분기 예정) 신고 행정 부담이 큽니다.",
    "본인 사업의 매출 구조·거래처 유형·매입 규모를 종합 판단해 선택. 매년 매출 추이에 따라 자동 전환될 수도 있습니다.",
  ],
  a: {
    name: "간이과세자", blurb: "세율 낮은 소규모 사업자 전용 유형.",
    iconUrl: fav("hometax.go.kr"), emoji: "🟢",
    recommendedFor: ["직전 연도 매출 1억 400만 미만", "주로 소비자 대상 거래", "매입세액 적은 업종"],
    pros: ["세율 낮음 (1.5~4%)", "신고 연 1회 (1월)", "행정 부담 작음"],
    cons: ["세금계산서 발행 제한 (4,800만 미만)", "매입세액 공제 0.5% 만"],
  },
  b: {
    name: "일반과세자", blurb: "표준 사업자 유형. 세금계산서 발행·매입 환급 가능.",
    iconUrl: fav("hometax.go.kr"), emoji: "🔵",
    recommendedFor: ["거래처가 사업자 (세금계산서 요구)", "매입세액 큰 업종 (제조·도소매)", "매출 1억 400만 이상"],
    pros: ["세금계산서 발행 자유", "매입세액 전액 공제", "B2B 거래 표준"],
    cons: ["세율 10% (매출의 10%)", "신고 연 2회 + 분기 예정", "행정 부담 큼"],
  },
  scores: [
    { label: "세율 (낮을수록 좋음)", aScore: 10, bScore: 5 },
    { label: "행정 부담 (낮을수록 좋음)", aScore: 10, bScore: 5 },
    { label: "세금계산서 발행", aScore: 4, bScore: 10 },
    { label: "매입세액 공제", aScore: 3, bScore: 10 },
    { label: "B2B 거래 적합성", aScore: 4, bScore: 10 },
  ],
  pricing: [
    { plan: "세율", aPrice: "1.5~4%", bPrice: "10%" },
    { plan: "매출 한도", aPrice: "1억 400만 미만", bPrice: "제한 없음" },
    { plan: "신고 주기", aPrice: "연 1회 (1월)", bPrice: "연 2회 (1·7월) + 분기 예정 (4·10월)" },
  ],
  scenarios: [
    { scenario: "본인이 소매·음식·서비스업 (소비자 거래 중심)", winner: "a", reason: "세금계산서 발행 부담 적고 세율 낮음" },
    { scenario: "본인이 B2B 거래 (거래처가 사업자)", winner: "b", reason: "거래처가 세금계산서 요구. 일반과세 필수" },
    { scenario: "본인이 매입세액이 큰 업종 (제조·도소매)", winner: "b", reason: "매입세액 전액 공제로 부가세 환급 가능" },
    { scenario: "본인 매출 1억 400만 초과", winner: "b", reason: "자동 일반과세 전환. 선택 여지 없음" },
    { scenario: "본인이 초기 매출 불안정", winner: "a", reason: "간이로 시작 후 매출 늘면 자동 전환" },
  ],
  detailTable: [
    { label: "매출 한도", aValue: "1억 400만 미만", bValue: "제한 없음" },
    { label: "세율", aValue: "1.5~4%", bValue: "10%", bigger: "a" },
    { label: "세금계산서 발행", aValue: "4,800만 미만 불가", bValue: "자유", bigger: "b" },
    { label: "매입세액 공제", aValue: "0.5%", bValue: "100%", bigger: "b" },
    { label: "신고 주기", aValue: "연 1회", bValue: "연 2회 + 분기 예정", bigger: "a" },
    { label: "환급 가능 여부", aValue: "불가", bValue: "가능", bigger: "b" },
    { label: "자동 전환", aValue: "매출 1억 초과 시 일반으로", bValue: "매출 4,800만 미만 시 간이로 (선택)" },
    { label: "행정 부담", aValue: "작음", bValue: "큼", bigger: "a" },
  ],
  faq: [
    { q: "간이에서 일반으로 자동 전환되는 시점은 언제인가요?", a: "직전 연도 매출이 1억 400만원 초과 시 다음 해 7월 1일부터 일반과세자로 자동 전환." },
    { q: "일반에서 간이로 되돌릴 수 있나요?", a: "가능. 직전 연도 매출 4,800만 미만일 때 본인이 선택 신청. 다만 거래처 영향·세금계산서 발행 영향을 고려." },
    { q: "간이과세자가 세금계산서 못 발행하면 거래처가 못 받나요?", a: "간이과세자 중 매출 4,800만 이상은 세금계산서 발행 가능. 미만은 영수증·간이영수증만 가능." },
    { q: "초기 사업자는 어느 게 자동 적용되나요?", a: "신규 사업자는 기본 간이과세 적용 (선택 시 일반 가능). 첫 해 매출 결과로 다음 해 자동 결정." },
    { q: "면세 사업자(940306 등) 는?", a: "1인 미디어·인적 용역 같은 면세 사업자는 부가세 자체가 면제이므로 간이·일반 구분이 의미 없음. 사업장현황신고만 의무." },
  ],
  relatedChecklists: [
    { slug: "business-registration-30day", label: "사업자등록 후 30일 체크리스트" },
    { slug: "freelance-first-contract", label: "외주·프리랜서 첫 계약" },
  ],
  relatedKeywords: ["간이과세 일반과세", "간이과세 자격", "사업자 부가세", "간이과세 세금계산서", "간이 일반 전환"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 12. 업비트 vs 빗썸
// ===========================================================================
const UPBIT_VS_BITHUMB: Comparison = {
  slug: "upbit-vs-bithumb",
  title: "업비트 vs 빗썸 비교 — 한국 코인거래소 양강 어느 게 본인한테 맞나",
  metaTitle: "업비트 vs 빗썸 비교",
  shortTitle: "업비트 vs 빗썸",
  oneLiner: "거래량·안정성·초보 추천은 업비트, 코인 종류·낮은 수수료는 빗썸이 유리합니다.",
  headline: "업비트 점유율 71.6%, 빗썸 25%. 두 거래소가 한국 시장의 96% 차지.",
  description: "한국 1·2위 코인거래소 업비트와 빗썸 비교. 수수료·코인 수·보안·UI·거래량.",
  longIntro: [
    "업비트는 한국 점유율 71.6% 의 압도적 1위로 초보자에게 가장 적합하고, 빗썸은 약 25% 로 알트코인 투자자·낮은 수수료 선호자에게 인기.",
    "두 거래소 모두 원화 입금·KYC 가능. 본인 거래 패턴(메이저 코인 중심 vs 알트코인 다양) 에 따라 선택이 갈립니다.",
  ],
  a: {
    name: "업비트", blurb: "한국 점유율 1위. 안정성·UI·거래량 최상.",
    iconUrl: fav("upbit.com"), emoji: "🟦", pickRef: { category: "coin", hub: "upbit" },
    recommendedFor: ["코인 입문자", "메이저 코인 중심 거래", "안정성·신뢰도 최우선"],
    pros: ["거래량 압도적 1위", "글로벌 신뢰도 (포브스 평가)", "UI 직관적·앱 안정"],
    cons: ["수수료 메이커·테이커 0.05%", "빗썸 대비 상장 코인 적음"],
  },
  b: {
    name: "빗썸", blurb: "한국 2위. 코인 종류 가장 많고 수수료 낮음.",
    iconUrl: fav("bithumb.com"), emoji: "🟥",
    recommendedFor: ["알트코인 다양 투자자", "낮은 수수료 선호", "신규 상장 빠른 이용"],
    pros: ["수수료 최저 0.04%", "상장 코인 448개 (국내 최다)", "신규 상장 빠름"],
    cons: ["과거 보안 사고 이력", "거래량 업비트 대비 낮음"],
  },
  scores: [
    { label: "거래량·유동성", aScore: 10, bScore: 7 },
    { label: "코인 종류 다양성", aScore: 6, bScore: 10 },
    { label: "수수료 (낮을수록 좋음)", aScore: 8, bScore: 10 },
    { label: "보안·신뢰도", aScore: 9, bScore: 7 },
    { label: "UI·앱 편의성", aScore: 10, bScore: 8 },
    { label: "신규 코인 상장 속도", aScore: 7, bScore: 10 },
  ],
  pricing: [
    { plan: "거래 수수료", aPrice: "0.05%", bPrice: "0.04%", note: "빗썸이 0.01%p 저렴" },
    { plan: "원화 입출금", aPrice: "케이뱅크 연동", bPrice: "NH농협 연동" },
    { plan: "최소 거래", aPrice: "5,000원", bPrice: "1,000원" },
  ],
  scenarios: [
    { scenario: "본인이 코인 입문자", winner: "a", reason: "업비트가 UI·안정성 압도적, 초보 학습 자료 풍부" },
    { scenario: "본인이 알트코인 다양하게 투자", winner: "b", reason: "빗썸 상장 코인 448개로 국내 최다" },
    { scenario: "본인이 수수료에 민감 (단타·헤비 트레이더)", winner: "b", reason: "수수료 0.01%p 차이가 누적 시 큼" },
    { scenario: "본인이 케이뱅크 사용자", winner: "a", reason: "업비트 원화 입출금 즉시 가능" },
    { scenario: "본인이 NH농협 사용자", winner: "b", reason: "빗썸 원화 입출금 즉시 가능" },
    { scenario: "본인이 둘 다 가입하고 싶다", winner: "both", reason: "분산 투자·거래소 리스크 분산 차원에서 흔함" },
  ],
  detailTable: [
    { label: "한국 점유율", aValue: "71.6%", bValue: "25%", bigger: "a" },
    { label: "거래 수수료", aValue: "0.05%", bValue: "0.04%", bigger: "b" },
    { label: "상장 코인", aValue: "301개", bValue: "448개", bigger: "b" },
    { label: "원화 입출금 은행", aValue: "케이뱅크", bValue: "NH농협" },
    { label: "UI·앱", aValue: "최상", bValue: "양호", bigger: "a" },
    { label: "글로벌 평가", aValue: "포브스 신뢰 7위", bValue: "-", bigger: "a" },
    { label: "신규 상장", aValue: "심사 까다로움", bValue: "빠름", bigger: "b" },
    { label: "KYC 절차", aValue: "엄격", bValue: "엄격" },
  ],
  faq: [
    { q: "둘 다 가입해도 되나요?", a: "네. 본인 KYC 만 통과하면 양쪽 동시 가입 가능. 분산 거래·거래소 리스크 분산 차원에서 흔히 사용." },
    { q: "수수료 0.01%p 차이가 정말 큰가요?", a: "단타·헤비 트레이더에게는 누적 효과가 큼 (월 100회 거래 시 수만원). 일반 투자자는 큰 차이 없음." },
    { q: "보안은 어디가 더 안전한가요?", a: "업비트는 최근 사고 없고 글로벌 평가 우세. 빗썸은 과거 사고 이력 있으나 최근 보안 강화. 본인 자산 분산 보관 권장." },
    { q: "원화 입출금 즉시 가능한가요?", a: "본인 거래소 연결 은행(업비트-케이뱅크·빗썸-NH농협) 계좌라야 즉시 가능. 다른 은행은 지연 발생." },
    { q: "신규 코인이 더 빨리 올라오는 곳은?", a: "빗썸이 일반적으로 빠름. 다만 신규 상장은 가격 변동성 큰 위험 자산이라 본인 책임 하 거래." },
  ],
  relatedPicks: [
    { category: "coin", hub: "upbit", label: "업비트 자세히" },
  ],
  relatedKeywords: ["업비트 빗썸", "한국 코인거래소", "코인 수수료 비교", "원화마켓", "코인 입문"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 13. 업비트 vs 코인원
// ===========================================================================
const UPBIT_VS_COINONE: Comparison = {
  slug: "upbit-vs-coinone",
  title: "업비트 vs 코인원 비교 — 거래량 vs 보안 어디에 가치를 둘까",
  metaTitle: "업비트 vs 코인원 비교",
  shortTitle: "업비트 vs 코인원",
  oneLiner: "거래량·UI 는 업비트, 보안·스테이킹 같은 부가 서비스는 코인원이 유리합니다.",
  headline: "코인원 = 한국 최초 비트코인 스테이킹. 보안 이력 무사고.",
  description: "업비트와 코인원의 한국 코인거래소 비교. 수수료·보안·스테이킹·코인 수.",
  longIntro: [
    "업비트는 거래량·UI 압도적 1위, 코인원은 한국 최초 비트코인 스테이킹(Babylon) 서비스로 패시브 수익을 원하는 중급 투자자에게 인기.",
    "두 거래소 모두 KYC 통과 후 사용. 거래량 중시면 업비트, 부가 서비스(스테이킹·디파이) 중시면 코인원.",
  ],
  a: {
    name: "업비트", blurb: "한국 거래량 1위. 안정성·UI 최상.",
    iconUrl: fav("upbit.com"), emoji: "🟦", pickRef: { category: "coin", hub: "upbit" },
    recommendedFor: ["거래량·유동성 중시", "메이저 코인 거래", "초보자"],
    pros: ["거래량 압도적", "UI 직관적", "글로벌 신뢰도 높음"],
    cons: ["스테이킹 서비스 제한", "코인 종류 코인원보다 적음"],
  },
  b: {
    name: "코인원", blurb: "보안 무사고 + 한국 최초 비트코인 스테이킹.",
    iconUrl: fav("coinone.co.kr"), emoji: "🟧",
    recommendedFor: ["보안 최우선 투자자", "스테이킹·디파이 관심", "중급 투자자"],
    pros: ["설립 이후 해킹 사고 0건", "비트코인 스테이킹 (Babylon)", "코인 종류 385개"],
    cons: ["거래량 업비트 대비 낮음", "UI 업비트보다 학습 곡선"],
  },
  scores: [
    { label: "거래량·유동성", aScore: 10, bScore: 6 },
    { label: "보안 이력", aScore: 9, bScore: 10 },
    { label: "스테이킹·부가 서비스", aScore: 6, bScore: 9 },
    { label: "코인 종류", aScore: 7, bScore: 8 },
    { label: "UI·편의성", aScore: 10, bScore: 7 },
  ],
  pricing: [
    { plan: "거래 수수료", aPrice: "0.05%", bPrice: "0.20% (Maker 0.10%)" },
    { plan: "원화 입출금", aPrice: "케이뱅크", bPrice: "카카오뱅크" },
    { plan: "스테이킹 수수료", aPrice: "없음 (서비스 제한)", bPrice: "수익의 일정 %" },
  ],
  scenarios: [
    { scenario: "본인이 단기 거래·메이저 코인 중심", winner: "a", reason: "업비트 거래량·수수료가 유리" },
    { scenario: "본인이 비트코인 스테이킹으로 패시브 수익", winner: "b", reason: "코인원 Babylon 스테이킹 한국 최초" },
    { scenario: "본인이 보안을 가장 중시", winner: "b", reason: "코인원 무사고 이력" },
    { scenario: "본인이 카카오뱅크 사용자", winner: "b", reason: "코인원 원화 입출금 카카오뱅크 연동" },
    { scenario: "본인이 초보자", winner: "a", reason: "업비트 UI·학습 자료 풍부" },
  ],
  detailTable: [
    { label: "한국 점유율", aValue: "71.6%", bValue: "약 2~3%", bigger: "a" },
    { label: "거래 수수료", aValue: "0.05%", bValue: "0.20%", bigger: "a" },
    { label: "보안 사고 이력", aValue: "최근 무사고", bValue: "설립 후 무사고", bigger: "b" },
    { label: "코인 수", aValue: "301개", bValue: "385개", bigger: "b" },
    { label: "스테이킹", aValue: "제한적", bValue: "비트코인 스테이킹 (Babylon)", bigger: "b" },
    { label: "원화 입출금", aValue: "케이뱅크", bValue: "카카오뱅크" },
    { label: "UI", aValue: "최상", bValue: "양호", bigger: "a" },
    { label: "KYC", aValue: "엄격", bValue: "엄격" },
  ],
  faq: [
    { q: "코인원 스테이킹 수익률은 어느 정도인가요?", a: "비트코인 Babylon 스테이킹 약 연 3~7% 변동. 시점·물량·수수료에 따라 다르므로 코인원 공식 안내 확인." },
    { q: "코인원이 정말 한 번도 해킹된 적이 없나요?", a: "설립 이후 거래소 자체 해킹 사고는 공식 발표 없음. 다만 본인 계정 비밀번호·2FA 관리는 별개." },
    { q: "코인원 수수료가 업비트보다 비싼데 왜 쓰나요?", a: "보안 이력·스테이킹·디파이 같은 부가 서비스 가치를 보고 선택. 거래량보다 자산 운용에 중점." },
    { q: "두 거래소 둘 다 가입 가능한가요?", a: "가능. 분산 보관·거래소 리스크 분산 측면에서 흔히 사용. KYC 만 통과하면 동시 가입." },
    { q: "코인원도 코인 종류가 많은가요?", a: "네. 385개로 빗썸(448) 보다 적지만 업비트(301) 보다 많음." },
  ],
  relatedPicks: [
    { category: "coin", hub: "upbit", label: "업비트 자세히" },
  ],
  relatedKeywords: ["업비트 코인원", "비트코인 스테이킹", "코인원 보안", "한국 코인거래소", "Babylon"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 14. 코빗 vs 코인원
// ===========================================================================
const KORBIT_VS_COINONE: Comparison = {
  slug: "korbit-vs-coinone",
  title: "코빗 vs 코인원 비교 — 한국 코인거래소 3·4위 어느 게 더 안전한가",
  metaTitle: "코빗 vs 코인원 비교",
  shortTitle: "코빗 vs 코인원",
  oneLiner: "두 거래소 모두 보안 무사고. 코인원은 스테이킹·코인 종류, 코빗은 안정성·신한은행 연동이 강점.",
  headline: "두 곳 모두 마이너 점유율이지만 보안·안정성 면에서 평가 양호.",
  description: "한국 3·4위 코인거래소 코빗과 코인원 비교. 보안·코인 종류·은행 연동·수수료.",
  longIntro: [
    "코빗과 코인원은 한국 코인거래소 3·4위로 점유율은 작지만 두 거래소 모두 설립 이후 큰 보안 사고가 없는 안정적인 사업자.",
    "코인원은 코인 종류·스테이킹 서비스가 강점, 코빗은 신한은행 연동·안정적 운영이 강점. 본인 사용 패턴에 따라 선택.",
  ],
  a: {
    name: "코빗", blurb: "한국 4위 거래소. 신한은행 연동·안정성.",
    iconUrl: fav("korbit.co.kr"), emoji: "🟪",
    recommendedFor: ["신한은행 사용자", "안정적 운영 선호", "메이저 코인 중심"],
    pros: ["신한은행 원화 입출금", "보안 사고 이력 적음", "꾸준한 운영"],
    cons: ["코인 종류 적음 (202개)", "거래량·유동성 낮음"],
  },
  b: {
    name: "코인원", blurb: "한국 3위 거래소. 코인 종류·스테이킹 강점.",
    iconUrl: fav("coinone.co.kr"), emoji: "🟧",
    recommendedFor: ["다양한 알트코인 거래", "스테이킹·디파이 관심", "보안 중시"],
    pros: ["코인 종류 385개", "비트코인 스테이킹 (Babylon)", "보안 무사고"],
    cons: ["거래량 업비트·빗썸 대비 낮음", "수수료 다소 높음"],
  },
  scores: [
    { label: "보안 이력", aScore: 9, bScore: 10 },
    { label: "코인 종류", aScore: 5, bScore: 9 },
    { label: "거래량·유동성", aScore: 5, bScore: 7 },
    { label: "스테이킹·부가 서비스", aScore: 5, bScore: 9 },
    { label: "은행 연동 편의", aScore: 8, bScore: 8 },
  ],
  pricing: [
    { plan: "거래 수수료", aPrice: "0.20% (Maker 0.08%)", bPrice: "0.20% (Maker 0.10%)" },
    { plan: "원화 입출금", aPrice: "신한은행", bPrice: "카카오뱅크" },
    { plan: "스테이킹", aPrice: "일부", bPrice: "비트코인·이더리움 등" },
  ],
  scenarios: [
    { scenario: "본인이 신한은행 사용자", winner: "a", reason: "코빗 신한 연동 원화 입출금 즉시" },
    { scenario: "본인이 카카오뱅크 사용자", winner: "b", reason: "코인원 카카오뱅크 연동" },
    { scenario: "본인이 스테이킹으로 패시브 수익", winner: "b", reason: "코인원 Babylon 스테이킹" },
    { scenario: "본인이 다양한 알트코인 거래", winner: "b", reason: "코인원 385 vs 코빗 202" },
    { scenario: "본인이 보안만 보고 거래소 선택", winner: "both", reason: "둘 다 무사고 이력. 본인 은행·코인 취향으로 결정" },
  ],
  detailTable: [
    { label: "한국 점유율", aValue: "약 2%", bValue: "약 2~3%" },
    { label: "거래 수수료", aValue: "0.20%", bValue: "0.20%" },
    { label: "코인 종류", aValue: "202개", bValue: "385개", bigger: "b" },
    { label: "원화 입출금", aValue: "신한은행", bValue: "카카오뱅크" },
    { label: "스테이킹", aValue: "일부", bValue: "비트코인·이더리움", bigger: "b" },
    { label: "보안 이력", aValue: "양호", bValue: "무사고" },
    { label: "거래량", aValue: "낮음", bValue: "중간" },
    { label: "KYC", aValue: "엄격", bValue: "엄격" },
  ],
  faq: [
    { q: "두 거래소가 정말 안전한가요?", a: "두 거래소 모두 설립 이후 큰 보안 사고가 없고 KYC·자금세탁방지 절차 준수. 다만 본인 계정 보안(2FA·비번 관리) 은 별개." },
    { q: "왜 점유율이 낮은데도 선택하는 사람이 있나요?", a: "특정 은행 연동 편의·보안 이력·스테이킹 같은 부가 서비스 때문. 본인 우선순위에 따라." },
    { q: "마이너 거래소 폐업 위험은?", a: "두 거래소는 한국 가상자산사업자 정식 등록 사업자. 폐업 위험은 낮지만 일반적으로 자산을 한 곳에 몰아두지 않는 게 표준 관리." },
    { q: "수수료가 업비트보다 비싼데 단점인가요?", a: "단타·헤비 트레이더에게는 중요하지만 장기 보유 투자자에게는 큰 영향 없음." },
    { q: "코빗 신한 연동의 장점은?", a: "신한은행 계좌라면 입출금 즉시 처리. 다른 은행은 지연 가능." },
  ],
  relatedKeywords: ["코빗 코인원", "한국 코인거래소", "코인 스테이킹", "신한은행 코인", "안전한 거래소"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 15. 호갱노노 vs 직방
// ===========================================================================
const HOGANGNONO_VS_ZIGBANG: Comparison = {
  slug: "hogangnono-vs-zigbang",
  title: "호갱노노 vs 직방 비교 — 부동산 시세·매물 어느 앱이 본인에게 맞나",
  metaTitle: "호갱노노 vs 직방 비교",
  shortTitle: "호갱노노 vs 직방",
  oneLiner: "아파트 시세·재건축은 호갱노노, 빌라·원룸·매물 검색은 직방이 유리합니다.",
  headline: "호갱노노 = 시세 데이터·정보 강점. 직방 = 매물·중개 강점.",
  description: "부동산 시세·매물 앱 호갱노노와 직방 비교. 강점·약점·사용 시나리오.",
  longIntro: [
    "호갱노노는 아파트 실거래가·재건축·시세 추이를 보는 데 가장 풍부한 데이터를 제공하고, 직방은 빌라·원룸·오피스텔 매물 검색에 강점.",
    "본인 목적이 시세 분석(매수·매도 결정 전) 이면 호갱노노, 실제 매물 구하기면 직방. 두 앱을 병행해서 쓰는 게 일반적.",
  ],
  a: {
    name: "호갱노노", blurb: "아파트 시세·실거래가·재건축 정보 데이터 강점.",
    iconUrl: fav("hogangnono.com"), emoji: "📊", pickRef: { category: "realestate", hub: "hogangnono" },
    recommendedFor: ["아파트 시세 분석", "재건축·재개발 추적", "매수·매도 결정 전 조사"],
    pros: ["아파트 시세·실거래가 풍부", "단지 알림 기능", "재건축·평면도·학군 정보"],
    cons: ["빌라·원룸 매물 약함", "중개 기능 없음"],
  },
  b: {
    name: "직방", blurb: "빌라·원룸·오피스텔 매물 검색·중개 강점.",
    iconUrl: fav("zigbang.com"), emoji: "🔑",
    recommendedFor: ["원룸·빌라 매물 검색", "전월세 구하기", "공인중개사 연결"],
    pros: ["빌라·원룸·오피스텔 매물 다수", "VR 매물 보기", "중개사 연결"],
    cons: ["시세 분석 데이터 호갱노노 대비 약함", "매물 정확성 편차 큼"],
  },
  scores: [
    { label: "아파트 시세 데이터", aScore: 10, bScore: 7 },
    { label: "빌라·원룸 매물", aScore: 5, bScore: 10 },
    { label: "재건축·재개발 정보", aScore: 10, bScore: 6 },
    { label: "중개·계약 연결", aScore: 4, bScore: 10 },
    { label: "단지 알림·추적", aScore: 10, bScore: 7 },
  ],
  pricing: [
    { plan: "기본 사용", aPrice: "무료", bPrice: "무료" },
    { plan: "프리미엄", aPrice: "없음", bPrice: "없음" },
  ],
  scenarios: [
    { scenario: "본인이 아파트 시세 추적·재건축 분석", winner: "a", reason: "호갱노노 데이터 가장 풍부" },
    { scenario: "본인이 원룸·빌라 전월세 구하기", winner: "b", reason: "직방 매물 가장 많음" },
    { scenario: "본인이 매수 전 시세 비교 + 매물 확인", winner: "both", reason: "호갱노노로 시세 + 직방으로 매물 병행" },
    { scenario: "본인이 공인중개사 연결 받고 싶다", winner: "b", reason: "직방이 중개사 매칭 기능 강점" },
    { scenario: "본인이 단지 가격 변동 알림 받고 싶다", winner: "a", reason: "호갱노노 단지 알림 기능 효과적" },
  ],
  detailTable: [
    { label: "주력 매물", aValue: "아파트", bValue: "빌라·원룸·오피스텔" },
    { label: "시세 데이터", aValue: "매우 풍부", bValue: "양호", bigger: "a" },
    { label: "매물 검색", aValue: "양호", bValue: "매우 풍부", bigger: "b" },
    { label: "재건축 정보", aValue: "강점", bValue: "보통", bigger: "a" },
    { label: "VR·매물 사진", aValue: "양호", bValue: "VR 강점", bigger: "b" },
    { label: "중개사 연결", aValue: "제한적", bValue: "강점", bigger: "b" },
    { label: "단지 알림", aValue: "있음", bValue: "있음" },
    { label: "사용 비용", aValue: "무료", bValue: "무료" },
  ],
  faq: [
    { q: "둘 다 무료로 쓸 수 있나요?", a: "네. 기본 검색·시세 조회는 둘 다 무료. 일부 중개 서비스는 별도 비용." },
    { q: "두 앱 데이터가 다르면 어느 게 정확한가요?", a: "둘 다 국토부 실거래가 공개 데이터를 기반. 다만 표시 시점·필터 차이로 다르게 보일 수 있음. 본인 매수·매도 결정 전 국토부 사이트 직접 확인 권장." },
    { q: "직방으로 빌라 전세 사기 예방되나요?", a: "직방 자체가 사기 예방 도구는 아님. 매물 정보만 제공. 본인이 등기부등본·전세보증보험 확인 별도로." },
    { q: "호갱노노에서 본인 단지 가격 변동 알림 받으려면?", a: "관심 단지 검색 후 알림 등록. 신규 실거래·가격 변동·뉴스 발생 시 이메일·앱 푸시." },
    { q: "어느 앱이 더 신뢰할 만한가요?", a: "용도별로 다름. 시세 분석은 호갱노노, 매물 검색은 직방. 본인 목적에 맞춰 선택." },
  ],
  relatedPicks: [{ category: "realestate", hub: "hogangnono", label: "호갱노노 자세히" }],
  relatedChecklists: [{ slug: "jeonse-contract-safety", label: "전세 계약 체크리스트" }],
  relatedKeywords: ["호갱노노 직방", "부동산 앱 비교", "아파트 시세", "빌라 전세", "원룸 매물"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 16. 야놀자 vs 여기어때
// ===========================================================================
const YANOLJA_VS_YEOGI: Comparison = {
  slug: "yanolja-vs-yeogi",
  title: "야놀자 vs 여기어때 비교 — 국내 숙박 예약 어느 게 본인한테 맞나",
  metaTitle: "야놀자 vs 여기어때 비교",
  shortTitle: "야놀자 vs 여기어때",
  oneLiner: "프로모션·해외 호텔은 야놀자, 가성비·국내 모텔·풀빌라는 여기어때가 강점입니다.",
  headline: "두 앱 다 매일 가격이 다르므로 같은 숙소를 양쪽에서 비교 후 예매.",
  description: "국내 숙박 예약 양대 앱 야놀자와 여기어때 비교. 가격·할인·해외·후기.",
  longIntro: [
    "야놀자와 여기어때는 한국 숙박 예약 1·2위 앱. 같은 숙소가 양쪽에 등록되어 있는 경우가 많고 가격·할인 쿠폰이 매일 다르므로 양쪽 비교가 표준 패턴.",
    "야놀자는 해외 호텔·프로모션 폭, 여기어때는 국내 모텔·풀빌라·가성비 강점.",
  ],
  a: {
    name: "야놀자", blurb: "국내 1위 숙박 예약 앱. 해외 호텔·프로모션 강점.",
    iconUrl: fav("yanolja.com"), emoji: "🏨",
    recommendedFor: ["해외 호텔 예약 필요", "대규모 프로모션 활용", "포인트·멤버십 적립"],
    pros: ["해외 호텔 연동 (인터파크 등)", "대규모 프로모션·할인 빈번", "포인트 적립·전환"],
    cons: ["국내 모텔 가격이 여기어때보다 비싼 경우", "후기 양 여기어때 대비 적음"],
  },
  b: {
    name: "여기어때", blurb: "국내 모텔·풀빌라·가성비 강점.",
    iconUrl: fav("yeogi.com"), emoji: "🏩",
    recommendedFor: ["국내 모텔·풀빌라 위주 예약", "가성비 최우선", "후기 많이 보고 결정"],
    pros: ["국내 모텔·풀빌라 가성비 강점", "후기 양 많음", "특가 카테고리 풍부"],
    cons: ["해외 호텔 약함", "프로모션 폭 야놀자 대비 작음"],
  },
  scores: [
    { label: "해외 호텔", aScore: 9, bScore: 5 },
    { label: "국내 모텔·풀빌라", aScore: 8, bScore: 10 },
    { label: "가격 (가성비)", aScore: 7, bScore: 9 },
    { label: "후기 양", aScore: 7, bScore: 9 },
    { label: "프로모션·할인", aScore: 10, bScore: 8 },
  ],
  pricing: [
    { plan: "기본 사용", aPrice: "무료", bPrice: "무료" },
    { plan: "멤버십", aPrice: "포인트 적립·전환", bPrice: "스탬프·할인 쿠폰" },
  ],
  scenarios: [
    { scenario: "본인이 해외 여행 호텔 예약", winner: "a", reason: "야놀자 해외 호텔 연동·인터파크 통합" },
    { scenario: "본인이 국내 모텔·풀빌라 위주", winner: "b", reason: "여기어때 모텔·풀빌라 매물·가성비" },
    { scenario: "본인이 같은 숙소 가장 싼 가격 찾기", winner: "both", reason: "두 앱 모두 검색해 비교가 표준" },
    { scenario: "본인이 후기 많이 보고 결정하는 타입", winner: "b", reason: "여기어때 후기 양 더 많음" },
    { scenario: "본인이 프로모션·이벤트 자주 활용", winner: "a", reason: "야놀자 대규모 프로모션 빈번" },
  ],
  detailTable: [
    { label: "국내 점유율", aValue: "1위", bValue: "2위" },
    { label: "해외 호텔", aValue: "강점", bValue: "약함", bigger: "a" },
    { label: "국내 모텔·풀빌라", aValue: "양호", bValue: "강점", bigger: "b" },
    { label: "프로모션", aValue: "매우 활발", bValue: "활발", bigger: "a" },
    { label: "후기 양", aValue: "양호", bValue: "매우 많음", bigger: "b" },
    { label: "포인트·멤버십", aValue: "포인트 적립", bValue: "스탬프" },
    { label: "사용 비용", aValue: "무료", bValue: "무료" },
    { label: "고객센터", aValue: "24시간", bValue: "24시간" },
  ],
  faq: [
    { q: "같은 숙소가 두 앱에서 가격이 다른가요?", a: "네. 매일 다르고 쿠폰·프로모션 적용 시 차이가 큼. 본인 예매 전 양쪽 검색 후 더 저렴한 곳 선택이 표준." },
    { q: "야놀자에서 해외 호텔도 예약 가능한가요?", a: "네. 인터파크 등 해외 호텔 시스템과 연동. 다만 본격적 해외 여행은 Booking·Agoda·Hotels.com 같은 글로벌 사이트가 가격이 더 좋을 수 있음." },
    { q: "두 앱 다 멤버십 가입할 가치가 있나요?", a: "본인 평소 이용 빈도에 따라. 월 1~2번 이상 예매하면 멤버십 포인트 효과 있지만 가끔 예매면 큰 차이 없음." },
    { q: "후기 신뢰할 만한가요?", a: "기본적으로 검증 후 게재되지만 일부 광고성 후기 가능. 다수 후기 + 최근 작성된 것 + 사진 첨부된 것 위주로 판단." },
    { q: "취소·환불 정책은 어떻게 되나요?", a: "숙소별·예약 시점별 다름. 본인 예매 전 취소 규정 확인. 일반적으로 체크인 3~7일 전까지 무료 취소 가능 옵션 있음." },
  ],
  relatedPicks: [{ category: "travel", hub: "yanolja", label: "야놀자 자세히" }],
  relatedKeywords: ["야놀자 여기어때", "숙박 예약 앱", "국내 모텔", "해외 호텔", "여행 가성비"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 17. 쿠팡 vs 네이버쇼핑
// ===========================================================================
const COUPANG_VS_NAVER_SHOPPING: Comparison = {
  slug: "coupang-vs-naver-shopping",
  title: "쿠팡 vs 네이버쇼핑 비교 — 어디서 사는 게 더 싸고 빠른가",
  metaTitle: "쿠팡 vs 네이버쇼핑 비교",
  shortTitle: "쿠팡 vs 네이버쇼핑",
  oneLiner: "빠른 배송·생필품은 쿠팡, 가격 비교·다양한 셀러는 네이버쇼핑이 유리합니다.",
  headline: "쿠팡 = 로켓배송 편의성, 네이버쇼핑 = 최저가 비교·포인트 적립.",
  description: "한국 1·2위 쇼핑 플랫폼 쿠팡과 네이버쇼핑 비교. 가격·배송·멤버십·포인트.",
  longIntro: [
    "쿠팡은 로켓배송으로 빠른 배송이 강점, 네이버쇼핑은 셀러 다양성·가격 비교·포인트 적립이 강점.",
    "한국 최대 쇼핑 앱 1·2위. 같은 상품도 매장별 가격이 다른 경우가 많아 큰 결제 전 양쪽 검색이 표준.",
  ],
  a: {
    name: "쿠팡", blurb: "로켓배송 일등. 생필품·당일 배송 강점.",
    iconUrl: fav("coupang.com"), emoji: "📦", pickRef: { category: "shopping", hub: "coupang" },
    recommendedFor: ["빠른 배송 필요", "생필품 정기 구매", "와우 멤버십 활용"],
    pros: ["로켓배송 (당일·익일)", "와우 멤버십 무료 배송·OTT", "반품·교환 편함"],
    cons: ["같은 상품이 네이버보다 비쌀 수 있음", "셀러 다양성 작음"],
  },
  b: {
    name: "네이버쇼핑", blurb: "가격 비교 + 다양한 셀러 + 네이버 포인트.",
    iconUrl: fav("shopping.naver.com"), emoji: "🟩",
    recommendedFor: ["같은 상품 가격 비교 후 구매", "다양한 셀러·소상공인 매물", "네이버 포인트 적립"],
    pros: ["가격 비교 기능 강력", "셀러·매물 매우 다양", "네이버 포인트 적립·전환"],
    cons: ["배송이 쿠팡보다 느림 (셀러별 차이)", "반품·교환 셀러별 정책 다름"],
  },
  scores: [
    { label: "배송 속도", aScore: 10, bScore: 6 },
    { label: "가격 비교 편의", aScore: 6, bScore: 10 },
    { label: "셀러 다양성", aScore: 7, bScore: 10 },
    { label: "반품·교환 편의", aScore: 9, bScore: 6 },
    { label: "포인트·멤버십", aScore: 9, bScore: 9 },
  ],
  pricing: [
    { plan: "기본", aPrice: "무료", bPrice: "무료" },
    { plan: "멤버십", aPrice: "와우 월 7,890원", bPrice: "네이버플러스 월 4,900원" },
    { plan: "배송비", aPrice: "와우 가입자 무료", bPrice: "셀러별 차이" },
  ],
  scenarios: [
    { scenario: "본인이 생필품 정기 구매 + 빠른 배송", winner: "a", reason: "쿠팡 로켓배송 + 와우 멤버십" },
    { scenario: "본인이 같은 상품 가격 비교 후 구매", winner: "b", reason: "네이버쇼핑 가격 비교 표 강력" },
    { scenario: "본인이 네이버 포인트 자주 적립·전환", winner: "b", reason: "네이버 생태계 통합 (페이·웹툰·금융 등)" },
    { scenario: "본인이 반품·교환이 잦다", winner: "a", reason: "쿠팡 자체 직배·반품 정책 간결" },
    { scenario: "본인이 소상공인 매물·니치 상품 찾기", winner: "b", reason: "네이버쇼핑 셀러 다양성" },
  ],
  detailTable: [
    { label: "강점", aValue: "로켓배송·당일", bValue: "가격 비교·다양한 셀러" },
    { label: "멤버십", aValue: "와우 월 7,890원", bValue: "네이버플러스 월 4,900원" },
    { label: "배송", aValue: "쿠팡 자체 + 익일/당일", bValue: "셀러별 1~3일" },
    { label: "반품·교환", aValue: "간결", bValue: "셀러별 차이", bigger: "a" },
    { label: "가격 비교", aValue: "내장 없음", bValue: "강력", bigger: "b" },
    { label: "포인트", aValue: "쿠페이 머니", bValue: "네이버 포인트", bigger: "b" },
    { label: "OTT·생활", aValue: "쿠팡플레이 포함", bValue: "별도" },
    { label: "사용자 수", aValue: "2,500만", bValue: "약 3,000만" },
  ],
  faq: [
    { q: "와우 멤버십 가입할 가치가 있나요?", a: "월 로켓배송 4~5건 또는 쿠팡플레이 1건 정도 사용하면 손익분기점. 첫 30일 무료 체험으로 본인 사용 빈도 검증 후 결정." },
    { q: "같은 상품이 어디가 더 싼가요?", a: "매번 다름. 본인이 결제 전 양쪽 모두 검색해 비교가 표준. 큰 결제일수록 비교 효과 큼." },
    { q: "네이버페이 포인트 어디까지 쓸 수 있나요?", a: "네이버 생태계 전반(웹툰·게임·금융·쇼핑) 에서 사용. 본인 평소 네이버 사용 빈도가 크면 적립 효과 큼." },
    { q: "쿠팡 반품 정말 다 무료인가요?", a: "와우 회원은 대부분 반품 비용 무료. 비회원은 셀러·상품별 정책에 따라 다름." },
    { q: "두 앱 다 안 쓰는 게 손해인가요?", a: "본인 결제 패턴·생활 환경에 따라. 한국 평균 사용자는 두 앱 다 설치 후 상품별로 비교해 선택하는 게 일반적." },
  ],
  relatedPicks: [{ category: "shopping", hub: "coupang", label: "쿠팡 자세히" }],
  relatedKeywords: ["쿠팡 네이버쇼핑", "쇼핑 앱 비교", "와우 멤버십", "네이버페이 포인트", "온라인 쇼핑"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 18. 11번가 vs G마켓
// ===========================================================================
const ELEVENST_VS_GMARKET: Comparison = {
  slug: "11st-vs-gmarket",
  title: "11번가 vs G마켓 비교 — 한국 오픈마켓 양강 어느 게 본인한테 맞나",
  metaTitle: "11번가 vs G마켓 비교",
  shortTitle: "11번가 vs G마켓",
  oneLiner: "프로모션·SK 멤버십은 11번가, 스마일클럽 적립·아마존 연동은 G마켓이 강점입니다.",
  headline: "두 앱 모두 매일 가격이 다르고 쿠폰·할인 폭이 큼. 큰 결제 전 양쪽 비교 표준.",
  description: "한국 오픈마켓 11번가와 G마켓 비교. 가격·쿠폰·멤버십·해외직구 통합.",
  longIntro: [
    "11번가와 G마켓은 한국 오픈마켓 3·4위로 쿠팡·네이버쇼핑 다음 규모. 두 곳 모두 자체 멤버십과 프로모션이 활발해 본인 사용 패턴에 따라 선택.",
    "11번가는 SK 생태계·아마존 연동(과거), G마켓은 스마일클럽 적립·옥션 통합이 강점. 같은 상품 결제 전 양쪽 비교가 표준.",
  ],
  a: {
    name: "11번가", blurb: "SK 그룹 운영. 프로모션 빈번, T멤버십 연동.",
    iconUrl: fav("11st.co.kr"), emoji: "1️⃣",
    recommendedFor: ["SK 텔레콤·T 멤버십 사용자", "프로모션 자주 활용", "쇼핑 + 결제 통합"],
    pros: ["SK 생태계 통합 (T멤버십·페이)", "정기 프로모션·할인 큼", "PG·결제 옵션 다양"],
    cons: ["쿠팡 대비 배송 느림", "최근 점유율 감소 추세"],
  },
  b: {
    name: "G마켓", blurb: "신세계 운영. 스마일클럽·옥션 통합.",
    iconUrl: fav("gmarket.co.kr"), emoji: "🇬",
    recommendedFor: ["스마일클럽 멤버십 사용자", "옥션 동시 사용", "신세계 포인트 적립"],
    pros: ["스마일클럽 적립·할인 매력적", "옥션·G마켓 통합 검색", "신세계 백화점·이마트 통합 포인트"],
    cons: ["배송 셀러별 편차", "11번가보다 셀러 다양성 약간 적음"],
  },
  scores: [
    { label: "프로모션 빈도", aScore: 10, bScore: 8 },
    { label: "멤버십 혜택", aScore: 8, bScore: 9 },
    { label: "셀러 다양성", aScore: 9, bScore: 8 },
    { label: "포인트 적립", aScore: 8, bScore: 9 },
    { label: "배송 속도", aScore: 7, bScore: 7 },
  ],
  pricing: [
    { plan: "기본", aPrice: "무료", bPrice: "무료" },
    { plan: "멤버십", aPrice: "T멤버십 연동 (월 0~5,000원)", bPrice: "스마일클럽 (별도)" },
    { plan: "배송비", aPrice: "셀러별", bPrice: "셀러별" },
  ],
  scenarios: [
    { scenario: "본인이 SKT·T멤버십 사용자", winner: "a", reason: "11번가가 SK 생태계 통합 강점" },
    { scenario: "본인이 신세계·이마트 자주 이용", winner: "b", reason: "G마켓이 신세계 포인트 통합" },
    { scenario: "본인이 옥션 자주 이용", winner: "b", reason: "G마켓·옥션 통합 검색 가능" },
    { scenario: "본인이 큰 결제 전 가격 비교", winner: "both", reason: "두 앱 + 쿠팡·네이버쇼핑까지 모두 비교 표준" },
    { scenario: "본인이 프로모션·쿠폰 적극 활용", winner: "a", reason: "11번가 프로모션 빈도 큼" },
  ],
  detailTable: [
    { label: "운영", aValue: "SK 스토아", bValue: "신세계·이마트" },
    { label: "멤버십", aValue: "T멤버십 연동", bValue: "스마일클럽" },
    { label: "프로모션", aValue: "매우 빈번", bValue: "빈번", bigger: "a" },
    { label: "포인트 적립", aValue: "11페이", bValue: "신세계 포인트", bigger: "b" },
    { label: "배송", aValue: "셀러별 1~3일", bValue: "셀러별 1~3일" },
    { label: "옥션 통합", aValue: "없음", bValue: "있음", bigger: "b" },
    { label: "PG·결제", aValue: "다양", bValue: "다양" },
    { label: "사용자", aValue: "약 970만", bValue: "약 630만" },
  ],
  faq: [
    { q: "스마일클럽 가입할 가치가 있나요?", a: "본인이 G마켓·옥션을 월 2~3건 이상 이용하면 손익분기점. 신세계·이마트 통합 포인트로 추가 가치 발생." },
    { q: "11번가가 SKT 사용자만 이득인가요?", a: "그렇지는 않지만 T멤버십·11페이·SK 통신 연동 혜택이 SKT 사용자에게 집중. 본인이 비 SKT 사용자면 가치 절감." },
    { q: "G마켓 옥션 통합이 무슨 뜻인가요?", a: "한 계정으로 G마켓·옥션 양쪽 검색·결제 가능. 매물 풀이 합쳐져 가격 비교가 더 정확함." },
    { q: "쿠팡·네이버쇼핑이랑 어떻게 다른가요?", a: "11번가·G마켓은 셀러 중심 오픈마켓. 쿠팡은 자체 직판 + 셀러, 네이버쇼핑은 가격 비교 중심. 본인 결제 패턴에 따라 4개 모두 활용." },
    { q: "같은 셀러가 여러 앱에 있는데 가격이 왜 다른가요?", a: "셀러가 각 앱별로 다른 가격 책정 + 앱별 쿠폰·프로모션·멤버십 할인 적용으로 최종 가격 다름. 양쪽 비교가 표준." },
  ],
  relatedKeywords: ["11번가 G마켓", "오픈마켓 비교", "스마일클럽", "T멤버십 쇼핑", "한국 쇼핑 앱"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 19. 크몽 vs 숨고
// ===========================================================================
const KMONG_VS_SOOMGO: Comparison = {
  slug: "kmong-vs-soomgo",
  title: "크몽 vs 숨고 비교 — 프리랜서·외주 플랫폼 어느 게 본인한테 맞나",
  metaTitle: "크몽 vs 숨고 비교",
  shortTitle: "크몽 vs 숨고",
  oneLiner: "디지털·전문 작업(디자인·IT·번역) 은 크몽, 생활 서비스(이사·과외·청소) 는 숨고가 강점입니다.",
  headline: "본인 카테고리에 더 맞는 플랫폼에서 시작 → 평점 쌓이면 다른 곳도 확장.",
  description: "한국 프리랜서·외주 양대 플랫폼 크몽과 숨고 비교. 카테고리·수수료·결제·정산.",
  longIntro: [
    "크몽은 디자인·IT·번역·마케팅 같은 디지털·전문 작업이 강점이고, 숨고는 이사·과외·청소 같은 생활 서비스·오프라인 매칭이 강점.",
    "두 플랫폼 모두 한국 No.1 수준이며 수수료 구조가 다름. 본인 카테고리에 더 맞는 곳에서 시작하는 게 효율적.",
  ],
  a: {
    name: "크몽", blurb: "디지털·전문 작업 (디자인·IT·번역·마케팅) 1순위.",
    iconUrl: fav("kmong.com"), emoji: "💼", pickRef: { category: "jobs", hub: "kmong" },
    recommendedFor: ["디자인·IT·번역 전문가", "원격 근무 가능 작업", "장기 프로젝트 수주"],
    pros: ["디지털 작업 카테고리 700+", "포트폴리오·평점 시스템 발달", "원격 작업·결제 표준화"],
    cons: ["판매 수수료 약 20%", "오프라인·생활 서비스 약함"],
  },
  b: {
    name: "숨고", blurb: "생활 서비스·오프라인 매칭 (이사·과외·청소).",
    iconUrl: fav("soomgo.com"), emoji: "🤝",
    recommendedFor: ["이사·과외·청소 등 오프라인 서비스", "지역 기반 매칭", "견적·상담 위주 거래"],
    pros: ["생활 서비스 카테고리 풍부", "견적 요청 매칭 방식", "지역 기반 접근성"],
    cons: ["원격 디지털 작업 카테고리 약함", "수수료가 견적·상담 비용 구조라 복잡"],
  },
  scores: [
    { label: "디자인·IT·번역", aScore: 10, bScore: 6 },
    { label: "이사·과외·청소", aScore: 5, bScore: 10 },
    { label: "원격 작업 적합성", aScore: 10, bScore: 6 },
    { label: "오프라인 매칭", aScore: 5, bScore: 10 },
    { label: "초기 진입 장벽", aScore: 7, bScore: 8 },
  ],
  pricing: [
    { plan: "기본 가입·등록", aPrice: "무료", bPrice: "무료" },
    { plan: "판매 수수료", aPrice: "약 20%", bPrice: "견적 비용 + 수수료 구조" },
    { plan: "결제 보호", aPrice: "플랫폼 에스크로", bPrice: "직접 결제 위주" },
  ],
  scenarios: [
    { scenario: "본인이 디자이너·개발자·번역가", winner: "a", reason: "크몽 카테고리·포트폴리오 시스템 발달" },
    { scenario: "본인이 이사·청소·과외 같은 오프라인 서비스 제공", winner: "b", reason: "숨고 지역 매칭·견적 시스템" },
    { scenario: "본인이 평점·리뷰 빨리 쌓고 싶다", winner: "a", reason: "크몽이 디지털 작업 평점 시스템 표준화" },
    { scenario: "본인이 지역 기반 고객 찾기", winner: "b", reason: "숨고 지역 기반 매칭" },
    { scenario: "본인이 둘 다 활동", winner: "both", reason: "디지털 + 오프라인 양쪽 가능. 카테고리별 분산이 표준" },
  ],
  detailTable: [
    { label: "주력 카테고리", aValue: "디지털·전문 (디자인·IT·번역)", bValue: "생활 서비스 (이사·과외·청소)" },
    { label: "거래 방식", aValue: "고정 가격 상품 판매", bValue: "견적 요청·매칭" },
    { label: "수수료", aValue: "약 20%", bValue: "견적·결제 따라 다름" },
    { label: "결제 보호", aValue: "플랫폼 에스크로", bValue: "직접 결제 위주" },
    { label: "원격 작업", aValue: "강점", bValue: "약함", bigger: "a" },
    { label: "오프라인 매칭", aValue: "약함", bValue: "강점", bigger: "b" },
    { label: "지역 기반", aValue: "전국·원격", bValue: "지역 기반" },
    { label: "한국 점유율", aValue: "프리랜서 1위", bValue: "생활 서비스 1위" },
  ],
  faq: [
    { q: "둘 다 가입해도 되나요?", a: "네. 카테고리가 다르므로 본인 작업 범위에 따라 양쪽 활용. 디지털·오프라인 양쪽 작업 가능하면 동시 등록이 효율적." },
    { q: "크몽 판매 수수료 20% 가 너무 큰가요?", a: "한국 프리랜서 플랫폼 표준 수수료. Fiverr 등 글로벌도 20% 정도. 플랫폼 마케팅·결제 보호 가치 고려." },
    { q: "숨고는 어떻게 돈을 버나요?", a: "고수(숨고 사용자) 가 견적 응답할 때 일정 비용을 결제하는 구조. 직접 매칭이 아니라 견적 요청 기반." },
    { q: "초보자에게는 어느 게 진입 쉬운가요?", a: "디지털 작업 가능자는 크몽이 진입 쉬움 (서비스 등록 후 자동 노출). 생활 서비스는 숨고 (지역 기반 매칭)." },
    { q: "수수료 회피 위해 직거래로 빼는 게 좋나요?", a: "절대 금지. 플랫폼 보호 없어지고 미수금 리스크 100% 본인 부담. 본인 평점이 안정된 후 신뢰 누적된 클라이언트만 부분 직거래 권장." },
  ],
  relatedPicks: [{ category: "jobs", hub: "kmong", label: "크몽 자세히" }],
  relatedChecklists: [
    { slug: "freelance-first-contract", label: "외주·프리랜서 첫 계약 체크리스트" },
    { slug: "ai-side-income-start", label: "AI 도구로 첫 부수입 시작" },
  ],
  relatedKeywords: ["크몽 숨고", "프리랜서 플랫폼", "외주 사이트", "한국 프리랜서", "재택 부업"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 20. 잡코리아 vs 사람인
// ===========================================================================
const JOBKOREA_VS_SARAMIN: Comparison = {
  slug: "jobkorea-vs-saramin",
  title: "잡코리아 vs 사람인 비교 — 채용 사이트 어느 게 본인한테 맞나",
  metaTitle: "잡코리아 vs 사람인 비교",
  shortTitle: "잡코리아 vs 사람인",
  oneLiner: "공채·대기업은 잡코리아, 중견·중소·스타트업 다양성은 사람인이 강점입니다.",
  headline: "두 곳에 모두 이력서 등록 = 한국 직장인 표준. 한쪽에만 공고 올라오는 경우 많음.",
  description: "한국 채용 사이트 잡코리아와 사람인 비교. 공고 범위·이력서·연봉정보·검색.",
  longIntro: [
    "잡코리아와 사람인은 한국 채용 양대 사이트로 공고가 한쪽에만 등록되는 경우가 많아 양쪽 모두 이력서 등록 + 알림 설정이 표준 패턴.",
    "잡코리아는 공채·대기업 중심, 사람인은 중견·중소·스타트업 폭이 넓음. 본인 타겟 회사 규모에 따라 가중치 다름.",
  ],
  a: {
    name: "잡코리아", blurb: "공채·대기업 공고 중심.",
    iconUrl: fav("jobkorea.co.kr"), emoji: "💼", pickRef: { category: "jobs", hub: "jobkorea" },
    recommendedFor: ["대기업·공기업 공채 준비", "신입·경력 정기 채용", "연봉정보 조회"],
    pros: ["공채 시즌 공고 가장 많음", "연봉정보 풍부", "대기업 채용 정보 빠름"],
    cons: ["중소·스타트업 폭 사람인 대비 작음", "이력서 자동 작성 도구 일반적"],
  },
  b: {
    name: "사람인", blurb: "중견·중소·스타트업 공고 폭 넓음.",
    iconUrl: fav("saramin.co.kr"), emoji: "👥", pickRef: { category: "jobs", hub: "saramin" },
    recommendedFor: ["중소·중견 회사 지원", "스타트업·신생 회사 정보", "지역 기반 채용"],
    pros: ["중소·스타트업 공고 가장 풍부", "회사 평점·후기 데이터", "직무·태그 기반 검색 강력"],
    cons: ["대기업 공채는 잡코리아 대비 약간 적음", "이력서 자동 작성 일반적"],
  },
  scores: [
    { label: "공채·대기업 공고", aScore: 10, bScore: 8 },
    { label: "중견·중소·스타트업", aScore: 7, bScore: 10 },
    { label: "연봉정보", aScore: 10, bScore: 8 },
    { label: "회사 평점·후기", aScore: 7, bScore: 10 },
    { label: "이력서·자기소개서 도구", aScore: 9, bScore: 9 },
  ],
  pricing: [
    { plan: "구직자", aPrice: "무료", bPrice: "무료" },
    { plan: "채용 기업 (참고)", aPrice: "유료 (월 10~수십만원)", bPrice: "유료 (월 10~수십만원)" },
  ],
  scenarios: [
    { scenario: "본인이 대기업·공기업 공채 준비", winner: "a", reason: "잡코리아 공채 시즌 공고 가장 풍부" },
    { scenario: "본인이 중견·중소·스타트업 지원", winner: "b", reason: "사람인 중견·중소 공고 폭 넓음" },
    { scenario: "본인이 회사 평점·내부자 후기 보고 싶다", winner: "b", reason: "사람인 회사 평점·후기 데이터 강함" },
    { scenario: "본인이 연봉정보 정확히 알고 싶다", winner: "a", reason: "잡코리아 연봉정보 표 풍부" },
    { scenario: "본인이 채용 시즌 빠짐없이 알림", winner: "both", reason: "두 곳 모두 등록 + 알림 설정이 표준" },
  ],
  detailTable: [
    { label: "주력", aValue: "공채·대기업", bValue: "중견·중소·스타트업" },
    { label: "공고 수 (대기업)", aValue: "많음", bValue: "양호", bigger: "a" },
    { label: "공고 수 (중소·스타트업)", aValue: "양호", bValue: "많음", bigger: "b" },
    { label: "연봉정보", aValue: "풍부", bValue: "양호", bigger: "a" },
    { label: "회사 평점·후기", aValue: "양호", bValue: "풍부", bigger: "b" },
    { label: "이력서 도구", aValue: "표준", bValue: "표준" },
    { label: "구직자 비용", aValue: "무료", bValue: "무료" },
    { label: "한국 사용자", aValue: "수백만", bValue: "수백만" },
  ],
  faq: [
    { q: "한 곳에만 이력서 등록해도 되나요?", a: "비추. 한국 회사는 한쪽에만 공고를 올리는 경우가 많아 양쪽 등록이 채용 기회 누락 방지에 표준." },
    { q: "이력서를 두 곳에 똑같이 올려도 되나요?", a: "가능. 다만 자기소개서·경력 기술은 본인이 직접 갱신해야 양쪽 최신 상태." },
    { q: "어디가 더 빨리 공고가 올라오나요?", a: "회사·시점에 따라 다름. 대기업 공채는 잡코리아가 빠른 편, 스타트업·중소는 사람인이 빠른 편." },
    { q: "연봉정보가 정확한가요?", a: "두 곳 모두 사용자 입력 + 공시 데이터 기반. 평균은 신뢰 가능하나 개별 회사·연차별 정확도는 한정. 본인 협상 시 추가 자료(원티드·블라인드 등) 병행 권장." },
    { q: "회사 평점은 신뢰할 만한가요?", a: "사람인이 후기 양 많음. 다만 광고성·악의성 후기 가능. 다수 후기 + 최근 + 구체 사례 위주로 판단." },
  ],
  relatedPicks: [
    { category: "jobs", hub: "jobkorea", label: "잡코리아 자세히" },
    { category: "jobs", hub: "saramin", label: "사람인 자세히" },
  ],
  relatedKeywords: ["잡코리아 사람인", "채용 사이트", "이력서", "연봉정보", "공채 사이트"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 21. 인프런 vs 클래스101
// ===========================================================================
const INFLEARN_VS_CLASS101: Comparison = {
  slug: "inflearn-vs-class101",
  title: "인프런 vs 클래스101 비교 — 온라인 강의 어느 게 본인 학습에 맞나",
  metaTitle: "인프런 vs 클래스101 비교",
  shortTitle: "인프런 vs 클래스101",
  oneLiner: "IT·개발·직무 강의는 인프런, 취미·라이프스타일·자기계발은 클래스101 이 강점입니다.",
  headline: "인프런 = 강의별 단품 결제·평생 시청. 클래스101 = 월 구독으로 무제한 수강.",
  description: "한국 온라인 강의 인프런과 클래스101 비교. 강의 분야·결제 모델·수강 환경.",
  longIntro: [
    "인프런과 클래스101 은 한국 온라인 강의 양대 플랫폼. 결제 모델과 강의 분야가 완전히 다릅니다.",
    "인프런은 IT·개발·직무 강의 중심으로 강의별 단품 결제 + 평생 시청. 클래스101 은 취미·자기계발·라이프스타일 강의 + 월 구독 무제한 수강.",
  ],
  a: {
    name: "인프런", blurb: "IT·개발·직무 강의 1순위. 강의당 결제 + 평생 시청.",
    iconUrl: fav("inflearn.com"), emoji: "🎓", pickRef: { category: "study", hub: "inflearn" },
    recommendedFor: ["IT·개발 학습", "직무 자격증·실무 강의", "한 번 사서 평생 보고 싶은 사람"],
    pros: ["IT 강의 가장 많음 + 깊이 있음", "평생 시청 모델 (한 번 결제)", "강사 평점·후기 풍부"],
    cons: ["취미·라이프스타일 강의 적음", "전체 강의 비용 누적 클 수 있음"],
  },
  b: {
    name: "클래스101", blurb: "취미·라이프스타일·자기계발. 월 구독 무제한.",
    iconUrl: fav("class101.net"), emoji: "🎨",
    recommendedFor: ["취미·자기계발 학습", "여러 분야 동시 학습", "월 구독으로 가성비"],
    pros: ["월 19,000원 무제한 수강 (연간 결제 시 15,000원대)", "취미·라이프스타일 강의 풍부", "강의 + 키트 결합 상품"],
    cons: ["IT·개발 강의 깊이 인프런 대비 약함", "구독 해지 시 학습 콘텐츠 접근 끊김"],
  },
  scores: [
    { label: "IT·개발 강의", aScore: 10, bScore: 5 },
    { label: "취미·라이프스타일", aScore: 5, bScore: 10 },
    { label: "평생 시청 vs 구독", aScore: 10, bScore: 5 },
    { label: "강의 다양성", aScore: 8, bScore: 9 },
    { label: "강사·후기 평점", aScore: 9, bScore: 8 },
  ],
  pricing: [
    { plan: "결제 방식", aPrice: "강의당 단품", bPrice: "월 구독" },
    { plan: "기본 가격", aPrice: "강의당 1~30만원", bPrice: "월 19,000원" },
    { plan: "할인", aPrice: "블프·연말 30~50%", bPrice: "연간 결제 시 월 15,000원대" },
  ],
  scenarios: [
    { scenario: "본인이 개발자·IT 직무 학습", winner: "a", reason: "인프런 IT 강의 깊이·다양성 압도" },
    { scenario: "본인이 취미·자기계발 여러 분야 동시 학습", winner: "b", reason: "클래스101 월 구독으로 무제한 수강" },
    { scenario: "본인이 한 강의를 평생 다시 보고 싶다", winner: "a", reason: "인프런 평생 시청 모델" },
    { scenario: "본인이 자격증·실무 강의 필요", winner: "a", reason: "인프런 직무 강의 풍부" },
    { scenario: "본인이 가성비 + 다양한 강의 체험", winner: "b", reason: "클래스101 구독 가성비" },
  ],
  detailTable: [
    { label: "주력 분야", aValue: "IT·개발·직무", bValue: "취미·라이프스타일·자기계발" },
    { label: "결제 모델", aValue: "강의당 단품", bValue: "월 구독" },
    { label: "강의 가격", aValue: "1~30만원/강의", bValue: "월 19,000원 무제한" },
    { label: "시청 기간", aValue: "평생", bValue: "구독 기간만" },
    { label: "강의 종류", aValue: "수천 개", bValue: "6,000+ 개" },
    { label: "할인 시즌", aValue: "블프·연말", bValue: "연간 결제 시" },
    { label: "키트·물품", aValue: "거의 없음", bValue: "강의 + 키트 결합", bigger: "b" },
    { label: "강사 평점·후기", aValue: "풍부", bValue: "양호" },
  ],
  faq: [
    { q: "인프런 강의는 정말 평생 볼 수 있나요?", a: "네. 한 번 결제한 강의는 본인 계정에서 무제한·평생 시청 가능. 강의 업데이트도 자동 반영." },
    { q: "클래스101 구독 해지하면 강의 접근 못 하나요?", a: "구독 해지 시 강의 접근 끊김. 다만 구독 중 다운로드한 일부 자료는 보관 가능." },
    { q: "인프런 강의는 언제 사는 게 가장 싸요?", a: "블랙프라이데이·연말연시·신학기 시즌 30~50% 할인. 관심 강의는 위시리스트에 담아두고 할인 알림 활용." },
    { q: "두 플랫폼 다 구독·결제할 가치가 있나요?", a: "본인 학습 분야가 IT + 취미 양쪽이면 가능. IT 만 이면 인프런 단독, 취미 만 이면 클래스101 단독이 효율적." },
    { q: "강사 수익 분배는 어떻게 되나요?", a: "인프런은 강의별 결제 기준 강사 70~80%. 클래스101 은 구독 시청 시간 기준 분배 (평균 50%). 강사 입장에서는 인프런이 단가 높음." },
  ],
  relatedPicks: [{ category: "study", hub: "inflearn", label: "인프런 자세히" }],
  relatedChecklists: [{ slug: "ai-side-income-start", label: "AI 도구로 첫 부수입 시작" }],
  relatedKeywords: ["인프런 클래스101", "온라인 강의", "IT 강의", "취미 강의", "구독 vs 단품"],
  publishedAt: TODAY, updatedAt: TODAY,
};

// ===========================================================================
// 전체 export
// ===========================================================================
export const COMPARISONS: Comparison[] = [
  CHATGPT_VS_CLAUDE,
  CHATGPT_VS_GEMINI,
  CLAUDE_VS_GEMINI,
  MIDJOURNEY_VS_DALLE,
  CURSOR_VS_COPILOT,
  SUNO_VS_UDIO,
  DIDIMDOL_VS_BOGEUMJARI,
  BEOTIMMOK_VS_BANK,
  YOUTH_DREAM_VS_GENERAL,
  NORANUMBRELLA_VS_IRP,
  SIMPLE_VS_GENERAL_TAX,
  UPBIT_VS_BITHUMB,
  UPBIT_VS_COINONE,
  KORBIT_VS_COINONE,
  HOGANGNONO_VS_ZIGBANG,
  YANOLJA_VS_YEOGI,
  COUPANG_VS_NAVER_SHOPPING,
  ELEVENST_VS_GMARKET,
  KMONG_VS_SOOMGO,
  JOBKOREA_VS_SARAMIN,
  INFLEARN_VS_CLASS101,
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

export function totalComparisonCount(): number {
  return COMPARISONS.length;
}
