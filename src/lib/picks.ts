// 주소모음 (Curated link directory) — SEO 깊이를 위한 풍부한 데이터 모델.
//
// 콘텐츠 작성 원칙:
//  - 검색자가 실제로 알고 싶어하는 정보 (가격·언제 쓰나·대안)
//  - 단순 광고 카피가 아닌 큐레이터 관점의 평가
//  - 한국 사용자 기준 ("X 대비 좋은 점", "한국어 지원")
//  - 합법·공식 서비스만 (도박/성인/불법 스트리밍 X)

export type PickCategorySlug = "ai" | "money" | "free" | "coin";

export type Pricing =
  | "free" // 완전 무료 (계정 가입 무관)
  | "freemium" // 무료 + 유료 플랜
  | "paid"; // 유료만

export type PickItem = {
  name: string;
  url: string;
  blurb: string; // 한 줄 요약 (검색결과 노출용, 60자 내외)
  details: string; // 2~3 문장 설명 (본문 콘텐츠)
  useCases: string[]; // "이럴 때 쓴다" 시나리오 (검색 의도 매칭)
  pricing: Pricing;
  pricingNote?: string; // 무료 한도, 학생 할인 등
  tip?: string; // 실전 사용 팁 1줄
  alternatives?: string[]; // 같은 카테고리 내 대체재 이름
  korean?: boolean; // 한국어 지원/한국 서비스
  founded?: string; // 출시 연도 (신뢰도 시그널)
};

export type PickGroup = {
  title: string;
  items: PickItem[];
};

export type FaqEntry = {
  q: string;
  a: string; // Markdown 불가, 일반 텍스트 (FAQ JSON-LD 호환)
};

export type PickCategory = {
  slug: PickCategorySlug;
  title: string; // h1 / og:title
  metaTitle: string; // <title> (60자 내외)
  shortTitle: string; // nav, breadcrumb
  emoji: string;
  oneLiner: string; // 카드 노출용 짧은 요약
  description: string; // meta description (155자 내외)
  longIntro: string[]; // 페이지 상단 본문 (3~5 단락)
  selectionCriteria: string[]; // 선정 기준 (불릿)
  groups: PickGroup[];
  faq: FaqEntry[]; // 카테고리당 6~8개
  relatedKeywords: string[]; // 페이지 하단 "관련 검색어"
  updatedAt: string; // YYYY-MM-DD
};

const TODAY = "2026-05-13";

