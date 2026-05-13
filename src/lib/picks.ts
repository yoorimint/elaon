// 주소모음 디렉토리 데이터.
// 톤: 표준 존댓말, 사실·기능·가격 중심. 평가·자기 PR 최소화.

export type PickCategorySlug = "ai" | "money" | "free" | "coin";

export type Pricing = "free" | "freemium" | "paid";

export type SubItem = {
  name: string;
  blurb?: string;       // 한 줄 요약
  details?: string;     // 본문 (1~3문장)
  amount?: string;      // 지원 금액 (예: "월 최대 20만원 × 12개월")
  eligibility?: string; // 자격 요건
  applyWhen?: string;   // 신청 시기 (예: "수시" / "5월 정기")
  url?: string;         // 외부 deep link
};

export type DetailFeature = { title: string; body: string };
export type DetailPricingPlan = {
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
};
export type DetailGuideStep = { step: number; title: string; body: string };

export type DetailContent = {
  longIntro: string[];
  features: DetailFeature[];
  pricingPlans?: DetailPricingPlan[];
  pros?: string[];
  cons?: string[];
  koreanContext?: string;
  startingGuide?: DetailGuideStep[];
  faq?: { q: string; a: string }[];
  relatedKeywords?: string[];
};

export type PickItem = {
  name: string;
  url: string;
  blurb: string;
  details: string;
  useCases: string[];
  pricing: Pricing;
  pricingNote?: string;
  tip?: string;
  alternatives?: string[];
  korean?: boolean;
  founded?: string;
  hubSlug?: string;     // 있으면 /picks/{cat}/{hub} 별도 페이지 생성 (sub-카드 또는 상세)
  subItems?: SubItem[]; // 통합 포털 sub-항목 (hub 모드)
  detailContent?: DetailContent; // 도구 상세 페이지 (detail 모드)
  imageUrl?: string;    // 큰 미리보기 이미지 (OG image 등, 16:9 비율 권장)
};

export type PickGroup = { title: string; items: PickItem[] };

export type FaqEntry = { q: string; a: string };

export type PickCategory = {
  slug: PickCategorySlug;
  title: string;
  metaTitle: string;
  shortTitle: string;
  emoji: string;
  oneLiner: string;
  description: string;
  longIntro: string[];
  selectionCriteria: string[];
  groups: PickGroup[];
  faq: FaqEntry[];
  relatedKeywords: string[];
  updatedAt: string;
};

const TODAY = "2026-05-13";

// ===========================================================================
// 1. AI 도구
// ===========================================================================
const AI: PickCategory = {
  slug: "ai",
  title: "AI 도구 추천 2026 — 무료로 쓰는 글쓰기·이미지·영상·코딩 31선",
  metaTitle: "AI 도구 추천 2026 — 무료 글쓰기·이미지·영상·코딩 31선",
  shortTitle: "AI 도구",
  emoji: "🤖",
  oneLiner: "한국에서 가입·결제·이용이 가능한 AI 도구 31가지.",
  description:
    "ChatGPT, Claude, Gemini, Midjourney, Suno, Cursor 등 한국에서 바로 쓰는 AI 도구 31가지를 카테고리·가격·한국어 지원 여부로 정리한 디렉토리입니다.",
  longIntro: [
    "ChatGPT, Claude, Gemini, Midjourney, Suno 등 한국에서 가입·결제·이용이 가능한 AI 도구를 글쓰기·이미지·영상·음성·코딩·번역 카테고리로 나눠 정리했습니다.",
    "각 항목에는 한 줄 요약, 자세한 설명, 사용 시나리오, 가격 정보, 같은 카테고리의 대안 서비스를 함께 표기했습니다.",
    "용도별 대표 서비스를 보면 챗봇은 ChatGPT 와 Claude, 검색은 Perplexity, 이미지는 ChatGPT 내장 DALL·E 3 와 Midjourney, 영상은 Runway, 음악은 Suno, 음성 합성은 ElevenLabs, 한국어 받아쓰기는 네이버 클로바노트, 코딩은 Cursor 와 Claude Code, 번역은 DeepL 입니다.",
    "AI 서비스 무료 플랜은 입력 데이터를 학습에 사용하는 경우가 많습니다. 회사 기밀, 고객 개인정보, 미공개 재무 자료는 가명화 후 입력하거나 Team·Enterprise 플랜의 학습 거부 옵션을 활성화해야 합니다.",
  ],
  selectionCriteria: [
    "한국 IP·결제수단으로 가입·이용 가능한 서비스",
    "출시 1년 이상 또는 메이저 기업이 운영하는 서비스",
    "한국어 인터페이스 또는 한국어 결과물 지원",
    "공식 사이트 직링크",
  ],
  updatedAt: TODAY,
  relatedKeywords: [
    "AI 도구 추천",
    "무료 AI 사이트",
    "ChatGPT 대안",
    "AI 그림 그리기 사이트",
    "AI 영상 만들기",
    "한국어 AI 챗봇",
    "업무용 AI",
    "AI 코딩 도구",
    "AI 음성 합성",
    "AI 번역기",
  ],
  groups: [
    {
      title: "💬 챗봇 / 대화형 AI",
      items: [
        {
          name: "ChatGPT",
          url: "https://chat.openai.com",
          blurb: "범용 챗봇 시장 점유율 1위. 무료 플랜에서 이미지·검색·코드 실행 제공.",
          details:
            "OpenAI 의 GPT-5 기반 챗봇입니다. 한국에서 가입·결제·이용이 모두 정상 동작합니다. 무료 플랜에서도 이미지 생성(DALL·E 3), 웹 검색, 파이썬 코드 실행, 파일 분석이 제공됩니다. GPT-5 사용량은 4~5시간마다 리셋되는 한도가 있으며, Plus 결제 시 한도가 크게 늘어나고 응답 속도도 빨라집니다.",
          useCases: [
            "이메일·보고서 초안 작성",
            "엑셀 파일 업로드 후 데이터 분석",
            "코드 디버깅 및 리팩터링",
            "이미지 생성 (한 줄 프롬프트)",
            "한국어 회화·번역·교정",
            "음성 모드로 영어 회화 연습",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Plus $20/월 / Pro $200/월",
          tip: "설정의 Personalization → Custom Instructions 에 직업·말투·자주 쓰는 표현을 입력해두면 대화마다 같은 톤이 유지됩니다.",
          alternatives: ["Claude", "Gemini", "뤼튼"],
          founded: "2022",
          korean: true,
          imageUrl: "https://cdn.openai.com/chatgpt/share-og.png",
          hubSlug: "chatgpt",
          detailContent: {
            longIntro: [
              "ChatGPT 는 OpenAI 가 운영하는 GPT-5 기반 챗봇입니다. 2022년 11월 출시 이후 2026년 현재 전 세계 월 활성 사용자 7억 명 이상으로 범용 챗봇 시장 점유율 1위를 유지하고 있습니다.",
              "한국에서 가입·결제·이용이 모두 정상적으로 동작하며 한국어 답변 품질도 모든 AI 중 가장 안정적입니다. 무료 플랜에서도 GPT-5 일부 사용량과 이미지 생성, 웹 검색, 파이썬 코드 실행, 파일 분석 같은 핵심 기능이 모두 제공됩니다.",
              "유료 플랜은 Plus($20/월) 와 Pro($200/월) 두 가지로, 한국 사용자도 신용카드·체크카드로 가입할 수 있습니다. Plus 와 Pro 는 사용량 한도, 응답 속도, Sora 영상 생성 옵션, 심층 리서치 모드에서 차이가 납니다.",
            ],
            features: [
              { title: "GPT-5 모델", body: "OpenAI 최신 모델. 추론, 코딩, 창작 능력 1티어. 답변 정확도와 한국어 자연스러움이 가장 안정적입니다." },
              { title: "이미지 생성 (DALL·E 3)", body: "한국어 프롬프트 한 줄로 이미지를 즉시 생성합니다. 캐릭터 일관성과 이미지 안 한글·영문 텍스트 합성이 다른 AI 대비 안정적입니다." },
              { title: "웹 검색", body: "실시간 웹 검색 결과를 출처와 함께 답변에 포함합니다. 최신 뉴스, 가격, 통계 확인에 유용합니다." },
              { title: "코드 인터프리터", body: "파이썬 코드를 실행해 엑셀·CSV·PDF 분석, 차트 생성, 데이터 전처리를 처리합니다." },
              { title: "음성 모드 (Advanced Voice)", body: "한국어 자연 대화 + 동시통역 수준 발음. 영어 회화 연습 도구로도 사용됩니다." },
              { title: "Custom Instructions", body: "직업·말투·자주 쓰는 표현을 사전 입력해 매 대화에서 같은 톤이 유지됩니다." },
              { title: "프로젝트 (Projects)", body: "관련 자료를 폴더처럼 묶어 같은 컨텍스트로 반복 대화합니다. 무료 플랜에서도 사용 가능합니다." },
              { title: "GPT Store", body: "특정 용도로 만들어진 사용자 GPT 수십만 개를 검색·사용합니다." },
              { title: "파일 업로드", body: "PDF, Word, Excel, 이미지를 분석해 요약·번역·표 추출이 가능합니다." },
              { title: "Sora 영상 생성 (Plus 이상)", body: "최대 20초·1080p 영상을 텍스트나 이미지에서 생성합니다. Plus 플랜에 포함되어 있습니다." },
            ],
            pricingPlans: [
              {
                name: "무료 (Free)",
                price: "0원",
                features: [
                  "GPT-5 일일 한도 (4~5시간 리셋)",
                  "이미지 생성 일일 한도",
                  "웹 검색 일일 한도",
                  "파이썬 코드 실행",
                  "파일 업로드",
                  "음성 모드 (제한적)",
                ],
              },
              {
                name: "Plus",
                price: "$20/월 (약 2.7만원)",
                recommended: true,
                features: [
                  "GPT-5 사용량 거의 무제한",
                  "응답 속도 빠름",
                  "Sora 영상 생성 포함",
                  "음성 모드 무제한",
                  "GPT Store 풀 액세스",
                  "심층 리서치 모드 제한적",
                ],
              },
              {
                name: "Pro",
                price: "$200/월 (약 27만원)",
                features: [
                  "GPT-5 무제한 + 추론 강화 모델",
                  "최우선 응답 (트래픽 무관)",
                  "Sora 영상 고급 옵션",
                  "심층 리서치 모드 풀 사용",
                  "Operator (에이전트) 액세스",
                  "API 크레딧 일부 포함",
                ],
              },
            ],
            pros: [
              "한국어 답변 품질 최상위. 어색함 가장 적음",
              "이미지·검색·코드·음성 통합 (단일 도구로 거의 모든 용도)",
              "한국 가입·결제 전부 정상 동작 (VPN 불필요)",
              "무료 플랜만으로도 핵심 기능 사용 가능",
              "GPT Store 등 생태계 풍부",
              "음성 모드의 한국어 발음·동시통역 수준",
            ],
            cons: [
              "월 $20 결제 부담 (해외 결제, USD)",
              "민감 콘텐츠 검열 강함 (창작 시 거절 자주 발생)",
              "긴 PDF·코드베이스 분석은 Claude 대비 약함",
              "응답 시간이 트래픽에 따라 길어짐 (Plus 도)",
              "Pro 가격($200) 은 일반 사용자에게 부담",
            ],
            koreanContext:
              "한국 IP 로 가입·접속·결제 모두 정상 동작합니다. 한국 신용카드(국내·해외 결제 모두) 와 체크카드로 결제 가능하지만 카카오페이·네이버페이 등 간편결제는 직접 지원되지 않습니다. 회사·학교 이메일로 가입 시 SSO 도 지원됩니다. 한국어 음성 모드는 동시통역 수준이며 이미지 생성 시 한글 텍스트 합성도 안정적입니다.",
            startingGuide: [
              {
                step: 1,
                title: "가입",
                body: "chat.openai.com 에 접속해 구글, MS, 애플 계정 또는 이메일로 가입합니다. 한국 IP 정상 접근, VPN 불필요.",
              },
              {
                step: 2,
                title: "Custom Instructions 설정",
                body: "설정 → Personalization → Custom Instructions 에 직업·전문 분야·선호하는 말투(존댓말/반말, 격식/캐주얼) 를 입력해두면 매 대화에서 같은 톤이 유지됩니다.",
              },
              {
                step: 3,
                title: "무료로 충분히 테스트",
                body: "이미지 생성, 웹 검색, 파일 분석을 무료로 모두 사용해보고 일일 한도가 부족하다고 느낄 때 Plus 결제를 검토합니다.",
              },
              {
                step: 4,
                title: "Plus 결제 (선택)",
                body: "신용카드·체크카드로 $20/월 결제. 영수증은 이메일로 자동 발송됩니다. 환불은 14일 이내 미사용 시 정책에 따라 가능합니다.",
              },
              {
                step: 5,
                title: "프로젝트 활용",
                body: "자주 쓰는 자료(이력서, 회사 정보, 문체 가이드 등) 를 Projects 안에 미리 등록해 두면 같은 컨텍스트로 반복 대화할 수 있습니다.",
              },
            ],
            faq: [
              {
                q: "한국에서 가입·결제 가능한가요?",
                a: "가능합니다. 한국 IP 로 정상 접속되며 국내·해외 신용카드 모두 결제됩니다. VPN 은 필요 없습니다. 카카오페이·네이버페이 같은 한국 간편결제는 지원되지 않으므로 카드 결제를 사용해야 합니다.",
              },
              {
                q: "Plus($20/월) 결제할 가치가 있나요?",
                a: "GPT-5 를 매일 1시간 이상 사용하면 Plus 가 효율적입니다. 한 달 약 2.7만원으로 한도가 거의 무제한이 되며 응답 속도도 빨라집니다. 가벼운 사용자는 무료 플랜으로 충분합니다.",
              },
              {
                q: "Pro($200/월) 는 누구에게 필요한가요?",
                a: "전문 리서치, 코딩 자동화, Sora 영상 생성을 매일 사용하는 파워유저나 업무용 사용자에게 적합합니다. 일반 사용자는 Plus 면 충분하며, Pro 는 심층 리서치와 Operator 같은 고급 기능을 필요로 할 때 검토합니다.",
              },
              {
                q: "회사 자료를 업로드해도 되나요?",
                a: "위험합니다. 무료와 Plus 는 입력 데이터가 학습에 사용될 수 있습니다. 설정 → Data Controls 에서 학습 거부를 활성화하면 학습에 사용되지 않습니다. 회사 기밀과 고객 개인정보는 가명화 후 사용하거나 Team·Enterprise 플랜의 No-train 약관을 활용하는 방법이 안전합니다.",
              },
              {
                q: "Claude·Gemini 와 비교하면 어떤가요?",
                a: "범용성과 이미지·음성·검색 통합은 ChatGPT 가 우위에 있습니다. 긴 PDF·계약서·코드베이스 분석은 Claude 가 강하고, Google 워크스페이스(Gmail·Docs·Drive) 통합은 Gemini 가 가장 자연스럽습니다. 무료 플랜이 모두 있으니 같은 질문을 양쪽에 던져 비교해 보는 방법이 빠릅니다.",
              },
              {
                q: "이미지 생성 시 상업적 이용 가능한가요?",
                a: "Plus 이상 결제 시 생성된 이미지의 상업적 이용이 약관상 허용됩니다. 무료 플랜에서 생성한 이미지도 일부 상업 이용이 가능하지만 약관이 변동되므로 광고·브랜드 자료 사용 전에는 OpenAI 약관 페이지를 확인해야 합니다.",
              },
              {
                q: "한국어 답변이 어색한 경우 어떻게 개선하나요?",
                a: "Custom Instructions 에 '한국어 모국어 사용자처럼 자연스럽게', 직업과 선호 말투를 입력하면 즉시 개선됩니다. 전문 용어가 많은 분야에서는 Claude 가 더 자연스러운 결과를 주는 경우가 있어 같이 비교해 보는 방법도 효과적입니다.",
              },
              {
                q: "환불 가능한가요?",
                a: "구독 시작 후 14일 이내이고 사용량이 적다면 OpenAI 정책에 따라 환불 가능한 경우가 있습니다. 자세한 사항은 help.openai.com 에서 확인하거나 고객 지원으로 문의해야 합니다.",
              },
            ],
            relatedKeywords: [
              "ChatGPT 한국 결제",
              "ChatGPT Plus 가격",
              "ChatGPT 무료 한도",
              "ChatGPT 사용법",
              "ChatGPT 이미지 생성",
              "ChatGPT 음성 모드",
              "ChatGPT 한국어",
              "GPT-5 사용법",
              "ChatGPT 대안",
              "Claude vs ChatGPT",
            ],
          },
        },
        {
          name: "Claude",
          url: "https://claude.ai",
          blurb: "긴 문서 요약·코드 리뷰·한국어 톤이 강점인 챗봇.",
          details:
            "Anthropic 의 Opus 4.x / Sonnet 4.x 모델 기반입니다. 한 번에 200K 토큰(한국어 단행본 약 1권 분량) 컨텍스트를 처리할 수 있어 긴 계약서, 논문, 코드베이스 분석에 적합합니다. 한국어 문장 결이 차분한 편이라 진지한 글쓰기에서 자주 선택됩니다.",
          useCases: [
            "긴 PDF·계약서·논문 요약",
            "코드베이스 리뷰·리팩터링",
            "한국어 카피·시나리오 작성",
            "Projects 기능으로 자료 미리 등록 후 반복 작업",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Pro $20/월 / Max $100·$200/월",
          tip: "Projects 안에 자주 사용하는 자료(이력서, 회사 정보, 문체 가이드)를 미리 넣어두면 매 대화마다 같은 컨텍스트가 유지됩니다.",
          alternatives: ["ChatGPT", "Gemini"],
          founded: "2023",
          korean: true,
          hubSlug: "claude",
          detailContent: {
            longIntro: [
              "Claude 는 OpenAI 출신 형제·자매 연구자들이 설립한 Anthropic 이 만든 챗봇입니다. 2023년 출시 이후 2026년 현재 Opus 4.x 와 Sonnet 4.x 두 모델을 메인으로 운영하며, AI 안전성과 긴 문서 처리에 강점이 있습니다.",
              "가장 큰 차별점은 200K 토큰의 긴 컨텍스트 윈도우입니다. 한국어 단행본 약 1권 분량의 텍스트를 한 번에 입력해 요약·분석·번역이 가능합니다. 100쪽 분량의 PDF 계약서, 30개 파일의 코드베이스, 학술 논문 여러 편을 한 번에 던지고 질문하는 사용 패턴이 자리잡았습니다.",
              "한국어 출력 품질은 ChatGPT 와 함께 1티어로 평가됩니다. 특히 차분하고 형식을 갖춘 글, 보고서, 카피라이팅에서 자연스러운 결과가 자주 나옵니다. 코드 리뷰·리팩터링 정확도도 시니어 개발자에게 인정받는 수준이며, Claude Code 라는 별도의 터미널 도구를 통해 자동화까지 연결됩니다.",
              "한국에서 가입·결제·이용이 모두 정상 동작합니다. 다만 ChatGPT 와 달리 음성 모드와 자체 이미지 생성은 약하므로, 멀티미디어 생성보다는 텍스트·코드 중심 작업에 집중적으로 사용됩니다.",
            ],
            features: [
              { title: "Opus 4.x / Sonnet 4.x 모델", body: "Opus 는 최고 성능 추론·코딩 모델, Sonnet 은 속도와 비용 균형 모델. 작업에 따라 선택 가능합니다." },
              { title: "200K 토큰 컨텍스트", body: "한 번에 약 한국어 단행본 1권 또는 PDF 100쪽을 입력 가능. 긴 문서 작업에서 가장 큰 강점입니다." },
              { title: "Projects", body: "관련 자료를 프로젝트 단위로 묶어 같은 컨텍스트로 반복 대화. 무료 플랜에서도 사용할 수 있습니다." },
              { title: "Artifacts", body: "생성된 코드·문서·HTML 을 별도 패널에서 미리보기·수정. 웹 앱 시제품 제작에 자주 활용됩니다." },
              { title: "Computer Use", body: "스크린샷을 분석해 마우스·키보드를 자동 조작하는 에이전트 기능. Max 플랜에서 사용 가능합니다." },
              { title: "Claude Code 연동", body: "터미널·IDE 에서 claude 명령으로 멀티파일 변경, 테스트, git 커밋까지 자동화." },
              { title: "MCP (Model Context Protocol)", body: "외부 도구·데이터 소스를 표준화된 방식으로 연결. GitHub, Slack, DB 등에 직접 연결됩니다." },
              { title: "안전성·검열", body: "다른 챗봇 대비 답변 검열은 비슷한 수준이지만, 거짓 정보 생성 빈도가 낮다는 평가." },
            ],
            pricingPlans: [
              {
                name: "무료 (Free)",
                price: "0원",
                features: [
                  "Sonnet 모델 일일 한도",
                  "Projects 기능 사용",
                  "Artifacts 미리보기",
                  "PDF·이미지 업로드 (제한적)",
                ],
              },
              {
                name: "Pro",
                price: "$20/월 (약 2.7만원)",
                recommended: true,
                features: [
                  "Opus 4.x 사용량 5배 증가",
                  "Projects 무제한",
                  "Computer Use 일부 액세스",
                  "Claude Code 무료 사용량 포함",
                  "긴 작업 우선 처리",
                ],
              },
              {
                name: "Max",
                price: "$100·$200/월",
                features: [
                  "Opus 사용량 Pro 대비 5~20배",
                  "Computer Use 풀 액세스",
                  "Claude Code 대량 사용량",
                  "최우선 응답",
                  "팀 사전 시드 액세스",
                ],
              },
            ],
            pros: [
              "긴 PDF·코드베이스 분석 정확도 1티어",
              "한국어 문장 결 자연스러움 (격식 있는 글에 어울림)",
              "Projects 기능으로 컨텍스트 유지가 쉬움",
              "거짓 정보 생성 빈도가 다른 챗봇 대비 낮음",
              "Claude Code 로 터미널 자동화까지 연결",
            ],
            cons: [
              "이미지 생성 기능 없음 (DALL·E 같은 내장 도구 부재)",
              "음성 모드 약함 (ChatGPT 대비 명확히 열세)",
              "무료 플랜 일일 한도가 ChatGPT 보다 빡빡",
              "GPT Store 같은 사용자 생태계 부재",
            ],
            koreanContext:
              "한국 IP 로 접속·가입·결제 모두 정상 동작합니다. 국내·해외 신용카드와 체크카드 결제 가능, 카카오페이·네이버페이는 직접 지원되지 않습니다. 한국어 답변은 ChatGPT 보다 더 차분하고 격식 있는 톤이라 보고서·논문·계약서 같은 진지한 글에 어울립니다. 회사 자료 업로드 시 무료·Pro 플랜에서는 학습에 사용될 수 있으므로, 민감 자료는 가명화하거나 Team·Enterprise 플랜의 No-train 약관을 이용해야 합니다.",
            startingGuide: [
              { step: 1, title: "가입", body: "claude.ai 에 접속해 구글·이메일로 가입합니다. 한국 IP 정상 접근, VPN 불필요." },
              { step: 2, title: "Projects 만들기", body: "사이드바의 Projects 메뉴에서 새 프로젝트 생성. 자주 쓰는 자료(이력서, 문체 가이드, 회사 정보 등) 를 미리 등록합니다." },
              { step: 3, title: "Style 설정", body: "프로젝트 설정에서 Style·Tone 을 한국어 / 격식체 등으로 지정해두면 일관성이 유지됩니다." },
              { step: 4, title: "긴 문서 던지기", body: "PDF·Word·텍스트 파일을 드래그해서 한 번에 업로드 후 '핵심만 1페이지로 요약해줘' 같이 명령합니다." },
              { step: 5, title: "Pro 결제 (선택)", body: "긴 작업이 많거나 Opus 가 자주 필요하면 Pro($20/월) 결제. 한도가 크게 늘어납니다." },
            ],
            faq: [
              { q: "한국에서 가입·결제 가능한가요?", a: "가능합니다. 한국 IP 로 정상 접속되며 국내·해외 신용카드 모두 결제됩니다. VPN 불필요. 카카오·네이버페이는 미지원이므로 카드 결제를 사용합니다." },
              { q: "ChatGPT 와 비교하면 어떤가요?", a: "긴 PDF 요약, 코드베이스 리뷰, 한국어 격식 글쓰기는 Claude 가 우위입니다. 이미지 생성, 음성 모드, 웹 검색, GPT Store 는 ChatGPT 가 우위. 둘 다 무료 플랜이 있으니 같은 질문을 양쪽에 던져 결과 비교가 빠릅니다." },
              { q: "Opus 와 Sonnet 의 차이는?", a: "Opus 는 최상위 성능, Sonnet 은 비용·속도 균형. 일반 대화·코드는 Sonnet 으로 충분하고, 복잡한 추론·논문 분석·고급 코드 리팩터링에는 Opus 를 사용합니다. Pro 플랜에서 작업마다 선택 가능합니다." },
              { q: "회사 자료 올려도 되나요?", a: "위험합니다. 무료·Pro 는 입력 데이터가 학습에 사용될 수 있습니다. 설정 → Privacy 에서 학습 거부를 활성화하면 학습에 사용되지 않습니다. 회사 기밀과 고객 개인정보는 가명화 후 사용하거나 Team·Enterprise 플랜의 No-train 약관을 활용합니다." },
              { q: "Computer Use 가 뭔가요?", a: "Claude 가 직접 화면을 보고 마우스·키보드를 조작하는 에이전트 기능입니다. 웹사이트 자동 양식 작성, 반복 작업 자동화, QA 테스트 같은 용도에 사용됩니다. Pro 플랜에서 일부, Max 플랜에서 풀 액세스 됩니다." },
              { q: "MCP 가 뭔가요?", a: "Model Context Protocol. 외부 도구·DB·서비스를 챗봇에 연결하는 표준 규격입니다. GitHub, Slack, PostgreSQL, Notion 같은 외부 데이터 소스를 Claude 가 직접 읽고 쓸 수 있게 해줍니다. 개발자 친화적입니다." },
              { q: "Claude Code 와 Claude 챗봇의 차이는?", a: "Claude 챗봇은 웹·앱에서 대화형으로 사용하는 일반 챗봇입니다. Claude Code 는 터미널·IDE 에서 실행되어 멀티파일 변경, 테스트 실행, git 커밋·PR 생성까지 자동 처리합니다. Pro 이상 구독에 사용량이 포함됩니다." },
              { q: "한국어 답변이 어색한 경우?", a: "Projects 의 Custom Instructions 에 직업·말투·선호 형식을 명시. 매 대화 첫 줄에 '한국어 모국어 사용자처럼' 같은 지시문 추가도 효과적입니다." },
            ],
            relatedKeywords: [
              "Claude AI 한국 사용",
              "Claude Pro 가격",
              "Claude 무료 한도",
              "Claude vs ChatGPT",
              "Anthropic Claude",
              "Claude 200K 토큰",
              "Claude Code 사용법",
              "Claude Projects",
              "Claude 한국어",
              "Claude Computer Use",
            ],
          },
        },
        {
          name: "Gemini",
          url: "https://gemini.google.com",
          blurb: "Gmail·Docs·YouTube 와 통합되는 Google 의 AI.",
          details:
            "Google 의 Gemini 2.x Pro·Ultra 모델 기반입니다. Gmail 안에서 답장 자동 작성, Docs 에서 글 다듬기, Drive 파일 검색·요약, YouTube URL 요약·번역 등 Google 워크스페이스 통합이 핵심 강점입니다. 안드로이드 기본 음성 비서로도 사용됩니다.",
          useCases: [
            "Gmail·Docs·Sheets 안에서 AI 보조",
            "YouTube 영상 한국어 요약",
            "Google 검색 결과 자동 정리",
            "안드로이드 음성 비서",
            "긴 영상 받아쓰기·번역",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Advanced $20/월 (Google One AI Premium 포함)",
          alternatives: ["ChatGPT", "Claude"],
          founded: "2023",
          korean: true,
          imageUrl:
            "https://www.gstatic.com/lamda/images/gemini_aurora_thumbnail_4g_e74822ff0ca4259beb718.png",
          hubSlug: "gemini",
          detailContent: {
            longIntro: [
              "Gemini 는 Google 이 운영하는 챗봇입니다. 2023년 Bard 로 출시 후 2024년 Gemini 로 리브랜딩되었고 2026년 현재 Gemini 2.x Pro / Ultra 모델이 메인입니다. 단일 챗봇 성능만 보면 ChatGPT·Claude 와 비슷한 수준이지만 차별점은 Google 생태계 통합 깊이입니다.",
              "Gmail 안에서 답장 자동 작성, Google Docs 안에서 글 다듬기·번역, Google Drive 파일 자동 검색·요약, YouTube 영상 URL 만 던지면 자동 요약·번역, Google Maps 와 연결되어 한국 식당·여행 정보 검색까지 가능합니다. Google 워크스페이스(Gmail·Docs·Sheets·Drive·Calendar) 를 매일 쓰는 사용자에게 가장 자연스러운 AI 통합 경험을 제공합니다.",
              "안드로이드 사용자에게는 기본 음성 비서로 통합되어 Google Assistant 를 대체합니다. '카메라로 비춘 영문 메뉴판을 한국어로 읽어줘', '이 사진 속 식물 이름이 뭐야' 같은 멀티모달 명령이 자연스럽습니다.",
              "한국에서 가입·결제·이용 모두 정상 동작합니다. Google 계정만 있으면 무료 플랜이 즉시 활성화되고, Advanced 결제는 Google One AI Premium 구독($20/월) 에 포함됩니다.",
            ],
            features: [
              { title: "Gemini 2.x Pro / Ultra", body: "Pro 는 일반 작업용, Ultra 는 복잡한 추론·전문 분야용. Advanced 결제 시 Ultra 사용." },
              { title: "Gmail 통합", body: "받은 메일의 답장을 한 줄로 자동 작성. 'Help me write' 버튼으로 톤·길이 선택." },
              { title: "Docs / Sheets 안에서 사용", body: "문서·시트 안에서 글 다듬기, 표 생성, 수식 작성. 같은 자료를 보면서 작업." },
              { title: "Drive 검색·요약", body: "Drive 안의 모든 PDF·문서·이미지를 자연어로 검색. 'X 프로젝트 관련 자료 다 찾아줘' 한 줄." },
              { title: "YouTube 영상 요약", body: "유튜브 URL 만 던지면 자동 요약·번역·자막 추출. 강의·다큐 빠르게 소화." },
              { title: "Google Maps 통합", body: "한국 식당·관광지·교통 정보 자연어 검색. 단순 검색을 넘어 추천·일정 제안." },
              { title: "안드로이드 음성 비서", body: "Google Assistant 대체. 카메라·사진·화면 컨텍스트 인식." },
              { title: "Gem (커스텀 AI)", body: "특정 용도로 만든 사용자 정의 AI. ChatGPT 의 GPTs 와 유사." },
            ],
            pricingPlans: [
              {
                name: "무료",
                price: "0원",
                features: [
                  "Gemini Flash 모델 무제한",
                  "Gemini Pro 일일 한도",
                  "이미지 생성 (Imagen)",
                  "음성 대화",
                  "Gmail·Docs 통합 (Workspace 사용 시)",
                ],
              },
              {
                name: "Google One AI Premium",
                price: "$19.99/월 (Google One AI Premium)",
                recommended: true,
                features: [
                  "Gemini 2.x Ultra 사용",
                  "Deep Research",
                  "Veo 영상 생성",
                  "2TB 클라우드 저장",
                  "Gmail·Docs·Sheets 풀 통합",
                  "NotebookLM Plus",
                ],
              },
              {
                name: "기업용 (Workspace 통합)",
                price: "사용자당 $30/월~",
                features: [
                  "Gemini for Workspace",
                  "감사 로그·관리자 컨트롤",
                  "기업 데이터 학습 거부",
                  "SLA 보장",
                ],
              },
            ],
            pros: [
              "Google 워크스페이스(Gmail·Docs·Drive) 통합 압도적",
              "YouTube 영상 직접 요약·번역",
              "안드로이드 기본 음성 비서로 통합",
              "이미지·음성·동영상 멀티모달 자연스러움",
              "Google One AI Premium 으로 2TB 저장공간까지 한 번에",
            ],
            cons: [
              "단순 챗봇 성능은 ChatGPT·Claude 보다 약간 뒤처진다는 평가",
              "한국 사용자 중 Google 생태계 사용 안 하면 매력 약함",
              "Ultra 사용은 Google One AI Premium 구독 필요",
              "답변 검열이 다른 챗봇 대비 강한 편",
            ],
            koreanContext:
              "한국 Google 계정으로 즉시 무료 사용 가능. Google One AI Premium 결제는 한국 신용카드·체크카드 모두 정상. 카카오·네이버페이는 미지원. Gmail·Google Drive·구글 캘린더를 한국에서 메인으로 쓰는 사용자에게 가장 매력적입니다. 네이버 메일·네이버 클라우드를 주로 쓰는 사용자는 통합 효과가 떨어지므로 ChatGPT 또는 CLOVA X 가 더 자연스럽습니다.",
            startingGuide: [
              { step: 1, title: "Google 계정 로그인", body: "gemini.google.com 에 본인 Google 계정으로 로그인. 별도 가입 없이 즉시 사용." },
              { step: 2, title: "Gmail·Docs 사이드 패널 활성화", body: "Gmail 우측 사이드바에 Gemini 아이콘. Docs 도구 메뉴에서 'Help me write' 활성화." },
              { step: 3, title: "Drive·YouTube 권한 허용", body: "Drive 검색·YouTube 요약을 사용하려면 첫 사용 시 권한 허용 팝업." },
              { step: 4, title: "Google One AI Premium 결제 (선택)", body: "Ultra 모델·Deep Research·2TB 저장공간 필요시 $19.99/월 결제." },
              { step: 5, title: "안드로이드 기본 비서로 설정", body: "안드로이드 설정 → 앱 → 기본 비서 → Gemini 선택. Google Assistant 대체." },
            ],
            faq: [
              { q: "한국에서 무료로 사용 가능?", a: "가능합니다. Google 계정만 있으면 gemini.google.com 에서 즉시 무료 사용. 한국 IP·결제 정상. VPN 불필요." },
              { q: "ChatGPT·Claude 와 비교?", a: "단순 챗봇 성능은 ChatGPT 와 Claude 가 우위. Gmail·Drive·YouTube·Maps 통합과 안드로이드 비서 기능은 Gemini 가 독보적. Google 생태계 사용자에게는 Gemini 가 자연스럽고, 그 외에는 ChatGPT·Claude 가 더 강합니다." },
              { q: "Google One AI Premium 결제할 가치?", a: "Gmail·Drive·Docs 를 매일 쓰는 사용자라면 가치 있음. Ultra 모델 + 2TB 저장공간 + Veo 영상 + NotebookLM Plus 포함. 단순히 챗봇만 쓰려면 ChatGPT Plus 가 더 효율적." },
              { q: "Deep Research 가 뭐?", a: "복잡한 주제에 대해 Gemini 가 자동으로 수십 개 웹사이트를 탐색·정리해 종합 리포트를 작성하는 기능. 보통 5~15분 소요. 시장 조사·경쟁사 분석·논문 자료 수집에 강력. Advanced 플랜 전용." },
              { q: "한국어 답변 어색하면?", a: "Custom Instructions(개인화) 에서 한국어 사용 명시 + 직업·말투·선호 형식 입력. 그래도 어색하면 ChatGPT·Claude 가 한국어 자연스러움에서 우위." },
              { q: "회사 자료 올려도 되나요?", a: "기본값으로는 학습에 사용될 수 있습니다. 설정에서 학습 거부 활성화 또는 기업용 Gemini for Workspace 의 No-train 정책 활용. 회사 데이터는 가명화 후 사용 권장." },
              { q: "안드로이드 비서 어떻게 바꾸나요?", a: "안드로이드 설정 → 일반 → 앱 → 기본 앱 → 디지털 어시스턴트 → Gemini 선택. 홈 버튼 길게 누르면 Gemini 가 열림." },
              { q: "YouTube 영상 요약 정확도?", a: "자막 있는 영상은 매우 정확. 한국어 자막이 자동 인식되어 핵심만 1~2단락으로 요약됩니다. 자막 없는 영상은 음성 인식 후 요약하지만 정확도가 떨어질 수 있습니다." },
            ],
            relatedKeywords: [
              "Gemini 한국 사용",
              "Google Gemini 무료",
              "Gemini Advanced",
              "Gemini vs ChatGPT",
              "Gmail AI",
              "Google Drive AI",
              "유튜브 영상 요약",
              "안드로이드 Gemini",
              "Deep Research",
              "Google One AI Premium",
            ],
          },
        },
        {
          name: "Perplexity",
          url: "https://www.perplexity.ai",
          blurb: "출처 링크를 함께 제시하는 검색형 AI.",
          details:
            "각 답변에 5~10개의 각주 출처가 함께 표시됩니다. 사실 확인이 빠르고 보고서·논문에 인용 그대로 사용할 수 있습니다. 한국어로 질문해도 영문 출처를 자동 번역해 보여줍니다. Pro 모드에서는 GPT-5, Claude Opus, Gemini Pro 중 선택해 다중 검색이 가능합니다.",
          useCases: [
            "보고서·논문 자료 수집",
            "최신 뉴스 팩트체크",
            "제품·서비스 가격·기능 비교",
            "투자 분석 1차 출처 추적",
            "여행·맛집 정보 검색",
          ],
          pricing: "freemium",
          pricingNote: "무료 (Sonar) / Pro $20/월",
          alternatives: ["ChatGPT 검색", "Phind"],
          founded: "2022",
          korean: true,
          hubSlug: "perplexity",
          detailContent: {
            longIntro: [
              "Perplexity 는 2022년 출시된 AI 검색 엔진입니다. ChatGPT 가 답변만 주는 반면, Perplexity 는 모든 답변에 5~10개의 출처 링크(각주)를 함께 제시해 사실 확인이 즉시 가능합니다. 리서치·자료조사·팩트체크 용도에서 압도적인 강점이 있습니다.",
              "한국어 질문에 대해서도 영문 출처를 자동 번역해 보여줘 글로벌 자료 접근이 매우 빠릅니다. 보고서·논문 자료 수집, 최신 뉴스 사실 확인, 제품·서비스 비교 분석, 투자 1차 자료 추적 등에 자주 사용됩니다.",
              "2026년 현재 무료 플랜은 Sonar 모델(자체 개발) 기반이지만 검색·답변 품질이 충분히 좋습니다. Pro 결제 시 GPT-5, Claude Opus, Gemini Pro 중 작업에 맞게 선택해 다중 검색·심층 리서치가 가능해집니다.",
              "한국에서 가입·결제·이용 모두 정상입니다. 검색 결과가 풍부하고 출처 추적이 쉬워 학생·기자·연구원·마케터의 도구로 자리잡고 있습니다.",
            ],
            features: [
              { title: "출처 표시 검색", body: "모든 답변에 5~10개 각주 링크. 사실 확인 즉시 가능, 인용 그대로 사용." },
              { title: "Sonar 모델 (무료)", body: "Perplexity 자체 개발 모델. 검색·정리에 특화. 한국어 결과도 안정적." },
              { title: "Pro 다중 모델", body: "Pro 결제 시 GPT-5, Claude Opus, Gemini Pro 작업별로 선택." },
              { title: "Focus Mode", body: "Academic, Reddit, YouTube, Math 등 특정 소스만 검색." },
              { title: "Spaces (Collections)", body: "관련 검색을 폴더처럼 묶어 관리. 프로젝트 단위 자료 정리." },
              { title: "Deep Research", body: "복잡한 주제에 대해 자동으로 수십 개 사이트 탐색·종합 리포트 작성." },
              { title: "Image / File 업로드", body: "이미지·PDF·텍스트 파일 업로드 후 분석. ChatGPT 와 비슷한 멀티모달." },
              { title: "Pages (콘텐츠 생성)", body: "검색 결과로부터 자동으로 위키 스타일 페이지 생성." },
            ],
            pricingPlans: [
              {
                name: "무료",
                price: "0원",
                features: [
                  "Sonar 모델 무제한 검색",
                  "출처 표시",
                  "이미지·파일 업로드 제한적",
                  "Focus Mode 일부",
                ],
              },
              {
                name: "Pro",
                price: "$20/월 (약 2.7만원)",
                recommended: true,
                features: [
                  "GPT-5·Claude Opus·Gemini Pro 선택",
                  "Pro Search (다중 단계 검색)",
                  "Deep Research 무제한",
                  "이미지·파일 업로드 무제한",
                  "이미지 생성 (DALL·E·Playground)",
                  "API 일부 액세스",
                ],
              },
              {
                name: "Enterprise",
                price: "사용자당 $40/월",
                features: [
                  "Pro 의 모든 기능",
                  "SSO·SAML",
                  "팀 관리자 대시보드",
                  "No-train 약관",
                ],
              },
            ],
            pros: [
              "모든 답변에 출처 표시 — 사실 확인 즉시",
              "한국어 질문에 영문 출처 자동 번역",
              "Pro 에서 GPT·Claude·Gemini 모두 선택 가능",
              "Focus Mode 로 학술·Reddit·YouTube 등 소스별 검색",
              "Deep Research 로 자동 리포트 생성",
            ],
            cons: [
              "단순 대화·창작은 ChatGPT 가 우위",
              "한국어 모국어 사용자 톤은 ChatGPT·Claude 보다 약함",
              "Pro 무료 체험 짧음",
              "검색 결과가 영문 사이트 중심 (한국 검색은 네이버가 우위)",
            ],
            koreanContext:
              "한국 IP·신용카드 결제 정상. 카카오·네이버페이 미지원. 한국어 질문에 대해 영문 출처를 자동 한국어로 번역·요약해주는 부분이 다른 AI 검색 대비 매우 강력합니다. 한국 뉴스·블로그 검색은 네이버가 우위지만, 글로벌 자료(논문·해외 뉴스·기술 문서) 빠른 접근에는 Perplexity 가 1티어입니다. 학생 리서치·기자 팩트체크·B2B 자료 조사에 적합.",
            startingGuide: [
              { step: 1, title: "가입", body: "perplexity.ai 접속 후 구글·이메일로 가입. 한국 IP 정상." },
              { step: 2, title: "무료로 시작", body: "Sonar 모델로 한국어 또는 영어 질문. 답변 아래 출처 5~10개 자동 표시." },
              { step: 3, title: "Focus Mode 익히기", body: "검색창 좌측의 Focus 버튼 → Academic·Reddit·YouTube·Math 중 선택. 소스 한정 검색." },
              { step: 4, title: "Spaces 만들기", body: "관련 주제 검색들을 폴더로 묶어 정리. 프로젝트 단위 자료 관리." },
              { step: 5, title: "Pro 결제 (선택)", body: "Pro($20/월) 결제 시 GPT-5·Claude Opus·Deep Research 풀 사용. 1주일 무료 체험 자주 제공." },
            ],
            faq: [
              { q: "한국에서 가입·결제 가능?", a: "가능합니다. 한국 IP 정상, 국내·해외 신용카드 결제됨. VPN 불필요. 카카오·네이버페이는 미지원." },
              { q: "ChatGPT 와 무엇이 다른가요?", a: "ChatGPT 는 답변 위주, Perplexity 는 답변 + 출처 5~10개 자동 표시. 사실 확인·인용·자료조사가 핵심이면 Perplexity, 단순 대화·창작·이미지·음성은 ChatGPT 가 우위입니다. 둘은 보완 관계라 둘 다 쓰는 사용자가 많습니다." },
              { q: "Pro 결제할 가치?", a: "리서치·자료조사가 일상이면 가치 큽니다. Deep Research 만으로도 한 보고서 작성 시간을 시간 단위로 단축. 가끔 검색만 한다면 무료로 충분." },
              { q: "Focus Mode 가 뭐?", a: "검색 소스를 특정 영역으로 제한하는 모드. Academic(학술 논문), Reddit(커뮤니티 의견), YouTube(영상), Math(수학) 등이 있어 노이즈를 줄이고 원하는 유형의 정보만 빠르게 모을 수 있습니다." },
              { q: "Deep Research 사용법?", a: "Pro 플랜에서 검색창 옆 'Pro' 토글 → Deep Research 선택. 복잡한 주제 입력 후 5~15분 대기. AI 가 자동으로 수십 개 사이트를 탐색·정리해 종합 리포트 작성. 시장 조사·경쟁사 분석에 강력." },
              { q: "한국 뉴스 검색 정확도?", a: "글로벌·영문 자료는 매우 강하지만 한국 뉴스·블로그 검색은 네이버 검색이 우위입니다. 한국 시장·국내 이슈는 네이버, 글로벌·기술·학술은 Perplexity 조합 추천." },
              { q: "Image / PDF 업로드 가능?", a: "가능합니다. 사진을 올려 식별·해석 요청, PDF 를 올려 요약·번역·표 추출 등 ChatGPT 와 비슷한 멀티모달 지원. 무료 플랜은 일부 제한, Pro 는 무제한." },
              { q: "Sonar 모델 품질?", a: "Perplexity 자체 개발한 검색 특화 LLM. 단순 대화 성능은 GPT-5·Claude 보다 떨어지지만 '검색 후 정리' 작업에서는 충분히 우수. 무료 플랜만으로도 일상 검색 대부분 가능." },
            ],
            relatedKeywords: [
              "Perplexity 한국 사용",
              "Perplexity Pro 가격",
              "AI 검색 엔진",
              "Perplexity vs ChatGPT",
              "Deep Research",
              "출처 표시 AI",
              "리서치 AI",
              "Sonar 모델",
              "Focus Mode",
              "팩트체크 AI",
            ],
          },
        },
        {
          name: "Grok",
          url: "https://grok.com",
          blurb: "X(트위터) 실시간 데이터 기반 AI.",
          details:
            "일론 머스크의 xAI 에서 운영합니다. X(트위터) 의 실시간 트윗을 학습 데이터에 포함해 현재 진행 중인 이슈에 대한 응답에 강점이 있습니다. 다른 챗봇 대비 응답 검열이 적은 편으로 정치·사회 이슈에 대한 직설적 답변이 자주 나옵니다.",
          useCases: [
            "X 실시간 트렌드 분석",
            "정치·사회 이슈 직설 답변",
            "최신 뉴스 빠른 요약",
            "검열로 막힌 질문에 대한 보조 답변",
          ],
          pricing: "freemium",
          pricingNote: "무료 (한도 있음) / SuperGrok $30/월",
          alternatives: ["ChatGPT", "Perplexity"],
          founded: "2023",
          korean: true,
        },
      ],
    },
    {
      title: "🇰🇷 한국 토종 AI",
      items: [
        {
          name: "뤼튼 (Wrtn)",
          url: "https://wrtn.ai",
          blurb: "GPT·Claude 등 여러 모델을 무료로 동시 사용.",
          details:
            "뤼튼테크놀로지스가 운영하는 한국 AI 플랫폼입니다. 광고 기반으로 GPT, Claude, 자체 모델 등을 무료로 동시 사용할 수 있는 것이 특징입니다. 자기소개서, 이력서, 블로그·SNS 카피, 이커머스 상세페이지 등 한국식 글쓰기 템플릿이 풍부합니다.",
          useCases: [
            "GPT·Claude 동시 비교 (무료)",
            "자기소개서·이력서 한국식 첨삭",
            "블로그·인스타그램 카피라이팅",
            "결제 없이 AI 입문",
          ],
          pricing: "free",
          pricingNote: "광고 기반 무료, 일부 기능 유료",
          alternatives: ["ChatGPT", "Claude"],
          founded: "2022",
          korean: true,
          hubSlug: "wrtn",
          detailContent: {
            longIntro: [
              "뤼튼(Wrtn) 은 한국 스타트업 뤼튼테크놀로지스가 운영하는 한국 토종 AI 플랫폼입니다. 2022년 출시 이후 한국 사용자 1,000만+ 명을 확보했으며 광고 기반 운영으로 GPT·Claude 같은 글로벌 메이저 모델을 무료로 동시 사용하게 해주는 게 가장 큰 차별점입니다.",
              "한국식 자기소개서·이력서·블로그·SNS 카피·이커머스 상세페이지 같은 한국 글쓰기 템플릿이 풍부합니다. 글로벌 ChatGPT 가 잘 모르는 한국식 직무 키워드·기업 톤·면접 패턴을 뤼튼은 정확히 잡아냅니다. 취준생·블로거·1인 마케터에게 가장 자연스러운 한국 AI 도구입니다.",
              "결제 부담 없이 AI 입문 가능한 게 핵심 매력입니다. GPT-5·Claude 같은 모델을 직접 결제하면 월 $20 인데, 뤼튼에서는 광고 시청 또는 일정 한도 안에서 무료. 다만 광고 노출이 다소 많고 글로벌 모델 직접 사용 대비 응답 속도는 약간 느릴 수 있습니다.",
              "2025년 이후 뤼튼은 단순 AI 도구를 넘어 '한국 AI 슈퍼앱' 으로 진화 중입니다. 캐릭터 챗, 이미지 생성, 검색, 글쓰기 등 다양한 기능을 단일 앱에 통합했습니다.",
            ],
            features: [
              { title: "GPT·Claude 무료 동시 사용", body: "광고 기반으로 GPT, Claude, 자체 모델을 무료로 사용. 일정 한도 후 광고 또는 유료." },
              { title: "한국식 글쓰기 템플릿", body: "자기소개서·이력서·블로그·이커머스 상세페이지·SNS 카피 등 한국 시장 특화 템플릿 100+." },
              { title: "캐릭터 챗", body: "AI 캐릭터와 대화. 페르소나 학습·1:1 상담·롤플레이용." },
              { title: "AI 이미지 생성", body: "한국어 프롬프트로 이미지 생성. SDXL·DALL·E 기반 일부 무료 한도." },
              { title: "AI 검색", body: "한국 검색 결과 + AI 답변 통합. 네이버 검색과 비슷한 흐름." },
              { title: "한글 폰트 첨삭", body: "자기소개서·블로그 글 한국어 톤 조정. 격식체·캐주얼·SNS 톤 자동 변환." },
              { title: "모바일 앱", body: "안드로이드·iOS 앱 한국에서 가장 많이 다운로드된 AI 앱 중 하나." },
              { title: "Studio (커스텀 AI)", body: "본인만의 AI 챗봇·툴 만들어 공유. ChatGPT GPTs 와 유사." },
            ],
            pricingPlans: [
              {
                name: "무료 (광고 기반)",
                price: "0원",
                recommended: true,
                features: [
                  "GPT·Claude 사용 (일일 한도)",
                  "이미지 생성 일일 한도",
                  "한국식 글쓰기 템플릿 무제한",
                  "캐릭터 챗",
                  "광고 시청 시 한도 증가",
                ],
              },
              {
                name: "Pro / Plus",
                price: "월 7,900~19,000원 (변동 가능)",
                features: [
                  "광고 제거",
                  "GPT·Claude 사용량 대폭 증가",
                  "이미지 생성 무제한",
                  "Studio 고급 기능",
                  "한국 결제수단(카카오·신용카드)",
                ],
              },
            ],
            pros: [
              "GPT·Claude 무료 동시 사용 (광고 기반)",
              "한국식 자기소개서·이력서 템플릿 풍부",
              "결제 없이 AI 입문 가능",
              "한국 모바일 앱 사용성 좋음",
              "한국 결제수단(카카오페이·네이버페이) 직접 지원",
            ],
            cons: [
              "광고 노출이 많음",
              "글로벌 모델 직접 사용 대비 응답 속도 느림",
              "고급 기능은 결국 유료 (Pro 결제)",
              "기업·전문 작업은 ChatGPT·Claude 직접 결제가 더 안정적",
            ],
            koreanContext:
              "한국 사용자 특화 서비스. 카카오·네이버·이메일 로그인 모두 지원. 한국 결제수단(카카오페이·네이버페이·카드·계좌이체) 거의 모두 지원해 결제 진입장벽이 가장 낮습니다. 자기소개서·이력서·면접 답변 같은 한국 취업 시장 특화 템플릿이 다른 글로벌 AI 대비 압도적으로 풍부. 한국어 블로그 글쓰기 톤도 자연스럽습니다. 다만 글로벌 모델 직접 결제 대비 응답이 느리거나 가끔 끊길 수 있으므로 전문 작업에는 ChatGPT Plus 또는 Claude Pro 가 더 안정적입니다.",
            startingGuide: [
              { step: 1, title: "가입", body: "wrtn.ai 또는 모바일 앱 → 카카오·네이버·이메일 로그인. 한국 사용자 진입 1분." },
              { step: 2, title: "한국식 템플릿 사용", body: "'자기소개서', '이력서', '블로그 글' 등 검색. 한국 직무·기업 톤 자동 적용." },
              { step: 3, title: "GPT·Claude 모델 전환", body: "대화창 상단에서 GPT-5·Claude·자체 모델 선택. 한 화면에서 동시 비교 가능." },
              { step: 4, title: "광고 활용", body: "일일 한도 부족 시 짧은 광고 시청으로 한도 추가 충전. 무료 사용 극대화." },
              { step: 5, title: "Pro 결제 (선택)", body: "광고 없는 환경·무제한 사용량 필요시 Pro 결제. 한국 결제수단 그대로 사용." },
            ],
            faq: [
              { q: "정말 GPT·Claude 무료로 쓸 수 있나요?", a: "예. 광고 기반 운영이라 사용자에게 무료로 제공됩니다. 다만 일일 한도가 있고 한도 후에는 광고 시청 또는 Pro 결제가 필요. 본격 사용은 글로벌 모델 직접 결제가 더 안정적." },
              { q: "한국 결제수단 지원?", a: "예. 카카오페이·네이버페이·신용카드·계좌이체 모두 지원합니다. 한국 사용자가 가장 결제하기 편한 AI 도구 중 하나." },
              { q: "ChatGPT 직접 결제 vs 뤼튼 Pro?", a: "전문 작업·매일 사용은 ChatGPT Plus($20) 또는 Claude Pro($20) 직접 결제가 더 안정적. 가벼운 사용·한국식 글쓰기 위주면 뤼튼 무료 또는 Pro 가 비용 효율적." },
              { q: "자기소개서 작성 정확도?", a: "한국 직무·기업 톤 학습이 잘 되어 있어 글로벌 AI 보다 자연스러운 결과. 다만 본인 경험·강점은 직접 입력해야 하고 AI 생성 문구를 그대로 쓰지 말고 본인 표현으로 다듬는 게 좋음." },
              { q: "캐릭터 챗이 뭐?", a: "AI 가 특정 페르소나(성격·말투·전문 분야) 를 학습해 그 캐릭터로 대화하는 기능. 면접 연습, 1:1 상담, 롤플레이, 학습 보조 등에 사용됩니다." },
              { q: "광고가 많은데 부담스러우면?", a: "Pro 결제 시 광고 제거 + 사용량 대폭 증가. 가격이 글로벌 모델 직접 결제보다 저렴해 한국 사용자에게 부담 덜함." },
              { q: "Studio 가 뭐예요?", a: "본인만의 AI 챗봇·툴을 만들어 다른 사용자에게 공유하는 기능. ChatGPT GPTs 와 비슷. 사내 챗봇·교육용 AI 등에 활용 가능." },
              { q: "회사 자료 올려도 되나요?", a: "위험. 무료 플랜은 데이터가 학습에 사용될 수 있습니다. Pro 의 No-train 약관을 확인하거나 회사 기밀은 가명화 후 사용. 매우 민감한 자료는 자체 호스팅 또는 글로벌 Enterprise 플랜 권장." },
            ],
            relatedKeywords: [
              "뤼튼 무료 사용",
              "Wrtn 한국 AI",
              "자기소개서 AI",
              "이력서 AI 작성",
              "한국어 챗봇",
              "GPT 무료 사용",
              "Claude 무료 사용",
              "한국 AI 앱",
              "AI 캐릭터 챗",
              "뤼튼 Pro",
            ],
          },
        },
        {
          name: "CLOVA X (네이버)",
          url: "https://clova-x.naver.com",
          blurb: "네이버 자체 LLM 기반. 한국 쇼핑·맛집 정보가 정확.",
          details:
            "네이버의 HyperCLOVA X 모델 기반 챗봇입니다. 네이버 쇼핑·블로그·지도와 직접 연동되어 한국 상점·맛집·여행 정보의 정확도가 높습니다. 글로벌 모델이 잘 모르는 한국 동네 식당, 국내 쇼핑몰 정보를 잘 가져옵니다.",
          useCases: [
            "한국 쇼핑·맛집·여행 검색",
            "네이버 블로그 글쓰기 보조",
            "한국어 뉴스·정책 요약",
            "글로벌 AI 가 잘 모르는 국내 정보 검색",
          ],
          pricing: "free",
          pricingNote: "무료",
          alternatives: ["ChatGPT", "뤼튼"],
          founded: "2023",
          korean: true,
          hubSlug: "clova-x",
          detailContent: {
            longIntro: [
              "CLOVA X 는 네이버가 자체 개발한 HyperCLOVA X 모델 기반 챗봇입니다. 2023년 출시되어 한국 토종 LLM 중 가장 큰 규모(2,040억 파라미터) 로 운영됩니다. 글로벌 AI 가 잘 모르는 한국 동네 식당, 국내 쇼핑몰 정보, 한국 정책·뉴스에서 압도적 강점을 보입니다.",
              "가장 큰 차별점은 네이버 생태계 통합입니다. 네이버 쇼핑·블로그·지도·뉴스 데이터와 직접 연결되어 '강남 맛집 추천', '한라산 등반 코스 알려줘', '오늘 신라호텔 디너 메뉴' 같은 한국 로컬 질문에 ChatGPT·Claude 보다 정확한 답을 줍니다.",
              "완전 무료입니다. 네이버 계정만 있으면 즉시 사용 가능. 광고 노출도 없고 결제 안내도 없는 100% 무료 서비스입니다. 다만 단순 대화·창작·코드 성능은 ChatGPT·Claude 대비 약간 뒤처지며, 글로벌 시장 정보(영어권 뉴스, 해외 제품) 는 약합니다.",
              "한국 사용자가 한국 로컬 정보 검색에 최적화된 AI 를 원할 때 가장 자연스러운 선택입니다.",
            ],
            features: [
              { title: "HyperCLOVA X", body: "네이버 자체 개발 2,040억 파라미터 LLM. 한국어·한국 시장 특화." },
              { title: "네이버 쇼핑 연동", body: "'30만원대 노트북 추천' 같은 질문에 네이버 쇼핑 상품 직접 추천." },
              { title: "네이버 지도·맛집 연동", body: "'강남역 데이트 코스' 같은 한국 로컬 질문에 정확한 답변." },
              { title: "네이버 블로그·뉴스 검색", body: "최신 한국 뉴스·블로그 글 검색·요약." },
              { title: "캐릭터·전문가 채팅", body: "AI 가 특정 페르소나(연애상담사·요리사·여행작가 등) 로 대화." },
              { title: "이미지 분석", body: "한국 음식 사진·간판·메뉴판 분석 정확도 우수." },
              { title: "네이버 SSO", body: "네이버 계정 로그인으로 즉시 사용. 별도 가입 불필요." },
              { title: "100% 무료", body: "광고 없음, 결제 안내 없음, 사용량 한도 거의 없음." },
            ],
            pricingPlans: [
              {
                name: "100% 무료",
                price: "0원",
                recommended: true,
                features: [
                  "네이버 계정 로그인",
                  "사용량 한도 거의 없음",
                  "광고 노출 없음",
                  "네이버 생태계 모든 기능",
                  "이미지 분석·음성 입력",
                ],
              },
            ],
            pros: [
              "100% 무료 (광고·결제 안내 없음)",
              "한국 로컬 정보(맛집·쇼핑·여행) 정확도 글로벌 AI 대비 압승",
              "네이버 쇼핑·블로그·지도 직접 연동",
              "네이버 SSO 로 가입 1초",
              "한국어 답변 자연스러움",
            ],
            cons: [
              "단순 챗봇 성능은 ChatGPT·Claude 대비 약간 뒤",
              "글로벌·영어권 정보는 약함",
              "코드 작성·복잡한 추론은 글로벌 모델이 우위",
              "이미지 생성·음성 합성·영상 같은 멀티미디어 기능 부재",
            ],
            koreanContext:
              "네이버 ID 만 있으면 즉시 사용. 카카오·이메일 회원가입 불필요. 네이버 쇼핑·블로그·지도·뉴스를 메인으로 쓰는 한국 사용자에게 가장 자연스럽고, 글로벌 정보·기술 검색은 ChatGPT·Claude·Perplexity 가 더 강합니다. 한국식 표현·존댓말·격식체 처리가 매우 자연스러움. 100% 무료라 진입 비용 0원.",
            startingGuide: [
              { step: 1, title: "네이버 로그인", body: "clova-x.naver.com 접속 후 네이버 계정 로그인. 별도 가입 X." },
              { step: 2, title: "한국 로컬 질문부터", body: "'강남 회식 추천', '제주도 4일 여행 코스', '30만원대 갤럭시폰' 등 한국 로컬·쇼핑 질문이 강점." },
              { step: 3, title: "네이버 검색 결과 활용", body: "답변과 함께 네이버 쇼핑 상품·블로그·지도가 자동 노출. 클릭으로 바로 이동." },
              { step: 4, title: "캐릭터 채팅 활용", body: "특정 페르소나(연애상담·요리·여행) 와 1:1 대화. 한국 톤·문화 반영." },
              { step: 5, title: "이미지 분석", body: "한국 음식·간판·메뉴판 사진 업로드 → 자동 인식·설명. 글로벌 AI 대비 한국 시각 자료 정확도 높음." },
            ],
            faq: [
              { q: "정말 100% 무료?", a: "예. 광고 노출도 없고 결제 안내도 없습니다. 네이버 계정만 있으면 사용량 한도도 거의 없이 무제한 사용 가능." },
              { q: "ChatGPT 와 비교?", a: "글로벌 정보·코드 작성·복잡한 추론은 ChatGPT 우위. 한국 로컬 정보(맛집·쇼핑·여행·뉴스) 와 한국식 표현은 CLOVA X 우위. 둘을 같이 쓰는 한국 사용자가 많습니다." },
              { q: "회사 자료 올려도?", a: "네이버 약관에 따라 학습에 사용될 수 있습니다. 회사 기밀·민감 자료는 가명화 후 사용하거나 글로벌 AI 의 Enterprise 플랜 검토." },
              { q: "코드 작성도 가능?", a: "기본 코드 작성·디버깅은 가능하지만 ChatGPT·Claude·Cursor 같은 코딩 특화 도구가 훨씬 우위. 일상 코딩 보조보다는 한국 정보 검색·글쓰기에 집중하는 게 효율적." },
              { q: "이미지 생성도 가능?", a: "CLOVA X 자체는 이미지 분석만 가능하고 생성 기능은 부재. 이미지 생성은 ChatGPT 내장 DALL·E, Midjourney, Leonardo AI 등 사용." },
              { q: "네이버 외 한국 AI 와 비교?", a: "CLOVA X 는 무료·네이버 통합·한국 로컬 정보가 강점. 뤼튼은 GPT·Claude 모델 무료 사용·한국식 글쓰기 템플릿이 강점. 사용 목적에 따라 선택." },
              { q: "모바일에서 쓸 수 있나?", a: "네이버 앱 안에서 사용 가능. 네이버 검색창 옆 'AI 검색' 또는 별도 CLOVA X 진입. 모바일 사용성 우수." },
              { q: "기업·개발자 사용?", a: "기업·개발자용 API 는 HyperCLOVA X 별도 서비스(네이버 클라우드 플랫폼) 에서 유료로 제공. 본인 앱·서비스에 한국어 AI 를 임베드할 때 사용." },
            ],
            relatedKeywords: [
              "CLOVA X 사용법",
              "네이버 AI 무료",
              "한국 AI 챗봇",
              "HyperCLOVA X",
              "CLOVA X vs ChatGPT",
              "네이버 쇼핑 AI",
              "한국 로컬 AI",
              "네이버 검색 AI",
              "맛집 추천 AI",
              "한국어 챗봇 무료",
            ],
          },
        },
      ],
    },
    {
      title: "🎨 이미지 생성 AI",
      items: [
        {
          name: "ChatGPT 이미지 (DALL·E 3)",
          url: "https://chat.openai.com",
          blurb: "한국어 프롬프트 이해도가 가장 높은 이미지 AI.",
          details:
            "ChatGPT 안에서 한 줄 프롬프트로 이미지를 생성하는 기능입니다. 한국어 프롬프트 이해도가 다른 이미지 AI 대비 높고, 캐릭터 일관성과 이미지 안에 한글·영문 텍스트를 넣는 정확도가 안정적입니다. 무료 플랜에서도 일정 횟수 사용이 가능합니다.",
          useCases: [
            "한국어 명령으로 즉시 이미지 생성",
            "이미지 안에 한글 텍스트 합성 (포스터)",
            "캐릭터 일관성이 필요한 시리즈물",
            "유튜브 썸네일 한글 배경",
          ],
          pricing: "freemium",
          pricingNote: "ChatGPT 무료 한도 / Plus 무제한",
          alternatives: ["Midjourney", "Gemini Imagen"],
          founded: "2023",
          korean: true,
        },
        {
          name: "Midjourney",
          url: "https://www.midjourney.com",
          blurb: "사진·일러스트 퀄리티 최상위. 영문 프롬프트 중심.",
          details:
            "V7 기준으로 영화 콘셉트아트, 잡지 표지 수준의 미적 완성도를 제공합니다. 무료 체험은 거의 없고 100% 유료 서비스입니다. 한국어 프롬프트의 정확도는 영어 대비 낮으므로 영어 키워드 중심으로 작업하는 것이 좋습니다. 작업은 Discord 보다 웹앱(midjourney.com) 에서 진행하는 것이 편리합니다.",
          useCases: [
            "콘셉트아트·포트폴리오",
            "상업 광고 이미지",
            "잡지·출판물 일러스트",
            "유튜브 썸네일 배경",
          ],
          pricing: "paid",
          pricingNote: "Basic $10 / Standard $30 / Pro $60 / Mega $120 (월)",
          tip: "프롬프트 끝에 --style raw --ar 16:9 --s 50 같은 파라미터 묶음을 외워두면 톤 일관성이 유지됩니다.",
          alternatives: ["ChatGPT 이미지", "Leonardo", "Ideogram"],
          founded: "2022",
          hubSlug: "midjourney",
          detailContent: {
            longIntro: [
              "Midjourney 는 2022년 출시 이후 AI 이미지 생성 분야의 미적 완성도 1티어를 유지하는 서비스입니다. 영화 콘셉트 아트, 잡지 표지, 광고 컷 수준의 결과물을 텍스트 프롬프트만으로 만들어내며, 전 세계 디자이너·일러스트레이터·마케터의 도구로 자리잡았습니다.",
              "2026년 현재 V7 모델이 메인입니다. 기존 SD/DALL-E 대비 빛 표현·재질·인물 비율의 자연스러움이 압도적이라는 평가가 일관적입니다. 단점은 100% 유료라는 점과 한국어 프롬프트 정확도가 영어 대비 떨어지는 점. 영어 키워드 위주로 작업해야 진가가 나옵니다.",
              "초기에는 Discord 봇으로만 사용되었지만 2024년 이후 웹앱(midjourney.com) 으로 전환되어 일반 사용자도 쉽게 접근합니다. Style Reference, Character Reference, Vary Region 같은 고급 편집 기능이 추가되어 한 캐릭터·한 스타일을 시리즈로 만드는 작업이 가능해졌습니다.",
              "한국에서 가입·결제·이용 모두 정상 동작합니다. 다만 무료 체험이 없고 최소 Basic($10/월) 부터 시작해야 합니다.",
            ],
            features: [
              { title: "V7 최신 모델", body: "빛·재질·인물 비율의 자연스러움이 1티어. 영화 콘셉트·잡지 수준의 결과물." },
              { title: "Style Reference (--sref)", body: "참고 이미지를 주면 그 스타일을 그대로 다른 주제에 적용. 일관된 시리즈 제작에 필수." },
              { title: "Character Reference (--cref)", body: "특정 캐릭터의 얼굴·복장을 유지하면서 다른 장면에 배치. 만화·웹툰 작가에게 유용." },
              { title: "Vary Region", body: "이미지의 특정 영역만 부분 수정. Photoshop 의 inpaint 와 유사." },
              { title: "Pan / Zoom Out", body: "기존 이미지의 가장자리를 확장해 와이드 컷 또는 풀샷으로 변환." },
              { title: "Mood Boards", body: "참고 이미지 묶음을 만들어 스타일·톤 학습. 브랜드 일관성 유지." },
              { title: "Upscale", body: "기본 1024x1024 결과를 2배·4배로 업스케일. 인쇄·고해상도 출력 가능." },
              { title: "웹앱 + Discord", body: "2024년 이후 midjourney.com 웹앱 우선 사용. Discord 봇은 보조." },
            ],
            pricingPlans: [
              {
                name: "Basic",
                price: "$10/월",
                features: [
                  "월 약 200장 생성",
                  "Stealth Mode 없음 (공개)",
                  "Relax Mode 사용 불가",
                  "Style/Character Reference 사용",
                ],
              },
              {
                name: "Standard",
                price: "$30/월",
                recommended: true,
                features: [
                  "Fast Mode 15시간 (약 900장)",
                  "Relax Mode 무제한",
                  "Stealth Mode 없음",
                  "이미지 상업 사용 명시 허용",
                ],
              },
              {
                name: "Pro",
                price: "$60/월",
                features: [
                  "Fast Mode 30시간 (약 1800장)",
                  "Relax Mode 무제한",
                  "Stealth Mode (비공개 생성)",
                  "이미지 상업 사용",
                ],
              },
              {
                name: "Mega",
                price: "$120/월",
                features: [
                  "Fast Mode 60시간",
                  "Stealth Mode",
                  "최대 12개 동시 작업",
                  "API 일부 액세스",
                ],
              },
            ],
            pros: [
              "결과물 미적 완성도 1티어 (영화·잡지 수준)",
              "Style·Character Reference 로 일관된 시리즈 제작",
              "웹앱 사용성이 좋아 디자이너 비전공자도 사용 가능",
              "상업 이용 명시 허용 (Standard 이상)",
              "Mood Boards 로 브랜드 톤 학습",
            ],
            cons: [
              "100% 유료 (무료 체험 없음)",
              "한국어 프롬프트 정확도 영어 대비 낮음",
              "한국 신용카드 결제 시 가끔 차단 (해외 결제 카드 권장)",
              "텍스트 합성 정확도는 Ideogram·DALL·E 3 보다 약함",
              "Pro·Mega 가격대($60~120) 가 일반 사용자에게 부담",
            ],
            koreanContext:
              "한국 IP 와 신용카드(해외 결제) 로 가입·이용 모두 정상입니다. 일부 국내 전용 카드는 결제가 차단될 수 있어 해외 결제 가능 카드(국민·삼성·신한 글로벌 카드 등) 를 사용해야 안전합니다. 한국어 프롬프트는 인식되지만 결과물 디테일이 영어 대비 떨어지므로 핵심 키워드는 영어로 작성하는 패턴이 일반적입니다. 결제 화폐는 USD 라 환율 변동에 따라 청구 금액이 달라집니다.",
            startingGuide: [
              { step: 1, title: "가입", body: "midjourney.com 에 접속해 구글·디스코드 계정으로 가입. 한국 IP 정상." },
              { step: 2, title: "Basic 또는 Standard 결제", body: "$10 Basic 으로 충분히 테스트 가능. 본격적으로 쓸 거면 Standard($30) 가 Relax Mode 무제한이라 비용 효율적." },
              { step: 3, title: "웹앱에서 첫 이미지 생성", body: "Create 탭에서 영어 프롬프트 입력. 결과 4장 중 마음에 드는 거 Upscale (U1~U4) 또는 Variation (V1~V4)." },
              { step: 4, title: "Style/Character Reference 익히기", body: "참고 이미지를 드래그해 --sref 또는 --cref 로 지정. 같은 스타일·캐릭터의 시리즈 생성에 필수." },
              { step: 5, title: "프롬프트 라이브러리 만들기", body: "마음에 든 결과의 프롬프트를 Notion 등에 저장. 톤 일관성 유지에 핵심." },
            ],
            faq: [
              { q: "한국에서 결제 가능한가요?", a: "가능합니다. 한국 신용카드(해외 결제 활성화 카드) 와 체크카드로 결제할 수 있습니다. 일부 국내 전용 카드는 차단되므로 해외 결제 가능 카드를 사용하세요. 카카오·네이버페이는 지원되지 않습니다." },
              { q: "무료로 사용할 수 없나요?", a: "현재 무료 체험은 없습니다. 최소 Basic($10/월) 결제부터 사용 가능합니다. 무료로 이미지 AI 를 써보고 싶다면 ChatGPT 내장 DALL·E 3 (무료 한도), Leonardo AI(매일 150 크레딧 무료), Krea AI 를 먼저 추천합니다." },
              { q: "어느 플랜이 적당한가요?", a: "테스트 또는 가끔 사용이면 Basic($10). 매일 사용하거나 상업 용도면 Standard($30, Relax 무제한) 가 가성비 가장 좋습니다. Pro($60) 는 Stealth Mode(비공개) 가 필요할 때." },
              { q: "결과물의 상업 이용 가능한가요?", a: "Standard 이상 플랜에서 상업 이용이 명시적으로 허용됩니다. Basic 플랜은 사용 가능하지만 일부 제한이 있고, 무료 플랜 결과물(현재 없음)은 상업 제한이 있습니다. 약관은 변동되므로 다운로드 전 midjourney.com/legal 확인 필수." },
              { q: "한국어 프롬프트는 안 되나요?", a: "되긴 하지만 영어 대비 결과 디테일이 떨어집니다. 핵심 키워드(스타일·재질·구도·색상) 는 영어로, 인물 묘사·상황 설명은 한국어로 섞어 쓰는 방식이 보통입니다. 'cinematic photo of a man, warm light, --ar 16:9 --s 50' 같은 패턴." },
              { q: "Discord 와 웹앱 중 뭐가 좋나요?", a: "2024년 이후 웹앱(midjourney.com) 으로 통합되는 흐름입니다. 웹앱이 더 직관적이고 결과 정리도 편합니다. Discord 는 커뮤니티 상호작용·다른 사용자 결과 둘러보기에 유리." },
              { q: "Style Reference 와 Character Reference 차이는?", a: "Style Reference(--sref) 는 색감·재질·터치 같은 그림 스타일을 가져옵니다. Character Reference(--cref) 는 인물의 얼굴·복장·체격 같은 캐릭터 자체를 가져옵니다. 만화·웹툰처럼 같은 캐릭터가 여러 컷에 등장해야 할 때는 Character Reference 가 필수." },
              { q: "환불 가능한가요?", a: "구독 시작 후 사용량이 적으면 일부 환불이 가능한 경우가 있습니다. 자세한 사항은 midjourney.com 의 Help 에서 직접 문의해야 합니다." },
            ],
            relatedKeywords: [
              "Midjourney 한국 결제",
              "Midjourney V7 사용법",
              "Midjourney 가격 비교",
              "Midjourney 상업 이용",
              "Midjourney 프롬프트",
              "Midjourney Style Reference",
              "AI 이미지 생성기",
              "ChatGPT 이미지 vs Midjourney",
              "Midjourney 무료",
              "Midjourney 디스코드",
            ],
          },
        },
        {
          name: "Leonardo AI",
          url: "https://leonardo.ai",
          blurb: "Stable Diffusion 기반. 매일 150 크레딧 무료.",
          details:
            "Stable Diffusion 기반의 웹 이미지 생성 서비스입니다. 매일 150 크레딧(약 50~100장 분량)이 무료로 제공됩니다. LoRA, 캐릭터 학습, 이미지→이미지 변환 등 고급 기능을 GUI 로 다룰 수 있어 입문자에게 적합합니다.",
          useCases: [
            "다양한 스타일 무료 실험",
            "Stable Diffusion 입문",
            "캐릭터 디자인 (Character Reference)",
            "썸네일·SNS 이미지 양산",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 150 크레딧 / 유료 $10/월~",
          alternatives: ["Krea", "Recraft"],
          founded: "2022",
          hubSlug: "leonardo",
          detailContent: {
            longIntro: [
              "Leonardo AI 는 2022년 호주에서 출시된 Stable Diffusion 기반 이미지 생성 서비스입니다. 매일 150 크레딧을 무료로 제공해 약 50~100장의 이미지를 비용 없이 생성할 수 있는 게 가장 큰 차별점입니다. AI 이미지를 처음 접하는 사용자에게 진입 비용이 가장 낮습니다.",
              "Stable Diffusion 기반이라 LoRA, Character Reference, Style Transfer, Inpainting, ControlNet 같은 고급 기능을 GUI 로 다룰 수 있습니다. Midjourney 가 미적 완성도 1티어라면 Leonardo 는 커스터마이즈 자유도가 강점입니다.",
              "2024년 Canva 가 Leonardo 를 인수하면서 Canva Pro 사용자에게 Leonardo 기능 일부가 통합되었습니다. 단독으로도 운영되고 있으며 무료 한도가 가장 후한 이미지 AI 중 하나입니다.",
              "한국에서 가입·결제·이용 모두 정상. 한국어 프롬프트도 인식하지만 영어 키워드를 섞어 쓰는 게 결과 디테일이 좋습니다.",
            ],
            features: [
              { title: "매일 150 무료 크레딧", body: "약 50~100장 이미지 무료 생성. 가입 즉시." },
              { title: "Stable Diffusion 기반", body: "오픈소스 모델이라 커스터마이즈 자유도 높음. LoRA·체크포인트 변경 가능." },
              { title: "Character Reference", body: "특정 캐릭터의 얼굴·복장 유지하면서 다른 장면 생성." },
              { title: "Inpainting / Outpainting", body: "이미지의 일부 영역만 수정 또는 가장자리 확장." },
              { title: "ControlNet", body: "포즈·구도·뎁스 등을 참고 이미지로 제어. 정교한 구도 잡기." },
              { title: "Universal Upscaler", body: "저화질 이미지 4K·8K 업스케일. Midjourney 결과물 후처리에도 사용." },
              { title: "Realtime Canvas", body: "실시간 캔버스 — 스케치를 그리면 즉시 완성 이미지 생성." },
              { title: "Image-to-Video", body: "생성한 이미지로부터 짧은 영상 생성." },
            ],
            pricingPlans: [
              {
                name: "무료 (Free)",
                price: "0원",
                features: [
                  "매일 150 크레딧 (약 50~100장)",
                  "기본 모델 + 일부 Fine-tuned",
                  "비상업 이용",
                  "Image Studio 기능 일부",
                  "공개 갤러리 노출",
                ],
              },
              {
                name: "Apprentice",
                price: "$10/월 (약 1.4만원)",
                features: [
                  "월 8,500 크레딧",
                  "상업 이용",
                  "비공개 생성",
                  "Image Guidance",
                  "Realtime Canvas 풀 사용",
                ],
              },
              {
                name: "Artisan",
                price: "$24/월",
                recommended: true,
                features: [
                  "월 25,000 크레딧",
                  "상업 이용",
                  "비공개 생성",
                  "Universal Upscaler",
                  "Image-to-Video",
                ],
              },
              {
                name: "Maestro",
                price: "$48/월",
                features: [
                  "월 60,000 크레딧",
                  "최우선 처리",
                  "팀 협업",
                  "고급 모델 액세스",
                ],
              },
            ],
            pros: [
              "매일 150 크레딧 무료 (이미지 AI 중 최대)",
              "Stable Diffusion 기반 커스터마이즈 자유도 1티어",
              "Realtime Canvas·Inpainting·ControlNet 풀 GUI",
              "Midjourney 대비 가격 절반 (Artisan $24)",
              "한국 신용카드 결제 정상",
            ],
            cons: [
              "미적 완성도는 Midjourney 가 우위",
              "한국어 프롬프트 정확도는 ChatGPT 이미지가 우위",
              "무료 플랜 결과는 비상업 이용만",
              "결과물 일관성은 Midjourney Style Reference 보다 약함",
            ],
            koreanContext:
              "한국 IP 와 신용카드 결제 정상. 카카오·네이버페이 미지원. 한국어 프롬프트 인식되지만 핵심 키워드(스타일·재질·구도) 는 영어로 작성하는 게 결과 디테일이 좋습니다. 무료 플랜이 가장 풍부해 AI 이미지 입문 사용자에게 적합. Stable Diffusion 기반이라 Reddit·Discord 등 글로벌 커뮤니티 리소스(프롬프트·LoRA) 가 풍부합니다.",
            startingGuide: [
              { step: 1, title: "가입", body: "leonardo.ai 접속 후 구글·이메일 가입. 즉시 매일 150 크레딧 받음." },
              { step: 2, title: "Image Generation 첫 이미지", body: "메인 메뉴 'Image Generation' → 프롬프트 영어로 입력 → 'Generate'. 4장 결과 동시 생성." },
              { step: 3, title: "Realtime Canvas 체험", body: "Realtime Canvas 메뉴에서 스케치 그리면 실시간으로 완성 이미지 옆에 표시. 디자인 시안 빠른 시각화." },
              { step: 4, title: "Character Reference 익히기", body: "캐릭터 일관성이 필요한 시리즈 만들 때 Reference 이미지 업로드. 같은 캐릭터 다른 장면 생성." },
              { step: 5, title: "Apprentice·Artisan 결제 결정", body: "상업 이용 필요 또는 무료 한도 부족 시 Apprentice($10) 부터. 본격 사용은 Artisan($24)." },
            ],
            faq: [
              { q: "한국에서 결제 가능?", a: "가능. 한국 신용카드·체크카드(해외 결제 활성화) 결제 정상. 카카오·네이버페이 미지원." },
              { q: "Midjourney 와 비교?", a: "미적 완성도·Style Reference 일관성은 Midjourney 우위. 무료 한도·커스터마이즈 자유도·가격은 Leonardo 우위. 본격 상업물은 Midjourney, 입문·실험·다양한 시도는 Leonardo 가 유리." },
              { q: "무료로 어디까지?", a: "매일 150 크레딧으로 50~100장 무료 생성. 단, 결과는 비상업 이용만. 유튜브·블로그 같은 비영리 콘텐츠는 OK 지만 광고·상업물에는 Apprentice 이상 결제 필요." },
              { q: "한국어 프롬프트?", a: "기본 인식되지만 결과 디테일이 영어 대비 떨어집니다. 'cyberpunk cityscape, neon lights, rain' 같이 영어 키워드 위주로 작성하고 한국 특수 표현만 한국어로 섞는 게 일반적." },
              { q: "Stable Diffusion 이 뭐?", a: "오픈소스 이미지 생성 AI 모델입니다. Stability AI 가 개발했고 Leonardo·Krea·DreamStudio 같은 서비스가 이 모델을 기반으로 운영됩니다. 커스터마이즈가 자유로워 LoRA(특정 스타일 학습 모델) 같은 고급 기능이 가능." },
              { q: "Canva 와 무슨 관계?", a: "2024년 Canva 가 Leonardo 를 인수했습니다. Canva Pro 사용자는 Canva 안에서 Leonardo 일부 기능을 사용할 수 있고, Leonardo 단독 서비스도 그대로 운영됩니다." },
              { q: "ControlNet 사용법?", a: "Image Generation 메뉴에서 'Image Guidance' 활성화 → 참고 이미지 업로드 → Canny Edge·Depth·Pose 등 모드 선택. 참고 이미지의 구도·뎁스·포즈를 유지하면서 다른 스타일·내용으로 재생성." },
              { q: "환불?", a: "구독 시작 후 미사용 또는 일부 사용 시 부분 환불 가능. 자세한 사항은 leonardo.ai/help 에서 확인." },
            ],
            relatedKeywords: [
              "Leonardo AI 사용법",
              "Leonardo AI 무료",
              "Stable Diffusion 사이트",
              "AI 이미지 생성 무료",
              "Leonardo vs Midjourney",
              "Realtime Canvas",
              "ControlNet",
              "Character Reference",
              "Leonardo Apprentice",
              "AI 이미지 입문",
            ],
          },
        },
        {
          name: "Ideogram",
          url: "https://ideogram.ai",
          blurb: "이미지 안에 영문 텍스트를 가장 정확하게 렌더링.",
          details:
            "로고, 포스터, 광고 카피와 같이 이미지 안에 글자가 들어가는 작업에서 정확도가 가장 높습니다. 다른 이미지 AI 가 글자를 왜곡하는 반면 Ideogram 은 글자 형태가 거의 깨지지 않습니다. 한글은 아직 영문 수준의 정확도를 보이지 않습니다.",
          useCases: [
            "로고·BI 시안",
            "광고 포스터 (영문 카피)",
            "유튜브 썸네일 (영문 큰 글씨)",
            "타이포그래피 실험",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 10장 / Basic $8/월 / Plus $20/월",
          alternatives: ["ChatGPT 이미지", "Midjourney"],
          founded: "2022",
        },
        {
          name: "Krea AI",
          url: "https://www.krea.ai",
          blurb: "실시간 캔버스와 8K 업스케일.",
          details:
            "캔버스에 스케치를 그리면 실시간으로 완성된 이미지가 함께 생성됩니다. 저화질 이미지의 8K 업스케일 품질도 상위권입니다. 영상 생성(Krea Video) 기능도 빠르게 발전하고 있습니다.",
          useCases: [
            "스케치 → 완성 이미지 (실시간)",
            "저화질 이미지 8K 업스케일",
            "기존 이미지 변환·리믹스",
            "디자인 콘셉트 빠른 시각화",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 50 크레딧 / 유료 $10/월~",
          alternatives: ["Magnific", "Topaz"],
          founded: "2022",
        },
      ],
    },
    {
      title: "🎬 영상 생성 AI",
      items: [
        {
          name: "Runway",
          url: "https://runwayml.com",
          blurb: "텍스트·이미지에서 영상 생성. 광고·뮤직비디오 현장 사용.",
          details:
            "Gen-3 Alpha 모델 기반으로 5~10초 분량의 영상을 텍스트 또는 이미지에서 생성합니다. 무료 일 125 크레딧이 제공되어 가입 후 즉시 테스트가 가능합니다. 영상 안 오브젝트 제거·교체, 카메라 무빙 제어 등 부가 기능도 포함됩니다.",
          useCases: [
            "유튜브·릴스 b-roll 영상",
            "광고·홍보 콘셉트 컷",
            "기존 영상 오브젝트 제거",
            "정지 이미지의 영상화",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 125 크레딧 / Standard $15/월~",
          alternatives: ["Pika", "Kling", "Sora"],
          founded: "2018",
          hubSlug: "runway",
          detailContent: {
            longIntro: [
              "Runway 는 2018년 출시된 영상 생성 AI 분야의 사실상 표준입니다. 2026년 현재 Gen-3 Alpha 모델이 메인이며, 광고·뮤직비디오·SNS 릴스·유튜브 b-roll 제작 현장에서 가장 자주 사용되는 도구입니다.",
              "텍스트→영상, 이미지→영상, 영상→영상 변환 모두 가능합니다. 5~10초 분량의 영상을 텍스트 프롬프트 또는 참고 이미지로 생성하고, 영상 안 오브젝트 제거·교체·카메라 무빙 제어 같은 후처리도 한 도구에서 처리합니다.",
              "무료 일 125 크레딧 제공으로 진입 비용이 낮습니다. 본격 사용은 Standard($15) 또는 Pro($35) 결제. 한국에서 가입·결제·이용 모두 정상이지만 한국어 프롬프트 정확도는 영어 대비 떨어지므로 영어 키워드 위주가 좋습니다.",
              "Adobe Premiere·DaVinci Resolve 같은 전통 영상 편집 도구와 병행 사용이 일반적입니다. Runway 로 b-roll 또는 트랜지션을 만들고 메인 편집은 Premiere 에서.",
            ],
            features: [
              { title: "Gen-3 Alpha 모델", body: "5~10초 영상 생성. 빛·재질·인물 동작 자연스러움 1티어." },
              { title: "텍스트→영상", body: "영어 프롬프트만으로 영상 생성. 'cinematic shot of a city at night' 같은 입력." },
              { title: "이미지→영상", body: "정지 이미지로부터 5~10초 영상 확장. 사진 → 움직이는 영상." },
              { title: "Lip Sync", body: "인물 영상에 다른 음성을 입혀 립싱크. 한국어 음성도 지원." },
              { title: "Inpaint Video", body: "영상 안 특정 영역만 부분 수정. 워터마크 제거·객체 교체." },
              { title: "Motion Brush", body: "정지 이미지에 직접 움직임 영역과 방향을 그려 정밀 제어." },
              { title: "Green Screen", body: "AI 가 영상의 인물·객체를 자동 분리. 배경 합성 작업 단순화." },
              { title: "Camera Control", body: "팬·줌·궤도 같은 카메라 무빙 자연어로 명령." },
            ],
            pricingPlans: [
              {
                name: "무료 (Basic)",
                price: "0원",
                features: [
                  "일 125 크레딧 (약 5초 영상 1~2개)",
                  "기본 모델",
                  "비상업 이용",
                  "워터마크 포함",
                ],
              },
              {
                name: "Standard",
                price: "$15/월",
                recommended: true,
                features: [
                  "월 625 크레딧",
                  "Gen-3 Alpha 풀 액세스",
                  "상업 이용",
                  "워터마크 제거",
                  "더 긴 영상 (최대 10초)",
                ],
              },
              {
                name: "Pro",
                price: "$35/월",
                features: [
                  "월 2,250 크레딧",
                  "비공개 작업",
                  "고해상도 출력",
                  "Lip Sync 무제한",
                ],
              },
            ],
            pros: [
              "영상 생성 결과물 품질 1티어 (광고·뮤직비디오 실사용)",
              "텍스트·이미지·영상→영상 모두 단일 도구",
              "Lip Sync 한국어 지원",
              "Motion Brush 같은 정밀 제어",
              "무료 일 125 크레딧 제공",
            ],
            cons: [
              "한국어 프롬프트 정확도 영어 대비 낮음",
              "5~10초 짧은 영상 (긴 영상은 Sora 가 우위)",
              "프롬프트 학습 곡선 (영어·영상 용어 익숙해야)",
              "Pro 가격이 일반 사용자에게 부담",
            ],
            koreanContext:
              "한국 IP·신용카드 결제 정상. 카카오·네이버페이 미지원. 한국어 프롬프트는 인식되지만 결과 디테일이 영어 대비 떨어지므로 영어 키워드(cinematic, slow motion, golden hour 같은 영상 용어) 위주로 작성. Lip Sync 의 한국어 발음은 자연스럽게 처리됩니다. 한국 광고·릴스·유튜브 채널에서도 b-roll 또는 트랜지션 제작용으로 빠르게 도입되고 있습니다.",
            startingGuide: [
              { step: 1, title: "가입", body: "runwayml.com 접속 후 구글·이메일 가입. 즉시 125 크레딧 받음." },
              { step: 2, title: "Image to Video 부터", body: "Tools → Image to Video. 본인 사진·이미지 업로드 후 'subtle camera pan to the right' 같은 짧은 영어 명령." },
              { step: 3, title: "Text to Video 시도", body: "Tools → Text to Video. 'cinematic shot of mountains at sunset, slow zoom' 같은 영어 프롬프트." },
              { step: 4, title: "Lip Sync 한국어 더빙", body: "Tools → Lip Sync → 인물 영상 업로드 + 한국어 음성 파일. 자동으로 입 모양 맞춤." },
              { step: 5, title: "Standard 결제", body: "본격 사용 시 Standard($15) 결제로 워터마크 제거 + 월 625 크레딧." },
            ],
            faq: [
              { q: "한국에서 결제?", a: "한국 신용카드·체크카드(해외 결제) 정상. 카카오·네이버페이 미지원." },
              { q: "Sora 와 비교?", a: "Sora 는 최대 20초 더 긴 영상·1080p 고해상도, ChatGPT Plus 결제에 포함. Runway 는 5~10초 짧지만 단독 도구로 후처리 기능 풍부. 영상 길이 중심이면 Sora, 정밀 제어·후처리 중심이면 Runway." },
              { q: "유튜브에 써도 되나?", a: "Standard 이상 결제 시 상업 이용 허용. 무료 플랜은 비상업·워터마크 포함이므로 수익 창출 영상은 Standard 이상 결제 필수." },
              { q: "Lip Sync 한국어 정확도?", a: "한국어 음성 자연스럽게 입 모양 맞춤. 다국어 더빙 영상 만들 때 유용. ElevenLabs 로 한국어 음성 합성 후 Runway 로 립싱크 조합도 가능." },
              { q: "Motion Brush 어떻게 써?", a: "정지 이미지 업로드 후 움직이고 싶은 영역을 브러시로 칠하고 화살표로 방향 지정. 'A 영역은 왼쪽으로 움직이고 B 영역은 위로' 같은 정밀 제어." },
              { q: "한국 광고 제작에 적합?", a: "광고 b-roll, 인서트 컷, 모션 그래픽 등에 자주 사용됩니다. 메인 영상은 전통 촬영 + Runway 로 보조 컷 추가가 일반적." },
              { q: "다른 영상 AI 와 결합?", a: "한 도구만 쓰지 않고 Runway(후처리)·Sora(긴 영상)·Kling(인물 동작)·HeyGen(아바타) 등을 작업별로 골라 쓰는 패턴이 일반적." },
              { q: "환불?", a: "구독 시작 후 사용량이 적으면 부분 환불 가능. 자세한 사항은 help.runwayml.com." },
            ],
            relatedKeywords: [
              "Runway AI 사용법",
              "Runway 가격",
              "AI 영상 생성",
              "Runway vs Sora",
              "Gen-3 Alpha",
              "Motion Brush",
              "Lip Sync AI",
              "유튜브 b-roll AI",
              "영상 생성 무료",
              "AI 영상 편집",
            ],
          },
        },
        {
          name: "Sora (OpenAI)",
          url: "https://sora.com",
          blurb: "OpenAI 의 영상 AI. 최대 20초·1080p.",
          details:
            "ChatGPT Plus 결제 시 함께 제공됩니다. 한 번에 최대 20초·1080p 까지 영상을 생성할 수 있으며, 카메라 동선과 물리 표현이 자연스러운 편입니다.",
          useCases: [
            "최대 20초 분량의 긴 영상",
            "물리 시뮬레이션 (액체·중력 표현)",
            "정교한 카메라 무빙",
            "ChatGPT 안에서 직접 생성",
          ],
          pricing: "paid",
          pricingNote: "ChatGPT Plus($20)·Pro($200) 에 포함",
          alternatives: ["Runway", "Kling"],
          founded: "2024",
          korean: true,
          hubSlug: "sora",
          detailContent: {
            longIntro: [
              "Sora 는 OpenAI 가 만든 영상 생성 AI 입니다. 2024년 처음 공개되어 충격적인 영상 품질로 화제가 되었고 2026년 현재 ChatGPT Plus($20) 와 Pro($200) 구독자에게 포함되어 제공됩니다.",
              "최대 20초·1080p HD 영상 생성이 가능해 영상 AI 중 가장 긴 결과물을 만들 수 있습니다. 카메라 무빙·물리 시뮬레이션(액체·중력·빛 반사) 자연스러움이 다른 영상 AI 대비 우위에 있어 영화 콘셉트·광고 컷·뮤직비디오 시안에 적합합니다.",
              "ChatGPT Plus 결제에 포함되어 별도 결제 없이 영상 생성을 시작할 수 있는 게 큰 장점입니다. Runway·Kling 처럼 별도 구독을 하지 않아도 ChatGPT 사용자라면 즉시 사용 가능.",
              "한국에서 가입·결제·이용 모두 정상. ChatGPT 통합으로 한국어 프롬프트도 ChatGPT 가 자동으로 영어로 번역해 Sora 에 전달하므로 한국어 사용성이 다른 영상 AI 대비 좋습니다.",
            ],
            features: [
              { title: "최대 20초·1080p", body: "영상 AI 중 가장 긴 길이·고해상도. 영화 콘셉트·광고 컷 가능." },
              { title: "물리 시뮬레이션", body: "액체 흐름·중력·빛 반사·연기 등 물리 표현 자연스러움 1티어." },
              { title: "ChatGPT 통합", body: "ChatGPT 안에서 직접 명령. 한국어 프롬프트 자동 번역 후 Sora 에 전달." },
              { title: "Storyboard 모드", body: "여러 장면을 한 영상으로 연결. 시작·중간·끝 명시." },
              { title: "Remix", body: "기존 영상의 일부를 수정. 특정 객체·배경·동작 교체." },
              { title: "Blend", body: "두 영상을 부드럽게 합치는 트랜지션 자동 생성." },
              { title: "Pro 고급 옵션", body: "ChatGPT Pro($200) 구독자는 더 긴 영상·더 빠른 생성·고급 컨트롤 액세스." },
            ],
            pricingPlans: [
              {
                name: "ChatGPT Plus 포함",
                price: "$20/월 (ChatGPT Plus)",
                recommended: true,
                features: [
                  "Sora 영상 생성 일일 한도",
                  "최대 5~10초 영상",
                  "720p~1080p",
                  "ChatGPT 모든 기능 포함",
                ],
              },
              {
                name: "ChatGPT Pro 포함",
                price: "$200/월 (ChatGPT Pro)",
                features: [
                  "Sora 무제한 또는 매우 높은 한도",
                  "최대 20초 영상",
                  "1080p HD",
                  "Storyboard·Remix·Blend 풀 액세스",
                  "최우선 생성 속도",
                ],
              },
            ],
            pros: [
              "최대 20초 영상 (다른 AI 대비 가장 긴 길이)",
              "물리 시뮬레이션·카메라 무빙 자연스러움 1티어",
              "ChatGPT Plus 결제에 포함 (별도 결제 불필요)",
              "한국어 프롬프트 자동 번역으로 사용성 좋음",
              "Storyboard·Remix·Blend 같은 후처리 통합",
            ],
            cons: [
              "ChatGPT Plus 또는 Pro 구독 필수 (단독 결제 불가)",
              "Plus 한도로는 매일 사용에 부족할 수 있음",
              "결과물 일관성은 Runway Style Reference 보다 약함",
              "Pro $200 은 영상 작업이 본업이 아니면 부담",
            ],
            koreanContext:
              "ChatGPT 와 동일하게 한국 IP·신용카드 결제 정상. 카카오·네이버페이 미지원. ChatGPT 의 한국어 자연어 처리가 Sora 의 영어 프롬프트로 자동 변환되므로 한국 사용자에게 가장 자연스러운 영상 AI 경험을 제공합니다. ChatGPT 를 이미 쓰는 한국 사용자라면 별도 영상 AI 결제 없이 Sora 로 입문하기 좋습니다.",
            startingGuide: [
              { step: 1, title: "ChatGPT Plus 결제", body: "chat.openai.com 가입 + Plus 결제 ($20). Sora 자동 활성화." },
              { step: 2, title: "sora.com 또는 ChatGPT 에서 명령", body: "sora.com 직접 접속 또는 ChatGPT 안에서 '~한 영상 만들어줘' 명령. 한국어로 가능." },
              { step: 3, title: "짧은 영상부터", body: "5초 영상으로 시작해 결과 확인. 점차 길이·복잡도 증가." },
              { step: 4, title: "Storyboard 활용", body: "Storyboard 모드에서 시작·중간·끝 장면 명시. 더 일관된 결과." },
              { step: 5, title: "Pro 결제 결정", body: "더 긴 영상·일일 한도 부족·Storyboard 풀 사용 필요 시 Pro($200). 일반 사용자는 Plus 면 충분." },
            ],
            faq: [
              { q: "ChatGPT Plus 만 결제하면 Sora 무료 사용?", a: "예. ChatGPT Plus($20) 안에 Sora 영상 생성 한도가 포함됩니다. 별도 결제 없이 즉시 사용 가능." },
              { q: "Runway 와 비교?", a: "Sora 는 더 긴 영상(최대 20초)·더 자연스러운 물리·ChatGPT 통합이 장점. Runway 는 정밀 후처리(Motion Brush·Inpaint Video)·다양한 단독 도구가 강점. 한 줄 명령으로 빠르게 영상이 필요하면 Sora, 정밀 작업은 Runway." },
              { q: "한국어 명령 가능?", a: "예. ChatGPT 가 자동으로 한국어를 영어로 번역해 Sora 에 전달하므로 한국어로 명령해도 자연스럽게 동작합니다. 다른 영상 AI 대비 한국어 사용성이 가장 좋습니다." },
              { q: "최대 영상 길이?", a: "ChatGPT Plus 는 5~10초, Pro 는 최대 20초. 이전 영상 AI 가 대부분 5~10초인 점을 고려하면 Sora 의 20초는 큰 차별점입니다." },
              { q: "상업 이용?", a: "OpenAI 약관에 따라 ChatGPT Plus·Pro 사용자는 생성한 영상의 상업 이용이 허용됩니다. 다만 약관은 변동되므로 다운로드 전 OpenAI 의 Usage Policies 페이지를 확인하는 게 안전." },
              { q: "Storyboard 가 뭐?", a: "여러 장면을 한 영상으로 연결하는 모드. '바다 → 도시 → 우주' 같이 시작·중간·끝을 각각 명시하면 자동으로 트랜지션을 만들어 한 영상으로 합칩니다. 광고·뮤직비디오에 유용." },
              { q: "Remix·Blend 는?", a: "Remix 는 기존 영상의 일부분을 수정하는 기능 (예: 배경 교체). Blend 는 두 영상을 부드러운 트랜지션으로 합치는 기능. 영상 후처리에 자주 사용." },
              { q: "Pro $200 결제할 가치?", a: "영상 작업이 본업이거나 매일 다량의 영상을 만드는 경우. 일반 사용자는 Plus 면 충분하고, 본격 사용자는 Pro 보다 Runway Pro($35) 단독 결제가 더 효율적일 수 있음." },
            ],
            relatedKeywords: [
              "Sora 한국 사용",
              "Sora AI 영상 생성",
              "ChatGPT Plus Sora",
              "Sora 가격",
              "Sora vs Runway",
              "Storyboard 영상",
              "AI 영상 20초",
              "OpenAI 영상 AI",
              "Sora 한국어",
              "Sora Pro",
            ],
          },
        },
        {
          name: "Kling AI",
          url: "https://www.klingai.com",
          blurb: "중국 콰이쇼우의 영상 AI. 인물 동작 표현이 자연스러움.",
          details:
            "콰이쇼우(Kuaishou) 의 영상 AI 입니다. 인물의 동작·표정 묘사가 다른 영상 AI 대비 자연스러운 편으로 평가됩니다. 무료 한도가 비교적 넉넉해 초기 테스트에 적합합니다.",
          useCases: [
            "인물 동작 중심의 영상",
            "립싱크·말하는 얼굴 합성",
            "무료 한도로 양산",
            "Runway 의 대안",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 6 크레딧 / Pro $10/월~",
          alternatives: ["Runway", "Pika"],
          founded: "2024",
        },
        {
          name: "HeyGen",
          url: "https://www.heygen.com",
          blurb: "AI 아바타 영상. 본인 얼굴로 다국어 더빙.",
          details:
            "본인 얼굴을 30초 분량 녹화해 업로드하면 그 얼굴이 다양한 언어로 말하는 영상을 생성합니다. 립싱크 정확도가 높아 광고, 강의, 릴스 제작 현장에서 사용됩니다. 사내 교육 영상, 다국어 마케팅 영상 양산에 적합합니다.",
          useCases: [
            "본인 얼굴 기반 AI 음성 영상",
            "한국어 → 영어·일본어 더빙",
            "사내 교육·온보딩 영상",
            "다국어 마케팅 영상 양산",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 1분 / Creator $24/월~",
          alternatives: ["Synthesia", "D-ID"],
          founded: "2020",
          korean: true,
          hubSlug: "heygen",
          detailContent: {
            longIntro: [
              "HeyGen 은 2020년 LA 에서 설립된 AI 아바타 영상 생성 서비스입니다. 본인 얼굴을 30초 녹화해 업로드하면 그 얼굴이 다양한 언어로 말하는 영상을 생성합니다. 립싱크 정확도가 매우 높아 광고·강의·릴스·다국어 마케팅 영상에 사실상 표준 도구로 자리잡았습니다.",
              "가장 큰 강점은 다국어 더빙입니다. 한국어 음성을 영어·일본어·중국어·스페인어 등 175+ 언어로 자동 더빙하면서 입 모양도 그 언어에 맞춰 자연스럽게 변환합니다. 글로벌 채널을 운영하는 한국 크리에이터·강사가 다국어 콘텐츠를 양산할 때 핵심 도구로 사용됩니다.",
              "본인 얼굴 외에도 HeyGen 이 제공하는 100+ 인종·성별·연령 아바타를 사용할 수 있습니다. 사내 교육 영상·온보딩 콘텐츠·고객 응대 영상에서 실제 배우 촬영 없이 빠르게 영상 콘텐츠 양산 가능.",
              "한국에서 가입·결제·이용 모두 정상이며 한국어 음성·립싱크 품질도 자연스럽습니다.",
            ],
            features: [
              { title: "AI 아바타 영상", body: "본인 얼굴 30초 녹화 후 텍스트 입력만으로 그 얼굴로 영상 생성." },
              { title: "175+ 언어 더빙", body: "한국어 음성 → 영어·일본어·중국어 등 자동 더빙 + 립싱크 자연 변환." },
              { title: "Avatar Library", body: "HeyGen 이 제공하는 100+ 다양한 아바타. 본인 얼굴 없이도 영상 제작 가능." },
              { title: "Voice Cloning", body: "본인 목소리 5분 녹음 후 그 목소리로 다국어 음성 합성." },
              { title: "Video Translation", body: "기존 영상 업로드 후 다른 언어로 자동 더빙 + 립싱크 매칭." },
              { title: "Templates", body: "광고·강의·온보딩 등 용도별 영상 템플릿 수백 종. 텍스트만 교체." },
              { title: "Brand Kit", body: "회사 로고·색·폰트 통일. 모든 영상에 자동 적용." },
              { title: "API", body: "자체 앱·서비스에 HeyGen 영상 생성 임베드." },
            ],
            pricingPlans: [
              {
                name: "무료 (Free)",
                price: "0원",
                features: [
                  "일 1분 영상 생성",
                  "HeyGen Avatar Library 사용",
                  "비상업 이용",
                  "워터마크 포함",
                  "한국어 입력 정상",
                ],
              },
              {
                name: "Creator",
                price: "$24/월 (약 3.3만원)",
                recommended: true,
                features: [
                  "월 15분 영상",
                  "본인 얼굴 아바타 1개",
                  "상업 이용",
                  "워터마크 제거",
                  "175+ 언어 더빙",
                ],
              },
              {
                name: "Business",
                price: "$72/월",
                features: [
                  "월 30분 영상",
                  "본인 아바타 3개",
                  "Brand Kit",
                  "Video Translation",
                  "팀 협업",
                ],
              },
              {
                name: "Enterprise",
                price: "사용자별 협의",
                features: [
                  "무제한 영상",
                  "Custom Avatar",
                  "API 풀 액세스",
                  "보안·SLA",
                ],
              },
            ],
            pros: [
              "본인 얼굴로 다국어 영상 양산 가능 (글로벌 채널 확장)",
              "립싱크 정확도 1티어 (글로벌 표준)",
              "175+ 언어 자동 더빙",
              "사내 교육·온보딩 영상 실제 촬영 없이 가능",
              "Video Translation 으로 기존 영상 다국어화",
            ],
            cons: [
              "결제 부담 (Creator $24, Business $72)",
              "무료 플랜 일 1분 한도 매우 빡빡",
              "타인 얼굴 복제는 법적 분쟁 소지 (약관상 금지)",
              "감정·세밀한 표정은 실제 촬영 대비 약함",
              "긴 영상은 비용 빠르게 누적",
            ],
            koreanContext:
              "한국 IP·신용카드 결제 정상. 카카오·네이버페이 미지원. 한국어 음성 합성·립싱크 품질이 우수해 한국 유튜브 채널·강의·릴스 제작에 활용됩니다. 본인 한국어 영상을 영어·일본어·중국어로 더빙해 글로벌 채널 양산하는 한국 크리에이터·강사·기업 인플루언서 사례 많음. 다만 타인 얼굴(연예인·정치인 등) 무단 복제는 약관 위반 + 법적 문제 소지가 있어 본인 얼굴 또는 HeyGen Avatar Library 만 사용해야 안전합니다.",
            startingGuide: [
              { step: 1, title: "가입", body: "heygen.com 가입 후 무료 1분 영상 시도." },
              { step: 2, title: "Avatar 선택", body: "HeyGen 기본 아바타 100+ 중 선택 또는 본인 얼굴 30초 녹화 업로드 (Creator 이상)." },
              { step: 3, title: "텍스트 입력", body: "한국어 또는 영어 스크립트 입력. 음성 톤·속도·언어 선택." },
              { step: 4, title: "영상 생성", body: "Generate 클릭 → 1~3분 대기 → 다운로드. MP4 형식." },
              { step: 5, title: "다국어 더빙", body: "Creator 이상 Plan 에서 Video Translation 메뉴 → 한국어 영상 → 영어·일본어 자동 더빙." },
            ],
            faq: [
              { q: "한국에서 결제?", a: "한국 신용카드·체크카드(해외 결제) 정상. 카카오·네이버페이 미지원." },
              { q: "본인 얼굴 안 쓰고 가능?", a: "예. HeyGen 이 제공하는 100+ Avatar 를 무료로 사용 가능. 사내 교육·온보딩·고객 응대 영상에 자주 사용." },
              { q: "다른 사람 얼굴 사용 가능?", a: "본인 동의 없이 복제는 약관 위반 + 법적 분쟁 소지. 연예인·정치인 같은 식별 가능한 인물은 절대 금지. 본인 또는 HeyGen Library 만 안전합니다." },
              { q: "Creator $24 결제할 가치?", a: "유튜브 채널·강의 영상 만드는 경우 가치 큼. 본인 얼굴로 다국어 더빙 + 워터마크 제거 + 상업 이용 모두 풀림. 가벼운 사용은 무료 1분으로 충분하지만 본격 제작은 Creator 필수." },
              { q: "한국어 립싱크 정확도?", a: "매우 자연스러움. 한국어 발음·억양에 맞춰 입 모양이 자동 조정됩니다. 다국어 더빙 시에도 그 언어에 맞춰 입 모양이 재학습됩니다." },
              { q: "기존 영상 다국어 더빙은?", a: "Business 이상 플랜의 Video Translation 기능 사용. 본인이 한국어로 찍은 영상을 영어·일본어·중국어 등 다른 언어로 더빙하면서 입 모양도 그 언어에 맞춰 자동 변환." },
              { q: "다른 아바타 AI 와 비교?", a: "Synthesia, D-ID 같은 경쟁작 있지만 HeyGen 이 다국어 지원·립싱크 품질·아바타 다양성에서 우위. 사내 교육·기업용 영상은 Synthesia 도 강점." },
              { q: "API 사용?", a: "Business 이상 플랜에서 API 액세스 가능. 본인 앱·서비스(고객 응대 영상·자동 콘텐츠 생성) 에 HeyGen 영상 생성을 임베드할 수 있습니다." },
            ],
            relatedKeywords: [
              "HeyGen 한국 사용",
              "AI 아바타 영상",
              "HeyGen 가격",
              "다국어 더빙 AI",
              "Video Translation",
              "본인 얼굴 영상 AI",
              "글로벌 유튜브 채널",
              "사내 교육 영상 AI",
              "립싱크 AI",
              "HeyGen vs Synthesia",
            ],
          },
        },
      ],
    },
    {
      title: "🎵 음악 / 음성 AI",
      items: [
        {
          name: "Suno",
          url: "https://suno.com",
          blurb: "가사와 장르 입력만으로 완성된 노래 생성.",
          details:
            "가사와 장르(예: 로파이 발라드, 슬픈 분위기)를 입력하면 보컬과 반주가 포함된 곡이 1~2분 내에 생성됩니다. 한국어 발음이 자연스럽고 무료 플랜에서 일 10곡까지 생성이 가능합니다. 유튜브 BGM, 광고 CM 송, 결혼식 축가 제작에 사용됩니다.",
          useCases: [
            "유튜브·릴스 BGM",
            "광고 CM 송",
            "보컬 데모 (작곡 레퍼런스)",
            "이벤트·결혼식 축가 (한국어 가사)",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 10곡 / Pro $10/월 / Premier $30/월",
          alternatives: ["Udio", "AIVA"],
          founded: "2023",
          korean: true,
          imageUrl: "https://cdn-o.suno.com/meta-preview.jpg",
          hubSlug: "suno",
          detailContent: {
            longIntro: [
              "Suno 는 2023년 출시된 AI 음악 생성 서비스입니다. 가사와 장르(예: '로파이 발라드, 슬픈 분위기') 만 텍스트로 입력하면 보컬과 반주가 포함된 완성된 곡이 1~2분 안에 생성됩니다. 2026년 현재 V4 모델이 메인이며 음질·믹싱·보컬 자연스러움이 빠르게 발전하고 있습니다.",
              "한국어 발음 정확도가 모든 AI 음악 도구 중 가장 안정적입니다. 가사를 한글로 입력해도 발음이 자연스럽고, 트로트·발라드·인디·힙합 등 한국 장르 표현도 잘 잡힙니다. 유튜브 BGM, 광고 CM 송, 결혼식 축가 같은 상업·이벤트 용도에서 실제로 사용되는 사례가 늘고 있습니다.",
              "무료 플랜으로 하루 10곡 정도 생성 가능해 진입 비용이 거의 없습니다. 다만 무료 플랜 결과물은 비상업·CC-BY 라이선스이고, 상업 이용은 Pro($10/월) 이상 결제가 필요합니다.",
              "한국에서 가입·결제·이용 모두 정상 동작합니다. 결제는 USD 기준이라 환율에 따라 청구 금액이 달라집니다.",
            ],
            features: [
              { title: "텍스트 → 곡 (한국어 가능)", body: "가사 + 장르 키워드만 입력하면 보컬·반주 완성된 곡 생성. 한국어 가사 자연스러움 1티어." },
              { title: "Custom Mode", body: "가사·BPM·구조(verse·chorus·bridge) 를 직접 지정. 작곡가 워크플로우에 가까움." },
              { title: "Cover", body: "기존 곡의 멜로디를 유지하면서 장르·보컬을 다른 스타일로 재해석." },
              { title: "Stem 분리", body: "Pro 이상에서 보컬·드럼·베이스·기타 등 트랙별로 분리 다운로드. DAW 후처리 가능." },
              { title: "Extend", body: "생성된 곡 뒤에 추가 부분을 이어 작곡. 1분짜리 곡을 3~4분으로 확장." },
              { title: "Persona", body: "특정 보컬·스타일을 학습해 일관된 가수 캐릭터 만들기." },
              { title: "곡 라이브러리 정리", body: "생성한 곡을 폴더·태그로 정리. 무료 플랜에서도 무제한 저장." },
              { title: "공개 / 비공개 모드", body: "Pro 이상에서 비공개 생성 가능 (커뮤니티에 노출 안 됨)." },
            ],
            pricingPlans: [
              {
                name: "무료 (Free)",
                price: "0원",
                features: [
                  "하루 10곡 생성 (50 크레딧)",
                  "기본 모델 사용",
                  "곡 다운로드 가능",
                  "비상업·CC-BY 라이선스만",
                ],
              },
              {
                name: "Pro",
                price: "$10/월 (약 1.4만원)",
                recommended: true,
                features: [
                  "월 500곡 (2,500 크레딧)",
                  "최신 V4 모델 우선",
                  "상업 이용 허용",
                  "비공개 모드",
                  "Stem 분리 다운로드",
                ],
              },
              {
                name: "Premier",
                price: "$30/월 (약 4.2만원)",
                features: [
                  "월 2,000곡 (10,000 크레딧)",
                  "최우선 처리",
                  "상업 이용",
                  "API 일부 액세스",
                  "팀 협업 (예정)",
                ],
              },
            ],
            pros: [
              "한국어 보컬 자연스러움 모든 AI 음악 중 1티어",
              "무료 플랜으로 하루 10곡 충분히 테스트",
              "트로트·발라드·인디 등 한국 장르 표현 우수",
              "Custom Mode 로 작곡가 워크플로우 지원",
              "Stem 분리로 DAW 후처리 가능 (Pro 이상)",
            ],
            cons: [
              "무료 플랜 곡은 상업 이용 금지",
              "고급 믹싱 디테일은 Udio 대비 다소 약함",
              "트랙당 최대 4분 (Extend 로 확장 가능하지만 단절감)",
              "한국 결제 시 USD 환율 변동",
              "특정 가수 목소리 모사 같은 민감 요청은 거절",
            ],
            koreanContext:
              "한국 IP 와 신용카드(국내·해외 모두 가능) 로 가입·결제 정상. 카카오·네이버페이는 미지원. 한국어 가사 입력 시 발음 자연스러움이 다른 AI 음악 도구 대비 명확히 우위입니다. 트로트·발라드 같은 한국 장르 키워드도 인식하며, 영문 장르 키워드(K-Ballad, K-Pop, City Pop) 사용도 가능합니다. 유튜브 BGM 으로 사용 시 Pro 이상 결제 + 상업 라이선스를 적용해야 콘텐츠 ID 클레임 위험을 피할 수 있습니다.",
            startingGuide: [
              { step: 1, title: "가입", body: "suno.com 에 접속해 구글·이메일로 가입. 한국 IP 정상 접근." },
              { step: 2, title: "무료로 첫 곡 만들기", body: "Create 탭에서 'Simple Mode' 선택 후 한국어로 '발라드, 슬픈 분위기, 이별 노래' 같은 짧은 설명만 입력. 자동 가사 생성." },
              { step: 3, title: "Custom Mode 익히기", body: "직접 가사를 쓰고 [Verse 1], [Chorus] 같은 구조 태그 입력. 결과의 자연스러움이 크게 개선됩니다." },
              { step: 4, title: "Pro 결제 결정", body: "유튜브·릴스·광고 등 상업 용도면 Pro($10) 결제. 무료 플랜 결과는 상업 사용 금지." },
              { step: 5, title: "Stem 분리 활용", body: "Pro 이상에서 보컬·드럼·베이스 트랙 분리 다운로드 후 DAW(GarageBand·Logic·FL Studio) 에서 후처리." },
            ],
            faq: [
              { q: "한국에서 가입·결제 가능한가요?", a: "가능합니다. 한국 IP 로 정상 접속되며 국내·해외 신용카드 결제 모두 됩니다. 카카오·네이버페이는 지원되지 않으므로 카드 결제를 사용합니다." },
              { q: "무료 플랜 결과를 유튜브 BGM 으로 써도 되나요?", a: "안 됩니다. 무료 플랜 결과물은 비상업·CC-BY 라이선스로 비영리 용도만 허용됩니다. 유튜브·릴스·광고에 쓰려면 Pro($10/월) 이상 결제로 상업 이용 라이선스를 받아야 합니다." },
              { q: "한국어 가사 정확도는?", a: "모든 AI 음악 도구 중 가장 자연스럽습니다. 발음·억양·강세가 한국어답게 처리됩니다. 다만 영어처럼 길게 늘이는 발음(예: '사랑해' 가 'saaaaarang-hae' 처럼 늘어지는 경우) 이 가끔 나오므로 가사 길이를 짧게 끊는 게 도움됩니다." },
              { q: "Suno 와 Udio 의 차이는?", a: "Suno 는 한국어 보컬 자연스러움과 사용성에서 우위. Udio 는 사운드 디테일·믹싱 품질이 더 좋다는 평가. 두 서비스 모두 무료 플랜이 있으니 같은 가사로 비교해보면 명확합니다." },
              { q: "특정 가수 목소리로 만들 수 있나요?", a: "공식적으로는 안 됩니다. 'BTS 같은 보컬' 같은 특정 아티스트 모사 요청은 약관 위반으로 거절되거나 결과가 차단됩니다. Persona 기능으로 본인이 만든 가상의 캐릭터·스타일은 일관되게 유지 가능합니다." },
              { q: "Stem 분리는 뭐예요?", a: "보컬·드럼·베이스·기타 같은 트랙별로 별도 오디오 파일을 다운로드받는 기능입니다. DAW(GarageBand, Logic, Ableton 등) 에서 후처리·재믹싱이 가능합니다. Pro 이상 플랜에서만 사용 가능." },
              { q: "곡당 최대 길이는?", a: "기본 4분. Extend 기능으로 같은 곡을 추가로 이어붙여 더 길게 만들 수 있지만, 이어붙인 부분에서 약간의 단절감이 발생합니다." },
              { q: "결혼식 축가로 사용 가능한가요?", a: "가능합니다. Pro 결제 후 한국어 가사를 직접 작성해 발라드·인디 장르로 생성하면 결혼식·이벤트용 축가로 자주 사용됩니다. 결과는 mp3 로 다운로드해 무대에서 재생할 수 있습니다." },
            ],
            relatedKeywords: [
              "Suno AI 한국 사용",
              "Suno 가격 플랜",
              "Suno 무료 한도",
              "AI 음악 생성기",
              "Suno vs Udio",
              "유튜브 무료 BGM 만들기",
              "AI 작곡",
              "한국어 AI 노래",
              "Suno 상업 이용",
              "Suno Stem 분리",
            ],
          },
        },
        {
          name: "Udio",
          url: "https://www.udio.com",
          blurb: "Suno 의 직접 경쟁작. 사운드 디테일·믹싱 강점.",
          details:
            "전 Google DeepMind 출신들이 설립한 음악 생성 AI 입니다. Suno 와 비교해 사운드 디테일과 믹싱 품질이 우위에 있다는 평가가 있습니다. 한국어 보컬도 지원합니다.",
          useCases: [
            "고품질 데모곡 제작",
            "프로 믹싱 품질 필요 시",
            "Suno 의 대안",
          ],
          pricing: "freemium",
          pricingNote: "무료 월 1,200 크레딧 / Pro $10/월",
          alternatives: ["Suno"],
          founded: "2023",
        },
        {
          name: "ElevenLabs",
          url: "https://elevenlabs.io",
          blurb: "음성 합성·복제 분야의 표준. 32개 언어 지원.",
          details:
            "본인 목소리를 5분 분량 녹음해 업로드하면 그 목소리로 한국어·영어·일본어 등 32개 언어 합성이 가능합니다. 오디오북 출판, 유튜브 내레이션, 게임 더빙 현장에서 사용됩니다. 무료 플랜에서 월 1만 자가 제공됩니다.",
          useCases: [
            "유튜브 한국어 내레이션",
            "본인 목소리 다국어 더빙",
            "오디오북 제작",
            "게임 NPC 더빙",
          ],
          pricing: "freemium",
          pricingNote: "무료 월 1만 자 / Starter $5/월 / Creator $22/월~",
          alternatives: ["Naver Cloud Voice", "Typecast"],
          founded: "2022",
          korean: true,
          imageUrl: "https://elevenlabs.io/cover.png",
          hubSlug: "elevenlabs",
          detailContent: {
            longIntro: [
              "ElevenLabs 는 2022년 출시된 음성 합성·복제 분야의 글로벌 표준 서비스입니다. 본인 또는 다른 사람의 목소리를 5분 분량 녹음해 업로드하면 그 목소리로 32개 이상의 언어를 자연스럽게 합성해줍니다. 오디오북 출판, 유튜브 내레이션, 게임 더빙, 광고 더빙 현장에서 사실상 표준 도구입니다.",
              "한국어 합성 품질이 글로벌 음성 AI 중 가장 안정적이라는 평가입니다. 발음·억양·감정 표현이 자연스럽고, 본인 한국어 목소리를 학습시키면 영어·일본어·중국어 등을 본인 톤 그대로 말하게 만들 수 있습니다. 다국어 콘텐츠 양산이 필요한 1인 크리에이터·강사·마케터에게 핵심 도구로 자리잡았습니다.",
              "무료 플랜에서 월 1만 자(약 10분 분량) 사용 가능하고, 본격 사용은 Starter($5) 부터입니다. 가격이 가장 저렴한 클래스의 글로벌 음성 AI 라 진입 비용이 낮습니다.",
              "한국에서 가입·결제·이용 모두 정상 동작합니다.",
            ],
            features: [
              { title: "Instant Voice Cloning", body: "본인 목소리를 1분만 녹음하면 즉시 복제. Pro 플랜 이상에서 사용 가능." },
              { title: "Professional Voice Cloning", body: "30분 이상 고품질 녹음으로 학습. 거의 본인과 구별되지 않는 자연스러운 결과." },
              { title: "다국어 합성 (32개 언어)", body: "한국어로 학습한 목소리로 영어·일본어·중국어·스페인어 등 합성 가능." },
              { title: "Voice Library", body: "공유된 수천 개의 보이스 즉시 사용. 무료 플랜에서도 일부 사용." },
              { title: "Sound Effects", body: "텍스트로 효과음 생성 (예: '도시 거리 비 오는 소리'). 게임·영상 디자인에 활용." },
              { title: "Studio (Long-form)", body: "장문 텍스트를 챕터·문단 단위로 나눠 합성. 오디오북 제작 최적화." },
              { title: "Conversational AI", body: "실시간 대화형 음성 에이전트. 콜센터·상담 자동화에 사용." },
              { title: "API + 위젯", body: "개발자용 API 와 웹사이트 임베드 위젯. 자체 앱에 음성 기능 추가." },
            ],
            pricingPlans: [
              {
                name: "무료 (Free)",
                price: "0원",
                features: [
                  "월 1만 자 (약 10분)",
                  "Voice Library 일부 사용",
                  "기본 모델 (Multilingual v2)",
                  "비상업 이용",
                ],
              },
              {
                name: "Starter",
                price: "$5/월 (약 7천원)",
                features: [
                  "월 3만 자 (약 30분)",
                  "Instant Voice Cloning",
                  "상업 이용",
                  "고품질 음성 (Eleven v2)",
                ],
              },
              {
                name: "Creator",
                price: "$22/월 (약 3만원)",
                recommended: true,
                features: [
                  "월 10만 자 (약 100분)",
                  "Professional Voice Cloning",
                  "상업 이용",
                  "오디오 후처리 (192kbps)",
                  "프로젝트 협업",
                ],
              },
            ],
            pros: [
              "한국어 합성 자연스러움 글로벌 1티어",
              "본인 목소리 1분만으로 복제 가능 (Instant Cloning)",
              "32개 언어 다국어 합성",
              "Starter $5 부터 시작 가능 (가성비)",
              "Sound Effects 로 효과음까지 생성",
            ],
            cons: [
              "무료 플랜은 비상업 이용만 허용",
              "Voice Cloning 은 윤리·법적 분쟁 가능 (타인 목소리 복제 금지)",
              "월 글자 한도 초과 시 비용 빠르게 누적",
              "Conversational AI 는 추가 결제 필요",
            ],
            koreanContext:
              "한국 IP 와 신용카드(국내·해외 모두) 로 가입·결제 정상. 카카오·네이버페이는 미지원. 한국어 발음·억양 품질이 글로벌 모든 음성 AI 중 가장 자연스럽습니다. 본인 한국어 목소리를 5분 녹음하면 그 목소리로 영어·일본어 콘텐츠 양산이 가능합니다. 단, 타인(연예인·정치인 등) 의 목소리를 무단 복제하는 행위는 약관 위반이며 법적 분쟁 소지가 있습니다.",
            startingGuide: [
              { step: 1, title: "가입", body: "elevenlabs.io 접속해 구글·이메일로 가입. 한국 IP 정상 접근." },
              { step: 2, title: "Voice Library 둘러보기", body: "무료 플랜에서 공유된 보이스 수백 개를 들어볼 수 있습니다. 마음에 드는 목소리로 텍스트 입력 → 즉시 합성." },
              { step: 3, title: "본인 목소리 녹음", body: "Pro 플랜 결제 후 Voice → Add Voice → Instant Cloning 에서 1분 녹음. 즉시 본인 목소리로 합성 가능." },
              { step: 4, title: "장문 합성은 Studio 사용", body: "오디오북·강의 같은 긴 텍스트는 Studio 메뉴에서 챕터 단위 분할. 챕터별 보이스도 다르게 설정 가능." },
              { step: 5, title: "다국어 합성", body: "한국어로 학습한 본인 목소리로 영어·일본어 텍스트 입력 → 그대로 본인 톤으로 합성. 다국어 마케팅 영상 양산 가능." },
            ],
            faq: [
              { q: "한국에서 결제 가능한가요?", a: "가능합니다. 한국 신용카드(국내·해외 모두) 와 체크카드 결제 정상. 카카오·네이버페이는 지원되지 않으므로 카드 결제를 사용하세요." },
              { q: "무료 플랜으로 유튜브 영상 더빙 가능?", a: "기술적으로 가능하지만 라이선스 위반입니다. 무료 플랜은 비상업 이용만 허용됩니다. 유튜브·릴스·광고 등 수익이 발생할 가능성이 있는 영상은 Starter($5) 이상 결제 + 상업 라이선스가 필요합니다." },
              { q: "본인 목소리 복제 위험하지 않나요?", a: "본인이 직접 녹음한 목소리는 본인 소유라 안전합니다. 다만 한 번 학습된 목소리 데이터는 ElevenLabs 서버에 저장되므로, 매우 민감하면 Pro 이상 플랜의 No-train 약관을 확인하거나 정기 삭제하세요." },
              { q: "타인 목소리 복제 가능?", a: "기술적으로는 가능하지만 약관에서 명시적으로 금지합니다. 연예인·정치인 등 식별 가능한 인물의 목소리를 무단 복제·합성하는 행위는 계정 정지와 법적 분쟁 소지가 있습니다. 가족·친구 목소리도 본인 동의 없이 복제는 권장되지 않습니다." },
              { q: "다른 음성 AI 와 비교하면?", a: "한국어 자연스러움은 ElevenLabs > 네이버 Clovanote(받아쓰기 전용이라 합성 X) > Naver Cloud Voice > Typecast 순. 영어 합성은 ElevenLabs 와 Microsoft Azure TTS 가 비슷한 수준. 가격 경쟁력은 ElevenLabs 가 가장 좋습니다." },
              { q: "오디오북 만들 수 있나요?", a: "가능합니다. Studio 메뉴에서 챕터별로 분할 입력하고 보이스를 일관되게 적용하면 수십 시간 분량의 오디오북도 합성 가능합니다. 출판사 사이에서 실제로 사용되는 사례가 늘고 있습니다." },
              { q: "API 사용은 어떻게?", a: "Starter 플랜부터 API 호출이 가능합니다. 자체 앱·웹사이트에 음성 합성 기능을 추가할 때 사용. Conversational AI 위젯을 사이트에 임베드하면 실시간 음성 챗봇도 구현 가능합니다." },
              { q: "환불 가능한가요?", a: "구독 시작 후 사용량이 적으면 부분 환불 가능한 경우가 있습니다. 자세한 사항은 elevenlabs.io 의 Help 또는 고객지원으로 직접 문의해야 합니다." },
            ],
            relatedKeywords: [
              "ElevenLabs 한국 사용",
              "ElevenLabs 가격",
              "ElevenLabs 한국어",
              "AI 음성 합성",
              "본인 목소리 복제",
              "다국어 더빙 AI",
              "오디오북 AI",
              "유튜브 내레이션 AI",
              "ElevenLabs API",
              "Voice Cloning",
            ],
          },
        },
        {
          name: "Clovanote (네이버)",
          url: "https://clovanote.naver.com",
          blurb: "한국어 회의록·받아쓰기 1위. 100% 무료.",
          details:
            "네이버 공식 서비스입니다. 강의·회의·인터뷰 녹음을 한국어 텍스트로 변환하며, 화자 분리(누가 어떤 말을 했는지), AI 요약, 키워드 자동 추출이 포함됩니다. 글로벌 STT 대비 한국어 정확도가 높고 모든 기능이 무료입니다.",
          useCases: [
            "강의·세미나 받아쓰기",
            "회의록 자동 (화자별 분리)",
            "인터뷰 받아쓰기",
            "유튜브 자막 한국어 초안",
          ],
          pricing: "free",
          pricingNote: "100% 무료",
          alternatives: ["Daglo", "Whisper"],
          founded: "2021",
          korean: true,
        },
        {
          name: "Daglo",
          url: "https://daglo.ai",
          blurb: "한국 토종 회의록 AI. 기업 단위 도입에 강점.",
          details:
            "리턴제로에서 운영합니다. 회의록·강의 받아쓰기에 특화되어 있으며, 발언자별 발언 통계와 회의록 검색이 디테일합니다. 기업용 SSO 와 관리자 기능을 갖춰 회사 단위 도입 사례가 많습니다.",
          useCases: [
            "사내 회의록 (기업 단위 도입)",
            "강의 받아쓰기·요약",
            "발언자별 통계",
            "클로바노트의 대안",
          ],
          pricing: "freemium",
          pricingNote: "무료 월 300분 / Pro 월 1.5만원~",
          alternatives: ["Clovanote"],
          founded: "2018",
          korean: true,
        },
      ],
    },
    {
      title: "💻 코딩 / 개발 AI",
      items: [
        {
          name: "Cursor",
          url: "https://cursor.com",
          blurb: "AI 네이티브 코드 에디터. VS Code 포크.",
          details:
            "VS Code 를 포크해 GPT·Claude 가 코드베이스 전체를 컨텍스트로 이해하는 IDE 입니다. Cmd+K 로 자연어 명령을 통한 즉시 수정, Composer 로 멀티파일 리팩터링이 가능합니다. 시니어 개발자의 메인 에디터로도 사용됩니다.",
          useCases: [
            "기존 코드베이스 리팩터링",
            "신규 기능의 멀티파일 추가",
            "버그 디버깅 (전체 트레이스 분석)",
            "API 마이그레이션",
          ],
          pricing: "freemium",
          pricingNote: "Hobby 무료 / Pro $20/월 / Business $40/월",
          tip: ".cursorrules 파일에 프로젝트 규칙과 코딩 컨벤션을 정의해두면 결과물의 일관성이 유지됩니다.",
          alternatives: ["Copilot", "Windsurf", "Claude Code"],
          founded: "2022",
          imageUrl: "https://cursor.com/public/opengraph-image.png",
          hubSlug: "cursor",
          detailContent: {
            longIntro: [
              "Cursor 는 2022년 설립된 Anysphere 에서 만든 AI 네이티브 코드 에디터입니다. VS Code 를 포크해 GPT·Claude 모델이 코드베이스 전체를 이해하고 멀티파일 변경까지 가능하게 만든 IDE 로, 2026년 현재 시니어 개발자들의 메인 에디터로 사용되는 사례가 빠르게 늘고 있습니다.",
              "핵심 기능은 세 가지입니다. ① Cmd+K 자연어 명령 (한 줄로 코드 수정), ② Composer 멀티파일 리팩터링 (여러 파일을 한 번에 변경), ③ Tab 자동완성 (한 줄~수십 줄까지 컨텍스트 기반). 단순 자동완성을 넘어 '폴더 안의 모든 컴포넌트를 TypeScript 로 마이그레이션' 같은 대규모 작업을 자연어로 처리할 수 있습니다.",
              "기본 UI 가 VS Code 그대로라 학습 비용이 거의 없습니다. 기존 VS Code 의 단축키·확장·설정을 그대로 가져올 수 있고, .cursorrules 파일에 프로젝트 컨벤션·금지사항을 정의해두면 AI 출력의 일관성이 유지됩니다.",
              "한국에서 가입·결제·이용 모두 정상 동작합니다. 무료 Hobby 플랜으로 한 달 정도 충분히 테스트할 수 있고, 본격 사용은 Pro($20/월) 결제 후 시작됩니다.",
            ],
            features: [
              { title: "Tab 자동완성", body: "단어 단위가 아닌 한 줄~수십 줄까지 컨텍스트 기반 자동완성. 의도를 미리 알아채는 정확도." },
              { title: "Cmd+K (인라인 편집)", body: "선택한 코드 위에 단축키 누르고 '에러 처리 추가' 같이 명령하면 즉시 수정." },
              { title: "Composer (멀티파일 변경)", body: "Cmd+I 로 열리는 채팅에서 '전체 컴포넌트를 함수형으로 변경' 같은 대규모 작업 한 번에 처리." },
              { title: "Chat (코드베이스 컨텍스트)", body: "@ 로 파일·폴더·심볼을 컨텍스트에 추가. AI 가 코드베이스 전체를 알고 답변." },
              { title: ".cursorrules 파일", body: "프로젝트 루트에 두면 모든 AI 출력에 적용되는 규칙·컨벤션·금지사항." },
              { title: "Agent / Background Agent", body: "AI 가 직접 백그라운드에서 작업 실행. 테스트 → 수정 → 다시 테스트 자동 루프." },
              { title: "GPT·Claude·Gemini 선택", body: "작업마다 다른 모델 선택 가능. 코드 리뷰는 Claude Opus, 빠른 수정은 Sonnet 식." },
              { title: "VS Code 호환", body: "기존 확장·테마·단축키 그대로. 1분 안에 마이그레이션." },
            ],
            pricingPlans: [
              {
                name: "Hobby",
                price: "0원",
                features: [
                  "Tab 자동완성 2,000회/월",
                  "느린 요청 50회/월",
                  "GPT·Claude 기본 모델",
                  ".cursorrules 사용",
                  "코드베이스 검색",
                ],
              },
              {
                name: "Pro",
                price: "$20/월 (약 2.7만원)",
                recommended: true,
                features: [
                  "Tab 자동완성 무제한",
                  "빠른 요청 500회/월",
                  "느린 요청 무제한",
                  "Composer 멀티파일",
                  "Agent 모드",
                  "GPT·Claude 최신 모델",
                ],
              },
              {
                name: "Business",
                price: "$40/월/사용자",
                features: [
                  "Pro 의 모든 기능",
                  "No-train 데이터 정책",
                  "SSO·SAML",
                  "감사 로그",
                  "팀 관리자 대시보드",
                  "결제 통합",
                ],
              },
            ],
            pros: [
              "VS Code 그대로의 UX, 학습 비용 0",
              "코드베이스 전체 컨텍스트 (단순 자동완성 아님)",
              "Composer 로 멀티파일 리팩터링 한 번에",
              "모델(GPT·Claude·Gemini) 작업마다 선택 가능",
              ".cursorrules 로 팀 컨벤션 일관성 유지",
            ],
            cons: [
              "월 $20 결제 부담 (해외 결제, USD)",
              "기존 VS Code 확장 일부는 호환 안 됨 (드물지만)",
              "코드베이스가 매우 크면 컨텍스트 인덱싱 시간 필요",
              "Business 플랜이 아닌 한 데이터가 학습에 사용될 수 있음",
            ],
            koreanContext:
              "한국 IP 와 신용카드(국내·해외) 로 가입·결제 정상. VS Code 의 한국어 확장(한국어 언어팩, 한국 패키지) 모두 그대로 사용 가능. 한국어 주석·변수명·문서 작성에 대해서도 모델이 자연스럽게 처리합니다. 회사 코드를 다룰 때는 학습 데이터 사용을 막기 위해 Business 플랜의 No-train 정책을 활성화하거나, 민감 코드는 가명화 후 다루는 게 안전합니다.",
            startingGuide: [
              { step: 1, title: "다운로드·설치", body: "cursor.com 에서 OS 별 설치 파일 다운로드. 기존 VS Code 가 있다면 'Import VS Code Settings' 클릭으로 1분 안에 마이그레이션." },
              { step: 2, title: "Hobby 플랜으로 시작", body: "가입 후 Hobby(무료) 로 한 달 정도 사용하면서 Tab·Cmd+K 익히기. 한도 부족하면 Pro 결제." },
              { step: 3, title: ".cursorrules 작성", body: "프로젝트 루트에 .cursorrules 파일 생성. 코딩 컨벤션·금지사항·선호하는 라이브러리 명시. AI 출력 일관성 크게 개선." },
              { step: 4, title: "Composer 익히기", body: "Cmd+I 로 채팅 열고 '@components 폴더의 모든 React 클래스를 함수형으로 바꿔줘' 같은 대규모 명령. 한 번에 수십 파일 변경." },
              { step: 5, title: "모델 선택 활용", body: "Settings → Models 에서 작업별 모델 지정. 빠른 자동완성은 Sonnet, 복잡한 추론·리팩터링은 Claude Opus 또는 GPT-5." },
            ],
            faq: [
              { q: "VS Code 와 호환되나요?", a: "거의 100% 호환됩니다. 기존 VS Code 확장(extension), 단축키, 설정(settings.json), 테마를 그대로 가져올 수 있습니다. Cursor 첫 실행 시 'Import VS Code Settings' 버튼 한 번이면 끝입니다." },
              { q: "GitHub Copilot 과 비교하면?", a: "Copilot 은 자동완성 위주, Cursor 는 코드베이스 전체 이해 + 멀티파일 변경 + 자연어 명령까지 통합. 가벼운 자동완성만 필요하면 Copilot, 본격적 AI 페어 프로그래밍은 Cursor 가 우위입니다. 학생·OSS 메인테이너는 Copilot 이 무료라 보조로 같이 쓰는 사례도 있습니다." },
              { q: "Hobby(무료) 로 충분한가요?", a: "Tab 자동완성 2,000회·느린 요청 50회/월 한도라 가벼운 개인 프로젝트는 한 달 정도 버팁니다. 매일 본업 코드에 쓰려면 Pro($20) 결제가 빠릅니다." },
              { q: "회사 코드 올려도 되나요?", a: "기본값으로는 데이터가 학습에 사용될 수 있습니다. Settings → Privacy 에서 학습 거부 활성화 또는 Business 플랜의 No-train 정책 활용 권장. 민감 코드는 가명화 후 작업하세요." },
              { q: ".cursorrules 가 뭔가요?", a: "프로젝트 루트에 두는 일반 텍스트 파일입니다. 코딩 컨벤션(예: 'TypeScript 사용', '함수형 컴포넌트만'), 금지사항(예: 'class 컴포넌트 X'), 선호 패턴 등을 영어 또는 한국어로 명시하면 모든 AI 출력이 이를 따릅니다. 팀 일관성 유지에 핵심." },
              { q: "Composer 와 Chat 의 차이는?", a: "Chat(Cmd+L) 은 단일 파일·간단 질문용 대화창. Composer(Cmd+I) 는 여러 파일을 한 번에 변경하는 대규모 작업용. 'navbar 디자인 새로 만들고 라우팅도 추가' 같은 멀티파일 명령은 Composer 사용." },
              { q: "Agent 모드는 뭐예요?", a: "AI 가 백그라운드에서 직접 작업을 실행·테스트·수정하는 자율 모드입니다. 'TODO 주석을 모두 구현하고 테스트 통과시키기' 같은 명령을 주면 코드 작성 → 테스트 실행 → 실패 시 수정의 루프를 자동으로 돕니다. Pro 플랜에서 사용 가능." },
              { q: "한국어 코드 주석·변수명 처리는?", a: "한국어 주석·변수명을 모두 자연스럽게 처리합니다. .cursorrules 에 '한국어 주석 작성' 같은 규칙을 넣어두면 모든 AI 생성 코드의 주석이 한국어로 일관되게 작성됩니다." },
            ],
            relatedKeywords: [
              "Cursor 한국 사용",
              "Cursor AI 코드 에디터",
              "Cursor 가격",
              "VS Code AI",
              "Cursor vs Copilot",
              "Composer 멀티파일",
              ".cursorrules 작성법",
              "AI 페어 프로그래밍",
              "Cursor Agent 모드",
              "Cursor 무료 한도",
            ],
          },
        },
        {
          name: "GitHub Copilot",
          url: "https://github.com/features/copilot",
          blurb: "에디터 자동완성·채팅. 학생·OSS 메인테이너 무료.",
          details:
            "Microsoft / GitHub 공식 서비스로 VS Code, JetBrains, Vim 등 대부분의 에디터에 플러그인으로 설치됩니다. 입력 중인 코드를 실시간 자동완성합니다. 학생, 교사, 인기 오픈소스 메인테이너에게는 무료로 제공됩니다.",
          useCases: [
            "보일러플레이트 자동완성",
            "테스트 코드 자동 생성",
            "주석을 함수 본문으로 변환",
            "기존 에디터 그대로 사용",
          ],
          pricing: "freemium",
          pricingNote: "학생/OSS 무료 / 개인 $10/월 / Business $19/월",
          alternatives: ["Cursor", "Codeium"],
          founded: "2021",
          hubSlug: "copilot",
          detailContent: {
            longIntro: [
              "GitHub Copilot 은 Microsoft·GitHub·OpenAI 가 공동 개발한 AI 코드 어시스턴트입니다. 2021년 출시 이후 전 세계 100만+ 유료 사용자를 보유한 사실상 표준 도구로 자리잡았습니다. 기존 에디터(VS Code, JetBrains, Vim, Neovim, Visual Studio 등) 에 플러그인으로 설치되어 입력 중인 코드를 실시간 자동완성합니다.",
              "Cursor 같은 AI 네이티브 에디터로 갈아타지 않아도 기존 환경 그대로 AI 보조를 받을 수 있는 게 가장 큰 장점입니다. JetBrains 시리즈(IntelliJ·PyCharm·WebStorm) 사용자에게 특히 유용하고, Vim·Neovim 사용자에게도 공식 플러그인이 잘 정리되어 있습니다.",
              "학생·교사·인기 오픈소스 메인테이너에게는 무료로 제공됩니다. GitHub Student Developer Pack 신청 시 즉시 활성화되어 학생 사용자에게 진입 비용 0원. 일반 개인 사용자는 $10/월, 기업은 $19/월/사용자.",
              "최근 GPT-5·Claude Opus 등 최신 모델로 전환 가능해지면서 자동완성뿐 아니라 Chat(코드베이스 질문)·Agent(자율 작업) 모드까지 확장되었습니다.",
            ],
            features: [
              { title: "실시간 자동완성", body: "타이핑 중 다음 줄~수십 줄까지 컨텍스트 기반 자동완성. Tab 으로 수락." },
              { title: "Copilot Chat", body: "에디터 안 사이드 채팅. 코드베이스 질문, 디버깅, 리팩터링 명령." },
              { title: "Copilot Agent (Coding Agent)", body: "GitHub Issues 를 받아 자동으로 코드 작성·PR 생성. 자율 모드." },
              { title: "다중 모델 (GPT·Claude·Gemini)", body: "Chat 에서 모델 선택 가능. 작업별로 최적 모델 사용." },
              { title: "Pull Request 요약", body: "PR 의 변경사항·영향 범위를 자동 요약. 코드 리뷰 보조." },
              { title: "테스트 자동 생성", body: "함수 선택 후 'Generate tests' 명령으로 단위 테스트 자동 작성." },
              { title: "다양한 에디터 지원", body: "VS Code, JetBrains, Vim, Neovim, Visual Studio, Eclipse 등 거의 모든 에디터." },
              { title: "GitHub 통합", body: "Issues, PR, Actions 와 직접 연결. CI 실패 자동 진단·수정 제안." },
            ],
            pricingPlans: [
              {
                name: "학생·OSS (무료)",
                price: "0원",
                features: [
                  "Copilot 자동완성 + Chat",
                  "Pro 와 동일한 모든 기능",
                  "GitHub Student Pack 신청",
                  "인기 OSS 메인테이너 자동 무료",
                ],
              },
              {
                name: "Pro (개인)",
                price: "$10/월 (약 1.4만원)",
                recommended: true,
                features: [
                  "자동완성 + Chat 무제한",
                  "Agent 모드",
                  "GPT·Claude·Gemini 다중 모델",
                  "Pull Request 요약",
                  "음성 명령",
                ],
              },
              {
                name: "Business",
                price: "$19/월/사용자",
                features: [
                  "Pro 의 모든 기능",
                  "팀 관리 정책",
                  "No-train 데이터 정책",
                  "감사 로그·SSO",
                  "기업용 보안",
                ],
              },
              {
                name: "Enterprise",
                price: "$39/월/사용자",
                features: [
                  "Business 의 모든 기능",
                  "코드베이스 인덱싱",
                  "사용자 정의 모델 (fine-tune)",
                  "최우선 지원",
                ],
              },
            ],
            pros: [
              "기존 에디터(VS Code, JetBrains, Vim) 그대로 사용",
              "학생·OSS 메인테이너 무료 (가입 즉시)",
              "$10/월 부담 적은 가격",
              "JetBrains·Vim 사용자에게 사실상 유일한 선택지",
              "GitHub Issues·PR 과 직접 통합",
            ],
            cons: [
              "코드베이스 전체 컨텍스트는 Cursor 대비 약함 (Pro 한도 내)",
              "Composer 같은 멀티파일 일괄 변경 기능 부재",
              "한국어 코드 주석 처리는 자연스럽지만 Cursor·Claude Code 만큼 자유롭지 않음",
              "기본값에서는 데이터가 학습에 사용 가능 (Business 이상 No-train)",
            ],
            koreanContext:
              "GitHub 계정만 있으면 한국에서 즉시 무료 또는 결제 사용 가능. 한국 신용카드·체크카드 결제 정상. 학생은 GitHub Student Developer Pack 신청만으로 무료 활성화 (대학 이메일 인증). 한국어 주석·변수명·문서 작성에도 자연스럽게 응답합니다. 회사 코드 다룰 때는 Business 이상 플랜의 No-train 정책 활용 권장.",
            startingGuide: [
              { step: 1, title: "GitHub 계정 + Copilot 활성화", body: "github.com/features/copilot 에서 활성화. 학생이면 Student Pack 먼저 신청." },
              { step: 2, title: "에디터에 플러그인 설치", body: "VS Code/JetBrains/Vim 마켓플레이스에서 'GitHub Copilot' 검색·설치. 자동 로그인." },
              { step: 3, title: "자동완성 익히기", body: "코드 입력 시 회색 텍스트로 제안. Tab 으로 수락, Esc 로 거절. 부분 수락은 Cmd+→." },
              { step: 4, title: "Chat 활용", body: "사이드 채팅 열기. '@workspace 이 코드의 버그 찾아줘' 같은 코드베이스 질문." },
              { step: 5, title: "Agent 모드 (Pro)", body: "Pro 결제 후 GitHub Issue 에 @copilot 멘션. 자동으로 코드 작성·PR 생성." },
            ],
            faq: [
              { q: "한국에서 결제 가능?", a: "가능합니다. GitHub 계정에 한국 신용카드·체크카드 등록해 자동 청구. VPN 불필요." },
              { q: "학생이면 무료?", a: "예. github.com/education/students 에서 Student Developer Pack 신청 시 Copilot 즉시 무료 활성화. 한국 대학생도 .ac.kr 이메일이나 학생증 인증으로 가입 가능." },
              { q: "Cursor 와 비교하면?", a: "Cursor 는 AI 네이티브 에디터로 코드베이스 전체 컨텍스트·Composer 멀티파일 변경이 강력. Copilot 은 기존 에디터(특히 JetBrains·Vim) 그대로 + 가격 절반. 가벼운 자동완성·Chat 위주면 Copilot, 본격적 AI 페어 프로그래밍은 Cursor 가 우위. JetBrains 사용자는 Copilot 이 사실상 유일." },
              { q: "어느 에디터에서 가장 잘 작동?", a: "VS Code 가 가장 풍부한 기능, JetBrains 가 그 다음, Vim·Neovim·Emacs 는 자동완성 위주. Visual Studio·Eclipse 도 공식 플러그인. 본인이 쓰는 에디터에 맞춰 동일한 Copilot 계정으로 모두 사용 가능." },
              { q: "회사 코드 올려도?", a: "기본값에서는 학습에 사용될 수 있음. Business 이상 플랜에서 No-train 약관 활성화. 매우 민감한 코드는 가명화 후 사용하거나 자체 호스팅 LLM 검토." },
              { q: "Agent 모드는 뭐?", a: "GitHub Issue 에 @copilot 멘션하면 AI 가 자동으로 코드를 작성하고 PR 까지 생성하는 자율 모드. 작은 버그·문서 수정·테스트 추가 같은 작업에 사용. Pro 플랜에서 사용 가능." },
              { q: "한국어 주석 처리?", a: "자연스럽게 한국어 주석 작성합니다. 한글 변수명도 인식 가능하지만 영문 변수명이 자동완성 정확도가 더 높습니다. 주석은 한국어, 변수명은 영문 패턴이 일반적." },
              { q: "환불 가능?", a: "구독 시작 후 30일 이내 사용량이 적으면 환불 가능합니다. 자세한 사항은 github.com/billing 에서 확인하거나 GitHub Support 에 문의해야 합니다." },
            ],
            relatedKeywords: [
              "GitHub Copilot 한국",
              "Copilot 학생 무료",
              "Copilot vs Cursor",
              "Copilot 가격",
              "JetBrains AI",
              "Copilot Chat",
              "Copilot Agent",
              "VS Code AI",
              "Copilot Business",
              "AI 코드 자동완성",
            ],
          },
        },
        {
          name: "Claude Code",
          url: "https://www.claude.com/product/claude-code",
          blurb: "터미널 기반 AI 페어 프로그래머.",
          details:
            "Anthropic 공식 도구로 터미널에서 claude 명령으로 실행합니다. 현재 디렉토리 전체를 컨텍스트로 이해해 멀티파일 변경, 테스트 실행, git 커밋·PR 생성까지 자동으로 처리합니다. 대규모 리팩터링과 버그 추적에서 강점이 있습니다.",
          useCases: [
            "대규모 리팩터링",
            "버그 추적 (멀티파일 트레이스)",
            "터미널 워크플로우 자동화",
            "VS Code·JetBrains 확장",
          ],
          pricing: "paid",
          pricingNote: "Claude Pro $20/월 / Max $100·$200/월 사용량 포함",
          alternatives: ["Cursor", "Aider"],
          founded: "2024",
        },
        {
          name: "v0 by Vercel",
          url: "https://v0.dev",
          blurb: "프롬프트로 React·Tailwind UI 즉시 생성.",
          details:
            "Vercel 공식 도구입니다. 대시보드, 로그인 폼 같은 한국어 명령으로 React + Tailwind + shadcn/ui 컴포넌트 코드가 미리보기와 함께 생성됩니다. Next.js 프로젝트에 그대로 복사·붙여넣기가 가능합니다.",
          useCases: [
            "랜딩 페이지 빠른 프로토타입",
            "UI 컴포넌트 시안",
            "Next.js 프로젝트 부품 양산",
            "Tailwind 학습용",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 200 크레딧 / Premium $20/월~",
          alternatives: ["Bolt.new", "Lovable"],
          founded: "2023",
        },
        {
          name: "Bolt.new",
          url: "https://bolt.new",
          blurb: "프롬프트로 풀스택 앱 생성·실행·배포.",
          details:
            "StackBlitz 에서 운영합니다. 한 문장 프롬프트로 풀스택 앱(프론트·백·DB)을 생성하고 브라우저 안에서 즉시 실행·배포할 수 있습니다. v0 가 UI 중심이라면 Bolt 는 앱 전체를 다룹니다. 비개발자의 MVP 제작에 자주 사용됩니다.",
          useCases: [
            "비개발자 MVP 제작",
            "풀스택 프로토타입",
            "프론트·백 동시 생성",
            "v0 와 백엔드의 조합",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 1M 토큰 / Pro $20/월~",
          alternatives: ["v0", "Lovable", "Replit Agent"],
          founded: "2024",
        },
      ],
    },
    {
      title: "🌐 번역 / 문서 / 일반 업무",
      items: [
        {
          name: "DeepL",
          url: "https://www.deepl.com/translator",
          blurb: "번역 자연스러움이 가장 높다고 평가되는 번역기.",
          details:
            "독일 DeepL SE 가 운영합니다. 한·영, 한·일 번역에서 구글 번역 대비 문장 결이 자연스럽다는 평가가 일관됩니다. 무료 플랜은 일 5천 자, PDF·Word 파일 직접 번역, 크롬 확장의 웹페이지 자동 번역까지 제공합니다.",
          useCases: [
            "영문 메일·논문 번역",
            "일본어·중국어·유럽어 양방향 번역",
            "PDF·Word 파일 직접 번역",
            "크롬 확장으로 웹페이지 번역",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 5천 자 / Starter €8.99/월~",
          alternatives: ["Papago", "Google Translate"],
          founded: "2017",
          korean: true,
          hubSlug: "deepl",
          detailContent: {
            longIntro: [
              "DeepL 은 2017년 독일에서 출시된 번역 서비스입니다. 한·영, 한·일, 한·중 등 주요 언어 쌍에서 구글 번역 대비 문장 결이 자연스럽다는 평가가 일관적입니다. 학술 논문·계약서·비즈니스 이메일 같은 격식 있는 글 번역에서 가장 신뢰받는 도구입니다.",
              "특히 한·영 번역 품질이 매우 자연스럽습니다. 직역체가 적고 영어 모국어 사용자가 쓰는 자연스러운 표현으로 변환됩니다. 한국 학자·번역가·기업 사용자 사이에서 'DeepL 한 번 거치고 다시 영어 원어민이 미세 조정' 패턴이 표준화될 정도입니다.",
              "무료 플랜은 일 5천 자(약 A4 1.5장) 와 파일 직접 번역 일 3개를 제공합니다. 본격 사용은 Starter(€8.99) 이상 결제. 크롬·엣지·사파리 확장 깔면 웹페이지 우클릭 한 번에 자동 번역됩니다.",
              "한국에서 가입·결제·이용 모두 정상이며 PDF·Word·PowerPoint 같은 문서 파일을 그대로 업로드해 번역할 수 있어 학생·연구자·기업 사용자에게 진입 비용이 낮습니다.",
            ],
            features: [
              { title: "한·영 자연스러움 1티어", body: "구글 번역 대비 한·영 번역 결이 자연스럽다는 평가 일관." },
              { title: "32개 언어 양방향", body: "한·영·일·중·독·불·스 등 32개 언어 쌍. 주요 언어는 모두 우수." },
              { title: "파일 직접 번역", body: "PDF·Word·PowerPoint·HTML 등 파일 업로드 → 형식 유지하며 번역." },
              { title: "DeepL Write", body: "영문 글쓰기 보조 — 문법·스타일·톤 다듬기. 별도 도구로 제공." },
              { title: "용어집 (Glossary)", body: "Pro 이상 — 회사명·고유명사·전문 용어를 일정한 번역어로 고정." },
              { title: "크롬·엣지 확장", body: "웹페이지 우클릭 → DeepL 번역. 자동 한국어 표시." },
              { title: "데스크톱 앱", body: "Mac·Windows 앱 — 어디서나 단축키로 즉시 번역." },
              { title: "API", body: "Pro·Business 에서 API 액세스. 자체 앱·서비스에 통합." },
            ],
            pricingPlans: [
              {
                name: "무료 (Free)",
                price: "0원",
                features: [
                  "일 5천 자 (약 A4 1.5장)",
                  "파일 번역 일 3개",
                  "크롬·앱 모두 사용",
                  "비상업 이용",
                ],
              },
              {
                name: "Starter",
                price: "€8.99/월 (약 1.3만원)",
                features: [
                  "글자 수 무제한",
                  "파일 번역 일 5개",
                  "상업 이용",
                  "데이터 즉시 삭제",
                ],
              },
              {
                name: "Advanced",
                price: "€32.99/월 (약 4.8만원)",
                recommended: true,
                features: [
                  "파일 번역 일 100개",
                  "용어집 (Glossary)",
                  "팀 협업",
                  "고급 보안",
                ],
              },
            ],
            pros: [
              "한·영 번역 자연스러움 1티어",
              "PDF·Word 파일 직접 번역 (형식 유지)",
              "크롬 확장·데스크톱 앱 편의성 우수",
              "DeepL Write 영문 글쓰기 보조",
              "데이터 즉시 삭제 정책 (개인정보 보호)",
            ],
            cons: [
              "한국 구어체·인터넷 신조어는 Papago 가 우위",
              "결제는 EUR 기준 (환율 변동)",
              "32개 언어 외 마이너 언어는 미지원",
              "Starter €8.99 가 글자 수 무제한이지만 파일 번역은 제한",
            ],
            koreanContext:
              "한국 신용카드·체크카드 결제 정상. 카카오·네이버페이 미지원. 결제는 EUR 기준이라 환율 변동에 따라 청구액이 달라집니다. 학술 논문·비즈니스 이메일·계약서 같은 격식 있는 한·영 번역에서 한국 사용자 사이 가장 신뢰받음. 일본어·중국어 구어체 표현이나 한국 인터넷 신조어는 Papago(네이버) 가 우위라 둘을 같이 쓰는 사용자가 많습니다.",
            startingGuide: [
              { step: 1, title: "가입", body: "deepl.com 접속 후 구글·이메일 가입. 무료 일 5천 자 즉시 사용 가능." },
              { step: 2, title: "크롬 확장 설치", body: "Chrome Web Store 에서 DeepL 확장 설치. 웹페이지 우클릭 → 'DeepL 번역'." },
              { step: 3, title: "데스크톱 앱 설치", body: "Mac·Windows 앱 다운로드. 단축키(Cmd+C+C 또는 Ctrl+C+C) 두 번이면 즉시 번역." },
              { step: 4, title: "파일 번역", body: "DeepL 웹사이트 → 파일 업로드 → 형식 유지하며 번역. PDF·Word·PowerPoint 가능." },
              { step: 5, title: "Starter·Advanced 결제", body: "글자 수 부족 또는 상업 이용 필요 시 Starter(€8.99) 부터. 팀·용어집 필요시 Advanced(€32.99)." },
            ],
            faq: [
              { q: "한국에서 결제?", a: "한국 신용카드·체크카드 결제 정상. EUR 기준 청구. 카카오·네이버페이 미지원." },
              { q: "Papago·구글 번역과 비교?", a: "격식 있는 글(논문·계약서·비즈니스) 한·영 번역은 DeepL 우위. 한국 구어체·신조어·일본어 구어체는 Papago 우위. 일반 글로벌 검색용은 구글 번역도 OK. 보통 둘 또는 셋을 같이 쓰면서 결과 비교." },
              { q: "파일 번역 형식 유지 되나?", a: "예. PDF·Word·PowerPoint 형식과 레이아웃을 그대로 유지하면서 텍스트만 번역. 다만 복잡한 표·도형이 있는 PDF 는 일부 깨질 수 있음." },
              { q: "DeepL Write 가 뭐?", a: "영문 글쓰기 보조 도구. 본인이 쓴 영어 문장을 더 자연스러운 표현으로 다듬어줍니다. 토플·아이엘츠 라이팅, 비즈니스 영문 메일, 해외 SNS 글에 사용. Grammarly 와 비슷한 역할." },
              { q: "회사 자료 올려도?", a: "Pro 이상 플랜은 데이터 즉시 삭제 정책 적용. 무료 플랜도 학습에 사용되지 않지만 회사 기밀 등은 Pro 이상 결제 권장." },
              { q: "용어집(Glossary) 가 뭐?", a: "회사 이름·고유명사·전문 용어를 일관된 번역어로 고정하는 기능. 예: 'Eloan' 을 항상 '이로안' 으로 번역하게 설정. Advanced 이상 플랜에서 사용." },
              { q: "어느 언어 가장 강한가?", a: "유럽 언어(독·불·스·이) 와 한·영·일 번역이 가장 우수. 베트남어·태국어·아랍어 같은 마이너 언어는 구글 번역이 더 정확할 수 있음." },
              { q: "환불?", a: "구독 시작 후 14일 이내 사용량이 적으면 환불 가능. 자세한 사항은 deepl.com/legal." },
            ],
            relatedKeywords: [
              "DeepL 한국 사용",
              "DeepL 가격",
              "DeepL vs Papago",
              "한영 번역 AI",
              "논문 번역 도구",
              "PDF 번역",
              "DeepL Write",
              "비즈니스 번역",
              "구글 번역 vs DeepL",
              "DeepL Pro",
            ],
          },
        },
        {
          name: "Papago",
          url: "https://papago.naver.com",
          blurb: "네이버 번역기. 일본어·중국어 구어체 강점.",
          details:
            "네이버 공식 번역기입니다. DeepL 이 약한 일본어 구어체, 중국어 신조어, 한국 구어체 표현의 정확도가 높습니다. 음성 번역과 이미지 OCR 번역(메뉴판·간판) 도 지원합니다. 모든 기능이 무료입니다.",
          useCases: [
            "일본어·중국어 일상 회화",
            "이미지 OCR 번역 (메뉴판)",
            "한국 여행객 도구",
            "DeepL 의 무료 대안",
          ],
          pricing: "free",
          pricingNote: "무료",
          alternatives: ["DeepL", "Google Translate"],
          founded: "2017",
          korean: true,
        },
        {
          name: "Notion AI",
          url: "https://www.notion.so/product/ai",
          blurb: "Notion 안에서 요약·작성·번역·전체 검색.",
          details:
            "Notion 사용자에게 가장 자연스럽게 통합되는 AI 입니다. 스페이스바 한 번으로 현재 페이지 요약·번역·확장이 가능하고, AI 검색으로 워크스페이스 전체 문서를 자연어로 검색할 수 있습니다.",
          useCases: [
            "회의록 자동 요약",
            "위키 문서 빠른 작성",
            "워크스페이스 전체 검색",
            "협업 문서 한·영 동시 작성",
          ],
          pricing: "paid",
          pricingNote: "Notion 기본 + 사용자당 $10/월",
          alternatives: ["ChatGPT", "Claude Projects"],
          founded: "2023",
          korean: true,
          imageUrl:
            "https://www.notion.com/front-static/meta/custom-agents-og.png",
          hubSlug: "notion-ai",
          detailContent: {
            longIntro: [
              "Notion AI 는 노션(Notion) 안에 통합된 AI 어시스턴트입니다. 2023년 출시 이후 단순 문서 자동 작성 기능에서 시작해 2026년 현재는 워크스페이스 전체 검색·요약·번역·표 작성·이메일 답장까지 가능한 종합 도구로 발전했습니다.",
              "노션 사용자에게 가장 자연스러운 AI 통합 경험을 제공합니다. 스페이스바 한 번이면 현재 페이지 내용을 기반으로 요약·확장·번역이 즉시 가능하고, AI 검색(Q&A)으로 워크스페이스 전체 문서를 자연어로 검색할 수 있습니다. 회의록·위키·프로젝트 문서를 노션에서 관리하는 팀에게 ChatGPT 보다 효율적인 워크플로우를 제공합니다.",
              "2024년 Notion AI Connectors 가 도입되어 Slack·Google Drive·Gmail·Linear·GitHub 등 외부 서비스 데이터까지 같이 검색·요약할 수 있게 되었습니다. 흩어진 회사 자료를 한 곳에서 자연어로 다루는 사용 패턴이 빠르게 자리잡고 있습니다.",
              "한국에서 가입·결제·이용 모두 정상이며 한국어 입출력 품질도 안정적입니다. 노션을 이미 쓰는 팀에게 가장 적합하고, 노션을 안 쓴다면 ChatGPT·Claude 같은 독립 챗봇이 더 효율적입니다.",
            ],
            features: [
              { title: "AI 작성·요약", body: "스페이스바 → 'Ask AI' 한 번이면 현재 문서 요약·확장·번역·표 생성." },
              { title: "AI 검색 (Q&A)", body: "워크스페이스 전체 문서를 자연어로 검색. '지난주 회의록 어디?' 같은 질문에 답변." },
              { title: "Connectors", body: "Slack, Gmail, Google Drive, Linear, GitHub, Jira 등 외부 데이터까지 검색·요약." },
              { title: "회의록 자동 작성", body: "Notion Calendar + AI 로 미팅 녹음 → 자동 회의록 + 액션 아이템 추출." },
              { title: "AI Translator", body: "한국어 ↔ 영어·일본어·중국어 등 워크스페이스 문서 일괄 번역." },
              { title: "표·DB 자동 채우기", body: "AI 가 데이터베이스의 빈 셀을 자동으로 채움. 회사명 입력 → AI 가 산업·규모 자동 분류." },
              { title: "Custom Notion AI", body: "특정 페이지·DB 만 학습시킨 전용 AI 만들기. 사내 위키 챗봇 같은 용도." },
              { title: "이메일 초안", body: "Gmail Connector 와 결합해 이메일 답장 자동 작성." },
            ],
            pricingPlans: [
              {
                name: "노션 기본 (무료)",
                price: "0원",
                features: [
                  "노션 워크스페이스 무료 사용",
                  "AI 무료 시도 (소량 한도)",
                  "본격 사용은 별도 결제 필요",
                ],
              },
              {
                name: "Notion AI 추가",
                price: "사용자당 $10/월 (연 결제 시 $8)",
                recommended: true,
                features: [
                  "AI 작성·요약 무제한",
                  "AI 검색 (Q&A) 무제한",
                  "Connectors (Slack·Gmail 등)",
                  "회의록 자동 작성",
                  "GPT-5·Claude 모델 활용",
                ],
              },
              {
                name: "Business / Enterprise",
                price: "사용자당 $15~24/월 + AI 추가",
                features: [
                  "노션 Business / Enterprise 기능",
                  "Notion AI 추가 결제 필요",
                  "SSO·SAML",
                  "감사 로그",
                  "No-train 정책",
                ],
              },
            ],
            pros: [
              "노션 안에서 자연스럽게 통합 (별도 도구 전환 X)",
              "워크스페이스 전체 검색 (Q&A) 매우 강력",
              "Connectors 로 Slack·Gmail·Drive 통합",
              "회의록 자동 작성으로 시간 절약",
              "한국어 입출력 품질 안정적",
            ],
            cons: [
              "노션 안 쓰면 사실상 의미 없음",
              "독립 챗봇(ChatGPT·Claude) 대비 일반 대화·창작은 약함",
              "사용자당 $10/월로 팀 규모 커지면 비용 누적",
              "Connectors 설정에 IT 권한 필요한 경우 있음",
            ],
            koreanContext:
              "한국 신용카드·체크카드 결제 정상. 카카오·네이버페이 미지원. 한국어 입출력 품질이 자연스러워 한국 팀 회의록·위키·프로젝트 관리에 그대로 사용 가능합니다. 노션을 메인 워크스페이스로 쓰는 한국 스타트업·중견기업이 빠르게 늘면서 도입 사례가 많아지고 있습니다. 네이버 워크플레이스·카카오 아지트 같은 한국 토종 협업 도구를 쓰는 팀은 효과가 제한적.",
            startingGuide: [
              { step: 1, title: "노션 사용 확인", body: "먼저 노션 워크스페이스가 있어야 의미가 있음. 없으면 notion.so 에서 무료 가입." },
              { step: 2, title: "AI 무료 체험", body: "노션 안에서 스페이스바 → 'Ask AI' 클릭. 소량 무료 사용 후 결제 안내." },
              { step: 3, title: "Notion AI 결제", body: "Settings → Plans → Add Notion AI ($10/사용자/월). 팀이면 전원 활성화 권장." },
              { step: 4, title: "AI 검색 활용", body: "워크스페이스 좌측 상단 검색창 → 'Q&A' 모드. '회사 휴가 정책 알려줘' 같이 자연어로 질문." },
              { step: 5, title: "Connectors 연동", body: "Settings → Connections 에서 Slack·Gmail·Drive 등 연동. 회사 데이터 전체에서 검색 가능." },
            ],
            faq: [
              { q: "노션 안 써도 사용 가능?", a: "사실상 의미 없습니다. Notion AI 는 노션 페이지·DB 안에서 작동하는 통합 도구라 별도 챗봇처럼은 못 씁니다. 노션 안 쓰는 사용자는 ChatGPT·Claude 같은 독립 챗봇이 적합합니다." },
              { q: "한국에서 결제 가능?", a: "가능. 한국 신용카드·체크카드 결제 정상. 카카오·네이버페이는 미지원이므로 카드 결제 사용." },
              { q: "ChatGPT 와 어떤 게 다른가?", a: "ChatGPT 는 독립 챗봇, Notion AI 는 노션 안 통합 도구. 일반 대화·창작·이미지는 ChatGPT, 노션 안 문서 작업·워크스페이스 검색은 Notion AI 가 우위. 노션을 메인으로 쓰는 팀이면 둘 다 결제도 흔합니다." },
              { q: "사용자당 $10 비싸지 않나?", a: "팀 규모가 커질수록 누적되지만 회의록 자동 작성 + 워크스페이스 검색만으로도 시간 절약 효과 큼. 사용 안 하는 멤버는 빼고 활성 사용자만 활성화하는 것도 비용 관리 팁." },
              { q: "Connectors 가 뭐?", a: "외부 서비스(Slack, Gmail, Google Drive, Linear, GitHub, Jira 등) 를 Notion AI 가 직접 읽어 자연어로 검색·요약하는 기능. 회사 자료가 여러 도구에 흩어져 있을 때 한 곳에서 다룰 수 있게 해줍니다." },
              { q: "회의록 자동 작성 정확도?", a: "Notion Calendar + AI 조합으로 미팅 녹음을 자동 받아쓰기·요약·액션 아이템 추출. 한국어 정확도는 네이버 클로바노트 만큼은 아니지만 70~85% 수준. 노션 안에서 바로 정리되는 워크플로우 통합이 큰 장점." },
              { q: "회사 자료 학습에 사용되나?", a: "기본값에서는 학습 거부가 적용됩니다 (Workspace 약관). 더 엄격한 No-train 정책이 필요하면 Business / Enterprise 플랜의 Privacy 설정 확인. 매우 민감한 자료는 별도 워크스페이스로 분리 권장." },
              { q: "Custom Notion AI 가 뭐?", a: "특정 페이지·DB 만 학습시킨 전용 AI. 예를 들어 사내 위키·HR 정책 문서로만 학습시킨 'HR 챗봇' 을 만들어 직원들에게 공개하는 식. 사내 지식 자동화에 강력." },
            ],
            relatedKeywords: [
              "Notion AI 한국 사용",
              "Notion AI 가격",
              "노션 AI 무료",
              "Notion AI vs ChatGPT",
              "Notion Q&A",
              "노션 회의록",
              "Notion Connectors",
              "노션 워크스페이스 검색",
              "Custom Notion AI",
              "노션 AI 번역",
            ],
          },
        },
        {
          name: "Gamma",
          url: "https://gamma.app",
          blurb: "프롬프트로 슬라이드·웹페이지·문서 즉시 생성.",
          details:
            "한 줄 프롬프트로 PPT·웹페이지·문서가 한 번에 생성됩니다. 한국어 지원이 우수하며, 일반 PPT 대비 인터랙티브한 슬라이드를 만들 수 있고 그대로 웹 게시도 가능합니다.",
          useCases: [
            "프롬프트 → PPT 즉시 생성",
            "인터랙티브 발표 자료",
            "랜딩 페이지 빠른 제작",
            "한국어 PPT 자동 생성",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 400 크레딧 / Plus $10/월 / Pro $20/월",
          alternatives: ["미리캔버스", "Tome"],
          founded: "2020",
          korean: true,
        },
        {
          name: "Grammarly",
          url: "https://www.grammarly.com",
          blurb: "영문 문법·톤 교정의 표준.",
          details:
            "영어 글쓰기 교정 분야의 표준 서비스입니다. 문법 교정에 더해 비즈니스·캐주얼·학술 등의 톤 조정, 표절 검사를 제공합니다. 크롬 확장, MS Word, Gmail 등 대부분의 환경에 자동 통합됩니다.",
          useCases: [
            "영문 이메일 교정",
            "토플·아이엘츠 라이팅",
            "해외 SNS·블로그 글",
            "표절 검사 (학생용)",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Pro $12/월~",
          alternatives: ["ChatGPT", "DeepL Write"],
          founded: "2009",
        },
      ],
    },
  ],
  faq: [
    {
      q: "2026년 한국에서 가장 많이 사용되는 AI 도구는 무엇인가요?",
      a: "범용 챗봇은 ChatGPT 가 유료 사용자 수에서 가장 많고, 긴 글과 코딩 분야에서는 Claude 의 점유가 큽니다. 한국어 회의록은 네이버 클로바노트가 1위를 유지하고 있습니다. 검색·리서치는 Perplexity, 이미지는 Midjourney 와 ChatGPT 내장 DALL·E 3 가 함께 자주 사용됩니다.",
    },
    {
      q: "ChatGPT 와 Claude 중 무엇을 선택해야 하나요?",
      a: "일상 대화, 이미지 생성, 음성 모드, 웹 검색은 ChatGPT 가 앞섭니다. 긴 PDF 요약, 코드 리뷰, 한국어 카피라이팅은 Claude 가 우위에 있습니다. 둘 다 무료 플랜이 있으므로 같은 질문을 양쪽에 입력해 결과물의 톤을 비교해보는 방법이 빠릅니다.",
    },
    {
      q: "유료 결제 없이 무료로만 사용할 수 있나요?",
      a: "가능합니다. ChatGPT, Claude, Gemini 모두 무료 플랜을 제공합니다. 한국 토종 뤼튼은 광고 기반으로 GPT·Claude 를 무료 사용하게 해줍니다. 이미지는 Leonardo 가 매일 150 크레딧 무료, 음성은 클로바노트가 100% 무료입니다. 영상 생성(Runway·Sora)과 Midjourney 는 대부분 유료 전용입니다.",
    },
    {
      q: "회사 자료를 AI 에 업로드해도 되나요?",
      a: "위험합니다. 모든 AI 서비스의 무료 플랜은 입력 데이터가 학습에 사용될 수 있으며, 옵트아웃 옵션이 있어도 기본값이 학습 허용인 경우가 많습니다. 회사 기밀, 고객 개인정보, 미공개 재무 자료는 가명화 후 입력하거나 Team·Enterprise 플랜의 No-train 약관을 활용하는 방법이 안전합니다.",
    },
    {
      q: "AI 가 생성한 이미지를 상업적으로 사용해도 되나요?",
      a: "각 서비스의 약관에 따라 다릅니다. Midjourney, DALL·E 3 (ChatGPT Plus 이상), Leonardo 유료 플랜은 상업 이용이 명시적으로 허용됩니다. 무료 플랜은 상업 제한 또는 저작자 표시 의무가 붙는 경우가 있으므로 다운로드 전 약관을 확인해야 합니다. 특정 작가·캐릭터를 모방한 결과물은 별도의 분쟁 소지가 있습니다.",
    },
    {
      q: "AI 코딩 도구를 사용하면 개발 실력이 떨어지나요?",
      a: "자동 생성에만 의존하는 경우 학습 곡선이 무너질 수 있습니다. 본인이 먼저 코드를 작성한 뒤 AI 에 리뷰를 요청하고, 답변의 이유까지 이해한 뒤 적용하는 순서가 학습에 효과적입니다. 익숙하지 않은 라이브러리는 자동완성을 끄고 직접 작성하는 방식도 도움이 됩니다.",
    },
    {
      q: "ChatGPT 의 한국어 답변이 어색한 경우 어떻게 개선하나요?",
      a: "Custom Instructions 에 직업, 전문 분야, 선호하는 말투(존댓말/반말, 격식/캐주얼)를 명시하면 결과가 크게 개선됩니다. 매 대화 첫 줄에 '한국어 모국어 사용자처럼 자연스럽게'와 같은 시스템 프롬프트를 추가하는 방법도 효과적입니다. 전문 용어가 많은 분야에서는 Claude 가 더 자연스러운 결과를 주는 경우가 많습니다.",
    },
    {
      q: "한국어 회의록·받아쓰기는 어디가 가장 정확한가요?",
      a: "100% 무료인 네이버 클로바노트가 정확도, AI 요약, 화자 분리에서 글로벌 도구 대비 우위에 있습니다. 회사 단위 도입은 한국 토종 Daglo 가 SSO 와 관리자 기능을 제공해 함께 검토할 만합니다. 글로벌 Whisper API 의 한국어 정확도는 클로바노트보다 다소 낮은 편입니다.",
    },
  ],
};

// ===========================================================================
// 2. 정부지원금 / 환급금
// ===========================================================================
const MONEY: PickCategory = {
  slug: "money",
  title: "정부지원금·환급금 받는 사이트 모음 — 숨은돈 찾는 33곳",
  metaTitle: "정부지원금·환급금 사이트 모음 — 숨은돈 찾는 33곳",
  shortTitle: "정부지원금",
  emoji: "💰",
  oneLiner: "신청만으로 받는 정부·금융 공식 사이트 33곳.",
  description:
    "정부24, 보조금24, 복지로, 카드포인트 통합조회, 내보험 찾아줌, 홈택스, 국민건강보험공단, 주택도시기금, K-Startup 등 신청만으로 받을 수 있는 정부·금융 공식 사이트 33곳을 10개 카테고리로 정리한 디렉토리입니다.",
  longIntro: [
    "정부24, 보조금24, 복지로, 카드포인트 통합조회 등 한국 정부·공공기관·금융결제원에서 운영하는 공식 사이트를 통합 포털·숨은 돈·세금·고용·교육·출산·주거·소상공인·건강·에너지 10개 카테고리로 정리했습니다. 도메인은 모두 .go.kr 또는 .or.kr 로 끝납니다.",
    "처음 시작하는 경우 정부24의 보조금24, 카드포인트 통합조회, 내 계좌 한눈에(어카운트인포), 내보험 찾아줌, 휴면예금 찾아줌 순서로 점검하면 평균 10만원 이상의 회수가 가능합니다. 모두 본인 인증(공동인증·간편인증)만으로 즉시 결과를 확인할 수 있습니다.",
    "세금 환급은 시즌이 정해져 있습니다. 연말정산은 1~3월, 종합소득세는 5월, 부가가치세는 1·7월입니다. 홈택스의 환급금 조회 메뉴에서 미수령 환급금을 확인할 수 있으며, 5년 이내라면 경정청구를 통해 누락된 공제를 추가 환급받을 수 있습니다.",
    "주거 지원은 마이홈 포털에서 자격 진단 후 LH 청약플러스, SH 서울주택공사, 주택도시기금(디딤돌·버팀목 대출), 한국주택금융공사(보금자리론) 로 연결됩니다. 청년월세 한시 특별지원은 복지로에서 신청합니다.",
    "정부지원금과 환급금을 빙자한 보이스피싱·문자 사칭이 많습니다. 정부·공공기관은 문자나 전화로 클릭을 유도하지 않으며, 모든 신청은 사용자가 공식 사이트에 직접 접속해 본인 인증 후 진행하는 구조입니다.",
  ],
  selectionCriteria: [
    "정부·공공기관 공식 사이트만 (.go.kr / .or.kr)",
    "민간 중개·광고 사이트 제외",
    "본인 인증으로 즉시 조회·신청 가능한 서비스",
    "전국 단위 서비스 우선 (지자체 한정은 별도 표기)",
  ],
  updatedAt: TODAY,
  relatedKeywords: [
    "정부지원금 조회",
    "환급금 조회",
    "숨은보험금 찾기",
    "카드포인트 현금화",
    "휴면예금 찾기",
    "청년 지원금",
    "근로장려금 신청",
    "연말정산 환급",
    "디딤돌 대출",
    "건강검진 환급",
  ],
  groups: [
    {
      title: "🏛️ 정부 통합 포털",
      items: [
        {
          name: "정부24",
          url: "https://www.gov.kr",
          blurb: "정부 민원·증명서·지원금 통합 포털.",
          details:
            "행정안전부에서 운영합니다. 주민등록등본, 가족관계증명서 등의 민원 발급부터 보조금 자동 매칭까지 한 포털에서 처리됩니다. 간편인증(카카오·네이버·통신사) 로그인 후 '나의 혜택' 메뉴에서 받을 수 있는 지원금이 자동으로 표시됩니다.",
          useCases: [
            "받을 수 있는 정부지원금 자동 진단",
            "주민등록등본·증명서 무료 발급",
            "출산·결혼·이사 행정 처리",
            "정부 민원 신청 추적",
          ],
          pricing: "free",
          pricingNote: "전부 무료",
          tip: "로그인 후 '나의 혜택' 결과를 캡처해두면 1년 후 재확인할 때 비교가 쉽습니다.",
          founded: "2015",
          korean: true,
          hubSlug: "gov24",
          subItems: [
            {
              name: "주민등록등본·초본 발급",
              blurb: "온라인 무료, 즉시 PDF·프린트",
              details:
                "본인·세대 주민등록표 등본·초본을 PDF 로 즉시 발급할 수 있습니다. 인쇄 또는 전자문서 보관이 가능하며 오프라인 발급 수수료가 면제됩니다.",
              amount: "무료 (오프라인 수수료 400원 → 온라인 0원)",
              eligibility: "본인 또는 세대원",
              applyWhen: "24시간",
              url: "https://www.gov.kr/portal/main",
            },
            {
              name: "가족관계증명서",
              blurb: "본인·가족 발급 무료",
              details:
                "기본증명서·가족관계·혼인관계·입양관계·친양자입양관계 등 5종 증명서를 발급합니다. 전자문서로 즉시 발급 가능합니다.",
              amount: "무료",
              eligibility: "본인 또는 직계존비속·배우자",
              applyWhen: "24시간",
              url: "https://www.gov.kr/portal/main",
            },
            {
              name: "보조금24",
              blurb: "받을 수 있는 보조금 자동 매칭",
              details:
                "1,400개 이상의 중앙·지방 정부 보조금을 본인 정보에 맞춰 자동 매칭합니다. 청년·신혼·소상공인 평균 5~10개 항목이 매칭됩니다.",
              amount: "지원금별 상이",
              eligibility: "전 국민 (자격별 차등)",
              applyWhen: "수시",
              url: "https://www.gov.kr/portal/subsidy24/cmm/main",
            },
            {
              name: "민원·증명서 발급",
              blurb: "300+ 증명서 통합 발급",
              details:
                "주민등록·가족관계·인감·납세·건축물대장·토지대장 등 300종 이상의 증명서를 한 포털에서 발급합니다.",
              amount: "대부분 무료",
              eligibility: "본인 또는 자격자",
              applyWhen: "24시간",
              url: "https://www.gov.kr/portal/civilService",
            },
            {
              name: "출산 원스톱 서비스",
              blurb: "출생신고 + 첫만남이용권 + 아동수당 일괄",
              details:
                "한 번의 신청으로 출생신고, 첫만남이용권, 아동수당, 부모급여, 양육수당 등을 일괄 처리합니다. 출생 후 60일 이내 진행해야 합니다.",
              amount: "첫만남이용권 200만원 등 포함",
              eligibility: "출생아 보호자",
              applyWhen: "출생 후 60일 이내",
              url: "https://www.gov.kr/portal/onestopSvc",
            },
            {
              name: "안심상속 원스톱 서비스",
              blurb: "사망자 재산·채무 일괄 조회",
              details:
                "사망자의 금융재산·부동산·자동차·세금·연금·국세·지방세·4대 사회보험 가입 내역 등을 한 번에 조회합니다. 사망일 다음 달 말일까지 신청 가능합니다.",
              eligibility: "상속인 또는 후견인",
              applyWhen: "사망일 다음 달 말일까지",
              url: "https://www.gov.kr/portal/onestopSvc",
            },
            {
              name: "전입신고",
              blurb: "이사 시 온라인 신고 + 우편물 이전",
              details:
                "이사 후 14일 이내 전입신고를 진행합니다. 우편물 주거이전, 자동차 주소 변경 등도 함께 처리할 수 있습니다.",
              eligibility: "이사한 본인",
              applyWhen: "이사 후 14일 이내",
              url: "https://www.gov.kr/portal/main",
            },
            {
              name: "혼인신고·이혼신고",
              blurb: "온라인 혼인·이혼 신고",
              details:
                "혼인신고는 본인과 배우자 양쪽 + 증인 2인 정보로 진행합니다. 협의 이혼은 가정법원 확인서가 필요합니다.",
              eligibility: "당사자",
              applyWhen: "24시간",
              url: "https://www.gov.kr/portal/main",
            },
            {
              name: "인감증명서·본인서명사실확인서",
              blurb: "부동산·금융 거래 필수 증명",
              details:
                "부동산 매매, 자동차 양도, 금융 거래 등에 필요한 인감증명서와 본인서명사실확인서를 발급합니다.",
              amount: "통당 600원",
              eligibility: "본인",
              applyWhen: "24시간",
              url: "https://www.gov.kr/portal/main",
            },
            {
              name: "건축물대장 발급",
              blurb: "주택·상가 건축물 정보 확인",
              details:
                "건축물의 위치·구조·면적·소유자·용도 등을 확인합니다. 매매·임대·대출 시 필수 서류입니다.",
              amount: "무료",
              eligibility: "전 국민",
              applyWhen: "24시간",
              url: "https://www.gov.kr/portal/main",
            },
            {
              name: "납세증명서 (국세·지방세)",
              blurb: "체납·납부 여부 확인",
              details:
                "국세납세증명서와 지방세납세증명서를 발급합니다. 정부 입찰, 대출, 부동산 매매 등에 사용됩니다.",
              amount: "무료",
              eligibility: "본인 또는 사업자",
              applyWhen: "24시간",
              url: "https://www.gov.kr/portal/main",
            },
            {
              name: "나의 혜택 (자격 자동 진단)",
              blurb: "받을 수 있는 정부 지원금 일괄 표시",
              details:
                "로그인 후 본인의 나이·소득·가족 정보 기반으로 받을 수 있는 정부 지원금이 자동 표시됩니다. 보조금24 와 연동됩니다.",
              eligibility: "정부24 로그인 사용자",
              applyWhen: "수시",
              url: "https://www.gov.kr/portal/main",
            },
          ],
        },
        {
          name: "보조금24",
          url: "https://www.gov.kr/portal/subsidy24/cmm/main",
          blurb: "정부보조금 1,400개 자동 매칭.",
          details:
            "정부24 안에 포함된 서비스로 1,400개 이상의 중앙·지방 정부 보조금을 본인 정보(나이·소득·가구원·거주지)에 맞춰 자동 매칭합니다. 청년, 신혼부부, 소상공인의 경우 평균 5~10개 항목이 매칭됩니다.",
          useCases: [
            "본인 자격 보조금 자동 검색",
            "신혼·청년·소상공인 지원금 일괄 확인",
            "출산·돌봄·교육 보조금",
            "지자체 한정 지원 노출",
          ],
          pricing: "free",
          founded: "2021",
          korean: true,
        },
        {
          name: "복지로",
          url: "https://www.bokjiro.go.kr",
          blurb: "복지급여·바우처·돌봄 통합 포털.",
          details:
            "보건복지부에서 운영합니다. 기초생활보장, 의료급여, 한부모가족지원, 청년월세지원 등 복지 사업의 신청과 자격 진단이 한 곳에서 이뤄집니다. '복지서비스 모의계산' 메뉴에서 받을 수 있는 급여 금액을 미리 시뮬레이션할 수 있습니다.",
          useCases: [
            "기초생활·차상위·한부모 자격 진단",
            "청년월세지원 신청",
            "장애인·노인 돌봄",
            "긴급 복지 신청",
          ],
          pricing: "free",
          founded: "2010",
          korean: true,
          hubSlug: "bokjiro",
          subItems: [
            {
              name: "복지서비스 모의계산",
              blurb: "받을 수 있는 급여 금액 시뮬레이션",
              details:
                "본인의 소득·재산·가구원 정보를 입력하면 받을 수 있는 복지급여 항목과 예상 금액이 자동 표시됩니다. 신청 전 자격 확인 도구로 활용됩니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "기초생활보장 (생계급여)",
              blurb: "기준 중위소득 32% 이하 생계 지원",
              details:
                "기준 중위소득 32% 이하 가구의 생활을 직접 지원합니다. 본인 소득과 가구 규모에 따라 차등 지급되며 매월 지급됩니다.",
              amount: "4인 가구 최대 약 195만원/월 (2026 기준)",
              eligibility: "기준 중위소득 32% 이하 가구",
              applyWhen: "수시 (주민센터·복지로)",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "기초생활보장 (의료급여)",
              blurb: "의료비 거의 전액 지원",
              details:
                "1종(기초생활수급자 중 근로무능력)·2종(근로능력) 으로 구분되어 외래·입원·약제비 본인부담을 대폭 경감합니다.",
              amount: "1종 외래 1,000원/입원 0원, 2종 외래 1,000~1,500원",
              eligibility: "기준 중위소득 40% 이하 등",
              applyWhen: "수시",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "기초생활보장 (주거급여)",
              blurb: "임차료·자가 수선비 지원",
              details:
                "임차 가구는 지역·가구원 수별로 정해진 기준임대료를 지원받고, 자가 가구는 노후 정도에 따라 수선 비용을 지원받습니다.",
              amount: "임차 기준임대료 (서울 1인 약 36만원~)",
              eligibility: "기준 중위소득 48% 이하",
              applyWhen: "수시",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "긴급복지 지원",
              blurb: "위기 가구 단기 생계·주거·의료비",
              details:
                "주소득자 사망·실직, 중한 질병, 가정폭력, 화재 등 위기 사유 발생 시 생계·주거·의료비를 신속 지원합니다. 사후 조사로 자격 확인합니다.",
              amount: "4인 가구 생계 약 162만원/월 (최대 6회)",
              eligibility: "위기 사유 + 중위소득 75% 이하",
              applyWhen: "긴급 시 즉시",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "한부모가족 지원",
              blurb: "아동양육비·시설·학자금",
              details:
                "한부모·조손 가구의 자녀에게 아동양육비, 학용품비, 한부모가족 시설 입소, 무이자 학자금 등을 지원합니다.",
              amount: "아동양육비 월 21만원 (만 18세 미만)",
              eligibility: "한부모·조손, 중위소득 63~100% 이하",
              applyWhen: "수시",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "장애인 활동지원",
              blurb: "활동지원사 시간제 파견",
              details:
                "만 6~65세 등록 장애인을 대상으로 활동지원사가 신변보호·가사·이동·사회참여 등을 시간 단위로 지원합니다.",
              amount: "월 최대 480시간 (장애 정도별 차등)",
              eligibility: "만 6~65세 등록 장애인",
              applyWhen: "수시",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "노인맞춤돌봄서비스",
              blurb: "안전·말벗·가사 지원",
              details:
                "독거·취약 노인을 대상으로 안부 확인, 가사 지원, 외출 동행, 사회참여 등을 맞춤 제공합니다. 일반·중점·특화 군으로 구분됩니다.",
              eligibility: "만 65세 이상 취약 노인",
              applyWhen: "수시 (동 주민센터)",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "기초연금",
              blurb: "월 최대 33.5만원, 만 65세 이상",
              details:
                "만 65세 이상 + 소득 하위 70% 노인에게 기초연금이 매월 지급됩니다. 부부 동시 수령 시 20% 감액 후 합산 지급됩니다.",
              amount: "월 최대 33.5만원 (2026 기준)",
              eligibility: "만 65세 이상, 소득 하위 70%",
              applyWhen: "만 65세 도래 1개월 전부터",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "부모급여",
              blurb: "0세 월 100만원 / 1세 월 50만원",
              details:
                "출생일~만 24개월 영아를 둔 가구에 부모급여를 지급합니다. 어린이집·종일제 아이돌봄 이용 시 보육료 바우처로 대체 지급됩니다.",
              amount: "0세 월 100만원 / 1세 월 50만원 (2026)",
              eligibility: "0~23개월 영아 보호자",
              applyWhen: "출생 후 60일 이내 (정부24·복지로)",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "아동수당",
              blurb: "월 10만원, 0~7세 보편 지원",
              details:
                "대한민국 국적의 0~7세(만 8세 미만) 아동에게 보편적으로 월 10만원이 지급됩니다. 출생신고와 함께 신청 가능합니다.",
              amount: "월 10만원 (만 8세 미만)",
              eligibility: "0~7세 아동",
              applyWhen: "출생 후 60일 이내",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "청년월세 한시 특별지원",
              blurb: "월 최대 20만원 × 12개월",
              details:
                "만 19~34세 무주택 청년에게 월세를 최대 12개월 지원합니다. 본인 중위소득 60% 이하 + 원가구 중위소득 100% 이하 조건입니다.",
              amount: "월 최대 20만원 × 12개월 (총 240만원)",
              eligibility: "만 19~34세, 본인 중위소득 60% 이하",
              applyWhen: "수시 (예산 소진 시 종료)",
              url: "https://www.bokjiro.go.kr",
            },
          ],
        },
        {
          name: "온통청년",
          url: "https://www.youthcenter.go.kr",
          blurb: "청년 정책 통합. 주거·취업·금융.",
          details:
            "국무조정실에서 운영하며 19~39세 청년 대상의 중앙·지자체 정책 1만+ 건을 통합 검색합니다. 청년도약계좌, 청년월세, 청년창업, 국가기술자격 응시료 지원 등이 포함됩니다.",
          useCases: [
            "청년도약계좌·청년희망적금",
            "청년월세 한시 특별지원",
            "청년창업·취업지원",
            "지역별 청년수당 비교",
          ],
          pricing: "free",
          founded: "2018",
          korean: true,
        },
      ],
    },
    {
      title: "🛡️ 숨은 보험금",
      items: [
        {
          name: "내보험 찾아줌",
          url: "https://cont.insure.or.kr",
          blurb: "본인 명의 모든 보험과 숨은보험금 통합 조회.",
          details:
            "생명보험협회와 손해보험협회가 공동 운영합니다. 본인 명의의 보험 가입 내역과 미수령 만기·중도·휴면 보험금을 한 번에 조회할 수 있습니다. 부모님 사후 보험금 미신청 사례가 많아 가족 단위 점검에 유용합니다.",
          useCases: [
            "본인 보험 가입 현황",
            "가족 사후 미수령 보험금 청구",
            "휴면 보험금 환급",
            "중복 보험 정리",
          ],
          pricing: "free",
          tip: "조회 결과에 '미수령' 표시가 있으면 해당 보험사 콜센터에서 직접 청구해야 합니다.",
          alternatives: ["파인"],
          founded: "2017",
          korean: true,
        },
        {
          name: "휴면예금·보험금 찾아줌",
          url: "https://www.sleepmoney.or.kr",
          blurb: "10년 이상 거래 없는 예금·보험금 조회.",
          details:
            "서민금융진흥원에서 운영합니다. 10년 이상 거래가 없는 예금과 보험금을 본인 인증 한 번으로 통합 조회·환급 신청할 수 있습니다. 평균 환급액은 5~30만원 수준입니다.",
          useCases: [
            "오래된 통장 잔액 회수",
            "옛 보험 만기금 환급",
            "사망자 가족 대리 청구",
            "어린 시절 가입 통장 정리",
          ],
          pricing: "free",
          founded: "2015",
          korean: true,
        },
      ],
    },
    {
      title: "🏦 계좌·예금·카드 포인트",
      items: [
        {
          name: "파인 (금융감독원)",
          url: "https://fine.fss.or.kr",
          blurb: "전 금융권 계좌·대출·연금·신용 통합.",
          details:
            "금융감독원 공식 포털입니다. '내 계좌 한눈에', '내 카드 한눈에', '잠자는 내 돈 찾기' 등 14개 금융 조회 서비스가 한 곳에 모여 있습니다. 연금 가입 현황 메뉴에서 국민·퇴직·개인연금을 통합한 노후 시뮬레이션이 가능합니다.",
          useCases: [
            "전 금융권 계좌·잔액 조회",
            "본인 명의 대출·카드 발급 내역",
            "국민·퇴직·개인연금 통합",
            "신용평점 무료 조회",
          ],
          pricing: "free",
          founded: "2016",
          korean: true,
          hubSlug: "fine",
          subItems: [
            {
              name: "내 계좌 한눈에",
              blurb: "전 은행·증권·저축은행 통합 조회",
              details:
                "본인 명의의 모든 은행·증권·저축은행·우체국 계좌와 잔액을 한 번에 조회합니다. 1년 이상 거래 없는 비활동 계좌의 잔액을 본인 주거래 계좌로 일괄 이체·해지할 수 있습니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "내 카드 한눈에",
              blurb: "발급 카드·한도·연회비 일괄 조회",
              details:
                "본인 명의로 발급된 모든 신용카드와 체크카드의 발급사, 한도, 연회비, 결제일을 조회합니다. 본인 모르게 발급된 카드 확인에도 활용됩니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "잠자는 내 돈 찾기",
              blurb: "휴면예금·휴면보험금 통합 조회",
              details:
                "10년 이상 거래 없는 휴면예금과 3년 이상 청구 없는 휴면보험금을 한 번에 조회합니다. 평균 환급액은 5~30만원 수준입니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "내 연금 한눈에",
              blurb: "국민·퇴직·개인연금 통합 시뮬레이션",
              details:
                "국민연금, 퇴직연금, 개인연금의 가입 현황과 예상 수령액을 통합 조회합니다. 노후 자금 시뮬레이션 도구로 활용됩니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "내 보험 한눈에",
              blurb: "본인 명의 보험 통합 + 숨은보험금",
              details:
                "본인 명의의 모든 보험 가입 내역과 미수령 만기·중도·휴면 보험금을 한 번에 조회합니다. 가족 사후 미신청 보험금 확인에 유용합니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "자동이체 통합관리",
              blurb: "자동이체·납부 일괄 조회·해지",
              details:
                "본인 계좌에서 빠져나가는 모든 자동이체와 자동납부 내역을 한 번에 조회하고 일괄 해지할 수 있습니다. 사용 안 하는 구독 정리에 활용됩니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "금융주소 한번에",
              blurb: "전 금융사 주소 일괄 변경",
              details:
                "이사 후 모든 금융사에 주소를 일괄 변경할 수 있습니다. 은행, 카드사, 보험사, 증권사 등 등록된 금융사의 주소가 한 번에 갱신됩니다.",
              eligibility: "전 국민",
              applyWhen: "이사 후 수시",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "상속인 금융거래 조회",
              blurb: "사망자 금융재산 일괄 조회",
              details:
                "사망자의 예금, 보험, 증권, 대출, 보증, 카드 등 모든 금융거래 정보를 상속인이 한 번에 조회합니다. 안심상속 원스톱 서비스와 연동됩니다.",
              eligibility: "상속인",
              applyWhen: "사망 후 1년 이내 (정부24 원스톱과 함께)",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "신용정보 조회",
              blurb: "신용평점·연체정보 무료 조회",
              details:
                "본인의 신용평점, 신용정보, 신용카드 발급 내역, 대출 내역, 연체 정보를 무료로 조회합니다. 연 3회 무료, 추가 조회는 NICE·KCB 등에서 가능합니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "금융상품 한눈에 비교",
              blurb: "정기예금·적금·연금·대출 금리 비교",
              details:
                "전 금융사의 정기예금, 적금, 연금저축, 펀드, 대출 상품을 한 화면에서 금리·조건별로 비교합니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
          ],
        },
        {
          name: "카드포인트 통합조회",
          url: "https://www.cardpoint.or.kr",
          blurb: "전 카드사 포인트 통합 조회·계좌 출금.",
          details:
            "여신금융협회에서 운영합니다. 신한·삼성·KB·현대·롯데·하나·우리·NH·BC 등 모든 카드사 포인트를 한 화면에서 확인하고, 본인 명의 계좌로 1원 단위까지 현금 출금이 가능합니다. 평균 회수 금액은 3~5만원 수준입니다.",
          useCases: [
            "전 카드사 포인트 통합 조회",
            "포인트 즉시 현금화",
            "유효기간 임박 포인트 점검",
            "분기별 정기 점검",
          ],
          pricing: "free",
          tip: "출금 완료까지 5분 이내, 1~3영업일 내 입금됩니다.",
          founded: "2018",
          korean: true,
        },
        {
          name: "내 계좌 한눈에 (어카운트인포)",
          url: "https://www.payinfo.or.kr",
          blurb: "전 은행 계좌 조회 + 비활동 계좌 정리.",
          details:
            "금융결제원에서 운영합니다. 본인 명의의 모든 은행, 증권, 저축은행, 우체국 계좌를 한 번에 조회하고, 1년 이상 거래 없는 비활동 계좌의 잔액을 본인 주거래 계좌로 일괄 이체·해지할 수 있습니다.",
          useCases: [
            "잊고 있던 계좌 잔액 회수",
            "비활동 계좌 일괄 해지",
            "본인 명의 도용 의심 시 전수 점검",
            "사망자 가족 대리 조회",
          ],
          pricing: "free",
          founded: "2016",
          korean: true,
        },
      ],
    },
    {
      title: "🧾 세금 환급 / 절세",
      items: [
        {
          name: "홈택스",
          url: "https://www.hometax.go.kr",
          blurb: "국세청 공식. 종합소득세·연말정산·환급금.",
          details:
            "국세청에서 운영하는 세금 행정의 출발점입니다. 5월 종합소득세 신고, 1월 연말정산 간소화 자료 발급, 부가가치세 신고, 경정청구(과거 5년 세금 재계산), 환급금 조회까지 모두 처리됩니다.",
          useCases: [
            "5월 종합소득세 신고",
            "연말정산 간소화 자료 발급",
            "과거 5년 경정청구",
            "사업자 부가가치세",
          ],
          pricing: "free",
          tip: "5월 종합소득세 기간에 '환급금 조회' 메뉴를 먼저 확인하면 과거 미수령 환급금이 표시됩니다.",
          founded: "2002",
          korean: true,
          hubSlug: "hometax",
          subItems: [
            {
              name: "환급금 조회·신청",
              blurb: "미수령 환급금 자동 표시",
              details:
                "본인 또는 사업자의 미수령 국세 환급금이 자동 표시됩니다. 발생 5년 이내라면 청구할 수 있고, 본인 계좌로 직접 환급됩니다.",
              eligibility: "전 국민·사업자",
              applyWhen: "수시 (5년 이내)",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "5월 종합소득세 신고",
              blurb: "프리랜서·사업자·다중 소득 통합 신고",
              details:
                "전년도 모든 소득을 합산해 종합소득세를 신고합니다. 프리랜서, 사업자, 임대소득자, 다중 소득자가 대상입니다. 신고 후 환급 또는 추가 납부가 결정됩니다.",
              applyWhen: "매년 5월 1~31일",
              eligibility: "종합소득이 있는 개인",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "1월 연말정산 간소화",
              blurb: "소득·세액공제 증빙 자료 자동 수집",
              details:
                "의료비, 교육비, 신용카드, 기부금 등 연말정산 자료가 자동 수집되어 회사에 제출할 수 있는 PDF·xml 로 출력됩니다.",
              applyWhen: "매년 1월 15일~",
              eligibility: "근로소득자",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "경정청구 (과거 5년)",
              blurb: "누락된 공제 재신청 + 환급",
              details:
                "과거 5년 이내의 연말정산·종합소득세에서 누락된 의료비·기부금·월세·교육비 공제 등을 재신청해 환급받을 수 있습니다.",
              amount: "공제 항목별 상이",
              eligibility: "과거 5년 내 신고자",
              applyWhen: "수시 (5년 이내)",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "근로장려금·자녀장려금 신청",
              blurb: "최대 330만원 + 자녀 1명당 100만원",
              details:
                "근로장려금 최대 330만원, 자녀장려금 자녀 1명당 100만원이 지급됩니다. 단독·홑벌이·맞벌이 소득 기준이 다릅니다.",
              amount: "근로 최대 330만원 + 자녀 1명당 100만원",
              eligibility: "소득·재산 기준 충족자",
              applyWhen: "5월 정기 + 9월 반기",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "양도소득세 신고",
              blurb: "부동산·주식 양도 시",
              details:
                "부동산, 주식, 파생상품 양도 시 양도소득세를 신고합니다. 1세대 1주택 비과세, 장기보유특별공제 등 절세 요건을 함께 확인합니다.",
              applyWhen: "양도일이 속한 달의 말일부터 2개월 이내",
              eligibility: "양도자",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "부가가치세 신고",
              blurb: "사업자 1·7월 신고",
              details:
                "일반과세자는 1월·7월, 간이과세자는 1월에 부가가치세를 신고합니다. 매입세액 공제와 환급도 함께 처리됩니다.",
              applyWhen: "일반 1·7월 / 간이 1월",
              eligibility: "사업자",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "사업자등록 신청·정정",
              blurb: "온라인 사업자 등록",
              details:
                "개인사업자 등록을 온라인으로 신청합니다. 일반과세·간이과세·면세사업자 선택과 업종 코드 입력이 필요합니다.",
              amount: "무료",
              eligibility: "사업 개시자",
              applyWhen: "사업 시작 20일 이내",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "현금영수증 조회·등록",
              blurb: "본인·가족 현금 사용 내역",
              details:
                "현금영수증 사용 내역을 조회하고 휴대폰 번호·카드를 등록해 자동 발급되도록 설정합니다. 연말정산 소득공제 자료로 사용됩니다.",
              amount: "무료",
              eligibility: "전 국민",
              applyWhen: "24시간",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "전자세금계산서 발급",
              blurb: "사업자 간 세금계산서",
              details:
                "사업자가 발행하는 전자세금계산서를 발급·수취·관리합니다. 발급액 일정 규모 이상 사업자는 전자세금계산서 발급이 의무입니다.",
              eligibility: "사업자",
              applyWhen: "수시",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "세금 모의계산",
              blurb: "양도·증여·상속세 미리 계산",
              details:
                "양도소득세, 증여세, 상속세, 종합부동산세 등을 시뮬레이션할 수 있습니다. 매매·증여 의사결정 전 절세 시뮬레이션 도구입니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "납세증명서 발급",
              blurb: "체납·납부 여부 확인 증명",
              details:
                "정부 입찰, 부동산 매매, 대출 등에 필요한 국세 납세증명서를 발급합니다. 지방세는 위택스에서 별도 발급합니다.",
              amount: "무료",
              eligibility: "전 국민·사업자",
              applyWhen: "24시간",
              url: "https://www.hometax.go.kr",
            },
          ],
        },
        {
          name: "위택스",
          url: "https://www.wetax.go.kr",
          blurb: "지방세(자동차·재산·주민세) 납부·환급.",
          details:
            "행정안전부에서 운영합니다. 국세가 홈택스라면 지방세는 위택스에서 처리됩니다. 자동차세 연납 신청(1월, 최대 9.15% 할인), 주민세, 재산세, 지방소득세 납부가 포함되며 환급금 조회는 홈택스와 별도로 진행됩니다.",
          useCases: [
            "자동차세 연납 (1월, 최대 9.15% 할인)",
            "지방세 납부·환급",
            "지방세 미납·체납 확인",
            "전국 지자체 통합",
          ],
          pricing: "free",
          founded: "2005",
          korean: true,
        },
        {
          name: "근로장려금·자녀장려금",
          url: "https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2308&cntntsId=7741",
          blurb: "연 최대 330만원 + 자녀 1명당 100만원.",
          details:
            "국세청 공식 안내 페이지입니다. 근로장려금은 연 최대 330만원, 자녀장려금은 자녀 1명당 100만원입니다. 5월 정기 신청과 9월 반기 신청이 가능하며 자격 자동 진단 도구가 함께 제공됩니다. 단독·홑벌이·맞벌이의 소득 기준이 다릅니다.",
          useCases: [
            "5월 정기 신청",
            "9월 반기 신청",
            "자격 자동 진단",
            "최대 430만원(근로+자녀)",
          ],
          pricing: "free",
          founded: "2009",
          korean: true,
        },
      ],
    },
    {
      title: "👷 고용 / 실업",
      items: [
        {
          name: "고용24 (워크넷)",
          url: "https://www.work24.go.kr",
          blurb: "구직·실업급여·내일배움카드 통합.",
          details:
            "고용노동부 공식 통합 포털입니다. 워크넷, HRD-Net, 실업급여, 청년수당이 한 사이트에 통합되어 있습니다. 실업급여(구직급여) 신청, 국민내일배움카드(연 500만원 직업훈련비), 청년구직활동지원금이 포함되며 2024년 전면 개편으로 사용성이 개선되었습니다.",
          useCases: [
            "실업급여 신청·수급",
            "국민내일배움카드 (연 500만원)",
            "청년구직활동지원금",
            "구인구직 매칭",
          ],
          pricing: "free",
          founded: "1998",
          korean: true,
          hubSlug: "work24",
          subItems: [
            {
              name: "실업급여 (구직급여)",
              blurb: "퇴직 후 월 평균임금 60%",
              details:
                "비자발적 퇴직자가 적극적인 재취업 활동을 하는 동안 평균임금의 60% 를 지급합니다. 고용보험 가입 기간과 연령에 따라 지급 기간이 달라집니다.",
              amount: "평균임금의 60%, 일 최대 약 6.6만원",
              eligibility: "비자발적 퇴직 + 고용보험 180일 이상",
              applyWhen: "퇴직 후 12개월 이내",
              url: "https://www.work24.go.kr",
            },
            {
              name: "국민내일배움카드",
              blurb: "연 500만원 직업훈련비",
              details:
                "재직자·구직자 모두에게 연 500만원 한도의 직업훈련비를 지원합니다. HRD-Net 의 인증 훈련과정에서 자율적으로 선택해 수강 가능합니다.",
              amount: "5년간 최대 500만원",
              eligibility: "만 75세 이하 (공무원·일부 제외)",
              applyWhen: "수시",
              url: "https://www.work24.go.kr",
            },
            {
              name: "국민취업지원제도",
              blurb: "월 50만원 × 6개월 구직촉진수당",
              details:
                "저소득 구직자에게 월 50만원 × 6개월의 구직촉진수당과 취업활동 지원을 제공합니다. I 유형(중위소득 60% 이하), II 유형(특정계층) 으로 구분됩니다.",
              amount: "월 50만원 × 6개월 (총 300만원)",
              eligibility: "중위소득 60% 이하 등",
              applyWhen: "수시",
              url: "https://www.work24.go.kr",
            },
            {
              name: "청년도전지원사업",
              blurb: "구직 단념 청년 단계별 지원",
              details:
                "구직 단념 또는 NEET 청년에게 단계별(맞춤형·집중) 프로그램과 수당을 제공합니다. 자기탐색, 진로설정, 취업 연계가 포함됩니다.",
              amount: "프로그램별 수당 + 이수 시 인센티브",
              eligibility: "만 18~34세 구직 단념 청년",
              applyWhen: "수시",
              url: "https://www.work24.go.kr",
            },
            {
              name: "출산전후휴가급여",
              blurb: "90일 유급 (다태아 120일)",
              details:
                "출산 전후 휴가 기간에 통상임금을 지급합니다. 우선지원대상기업은 90일 전액을 고용보험에서 지원하고, 대규모 기업은 첫 60일은 회사, 나머지를 고용보험이 부담합니다.",
              amount: "통상임금 (상한 일 23만원 안팎)",
              eligibility: "고용보험 가입 + 출산 여성 근로자",
              applyWhen: "휴가 종료일로부터 12개월 이내",
              url: "https://www.work24.go.kr",
            },
            {
              name: "육아휴직급여",
              blurb: "최대 1년 6개월, 통상임금의 80%",
              details:
                "만 12세 이하 또는 초등 6학년 이하 자녀의 육아를 위해 휴직하는 근로자에게 통상임금의 80% (상한 월 250만원) 를 지급합니다. 부모 모두 사용 시 6+6 부모육아휴직제로 가산이 적용됩니다.",
              amount: "월 최대 250만원 (2026 기준)",
              eligibility: "고용보험 6개월 이상 + 자녀 요건",
              applyWhen: "휴직 30일 이상 사용 후",
              url: "https://www.work24.go.kr",
            },
            {
              name: "워크넷 구인구직",
              blurb: "고용부 공식 매칭 + 인공지능 추천",
              details:
                "전국 구인·구직 정보가 한곳에 통합되어 있습니다. 본인 이력 기반 AI 매칭, 청년·중장년·여성·외국인 맞춤 정보가 제공됩니다.",
              eligibility: "전 국민",
              applyWhen: "24시간",
              url: "https://www.work24.go.kr",
            },
            {
              name: "직업훈련 검색 (HRD-Net)",
              blurb: "내일배움카드로 신청 가능한 훈련 검색",
              details:
                "정부 인증 직업훈련과정 수만 건을 지역·분야·기간별로 검색합니다. 내일배움카드 사용 가능한 과정과 자비 부담 과정이 함께 표시됩니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://www.work24.go.kr",
            },
            {
              name: "산재보험 신청·조회",
              blurb: "업무상 재해·질병 보상",
              details:
                "업무상 부상·질병·사망·장애 시 요양급여, 휴업급여, 장해급여, 유족급여 등을 신청합니다. 근로복지공단 연계로 자동 처리됩니다.",
              eligibility: "산재 근로자·유족",
              applyWhen: "재해 발생 즉시",
              url: "https://www.work24.go.kr",
            },
            {
              name: "일자리도약장려금 (기업)",
              blurb: "청년 정규직 채용 시 월 60만원",
              details:
                "취업 취약 청년을 정규직으로 채용한 중소·중견기업에 인건비를 지원합니다. 청년 1인당 월 60만원, 최대 2년 지급됩니다.",
              amount: "월 60만원 × 24개월 (기업 지원)",
              eligibility: "중소·중견기업",
              applyWhen: "수시",
              url: "https://www.work24.go.kr",
            },
            {
              name: "중장년 일자리지원",
              blurb: "40세 이상 재취업 지원",
              details:
                "만 40세 이상 중장년의 재취업·전직을 지원합니다. 중장년 전직지원서비스, 채용박람회, 재취업 패키지가 포함됩니다.",
              eligibility: "만 40세 이상",
              applyWhen: "수시",
              url: "https://www.work24.go.kr",
            },
            {
              name: "고용보험 가입이력 조회",
              blurb: "전 직장 고용보험 가입 확인",
              details:
                "본인의 고용보험 가입 이력, 피보험 기간, 평균임금을 조회합니다. 실업급여 신청 자격 확인에 필수입니다.",
              eligibility: "근로자",
              applyWhen: "24시간",
              url: "https://www.work24.go.kr",
            },
          ],
        },
        {
          name: "국민취업지원제도",
          url: "https://www.work24.go.kr/cm/main.do",
          blurb: "월 50만원 × 6개월 구직촉진수당.",
          details:
            "고용24 안에서 신청합니다. 저소득 구직자에게 월 50만원 × 6개월의 구직촉진수당과 취업활동 지원을 제공합니다. I 유형(중위소득 60% 이하)과 II 유형(특정계층)으로 구분되며, 고용센터 방문과 온라인 신청을 병행합니다.",
          useCases: [
            "장기 구직자 월 50만원 × 6개월",
            "청년·중장년 구직 지원",
            "취업활동계획 컨설팅",
            "실업급여 종료 후 추가 지원",
          ],
          pricing: "free",
          founded: "2021",
          korean: true,
        },
        {
          name: "4대보험 정보연계센터",
          url: "https://www.4insure.or.kr",
          blurb: "국민연금·건강·고용·산재 통합 조회.",
          details:
            "국민연금공단에서 운영합니다. 본인의 국민연금, 건강보험, 고용보험, 산재보험 가입 이력과 납부액이 한 번에 조회됩니다. 퇴사·이직 시 4대보험 자격 변동 확인에 필수적인 사이트입니다.",
          useCases: [
            "전 직장 4대보험 가입 이력",
            "퇴사 후 자격 상실 확인",
            "국민연금 예상 수령액",
            "건강보험 피부양자 자격",
          ],
          pricing: "free",
          founded: "2007",
          korean: true,
        },
      ],
    },
    {
      title: "🎓 교육 / 직업훈련 / 자격증",
      items: [
        {
          name: "한국장학재단",
          url: "https://www.kosaf.go.kr",
          blurb: "학자금 대출·국가장학금 통합.",
          details:
            "교육부 산하 공공기관으로 국가장학금(소득 구간별 차등), 학자금 대출(취업 후 상환·일반 상환), 근로장학금, 우수장학금 등 대학생 자금 지원이 통합되어 있습니다. 신청은 보통 4월·8월 정기와 수시로 진행됩니다.",
          useCases: [
            "국가장학금 신청",
            "취업 후 상환 학자금 대출",
            "근로장학금 (교내·교외)",
            "우수장학금",
          ],
          pricing: "free",
          founded: "2009",
          korean: true,
        },
        {
          name: "큐넷 (한국산업인력공단)",
          url: "https://www.q-net.or.kr",
          blurb: "국가기술자격·국가전문자격 통합.",
          details:
            "한국산업인력공단 공식 사이트입니다. 정보처리기사, 사회복지사, 공인중개사 등 국가기술자격과 국가전문자격의 시험 일정·접수·합격 확인이 한 곳에서 이뤄집니다. 청년 자격증 응시료 지원도 함께 안내됩니다.",
          useCases: [
            "국가기술자격 접수·합격",
            "국가전문자격 응시",
            "시험 일정 확인",
            "응시료 지원 안내",
          ],
          pricing: "free",
          founded: "2002",
          korean: true,
        },
        {
          name: "평생교육 바우처",
          url: "https://www.lll.or.kr",
          blurb: "저소득층 평생교육비 연 35만원.",
          details:
            "국가평생교육진흥원에서 운영합니다. 저소득층 성인에게 평생교육비 연 35만원(2026년 기준) 바우처를 지원합니다. 직업훈련, 외국어, 자격증 강좌 등에 사용할 수 있으며 매년 신청 기간이 있습니다.",
          useCases: [
            "저소득층 평생교육비",
            "외국어·자격증 강좌",
            "성인 직업훈련",
            "온라인 강의 결제",
          ],
          pricing: "free",
          pricingNote: "연 35만원 (2026년 기준)",
          founded: "2018",
          korean: true,
        },
      ],
    },
    {
      title: "🍼 출산 / 보육",
      items: [
        {
          name: "임신육아종합포털 아이사랑",
          url: "https://www.childcare.go.kr",
          blurb: "출산·육아·어린이집 통합 포털.",
          details:
            "보건복지부에서 운영하는 통합 포털입니다. 출산, 육아, 어린이집, 아이돌봄서비스, 양육수당, 아동수당이 한 곳에서 처리됩니다. 어린이집 입소 대기 신청, 아이돌봄 신청, 보육료·양육수당 신청이 포함됩니다.",
          useCases: [
            "어린이집 입소 대기 신청",
            "아이돌봄서비스 신청",
            "보육료·양육수당",
            "출산지원금 확인",
          ],
          pricing: "free",
          founded: "2010",
          korean: true,
        },
        {
          name: "아이행복카드 (국민행복카드)",
          url: "https://www.voucher.go.kr",
          blurb: "임신·출산 진료비 바우처 100만원.",
          details:
            "사회서비스 전자바우처 포털입니다. 임신 1회당 100만원(다태아 140만원) 진료비 바우처와 첫만남이용권 200만원(2026년 기준) 이 제공됩니다. 7개 카드사에서 발급 가능하며 산부인과·병원에서 결제할 수 있습니다.",
          useCases: [
            "임신·출산 진료비",
            "첫만남이용권 200만원",
            "에너지바우처",
            "아이돌봄 정부지원금 결제",
          ],
          pricing: "free",
          founded: "2015",
          korean: true,
        },
        {
          name: "아이돌봄서비스",
          url: "https://idolbom.go.kr",
          blurb: "정부 인증 돌보미 시간제 파견.",
          details:
            "여성가족부에서 운영합니다. 만 12세 이하 자녀를 둔 가정에 정부 인증 돌보미를 시간 단위로 파견합니다. 소득 구간별로 정부지원금이 차등 적용되어 본인 부담은 시간당 1,500~12,180원 수준(2026년 기준) 입니다.",
          useCases: [
            "맞벌이 시간제 돌봄",
            "긴급 돌봄 (병원·출장)",
            "방과 후 등하원",
            "영아 종일제 돌봄",
          ],
          pricing: "free",
          pricingNote: "본인부담 시간당 1,500~12,180원 (소득 구간별)",
          founded: "2007",
          korean: true,
        },
      ],
    },
    {
      title: "🏠 주거 / 청약 / 주택대출",
      items: [
        {
          name: "마이홈 포털",
          url: "https://www.myhome.go.kr",
          blurb: "공공주택·전세임대 통합 안내.",
          details:
            "국토교통부에서 운영합니다. 공공임대, 행복주택, 매입임대, 전세임대 등 LH·SH 의 모든 공공주택 정보가 한 곳에 모여 있습니다. 본인의 소득·자산·가구원 정보를 입력하면 자격에 맞는 주택이 자동 매칭됩니다.",
          useCases: [
            "공공임대 자격 확인",
            "행복주택 입주 신청",
            "전세임대 한도 조회",
            "청년 1인가구 공공주택",
          ],
          pricing: "free",
          alternatives: ["LH 청약플러스", "SH 서울주택"],
          founded: "2013",
          korean: true,
        },
        {
          name: "LH 청약플러스",
          url: "https://apply.lh.or.kr",
          blurb: "LH 공공임대·분양 청약 통합.",
          details:
            "한국토지주택공사 공식 청약 포털입니다. 전국 공공임대, 분양, 신혼희망타운, 청년주택의 청약이 통합되어 있으며 청약 일정, 자격, 당첨 결과 확인이 가능합니다.",
          useCases: [
            "공공임대·분양 청약",
            "청년주택 신청",
            "신혼희망타운 청약",
            "당첨 결과 조회",
          ],
          pricing: "free",
          founded: "2009",
          korean: true,
        },
        {
          name: "SH 서울주택공사",
          url: "https://www.i-sh.co.kr",
          blurb: "서울 공공주택·청년주택 청약.",
          details:
            "서울주택도시공사 공식 사이트입니다. 서울 지역 한정으로 공공임대, 행복주택, 청년안심주택, 신혼부부 매입임대 등 청약이 별도로 진행됩니다. LH 와 청약 자격·일정이 다르므로 양쪽을 함께 확인하는 방식이 유리합니다.",
          useCases: [
            "서울 공공임대 청약",
            "청년안심주택",
            "신혼부부 매입임대",
            "장기전세주택",
          ],
          pricing: "free",
          alternatives: ["LH 청약플러스"],
          founded: "1989",
          korean: true,
        },
        {
          name: "주택도시기금 (디딤돌·버팀목)",
          url: "https://nhuf.molit.go.kr",
          blurb: "디딤돌·버팀목 등 정책 주택대출.",
          details:
            "국토교통부 주택도시기금 공식 포털입니다. 디딤돌 대출(주택 구입), 버팀목 전세대출, 청년·신혼부부 전용 대출 등 정책 주택자금 대출 정보가 통합되어 있습니다. 시중 은행 대비 금리가 낮습니다.",
          useCases: [
            "디딤돌 대출 (주택 구입)",
            "버팀목 전세대출",
            "청년·신혼부부 전세자금",
            "보금자리 대안",
          ],
          pricing: "free",
          alternatives: ["한국주택금융공사"],
          founded: "1981",
          korean: true,
        },
        {
          name: "한국주택금융공사 (HF)",
          url: "https://www.hf.go.kr",
          blurb: "보금자리론·전세금반환보증.",
          details:
            "한국주택금융공사 공식 사이트입니다. 보금자리론(주택 구입 대출), 적격대출, 전세금 반환보증, 주택연금까지 다양한 주거 금융 상품을 안내합니다. 디딤돌·버팀목이 정책 대출이라면 HF 보금자리론은 시중 대비 안정적 고정금리가 강점입니다.",
          useCases: [
            "보금자리론 (고정금리 주택대출)",
            "전세금 반환보증",
            "주택연금 (역모기지)",
            "적격대출",
          ],
          pricing: "free",
          alternatives: ["주택도시기금"],
          founded: "2004",
          korean: true,
        },
      ],
    },
    {
      title: "🏪 소상공인 / 창업 / 서민금융",
      items: [
        {
          name: "소상공인 마당",
          url: "https://www.sbiz.or.kr",
          blurb: "소상공인 정책자금·교육·컨설팅.",
          details:
            "소상공인시장진흥공단에서 운영합니다. 정책자금 대출, 폐업 지원, 재기 지원, 교육·컨설팅이 한 곳에 통합되어 있습니다.",
          useCases: [
            "소상공인 정책자금 대출",
            "폐업·재기 지원",
            "경영 컨설팅 무료",
            "온라인 교육 무료",
          ],
          pricing: "free",
          founded: "2014",
          korean: true,
        },
        {
          name: "K-Startup (창업진흥원)",
          url: "https://www.k-startup.go.kr",
          blurb: "정부 창업 지원 통합 포털.",
          details:
            "중소벤처기업부 산하 창업진흥원에서 운영합니다. 예비창업패키지, 초기창업패키지, 청년창업사관학교, TIPS 등 정부 창업 지원 사업의 공고·신청·결과 발표가 통합되어 있습니다. 매년 수천억 원 규모의 지원금이 집행됩니다.",
          useCases: [
            "예비·초기창업패키지 신청",
            "청년창업사관학교",
            "TIPS·딥테크 팁스",
            "정부 지원금 공고",
          ],
          pricing: "free",
          founded: "2010",
          korean: true,
          hubSlug: "k-startup",
          subItems: [
            {
              name: "예비창업패키지",
              blurb: "예비창업자 최대 1억원",
              details:
                "사업자 등록 전의 예비창업자를 대상으로 사업화 자금과 멘토링을 제공합니다. 일반·청년·여성 등 분야별 트랙으로 운영됩니다.",
              amount: "최대 1억원 사업화 자금",
              eligibility: "사업자 미등록 예비창업자",
              applyWhen: "매년 2~3월 공고",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "초기창업패키지",
              blurb: "창업 3년 이내, 최대 1억원",
              details:
                "사업자 등록 3년 이내 초기창업자에게 사업화 자금, 멘토링, 시제품 제작 비용을 지원합니다. 전국 주관기관에서 운영합니다.",
              amount: "최대 1억원",
              eligibility: "창업 3년 이내",
              applyWhen: "매년 2~3월 공고",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "창업도약패키지",
              blurb: "창업 3~7년, 최대 3억원",
              details:
                "창업 3~7년 이내 도약기 기업을 대상으로 사업화 자금과 스케일업을 지원합니다. 사업화·마케팅·R&D 자금이 통합 지원됩니다.",
              amount: "최대 3억원",
              eligibility: "창업 3~7년",
              applyWhen: "매년 공고",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "청년창업사관학교",
              blurb: "만 39세 이하, 최대 1억원 + 입주",
              details:
                "만 39세 이하 청년 창업자에게 사업화 자금과 입주공간, 전담 멘토링을 1년간 제공합니다. 중기부 직속 사업으로 인지도 높음.",
              amount: "최대 1억원 + 입주공간",
              eligibility: "만 39세 이하, 창업 3년 이내",
              applyWhen: "매년 1~2월 공고",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "TIPS (팁스)",
              blurb: "기술창업 R&D 최대 5억원",
              details:
                "민간 운영사가 발굴·투자한 기술창업기업에 정부가 R&D 자금을 매칭 지원합니다. 시드 1억 + R&D 최대 5억 + 사업화 자금이 패키지로 제공됩니다.",
              amount: "민간 1억 + R&D 5억 + 사업화",
              eligibility: "민간 운영사 추천 기술창업기업",
              applyWhen: "수시 (운영사 발굴)",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "딥테크 팁스",
              blurb: "딥테크 분야 최대 15억원",
              details:
                "AI, 바이오, 반도체, 양자, 우주 등 딥테크 분야 기업에 대규모 R&D 자금을 지원합니다. TIPS 상위 트랙입니다.",
              amount: "최대 15억원",
              eligibility: "딥테크 분야 기술창업기업",
              applyWhen: "수시 (운영사 발굴)",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "재도전 성공패키지",
              blurb: "재창업자 최대 1억원",
              details:
                "사업 실패 경험이 있는 재창업자를 대상으로 사업화 자금과 멘토링을 제공합니다. 채무 조정과 연계된 트랙도 운영됩니다.",
              amount: "최대 1억원",
              eligibility: "재창업자",
              applyWhen: "매년 공고",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "글로벌 진출 지원",
              blurb: "해외 진출 IR·법인 설립",
              details:
                "스타트업의 해외 진출을 위해 글로벌 IR, 현지 법인 설립, 해외 액셀러레이팅 프로그램 등을 지원합니다.",
              eligibility: "해외 진출 의향 스타트업",
              applyWhen: "매년 공고",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "사회적기업가 육성사업",
              blurb: "사회적기업 창업 최대 5천만원",
              details:
                "사회 문제 해결형 창업을 지원합니다. 사업화 자금, 멘토링, 후속 연계까지 1년간 제공됩니다.",
              amount: "최대 5천만원",
              eligibility: "사회적 가치 창업 팀",
              applyWhen: "매년 공고",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "정부지원 사업 공고 통합",
              blurb: "전 부처 창업 사업 일정",
              details:
                "중기부, 과기정통부, 산업부, 문체부 등 전 부처의 창업 지원 사업 공고와 신청 일정을 한 화면에서 확인합니다.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://www.k-startup.go.kr",
            },
          ],
        },
        {
          name: "서민금융진흥원 (KINFA)",
          url: "https://www.kinfa.or.kr",
          blurb: "햇살론·미소금융 등 서민 정책금융.",
          details:
            "서민금융진흥원 공식 사이트입니다. 햇살론15, 햇살론17, 햇살론뱅크, 미소금융, 근로자햇살론 등 저소득·저신용 서민 대상 정책금융 상품 안내와 신청이 통합되어 있습니다. 자격에 따라 시중 대비 매우 낮은 금리가 적용됩니다.",
          useCases: [
            "햇살론 (저신용 서민 대출)",
            "미소금융 (창업·운영자금)",
            "근로자햇살론",
            "정책서민금융 자격 진단",
          ],
          pricing: "free",
          founded: "2016",
          korean: true,
        },
      ],
    },
    {
      title: "🏥 건강 / 의료",
      items: [
        {
          name: "국민건강보험공단",
          url: "https://www.nhis.or.kr",
          blurb: "건강검진·보험료·환급금 통합.",
          details:
            "국민건강보험공단 공식 사이트입니다. 본인의 건강보험료 조회, 무료 건강검진(일반·암검진) 대상 확인·예약, 건강보험 환급금(본인부담상한제 초과 환급), 피부양자 등록까지 한 곳에서 처리됩니다.",
          useCases: [
            "무료 건강검진 대상·예약",
            "본인부담상한제 환급금",
            "건강보험료 조회·정정",
            "피부양자 등록",
          ],
          pricing: "free",
          tip: "본인부담상한제 초과 환급금은 매년 8월경 자동 안내되며 미신청 시 5년 내 청구 가능합니다.",
          founded: "2000",
          korean: true,
          hubSlug: "nhis",
          subItems: [
            {
              name: "무료 건강검진 대상 조회",
              blurb: "일반검진 2년 1회 + 암검진",
              details:
                "본인의 건강검진 대상 여부와 받을 수 있는 검진 항목(일반·암·구강·영유아·생애전환기 등) 을 조회합니다. 검진 기관 예약도 함께 가능합니다.",
              amount: "본인 부담금 0원 또는 10%",
              eligibility: "국민건강보험 가입자",
              applyWhen: "연중 (출생연도 끝자리에 따라)",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "본인부담상한제 환급금",
              blurb: "초과 의료비 자동 환급",
              details:
                "1년간 본인부담 의료비가 소득 구간별 상한액을 초과하면 차액이 본인 계좌로 환급됩니다. 매년 8월경 자동 안내됩니다.",
              eligibility: "건강보험 가입자",
              applyWhen: "초과 발생 시 (5년 내 청구)",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "건강보험료 조회·정정",
              blurb: "본인 부담액·정정 신청",
              details:
                "본인이 부담하는 건강보험료를 조회하고 소득·재산 변동에 따른 정정을 신청합니다. 지역가입자는 소득 감소 시 보험료 인하 신청이 가능합니다.",
              eligibility: "건강보험 가입자",
              applyWhen: "수시",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "피부양자 등록·확인",
              blurb: "가족 피부양자 자격 등록",
              details:
                "직장가입자의 가족(배우자·직계존비속·형제자매 일부) 을 피부양자로 등록합니다. 소득·재산 기준이 적용되며 자격 변동 시 자동 박탈됩니다.",
              eligibility: "직장가입자의 가족",
              applyWhen: "자격 발생 시",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "임신·출산 진료비 지원",
              blurb: "100만원 바우처 (다태아 140만원)",
              details:
                "임신·출산 진료비로 사용할 수 있는 국민행복카드 바우처를 지급합니다. 분만 후 2년까지 산모·아동의 진료에 사용할 수 있습니다.",
              amount: "100만원 (다태아 140만원)",
              eligibility: "임신 확인 가입자",
              applyWhen: "임신 확인 후 ~ 분만 후 2년",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "산정특례 (희귀·중증질환)",
              blurb: "본인부담 5% (외래·입원)",
              details:
                "암, 희귀질환, 중증난치질환, 중증치매 환자에게 본인부담률을 5% (외래·입원 동일) 로 경감합니다. 등록 후 5년간 적용됩니다.",
              amount: "본인부담 5% (일반 20~30%)",
              eligibility: "암·희귀·중증난치·중증치매",
              applyWhen: "진단 후 30일 이내",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "건강보험 자격득실확인서",
              blurb: "취업·이직·대출에 필요한 증명",
              details:
                "본인의 건강보험 자격 취득·상실 이력을 증명하는 서류를 발급합니다. 취업, 이직, 대출, 비자 발급 등에 사용됩니다.",
              amount: "무료",
              eligibility: "전 국민",
              applyWhen: "24시간",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "보험료 환급 신청",
              blurb: "소득 변동·중복 납부 환급",
              details:
                "소득·재산 변동에 따른 보험료 정정 결과 발생한 과오납금을 환급받습니다. 본인 계좌로 직접 입금됩니다.",
              eligibility: "건강보험 가입자",
              applyWhen: "수시",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "건강iN (마이헬스뱅크)",
              blurb: "건강검진 결과·진료 이력",
              details:
                "본인의 건강검진 결과, 처방·진료 이력, 예방접종 이력 등을 한 곳에서 조회합니다. PDF 다운로드와 가족 공유도 가능합니다.",
              eligibility: "건강보험 가입자",
              applyWhen: "24시간",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "외국인 건강보험",
              blurb: "장기체류 외국인 가입·납부",
              details:
                "6개월 이상 국내 체류 외국인을 대상으로 건강보험 가입과 보험료 납부를 안내합니다. 자격 취득과 보험료 조회가 가능합니다.",
              eligibility: "외국인 장기체류자",
              applyWhen: "체류 6개월 도래 시",
              url: "https://www.nhis.or.kr",
            },
          ],
        },
        {
          name: "노인장기요양보험",
          url: "https://www.longtermcare.or.kr",
          blurb: "장기요양등급·재가급여 통합.",
          details:
            "국민건강보험공단의 장기요양보험 운영 사이트입니다. 65세 이상 노인 또는 노인성 질환자의 장기요양등급 신청, 방문요양·방문목욕·주야간보호 등 재가급여 신청, 요양시설 검색이 가능합니다.",
          useCases: [
            "장기요양등급 신청",
            "방문요양·방문목욕",
            "주야간보호 시설 검색",
            "치매가족 지원",
          ],
          pricing: "free",
          founded: "2008",
          korean: true,
        },
      ],
    },
    {
      title: "⚡ 에너지 / 생활비",
      items: [
        {
          name: "에너지바우처",
          url: "https://www.energyv.or.kr",
          blurb: "저소득층 냉난방비 바우처.",
          details:
            "한국에너지공단에서 운영합니다. 기초생활수급자 등 저소득층에게 냉방·난방 에너지 비용 바우처를 지급합니다. 신청은 동 주민센터 또는 복지로에서 가능하며 매년 신청 기간이 정해져 있습니다.",
          useCases: [
            "저소득층 난방비",
            "여름 냉방 바우처",
            "에너지 취약계층 지원",
            "기초생활수급자 추가 지원",
          ],
          pricing: "free",
          founded: "2015",
          korean: true,
        },
        {
          name: "한국에너지공단 효율가전 환급",
          url: "https://eep.energy.or.kr",
          blurb: "에너지효율 1등급 가전 구매 환급.",
          details:
            "한국에너지공단의 으뜸효율 가전제품 구매비용 환급 사업입니다. 에너지효율 1등급 또는 으뜸효율 가전(냉장고, 에어컨, 세탁기, TV 등) 구매 시 구매가의 10%(최대 30만원) 를 환급받을 수 있습니다. 다자녀·출산·고효율 가구 등 자격이 있습니다.",
          useCases: [
            "1등급 가전 구매 환급",
            "다자녀·출산 가구 혜택",
            "최대 30만원 환급",
            "에너지 절약 지원",
          ],
          pricing: "free",
          pricingNote: "구매가의 10% 환급, 최대 30만원",
          founded: "2016",
          korean: true,
        },
      ],
    },
  ],
  faq: [
    {
      q: "정부지원금·환급금은 어디부터 시작해야 하나요?",
      a: "정부24 보조금24, 카드포인트 통합조회, 내 계좌 한눈에, 내보험 찾아줌, 휴면예금 찾아줌 다섯 곳을 순서대로 30분 이내에 점검하는 방법이 일반적입니다. 모두 본인 인증만으로 즉시 결과를 확인할 수 있으며 평균 회수 금액은 10만원 이상입니다.",
    },
    {
      q: "보이스피싱·사칭 사이트는 어떻게 구분하나요?",
      a: "정부·공공기관은 문자나 전화로 '지금 신청하면 받는다'며 클릭을 유도하지 않습니다. 모든 신청은 사용자가 공식 사이트(.go.kr / .or.kr)에 직접 접속해 본인 인증 후 진행하는 방식입니다. 문자 속 링크는 클릭하지 말고, 검색 시 '광고' 표시가 붙은 결과 대신 공식 도메인을 확인해야 합니다.",
    },
    {
      q: "근로장려금·자녀장려금은 누구나 받을 수 있나요?",
      a: "단독 가구 연소득 2,200만원, 홑벌이 3,200만원, 맞벌이 3,800만원 이하 + 재산 2.4억원 미만(2026년 기준) 조건을 충족해야 합니다. 홈택스 '근로장려금 자동 진단' 메뉴로 자격을 확인할 수 있으며 5월 정기 신청 외 9월 반기 신청도 가능합니다.",
    },
    {
      q: "주택 구입·전세 대출은 어디서 신청하나요?",
      a: "주택 구입의 정책 대출은 주택도시기금(디딤돌 대출, nhuf.molit.go.kr) 또는 한국주택금융공사(보금자리론, hf.go.kr) 에서 신청합니다. 전세는 주택도시기금의 버팀목 전세대출이 대표적이며, 청년·신혼부부 전용 상품이 별도로 운영됩니다. 모두 시중 은행 대비 금리가 낮은 편입니다.",
    },
    {
      q: "건강검진은 무료로 받을 수 있나요?",
      a: "국민건강보험 가입자는 일반건강검진(2년에 1회) 과 암검진(연령·성별별) 을 무료 또는 본인부담 10% 수준으로 받을 수 있습니다. 국민건강보험공단(nhis.or.kr) 에서 대상 여부와 검진 가능 병원을 확인할 수 있으며, 본인부담상한제로 의료비가 일정 금액을 초과하면 환급도 받을 수 있습니다.",
    },
    {
      q: "카드포인트는 실제로 현금 출금이 가능한가요?",
      a: "가능합니다. cardpoint.or.kr 에서 본인 인증 후 모든 카드사 포인트를 한 번에 본인 명의 계좌로 출금할 수 있습니다. 1원 단위까지 가능하고 수수료가 없으며 출금 후 1~3영업일 내 입금됩니다.",
    },
    {
      q: "연말정산을 놓쳤거나 잘못한 경우 다시 환급받을 수 있나요?",
      a: "과거 5년 이내라면 홈택스의 '경정청구' 메뉴로 누락된 소득공제·세액공제를 재신청해 환급받을 수 있습니다. 의료비, 기부금, 월세 세액공제 등이 흔히 누락됩니다. 5년이 지나면 청구가 불가하므로 매년 5월 종합소득세 기간에 함께 점검하는 방법이 효율적입니다.",
    },
    {
      q: "창업 지원금은 어디서 신청하나요?",
      a: "K-Startup(k-startup.go.kr) 이 정부 창업 지원의 통합 포털입니다. 예비창업패키지(최대 1억원), 초기창업패키지, 청년창업사관학교, TIPS 등 사업이 매년 1~3월에 공고됩니다. 소상공인 운영자금은 소상공인시장진흥공단(sbiz.or.kr) 에서 별도로 신청합니다.",
    },
    {
      q: "출산 시 받을 수 있는 돈은 무엇이 있나요?",
      a: "첫만남이용권 200만원(국민행복카드), 임신·출산 진료비 100만원 바우처, 부모급여(2026년 0세 월 100만원·1세 월 50만원), 아동수당(0~7세 월 10만원), 지자체별 출산축하금이 있습니다. 임신육아종합포털 아이사랑(childcare.go.kr) 에서 통합 안내가 제공됩니다.",
    },
  ],
};

// ===========================================================================
// 3. 무료 리소스
// ===========================================================================
const FREE: PickCategory = {
  slug: "free",
  title: "상업용 무료 폰트·이미지·PPT 사이트 모음 28선",
  metaTitle: "상업용 무료 폰트·이미지·PPT 모음 28선 (라이선스 확인)",
  shortTitle: "무료 리소스",
  emoji: "🎁",
  oneLiner: "상업적 이용 허용 무료 리소스 사이트 28곳.",
  description:
    "눈누, 미리캔버스, Unsplash, Pexels, Flaticon, Slidesgo, YouTube 오디오 보관함 등 상업용 무료 폰트·이미지·일러스트·PPT 템플릿·BGM·효과음 사이트 28곳을 카테고리별로 정리한 디렉토리입니다.",
  longIntro: [
    "눈누, 미리캔버스, Unsplash, Pexels, Flaticon, Slidesgo, YouTube 오디오 보관함 등 상업적 이용이 허용된 무료 리소스 사이트를 폰트·이미지·일러스트·아이콘·PPT·BGM·색상 도구로 나눠 정리했습니다.",
    "라이선스가 100% 자유로운 사이트도 있지만, 대부분 저작자 표시(CC-BY) 또는 재배포 금지 같은 조건이 부여됩니다. 다운로드 전 각 사이트의 라이선스 페이지를 확인해야 합니다.",
    "한국 사용자에게 가장 안전한 출발점은 눈누(한글 폰트), 공유마당(저작권위원회 공식), 미리캔버스(한국 디자인 SaaS) 입니다. 모두 한국어 인터페이스와 한글 라이선스 표기를 제공합니다.",
    "Unsplash, Pexels, Pixabay 등 해외 사이트의 사진은 라이선스가 너그러운 편이지만 사진 속 인물 초상권과 브랜드 로고는 별도 권리에 해당합니다. 광고·홍보 자료에 인물 사진을 사용할 때는 모델 릴리스가 확보된 유료 스톡(Getty, Shutterstock)을 사용하는 방법이 안전합니다.",
    "유튜브 영상의 BGM 은 YouTube 스튜디오 오디오 보관함이 가장 안전합니다. 콘텐츠 ID 클레임이 사전에 면제되어 수익 창출 영상에서도 안심하고 사용할 수 있습니다.",
  ],
  selectionCriteria: [
    "상업적 이용이 명시적으로 허용된 사이트",
    "한국어 지원 또는 한국 운영 우선",
    "공식 사이트 직링크",
    "다운로드 전 라이선스 페이지 확인 필요",
  ],
  updatedAt: TODAY,
  relatedKeywords: [
    "상업용 무료 폰트",
    "무료 이미지 사이트",
    "무료 PPT 템플릿",
    "저작권 무료 이미지",
    "한글 폰트 무료",
    "디자인 리소스",
    "유튜브 BGM 무료",
    "효과음 무료",
    "무료 아이콘",
    "무료 일러스트",
  ],
  groups: [
    {
      title: "🔤 한글 폰트",
      items: [
        {
          name: "눈누",
          url: "https://noonnu.cc",
          blurb: "한글 상업용 무료 폰트 디렉토리. 라이선스 표가 명확.",
          details:
            "한글 무료 폰트 큐레이션의 표준 사이트입니다. 1,000+ 무료 폰트를 인쇄·웹·영상·BI/CI·OFL 6개 사용 영역으로 표시해 라이선스를 한눈에 확인할 수 있습니다. 본문용·제목용·손글씨 카테고리별 검색, 미리보기, 다운로드를 한 페이지에서 처리합니다.",
          useCases: [
            "PPT·문서 본문 한글 폰트",
            "유튜브 썸네일 제목",
            "로고·BI 제작 (OFL 폰트)",
            "상업물 라이선스 확인",
          ],
          pricing: "free",
          pricingNote: "100% 무료, 광고 기반",
          tip: "검색 필터에서 '본문용' 을 켜면 가독성 좋은 폰트만 추려집니다.",
          alternatives: ["공유마당 폰트", "폰트프리"],
          founded: "2017",
          korean: true,
          imageUrl: "https://noonnu.cc/noonnu_og.png",
          hubSlug: "noonnu",
          detailContent: {
            longIntro: [
              "눈누(noonnu.cc) 는 한글 무료 상업용 폰트 큐레이션 분야의 사실상 표준 사이트입니다. 2017년 개인 개발자가 운영을 시작한 후 한국 디자이너·블로거·유튜버·소상공인 사이에서 가장 신뢰받는 한글 폰트 디렉토리로 자리잡았습니다.",
              "가장 큰 강점은 라이선스 표시의 명확성입니다. 1,000+ 한글 무료 폰트를 인쇄·웹사이트·영상·BI/CI·임베디드·OFL 6개 사용 영역으로 표 형태로 분류해 한눈에 라이선스를 확인할 수 있습니다. 디자이너가 아닌 일반 사용자도 1분 안에 '내가 쓸 용도가 허용되는가' 판단이 가능해 분쟁 위험을 줄여줍니다.",
              "한국 기업·기관이 배포한 무료 폰트(카카오·네이버·삼성·아모레퍼시픽·서울시 등) 와 개인 폰트 디자이너의 무료 작품, 공유마당의 만료저작물 폰트까지 모두 통합되어 있습니다. 본문용·제목용·손글씨·디스플레이 등 카테고리별 검색·미리보기·즉시 다운로드까지 한 페이지에서 처리됩니다.",
              "100% 무료, 회원가입 없음. 광고 기반 운영이라 광고가 노출되지만 폰트 다운로드에는 제약이 없습니다.",
            ],
            features: [
              { title: "사용 범위 표 (라이선스 한눈에)", body: "인쇄·웹·영상·BI/CI·임베디드·OFL 6개 영역에 사용 허용 여부를 표 형태로 명시." },
              { title: "1,000+ 한글 무료 폰트", body: "기업 배포 폰트 + 개인 폰트 디자이너 작품 + 공유마당 만료저작물 통합." },
              { title: "카테고리별 분류", body: "본문용·제목용·손글씨·디스플레이·픽셀·고풍 등 12+ 카테고리." },
              { title: "실시간 미리보기", body: "검색창에 텍스트 입력 시 1,000+ 폰트가 그 텍스트로 즉시 미리보기됨." },
              { title: "원클릭 다운로드", body: "회원가입 없이 폰트 페이지에서 즉시 zip 다운로드. 라이선스 텍스트 동봉." },
              { title: "검색 필터", body: "사용 범위(BI/CI·상업물·임베디드), 두께(얇음~굵음), 카테고리(본문·제목 등) 다중 필터." },
              { title: "폰트 디자이너 페이지", body: "폰트 디자이너별 작품 모음. 마음에 든 디자이너의 다른 작품 탐색 가능." },
              { title: "스타일 큐레이션", body: "'블로그용', '명함용', '레트로 톤' 등 사용 케이스별 큐레이션 컬렉션." },
            ],
            pricingPlans: [
              {
                name: "100% 무료",
                price: "0원",
                features: [
                  "모든 폰트 무료 다운로드",
                  "회원가입 없음",
                  "사용 범위 표 자세히 표시",
                  "광고 노출 (운영비)",
                  "한 번 다운로드 후 영구 사용",
                ],
                recommended: true,
              },
            ],
            pros: [
              "한글 무료 폰트 디렉토리 분야 1티어 신뢰도",
              "라이선스 표가 명확해 분쟁 위험 낮음",
              "회원가입 없이 즉시 다운로드",
              "기업 배포 폰트 + 개인 디자이너 통합",
              "실시간 미리보기로 비교 빠름",
            ],
            cons: [
              "광고 노출이 다소 많음 (운영 모델 특성)",
              "다운로드 폰트는 본인이 라이선스 다시 확인해야 함 (눈누 표가 항상 100% 정확하지는 않음)",
              "유료 폰트 카테고리는 별도 (눈누는 무료 위주)",
              "OFL 같은 글로벌 라이선스 폰트는 Google Fonts 가 더 풍부",
            ],
            koreanContext:
              "한국 폰트 디자이너·이용자 생태계의 중심 사이트입니다. 카카오·네이버·삼성·아모레퍼시픽·서울시·부산시 같은 한국 기업·지자체가 배포한 폰트가 모두 정리되어 있어 한국식 디자인에 어울리는 한글 폰트를 찾기에 가장 빠릅니다. 폰트 디자이너 본인이 사용 범위를 직접 등록·갱신하는 구조라 정확도가 비교적 높지만, 상업 사용 전에는 폰트 zip 안 LICENSE 파일을 반드시 다시 한 번 확인하는 게 안전합니다.",
            startingGuide: [
              { step: 1, title: "사이트 접속", body: "noonnu.cc 접속. 회원가입 불필요." },
              { step: 2, title: "검색창에 텍스트 입력", body: "사용할 실제 문구 입력 (예: '회사 슬로건', '이벤트 제목'). 1,000+ 폰트가 그 텍스트로 즉시 미리보기." },
              { step: 3, title: "필터 활용", body: "좌측 필터: 사용 범위(BI/CI·상업·임베디드), 두께(Thin~Black), 카테고리(본문·제목·손글씨) 다중 적용." },
              { step: 4, title: "폰트 페이지에서 사용 범위 확인", body: "마음에 드는 폰트 클릭 → '사용 범위' 표 확인. 본인 용도(예: 인쇄·웹) 에 ○ 표시인지 체크." },
              { step: 5, title: "다운로드 + LICENSE 재확인", body: "다운로드 버튼 → zip 압축 해제 후 LICENSE 또는 readme 파일 한 번 더 확인. 본인 용도 명확히 허용되는지 검증." },
            ],
            faq: [
              { q: "회원가입 필요?", a: "필요 없습니다. 사이트 접속 후 검색 → 다운로드 한 번에 가능합니다. 광고 기반 운영이라 다운로드 페이지에 광고가 노출됩니다." },
              { q: "상업적 이용 가능?", a: "폰트마다 다릅니다. 폰트 페이지의 '사용 범위' 표에서 '상업적 이용' 또는 '인쇄·웹·영상' 컬럼이 ○ 인 폰트만 상업 사용 가능. 다운로드 후 zip 안 LICENSE 파일도 함께 확인 권장." },
              { q: "회사 BI·CI 로고에 써도?", a: "사용 범위 표의 'BI/CI' 컬럼이 ○ 인 폰트만 로고 임베드 안전. 가장 안전한 건 SIL Open Font License(OFL) 폰트로 로고·재배포·수정까지 100% 자유. 일부 폰트는 본문·웹은 OK 지만 BI/CI 는 별도 라이선스 구매 필요." },
              { q: "다운로드 폰트 재배포·재판매 가능?", a: "거의 모든 폰트가 재배포·재판매 금지입니다. OFL 라이선스 폰트만 재배포 가능. 다운로드한 폰트를 본인 사이트에 공유·재업로드하는 행위는 라이선스 위반입니다." },
              { q: "Google Fonts 와 비교하면?", a: "한글 폰트 양과 품질은 눈누가 우위. Google Fonts 의 한글 폰트는 노토 산스 KR 같은 글로벌 폰트 위주. 영문 폰트나 글로벌 사용은 Google Fonts, 한국식 디자인은 눈누 추천." },
              { q: "기업 배포 폰트 라이선스 위험?", a: "카카오·네이버·삼성·서울시 같은 대기업·지자체 배포 폰트는 라이선스가 명확하고 분쟁 사례 거의 없음. 개인 폰트 디자이너 작품은 라이선스 변경 가능성이 있으니 다운로드 시점 LICENSE 를 보관해두는 것이 안전." },
              { q: "임베디드(앱·소프트웨어 내장) 가능?", a: "사용 범위 표의 '임베디드' 컬럼이 ○ 인 폰트만 안드로이드·iOS 앱이나 소프트웨어에 내장 가능. 임베디드는 별도 라이선스가 필요한 폰트가 많으므로 표 확인 필수." },
              { q: "광고가 너무 많은데 안 보는 방법?", a: "광고 차단기(uBlock Origin 등) 를 사용하면 광고 차단되지만 운영자의 운영비 손실로 이어집니다. 광고를 차단하지 않으면서 사용하는 것이 사이트 지속 운영에 도움됩니다." },
            ],
            relatedKeywords: [
              "눈누 폰트 다운로드",
              "상업용 무료 한글 폰트",
              "한글 무료 폰트 사이트",
              "눈누 라이선스",
              "카카오 폰트 무료",
              "네이버 폰트 무료",
              "BI 로고용 한글 폰트",
              "본문용 한글 폰트",
              "유튜브 썸네일 폰트",
              "PPT 한글 폰트",
            ],
          },
        },
        {
          name: "공유마당 폰트",
          url: "https://gongu.copyright.or.kr",
          blurb: "한국저작권위원회 공식. 분쟁 가능성이 가장 낮음.",
          details:
            "한국저작권위원회에서 운영합니다. 만료 저작물 기반 폰트와 공공기관 배포 폰트만 모아 분쟁 가능성이 가장 낮습니다. 디자인 품질은 눈누 대비 보수적이지만 공공기관 문서나 교과서 같은 안전 용도에 적합합니다.",
          useCases: [
            "공공기관·정부 문서",
            "교육 자료·교과서",
            "분쟁 가능성 0% 상업물",
            "라이선스 검증된 폰트",
          ],
          pricing: "free",
          alternatives: ["눈누"],
          founded: "2007",
          korean: true,
        },
        {
          name: "폰트프리",
          url: "https://fontsfree.kr",
          blurb: "기업 무료 폰트 모음. 카카오·네이버·NHN 등.",
          details:
            "카카오, 네이버, NHN, 아모레퍼시픽 등 기업이 배포한 무료 한글 폰트를 모은 사이트입니다. 상업용 허용 라이선스가 대부분입니다. 눈누에 없는 기업 폰트를 찾을 때 유용합니다.",
          useCases: [
            "기업 무료 폰트 (카카오·네이버 등)",
            "눈누에 없는 폰트",
            "기업 BI 무료 폰트",
          ],
          pricing: "free",
          alternatives: ["눈누"],
          founded: "2018",
          korean: true,
        },
      ],
    },
    {
      title: "🔠 영문 폰트",
      items: [
        {
          name: "Google Fonts",
          url: "https://fonts.google.com",
          blurb: "1,500+ 무료 폰트. 노토 산스 KR 포함.",
          details:
            "Google 에서 운영합니다. 모든 폰트가 SIL Open Font License 또는 Apache 2.0 으로 상업·재배포가 100% 자유롭습니다. 한글은 노토 산스 KR, 나눔 시리즈 등 메이저 한글 폰트가 포함되어 있으며 CDN 임베드로 웹사이트에 즉시 적용할 수 있습니다.",
          useCases: [
            "웹사이트 폰트 (CDN 임베드)",
            "PPT·문서 영문 폰트",
            "상업물 (라이선스 100% 자유)",
            "노토·나눔 한글 다운로드",
          ],
          pricing: "free",
          alternatives: ["Bunny Fonts"],
          founded: "2010",
        },
        {
          name: "Adobe Fonts",
          url: "https://fonts.adobe.com",
          blurb: "Adobe CC 구독자에게 17,000+ 폰트 무료.",
          details:
            "Adobe Creative Cloud 구독자에게 추가 비용 없이 17,000+ 폰트가 제공됩니다. 상업적 이용이 허용되며 웹과 인쇄 모두 사용 가능합니다. 한글 폰트도 일부 포함되어 있습니다.",
          useCases: [
            "Adobe CC 사용자 (무료 추가)",
            "고품질 상업 폰트",
            "웹·인쇄 통합",
          ],
          pricing: "paid",
          pricingNote: "Adobe CC 구독에 포함",
          alternatives: ["Google Fonts"],
          founded: "2011",
        },
      ],
    },
    {
      title: "🖼️ 사진 / 영상",
      items: [
        {
          name: "Unsplash",
          url: "https://unsplash.com",
          blurb: "고화질 사진 500만+. 상업 사용 허용, 표시 의무 없음.",
          details:
            "Getty Images 의 자회사입니다. 500만 장 이상의 고화질 사진을 Unsplash 라이선스로 제공하며, 상업·수정·배포가 모두 자유롭고 저작자 표시 의무는 없습니다. AI 이미지가 늘어나는 상황에서 실사 사진이 필요할 때 가장 자주 사용됩니다.",
          useCases: [
            "블로그·웹사이트 헤더",
            "PPT 표지·섹션",
            "유튜브 썸네일 배경",
            "광고·인쇄물",
          ],
          pricing: "free",
          tip: "사진 속 인물의 초상권과 브랜드 로고는 별도 권리에 해당하므로 광고·홍보용 인물 사진은 모델 릴리스가 확보된 유료 스톡 사용이 안전합니다.",
          alternatives: ["Pexels", "Pixabay"],
          founded: "2013",
        },
        {
          name: "Pexels",
          url: "https://www.pexels.com",
          blurb: "사진과 영상 통합. 한국어 검색 지원.",
          details:
            "사진과 스톡 비디오를 함께 제공합니다. Pexels 라이선스로 상업·수정·배포가 자유롭고 저작자 표시 의무가 없습니다. Unsplash 대비 영상 라이브러리가 강점이며 한국어 검색을 인식합니다.",
          useCases: [
            "유튜브·릴스 b-roll",
            "블로그 본문 사진",
            "프레젠테이션 이미지·동영상",
            "한국어 검색",
          ],
          pricing: "free",
          alternatives: ["Unsplash", "Pixabay"],
          founded: "2014",
          korean: true,
        },
        {
          name: "Pixabay",
          url: "https://pixabay.com",
          blurb: "사진·일러스트·벡터·영상·음악 종합.",
          details:
            "독일에서 운영합니다. 사진에 더해 일러스트, 벡터, 동영상, 음악, 효과음까지 한 사이트에서 제공합니다. Pixabay 라이선스로 상업 사용이 허용되고 저작자 표시 의무가 없습니다. 일러스트·벡터는 AI 생성물 비중이 늘어 품질 편차가 있습니다.",
          useCases: [
            "사진·일러스트·음악 통합",
            "벡터(SVG·AI) 다운로드",
            "유튜브 BGM·효과음",
            "1인 크리에이터",
          ],
          pricing: "free",
          alternatives: ["Unsplash", "Pexels"],
          founded: "2010",
          korean: true,
        },
        {
          name: "Coverr",
          url: "https://coverr.co",
          blurb: "웹사이트 배경용 짧은 영상 무료.",
          details:
            "5~30초 분량의 시네마틱 영상을 Coverr 라이선스로 무료 제공합니다(상업 OK, 출처 표시는 선택). 웹사이트 헤더 배경과 랜딩 페이지 영상에 특화되어 있습니다.",
          useCases: [
            "웹사이트 배경 영상",
            "랜딩 페이지 히어로",
            "프레젠테이션 도입 영상",
            "광고 b-roll",
          ],
          pricing: "free",
          alternatives: ["Pexels Videos", "Mixkit"],
          founded: "2015",
        },
        {
          name: "Mixkit",
          url: "https://mixkit.co",
          blurb: "영상·음악·효과음·템플릿 통합 무료.",
          details:
            "영상, BGM, 효과음, Premiere/After Effects 템플릿을 무료로 제공합니다. Mixkit 라이선스로 상업 사용이 허용되고 저작자 표시가 필요 없습니다.",
          useCases: [
            "유튜브 b-roll",
            "BGM·효과음",
            "Premiere·AE 템플릿",
            "광고용 배경 영상",
          ],
          pricing: "free",
          alternatives: ["Pexels Videos", "Coverr"],
          founded: "2019",
        },
      ],
    },
    {
      title: "✨ 일러스트 / 캐릭터",
      items: [
        {
          name: "unDraw",
          url: "https://undraw.co",
          blurb: "테마색 변경 가능한 SVG 일러스트.",
          details:
            "Katerina Limpitsouni 가 운영하는 1인 프로젝트입니다. 모든 일러스트가 SVG 라 색상을 한 번에 브랜드 컬러로 변경할 수 있고, unDraw 라이선스로 상업·수정·재배포가 자유로우며 출처 표기조차 필요 없습니다. 랜딩 페이지에 가장 자주 사용되는 스타일입니다.",
          useCases: [
            "랜딩 페이지 일러스트",
            "브랜드 컬러 통일",
            "404·로딩·빈상태 화면",
            "마케팅 자료",
          ],
          pricing: "free",
          alternatives: ["Storyset", "DrawKit"],
          founded: "2017",
        },
        {
          name: "Storyset",
          url: "https://storyset.com",
          blurb: "애니메이션·컬러 커스터마이즈 일러스트.",
          details:
            "Freepik 그룹에서 운영합니다. 일러스트를 정적 PNG/SVG 외에도 애니메이션 GIF·Lottie 형태로 받을 수 있습니다. 컬러 팔레트를 즉시 변경할 수 있으며 라이너·라운드·라인 등 스타일별로 톤 통일이 가능합니다.",
          useCases: [
            "애니메이션 일러스트 (GIF·Lottie)",
            "온보딩 화면 단계별",
            "다양한 스타일에서 통일",
            "광고용 캐릭터",
          ],
          pricing: "free",
          pricingNote: "무료(출처 표시) / Premium 출처 불필요",
          alternatives: ["unDraw"],
          founded: "2020",
        },
        {
          name: "Open Peeps",
          url: "https://www.openpeeps.com",
          blurb: "조립식 사람 캐릭터 일러스트.",
          details:
            "Pablo Stanley 가 제작한 핸드 드로잉 캐릭터 키트입니다. 머리, 표정, 옷, 자세를 부분별로 조합해 본인만의 캐릭터를 만들 수 있습니다. CC0 라이선스로 사용이 100% 자유롭습니다.",
          useCases: [
            "브랜드 캐릭터 시리즈",
            "온보딩·튜토리얼",
            "프레젠테이션 캐릭터",
            "퍼소나·UX 자료",
          ],
          pricing: "free",
          alternatives: ["Storyset", "Blush"],
          founded: "2019",
        },
      ],
    },
    {
      title: "🔣 아이콘",
      items: [
        {
          name: "Flaticon",
          url: "https://www.flaticon.com",
          blurb: "아이콘 1,400만+. 무료는 출처 표시, 유료는 표시 불필요.",
          details:
            "Freepik 그룹에서 운영합니다. 1,400만 개 이상의 아이콘과 7만 개 이상의 스티커 팩이 제공됩니다. 무료 플랜은 flaticon.com 출처 표시가 필요하고 유료(€10/월)는 표시가 면제됩니다. 동일 컬렉션에서 일관된 톤의 아이콘 세트를 받을 수 있어 디자인 통일성에 유리합니다.",
          useCases: [
            "PPT·문서 아이콘",
            "앱·웹 UI 아이콘 (Premium)",
            "인포그래픽",
            "교육 자료",
          ],
          pricing: "freemium",
          pricingNote: "무료(출처 표시) / Premium €10/월",
          alternatives: ["Lucide", "Heroicons"],
          founded: "2013",
        },
        {
          name: "Lucide",
          url: "https://lucide.dev",
          blurb: "오픈소스 SVG 아이콘 1,400+. ISC 라이선스.",
          details:
            "Feather Icons 의 커뮤니티 포크입니다. ISC License 로 상업·수정·재배포가 완전히 자유롭고 출처 표시가 필요 없습니다. React, Vue, Svelte 등 모든 프레임워크의 패키지가 제공됩니다.",
          useCases: [
            "웹·앱 개발 (UI 아이콘)",
            "오픈소스 프로젝트",
            "라이선스 분쟁 0%",
            "프레임워크 통합",
          ],
          pricing: "free",
          alternatives: ["Heroicons", "Tabler"],
          founded: "2020",
        },
        {
          name: "Heroicons",
          url: "https://heroicons.com",
          blurb: "Tailwind 팀 제작. UI 표준 아이콘.",
          details:
            "Tailwind CSS 를 만든 팀이 제작한 SVG 아이콘으로 MIT 라이선스를 사용합니다. Outline, Solid, Mini 세 가지 스타일이 제공되며 Tailwind 기반 프로젝트의 표준 아이콘 세트로 자리잡고 있습니다.",
          useCases: [
            "Tailwind 프로젝트",
            "Outline/Solid 두 톤",
            "React·Vue 컴포넌트",
            "UI 표준 아이콘",
          ],
          pricing: "free",
          alternatives: ["Lucide", "Phosphor"],
          founded: "2020",
        },
        {
          name: "Tabler Icons",
          url: "https://tabler.io/icons",
          blurb: "5,500+ SVG 아이콘. MIT.",
          details:
            "5,500개 이상의 무료 아이콘을 MIT 라이선스로 제공합니다. 검색 키워드가 풍부해 원하는 아이콘을 빠르게 찾을 수 있으며, 모서리 굵기와 둥글기를 사이트에서 즉시 조절할 수 있습니다.",
          useCases: [
            "다양성 (5,500+)",
            "Outline 일관 톤",
            "굵기 커스터마이즈",
            "Lucide 보완",
          ],
          pricing: "free",
          alternatives: ["Lucide", "Heroicons"],
          founded: "2020",
        },
      ],
    },
    {
      title: "📊 PPT / 디자인 툴",
      items: [
        {
          name: "미리캔버스",
          url: "https://www.miricanvas.com",
          blurb: "한국 1위 무료 디자인 SaaS. PPT·썸네일·명함.",
          details:
            "(주)미리디에서 운영합니다. 한국 시장 1위 디자인 SaaS 로 학생, 소상공인, 1인 마케터의 사용 비중이 높습니다. PPT, 카드뉴스, 썸네일, 명함, 전단지 등 한국식 마케팅 자료 템플릿이 풍부하며 무료 플랜에서도 워터마크가 붙지 않습니다.",
          useCases: [
            "PPT 슬라이드 (한국 기업 톤)",
            "유튜브 썸네일·SNS 카드뉴스",
            "명함·전단지·포스터",
            "쇼핑몰 상세페이지",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Pro 월 1.4만원~",
          alternatives: ["Canva", "망고보드"],
          founded: "2018",
          korean: true,
          imageUrl: "https://resource.miricanvas.com/2_0/image/og/OG_en.png",
          hubSlug: "miricanvas",
          detailContent: {
            longIntro: [
              "미리캔버스는 (주)미리디가 운영하는 한국 시장 1위 무료 디자인 SaaS 입니다. 2018년 출시 이후 학생·소상공인·1인 마케터·교사를 중심으로 폭발적으로 성장해 2026년 현재 회원 1,000만+ 규모입니다. 디자인 비전공자가 PPT·카드뉴스·썸네일·명함·전단지·포스터 등을 마우스 드래그만으로 만들 수 있습니다.",
              "가장 큰 강점은 한국식 마케팅 자료 템플릿이 압도적이라는 점입니다. 한국 기업 디자인 톤, 한국 인기 폰트(눈누 폰트 다수 내장), 한국 명절·이벤트 시즌 템플릿이 풍부하고 빠르게 업데이트됩니다. Canva 가 글로벌 트렌드 중심이라면 미리캔버스는 한국 마켓 특화입니다.",
              "무료 플랜에서도 워터마크 없이 PNG·JPG 다운로드 가능합니다. Pro 결제는 PDF 인쇄용 고해상도, 동영상 길이 연장, AI 이미지 생성, 팀 협업 등이 풀립니다.",
              "한국 사용자 대상 서비스라 카카오 로그인, 한국 결제수단 다수 지원, 한국어 고객지원이 매우 강점입니다.",
            ],
            features: [
              { title: "한국식 템플릿 압도적", body: "PPT·카드뉴스·썸네일·명함·전단지·포스터·상세페이지 등 한국 마케팅 자료 수만 종 보유." },
              { title: "한글 폰트 내장", body: "눈누 무료 폰트 다수 포함. 별도 다운로드·설치 없이 클릭 한 번으로 사용." },
              { title: "AI 자동 디자인", body: "Magic Resize, AI 글쓰기, AI 이미지 생성, 배경 자동 제거 등 (Pro 일부 포함)." },
              { title: "PPT·키노트·구글슬라이드 호환", body: "다양한 포맷으로 다운로드. 발표 후 PowerPoint 에서 추가 편집 가능." },
              { title: "동영상 편집", body: "유튜브·릴스용 짧은 영상 편집 + 텍스트 애니메이션 + BGM. 무료 30초까지." },
              { title: "팀 워크스페이스", body: "팀 단위 협업, 공동 편집, 브랜드 키트(로고·색·폰트 통일) 관리." },
              { title: "카카오 로그인 + 국내 결제", body: "카카오·네이버 로그인, 신용카드·계좌이체·카카오페이 결제 지원." },
              { title: "워터마크 없는 무료 다운로드", body: "Canva 와 달리 무료 플랜에서도 PNG·JPG 워터마크 없이 다운로드." },
            ],
            pricingPlans: [
              {
                name: "무료 (Free)",
                price: "0원",
                features: [
                  "모든 무료 템플릿 사용",
                  "PNG·JPG 워터마크 없음",
                  "PPT·PDF 일반 해상도",
                  "동영상 30초까지",
                  "5GB 클라우드 저장",
                ],
              },
              {
                name: "Pro",
                price: "월 14,000원 (연 결제 시 ~11,000원)",
                recommended: true,
                features: [
                  "유료 템플릿 포함 전체 사용",
                  "PDF 인쇄용 고해상도",
                  "동영상 1시간까지",
                  "배경 자동 제거 무제한",
                  "AI 이미지 생성",
                  "100GB 클라우드",
                ],
              },
              {
                name: "Pro Plus / 팀",
                price: "월 22,000원~",
                features: [
                  "Pro 의 모든 기능",
                  "팀 협업 + 브랜드 키트",
                  "고급 AI 기능",
                  "우선 고객지원",
                  "감사 로그",
                ],
              },
            ],
            pros: [
              "한국식 마케팅 자료 템플릿 압도적 양과 품질",
              "무료 플랜도 워터마크 없이 다운로드 (Canva 무료는 워터마크)",
              "카카오 로그인·국내 결제 지원으로 가입·결제 1분",
              "한글 폰트 다수 내장 (별도 다운로드 불필요)",
              "한국어 고객지원·문서·튜토리얼",
            ],
            cons: [
              "글로벌 디자인 트렌드 반영은 Canva 대비 다소 느림",
              "인스타그램 릴스·틱톡 템플릿은 Canva 가 더 다양",
              "동영상 편집 기능은 전용 편집기(Premiere·CapCut) 대비 제한적",
              "글로벌 협업이 많은 팀은 Canva 가 더 어울림",
            ],
            koreanContext:
              "한국 시장 특화 서비스. 카카오·네이버 SSO 로그인, 신용카드·계좌이체·카카오페이 등 한국 결제수단 거의 모두 지원합니다. 한글 폰트는 눈누(noonnu.cc) 의 인기 무료 폰트가 다수 내장돼 별도 다운로드·설치 없이 사용 가능. 명절·새해·졸업식·입학식·결혼식·돌잔치 같은 한국 이벤트 시즌 템플릿이 시즌마다 자동으로 추가됩니다. 한국어 고객지원·튜토리얼·블로그가 매우 잘 정리돼 비전공자 진입이 가장 쉽습니다.",
            startingGuide: [
              { step: 1, title: "가입", body: "miricanvas.com 에서 카카오·네이버·이메일로 가입. 카카오 로그인이 가장 빠릅니다." },
              { step: 2, title: "템플릿 선택", body: "메인 화면에서 만들 자료 종류 선택(PPT·카드뉴스·썸네일·명함 등). 한국 디자인 톤의 수만 종 템플릿 중 마음에 드는 거 클릭." },
              { step: 3, title: "텍스트·이미지 교체", body: "텍스트는 더블클릭으로, 이미지는 드래그로 교체. 본인 이미지를 업로드해 끼워 넣거나 내장 이미지 라이브러리에서 검색." },
              { step: 4, title: "한글 폰트 변경", body: "텍스트 선택 → 폰트 메뉴 → 한글 카테고리. 눈누 무료 폰트 다수 즉시 사용 가능." },
              { step: 5, title: "다운로드", body: "우측 상단 다운로드 → PNG·JPG·PDF·PPT·MP4 형식 선택. 무료 플랜도 워터마크 없이 다운로드." },
            ],
            faq: [
              { q: "무료로 어디까지 쓸 수 있나요?", a: "거의 대부분의 핵심 기능을 무료로 사용할 수 있습니다. 무료 템플릿 수만 종, PNG·JPG·PDF·PPT 다운로드(워터마크 없음), 동영상 30초까지, 5GB 저장공간. 유료 템플릿·고해상도 인쇄·긴 동영상·AI 기능을 쓰려면 Pro 결제가 필요합니다." },
              { q: "Canva 와 비교하면?", a: "한국 마케팅 자료(PPT·카드뉴스·명함·전단지) 는 미리캔버스 압승. 글로벌 트렌드·인스타 릴스·틱톡 템플릿·해외 폰트는 Canva 가 우위. 한국 사용자 대부분에게는 미리캔버스가 우선이고, 글로벌 콘텐츠 제작이 많으면 Canva 보조 추천." },
              { q: "결제는 어떻게?", a: "신용카드·체크카드·계좌이체·카카오페이·네이버페이 모두 지원합니다. 연 결제 시 월 결제 대비 20% 정도 할인. 환불은 결제 후 7일 이내 미사용 시 가능." },
              { q: "PPT 로 다운로드하면 PowerPoint 에서 편집 가능?", a: "가능합니다. PPTX 형식으로 다운로드되어 PowerPoint·Keynote·구글 슬라이드에서 그대로 열고 편집할 수 있습니다. 다만 일부 미리캔버스 전용 효과·애니메이션은 변환 과정에서 단순화될 수 있습니다." },
              { q: "AI 이미지 생성 품질은?", a: "Midjourney·DALL·E 3 같은 전용 AI 대비 디테일은 떨어지지만 PPT·카드뉴스 배경 이미지로는 충분합니다. Pro 플랜에서 월 일정 횟수 무료 생성, 추가는 별도 결제." },
              { q: "팀 협업 가능?", a: "Pro Plus / 팀 플랜에서 가능합니다. 공동 편집, 브랜드 키트(로고·색·폰트 통일), 디자인 공유 폴더 관리 등이 풀립니다. 1인 사용자는 Pro 만으로 충분." },
              { q: "한글 폰트가 부족할 때?", a: "내장 폰트 외에 본인 컴퓨터의 폰트를 업로드해 사용할 수 있습니다 (Pro 이상). 단, 업로드 폰트의 상업 라이선스는 사용자 책임. 눈누에서 라이선스 명확한 무료 폰트 다운로드 후 업로드 추천." },
              { q: "동영상 편집 본격적으로 가능?", a: "짧은 SNS 영상(릴스·쇼츠) 정도는 가능합니다. 텍스트 애니메이션, 음악 추가, 간단한 컷 편집 등. 본격적인 영상 편집은 Premiere·CapCut 같은 전용 도구가 더 강합니다." },
            ],
            relatedKeywords: [
              "미리캔버스 사용법",
              "미리캔버스 무료",
              "미리캔버스 Pro 가격",
              "미리캔버스 vs Canva",
              "한국 디자인 툴",
              "무료 PPT 템플릿",
              "카드뉴스 만들기",
              "썸네일 만들기",
              "한국식 명함 디자인",
              "미리캔버스 폰트",
            ],
          },
        },
        {
          name: "Canva",
          url: "https://www.canva.com",
          blurb: "글로벌 1위 디자인 툴. 인스타·릴스 템플릿 강점.",
          details:
            "호주 Canva 에서 운영하며 전 세계 월간 활성 사용자 1.5억 명 이상입니다. 한국어 인터페이스와 한국 인기 폰트가 제공됩니다. 글로벌 디자인 트렌드와 인스타그램 릴스 템플릿이 가장 빠르게 업데이트되며 AI 기능(Magic Studio)이 무료 플랜에도 일부 포함됩니다.",
          useCases: [
            "인스타·틱톡 릴스 영상",
            "글로벌 SNS 디자인",
            "팀 협업 (URL 공유)",
            "AI 이미지·텍스트 통합",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Pro $12.99/월",
          alternatives: ["미리캔버스", "Adobe Express"],
          founded: "2013",
          korean: true,
          imageUrl:
            "https://content-management-files.canva.com/c37135f6-6d9a-4920-b659-4f5e12698b8d/og-image-global-1200x630.jpg",
          hubSlug: "canva",
          detailContent: {
            longIntro: [
              "Canva 는 2013년 호주에서 출시된 글로벌 1위 디자인 SaaS 입니다. 2026년 현재 월 활성 사용자 1.5억+ 명으로 디자이너 비전공자가 가장 많이 쓰는 디자인 도구가 되었습니다. 한국어 인터페이스와 한국 인기 폰트가 기본 지원되어 한국 사용자에게도 진입 장벽이 낮습니다.",
              "강점은 글로벌 디자인 트렌드 반영 속도와 동영상·인스타·릴스·틱톡 템플릿의 풍부함입니다. 인스타그램 스토리, 릴스, 틱톡, 유튜브 쇼츠 같은 짧은 영상 콘텐츠 템플릿이 시즌마다 빠르게 업데이트되며, AI 기능(Magic Studio, Magic Write, Background Remover, Magic Edit) 이 무료 플랜에서도 일부 사용 가능합니다.",
              "Canva 는 글로벌 1위, 미리캔버스는 한국 1위 라는 구도가 자리잡았습니다. 한국 시장 특화(한국식 명함·전단지·카드뉴스) 는 미리캔버스가 우위, 글로벌 SNS 콘텐츠·팀 협업·AI 기능은 Canva 가 우위입니다.",
              "한국에서 가입·결제·이용 모두 정상. 한국 신용카드·체크카드 결제 가능, 카카오·네이버페이는 미지원입니다.",
            ],
            features: [
              { title: "수십만 개 템플릿", body: "PPT·소셜·포스터·명함·인스타·릴스·유튜브 등 전 영역. 글로벌 트렌드 빠른 업데이트." },
              { title: "Magic Studio (AI)", body: "Magic Write(글), Magic Design(자동 디자인), Magic Edit(이미지 수정), Magic Eraser(배경·객체 제거) 등." },
              { title: "Background Remover", body: "이미지 배경 자동 제거. Pro 무제한." },
              { title: "Magic Resize", body: "한 디자인을 인스타·페이스북·유튜브 등 여러 사이즈로 한 번에 변환. Pro 전용." },
              { title: "동영상 편집", body: "타임라인 기반 영상 편집 + 음악·텍스트 애니메이션 + AI 자막 생성. 릴스·쇼츠 제작 강력." },
              { title: "브랜드 키트", body: "팀 로고·색·폰트 통일. 모든 디자인에 자동 적용. Pro 전용." },
              { title: "팀 협업", body: "공동 편집·댓글·승인 워크플로우. 마케팅팀·디자인팀 공유 작업 강력." },
              { title: "Canva for Education", body: "교사·학생 무료. 학교 이메일 인증으로 즉시 활성화." },
            ],
            pricingPlans: [
              {
                name: "무료 (Free)",
                price: "0원",
                features: [
                  "수십만 무료 템플릿",
                  "Background Remover 일 5회",
                  "Magic Write 일 5회",
                  "5GB 클라우드",
                  "워터마크 없는 다운로드",
                ],
              },
              {
                name: "Canva Pro",
                price: "$12.99/월 (약 1.8만원, 연 $119.99)",
                recommended: true,
                features: [
                  "유료 템플릿·사진·폰트 1억+ 개",
                  "Background Remover 무제한",
                  "Magic Resize·Magic Write 무제한",
                  "브랜드 키트 무제한",
                  "1TB 클라우드",
                  "스케줄러 (SNS 예약 발행)",
                ],
              },
              {
                name: "Canva Teams",
                price: "팀당 $14.99/월~ (최대 5명)",
                features: [
                  "Pro 의 모든 기능",
                  "팀 협업·승인 워크플로우",
                  "팀 폴더 관리",
                  "팀 보고서·분석",
                ],
              },
              {
                name: "Canva for Education",
                price: "교사·학생 무료",
                features: [
                  "Pro 의 거의 모든 기능 무료",
                  "학교 이메일 인증",
                  "교실 단위 협업",
                ],
              },
            ],
            pros: [
              "글로벌 1위 — 디자인 트렌드 반영 빠름",
              "인스타·틱톡·유튜브 쇼츠 템플릿 압도적",
              "AI 기능(Magic Studio) 무료 플랜에도 일부 포함",
              "팀 협업·브랜드 키트로 회사 단위 통일",
              "학생·교사 무료 (Education)",
            ],
            cons: [
              "한국식 마케팅 자료(카드뉴스·명함) 는 미리캔버스가 더 풍부",
              "한국어 고객지원·튜토리얼은 미리캔버스보다 약함",
              "카카오·네이버페이 미지원",
              "Pro 결제 USD 환율 변동 영향",
            ],
            koreanContext:
              "한국어 인터페이스가 자연스럽게 지원되고 한국 인기 폰트(노토 산스 KR, 나눔, 카카오 폰트 등) 도 일부 내장. 한국 사용자가 글로벌 SNS(인스타·틱톡·유튜브 쇼츠) 콘텐츠를 만들 때 Canva 가 가장 자연스럽습니다. 반면 한국 기업 톤의 카드뉴스·명함·전단지 같은 한국식 마케팅 자료는 미리캔버스가 우위. 두 도구를 같이 쓰는 사용자가 많습니다. 결제는 USD 라 환율 변동에 따라 청구액이 달라집니다.",
            startingGuide: [
              { step: 1, title: "가입", body: "canva.com 접속 후 구글·이메일·페이스북으로 가입. 한국 IP 정상." },
              { step: 2, title: "한국어 인터페이스 설정", body: "Settings → Language → 한국어. 모든 메뉴·도움말 한국어로 전환." },
              { step: 3, title: "무료로 첫 디자인", body: "메인에서 만들 자료 종류 선택(인스타 포스트·릴스·유튜브 썸네일 등). 마음에 드는 템플릿 클릭." },
              { step: 4, title: "AI 기능 체험", body: "Magic Write(글 자동 생성), Background Remover(배경 제거), Magic Eraser(불필요 객체 제거) 등을 무료 한도 안에서 시도." },
              { step: 5, title: "Pro 결제 결정", body: "Background Remover 무제한·1억+ 유료 템플릿 필요시 Pro($12.99) 결제. 30일 무료 체험 자주 제공." },
            ],
            faq: [
              { q: "한국에서 결제 가능?", a: "가능. 한국 신용카드·체크카드 결제 정상. 카카오·네이버페이는 미지원이므로 카드 결제 사용." },
              { q: "미리캔버스와 비교?", a: "글로벌 트렌드·인스타·릴스·틱톡 템플릿·AI 기능은 Canva. 한국식 카드뉴스·명함·전단지·한글 폰트·카카오 로그인은 미리캔버스. 두 도구를 같이 쓰는 한국 사용자가 많습니다." },
              { q: "무료로 어디까지 가능?", a: "수십만 무료 템플릿, PNG·JPG·PDF·MP4 다운로드(워터마크 없음), Background Remover 일 5회, Magic Write 일 5회, 5GB 저장공간. 가벼운 작업은 무료로 충분." },
              { q: "Pro 결제할 가치?", a: "Background Remover 를 매일 쓰거나, 브랜드 키트로 회사 디자인 통일이 필요하거나, 1억+ 유료 템플릿이 필요한 경우 Pro($12.99/월). 30일 무료 체험으로 먼저 확인 권장." },
              { q: "결과물 상업 이용 가능?", a: "Canva 약관상 완성된 디자인은 상업 이용 명시 허용. 단, 템플릿 자체를 약간만 수정해 재판매하는 행위는 금지. 본인의 결과물(완성된 PPT·SNS 이미지 등) 만 판매·배포 가능." },
              { q: "교사·학생 무료?", a: "Canva for Education 에서 학교 이메일(@*.ac.kr 등) 또는 학교 ID 카드 인증 시 Pro 의 거의 모든 기능을 무료로 사용. 교실 단위 협업도 무료." },
              { q: "팀 협업은?", a: "Canva Teams 플랜에서 공동 편집·댓글·승인 워크플로우 지원. 마케팅팀·디자인팀이 같은 디자인을 동시에 작업·리뷰할 수 있어 회사 단위 도입 사례 다수." },
              { q: "AI 기능 한국어 정확도?", a: "Magic Write 한국어 출력 자연스러움 안정적. Background Remover·Magic Edit 같은 이미지 AI 는 언어 무관하게 동일 품질. AI 이미지 생성(Magic Media) 은 영어 프롬프트가 더 정확." },
            ],
            relatedKeywords: [
              "Canva 한국 사용",
              "Canva Pro 가격",
              "Canva 무료 한도",
              "Canva vs 미리캔버스",
              "인스타그램 릴스 만들기",
              "유튜브 쇼츠 디자인",
              "Magic Studio AI",
              "Canva 한국어",
              "Canva for Education",
              "Background Remover",
            ],
          },
        },
        {
          name: "망고보드",
          url: "https://www.mangoboard.net",
          blurb: "카드뉴스·인포그래픽 강점.",
          details:
            "(주)리아모어소프트에서 운영합니다. 미리캔버스와 양강 구도이며 카드뉴스와 인포그래픽 템플릿이 더 다양합니다. PPT 보다 SNS 콘텐츠 비중이 높을 때 적합한 선택지입니다.",
          useCases: [
            "인스타 카드뉴스 시리즈",
            "데이터 인포그래픽",
            "유튜브 썸네일",
            "사내 교육 자료",
          ],
          pricing: "freemium",
          pricingNote: "무료(워터마크) / 유료 월 9,900원~",
          alternatives: ["미리캔버스", "Canva"],
          founded: "2016",
          korean: true,
        },
        {
          name: "Slidesgo",
          url: "https://slidesgo.com",
          blurb: "Google Slides·PowerPoint 무료 템플릿.",
          details:
            "Freepik 그룹에서 운영합니다. Google Slides, PowerPoint, Canva 형식 모두 다운로드 가능한 PPT 템플릿 전문 사이트입니다. 글로벌 1위로 비즈니스, 교육, 마케팅 카테고리가 풍부하며 무료는 출처 표시 슬라이드 1장이 자동 포함됩니다.",
          useCases: [
            "Google Slides 템플릿",
            "PowerPoint 파일 직접 편집",
            "글로벌 비즈니스 발표",
            "학술·교육 발표",
          ],
          pricing: "freemium",
          pricingNote: "무료(출처) / Premium €5.99/월",
          alternatives: ["미리캔버스", "Gamma"],
          founded: "2018",
        },
      ],
    },
    {
      title: "🎵 BGM / 효과음",
      items: [
        {
          name: "YouTube 오디오 보관함",
          url: "https://studio.youtube.com",
          blurb: "유튜브 공식. 콘텐츠 ID 클레임 면제 BGM·효과음.",
          details:
            "YouTube 공식 라이브러리입니다. 모든 음원이 콘텐츠 ID 시스템에서 클레임이 발생하지 않도록 사전 보장되어 수익 창출 영상에서도 안심하고 사용할 수 있습니다. 채널이 없어도 Google 계정만 있으면 접속이 가능합니다.",
          useCases: [
            "유튜브 BGM (콘텐츠 ID 안전)",
            "효과음 (장르별 검색)",
            "수익 창출 영상",
            "팟캐스트·릴스 음원",
          ],
          pricing: "free",
          tip: "YouTube 스튜디오 좌측 메뉴의 '오디오 보관함' 에서 접속할 수 있습니다.",
          alternatives: ["Pixabay Music", "Bensound"],
          founded: "2013",
          korean: true,
        },
        {
          name: "Bensound",
          url: "https://www.bensound.com",
          blurb: "BGM 전문. 무료는 출처 표시, 유료는 표시 불필요.",
          details:
            "독립 작곡가 Benjamin Tissot 이 운영합니다. 클래시컬, 재즈, 록, 일렉트로닉 등 장르별 무료 BGM 을 제공하며 무료 사용 시 출처 표시 의무가 있습니다. Pro 라이선스($19~) 결제 시 출처 표시가 면제됩니다.",
          useCases: [
            "유튜브 BGM (출처 표기 가능 시)",
            "팟캐스트 인트로",
            "광고 BGM",
            "장르별 검색",
          ],
          pricing: "freemium",
          pricingNote: "무료(출처) / Pro $19/곡~",
          alternatives: ["YouTube Audio Library"],
          founded: "2011",
        },
        {
          name: "Freesound",
          url: "https://freesound.org",
          blurb: "효과음·환경음 무료 (CC).",
          details:
            "Universitat Pompeu Fabra 가 운영하는 비영리 사이트입니다. 60만 개 이상의 사운드 클립을 CC0, CC-BY 등 크리에이티브 커먼즈 라이선스로 제공합니다. 효과음, 환경음, 필드 레코딩이 강점이며 다운로드 전 각 사운드의 정확한 라이선스를 확인해야 합니다.",
          useCases: [
            "유튜브·팟캐스트 효과음",
            "게임·앱 사운드 디자인",
            "영상 환경음 레이어",
            "음악 샘플링 (CC0)",
          ],
          pricing: "free",
          alternatives: ["YouTube Audio Library", "Zapsplat"],
          founded: "2005",
        },
      ],
    },
    {
      title: "🎨 색상 / 디자인 도구",
      items: [
        {
          name: "Coolors",
          url: "https://coolors.co",
          blurb: "색상 팔레트 자동 생성기.",
          details:
            "스페이스바 한 번으로 새 색상 팔레트가 생성되는 도구입니다. 잠금 기능으로 특정 색상만 유지하고 나머지만 변경할 수 있으며 무료로 무제한 생성·저장·내보내기(PNG/PDF/SCSS)가 가능합니다.",
          useCases: [
            "브랜드 컬러 빠른 결정",
            "Tailwind config 색상",
            "이미지에서 컬러 추출",
            "팔레트 영감",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Pro $3/월",
          alternatives: ["Adobe Color", "Realtime Colors"],
          founded: "2014",
        },
        {
          name: "Adobe Color",
          url: "https://color.adobe.com",
          blurb: "Adobe 공식 색상 팔레트 + 접근성 체크.",
          details:
            "Adobe 공식 색상 도구입니다. 색상 휠로 보색, 유사색, 삼각배색을 자동 생성하며 접근성(WCAG) 대비비 체크 기능이 강점입니다. 무료 회원가입 시 Adobe Creative Cloud 와 자동 동기화됩니다.",
          useCases: [
            "보색·유사색·삼각배색",
            "접근성(WCAG) 대비비 체크",
            "이미지에서 컬러 추출",
            "Adobe CC 동기화",
          ],
          pricing: "free",
          alternatives: ["Coolors"],
          founded: "2007",
        },
        {
          name: "Khroma",
          url: "https://www.khroma.co",
          blurb: "취향 학습 AI 컬러 추천.",
          details:
            "좋아하는 색 50개를 선택하면 AI 가 취향을 학습해 무한대로 새 컬러 조합을 추천합니다. 한 번 학습한 뒤에는 매번 비슷한 결과가 나오지 않으며, 그라데이션·타이포·이미지에 미리 적용된 형태로 결과를 보여줍니다.",
          useCases: [
            "본인 취향 학습 컬러 추천",
            "무한 컬러 조합 생성",
            "그라데이션·타이포 미리보기",
            "Coolors 의 AI 버전",
          ],
          pricing: "free",
          alternatives: ["Coolors", "Adobe Color"],
          founded: "2019",
        },
        {
          name: "Realtime Colors",
          url: "https://realtimecolors.com",
          blurb: "실시간 미리보기 컬러 팔레트.",
          details:
            "컬러를 선택하는 즉시 가상의 웹페이지에 적용된 모습이 실시간으로 표시되는 도구입니다. Tailwind config, CSS 변수, Figma 토큰 형식으로 즉시 내보낼 수 있어 디자인 시안 단계에서 빠른 의사결정이 가능합니다.",
          useCases: [
            "웹사이트 컬러 실시간 미리보기",
            "Tailwind config 자동 생성",
            "CSS 변수·Figma 토큰 내보내기",
            "디자인 시안 빠른 결정",
          ],
          pricing: "free",
          alternatives: ["Coolors", "Khroma"],
          founded: "2023",
        },
      ],
    },
  ],
  faq: [
    {
      q: "상업용 무료라고 표기된 사이트라도 광고에 사용해도 되나요?",
      a: "각 사이트의 라이선스 조항에 따라 다릅니다. Unsplash, Pexels, Pixabay, unDraw, Lucide 는 광고·인쇄·재배포가 모두 가능합니다. Slidesgo, Flaticon 무료 플랜은 출처 표시 의무가 있고, 미리캔버스·Canva 는 결과물의 상업 사용은 허용하지만 템플릿 자체의 재판매는 금지합니다. 다운로드 전 라이선스 페이지 확인이 필요합니다.",
    },
    {
      q: "Unsplash 사진에 사람이 찍혀 있는데 광고에 사용해도 되나요?",
      a: "사진 라이선스와 인물 초상권은 별개입니다. 사진가가 자유 라이선스로 풀었더라도 모델 본인이 광고 사용을 허락하지 않은 경우 분쟁이 가능합니다. 인물이 식별되는 사진을 광고·홍보에 사용할 때는 모델 릴리스가 확보된 유료 스톡(Getty, Shutterstock) 사용이 안전합니다.",
    },
    {
      q: "한글 폰트를 회사 BI·CI 로고에 사용해도 되나요?",
      a: "폰트마다 라이선스가 다릅니다. 눈누의 '사용 범위' 표에서 'BI/CI' 열을 확인해야 합니다. 가장 안전한 선택지는 SIL Open Font License(OFL) 폰트로 로고 임베드까지 100% 자유입니다. 일부 폰트는 본문·웹은 허용하지만 BI/CI 는 별도 라이선스 구매가 필요한 경우가 있습니다.",
    },
    {
      q: "무료 PPT 템플릿을 수정해 재판매할 수 있나요?",
      a: "거의 모든 사이트가 금지하고 있습니다. 미리캔버스, Slidesgo, Canva 의 약관은 템플릿을 사용한 완성 PPT 의 상업 사용은 허용하지만, 템플릿 자체나 약간 수정한 템플릿의 재판매·재배포는 금지합니다. 본인의 결과물만 판매·배포할 수 있습니다.",
    },
    {
      q: "유튜브 BGM 은 어느 사이트가 가장 안전한가요?",
      a: "YouTube 스튜디오의 오디오 보관함이 가장 안전합니다. 유튜브가 직접 라이선스를 확보한 음원이라 콘텐츠 ID 클레임이 발생하지 않습니다. Pixabay Music 이나 Bensound 도 무료지만 같은 음원이 다른 채널에 등록되어 클레임이 발생하는 경우가 있으므로 수익 창출이 중요할 때는 유튜브 공식 라이브러리를 우선 사용하는 방법이 안전합니다.",
    },
    {
      q: "AI 가 생성한 이미지를 Unsplash 등에서 받았는데 상업 사용이 가능한가요?",
      a: "사이트 라이선스는 허용하지만 AI 생성물의 저작권 인정 여부는 미국, EU, 한국 모두 미정 상태입니다. 향후 법 개정으로 소급 적용될 가능성이 있습니다. AI 생성 명시 이미지는 광고·브랜드 자료 사용을 피하고, 본인이 직접 생성한 AI 이미지(Midjourney 유료 등) 를 사용하는 방법이 안전합니다.",
    },
    {
      q: "한국어 폰트인지 영문 폰트인지 어떻게 구분하나요?",
      a: "Google Fonts 는 좌측 필터에서 Language → Korean 을 선택할 수 있습니다. 눈누는 한글 전용 사이트입니다. 외국 폰트가 한글을 일부 지원하는 경우도 있으나 자모 일부만 지원해 글자가 깨질 수 있으므로 다운로드 후 한글 텍스트로 직접 확인해야 합니다.",
    },
    {
      q: "효과음·BGM 사이트가 많은데 어느 것을 먼저 봐야 하나요?",
      a: "유튜버라면 YouTube 오디오 보관함, Pixabay Music, Bensound 순서가 일반적입니다. 게임·앱 사운드 디자인은 Freesound 와 Mixkit 이 강점이며, 광고·CM 송은 Suno·Udio 같은 AI 음원 생성이 분쟁 가능성이 가장 낮습니다.",
    },
  ],
};

// ===========================================================================
// 4. 코인 / 주식 무료 도구
// ===========================================================================
const COIN: PickCategory = {
  slug: "coin",
  title: "코인·주식 무료 도구 모음 — 백테스트·차트·온체인·공시 23선",
  metaTitle: "코인·주식 무료 도구 모음 23선 — 백테스트·차트·온체인",
  shortTitle: "코인·주식",
  emoji: "📈",
  oneLiner: "코인·주식 트레이더가 사용하는 무료 도구 23곳.",
  description:
    "TradingView, 업비트, CoinGecko, DART, KRX, Glassnode, DefiLlama, 한경 컨센서스 등 한국 트레이더가 사용하는 코인·주식 차트·백테스트·온체인·공시 무료 도구 23곳을 정리한 디렉토리입니다.",
  longIntro: [
    "TradingView, 업비트, CoinGecko, DART, KRX, Glassnode, DefiLlama 등 코인·주식 트레이딩에 사용되는 무료 도구를 백테스트·거래소·시세·온체인·한국 공시로 나눠 정리했습니다.",
    "전략 검증은 백테스트에서 시작합니다. eloan 은 업비트 KRW 마켓 + 12종 빌트인 전략을 무료로 제공하며, TradingView 는 Pine Script 로 본인 전략을 직접 구현할 수 있습니다. 백테스트 결과는 슬리피지와 체결지연이 반영되지 않으므로 실전 대비 10~20% 할인된 기대치로 사용해야 합니다.",
    "한국 주식 분석의 1차 출처는 한경 컨센서스(증권사 리포트), DART(전자공시), KRX 정보데이터시스템(공식 시세) 입니다. 광고가 없고 데이터가 정확해 종목 분석의 출발점으로 적합합니다.",
    "거래소 계정은 국내 1곳과 해외 1곳을 함께 사용하는 방식이 일반적입니다. 국내는 업비트·빗썸·코빗, 해외는 Binance·Bybit·OKX 가 대표적이며, KYC 인증 후 USDT 입출금으로 운영됩니다.",
    "코인 온체인 데이터는 Glassnode(BTC·ETH 매크로 지표), DefiLlama(DeFi TVL), Dune(SQL 대시보드), CryptoQuant(거래소 입출금 흐름) 조합이 표준입니다.",
  ],
  selectionCriteria: [
    "거래소·공공기관·메이저 리서치 등 1차 출처 우선",
    "무료 플랜만으로도 가치를 제공하는 서비스",
    "한국 트레이더가 실제로 사용하는 도구",
    "공식 사이트 직링크",
  ],
  updatedAt: TODAY,
  relatedKeywords: [
    "코인 백테스트",
    "주식 차트 무료",
    "트레이딩뷰",
    "온체인 분석",
    "DART 공시",
    "김치프리미엄",
    "증권사 리포트 무료",
    "코인 거래소 비교",
    "주식 데이터",
    "한경 컨센서스",
  ],
  groups: [
    {
      title: "🧪 백테스트 / 전략 검증",
      items: [
        {
          name: "eloan 백테스트",
          url: "/backtest",
          blurb: "본 사이트. 업비트 KRW + 12종 전략 무료.",
          details:
            "본 사이트(eloan) 의 핵심 기능입니다. 업비트 KRW 마켓의 모든 코인에 대해 12종 빌트인 전략(이동평균, RSI, MACD, 볼린저, 스토캐스틱 등) 백테스트를 무료로 제공합니다. 결과는 슬러그 URL 로 공유 가능하며 회원 가입 시 결과 저장, 랭킹, 커뮤니티 토론까지 연결됩니다.",
          useCases: [
            "본인 매매 전략 과거 성과 검증",
            "여러 코인·기간 비교",
            "결과 공유 URL 로 토론",
            "수수료·MDD·승률 자동 계산",
          ],
          pricing: "free",
          pricingNote: "100% 무료",
          tip: "결과 페이지 하단의 '전략 설명 박스' 에서 각 지표의 표준 공식과 활용법을 확인할 수 있습니다.",
          alternatives: ["TradingView Pine"],
          founded: "2024",
          korean: true,
        },
        {
          name: "TradingView",
          url: "https://www.tradingview.com",
          blurb: "글로벌 표준 차트. Pine Script 백테스트.",
          details:
            "글로벌 1위 차트 플랫폼으로 월간 활성 사용자 8천만 명 이상입니다. Pine Script 라는 자체 언어로 인디케이터와 전략을 직접 만들고 백테스트할 수 있습니다. 무료 플랜은 인디케이터 동시 사용 2개 제한이 있지만 코인, 주식, 외환 데이터가 무료로 제공됩니다.",
          useCases: [
            "본인 전략 Pine Script 구현",
            "차트 위 인디케이터 시각화",
            "코인·주식·외환 통합 차트",
            "커뮤니티 공유 스크립트",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Essential $14.95/월~",
          tip: "무료 플랜은 인디케이터 동시 2개 제한이므로 핵심 지표만 선택해 사용하는 방법이 효율적입니다.",
          alternatives: ["eloan", "QuantConnect"],
          founded: "2011",
          korean: true,
          imageUrl:
            "https://s.tradingview.com/static/images/illustrations/main-page.jpg",
          hubSlug: "tradingview",
          detailContent: {
            longIntro: [
              "TradingView 는 2011년 출시 이후 글로벌 차트 플랫폼 1위 자리를 유지하는 서비스입니다. 2026년 현재 월 활성 사용자 8천만 명 이상으로 트레이더라면 누구나 한 번쯤 사용하는 사실상 표준 도구입니다. 한국 사용자에게도 한국어 인터페이스와 한국 거래소 다수 지원으로 진입 장벽이 낮습니다.",
              "핵심 기능은 세 가지입니다. ① 전문가급 차트 (200+ 인디케이터, 50+ 그리기 도구), ② Pine Script 라는 자체 언어로 본인 전략·인디케이터 직접 작성·백테스트, ③ 글로벌 모든 시장 통합 (주식, 코인, 외환, 선물, 옵션, 원자재). 단일 도구로 모든 자산을 한 화면에서 다룰 수 있는 거의 유일한 플랫폼입니다.",
              "무료 플랜에서도 거의 모든 차트 기능 사용 가능합니다. 단 인디케이터 동시 사용 2개 제한, 차트당 3개 알람 제한, 광고 노출 등 제약이 있어 본격 사용은 Essential($14.95) 또는 Plus($29.95) 결제로 풉니다.",
              "한국 거래소(KRX·KOSPI·KOSDAQ) 와 한국 코인 거래소(업비트) 모두 차트 데이터 무료 제공. 한국 사용자가 비용 없이 시작하기에 가장 좋은 환경입니다.",
            ],
            features: [
              { title: "전문가급 차트", body: "캔들·라인·히킨아시·렌코 등 15+ 차트 종류. 200+ 인디케이터, 50+ 그리기 도구." },
              { title: "Pine Script", body: "JavaScript 와 비슷한 자체 언어로 본인만의 인디케이터·전략 작성. 백테스트 즉시 실행." },
              { title: "글로벌 모든 시장 통합", body: "주식(NYSE·NASDAQ·KRX 등), 코인(전 거래소), 외환, 선물, 옵션, 원자재. 단일 화면에서 비교." },
              { title: "커뮤니티 스크립트", body: "사용자들이 공유한 수만 개 인디케이터·전략 무료 사용. RSI·MACD 같은 표준 외에 커스텀 전략 다수." },
              { title: "Alerts", body: "가격·인디케이터 조건 충족 시 이메일·SMS·웹훅 알림. Plus 이상 다중 알림." },
              { title: "Replay 모드", body: "과거 시점으로 돌아가 캔들이 천천히 다시 그려지는 모드. 매매 시뮬레이션 연습." },
              { title: "DOM·Heatmap", body: "Pro+ 이상에서 호가창(DOM), 거래량 히트맵, 옵션 체인 분석." },
              { title: "Paper Trading", body: "실제 돈 없이 가상 자금으로 모의투자. 거래소 연결 없이 차트에서 바로 매수·매도 시뮬레이션." },
            ],
            pricingPlans: [
              {
                name: "Basic (무료)",
                price: "0원",
                features: [
                  "차트당 인디케이터 2개",
                  "1개 디바이스",
                  "광고 노출",
                  "차트당 알람 3개",
                  "기본 시간단위",
                ],
              },
              {
                name: "Essential",
                price: "$14.95/월",
                features: [
                  "차트당 인디케이터 5개",
                  "2개 디바이스",
                  "광고 제거",
                  "알람 20개",
                  "다중 시간단위",
                ],
              },
              {
                name: "Plus",
                price: "$29.95/월",
                recommended: true,
                features: [
                  "차트당 인디케이터 10개",
                  "5개 디바이스",
                  "알람 100개",
                  "사용자 커스텀 시간단위",
                  "차트 8개 동시 보기",
                ],
              },
              {
                name: "Pro+ / Premium",
                price: "$59.95~$99.95/월",
                features: [
                  "인디케이터 25개",
                  "알람 400~1000개",
                  "초당 차트, 1초 봉",
                  "DOM·Heatmap",
                  "초우선 데이터 피드",
                ],
              },
            ],
            pros: [
              "글로벌 차트 플랫폼 사실상 표준 (모든 트레이더가 사용)",
              "무료 플랜으로도 차트 기능 거의 다 사용",
              "Pine Script 로 본인 전략 무한 확장",
              "주식·코인·외환·선물 단일 화면 통합",
              "한국어 인터페이스·한국 거래소 데이터 무료",
            ],
            cons: [
              "무료 플랜 인디케이터 2개 제한 (실전 매매엔 부족)",
              "본격 사용 시 Plus($30) 이상 결제 필요",
              "Pine Script 학습 곡선 (코딩 경험 없으면 진입 장벽)",
              "한국 주식 실시간은 KRX 직접 vs TradingView 데이터 지연 차이",
              "DOM·옵션 체인은 Pro+ 이상만",
            ],
            koreanContext:
              "한국 IP 와 신용카드(국내·해외 모두) 로 가입·결제 정상. 한국어 인터페이스가 자연스럽게 지원되고 KRX(KOSPI·KOSDAQ), 업비트, 빗썸, 코빗 등 한국 거래소 데이터가 무료로 제공됩니다. Pine Script 한국어 커뮤니티(네이버 카페·디스코드)도 활발해 검색만으로 한국어 자료 풍부. 한국 주식 실시간 시세는 무료 플랜에서는 약간 지연될 수 있으며, 진짜 실시간 데이터가 필요하면 Pro+ 이상 결제 또는 KRX 데이터 직접 구독 필요.",
            startingGuide: [
              { step: 1, title: "가입", body: "tradingview.com 접속 후 구글·이메일로 가입. 한국 IP·VPN 불필요. 가입 즉시 차트 사용 가능." },
              { step: 2, title: "관심 종목·코인 추가", body: "검색창에서 'KRX:삼성전자' 또는 'UPBIT:BTCKRW' 같은 형식으로 검색 후 즐겨찾기. 화면 좌측에 워치리스트로 정렬." },
              { step: 3, title: "기본 인디케이터 추가", body: "차트 상단 'Indicators' 메뉴에서 RSI·MACD·이동평균 같은 기본 지표 추가. 무료 플랜은 2개까지." },
              { step: 4, title: "Pine Script 입문", body: "차트 하단 Pine Editor 열고 'study(\"My Indicator\") plot(close)' 같은 기본 스크립트 작성. 공식 문서·유튜브 튜토리얼 다수." },
              { step: 5, title: "Plus 결제 결정", body: "인디케이터 5개 이상 동시 필요·다중 차트 작업이 일상이 되면 Plus($29.95) 결제. 한 달 무료 체험 권장." },
            ],
            faq: [
              { q: "한국에서 가입·결제 가능한가요?", a: "가능합니다. 한국 IP 로 정상 접속되며 국내·해외 신용카드 모두 결제됩니다. VPN 불필요. 카카오·네이버페이는 지원되지 않으므로 카드 결제를 사용하세요." },
              { q: "무료 플랜으로 어디까지 쓸 수 있나요?", a: "차트 기능 거의 다 가능. 단점은 인디케이터 동시 2개 제한, 광고 노출, 알람 3개 제한, 1개 디바이스만. 가벼운 차트 분석은 무료로 충분하지만 본격 매매·다중 인디케이터는 Plus 이상이 필요합니다." },
              { q: "Pine Script 학습 어렵나요?", a: "JavaScript 와 비슷한 문법이라 코딩 경험이 있다면 1~2일에 입문 가능. 비전공자도 공식 문서·유튜브 튜토리얼로 1주일이면 단순 인디케이터·전략 작성할 수 있습니다. 본 사이트(eloan)는 코드 없이 클릭으로 백테스트 가능하므로 코딩이 부담이면 eloan 우선 사용." },
              { q: "Plus 결제할 가치 있나요?", a: "매일 차트를 보는 트레이더라면 Plus($29.95) 가 가장 효율적. 인디케이터 10개, 차트 8개 동시 보기, 알람 100개라 본격 매매에 충분. 가끔 보는 정도면 Essential($14.95) 또는 무료로 충분." },
              { q: "한국 주식 실시간 시세 받을 수 있나요?", a: "무료 플랜은 약간 지연된 데이터(보통 15분). 실시간 KRX 데이터는 Pro+ 이상 + 추가 데이터 구독이 필요합니다. 한국 주식만 본다면 네이버 증권의 실시간 데이터 + TradingView 차트 분석 조합이 가성비 좋습니다." },
              { q: "본인 전략 백테스트는?", a: "Pine Script 의 strategy() 함수로 작성한 코드를 차트에 적용하면 자동으로 백테스트 결과(승률·MDD·총 수익률) 가 계산됩니다. 무료 플랜에서도 백테스트 기능 사용 가능. 단, 슬리피지·체결지연 등 시장 충격을 완벽히 반영하지 않으니 실전 대비 10~20% 할인해서 보세요." },
              { q: "TradingView 와 eloan 차이는?", a: "eloan 은 한국 KRW 코인 시장 특화·12종 빌트인 전략 무료 백테스트·결과 슬러그 URL 공유. TradingView 는 글로벌 전 시장·본인 전략 코딩 가능·차트 분석 1티어. 코딩 없이 빠른 전략 검증은 eloan, 복잡한 본인 전략 개발과 글로벌 시장 분석은 TradingView." },
              { q: "환불 가능한가요?", a: "Plus 이상 플랜은 30일 환불 보장 정책이 있습니다(2026년 기준). 결제 후 30일 이내 만족하지 못하면 고객지원에 문의해 환불 신청 가능. Basic 무료는 환불 대상 아님." },
            ],
            relatedKeywords: [
              "TradingView 한국 사용",
              "TradingView 가격 플랜",
              "TradingView 무료 한도",
              "Pine Script 사용법",
              "TradingView vs eloan",
              "차트 분석 도구",
              "트레이딩뷰 한국 주식",
              "트레이딩뷰 코인",
              "TradingView Plus",
              "TradingView 백테스트",
            ],
          },
        },
        {
          name: "QuantConnect",
          url: "https://www.quantconnect.com",
          blurb: "Python·C# 알고리즘 트레이딩 백테스트.",
          details:
            "글로벌 알고리즘 트레이딩 플랫폼입니다. Python·C# 코드로 본인 전략을 만들고 무료 클라우드 컴퓨팅으로 백테스트를 실행할 수 있습니다. 주식, 옵션, 선물, 외환, 코인 통합 데이터가 무료로 제공되며 실전 자동매매 연결까지 한 사이트에서 처리됩니다.",
          useCases: [
            "Python·C# 알고리즘 트레이딩",
            "주식·옵션·선물·코인 통합 백테스트",
            "클라우드 백테스트 (무료)",
            "실전 자동매매 연결",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Researcher $20/월~",
          alternatives: ["TradingView", "eloan"],
          founded: "2012",
        },
      ],
    },
    {
      title: "🏦 거래소 (국내)",
      items: [
        {
          name: "업비트",
          url: "https://upbit.com",
          blurb: "한국 1위 코인 거래소. 공개 API 무료.",
          details:
            "두나무에서 운영하며 한국 코인 거래량 1위로 KRW 마켓이 가장 큽니다. 공개 REST API 가 인증 없이 분당 1만 회까지 무료로 제공되어 본 사이트(eloan) 백테스트의 1차 데이터 소스로 사용됩니다. 차트, 시세, 호가 조회는 무료입니다.",
          useCases: [
            "한국 코인 거래 1위",
            "공개 API 무료 (개발자)",
            "본 사이트 백테스트 데이터",
            "KRW 마켓 시세",
          ],
          pricing: "free",
          pricingNote: "조회·API 무료 / 거래 수수료 0.05%~",
          alternatives: ["빗썸", "코빗"],
          founded: "2017",
          korean: true,
          imageUrl: "https://static.upbit.com/upbit-pc/seo/upbit_facebook.png",
          hubSlug: "upbit",
          detailContent: {
            longIntro: [
              "업비트(Upbit) 는 두나무가 운영하는 한국 1위 코인 거래소입니다. 2017년 출시 이후 KRW 마켓 거래량과 사용자 수에서 압도적 1위를 유지하고 있으며, 2026년 현재 한국 전체 코인 거래량의 70% 이상이 업비트에서 발생합니다.",
              "케이뱅크 계좌 연동이 필수입니다. 다른 은행 계좌로는 업비트에 원화 입금이 불가능하므로 업비트 시작 전 케이뱅크 계좌부터 개설해야 합니다. 카카오뱅크·신한 같은 시중 은행은 빗썸·코빗에서 사용 가능하지만 업비트와는 호환되지 않습니다.",
              "본 사이트(eloan) 백테스트의 1차 데이터 소스이기도 합니다. 업비트는 공개 REST API 를 인증 없이 분당 1만 회까지 무료로 개방해 개발자가 손쉽게 데이터를 가져올 수 있게 해두었습니다. KRW 마켓 모든 코인의 분봉·일봉 데이터가 무료로 제공됩니다.",
              "거래 수수료는 0.05% 로 메이커·테이커 동일. 일부 결제 수단에서는 추가 할인 적용. 가입은 본인인증·실명계좌 연동 후 약 1~3일 안에 거래 가능 상태가 됩니다.",
            ],
            features: [
              { title: "KRW 마켓 1위 거래량", body: "한국 코인 거래량 70%+ 점유. 호가창 깊이 최고, 슬리피지 가장 작음." },
              { title: "케이뱅크 원화 입출금", body: "케이뱅크 계좌 연동 후 24시간 입출금 가능. 시중 은행은 사용 불가." },
              { title: "공개 REST API (무료)", body: "분당 1만 회 호출 한도, 인증 불필요. 분봉·일봉·호가·체결 데이터 무료 제공." },
              { title: "수수료 0.05%", body: "메이커·테이커 동일. BTC·KRW·USDT 마켓 모두 동일 수수료." },
              { title: "200+ KRW 마켓 코인", body: "비트코인·이더리움 외 알트코인 200+ 종 KRW 직거래. 다른 거래소 USDT 우회 불필요." },
              { title: "스테이킹 (Upbit Earn)", body: "이더리움·솔라나 등 일부 코인 스테이킹 가능. 연 환산 수익률 3~6%." },
              { title: "디지털자산 관리", body: "포트폴리오·평균매수가·수익률 자동 계산. 세무 신고 자료 다운로드." },
              { title: "모바일 앱", body: "안드로이드·iOS 앱 한국 1위 사용성. 알림·차트·간편 매매." },
            ],
            pricingPlans: [
              {
                name: "조회·API (무료)",
                price: "0원",
                features: [
                  "전 코인 시세·차트·호가 무료 조회",
                  "공개 REST API 분당 1만 회",
                  "분봉·일봉 데이터 무료",
                  "회원가입 없이도 시세 조회 가능",
                ],
              },
              {
                name: "거래 수수료",
                price: "0.05%",
                recommended: true,
                features: [
                  "메이커·테이커 동일",
                  "KRW·BTC·USDT 마켓 모두 동일",
                  "특정 이벤트 시 추가 할인",
                  "스테이킹 보상 별도 수수료 없음",
                ],
              },
            ],
            pros: [
              "한국 1위 거래량으로 호가창 깊이·슬리피지 최소",
              "200+ KRW 마켓 코인 직거래 (USDT 우회 불필요)",
              "공개 API 무료로 본인 백테스트·자동매매 구축 가능",
              "케이뱅크 24시간 원화 입출금",
              "한국어 고객지원·세무 자료 자동 제공",
            ],
            cons: [
              "케이뱅크 계좌 필수 (다른 은행 불가)",
              "글로벌 알트·DeFi·NFT 는 Binance·OKX 가 우위",
              "신규 가입 본인인증·실명계좌 연동 1~3일",
              "선물·옵션 등 파생 상품 없음 (현물만)",
              "수수료 0.05% 는 빗썸(0.04%) 보다 약간 높음",
            ],
            koreanContext:
              "한국 법인 운영, 한국어 고객지원, 한국 세무 신고용 거래내역 자동 다운로드 등 한국 사용자 친화 환경이 가장 잘 갖춰진 거래소입니다. 케이뱅크 계좌 연동 외에는 다른 은행을 사용할 수 없으므로 업비트를 쓰려면 케이뱅크 계좌부터 만들어야 합니다. 본인인증은 휴대폰 본인인증 + 실명 KYC 가 필요하며 1~3영업일 소요. 본 사이트(eloan) 백테스트도 업비트 API 를 1차 데이터 소스로 사용합니다.",
            startingGuide: [
              { step: 1, title: "케이뱅크 계좌 개설", body: "업비트 사용에는 케이뱅크 계좌가 필수. 케이뱅크 앱에서 비대면 계좌 개설 (10분). 다른 은행 계좌로는 업비트 원화 입금 불가." },
              { step: 2, title: "업비트 가입", body: "upbit.com 또는 모바일 앱 → 가입 → 휴대폰 본인인증 + KYC 신분증 인증. 1~3영업일 안에 거래 가능 상태." },
              { step: 3, title: "케이뱅크 → 업비트 입금", body: "업비트 입출금 메뉴 → 원화 입금. 케이뱅크 계좌에서 업비트 가상계좌로 송금. 24시간 즉시 반영." },
              { step: 4, title: "거래소·KRW 마켓 둘러보기", body: "KRW 마켓 탭에서 비트코인·이더리움·솔라나 등 200+ 코인 시세 확인. 호가창·차트·체결 데이터 무료." },
              { step: 5, title: "백테스트 활용 (선택)", body: "본인 매매 전략을 실전 진입 전 eloan 백테스트에서 검증. 업비트 데이터 그대로 사용하므로 결과 신뢰도 높음." },
            ],
            faq: [
              { q: "다른 은행 계좌로 사용 가능?", a: "아니요. 업비트는 케이뱅크 계좌 1개와만 연동됩니다. 카카오뱅크·신한·국민 등 다른 은행은 빗썸·코빗에서 사용 가능합니다. 업비트를 쓰려면 케이뱅크 계좌를 먼저 만들어야 합니다." },
              { q: "수수료 얼마?", a: "거래 수수료 0.05% (메이커·테이커 동일). 입금 무료, 출금 수수료 코인별 차등(BTC 0.0009, ETH 0.018 등). 시중 카드 결제 같은 추가 비용 없음." },
              { q: "공개 API 진짜 무료?", a: "예. 인증 없이 분당 1만 회 호출 가능. 본인 자동매매를 만들거나 백테스트 데이터를 받는 데 충분한 한도. API 문서: api.upbit.com 에서 공개." },
              { q: "빗썸·코빗과 비교?", a: "거래량과 KRW 마켓 깊이는 업비트 압승. 빗썸은 수수료 0.04% 로 미세하게 저렴 + 일부 알트 빠른 상장. 코빗은 신한금융 인수로 법적 안정성. 보통 업비트 메인 + 빗썸/코빗 보조 구도." },
              { q: "글로벌 거래소 같이 쓰는 게 좋나?", a: "추천. Binance·Bybit·OKX 같은 해외 거래소를 KYC 만 해두면 한국 미상장 알트나 선물 거래에 대응 가능. KRW 입출금은 업비트, 글로벌 알트는 Binance·OKX 조합이 일반적." },
              { q: "스테이킹 수익률은?", a: "이더리움 3~4%, 솔라나 5~6%, 폴카닷 8~12% 수준 (시장 상황에 따라 변동). 별도 수수료 없이 보상이 매일·주별 자동 지급. 단, 락업 기간 동안 거래 불가." },
              { q: "세금 신고는 어떻게?", a: "업비트 마이페이지 → 거래내역 다운로드 → 엑셀 형식으로 받기. 2025년부터 가상자산 양도소득세(연 250만원 초과 시 22%) 가 시행되어 직접 신고 필요. 업비트는 거래내역만 제공하고 세금 계산은 본인이 해야 함." },
              { q: "본 사이트(eloan)와 어떻게 같이 쓰나?", a: "eloan 백테스트가 업비트 API 의 데이터를 그대로 사용하므로, eloan 에서 검증한 전략을 업비트에서 실전 거래로 옮기는 흐름이 자연스럽습니다. 백테스트 결과는 슬리피지·체결지연 때문에 실전 대비 10~20% 할인해서 보는 게 안전합니다." },
            ],
            relatedKeywords: [
              "업비트 가입",
              "업비트 케이뱅크",
              "업비트 수수료",
              "업비트 API",
              "업비트 vs 빗썸",
              "한국 코인 거래소",
              "업비트 스테이킹",
              "업비트 세금 신고",
              "비트코인 KRW 거래",
              "Upbit 거래량",
            ],
          },
        },
        {
          name: "빗썸",
          url: "https://www.bithumb.com",
          blurb: "한국 2위. 일부 알트는 업비트보다 빠름.",
          details:
            "빗썸코리아에서 운영합니다. 거래량은 업비트보다 작지만 일부 알트코인은 업비트 상장 전에 먼저 풀리는 경우가 있습니다. 거래 수수료는 0.04% 로 업비트(0.05%) 보다 다소 저렴하며 메이커·테이커가 동일합니다.",
          useCases: [
            "업비트 미상장 알트",
            "수수료 0.04% (업비트 0.05%)",
            "국내 2번째 옵션",
          ],
          pricing: "free",
          pricingNote: "수수료 0.04%",
          alternatives: ["업비트", "코빗"],
          founded: "2014",
          korean: true,
        },
        {
          name: "코빗",
          url: "https://www.korbit.co.kr",
          blurb: "신한금융이 인수. 안정성과 법적 보호.",
          details:
            "신한금융그룹이 인수한 거래소입니다. 거래량은 작은 편이지만 신한과 연동되는 법적 보호와 자금 안정성이 명확해 보수적인 투자자가 보조 거래소로 자주 활용합니다.",
          useCases: [
            "법적 보호 중시",
            "신한 사용자 (계좌 연동)",
            "보조 거래소 분산",
          ],
          pricing: "free",
          pricingNote: "수수료 0.1%",
          alternatives: ["업비트", "빗썸"],
          founded: "2013",
          korean: true,
        },
      ],
    },
    {
      title: "🌍 거래소 (해외)",
      items: [
        {
          name: "Binance",
          url: "https://www.binance.com",
          blurb: "글로벌 1위. 알트·선물·스테이킹 종합.",
          details:
            "글로벌 1위 거래소입니다. 알트코인 종류, 선물·옵션·스테이킹·런치풀 등 상품 다양성이 가장 풍부합니다. 한국 사용자는 KYC 통과 후 USDT 입금으로 사용하며, 한국 미상장 알트 대응에 활용됩니다.",
          useCases: [
            "글로벌 알트코인 거래",
            "선물·옵션·스테이킹",
            "USDT 페어 시세",
            "한국 미상장 코인",
          ],
          pricing: "freemium",
          pricingNote: "수수료 0.1% (BNB 결제 시 25% 할인)",
          alternatives: ["Bybit", "OKX"],
          founded: "2017",
          korean: true,
        },
        {
          name: "Bybit",
          url: "https://www.bybit.com",
          blurb: "선물 거래 강자. UI 깔끔.",
          details:
            "글로벌 2~3위 거래소로 선물·파생 거래에 특화되어 있습니다. UI 가 Binance 보다 깔끔하다는 평가가 있으며 신규 코인 상장 속도도 빠른 편입니다. KYC 와 USDT 입금으로 사용합니다.",
          useCases: [
            "코인 선물 거래",
            "깔끔한 UI",
            "신규 상장 빠름",
          ],
          pricing: "freemium",
          pricingNote: "현물 0.1% / 선물 메이커 0.02% 테이커 0.055%",
          alternatives: ["Binance", "OKX"],
          founded: "2018",
          korean: true,
        },
        {
          name: "OKX",
          url: "https://www.okx.com",
          blurb: "Web3 지갑·DeFi 통합 글로벌 거래소.",
          details:
            "글로벌 톱 5 거래소로 중앙화 거래소, Web3 지갑, DeFi 거래, NFT 마켓플레이스가 한 앱에 통합되어 있습니다. 신규 알트, DeFi, 체인별 토큰 접근이 빠르며 KYC 가 필요합니다. 한국어를 지원합니다.",
          useCases: [
            "Web3 지갑 + 거래소 통합",
            "DeFi·NFT 한 앱에서",
            "다양한 체인 신규 토큰",
            "Binance·Bybit 보조",
          ],
          pricing: "freemium",
          pricingNote: "현물 0.1% / 선물 메이커 0.02% 테이커 0.05%",
          alternatives: ["Binance", "Bybit"],
          founded: "2017",
          korean: true,
        },
      ],
    },
    {
      title: "📊 시세 / 종합 데이터",
      items: [
        {
          name: "CoinGecko",
          url: "https://www.coingecko.com",
          blurb: "광고 적은 코인 시세 표준.",
          details:
            "싱가포르에서 운영합니다. CoinMarketCap 대비 광고가 적어 데이터 가독성이 좋다는 평가가 있습니다. DeFi, NFT, 체인별 통계가 디테일하고 API 무료 한도가 큽니다. 본 사이트(eloan) 의 외부 시세 조회에도 일부 사용됩니다.",
          useCases: [
            "알트코인·DeFi·NFT 데이터",
            "체인별 자금흐름",
            "광고 적은 시세 조회",
            "API 무료 사용",
          ],
          pricing: "freemium",
          pricingNote: "무료 / API Pro $129/월~",
          alternatives: ["CoinMarketCap", "CoinPaprika"],
          founded: "2014",
          korean: true,
        },
        {
          name: "CoinMarketCap",
          url: "https://coinmarketcap.com",
          blurb: "글로벌 시총·도미넌스 표준.",
          details:
            "Binance 의 자회사입니다. 1만+ 코인 시세, 거래소별 가격, BTC 도미넌스, 공포·탐욕 지수 등 매크로 지표를 제공합니다. 광고 비중이 늘어 메인 페이지가 다소 복잡한 편입니다.",
          useCases: [
            "글로벌 시총 순위",
            "거래소별 가격 비교",
            "공포·탐욕 지수",
            "신규 상장 코인 발견",
          ],
          pricing: "free",
          alternatives: ["CoinGecko"],
          founded: "2013",
          korean: true,
        },
        {
          name: "네이버 증권",
          url: "https://finance.naver.com",
          blurb: "한국 주식 시세·차트·재무 통합.",
          details:
            "네이버 공식 서비스입니다. 한국에서 주식 시세를 보는 가장 빠른 경로로 KOSPI·KOSDAQ 시세, 차트, 재무, 뉴스, 종목 토론이 한 페이지에 모여 있습니다. 종목 토론은 노이즈가 많지만 단기 시장 심리 파악에 사용됩니다.",
          useCases: [
            "한국 주식 실시간 시세",
            "종목 재무·차트",
            "환율·세계지수",
            "종목 토론 (단기 심리)",
          ],
          pricing: "free",
          alternatives: ["다음 금융", "Yahoo Finance"],
          founded: "2002",
          korean: true,
        },
        {
          name: "Yahoo Finance",
          url: "https://finance.yahoo.com",
          blurb: "글로벌 주식·ETF·CSV 다운로드.",
          details:
            "글로벌 주식, ETF, 외환, 암호화폐 시세가 통합되어 있습니다. 과거 시세 CSV 다운로드가 무료로 제공되어 데이터 분석과 백테스트의 1차 소스로 자주 사용됩니다. 한국 종목(.KS·.KQ) 도 일부 지원합니다.",
          useCases: [
            "미국·글로벌 주식 시세",
            "과거 데이터 CSV 다운로드",
            "ETF·뮤추얼펀드",
            "실적 발표 일정",
          ],
          pricing: "free",
          alternatives: ["네이버 증권", "finviz"],
          founded: "1997",
        },
        {
          name: "finviz",
          url: "https://finviz.com",
          blurb: "미국 주식 스크리너 1등. 히트맵.",
          details:
            "미국 주식 스크리닝(필터) 사이트입니다. PER, PBR, 배당률 등 100개 이상의 지표로 종목 필터링이 빠릅니다. 메인 화면의 S&P500 히트맵이 시각화 표준으로 사용됩니다.",
          useCases: [
            "미국 주식 스크리닝",
            "S&P500 히트맵",
            "기술적·기본적 필터",
            "ETF 비교",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Elite $39.5/월",
          alternatives: ["Yahoo Finance"],
          founded: "2007",
        },
      ],
    },
    {
      title: "🔬 온체인 / 데이터 분석",
      items: [
        {
          name: "Glassnode",
          url: "https://glassnode.com",
          blurb: "BTC·ETH 온체인 표준. 무료 차트만으로도 활용 가능.",
          details:
            "스위스에서 운영하는 BTC·ETH 온체인 지표의 사실상 표준 사이트입니다. SOPR, MVRV, HODL Waves 등 학술 논문에 인용되는 지표가 다수 포함되어 있습니다. 무료 플랜은 24시간 지연 데이터지만 매크로 분석에는 충분합니다.",
          useCases: [
            "BTC 사이클 분석 (MVRV·SOPR)",
            "장기·단기 보유자 흐름",
            "거래소 입출금",
            "온체인 데이터 학습",
          ],
          pricing: "freemium",
          pricingNote: "무료 (24시간 지연) / Advanced $39/월~",
          alternatives: ["CryptoQuant", "Dune"],
          founded: "2018",
        },
        {
          name: "DefiLlama",
          url: "https://defillama.com",
          blurb: "DeFi TVL·자금흐름. 100% 무료.",
          details:
            "오픈소스로 운영되며 광고 없이 100% 무료입니다. 모든 체인의 DeFi 프로토콜 TVL(Total Value Locked), 수익률, 스테이블코인 발행량을 통합 추적합니다. API 도 무료로 제공됩니다.",
          useCases: [
            "DeFi 프로토콜 TVL 비교",
            "체인별 자금 유입·유출",
            "스테이블코인 발행량",
            "수익률 농사 비교",
          ],
          pricing: "free",
          alternatives: ["Token Terminal"],
          founded: "2020",
        },
        {
          name: "Dune",
          url: "https://dune.com",
          blurb: "온체인 SQL 대시보드. 타인 대시보드 무료 열람.",
          details:
            "이더리움, 솔라나 등 주요 체인의 온체인 데이터를 SQL 로 쿼리해 대시보드를 만드는 플랫폼입니다. 본인이 쿼리를 짜지 않아도 커뮤니티가 만든 수만 개의 대시보드를 무료로 조회할 수 있습니다. NFT 마켓플레이스 점유율, L2 트랜잭션 비교 등이 대표적입니다.",
          useCases: [
            "커뮤니티 대시보드 무료 열람",
            "본인 SQL 쿼리 작성",
            "NFT·L2·DEX 트래픽",
            "온체인 데이터 학습",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Plus $390/월~",
          alternatives: ["Flipside Crypto"],
          founded: "2018",
        },
        {
          name: "CryptoQuant",
          url: "https://cryptoquant.com",
          blurb: "한국 스타트업의 글로벌 온체인 분석.",
          details:
            "한국 스타트업이 운영하는 글로벌 온체인 분석 플랫폼입니다. 거래소 입출금 흐름, 채굴자 행동, 스테이블코인 유입 등 매크로 시장 분석에 강점이 있으며 한국어 인터페이스를 지원합니다.",
          useCases: [
            "거래소 입출금 흐름 (가격 선행)",
            "채굴자 매도 압력",
            "스테이블코인 거래소 유입",
            "한국어 분석 콘텐츠",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Pro $39/월~",
          alternatives: ["Glassnode"],
          founded: "2018",
          korean: true,
        },
        {
          name: "Token Terminal",
          url: "https://tokenterminal.com",
          blurb: "코인 프로젝트 매출·이익 데이터.",
          details:
            "코인 프로젝트의 매출, 이익, 사용자수 등을 전통 재무 데이터로 변환해 보여주는 사이트입니다. P/S, P/E 비율로 코인 밸류에이션을 비교할 수 있습니다. 메인 지표는 무료로 제공됩니다.",
          useCases: [
            "코인 프로젝트 매출·이익",
            "P/E·P/S 밸류에이션",
            "프로토콜 펀더멘털",
            "VC 가 보는 데이터",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Pro $349/월",
          alternatives: ["DefiLlama"],
          founded: "2017",
        },
      ],
    },
    {
      title: "🇰🇷 한국 주식 / 공시",
      items: [
        {
          name: "한경 컨센서스",
          url: "https://consensus.hankyung.com",
          blurb: "증권사 애널리스트 리포트 무료.",
          details:
            "한국경제신문에서 운영합니다. 한국 30+ 증권사의 종목·산업·이코노믹 리포트를 가입 없이 PDF 로 다운로드할 수 있습니다. 종목 분석의 1차 출처로 가장 빠르며 외국계 증권사 리포트도 일부 포함됩니다.",
          useCases: [
            "종목별 애널리스트 리포트",
            "산업 분석 보고서",
            "이코노믹 리뷰",
            "리포트 컨센서스 (목표주가)",
          ],
          pricing: "free",
          founded: "2010",
          korean: true,
        },
        {
          name: "전자공시 DART",
          url: "https://dart.fss.or.kr",
          blurb: "금감원 전자공시. 사업·반기·분기보고서.",
          details:
            "금융감독원 공식 전자공시 시스템입니다. 상장사와 외부감사 대상 기업의 모든 공시(사업·반기·분기·감사·증권신고서) 가 무료로 열람·다운로드됩니다. 종목 분석의 1차 출처로 한경 컨센서스 리포트의 원천 자료도 결국 DART 입니다.",
          useCases: [
            "사업·반기·분기보고서",
            "감사보고서 (재무제표 원본)",
            "최대주주·임원 변경",
            "유상증자·전환사채 공시",
          ],
          pricing: "free",
          founded: "1999",
          korean: true,
        },
        {
          name: "KRX 정보데이터시스템",
          url: "https://data.krx.co.kr",
          blurb: "한국거래소 공식. CSV 다운로드.",
          details:
            "한국거래소(KRX) 공식 데이터 포털입니다. 종목, 지수, 파생, ETF 의 과거 데이터(시·고·저·종·거래량) 가 일별로 CSV 다운로드됩니다. 본인이 직접 백테스트·분석할 때 가장 신뢰할 수 있는 한국 시장 1차 데이터입니다.",
          useCases: [
            "한국 주식 과거 데이터 CSV",
            "지수·ETF·파생 데이터",
            "공매도·외국인 지분 통계",
            "직접 백테스트용",
          ],
          pricing: "free",
          alternatives: ["Yahoo Finance (KS·KQ)"],
          founded: "1956",
          korean: true,
        },
        {
          name: "38커뮤니케이션",
          url: "https://www.38.co.kr",
          blurb: "장외 비상장 주식 시세·IPO 정보.",
          details:
            "장외(K-OTC 포함) 비상장 주식의 시세와 매매 정보를 제공합니다. IPO 예정과 청약 일정 정리가 한국에서 가장 빠르고 정확한 것으로 알려져 있습니다. UI 는 옛 스타일이지만 데이터의 정확도가 높아 트레이더가 매일 확인합니다.",
          useCases: [
            "비상장 주식 시세",
            "IPO 청약 일정",
            "장외 매매",
            "공모주 분석",
          ],
          pricing: "free",
          founded: "2000",
          korean: true,
        },
      ],
    },
  ],
  faq: [
    {
      q: "eloan 백테스트와 TradingView 백테스트의 차이는 무엇인가요?",
      a: "eloan 은 한국 KRW 코인 시장에 특화되어 업비트 데이터를 그대로 사용하며 12종 빌트인 전략을 코드 없이 클릭으로 검증할 수 있습니다. TradingView 는 글로벌 전 시장(주식·코인·외환) 을 다루지만 본인 전략은 Pine Script 코드로 직접 작성해야 합니다. 간단한 검증과 결과 공유는 eloan, 복잡한 본인 전략 개발은 TradingView 가 효율적입니다.",
    },
    {
      q: "백테스트 결과를 실전에 그대로 적용해도 되나요?",
      a: "그대로 적용하면 위험합니다. 백테스트는 슬리피지, 체결지연, 시장 충격을 완벽히 반영하지 못합니다. 본 사이트도 백테스트 결과에 10~20% 할인을 적용해 실전 기대치를 잡는 방법이 안전하며, 실전 진입 전 소액으로 모의·실전 비교를 한 달 이상 거치는 단계가 필요합니다.",
    },
    {
      q: "온체인 데이터는 어디부터 시작해야 하나요?",
      a: "Glassnode 무료 차트의 SOPR(Spent Output Profit Ratio), MVRV(Market Value to Realized Value), HODL Waves 세 가지 지표부터 시작하는 방법이 일반적입니다. BTC 사이클의 거시 위치를 한눈에 파악할 수 있는 핵심 지표입니다. 다음 단계로 DefiLlama TVL 과 Dune 커뮤니티 대시보드로 확장할 수 있습니다.",
    },
    {
      q: "한경 컨센서스의 애널리스트 리포트는 신뢰할 만한가요?",
      a: "리포트는 작성 시점의 의견이며 증권사는 종목을 거래하는 이해관계자라는 점을 고려해야 합니다. 목표주가보다 실적 추정치, 산업 분석, 경쟁사 비교 같은 객관 데이터를 보는 방법이 효과적입니다. 같은 종목의 여러 증권사 리포트를 교차 비교(컨센서스) 하는 방법이 단일 리포트보다 안전합니다.",
    },
    {
      q: "DART 공시는 양이 많은데 어떤 것부터 봐야 하나요?",
      a: "투자 목적이라면 사업보고서(연 1회, 가장 디테일), 분기보고서(분기별 실적 추세), 주요사항보고서(유상증자·전환사채·합병 등 가격 변동 이벤트) 세 가지를 우선 확인하면 90% 가량 커버됩니다. Open DART API 를 활용하면 관심 종목의 신규 공시 자동 알림도 가능합니다.",
    },
    {
      q: "코인·주식 차트는 어디가 가장 정확한가요?",
      a: "거래소의 직접 차트가 1차 출처입니다. 한국 코인은 업비트, 미국 주식은 NYSE·NASDAQ, 한국 주식은 KRX 입니다. 종합 플랫폼은 TradingView 가 동기화와 지연 면에서 가장 정확합니다. 네이버 증권은 5~15분, Yahoo Finance 는 미국 종목 기준 15분 지연이 기본 사양입니다.",
    },
    {
      q: "주식·코인 API 를 무료로 사용하려면 어디가 좋나요?",
      a: "한국 코인은 업비트 공개 API(분당 1만회 무료), 글로벌 코인은 CoinGecko 무료 플랜(분당 30회), 한국 주식은 한국투자증권·키움증권의 OpenAPI(계좌 보유 시 무료), 글로벌 주식은 Yahoo Finance 비공식 라이브러리(yfinance) 와 Alpha Vantage 무료 플랜이 대표적입니다.",
    },
    {
      q: "국내 거래소와 해외 거래소를 모두 사용하는 편이 좋은가요?",
      a: "일반적입니다. 국내(업비트·빗썸) 는 KRW 입출금이 편하고 알트도 빠르게 상장되며, 해외(Binance·Bybit·OKX) 는 글로벌 알트, 선물, 스테이킹이 종합적으로 제공됩니다. 한국 미상장 알트 대응이 빨라지는 효과도 있습니다. 양쪽 KYC 인증을 마쳐두면 USDT 송금만으로 자금을 옮길 수 있습니다.",
    },
  ],
};

// ===========================================================================
// 허브 FAQ
// ===========================================================================
export const HUB_FAQ: FaqEntry[] = [
  {
    q: "주소모음 사이트는 어떤 기준으로 선정되나요?",
    a: "합법·공식 서비스(정부·공공기관·메이저 운영사), 한국에서 가입·결제·이용이 가능한 서비스, 공식 사이트 직링크라는 세 가지 기준으로 선정됩니다.",
  },
  {
    q: "도박·성인·불법 스트리밍 같은 주소모음도 있나요?",
    a: "없습니다. 합법·공식 큐레이션만 다루며 회색지대 콘텐츠는 등록하지 않습니다.",
  },
  {
    q: "여기 등록되지 않은 좋은 사이트를 제안할 수 있나요?",
    a: "외부 제안은 받지 않습니다. 합법·공식 서비스이며 한국 사용자에게 가치가 높다고 판단되는 경우 자체 검토 후 추가됩니다.",
  },
];

// ===========================================================================
// Export
// ===========================================================================
export const PICK_CATEGORIES: PickCategory[] = [AI, MONEY, FREE, COIN];

export const PICK_BY_SLUG: Record<PickCategorySlug, PickCategory> = {
  ai: AI,
  money: MONEY,
  free: FREE,
  coin: COIN,
};

export function getPickCategory(slug: string): PickCategory | null {
  if (slug in PICK_BY_SLUG) return PICK_BY_SLUG[slug as PickCategorySlug];
  return null;
}

export function totalPickCount(): number {
  return PICK_CATEGORIES.reduce(
    (sum, c) => sum + c.groups.reduce((s, g) => s + g.items.length, 0),
    0,
  );
}

export function pricingLabel(p: Pricing): string {
  switch (p) {
    case "free":
      return "무료";
    case "freemium":
      return "무료+유료";
    case "paid":
      return "유료";
  }
}

// hubSlug 가 있는 PickItem 만 모은 형태 (sub-페이지 라우트 생성용)
export type HubEntry = {
  categorySlug: PickCategorySlug;
  hubSlug: string;
  item: PickItem;
};

// 모든 PickItem 에 안정적인 slug 를 부여한다.
// 1. hubSlug 가 명시되었으면 그대로 사용
// 2. 외부 URL 은 hostname 기반 (예: chat.openai.com → chat-openai-com)
// 3. 내부 라우트(/backtest) 는 경로 그대로 (backtest)
export function autoSlug(item: PickItem): string {
  if (item.hubSlug) return item.hubSlug;
  if (item.url.startsWith("/")) {
    return item.url.replace(/^\//, "").replace(/\//g, "-") || "item";
  }
  try {
    const host = new URL(item.url).hostname.replace(/^www\./, "");
    return host.replace(/\./g, "-");
  } catch {
    return "item";
  }
}

export function listHubs(): HubEntry[] {
  const out: HubEntry[] = [];
  const seen = new Set<string>();
  for (const cat of PICK_CATEGORIES) {
    for (const g of cat.groups) {
      for (const it of g.items) {
        let slug = autoSlug(it);
        let key = `${cat.slug}/${slug}`;
        let dedup = 2;
        while (seen.has(key)) {
          slug = `${autoSlug(it)}-${dedup++}`;
          key = `${cat.slug}/${slug}`;
        }
        seen.add(key);
        out.push({ categorySlug: cat.slug, hubSlug: slug, item: it });
      }
    }
  }
  return out;
}

export function getHub(
  categorySlug: string,
  hubSlug: string,
): HubEntry | null {
  for (const e of listHubs()) {
    if (e.categorySlug === categorySlug && e.hubSlug === hubSlug) return e;
  }
  return null;
}
