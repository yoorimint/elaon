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
  hubSlug?: string;     // 있으면 /picks/{cat}/{hub} 별도 페이지 생성
  subItems?: SubItem[];
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
              details: "본인·세대 주민등록표 등본·초본을 PDF 로 즉시 발급. 인쇄 또는 전자문서 보관 가능. 발급 수수료 무료.",
              amount: "무료 (오프라인 수수료 400원 → 온라인 0원)",
              eligibility: "본인 또는 세대원",
              applyWhen: "24시간",
              url: "https://www.gov.kr/portal/main",
            },
            {
              name: "가족관계증명서",
              blurb: "본인·가족 발급 무료",
              url: "https://www.gov.kr/portal/main",
            },
            {
              name: "보조금24",
              blurb: "받을 수 있는 보조금 자동 매칭",
              url: "https://www.gov.kr/portal/subsidy24/cmm/main",
            },
            {
              name: "민원·증명서 발급",
              blurb: "300+ 증명서 통합 발급",
              url: "https://www.gov.kr/portal/civilService",
            },
            {
              name: "나의 혜택",
              blurb: "본인 자격 정부지원금 자동 진단",
              url: "https://www.gov.kr/portal/main",
            },
            {
              name: "정부 서비스 검색",
              blurb: "부처별·키워드별 검색",
              url: "https://www.gov.kr",
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
              details: "본인의 소득·재산·가구원 정보를 입력하면 받을 수 있는 복지급여 항목과 예상 금액이 자동 표시됩니다. 신청 전 자격 확인 도구.",
              eligibility: "전 국민",
              applyWhen: "수시",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "청년월세 한시 특별지원",
              blurb: "월 최대 20만원 × 12개월",
              details: "만 19~34세 무주택 청년에게 월세를 최대 12개월간 지원합니다. 본인 중위소득 60% 이하 + 원가구 중위소득 100% 이하 조건.",
              amount: "월 최대 20만원 × 12개월 (총 240만원)",
              eligibility: "만 19~34세, 본인 중위소득 60% 이하",
              applyWhen: "수시 (예산 소진 시 종료)",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "기초생활보장",
              blurb: "생계·의료·주거·교육 4대 급여",
              details: "기준 중위소득 30~50% 이하 가구에 생계급여(중위 32%), 의료급여(중위 40%), 주거급여(중위 48%), 교육급여(중위 50%)를 차등 지원합니다.",
              amount: "4인 가구 생계급여 최대 약 195만원/월 (2026 기준)",
              eligibility: "기준 중위소득 30~50% 이하",
              applyWhen: "수시",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "긴급복지 지원",
              blurb: "위기 가구 단기 생계비",
              details: "주소득자 사망·실직, 중한 질병, 가정폭력 등 위기 사유 발생 시 생계·주거·의료·교육비를 신속 지원합니다. 사후 조사로 자격 확인.",
              amount: "4인 가구 생계지원 약 162만원/월 (최대 6회)",
              eligibility: "위기 사유 + 소득·재산 기준",
              applyWhen: "긴급 시 즉시",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "한부모가족 지원",
              blurb: "양육비·교육비·주거 지원",
              details: "한부모·조손 가구에 아동양육비, 학용품비, 한부모가족 시설 입소, 무이자 자녀 학자금 등을 지원합니다.",
              amount: "아동양육비 월 21만원 (만 18세 미만)",
              eligibility: "한부모·조손 가구, 중위소득 63~100% 이하",
              applyWhen: "수시",
              url: "https://www.bokjiro.go.kr",
            },
            {
              name: "장애인 활동지원",
              blurb: "활동지원사 시간제 파견",
              details: "만 6~65세 등록 장애인을 대상으로 활동지원사가 신변보호·가사·이동 등을 시간 단위로 지원합니다. 장애 정도에 따라 월 지원 시간 차등.",
              amount: "월 최대 480시간 (장애 등급별)",
              eligibility: "만 6~65세 등록 장애인",
              applyWhen: "수시",
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
              blurb: "전 은행·증권·저축은행 통합",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "내 카드 한눈에",
              blurb: "발급 카드·한도·연회비",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "잠자는 내 돈 찾기",
              blurb: "휴면예금·휴면보험금",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "내 연금 한눈에",
              blurb: "국민·퇴직·개인연금 통합",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "자동이체 통합관리",
              blurb: "자동이체·납부 일괄 조회·해지",
              url: "https://fine.fss.or.kr/main/fin_lf/lf01_intro.do",
            },
            {
              name: "신용정보 조회",
              blurb: "신용평점·신용정보 무료",
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
              url: "https://www.hometax.go.kr",
            },
            {
              name: "5월 종합소득세 신고",
              blurb: "프리랜서·사업자·이중소득",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "1월 연말정산 간소화",
              blurb: "소득·세액공제 증빙 자동",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "경정청구 (과거 5년)",
              blurb: "누락된 공제 재신청·환급",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "부가가치세 신고",
              blurb: "사업자 1·7월",
              url: "https://www.hometax.go.kr",
            },
            {
              name: "현금영수증 조회",
              blurb: "본인·가족 사용 내역",
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
              url: "https://www.work24.go.kr",
            },
            {
              name: "국민내일배움카드",
              blurb: "연 500만원 직업훈련비",
              url: "https://www.work24.go.kr",
            },
            {
              name: "국민취업지원제도",
              blurb: "월 50만원 × 6개월",
              url: "https://www.work24.go.kr",
            },
            {
              name: "청년구직활동지원금",
              blurb: "구직 청년 활동 지원",
              url: "https://www.work24.go.kr",
            },
            {
              name: "워크넷 구인구직",
              blurb: "공식 구직 매칭",
              url: "https://www.work24.go.kr",
            },
            {
              name: "직업훈련 (HRD-Net)",
              blurb: "내일배움카드로 신청 가능",
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
              blurb: "최대 1억원, 예비창업자",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "초기창업패키지",
              blurb: "창업 3년 이내, 최대 1억원",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "청년창업사관학교",
              blurb: "만 39세 이하, 최대 1억원",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "TIPS (딥테크 팁스)",
              blurb: "기술창업 R&D 최대 5억원",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "창업도약패키지",
              blurb: "창업 3~7년, 최대 3억원",
              url: "https://www.k-startup.go.kr",
            },
            {
              name: "정부지원 사업 공고",
              blurb: "전체 사업 일정 통합",
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
              url: "https://www.nhis.or.kr",
            },
            {
              name: "본인부담상한제 환급금",
              blurb: "초과 의료비 자동 환급",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "건강보험료 조회·정정",
              blurb: "본인 부담액·정정 신청",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "피부양자 등록·확인",
              blurb: "가족 피부양자 자격",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "임신·출산 진료비 지원",
              blurb: "100만원 바우처 (다태아 140만원)",
              url: "https://www.nhis.or.kr",
            },
            {
              name: "건강iN (마이헬스뱅크)",
              blurb: "본인 건강검진 결과·진료 이력",
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

export function listHubs(): HubEntry[] {
  const out: HubEntry[] = [];
  for (const cat of PICK_CATEGORIES) {
    for (const g of cat.groups) {
      for (const it of g.items) {
        if (it.hubSlug && it.subItems && it.subItems.length > 0) {
          out.push({ categorySlug: cat.slug, hubSlug: it.hubSlug, item: it });
        }
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