// ---------------------------------------------------------------------------
// 1. AI 도구 모음
// ---------------------------------------------------------------------------
const AI: PickCategory = {
  slug: "ai",
  title: "AI 도구 모음 2026 — 글쓰기·이미지·영상·코딩 베스트 정리",
  metaTitle: "AI 도구 모음 2026 — 한국에서 바로 쓰는 베스트 19선",
  shortTitle: "AI 도구",
  emoji: "🤖",
  oneLiner: "한국에서 바로 쓸 수 있는 AI 도구를 용도별로 정리했습니다.",
  description:
    "2026년 최신. ChatGPT·Claude·Gemini·Midjourney·Suno 등 글쓰기·이미지·영상·음성·코딩 AI 도구 19종을 한국 사용자 기준으로 평가·비교합니다. 무료/유료, 한국어 지원 여부, 실전 사용 팁까지.",
  longIntro: [
    "ChatGPT 가 등장한 지 3년이 지났고, 2026년 현재 'AI 도구' 라는 단어는 더 이상 뉴스가 아닙니다. 문제는 매주 신규 서비스가 쏟아져 어떤 걸 실제로 써야 할지 가려내기 힘들다는 것. 이 페이지는 본 사이트 운영자가 직접 유료 결제까지 해보며 6개월 이상 검증한 도구만 추렸습니다.",
    "선정 기준은 단순합니다. ① 한국에서 결제·이용 가능, ② 한국어 결과물 품질이 영어 대비 70% 이상, ③ 출시 1년 이상으로 서비스 안정성 확보. 이 세 가지를 모두 만족하지 못하는 서비스는 아무리 화제여도 제외했습니다. 특히 '한 달만 쓰고 폐업' 하는 AI 스타트업이 많아, 매월 1회 전수 점검합니다.",
    "용도별 추천을 빠르게 정리하면 — 일상 대화·글쓰기는 ChatGPT(범용 1등) 또는 Claude(긴 문서·코드), 검색·리서치는 Perplexity, 이미지는 Midjourney(고품질) 또는 ChatGPT 내장 DALL·E(한국어 프롬프트 친화), 영상은 Runway, 음악은 Suno, 음성 합성은 ElevenLabs, 코딩 보조는 Cursor 또는 Claude Code, 번역은 DeepL 입니다.",
    "주의할 점도 있습니다. 모든 AI 서비스는 입력 내용을 학습 데이터로 사용할 수 있어, **회사 기밀·개인정보·고객 데이터는 절대 그대로 붙여넣지 마세요**. 유료 플랜의 '학습 거부(opt-out)' 옵션을 활성화하거나, 민감 정보는 가명화 후 사용하는 게 안전합니다.",
  ],
  selectionCriteria: [
    "한국 IP·결제수단으로 가입·이용 가능한 서비스만",
    "한국어 입력·출력 품질을 직접 테스트해 영어 대비 70% 이상 확인",
    "서비스 출시 1년 이상 또는 메이저 기업 운영으로 폐업 리스크 낮음",
    "공식 사이트 직링크만 등록 (어필리에이트 링크 X)",
  ],
  updatedAt: TODAY,
  relatedKeywords: [
    "AI 도구 추천",
    "무료 AI 사이트",
    "ChatGPT 대안",
    "AI 그림 그리기",
    "AI 영상 만들기",
    "한국어 AI",
    "업무용 AI",
    "코딩 AI",
  ],
  groups: [
    {
      title: "💬 대화형 / 글쓰기",
      items: [
        {
          name: "ChatGPT",
          url: "https://chat.openai.com",
          blurb: "OpenAI 의 대표 챗봇. 범용성 1위, 무료 플랜으로도 충분.",
          details:
            "GPT-5 기반의 OpenAI 공식 챗봇으로, 2026년 현재 전 세계 월 활성 사용자 7억+. 무료 플랜에서도 GPT-5 일부 사용량과 이미지 생성(DALL·E 3)·검색·코드 인터프리터 등 핵심 기능을 모두 제공합니다. 한국어 품질은 모든 AI 중 가장 안정적이며, 음성 모드는 한국어 동시통역 수준에 근접.",
          useCases: [
            "이메일·보고서 초안 작성",
            "코드 디버깅·리팩터링",
            "엑셀·차트 데이터 분석 (이미지 업로드)",
            "한국어 회화 연습·번역",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Plus $20/월 / Pro $200/월",
          tip: "무료 플랜은 일일 사용량 한도가 있으니 긴 글은 한 번에 끝내고, 'Custom Instructions' 에 본인 직업·말투를 미리 입력해두면 매번 같은 톤 유지.",
          alternatives: ["Claude", "Gemini", "뤼튼"],
          founded: "2022",
          korean: true,
        },
        {
          name: "Claude",
          url: "https://claude.ai",
          blurb: "Anthropic 의 챗봇. 긴 문서·코드·정확한 한국어가 강점.",
          details:
            "Anthropic 의 Claude Opus 4.x / Sonnet 4.x 시리즈 기반. 200K 토큰(약 한국어 단행본 1권) 컨텍스트를 한 번에 처리해 긴 PDF·계약서·논문 요약에 압도적입니다. 한국어 어휘 선택과 문장 결이 ChatGPT 대비 더 자연스럽다는 평가가 많고, 코드 리뷰·리팩터링 정확도도 1티어.",
          useCases: [
            "긴 PDF·논문·계약서 통째로 요약·분석",
            "코드 베이스 리뷰·리팩터링 (Claude Code 와 연동)",
            "한국어 카피·시나리오 라이팅",
            "민감 콘텐츠 검열 시 거절 가능성 낮음 (창작 친화)",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Pro $20/월 / Max $100/월~",
          tip: "프로젝트 기능에 자료를 미리 넣어두면 같은 맥락에서 계속 대화 가능. 무료 플랜에도 Projects 지원됨.",
          alternatives: ["ChatGPT", "Gemini"],
          founded: "2023",
          korean: true,
        },
        {
          name: "Gemini",
          url: "https://gemini.google.com",
          blurb: "Google 의 멀티모달 AI. Gmail·문서·검색과 통합.",
          details:
            "Google 의 Gemini 2.x Pro/Ultra 기반. 가장 큰 강점은 Google 워크스페이스 통합 — Gmail 본문 자동 작성, Docs 안에서 글 다듬기, Drive 안의 파일 검색·요약을 한 번의 명령으로 처리합니다. YouTube 영상 URL 만 넣어도 자동 요약·번역이 되는 게 다른 AI 와의 차이점.",
          useCases: [
            "Gmail·Docs·Sheets 에서 작업하면서 AI 보조",
            "YouTube 영상 요약·번역",
            "구글 검색 결과를 자동 정리",
            "안드로이드 기본 음성 비서 대체",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Advanced $20/월 (구글 One AI Premium)",
          alternatives: ["ChatGPT", "Claude"],
          founded: "2023",
          korean: true,
        },
        {
          name: "Perplexity",
          url: "https://www.perplexity.ai",
          blurb: "출처 표기까지 해주는 검색형 AI. 리서치·자료조사 최적.",
          details:
            "ChatGPT 가 '답변' 을 준다면, Perplexity 는 '답변 + 출처 링크 5~10개' 를 줍니다. 모든 주장에 각주가 달려 있어 사실 확인이 빠르고, 인용 그대로 가져다 보고서·논문에 쓰기 좋습니다. 한국어로 물어도 영문 출처를 자동 번역해 보여주는 게 큰 장점.",
          useCases: [
            "보고서·논문용 빠른 자료 수집",
            "최신 뉴스·이슈 팩트체크",
            "제품·서비스 비교 리서치",
            "투자 분석 시 1차 출처 추적",
          ],
          pricing: "freemium",
          pricingNote: "무료 (Sonar 모델) / Pro $20/월",
          tip: "Pro 모드는 GPT-5·Claude Opus·Gemini Pro 중 선택해 다중 검색 가능. 무료도 일반 검색용으로 충분.",
          alternatives: ["ChatGPT 검색", "Gemini"],
          founded: "2022",
          korean: true,
        },
        {
          name: "뤼튼 (Wrtn)",
          url: "https://wrtn.ai",
          blurb: "한국 토종 AI 플랫폼. 여러 LLM 을 한 화면에서 무료로 사용.",
          details:
            "한국 스타트업 뤼튼테크놀로지스가 운영. GPT, Claude, 자체 모델 등을 무료로 동시 사용할 수 있는 것이 최대 장점입니다. 한국 사용자 대상 마케팅 카피·자기소개서·블로그 글 같은 한국식 글쓰기 템플릿이 풍부.",
          useCases: [
            "GPT·Claude 동시 비교 (무료)",
            "자기소개서·이력서 한국식 첨삭",
            "블로그·SNS 한국어 카피 라이팅",
            "결제 부담 없이 AI 입문",
          ],
          pricing: "free",
          pricingNote: "광고 기반 무료, 일부 기능 유료",
          alternatives: ["ChatGPT", "Claude"],
          founded: "2022",
          korean: true,
        },
      ],
    },
    {
      title: "🎨 이미지 생성",
      items: [
        {
          name: "Midjourney",
          url: "https://www.midjourney.com",
          blurb: "퀄리티 1티어 유료 이미지 AI. 사진·일러스트 모두 강력.",
          details:
            "Midjourney V7 기준. 영화 컨셉아트·잡지 표지 수준의 미적 완성도가 다른 AI 대비 압도적으로 높습니다. 단점은 100% 유료(무료 체험 거의 없음)와 한국어 프롬프트 정확도가 영어보다 낮은 점. 영어 키워드 위주로 작업해야 진가가 나옵니다.",
          useCases: [
            "포트폴리오·콘셉트아트",
            "고급 상업 광고용 이미지",
            "출판물·잡지 일러스트",
            "유튜브 썸네일 (영문 단어 활용)",
          ],
          pricing: "paid",
          pricingNote: "$10/월 ~ $120/월",
          tip: "프롬프트 끝에 `--style raw --ar 16:9 --s 50` 같은 파라미터 조합을 외워두면 일관된 톤 유지. Discord 가 아닌 웹앱에서 작업 권장.",
          alternatives: ["DALL·E 3", "Leonardo AI"],
          founded: "2022",
        },
        {
          name: "ChatGPT 이미지 (DALL·E 3)",
          url: "https://chat.openai.com",
          blurb: "ChatGPT 안에서 바로 그림 생성. 한국어 프롬프트 가장 잘 이해.",
          details:
            "별도 사이트 없이 ChatGPT 에 '~한 그림 그려줘' 한 줄이면 됩니다. 한국어 프롬프트 이해도가 모든 이미지 AI 중 가장 높고, 캐릭터 일관성·텍스트 렌더링(이미지 안에 한글·영문)이 다른 AI 대비 안정적입니다.",
          useCases: [
            "한국어 명령으로 빠른 이미지 생성",
            "이미지 안에 한글·영문 텍스트 넣기 (포스터)",
            "캐릭터 일관성이 필요한 시리즈물",
            "ChatGPT 대화 중 즉시 시각화",
          ],
          pricing: "freemium",
          pricingNote: "ChatGPT 무료 플랜 일부 / Plus 무제한",
          alternatives: ["Midjourney", "Leonardo AI"],
          founded: "2023",
          korean: true,
        },
        {
          name: "Leonardo AI",
          url: "https://leonardo.ai",
          blurb: "Stable Diffusion 기반, 무료 크레딧 매일 충전.",
          details:
            "매일 150 크레딧(약 50~100장)을 무료로 제공하는 게 최대 장점. Stable Diffusion 기반이라 LoRA·커스텀 모델·캐릭터 학습 등 고급 기능을 웹에서 GUI 로 다룰 수 있습니다. 입문자가 'AI 그림' 체험하기에 가장 부담 없는 옵션.",
          useCases: [
            "무료로 다양한 스타일 실험",
            "Stable Diffusion 입문",
            "캐릭터 디자인 (Character Reference 기능)",
            "썸네일·SNS 이미지 양산",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 150 크레딧 / 유료 $10/월~",
          alternatives: ["DALL·E 3", "Midjourney"],
          founded: "2022",
        },
        {
          name: "Krea AI",
          url: "https://www.krea.ai",
          blurb: "실시간 캔버스 + 업스케일·리얼타임 변환 강점.",
          details:
            "'실시간' 이 핵심 키워드. 캔버스에 손으로 스케치하면 즉시 완성된 이미지로 변환되고, 저화질 이미지를 8K 까지 업스케일하는 기능이 1티어 수준입니다. 영상 생성(Krea Video)도 빠르게 발전 중.",
          useCases: [
            "스케치 → 완성 이미지 (실시간)",
            "저화질 이미지 업스케일",
            "영상 변환·합성",
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
      title: "🎬 영상 / 음악 / 음성",
      items: [
        {
          name: "Runway",
          url: "https://runwayml.com",
          blurb: "텍스트→영상, 이미지→영상 대표 도구. Gen-3 모델.",
          details:
            "영상 생성 AI 의 사실상 표준. Gen-3 Alpha 모델로 5~10초 분량의 고품질 영상을 텍스트나 이미지에서 생성합니다. 광고·뮤직비디오·SNS 릴스 제작 현장에서 실무 사용 중. 비싼 편이지만 결과물 품질이 가격을 상쇄합니다.",
          useCases: [
            "광고·홍보영상 컨셉컷",
            "유튜브·릴스·틱톡 b-roll",
            "기존 영상에서 객체 제거·교체",
            "정지 이미지 → 움직이는 영상",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 125 크레딧 / Standard $15/월~",
          alternatives: ["Pika", "Kling", "Sora"],
          founded: "2018",
        },
        {
          name: "Suno",
          url: "https://suno.com",
          blurb: "가사+장르 입력 → 완성된 노래. 한국어 보컬 가능.",
          details:
            "텍스트로 가사와 장르(예: '로파이 발라드, 슬픈 분위기') 만 적으면 보컬+반주가 완성된 곡이 1~2분 안에 나옵니다. 한국어 발음이 자연스럽고, 무료 플랜으로도 하루 10곡 정도 생성 가능. 유튜브·릴스 배경음악, 광고 CM송 제작에 실제로 활용.",
          useCases: [
            "유튜브·릴스 배경음악",
            "광고 CM 송",
            "보컬 데모 (작곡 레퍼런스)",
            "이벤트·결혼식 축가 (한국어 가사)",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 10곡 / Pro $10/월",
          alternatives: ["Udio", "AIVA"],
          founded: "2023",
          korean: true,
        },
        {
          name: "ElevenLabs",
          url: "https://elevenlabs.io",
          blurb: "초고품질 음성 합성·복제. 다국어, 한국어 지원.",
          details:
            "TTS(음성합성) 업계 표준. 본인 목소리를 5분만 녹음해 업로드하면 '내 목소리로 한국어·영어·일본어 등 32개 언어' 가 가능합니다. 오디오북 출판사, 유튜브 크리에이터, 게임 더빙 현장에서 실제 사용 중.",
          useCases: [
            "유튜브 영상 한국어 내레이션",
            "본인 목소리 복제 → 다국어 더빙",
            "오디오북 제작",
            "게임 NPC 더빙",
          ],
          pricing: "freemium",
          pricingNote: "무료 월 10K 글자 / Starter $5/월~",
          alternatives: ["Clovanote", "Naver Cloud Voice"],
          founded: "2022",
          korean: true,
        },
        {
          name: "Clovanote (네이버)",
          url: "https://clovanote.naver.com",
          blurb: "한국어 회의록·받아쓰기 1위. 100% 무료.",
          details:
            "네이버 공식. 강의·회의·인터뷰 녹음을 한국어 텍스트로 변환합니다. 화자 분리(누가 무슨 말 했는지), AI 요약, 키워드 추출이 자동. 다른 글로벌 STT 대비 한국어 정확도가 훨씬 높고, 100% 무료라 학생·직장인 필수.",
          useCases: [
            "강의·세미나 녹음 → 텍스트",
            "회의록 자동 작성 (화자별 분리)",
            "인터뷰 받아쓰기",
            "유튜브 자막 한국어 초안",
          ],
          pricing: "free",
          pricingNote: "100% 무료",
          alternatives: ["ElevenLabs Scribe", "Whisper"],
          founded: "2021",
          korean: true,
        },
      ],
    },
    {
      title: "💻 코딩 / 개발",
      items: [
        {
          name: "Cursor",
          url: "https://cursor.com",
          blurb: "AI 네이티브 코드 에디터. VS Code 포크.",
          details:
            "VS Code 를 포크해 GPT·Claude 가 코드 베이스 전체를 이해하도록 만든 IDE. 'Cmd+K' 로 자연어 명령 → 즉시 코드 수정, 'Composer' 로 멀티파일 리팩터링이 한 번에 됩니다. 2026년 현재 시니어 개발자도 메인 에디터로 사용 중.",
          useCases: [
            "기존 코드 베이스 리팩터링",
            "신규 기능 멀티파일 추가",
            "버그 디버깅 (전체 트레이스 분석)",
            "API 마이그레이션",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Pro $20/월",
          tip: "`.cursorrules` 파일에 프로젝트 규칙·코딩 컨벤션을 넣어두면 일관성 유지. 무료 플랜도 충분.",
          alternatives: ["GitHub Copilot", "Windsurf", "Claude Code"],
          founded: "2022",
        },
        {
          name: "GitHub Copilot",
          url: "https://github.com/features/copilot",
          blurb: "에디터 안에서 자동완성·채팅. 학생·OSS 무료.",
          details:
            "Microsoft / GitHub 공식. VS Code·JetBrains·Vim 등 거의 모든 에디터에 플러그인으로 설치되며 입력 중인 코드를 실시간 자동완성합니다. 학생·교사·인기 오픈소스 메인테이너는 100% 무료라 사실상 진입 비용 없음.",
          useCases: [
            "보일러플레이트 자동완성",
            "테스트 코드 자동 생성",
            "주석으로 함수 본문 생성",
            "기존 에디터 그대로 쓰기",
          ],
          pricing: "freemium",
          pricingNote: "학생/OSS 무료 / 개인 $10/월",
          alternatives: ["Cursor", "Codeium"],
          founded: "2021",
        },
        {
          name: "v0 by Vercel",
          url: "https://v0.dev",
          blurb: "프롬프트로 React/Tailwind UI 즉시 생성.",
          details:
            "Vercel 공식. '대시보드 만들어줘', '로그인 폼 만들어줘' 라고 한국어로 입력하면 React + Tailwind + shadcn/ui 컴포넌트가 미리보기와 함께 즉시 생성됩니다. Next.js 프로젝트에 바로 복붙 가능.",
          useCases: [
            "랜딩 페이지 빠른 프로토타입",
            "UI 컴포넌트 시안 (디자이너 대안)",
            "Next.js 프로젝트 부품 양산",
            "Tailwind 익히는 학습용",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 200 크레딧 / 유료 $20/월~",
          alternatives: ["Bolt.new", "Lovable"],
          founded: "2023",
        },
        {
          name: "Claude Code",
          url: "https://www.claude.com/product/claude-code",
          blurb: "터미널·IDE 기반 AI 페어 프로그래머.",
          details:
            "Anthropic 공식. 터미널에서 `claude` 명령으로 실행하면 현재 디렉토리 전체를 컨텍스트로 이해하고 멀티파일 변경·테스트 실행·git 커밋까지 자동으로 처리합니다. 대규모 리팩터링·디버깅에서 다른 도구 대비 정확도가 높음.",
          useCases: [
            "대규모 리팩터링",
            "버그 추적 (멀티파일 트레이스)",
            "터미널 기반 워크플로우 자동화",
            "VS Code/JetBrains 확장으로도 사용",
          ],
          pricing: "freemium",
          pricingNote: "Claude Pro $20/월 / Max $100/월~ 사용량 포함",
          alternatives: ["Cursor", "Aider"],
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
          blurb: "자연스러움 1티어 번역기. 무료 한도 충분.",
          details:
            "독일 DeepL SE 의 번역 엔진. 한·영, 한·일 번역에서 구글 번역 대비 문장 결이 훨씬 자연스럽다는 평가가 일관적. 무료 플랜으로 일 5천 자, 문서 파일 직접 번역도 제공.",
          useCases: [
            "영문 메일·논문 번역",
            "일본어·중국어·유럽어 양방향 번역",
            "PDF·Word 파일 통째로 번역",
            "크롬 확장으로 웹사이트 번역",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 5천 자 / Pro €8.99/월",
          alternatives: ["Google Translate", "Papago"],
          founded: "2017",
          korean: true,
        },
        {
          name: "Notion AI",
          url: "https://www.notion.so/product/ai",
          blurb: "노션 안에서 요약·작성·번역. 워크스페이스 통합.",
          details:
            "노션을 이미 쓰고 있다면 가장 자연스러운 AI. 스페이스 바 한 번이면 현재 페이지 내용 기반으로 요약·번역·확장이 가능하고, 'AI 검색' 으로 워크스페이스 전체 문서를 자연어로 검색할 수 있습니다.",
          useCases: [
            "회의록 자동 요약",
            "위키 문서 빠른 작성",
            "워크스페이스 전체 검색",
            "협업 문서 한·영 동시 작성",
          ],
          pricing: "freemium",
          pricingNote: "기본 노션 + 사용자당 $10/월",
          alternatives: ["ChatGPT", "Claude Projects"],
          founded: "2023",
          korean: true,
        },
        {
          name: "Grammarly",
          url: "https://www.grammarly.com",
          blurb: "영문 문법·톤 교정. 영어 글쓰기 필수.",
          details:
            "영어 글쓰기 교정 도구의 표준. 단순 문법뿐 아니라 '비즈니스/캐주얼/학술' 같은 톤 조정, 표절 검사까지 제공. 크롬 확장·MS Word·Gmail 등 거의 모든 곳에 자동 통합.",
          useCases: [
            "영문 이메일 교정",
            "토플·아이엘츠 라이팅 점검",
            "해외 SNS·블로그 글 다듬기",
            "표절 검사 (학생용)",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Premium $12/월~",
          alternatives: ["ChatGPT", "DeepL Write"],
          founded: "2009",
        },
      ],
    },
  ],
  faq: [
    {
      q: "2026년 한국에서 가장 많이 쓰는 AI 도구는 무엇인가요?",
      a: "범용 챗봇은 ChatGPT(유료 사용자 가장 많음)와 Claude(긴 문서·코딩 강자)가 양강 구도이고, 한국어 회의록은 네이버 클로바노트가 1위입니다. 검색·리서치 용도는 Perplexity, 이미지는 Midjourney 와 ChatGPT 내장 DALL·E 3 가 자주 함께 사용됩니다.",
    },
    {
      q: "ChatGPT 와 Claude 중 무엇을 선택해야 하나요?",
      a: "일상 대화·이미지 생성·음성 모드는 ChatGPT 가 우위입니다. 반면 긴 문서(PDF·계약서) 요약, 코드 리뷰·리팩터링, 자연스러운 한국어 카피라이팅은 Claude 가 더 강합니다. 둘 다 무료 플랜이 있으니 같은 질문을 양쪽에 던져보고 결과물 톤이 맞는 쪽을 선택하는 게 가장 빠릅니다.",
    },
    {
      q: "AI 도구를 무료로만 쓸 수 있나요?",
      a: "가능합니다. ChatGPT·Claude·Gemini 모두 무료 플랜이 있고, 한국 토종 뤼튼은 광고 기반으로 GPT·Claude 를 무료 사용하게 해줍니다. 이미지는 Leonardo AI 가 매일 150 크레딧 무료, 음성은 클로바노트가 100% 무료입니다. 다만 무거운 작업(긴 영상 생성, Midjourney 등)은 결국 유료가 필요합니다.",
    },
    {
      q: "AI 에 회사 자료를 올려도 괜찮나요?",
      a: "원칙적으로는 매우 위험합니다. 모든 AI 회사가 '학습 거부(opt-out)' 옵션을 제공하지만 기본값은 학습 허용인 경우가 많고, 입력 내용이 미래 모델 학습에 사용될 수 있습니다. 회사 기밀·고객 개인정보·미공개 재무 자료는 절대 그대로 붙여넣지 말고, ① 가명화 후 사용 ② Team/Enterprise 플랜의 'No-train' 약관 활용 ③ 로컬 LLM(Llama 등) 사용 셋 중 하나를 선택하세요.",
    },
    {
      q: "이미지 AI 로 만든 그림을 상업적으로 써도 되나요?",
      a: "각 서비스 약관에 따라 다릅니다. Midjourney·DALL·E 3 (ChatGPT Plus 이상)·Leonardo AI 유료 플랜은 상업 이용이 명시적으로 허용됩니다. 무료 플랜에서 생성한 이미지는 상업 이용이 제한되거나 '저작자 표기' 가 요구될 수 있으니 다운로드 전 약관 페이지를 반드시 확인하세요. 또한 특정 작가·캐릭터를 모방한 결과물은 별도 저작권 분쟁 소지가 있습니다.",
    },
    {
      q: "AI 코딩 도구를 쓰면 실력이 안 늘지 않나요?",
      a: "초보일수록 코드 자동 생성에 의존하면 학습 곡선이 무너집니다. 권장 사용법은 ① 본인이 먼저 작성 → ② AI 에게 리뷰·개선안 요청 → ③ AI 답변을 'why' 까지 이해한 뒤 적용 입니다. 'Cursor·Copilot' 의 자동완성은 켜되, 익숙하지 않은 라이브러리·언어는 일부러 자동완성을 끄고 직접 쓰는 게 좋습니다.",
    },
    {
      q: "ChatGPT 한국어 답변이 가끔 어색한데 개선할 수 있나요?",
      a: "Custom Instructions 에 본인 직업·전문 분야·선호하는 말투(존댓말/반말, 격식/캐주얼)를 명시하면 즉시 개선됩니다. 또한 '한국어 모국어 사용자처럼 자연스러운 문장으로' 라는 시스템 프롬프트를 매번 첫 줄에 넣어도 효과적. 특히 전문 용어가 많은 분야는 Claude 가 더 자연스러운 결과를 주는 경우가 많습니다.",
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. 정부지원금 / 환급금 모음
// ---------------------------------------------------------------------------
const MONEY: PickCategory = {
  slug: "money",
  title: "정부지원금·환급금 받는 사이트 모음 — 숨은돈 찾기 13선",
  metaTitle: "정부지원금·환급금 모음 — 숨은돈 찾는 사이트 13선",
  shortTitle: "정부지원금",
  emoji: "💰",
  oneLiner: "안 받으면 손해. 신청만 하면 받는 돈을 한 번에 정리.",
  description:
    "정부24, 보조금24, 복지로, 내보험찾아줌, 카드포인트 통합조회 등 — 신청만 하면 받을 수 있는 정부·금융 공식 사이트 13곳. 한 번 30분이면 평균 10만원 이상 회수 가능.",
  longIntro: [
    "이 페이지의 모든 사이트는 **정부·공공기관·금융결제원** 공식 사이트입니다. 도메인이 `.go.kr` / `.or.kr` 로 끝나는지 항상 확인하세요. 정부지원금·환급금을 빙자한 보이스피싱·문자 사칭이 매우 많아, 검색해서 '광고' 표시가 붙은 첫 결과를 클릭하면 사칭 사이트에 걸리기 쉽습니다. 이 페이지에는 사이트마다 공식 도메인을 명시했습니다.",
    "처음 시작한다면 ① 정부24의 **보조금24** → ② 카드포인트 통합조회 → ③ 내 계좌 한눈에(어카운트인포) → ④ 내보험 찾아줌 → ⑤ 휴면예금 찾아줌 순서를 권장합니다. 이 다섯 곳만 30분 안에 돌면 평균 10만원 이상이 회수됩니다. 모두 본인 인증(공동인증서·간편인증)만으로 즉시 결과가 나옵니다.",
    "세금 환급은 시즌이 정해져 있습니다. **연말정산은 1~3월, 종합소득세는 5월, 부가가치세는 1·7월**. 홈택스에서 '환급금 조회' 메뉴를 통해 미수령 환급금을 확인할 수 있고, 5년 이내라면 경정청구로 추가 환급도 가능합니다. 근로장려금·자녀장려금은 5월 정기신청 외에 9월 반기 신청도 있어 자격 요건만 맞으면 매년 받을 수 있습니다.",
    "청년·서민층은 별도 사이트가 있습니다. **온통청년(youthcenter.go.kr)** 은 19~39세 대상 주거·취업·금융 지원을 한 번에 검색할 수 있고, 복지로는 기초생활·차상위·한부모 등 복지급여 자격을 자동 진단합니다. 둘 다 조건만 입력하면 받을 수 있는 지원금을 자동 매칭해주므로 30분 투자할 가치가 충분합니다.",
  ],
  selectionCriteria: [
    "정부·공공기관 공식 사이트만 (.go.kr / .or.kr)",
    "민간 중개 사이트·광고 사이트 제외",
    "본인 인증만으로 즉시 조회·신청 가능한 곳",
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
  ],
  groups: [
    {
      title: "🏛️ 정부 통합 포털",
      items: [
        {
          name: "정부24",
          url: "https://www.gov.kr",
          blurb: "정부 민원·증명서·지원금 통합 포털. 보조금24 내장.",
          details:
            "행정안전부 운영. 주민등록등본·가족관계증명서 같은 민원 발급부터 보조금 자동 매칭까지 한 곳에서. 간편인증(카카오·네이버·통신사) 로그인 후 '나의 혜택' 메뉴에서 본인이 받을 수 있는 지원금이 자동 표시됩니다.",
          useCases: [
            "받을 수 있는 정부지원금 자동 진단",
            "주민등록등본·증명서 무료 발급",
            "출산·결혼·이사 시 한 번에 행정 처리",
            "정부 민원 신청 추적",
          ],
          pricing: "free",
          pricingNote: "전부 무료",
          tip: "로그인 후 → '나의 혜택' → 결과를 캡처해 두면 1년 후 재확인할 때 비교 편리. 신청은 보통 5~10분.",
          founded: "2015",
          korean: true,
        },
        {
          name: "보조금24",
          url: "https://www.gov.kr/portal/subsidy24/cmm/main",
          blurb: "정부보조금만 모아 한 번에 확인.",
          details:
            "정부24 안에 포함된 서비스. 1,400개 이상의 중앙·지방 정부 보조금을 본인 정보(나이·소득·가구원·거주지)에 맞춰 자동 매칭합니다. 청년·신혼부부·소상공인은 평균 5~10개 항목이 매칭되며, 신청은 각 부처 홈페이지로 연결됩니다.",
          useCases: [
            "본인 자격에 맞는 보조금 자동 검색",
            "신혼부부·청년·소상공인 지원금 일괄 확인",
            "출산·돌봄·교육 보조금",
            "지자체 한정 지원도 함께 노출",
          ],
          pricing: "free",
          founded: "2021",
          korean: true,
        },
        {
          name: "복지로",
          url: "https://www.bokjiro.go.kr",
          blurb: "복지급여·바우처·일자리·돌봄 통합 포털.",
          details:
            "보건복지부 운영. 기초생활보장·의료급여·한부모가족지원·청년월세지원 등 복지 사업 신청·자격 진단을 한 곳에서. '복지서비스 모의계산' 으로 본인이 받을 수 있는 급여 금액을 미리 시뮬레이션 가능.",
          useCases: [
            "기초생활·차상위·한부모 자격 진단",
            "청년월세지원 신청",
            "장애인·노인 돌봄 서비스",
            "긴급 복지 신청",
          ],
          pricing: "free",
          founded: "2010",
          korean: true,
        },
        {
          name: "온통청년",
          url: "https://www.youthcenter.go.kr",
          blurb: "청년 정책 통합. 주거·취업·금융 지원 검색.",
          details:
            "국무조정실 운영. 19~39세 청년 대상 중앙·지자체 정책 1만+ 건을 통합 검색. 청년도약계좌·청년월세·청년창업·국가기술자격 응시료 지원까지 일괄 확인.",
          useCases: [
            "청년도약계좌·청년희망적금 정보",
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
      title: "💸 숨은 돈 찾기",
      items: [
        {
          name: "내보험 찾아줌",
          url: "https://cont.insure.or.kr",
          blurb: "본인 명의 모든 보험·숨은보험금 일괄 조회.",
          details:
            "생명보험협회·손해보험협회 공동 운영. 본인 명의의 모든 보험 가입 내역, 미수령 만기·중도·휴면 보험금을 한 번에 조회합니다. 부모님 사후 보험금 미신청 사례가 매우 많아 가족 단위로 확인 권장.",
          useCases: [
            "본인의 모든 보험 가입 현황 확인",
            "가족 사후 미수령 보험금 청구",
            "휴면 보험금 환급",
            "중복 보험 정리",
          ],
          pricing: "free",
          tip: "조회만으로 끝나지 않음 — 결과에 '미수령' 표시가 있으면 해당 보험사 콜센터로 직접 청구해야 함.",
          alternatives: ["파인 (금감원)"],
          founded: "2017",
          korean: true,
        },
        {
          name: "휴면예금·보험금 찾아줌",
          url: "https://www.sleepmoney.or.kr",
          blurb: "10년 이상 거래 없는 예금·보험금 통합 조회.",
          details:
            "서민금융진흥원 운영. 10년 이상 거래가 없어 사실상 잊혀진 예금·보험금을 본인 인증 한 번으로 통합 조회·환급 신청합니다. 평균 환급액은 5~30만원 수준.",
          useCases: [
            "오래된 통장 잔액 찾기",
            "옛 보험 만기금 환급",
            "사망자 가족 대신 청구",
            "어린 시절 가입 통장 정리",
          ],
          pricing: "free",
          founded: "2015",
          korean: true,
        },
        {
          name: "파인 (금융감독원)",
          url: "https://fine.fss.or.kr",
          blurb: "전 금융권 계좌·대출·연금·신용정보 통합 조회.",
          details:
            "금융감독원 공식. '내 계좌 한눈에', '내 카드 한눈에', '잠자는 내 돈 찾기' 등 14개 금융 조회 서비스가 한 곳에. 가장 강력한 게 '연금 가입 현황' — 국민·퇴직·개인연금 통합 노후 시뮬레이션 가능.",
          useCases: [
            "전 금융권 계좌·잔액 조회",
            "본인 명의 대출·카드 발급 내역",
            "국민·퇴직·개인연금 통합 확인",
            "신용평점 무료 조회",
          ],
          pricing: "free",
          founded: "2016",
          korean: true,
        },
        {
          name: "카드포인트 통합조회",
          url: "https://www.cardpoint.or.kr",
          blurb: "전 카드사 포인트 한 번에 + 현금 출금.",
          details:
            "여신금융협회 운영. 신한·삼성·KB·현대·롯데·하나·우리·NH·BC 모든 카드사 포인트를 한 화면에 모아 보여주고, 클릭 두 번으로 본인 계좌에 1원 단위까지 현금 출금. 평균 3~5만원이 회수되며, 모든 분기 권장.",
          useCases: [
            "전 카드사 포인트 통합 확인",
            "포인트 → 본인 계좌로 즉시 현금화",
            "유효기간 임박 포인트 점검",
            "분기별 정기 점검",
          ],
          pricing: "free",
          tip: "분기마다 한 번씩만 들러도 충분. 출금까지 5분.",
          founded: "2018",
          korean: true,
        },
        {
          name: "내 계좌 한눈에 (어카운트인포)",
          url: "https://www.payinfo.or.kr",
          blurb: "전 은행 계좌 조회 + 비활동 계좌 정리.",
          details:
            "금융결제원 운영. 본인 명의의 모든 은행·증권·저축은행·우체국 계좌를 한 번에 조회하고, 1년 이상 거래 없는 비활동 계좌의 잔액을 본인 주거래 계좌로 일괄 이체·해지 가능.",
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
          blurb: "국세청 공식. 종합소득세·연말정산·환급금 조회·신청.",
          details:
            "국세청 운영. 종합소득세 신고(5월), 연말정산 간소화(1월), 부가가치세, 경정청구(과거 5년 세금 재계산), 환급금 조회까지 모든 세금 행정의 시작점. '환급금 조회·신청' 메뉴에서 미수령 환급금이 자동 표시됩니다.",
          useCases: [
            "5월 종합소득세 신고",
            "연말정산 간소화 자료 발급",
            "과거 5년 경정청구 (놓친 공제 환급)",
            "사업자 부가가치세",
          ],
          pricing: "free",
          tip: "5월 종합소득세 기간엔 '환급금 조회' 메뉴부터 확인. 과거에 환급받지 못한 돈이 자동 표시됨.",
          founded: "2002",
          korean: true,
        },
        {
          name: "위택스",
          url: "https://www.wetax.go.kr",
          blurb: "지방세(주민세·자동차세·재산세) 납부·환급.",
          details:
            "행정안전부 운영. 국세는 홈택스, 지방세는 위택스로 이원화돼 있습니다. 자동차세 연납 신청(최대 9.15% 할인), 주민세, 재산세, 지방소득세까지 한 곳에서. 환급금 조회도 별도로 해야 함.",
          useCases: [
            "자동차세 연납 신청 (1월, 최대 9.15% 할인)",
            "지방세 납부·환급",
            "지방세 미납·체납 확인",
            "전국 지자체 지방세 통합",
          ],
          pricing: "free",
          founded: "2005",
          korean: true,
        },
        {
          name: "근로장려금 안내 (국세청)",
          url: "https://www.nts.go.kr",
          blurb: "근로·자녀장려금 자격·신청 안내. 5월 정기신청.",
          details:
            "국세청 공식 안내 페이지. 근로장려금(최대 330만원)·자녀장려금(자녀 1명당 100만원)은 5월 정기 신청, 9월 반기 신청이 가능. 단독·홑벌이·맞벌이 기준이 다르며, 자격 자동진단 도구를 함께 제공.",
          useCases: [
            "5월 근로·자녀장려금 정기 신청",
            "9월 반기 신청 (1년 두 번 가능)",
            "자격 자동 진단",
            "최대 330만원 + 자녀당 100만원",
          ],
          pricing: "free",
          founded: "2009",
          korean: true,
        },
      ],
    },
    {
      title: "👷 고용·실업 지원",
      items: [
        {
          name: "고용24 (워크넷)",
          url: "https://www.work24.go.kr",
          blurb: "구직·실업급여·국민내일배움카드 통합.",
          details:
            "고용노동부 공식. 워크넷·HRD-Net·실업급여·청년수당 등 고용 관련 서비스를 통합. 실업급여(구직급여) 신청, 국민내일배움카드(연 500만원 직업훈련비) 발급이 모두 여기서. 사용자 평가가 가장 박했던 정부 사이트가 2024년 전면 개편되며 사용성 크게 개선.",
          useCases: [
            "실업급여 신청·수급",
            "국민내일배움카드 (연 500만원)",
            "청년구직활동지원금",
            "구인구직 매칭",
          ],
          pricing: "free",
          founded: "1998",
          korean: true,
        },
        {
          name: "4대보험 정보연계센터",
          url: "https://www.4insure.or.kr",
          blurb: "국민연금·건강·고용·산재 가입이력 통합 조회.",
          details:
            "국민연금공단 운영. 본인의 국민연금·건강보험·고용보험·산재보험 가입 이력과 납부액을 한 번에 확인. 퇴사·이직 시 4대보험 자격 변동 확인 필수.",
          useCases: [
            "전 직장 4대보험 가입 이력",
            "퇴사 후 자격 상실 확인",
            "국민연금 예상 수령액",
            "건강보험 피부양자 등록 자격",
          ],
          pricing: "free",
          founded: "2007",
          korean: true,
        },
      ],
    },
  ],
  faq: [
    {
      q: "정부지원금·환급금을 받으려면 무엇부터 시작해야 하나요?",
      a: "정부24(보조금24) → 카드포인트 통합조회 → 내 계좌 한눈에 → 내보험 찾아줌 → 휴면예금 찾아줌 다섯 곳을 순서대로 30분 안에 도세요. 모두 본인 인증(공동인증서·간편인증)만 있으면 즉시 결과가 나오며, 평균 회수 금액은 10만원 이상입니다.",
    },
    {
      q: "정부지원금 신청 문자·전화는 사칭이 많다는데 어떻게 구분하나요?",
      a: "정부·공공기관은 문자·전화로 '지금 신청하면 받을 수 있다' 며 클릭을 유도하지 않습니다. 모든 신청은 사용자가 직접 공식 사이트(.go.kr / .or.kr)에 접속해 본인 인증 후 진행해야 합니다. 문자 속 링크는 절대 클릭하지 말고, 검색해도 '광고' 표시가 붙은 결과 대신 공식 도메인을 직접 확인하세요.",
    },
    {
      q: "근로장려금·자녀장려금은 누구나 받을 수 있나요?",
      a: "아닙니다. 단독 가구 연소득 2,200만원, 홑벌이 3,200만원, 맞벌이 3,800만원 이하 등 기준이 있고, 재산 2.4억원 미만이어야 합니다(2026년 기준). 국세청 홈택스에서 '근로장려금 자동 진단' 으로 자격을 확인할 수 있으며, 5월 정기 신청 외에 9월 반기 신청도 가능합니다.",
    },
    {
      q: "카드포인트는 정말 현금으로 출금되나요?",
      a: "네. 카드포인트 통합조회 사이트(cardpoint.or.kr) 에서 본인 인증 후 모든 카드사 포인트를 한 번에 본인 명의 계좌로 출금할 수 있습니다. 1원 단위까지 가능하며, 수수료 없음. 출금 후 1~3영업일 내 입금되며, 분기마다 한 번씩 점검을 권장합니다.",
    },
    {
      q: "연말정산을 안 했거나 잘못했어요. 다시 환급받을 수 있나요?",
      a: "가능합니다. **과거 5년 이내** 라면 홈택스 '경정청구' 로 누락된 소득공제·세액공제를 다시 신청해 환급받을 수 있습니다. 의료비·기부금·월세 세액공제 등이 흔히 누락됩니다. 5년이 지나면 청구 불가하니, 매년 5월 종합소득세 기간에 함께 점검하는 게 좋습니다.",
    },
    {
      q: "휴면예금·휴면보험금은 어떻게 다른가요?",
      a: "휴면예금은 만기·해지 후 5년 이상, 휴면보험금은 만기·해지·실효 후 3년 이상 청구가 없는 자산입니다. 둘 다 sleepmoney.or.kr 에서 한 번에 조회 가능. 환급 신청 후 본인 계좌로 입금되며, 사망자의 휴면자산도 상속인이 대신 청구할 수 있습니다.",
    },
    {
      q: "청년월세·청년도약계좌는 어디서 신청하나요?",
      a: "청년월세는 복지로(bokjiro.go.kr), 청년도약계좌는 취급 은행 앱·창구에서 신청. 두 사업 모두 온통청년(youthcenter.go.kr)에서 자격 진단·신청 링크를 통합 안내합니다. 청년도약계좌는 만 19~34세, 개인소득 7,500만원 이하 등 자격 조건이 있으니 가입 전 진단 필수.",
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. 무료 리소스 모음 (폰트·이미지·PPT)
// ---------------------------------------------------------------------------
const FREE: PickCategory = {
  slug: "free",
  title: "상업용 무료 폰트·이미지·PPT 템플릿 사이트 모음 18선",
  metaTitle: "상업용 무료 리소스 사이트 모음 — 폰트·이미지·PPT 18선",
  shortTitle: "무료 리소스",
  emoji: "🎁",
  oneLiner: "디자인·블로그·발표자료 만들 때 쓰는 무료 리소스 모음.",
  description:
    "눈누·미리캔버스·Unsplash·Pexels·Flaticon·Slidesgo 등 상업적 이용까지 허용되는 무료 폰트·이미지·일러스트·PPT 템플릿·효과음 사이트 18곳. 라이선스 확인 완료.",
  longIntro: [
    "이 페이지의 모든 사이트는 **상업용 이용이 허용된 무료 리소스** 만 등록했습니다. 다만 라이선스 조건이 100% 자유로운 사이트는 일부에 불과하고, 대부분 '저작자 표시(CC-BY)' 또는 '재배포 금지', '플랫폼에 따라 별도 약관' 같은 조건이 붙습니다. **다운로드 직전에 각 사이트의 라이선스 페이지를 한 번 더 확인**하는 습관이 가장 안전합니다.",
    "한국에서 가장 안전한 출발점은 **눈누(noonnu.cc)**, **공유마당 폰트**, **미리캔버스** 세 곳입니다. 모두 한국 운영, 한국어 인터페이스, 라이선스가 한글로 명확히 표시되어 있어 분쟁 가능성이 거의 없습니다. 특히 눈누는 폰트별로 '인쇄·웹·영상·BI·OFL' 등 사용 가능 영역을 표 형태로 정리해줘 비전문가도 한눈에 판단할 수 있습니다.",
    "해외 사이트(Unsplash·Pexels·Pixabay 등)는 라이선스가 매우 너그럽지만, 사진 속 **인물 초상권**·**브랜드 로고**·**예술작품 사진** 은 별도 권리가 살아있을 수 있습니다. 인물 사진을 광고에 쓰거나, 미술관 작품 사진을 상업물에 쓸 때는 추가 확인이 필요합니다.",
    "PPT·디자인은 **미리캔버스** 와 **Canva** 가 양대 산맥. 미리캔버스는 한국 시장 1위로 한글 폰트·한국 기업 로고·한국식 카드뉴스 템플릿이 가장 풍부하고, Canva 는 글로벌 1위로 영문 디자인·해외 트렌드·인스타그램·릴스 템플릿이 강합니다. 둘 다 무료 플랜에서 충분히 작업 가능합니다.",
  ],
  selectionCriteria: [
    "상업적 이용이 명시적으로 허용된 사이트만",
    "다운로드 직전 라이선스 페이지 직접 확인",
    "한국 운영 또는 한국어 지원 우선",
    "공식 사이트 직링크 (어필리에이트·중개 사이트 제외)",
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
  ],
  groups: [
    {
      title: "🔤 한글·영문 폰트",
      items: [
        {
          name: "눈누",
          url: "https://noonnu.cc",
          blurb: "한글 상업용 무료 폰트 종합. 라이선스 가장 명확.",
          details:
            "한글 무료 폰트 큐레이션의 사실상 표준. 1,000+ 무료 폰트를 '인쇄·웹·영상·BI/CI·OFL' 6개 사용 영역별로 표시해, 디자이너가 아니어도 라이선스를 즉시 판단할 수 있습니다. 본문용·제목용·손글씨 등 카테고리별 검색·미리보기·다운로드까지 한 페이지에서.",
          useCases: [
            "PPT·문서 본문 한글 폰트 선택",
            "유튜브 썸네일 제목 폰트",
            "로고·BI 제작 (OFL 폰트 선별)",
            "상업물 라이선스 사전 확인",
          ],
          pricing: "free",
          pricingNote: "100% 무료, 광고 기반",
          tip: "검색 시 '본문용' 필터를 켜면 가독성 좋은 폰트만 골라낸다. 폰트 카드의 '사용 범위' 표는 항상 사이트에서 다시 확인할 것.",
          alternatives: ["공유마당 폰트", "Google Fonts"],
          founded: "2017",
          korean: true,
        },
        {
          name: "Google Fonts",
          url: "https://fonts.google.com",
          blurb: "전 세계 1,500+ 무료 폰트. 노토 산스 KR 포함.",
          details:
            "Google 운영. 모든 폰트가 SIL Open Font License 또는 Apache License 2.0 으로 상업·재배포 100% 자유. 한글은 '노토 산스 KR', '나눔 시리즈' 등 메이저 한글 폰트도 다수 포함. CDN 으로 웹사이트에 즉시 적용 가능.",
          useCases: [
            "웹사이트 폰트 (CDN 임베드)",
            "PPT·문서 영문 폰트",
            "상업물 사용 (라이선스 100% 자유)",
            "한글 노토·나눔 다운로드",
          ],
          pricing: "free",
          founded: "2010",
        },
        {
          name: "공유마당 폰트",
          url: "https://gongu.copyright.or.kr",
          blurb: "한국저작권위원회 공식. 안심 폰트.",
          details:
            "한국저작권위원회 운영. 만료 저작물 기반 폰트와 공공기관 배포 폰트를 모아 라이선스 분쟁 가능성이 가장 낮습니다. 디자인 품질은 눈누 대비 다소 보수적이지만, 공공기관 문서·교과서 같은 안전한 용도에 최적.",
          useCases: [
            "공공기관·정부 문서",
            "교육 자료·교과서",
            "법적 분쟁 가능성이 0% 이어야 하는 상업물",
            "라이선스 검증된 폰트만 사용",
          ],
          pricing: "free",
          alternatives: ["눈누"],
          founded: "2007",
          korean: true,
        },
      ],
    },
    {
      title: "🖼️ 이미지 / 사진",
      items: [
        {
          name: "Unsplash",
          url: "https://unsplash.com",
          blurb: "고화질 사진 무료. 상업 OK, 저작자 표시 불필요.",
          details:
            "Getty Images 자회사. 500만+ 고화질 사진을 Unsplash 라이선스로 제공 — 상업적 이용·수정·배포 모두 자유, 저작자 표시 의무 없음(권장 수준). 사진 품질이 스톡사진 회사 수준으로 일관되며, AI 이미지가 늘면서 '실사 사진' 만 보고 싶을 때 유용.",
          useCases: [
            "블로그·웹사이트 헤더 이미지",
            "PPT 표지·섹션 구분",
            "유튜브 썸네일 배경",
            "광고·인쇄물 (상업 OK)",
          ],
          pricing: "free",
          pricingNote: "비영리 무료 / Unsplash+ 유료 플랜은 추가 보호",
          tip: "사진 속 인물 초상권·브랜드 로고는 별도 권리. 광고·홍보용으로 인물 사진 쓸 때는 사진가에게 문의하거나 모델 릴리스가 확보된 유료 스톡으로.",
          alternatives: ["Pexels", "Pixabay"],
          founded: "2013",
        },
        {
          name: "Pexels",
          url: "https://www.pexels.com",
          blurb: "사진 + 영상 둘 다. 한국어 검색.",
          details:
            "사진과 영상(스톡 비디오)을 함께 제공. Pexels 라이선스로 상업·수정·배포 자유, 저작자 표시 의무 없음. Unsplash 와 비교하면 영상 라이브러리가 강점이며, 한국어 검색을 인식해 한국 사용자가 쓰기 편함.",
          useCases: [
            "유튜브·릴스 b-roll 영상",
            "블로그 본문 사진",
            "프레젠테이션 이미지·동영상",
            "한국어 키워드 검색",
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
            "독일 운영. 사진뿐 아니라 일러스트·벡터·동영상·음악·효과음까지 한 사이트에서. Pixabay 라이선스는 상업 OK·저작자 표시 무관. 단, 일러스트·벡터는 AI 생성물 비중이 늘고 있어 사진보다 품질 편차가 큼.",
          useCases: [
            "한 사이트에서 사진·일러스트·음악 통합",
            "벡터(SVG·AI 파일) 다운로드",
            "유튜브 BGM·효과음",
            "예산 없는 1인 크리에이터",
          ],
          pricing: "free",
          alternatives: ["Unsplash", "Pexels"],
          founded: "2010",
          korean: true,
        },
      ],
    },
    {
      title: "✨ 일러스트 / 아이콘",
      items: [
        {
          name: "Flaticon",
          url: "https://www.flaticon.com",
          blurb: "아이콘 1,400만+. 무료(표시 필요) / 유료(표시 불필요).",
          details:
            "스페인 Freepik 그룹 운영. 1,400만+ 아이콘과 7만+ 스티커 팩 보유. 무료 플랜은 'flaticon.com' 출처 표시 필수, 유료(€10/월)는 표시 불필요. 동일 컬렉션 안에서 일관된 톤의 아이콘 세트를 받을 수 있어 디자인 통일성 유리.",
          useCases: [
            "PPT·문서 아이콘",
            "앱·웹 UI 아이콘 (Premium)",
            "인포그래픽",
            "교육 자료 시각화",
          ],
          pricing: "freemium",
          pricingNote: "무료(출처 표시 필요) / Premium €10/월",
          alternatives: ["Lucide", "Heroicons"],
          founded: "2013",
        },
        {
          name: "Lucide",
          url: "https://lucide.dev",
          blurb: "오픈소스 SVG 아이콘 1,400+. 100% 자유.",
          details:
            "Feather Icons 의 커뮤니티 포크. ISC License 로 상업·수정·재배포 완전 자유, 출처 표시조차 불필요. React·Vue·Svelte 등 모든 프레임워크 패키지 제공. 본 사이트(eloan)도 사용 중.",
          useCases: [
            "웹·앱 개발자 (UI 아이콘)",
            "오픈소스 프로젝트",
            "라이선스 분쟁 0%",
            "프레임워크 통합 (React 등)",
          ],
          pricing: "free",
          alternatives: ["Heroicons", "Tabler Icons"],
          founded: "2020",
        },
        {
          name: "unDraw",
          url: "https://undraw.co",
          blurb: "테마색 변경 가능한 SVG 일러스트. 표시 불필요.",
          details:
            "Katerina Limpitsouni 가 운영하는 1인 프로젝트. 모든 일러스트가 SVG 라 색상을 한 번에 브랜드 컬러로 변경 가능. unDraw 라이선스는 상업·수정·재배포 모두 자유, 출처 표기조차 불필요.",
          useCases: [
            "랜딩 페이지 일러스트",
            "회사 브랜드 컬러 통일",
            "404·로딩·빈상태 화면",
            "마케팅 자료 시각화",
          ],
          pricing: "free",
          alternatives: ["Storyset", "DrawKit"],
          founded: "2017",
        },
        {
          name: "IRA Design",
          url: "https://iradesign.io",
          blurb: "조립식 일러스트 — 부분 부분 갈아끼우기.",
          details:
            "캐릭터·배경·소품을 부분별로 조립해 본인만의 일러스트를 만드는 서비스. 같은 톤의 그림을 시리즈로 양산하기 좋아 브랜드 일러스트 패키지 제작에 유용.",
          useCases: [
            "브랜드 일러스트 시리즈",
            "온보딩 화면 단계별",
            "광고용 캐릭터",
            "랜딩 페이지 히어로",
          ],
          pricing: "free",
          alternatives: ["Storyset", "Blush"],
          founded: "2019",
        },
      ],
    },
    {
      title: "📊 PPT / 디자인 템플릿",
      items: [
        {
          name: "미리캔버스",
          url: "https://www.miricanvas.com",
          blurb: "한국 1위 무료 디자인 툴. PPT·썸네일·명함 다 됨.",
          details:
            "(주)미리디 운영. 한국 1위 디자인 SaaS 로 학생·소상공인·1인 마케터가 가장 많이 사용. PPT·카드뉴스·썸네일·명함·전단지 등 한국식 마케팅 자료 템플릿이 압도적. 무료 플랜으로도 충분히 작업 가능하며, 워터마크 없음.",
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
          name: "망고보드",
          url: "https://www.mangoboard.net",
          blurb: "카드뉴스·인포그래픽 강점. 한국형 디자인 플랫폼.",
          details:
            "(주)리아모어소프트 운영. 미리캔버스와 양강 구도지만 카드뉴스·인포그래픽 템플릿이 더 다양. PPT 보다 SNS 콘텐츠 비중이 높다면 망고보드, 슬라이드 위주라면 미리캔버스 추천.",
          useCases: [
            "인스타그램 카드뉴스 시리즈",
            "데이터 인포그래픽",
            "유튜브 썸네일",
            "사내 교육 자료",
          ],
          pricing: "freemium",
          pricingNote: "무료 (워터마크) / 유료 월 9,900원~",
          alternatives: ["미리캔버스", "Canva"],
          founded: "2016",
          korean: true,
        },
        {
          name: "Canva",
          url: "https://www.canva.com",
          blurb: "글로벌 1위. 무료로도 충분, 한국어 지원.",
          details:
            "호주 Canva 운영, 전 세계 1.5억+ MAU. 한국어 인터페이스·한국 인기 폰트 제공. 글로벌 디자인 트렌드·인스타그램 릴스 템플릿이 가장 빠르게 업데이트되며, AI 기능(Magic Studio)도 무료 플랜에서 일부 사용 가능.",
          useCases: [
            "인스타·틱톡 릴스 영상",
            "글로벌 SNS 디자인",
            "팀 협업 (URL 공유)",
            "AI 이미지·텍스트 생성 통합",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Pro $12.99/월",
          alternatives: ["미리캔버스", "Adobe Express"],
          founded: "2013",
          korean: true,
        },
        {
          name: "Slidesgo",
          url: "https://slidesgo.com",
          blurb: "Google Slides·PowerPoint 무료 템플릿.",
          details:
            "Freepik 그룹 운영. Google Slides·PowerPoint·Canva 형식 모두 다운로드 가능한 PPT 템플릿 전문. 글로벌 시장 1위로 비즈니스·교육·마케팅 카테고리가 풍부. 무료는 출처 표시 슬라이드 1장 자동 포함.",
          useCases: [
            "Google Slides 템플릿",
            "PowerPoint 파일 직접 편집",
            "글로벌 비즈니스 발표",
            "학술·교육 발표",
          ],
          pricing: "freemium",
          pricingNote: "무료 (출처 표시) / Premium €5.99/월",
          alternatives: ["미리캔버스", "Canva"],
          founded: "2018",
        },
      ],
    },
    {
      title: "🎵 효과음 / 배경음악 / 영상",
      items: [
        {
          name: "Freesound",
          url: "https://freesound.org",
          blurb: "효과음·환경음 무료 (CC 라이선스).",
          details:
            "Universitat Pompeu Fabra 운영, 비영리. 60만+ 사운드 클립을 CC0·CC-BY 등 크리에이티브 커먼즈 라이선스로 제공. 효과음·환경음·필드 레코딩이 강점이며, 다운로드 전 각 사운드의 정확한 라이선스 확인 필수.",
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
        {
          name: "YouTube 오디오 보관함",
          url: "https://studio.youtube.com",
          blurb: "유튜브 스튜디오 내. 저작권 안전 BGM·효과음.",
          details:
            "YouTube 공식. 채널이 있다면 누구나 무료. 모든 음원이 유튜브 콘텐츠 ID 시스템에서 저작권 클레임을 받지 않도록 사전 보장되어 있어 '무조건 안전한' 음원을 찾을 때 1순위.",
          useCases: [
            "유튜브 영상 BGM (콘텐츠 ID 안전)",
            "효과음 (장르별 검색)",
            "수익 창출 영상에 안심 사용",
            "팟캐스트·릴스 음원",
          ],
          pricing: "free",
          tip: "유튜브 스튜디오 → 좌측 메뉴 '오디오 보관함' 에서 접속. 채널 없어도 구글 계정만 있으면 됨.",
          alternatives: ["Pixabay Music", "Bensound"],
          founded: "2013",
          korean: true,
        },
        {
          name: "Coverr",
          url: "https://coverr.co",
          blurb: "웹사이트 배경용 짧은 영상 무료.",
          details:
            "이스라엘 운영. 5~30초 분량의 시네마틱 영상을 Coverr 라이선스로 무료 제공 (상업 OK, 표시 권장). 웹사이트 헤더 배경, 랜딩 페이지 영상 등에 특화.",
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
      ],
    },
  ],
  faq: [
    {
      q: "'상업용 무료' 라고 적혀 있어도 정말 광고에 써도 되나요?",
      a: "각 사이트의 라이선스 조항에 따라 다릅니다. 100% 자유로운 곳(Unsplash, Pexels, Pixabay, unDraw, Lucide 등)은 광고·인쇄·재배포 모두 가능하지만, Slidesgo·Flaticon 무료 플랜은 '출처 표시 의무' 가 있고, 미리캔버스·Canva 같은 디자인 툴은 '결과물은 상업 OK, 단 템플릿 자체 재판매는 금지' 같은 별도 조항이 있습니다. **다운로드 직전 라이선스 페이지를 반드시 확인**하세요.",
    },
    {
      q: "Unsplash 사진에 사람이 찍혀 있는데, 그 사람을 광고에 써도 되나요?",
      a: "사진 라이선스(상업 OK)와 **인물 초상권**은 별개입니다. 사진가가 사진을 자유 라이선스로 풀었어도 모델 본인이 광고 사용을 허락한 게 아니면 분쟁 가능. 인물이 식별 가능한 사진을 광고·홍보에 쓸 때는 모델 릴리스가 확보된 유료 스톡(Getty, Shutterstock)을 쓰거나, 사진 속 인물에게 직접 확인하는 게 안전합니다.",
    },
    {
      q: "한글 폰트를 회사 BI·CI 로고에 써도 되나요?",
      a: "폰트마다 다릅니다. 눈누에서 '사용 범위' 표의 'BI/CI' 열을 확인하세요. 가장 안전한 건 SIL Open Font License(OFL) 폰트로, 로고 임베드까지 100% 자유. 일부 폰트는 '본문·웹은 OK, BI/CI 는 별도 라이선스 구매 필요' 라고 명시되어 있으니 다운로드 전 확인 필수.",
    },
    {
      q: "무료 PPT 템플릿을 다운받아서 수정해 다시 판매해도 되나요?",
      a: "거의 모든 사이트가 금지합니다. 미리캔버스·Slidesgo·Canva 등의 약관은 '템플릿을 사용한 결과물(완성된 PPT)' 은 상업 OK 지만, '템플릿 자체나 약간 수정한 템플릿을 재판매·재배포' 하는 행위는 금지합니다. 본인 결과물만 판매·배포 가능.",
    },
    {
      q: "유튜브에 쓸 BGM 은 어디가 가장 안전한가요?",
      a: "**YouTube 스튜디오 오디오 보관함** 이 1순위입니다. 유튜브가 직접 라이선스를 확보한 음원이라 콘텐츠 ID 클레임이 발생하지 않습니다. Pixabay Music·Bensound 같은 사이트도 무료지만 종종 다른 채널이 같은 음원을 등록해 클레임이 발생하므로, 수익 창출이 중요하면 유튜브 공식 라이브러리를 우선 사용하세요.",
    },
    {
      q: "AI 가 생성한 이미지를 Unsplash 같은 곳에서 받았는데 상업 사용해도 되나요?",
      a: "사이트 라이선스 자체는 허용하지만, AI 생성 이미지는 미국·EU·한국에서 저작권 인정 여부가 아직 모호하고, 향후 법 개정으로 소급 적용될 가능성이 있습니다. 최소한 사진·일러스트가 'AI 생성' 으로 명시된 것은 광고·브랜드 중심 자료에는 피하고, 직접 만든 AI 이미지(Midjourney 유료 플랜 등)를 사용하는 게 안전합니다.",
    },
  ],
};

// ---------------------------------------------------------------------------
// 4. 코인 / 주식 무료 도구 (eloan 시너지)
// ---------------------------------------------------------------------------
const COIN: PickCategory = {
  slug: "coin",
  title: "코인·주식 무료 도구 모음 — 백테스트·차트·온체인 14선",
  metaTitle: "코인·주식 무료 도구 모음 — 백테스트·차트·온체인 14선",
  shortTitle: "코인·주식 도구",
  emoji: "📈",
  oneLiner: "트레이더가 실제로 매일 쓰는 무료 도구만 모았습니다.",
  description:
    "TradingView, CoinGecko, DART, KRX, Glassnode, DefiLlama 등 코인·주식 차트·백테스트·온체인·공시 분석 무료 도구 14곳. 본 사이트(eloan)의 백테스트와 함께 쓰면 시너지 큰 도구만 선별.",
  longIntro: [
    "코인·주식 시장에는 '도구 광고비를 받고 추천' 하는 큐레이션이 너무 많습니다. 이 페이지는 본 사이트(eloan) 운영자가 본업으로 트레이딩하며 **3년 이상 직접 사용** 한 도구만 추렸습니다. 어필리에이트 링크가 일절 없고, 모두 1차 출처(거래소·공공기관·메이저 리서치)이거나 무료 플랜만으로도 가치를 충분히 주는 서비스입니다.",
    "전략 검증의 출발점은 **백테스트**입니다. 본 사이트는 업비트 KRW 마켓 + 12종 빌트인 전략을 무료로 검증하게 해주고, TradingView 는 Pine Script 로 본인 전략을 만들 수 있습니다. 백테스트 결과는 슬리피지·체결지연 때문에 실전 대비 10~20% 할인해 보는 게 안전합니다.",
    "시세·데이터는 **CoinGecko + 네이버 증권**, 코인 온체인은 **Glassnode + DefiLlama**, 주식 공시는 **DART + KRX 정보데이터시스템** 조합을 추천. 모두 광고 없는 1차 출처라 노이즈가 적고, 한국 시장의 핵심 데이터는 KRX·DART 에서 무료로 받을 수 있어 굳이 유료 데이터 벤더가 필요 없는 경우가 많습니다.",
    "한국 트레이더라면 **한경 컨센서스** 도 필수입니다. 증권사 애널리스트 리포트를 회원가입 없이 다운로드할 수 있어, 종목 분석의 1차 출처로 가장 빠릅니다. 단, 리포트는 작성 시점의 의견이므로 실제 매매는 항상 본인 판단으로.",
  ],
  selectionCriteria: [
    "3년 이상 직접 사용한 도구만 등록",
    "어필리에이트·광고 추천 일절 제외",
    "1차 출처(거래소·공공기관·메이저 리서치) 우선",
    "무료 플랜만으로도 충분한 가치 제공",
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
  ],
  groups: [
    {
      title: "🧪 백테스트 / 전략 검증",
      items: [
        {
          name: "eloan 백테스트",
          url: "/backtest",
          blurb: "본 사이트. 업비트 KRW + 12종 전략 무료 백테스트.",
          details:
            "본 사이트(eloan)의 핵심 기능. 업비트 KRW 마켓 모든 코인에 대해 12종 빌트인 전략(이동평균·RSI·MACD·볼린저·스토캐스틱 등)을 무료로 백테스트할 수 있고, 결과를 슬러그 URL 로 공유 가능. 가입 없이 사용하지만 회원 가입 시 결과 저장·랭킹·커뮤니티 토론까지 연결됩니다.",
          useCases: [
            "본인 매매 전략 과거 성과 검증",
            "여러 코인·기간 비교",
            "결과 공유 URL 로 토론",
            "수수료·MDD·승률 자동 계산",
          ],
          pricing: "free",
          pricingNote: "100% 무료",
          tip: "결과 페이지 하단의 '전략 설명 박스' 에서 각 지표의 표준 공식과 활용법 확인 가능.",
          alternatives: ["TradingView Pine"],
          founded: "2024",
          korean: true,
        },
        {
          name: "TradingView",
          url: "https://www.tradingview.com",
          blurb: "글로벌 표준 차트. Pine Script 로 자체 백테스트.",
          details:
            "글로벌 1위 차트 플랫폼, 월 활성 사용자 8천만+. Pine Script 라는 자체 언어로 인디케이터·전략을 본인이 직접 만들고 백테스트할 수 있습니다. 무료 플랜은 인디케이터 동시 사용 2개 제한이지만, 코인·주식·외환 데이터 무료 제공.",
          useCases: [
            "본인 전략 Pine Script 로 구현",
            "차트 위 인디케이터 시각화",
            "코인·주식·외환 통합 차트",
            "커뮤니티 공유 스크립트 검색",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Essential $14.95/월~",
          tip: "무료 플랜은 인디케이터 동시 사용 2개 제한. 핵심 지표만 골라 쓰자.",
          alternatives: ["eloan 백테스트", "QuantConnect"],
          founded: "2011",
          korean: true,
        },
      ],
    },
    {
      title: "📊 시세 / 종합",
      items: [
        {
          name: "CoinMarketCap",
          url: "https://coinmarketcap.com",
          blurb: "글로벌 시총·거래량·도미넌스 표준.",
          details:
            "Binance 가 2020년 인수, 사실상 코인 시세의 표준. 1만+ 코인 시세, 거래소별 가격, BTC 도미넌스, 공포·탐욕 지수 등 매크로 지표가 한 곳에. 광고 비중이 늘면서 메인 페이지가 다소 복잡해진 단점은 있음.",
          useCases: [
            "글로벌 시총 순위",
            "거래소별 가격 비교",
            "공포·탐욕 지수 확인",
            "신규 상장 코인 발견",
          ],
          pricing: "free",
          alternatives: ["CoinGecko"],
          founded: "2013",
          korean: true,
        },
        {
          name: "CoinGecko",
          url: "https://www.coingecko.com",
          blurb: "CMC 대안. 알트·DeFi·NFT 데이터 풍부.",
          details:
            "싱가포르 운영, 광고가 적어 데이터 가독성이 더 좋다는 평가. DeFi·NFT·체인별 통계가 CMC 대비 디테일하고, API 무료 한도가 더 큽니다. 본 사이트(eloan)의 외부 시세 조회도 일부 사용.",
          useCases: [
            "알트코인·DeFi·NFT 데이터",
            "체인별 자금흐름",
            "광고 적은 시세 조회",
            "API 무료 사용 (개발자)",
          ],
          pricing: "freemium",
          pricingNote: "무료 / API Pro $129/월~",
          alternatives: ["CoinMarketCap"],
          founded: "2014",
          korean: true,
        },
        {
          name: "네이버 증권",
          url: "https://finance.naver.com",
          blurb: "한국 주식·환율·세계지수 무료 통합.",
          details:
            "네이버 공식. 한국에서 주식 시세를 보는 가장 빠른 경로. KOSPI·KOSDAQ 종목 시세·차트·재무·뉴스·종목 토론까지 한 페이지에. 종목 토론은 노이즈가 많지만 단기 시장 심리 파악에는 유용.",
          useCases: [
            "한국 주식 실시간 시세",
            "종목 재무·차트 빠른 조회",
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
          blurb: "글로벌 주식·ETF·실적·CSV 다운로드.",
          details:
            "글로벌 주식·ETF·외환·암호화폐 통합. 과거 시세 CSV 다운로드가 무료로 가능해 데이터 분석·백테스트의 1차 소스로 자주 사용. 한국 종목(.KS·.KQ)도 일부 지원.",
          useCases: [
            "미국·글로벌 주식 시세",
            "과거 데이터 CSV 다운로드",
            "ETF·뮤추얼펀드 조회",
            "실적 발표 일정",
          ],
          pricing: "free",
          alternatives: ["네이버 증권 (국내)", "Google Finance"],
          founded: "1997",
        },
      ],
    },
    {
      title: "🔬 온체인 / 데이터 분석",
      items: [
        {
          name: "Glassnode",
          url: "https://glassnode.com",
          blurb: "BTC·ETH 온체인 표준. 무료만으로도 유용.",
          details:
            "스위스 운영. BTC·ETH 온체인 지표의 사실상 표준. SOPR·MVRV·HODL Waves 등 학술 논문에 인용되는 지표 다수. 무료 플랜은 24시간 지연 데이터지만, 매크로 분석엔 충분.",
          useCases: [
            "BTC 사이클 분석 (MVRV, SOPR)",
            "장기 보유자 vs 단기 보유자 흐름",
            "거래소 입출금 (Glassnode Studio)",
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
          blurb: "DeFi TVL·체인별 자금흐름. 100% 무료.",
          details:
            "오픈소스·광고 없음·100% 무료의 보기 드문 데이터 사이트. 모든 체인의 DeFi 프로토콜 TVL(Total Value Locked)·수익률·스테이블코인 발행량을 통합 추적. API 도 무료.",
          useCases: [
            "DeFi 프로토콜 TVL 비교",
            "체인별 자금 유입·유출",
            "스테이블코인 발행량",
            "수익률 농사(yield farming) 비교",
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
            "이더리움·솔라나 등 주요 체인의 온체인 데이터를 SQL 로 쿼리해 대시보드로 만드는 플랫폼. 본인이 쿼리를 짜지 않아도 커뮤니티가 만든 수만 개 대시보드를 무료로 조회 가능 — 'NFT 마켓플레이스 점유율', 'L2 트랜잭션 비교' 등.",
          useCases: [
            "커뮤니티 대시보드 무료 열람",
            "본인 SQL 쿼리 작성",
            "NFT·L2·DEX 트래픽 분석",
            "온체인 데이터 학습",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Plus $390/월~",
          alternatives: ["Flipside Crypto", "Footprint"],
          founded: "2018",
        },
        {
          name: "CryptoQuant",
          url: "https://cryptoquant.com",
          blurb: "거래소 입출금 흐름 등 한국발 온체인 데이터.",
          details:
            "한국 스타트업이 만든 글로벌 온체인 분석 플랫폼. 거래소 입출금 흐름, 채굴자 행동, 스테이블코인 유입 등 매크로 시장 분석에 강점. 한국어 인터페이스 지원.",
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
      ],
    },
    {
      title: "🇰🇷 한국 트레이더 전용",
      items: [
        {
          name: "업비트",
          url: "https://upbit.com",
          blurb: "한국 1위 코인 거래소. 공개 API 무제한.",
          details:
            "두나무 운영. 한국 코인 거래량 1위, KRW 마켓 가장 큼. 공개 REST API 가 인증 없이 분당 1만 회까지 무료라 본 사이트(eloan) 백테스트의 1차 데이터 소스. 일반 사용자도 차트·시세·호가 조회가 무료.",
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
          name: "한경 컨센서스",
          url: "https://consensus.hankyung.com",
          blurb: "증권사 애널리스트 리포트 무료 통합.",
          details:
            "한국경제신문 운영. 한국 30+ 증권사의 종목·산업·이코노믹 리포트를 가입 없이 PDF 다운로드 가능. 종목 분석의 1차 출처로 가장 빠르며, 외국계 증권사 리포트도 일부 포함.",
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
          blurb: "금감원 전자공시. 사업·반기·분기보고서 1차 출처.",
          details:
            "금융감독원 공식. 상장사·외감사 대상 기업의 모든 공시(사업·반기·분기·감사·증권신고서)를 무료로 열람·다운로드. 종목 분석의 '진짜 1차 출처' — 한경 컨센서스 리포트의 원천 자료도 결국 DART.",
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
          url: "http://data.krx.co.kr",
          blurb: "한국거래소 공식. 종목·지수 CSV 다운로드.",
          details:
            "한국거래소(KRX) 공식 데이터 포털. 종목·지수·파생·ETF 의 과거 데이터(시가·고가·저가·종가·거래량)를 일별로 CSV 다운로드. 본인이 직접 백테스트·분석할 때 가장 신뢰할 수 있는 한국 시장 1차 데이터.",
          useCases: [
            "한국 주식 과거 데이터 CSV",
            "지수·ETF·파생 데이터",
            "공매도·외국인 지분 통계",
            "직접 백테스트용 데이터",
          ],
          pricing: "free",
          alternatives: ["Yahoo Finance (KS·KQ)"],
          founded: "1956",
          korean: true,
        },
      ],
    },
  ],
  faq: [
    {
      q: "eloan 백테스트와 TradingView 백테스트는 어떻게 다른가요?",
      a: "eloan 은 한국 KRW 코인 시장에 특화되어 업비트 데이터를 그대로 사용하며, 12종 빌트인 전략을 코드 없이 클릭으로 검증할 수 있습니다. TradingView 는 글로벌 전 시장(주식·코인·외환)을 다루지만 본인 전략은 Pine Script 코드로 직접 작성해야 합니다. **간단한 전략 검증·결과 공유는 eloan, 복잡한 본인 전략 개발은 TradingView** 가 효율적입니다.",
    },
    {
      q: "백테스트 결과를 그대로 실전에 적용해도 되나요?",
      a: "절대 그대로 적용하면 위험합니다. 백테스트는 슬리피지(매수·매도 호가 차이)·체결지연·거래 수수료의 시장 충격을 완벽히 반영하지 못합니다. 본 사이트도 백테스트 결과에 **10~20% 할인** 해서 실전 기대치를 잡으라고 권장하며, 실전 진입 전 소액으로 모의·실전 양쪽 비교를 한 달 이상 거치는 게 안전합니다.",
    },
    {
      q: "온체인 데이터를 처음 보는데 어디서 시작해야 하나요?",
      a: "**Glassnode 의 무료 차트** 중 SOPR(Spent Output Profit Ratio)·MVRV(Market Value to Realized Value)·HODL Waves 세 가지 지표부터 보세요. BTC 사이클의 거시 위치를 한눈에 파악할 수 있는 핵심 지표입니다. 그 다음 단계로 DefiLlama 의 TVL, Dune 의 커뮤니티 대시보드로 확장하면 됩니다.",
    },
    {
      q: "한경 컨센서스의 애널리스트 리포트는 신뢰할 만한가요?",
      a: "리포트는 작성 시점의 의견이고, 증권사는 종목을 거래하는 이해관계자라는 점을 항상 고려해야 합니다. 일반적으로 '목표주가' 보다는 '실적 추정치·산업 분석·경쟁사 비교' 같은 객관 데이터를 활용하는 게 좋습니다. 또한 같은 종목에 대한 여러 증권사 리포트를 교차 비교(컨센서스)하는 게 단일 리포트보다 안전합니다.",
    },
    {
      q: "DART 공시는 너무 양이 많은데 어떻게 봐야 하나요?",
      a: "투자 목적이라면 ① **사업보고서**(연 1회, 가장 디테일) ② **분기보고서**(분기별 실적 추세) ③ **주요사항보고서**(유상증자·전환사채·합병 등 가격 변동 이벤트) 세 가지만 우선 확인하면 90% 커버됩니다. DART 의 'Open DART' API 를 이용하면 본인 관심 종목의 신규 공시를 자동 알림받을 수도 있습니다.",
    },
    {
      q: "코인·주식 차트는 어떤 사이트가 가장 정확한가요?",
      a: "**거래소 직접 차트** 가 1차 출처입니다 — 한국 코인은 업비트, 미국 주식은 해당 종목의 NYSE·NASDAQ, 한국 주식은 KRX. 종합 플랫폼 중에는 **TradingView 가 동기화·지연 면에서 가장 정확** 하다는 평가가 일관됩니다. 네이버 증권은 지연 5~15분, Yahoo Finance 는 미국 종목 기준 15분 지연이 기본.",
    },
    {
      q: "주식·코인 API 를 무료로 쓰고 싶은데 어디가 좋나요?",
      a: "**한국 코인**은 업비트 공개 API(분당 10,000회 무료), **글로벌 코인**은 CoinGecko 무료 플랜(분당 30회), **한국 주식**은 한국투자증권·키움증권 OpenAPI(계좌 있으면 무료), **글로벌 주식**은 Yahoo Finance 비공식 라이브러리(yfinance 등)나 Alpha Vantage 무료 플랜이 대표적입니다.",
    },
  ],
};

// ---------------------------------------------------------------------------
// 허브 FAQ
// ---------------------------------------------------------------------------
export const HUB_FAQ: FaqEntry[] = [
  {
    q: "주소모음 사이트들은 어떤 기준으로 선정되나요?",
    a: "① 합법·공식 서비스만(정부·공공기관·메이저 운영사), ② 한국 사용자가 바로 쓸 수 있는 곳 우선(한국어 지원 또는 한국 결제수단), ③ 운영자가 직접 사용·검증한 곳, ④ 어필리에이트·광고 추천 일절 없음 — 이 네 가지를 만족하지 못하는 사이트는 등록하지 않습니다.",
  },
  {
    q: "도박·성인·불법 스트리밍 같은 '주소모음' 도 있나요?",
    a: "전혀 없습니다. 본 사이트는 합법·공식 큐레이션만 다루며, 그런 회색지대 콘텐츠는 어떤 형태로도 등록하지 않습니다.",
  },
  {
    q: "얼마나 자주 업데이트되나요?",
    a: "각 카테고리 페이지 상단에 '마지막 업데이트' 일자가 표시됩니다. 매월 1회 전수 점검으로 사이트 폐쇄·서비스 중단·라이선스 변경 등을 반영하며, 새로 등록할 만한 서비스가 생기면 수시 추가됩니다.",
  },
  {
    q: "여기 등록되지 않은 좋은 사이트를 제안할 수 있나요?",
    a: "본 사이트는 운영자 1인이 큐레이션하는 구조라 외부 제안은 받지 않습니다. 다만 합법·공식 서비스이며 한국 사용자 가치가 높다면 운영자가 자체 발견 후 점검을 거쳐 추가할 가능성이 있습니다.",
  },
];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
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

// 가격 한글 라벨
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
