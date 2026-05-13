// 주소모음 큐레이션 데이터.
// 목적: 유입. 사람 손으로 적은 톤, SEO 키워드 자연 포함, 어줍잖은 일반론 X.

export type PickCategorySlug = "ai" | "money" | "free" | "coin";

export type Pricing = "free" | "freemium" | "paid";

export type PickItem = {
  name: string;
  url: string;
  blurb: string; // 검색결과 노출용 한 줄 (60자 내외)
  details: string; // 본문 설명 (3~5문장, 사실·숫자·한국 사용성)
  useCases: string[]; // 이럴 때 쓰는 시나리오 (롱테일 흡수)
  pricing: Pricing;
  pricingNote?: string; // 정확한 금액·한도
  tip?: string; // 실전 단축 팁
  alternatives?: string[];
  korean?: boolean;
  founded?: string;
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
  oneLiner: "한국에서 가입·결제·이용 다 되는 것만.",
  description:
    "ChatGPT, Claude, Gemini, Midjourney, Suno, Cursor 등 한국에서 바로 쓰는 AI 도구 31가지. 무료 한도, 한국어 품질, 결제 방법, 대안까지 정리.",
  longIntro: [
    "AI 도구 추천 글 진짜 많은데 대부분 광고다. 여기는 결제까지 다 해보고 6개월 이상 쓴 것만 골랐다. 어필리에이트 링크 없음.",
    "한국 기준으로만 본다. 한국 IP·카드·전화번호로 가입·결제·이용이 안 되면 등록 안 함. VPN 안 쓰고도 정상 동작하는 서비스만.",
    "용도별 1순위만 빠르게. 챗봇은 ChatGPT(범용)와 Claude(긴 글·코드). 검색은 Perplexity. 이미지는 ChatGPT 내장(한글) 또는 Midjourney(고퀄). 영상은 Runway, 음악은 Suno, 음성합성은 ElevenLabs, 받아쓰기는 클로바노트(공짜). 코딩은 Cursor 또는 Claude Code. 번역은 DeepL.",
    "회사 자료·고객 개인정보·미공개 재무는 그대로 붙여넣지 말 것. 무료 플랜은 거의 다 학습 데이터로 사용된다. 가명화하거나 Team/Enterprise 플랜의 학습 거부 옵션을 켜고 쓰자.",
    "매주 신규 서비스 쏟아져서 매월 한 번씩 갈아엎는다. 신뢰도 없는 신규 서비스(1년 미만, 익명 운영자)는 일단 보류.",
  ],
  selectionCriteria: [
    "한국 IP·결제수단으로 가입·이용 가능",
    "한국어 입출력 품질 직접 테스트해 영어 대비 70% 이상",
    "출시 1년 이상 또는 메이저 회사 운영",
    "어필리에이트·광고 추천 일절 없음",
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
      title: "💬 챗봇 / 대화형 AI (메이저 5)",
      items: [
        {
          name: "ChatGPT",
          url: "https://chat.openai.com",
          blurb: "범용 챗봇 1등. 무료로도 이미지·검색·코드 다 됨.",
          details:
            "GPT-5 기반. 한국에서 가입·결제·이용 다 정상. 무료 플랜으로도 이미지 생성(DALL·E 3), 웹 검색, 파이썬 코드 실행, 파일 분석까지 다 풀려 있다. GPT-5 사용량은 4~5시간마다 리셋되는 짧은 한도라 긴 작업 중간에 끊긴다. Plus($20/월) 결제하면 한도 거의 무제한이고 응답 빠름.",
          useCases: [
            "이메일·보고서 초안",
            "엑셀 파일 올려서 데이터 분석",
            "코드 디버깅·리팩터링",
            "이미지 한 줄로 생성",
            "한국어 회화·번역·교정",
            "음성 모드로 영어 회화",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Plus $20/월 / Pro $200/월",
          tip: "설정 → Personalization → Custom Instructions 에 직업·말투·자주 쓰는 표현 넣으면 매번 같은 톤 유지.",
          alternatives: ["Claude", "Gemini", "뤼튼"],
          founded: "2022",
          korean: true,
        },
        {
          name: "Claude",
          url: "https://claude.ai",
          blurb: "긴 PDF·코드 리뷰·한국어 톤이 1등.",
          details:
            "Anthropic 의 Opus 4.x / Sonnet 4.x 모델. 200K 토큰(한국어 단행본 1권 분량) 한 번에 처리 가능. 긴 계약서, 논문, 코드베이스를 통째로 던지고 요약·리뷰시킬 때 ChatGPT 보다 정확도 높음. 한국어 문장 결도 차분한 편이라 진지한 글쓰기에 어울림. 음성 모드·이미지 생성은 없거나 약함.",
          useCases: [
            "긴 PDF·계약서·논문 한 번에 요약",
            "코드베이스 리뷰·리팩터링",
            "한국어 카피·시나리오 라이팅",
            "Projects 기능으로 자료 미리 넣고 반복 작업",
            "심리 상담형 대화 (검열 적음)",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Pro $20/월 / Max $100·$200/월",
          tip: "Projects 안에 자주 쓰는 자료(이력서, 회사 정보, 문체 가이드)를 미리 넣어두면 매 대화마다 컨텍스트 유지.",
          alternatives: ["ChatGPT", "Gemini"],
          founded: "2023",
          korean: true,
        },
        {
          name: "Gemini",
          url: "https://gemini.google.com",
          blurb: "Gmail·Docs·유튜브와 통합되는 구글 AI.",
          details:
            "Gemini 2.x Pro·Ultra. 단독 챗봇보다 구글 생태계 결합이 핵심. Gmail 안에서 답장 자동 작성, Docs 안에서 글 다듬기, Drive 파일 검색·요약, 유튜브 URL 만 던지면 영상 요약·번역까지 한 번에. 안드로이드 기본 비서로도 들어감.",
          useCases: [
            "Gmail·Docs·Sheets 안에서 AI 보조",
            "유튜브 영상 한글 요약",
            "구글 검색 결과 자동 정리",
            "안드로이드 음성 비서 대체",
            "긴 동영상 받아쓰기·번역",
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
          blurb: "출처 링크까지 같이 주는 검색형 AI.",
          details:
            "ChatGPT 는 답변만, Perplexity 는 답변에 각주 5~10개. 사실 확인이 빠르고 리포트·논문에 그대로 인용 가능. 한국어로 물어도 영문 출처를 자동 번역해 보여줌. 광고 비중도 낮음. Pro 모드는 GPT-5, Claude Opus, Gemini Pro 중 골라서 다중 검색.",
          useCases: [
            "보고서·논문 자료 수집",
            "최신 뉴스 팩트체크",
            "제품·서비스 가격·기능 비교",
            "투자 분석 1차 출처 찾기",
            "여행·맛집 정보 검색 (구글보다 잡소리 적음)",
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
          blurb: "X(트위터) 실시간 데이터 + 검열 적은 답변.",
          details:
            "일론 머스크의 xAI 가 운영. X(트위터) 의 실시간 트윗을 학습 데이터로 같이 보기 때문에 '지금 무슨 일이 벌어지고 있나' 류 질문에 강점. ChatGPT·Claude 보다 검열·거부가 적은 편이라 정치·사회 이슈에 직설적인 답을 받기 쉬움.",
          useCases: [
            "실시간 X(트위터) 트렌드 분석",
            "정치·사회 이슈 직설 답변",
            "검열로 막힌 질문 우회",
            "최신 뉴스 빠른 요약",
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
          blurb: "GPT·Claude·자체 모델 무료로 한 화면에서.",
          details:
            "뤼튼테크놀로지스가 운영. 광고 기반으로 GPT·Claude 같은 메이저 모델을 무료로 동시 사용할 수 있게 해줌. 한국식 자기소개서·블로그·SNS·이커머스 카피 템플릿이 가장 많다. 결제 부담 없이 AI 입문하기 좋음.",
          useCases: [
            "GPT·Claude 동시 사용 (무료)",
            "자기소개서·이력서 한국식 첨삭",
            "블로그·인스타 카피",
            "결제 없이 입문",
          ],
          pricing: "free",
          pricingNote: "광고 기반 무료. 일부 기능 유료",
          alternatives: ["ChatGPT", "Claude"],
          founded: "2022",
          korean: true,
        },
        {
          name: "CLOVA X (네이버)",
          url: "https://clova-x.naver.com",
          blurb: "네이버 토종 LLM. 한국 사이트·쇼핑 연결 강점.",
          details:
            "네이버가 만든 HyperCLOVA X 기반 챗봇. 네이버 쇼핑·블로그·지도와 직접 연결돼 한국 상점·맛집·여행 정보가 정확하다. 글로벌 모델은 잘 모르는 동네 식당·국내 쇼핑몰 정보를 잘 가져옴.",
          useCases: [
            "한국 쇼핑·맛집·여행 검색",
            "네이버 블로그 글쓰기 보조",
            "한국어 뉴스·정책 요약",
            "글로벌 AI 가 모르는 국내 정보",
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
          blurb: "한국어 명령 가장 잘 알아듣는 이미지 AI.",
          details:
            "ChatGPT 에 '~한 그림 그려줘' 한 줄이면 끝. 한국어 프롬프트 이해도가 모든 이미지 AI 중 최고. 캐릭터 일관성, 이미지 안에 한글·영문 텍스트 넣기가 다른 도구보다 안정적. 무료 플랜도 일 일정 횟수 풀려 있음.",
          useCases: [
            "한국어 명령으로 즉시 생성",
            "이미지 안에 한글 텍스트 (포스터)",
            "캐릭터 일관성 시리즈물",
            "유튜브 썸네일 한글 텍스트 합성",
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
          blurb: "사진·일러스트 퀄리티 1등. 영문 프롬프트 위주.",
          details:
            "V7 기준. 영화 콘셉트아트·잡지 표지 수준의 미적 완성도. 단점은 무료 체험 거의 없음, 한국어 프롬프트는 영어 대비 정확도 떨어짐. Discord 보다 웹앱(midjourney.com) 에서 작업하는 게 편함.",
          useCases: [
            "콘셉트아트·포트폴리오",
            "상업 광고 이미지",
            "잡지·출판물 일러스트",
            "유튜브 썸네일 배경",
          ],
          pricing: "paid",
          pricingNote: "Basic $10 / Standard $30 / Pro $60 / Mega $120 (월)",
          tip: "프롬프트 끝에 --style raw --ar 16:9 --s 50 같은 파라미터 묶음을 외워두면 톤 일관성 유지.",
          alternatives: ["ChatGPT 이미지", "Leonardo", "Ideogram"],
          founded: "2022",
        },
        {
          name: "Leonardo AI",
          url: "https://leonardo.ai",
          blurb: "Stable Diffusion 기반, 무료 일 150 크레딧.",
          details:
            "매일 150 크레딧(약 50~100장) 무료 제공. LoRA·캐릭터 학습·이미지→이미지 변환 같은 SD 고급 기능을 GUI 로 다룰 수 있어 입문자가 쓰기 좋다. 무료만으로 충분히 양산 가능.",
          useCases: [
            "무료로 다양한 스타일 실험",
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
          blurb: "이미지 안에 영문 텍스트 정확도 1등.",
          details:
            "로고, 포스터, 광고 카피처럼 이미지 안에 글자가 들어가야 할 때 가장 정확. 다른 이미지 AI 는 글자가 일그러지는 반면 Ideogram 은 거의 깨지지 않는다. 한글은 아직 약함(영문 위주).",
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
          blurb: "실시간 캔버스 + 8K 업스케일.",
          details:
            "스케치를 캔버스에 그리면 실시간으로 완성된 이미지가 같이 그려진다. 저화질 이미지 8K 업스케일도 1티어. 영상 생성(Krea Video) 도 빠르게 발전 중.",
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
          blurb: "텍스트·이미지 → 영상. 광고·뮤직비디오 현장 사용.",
          details:
            "Gen-3 Alpha 모델. 5~10초 분량의 영상 생성에서 사실상 표준. 무료 일 125 크레딧 풀려 있어 가입만 하면 바로 테스트 가능. 영상 안 오브젝트 제거·교체, 카메라 무빙 컨트롤도 됨.",
          useCases: [
            "유튜브·릴스 b-roll",
            "광고·홍보 콘셉트 컷",
            "기존 영상 오브젝트 제거",
            "정지 이미지 → 영상",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 125 크레딧 / Standard $15/월~",
          alternatives: ["Pika", "Kling", "Sora"],
          founded: "2018",
        },
        {
          name: "Sora (OpenAI)",
          url: "https://sora.com",
          blurb: "OpenAI 영상 AI. 최대 20초·1080p.",
          details:
            "ChatGPT Plus 결제하면 같이 풀린다. 한 번에 최대 20초·1080p 까지 생성 가능. 카메라 동선·물리 표현이 다른 도구보다 자연스러움.",
          useCases: [
            "긴 영상 (최대 20초)",
            "물리 시뮬레이션 (액체·중력)",
            "카메라 무빙 정교한 컷",
            "ChatGPT 안에서 바로 생성",
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
          blurb: "중국발. 가성비 좋고 동작 자연스러움.",
          details:
            "중국 콰이쇼우의 영상 AI. 인물 동작·표정 묘사가 다른 도구 대비 자연스럽다는 평가. 무료 한도가 넉넉한 편이라 일단 테스트하기 좋음. 결제는 카드 가능.",
          useCases: [
            "인물 동작 위주 영상",
            "립싱크·말하는 얼굴",
            "무료 한도로 양산",
            "Runway 대안",
          ],
          pricing: "freemium",
          pricingNote: "무료 일 6 크레딧 / Pro $10/월~",
          alternatives: ["Runway", "Pika"],
          founded: "2024",
        },
        {
          name: "HeyGen",
          url: "https://www.heygen.com",
          blurb: "AI 아바타 영상. 본인 얼굴로 한국어 더빙.",
          details:
            "본인 얼굴을 30초 녹화해 업로드하면 그 얼굴로 어떤 언어든 말하는 영상이 나옴. 립싱크 정확도가 1티어라 광고·강의·릴스에 실제로 쓰인다. 사내 교육 영상, 다국어 마케팅 영상 양산에 강점.",
          useCases: [
            "본인 얼굴 + AI 음성 영상",
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
          blurb: "가사 + 장르 입력 → 완성된 노래. 한국어 보컬 OK.",
          details:
            "가사와 장르(예: '로파이 발라드, 슬픈 분위기')만 적으면 보컬·반주가 완성된 곡이 1~2분 안에 나온다. 한국어 발음 자연스러움. 무료 일 10곡 생성 가능. 유튜브 BGM, 광고 CM송, 결혼식 축가 만들 때 실제로 쓰인다.",
          useCases: [
            "유튜브·릴스 BGM",
            "광고 CM송",
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
          blurb: "Suno 직접 경쟁작. 사운드 디테일·믹싱 좋음.",
          details:
            "이전 구글 DeepMind 출신들이 만듦. Suno 와 비교해 사운드 디테일·믹싱 퀄리티가 좋다는 평가. 한국어 보컬도 가능. 무료 한도는 Suno 보다 빡빡.",
          useCases: [
            "고품질 데모곡",
            "프로 믹싱 퀄리티 필요할 때",
            "Suno 대안",
          ],
          pricing: "freemium",
          pricingNote: "무료 월 1,200 크레딧 / Pro $10/월",
          alternatives: ["Suno"],
          founded: "2023",
        },
        {
          name: "ElevenLabs",
          url: "https://elevenlabs.io",
          blurb: "음성 합성·복제 1등. 한국어 32개국어.",
          details:
            "본인 목소리 5분 녹음해 올리면 '내 목소리로 한국어·영어·일본어' 다 됨. 오디오북 출판, 유튜브 내레이션, 게임 더빙 현장에서 표준. 무료 월 1만 자라 짧은 영상은 무료로 처리 가능.",
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
          blurb: "한국어 회의록·받아쓰기 1등. 100% 무료.",
          details:
            "네이버 공식. 강의·회의·인터뷰 녹음 파일을 한국어 텍스트로 변환. 화자 분리(누가 무슨 말 했는지), AI 요약, 키워드 자동 추출까지 됨. 글로벌 STT 대비 한국어 정확도 훨씬 높고 가격은 무료. 학생·직장인 필수.",
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
          blurb: "한국 토종 회의록 AI. 클로바노트 대안.",
          details:
            "리턴제로 운영. 클로바노트와 양강 구도. 회의록·강의 받아쓰기에 특화돼 있고, 화자별 발언 통계, 회의록 검색이 디테일하다. 기업용 SSO·관리자 기능이 있어 회사 단위 도입 사례 많음.",
          useCases: [
            "사내 회의록 (회사 단위 도입)",
            "강의 받아쓰기·요약",
            "발언자별 통계",
            "클로바노트 대안",
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
            "VS Code 를 포크해서 GPT·Claude 가 코드베이스 전체를 이해하게 만든 IDE. Cmd+K 로 자연어 → 즉시 수정, Composer 로 멀티파일 리팩터링이 한 번에 됨. 2026년 현재 시니어 개발자도 메인 에디터로 사용.",
          useCases: [
            "기존 코드베이스 리팩터링",
            "신규 기능 멀티파일 추가",
            "버그 디버깅 (전체 트레이스)",
            "API 마이그레이션",
          ],
          pricing: "freemium",
          pricingNote: "Hobby 무료 / Pro $20/월 / Business $40/월",
          tip: ".cursorrules 파일에 프로젝트 규칙·코딩 컨벤션을 넣어두면 일관성 유지.",
          alternatives: ["Copilot", "Windsurf", "Claude Code"],
          founded: "2022",
        },
        {
          name: "GitHub Copilot",
          url: "https://github.com/features/copilot",
          blurb: "에디터 자동완성·채팅. 학생·OSS 무료.",
          details:
            "Microsoft / GitHub 공식. VS Code·JetBrains·Vim 등 거의 모든 에디터에 플러그인. 입력 중인 코드를 실시간 자동완성. 학생·교사·인기 OSS 메인테이너는 100% 무료라 진입 비용 없음.",
          useCases: [
            "보일러플레이트 자동완성",
            "테스트 코드 자동 생성",
            "주석 → 함수 본문 생성",
            "기존 에디터 그대로 쓰기",
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
            "Anthropic 공식. 터미널에서 claude 명령 실행. 현재 디렉토리 전체를 컨텍스트로 이해해 멀티파일 변경·테스트 실행·git 커밋·PR 까지 자동 처리. 대규모 리팩터링·버그 추적에서 1티어.",
          useCases: [
            "대규모 리팩터링",
            "버그 추적 (멀티파일 트레이스)",
            "터미널 워크플로우 자동화",
            "VS Code/JetBrains 확장도 가능",
          ],
          pricing: "paid",
          pricingNote: "Claude Pro $20/월 / Max $100·$200/월 사용량 포함",
          alternatives: ["Cursor", "Aider"],
          founded: "2024",
        },
        {
          name: "v0 by Vercel",
          url: "https://v0.dev",
          blurb: "프롬프트 → React/Tailwind UI 즉시 생성.",
          details:
            "Vercel 공식. '대시보드 만들어줘', '로그인 폼' 같은 한국어 명령 한 줄이면 React + Tailwind + shadcn/ui 컴포넌트 코드가 미리보기와 함께 나옴. Next.js 프로젝트에 그대로 복붙.",
          useCases: [
            "랜딩 페이지 빠른 프로토타입",
            "UI 컴포넌트 시안 (디자이너 대안)",
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
          blurb: "프롬프트 → 풀스택 앱. 브라우저에서 바로 배포.",
          details:
            "StackBlitz 운영. 한 문장으로 풀스택 앱(프론트+백+DB)을 만들고 브라우저 안에서 즉시 실행·배포까지 됨. v0 가 UI 라면 Bolt 는 앱 전체. 비개발자가 MVP 만들 때 자주 쓰임.",
          useCases: [
            "비개발자 MVP 제작",
            "풀스택 프로토타입",
            "프론트+백 동시 생성",
            "v0 + 백엔드 조합",
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
          blurb: "자연스러움 1등 번역기. 무료 한도 충분.",
          details:
            "독일 DeepL SE. 한·영, 한·일 번역에서 구글 번역 대비 문장이 훨씬 자연스럽다는 평가. 무료 일 5천 자, PDF·Word 파일 직접 번역도 제공. 크롬 확장 깔면 웹페이지 자동 번역.",
          useCases: [
            "영문 메일·논문 번역",
            "일본어·중국어·유럽어 양방향",
            "PDF·Word 파일 통째 번역",
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
          blurb: "네이버 번역기. 일본어·중국어·한국 구어체 강점.",
          details:
            "네이버 공식. DeepL 이 못 잡는 일본어 구어체·중국어 신조어·한국 구어체에 강하다. 음성 번역, 이미지 OCR 번역(메뉴판·간판) 도 됨. 100% 무료.",
          useCases: [
            "일본어·중국어 일상 회화",
            "이미지 OCR 번역 (메뉴판)",
            "한국 여행객 도구",
            "DeepL 대안 (무료)",
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
          blurb: "노션 안에서 요약·작성·번역.",
          details:
            "이미 노션 쓰고 있다면 가장 자연스러움. 스페이스바 한 번이면 현재 페이지 요약·번역·확장. AI 검색으로 워크스페이스 전체 문서를 자연어로 검색 가능.",
          useCases: [
            "회의록 자동 요약",
            "위키 문서 빠른 작성",
            "워크스페이스 전체 검색",
            "협업 문서 한·영 동시 작성",
          ],
          pricing: "paid",
          pricingNote: "노션 기본 + 사용자당 $10/월",
          alternatives: ["ChatGPT", "Claude Projects"],
          founded: "2023",
          korean: true,
        },
        {
          name: "Gamma",
          url: "https://gamma.app",
          blurb: "프롬프트 → 슬라이드·웹페이지·문서 즉시.",
          details:
            "한 줄 프롬프트로 PPT·웹페이지·문서가 한 번에 생성. 한국어 지원 우수. 기존 PPT 보다 더 인터랙티브한 슬라이드를 만들 수 있고, 그대로 웹에 게시 가능.",
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
          blurb: "영문 문법·톤 교정. 영어 글쓰기 필수.",
          details:
            "영어 글쓰기 교정 표준. 단순 문법 + 비즈니스/캐주얼/학술 톤 조정, 표절 검사까지. 크롬 확장·MS Word·Gmail 등 거의 모든 곳에 자동 통합.",
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
      q: "2026년 한국에서 가장 많이 쓰는 AI 도구는?",
      a: "범용 챗봇은 ChatGPT 가 유료 사용자 가장 많고, 긴 글·코딩은 Claude 가 강세. 한국어 회의록은 네이버 클로바노트가 1위로 굳어졌다. 검색·리서치는 Perplexity, 이미지는 Midjourney 와 ChatGPT 내장(DALL·E 3) 가 같이 쓰임.",
    },
    {
      q: "ChatGPT 와 Claude 중 뭐 쓰지?",
      a: "일상 대화·이미지·음성 모드·웹 검색은 ChatGPT 가 앞선다. 긴 PDF 요약, 코드 리뷰, 한국어 카피라이팅은 Claude 가 한 수 위. 둘 다 무료 플랜 있으니 같은 질문 던져보고 결과물 톤이 맞는 쪽 결제하면 됨. 굳이 하나만 골라야 하면 ChatGPT 가 무난.",
    },
    {
      q: "유료 결제 안 하고 무료로만 쓸 수 있나?",
      a: "가능. ChatGPT·Claude·Gemini 모두 무료 플랜 있음. 한국 토종 뤼튼은 광고 기반으로 GPT·Claude 까지 무료. 이미지는 Leonardo 가 매일 150 크레딧 무료, 음성은 클로바노트가 100% 무료. 단, 영상 생성(Runway·Sora)과 Midjourney 는 거의 유료 전용.",
    },
    {
      q: "회사 자료를 AI 에 올려도 되나?",
      a: "위험. 모든 AI 서비스가 무료 플랜은 입력 데이터를 학습에 쓸 수 있고, 옵트아웃 옵션이 있어도 기본값이 학습 허용인 경우 많다. 회사 기밀·고객 개인정보·미공개 재무 자료는 그대로 붙여넣지 말고 가명화 후 사용하거나, Team/Enterprise 플랜의 No-train 약관을 활용해야 한다.",
    },
    {
      q: "AI 로 만든 이미지를 상업적으로 써도 되나?",
      a: "서비스 약관에 따라 다르다. Midjourney·DALL·E 3(ChatGPT Plus 이상)·Leonardo 유료 플랜은 상업 이용 명시 허용. 무료 플랜은 상업 제한 또는 저작자 표시 의무가 붙는 경우 있으니 다운로드 전 약관 확인 필수. 특정 작가·캐릭터를 모방한 결과물은 별도 분쟁 소지.",
    },
    {
      q: "AI 코딩 도구 쓰면 실력 안 늘지 않나?",
      a: "초보일수록 자동 생성에만 의존하면 학습 곡선 무너진다. 본인이 먼저 작성하고 → AI 한테 리뷰 요청 → 답변의 why 까지 이해한 뒤 적용하는 순서로. 익숙하지 않은 라이브러리·언어는 일부러 자동완성 꺼두고 직접 쓰는 게 좋다.",
    },
    {
      q: "ChatGPT 한국어 답변이 어색한데 어떻게 개선?",
      a: "Custom Instructions 에 직업·전문 분야·선호하는 말투(존댓말/반말, 격식/캐주얼)를 명시. 매번 첫 줄에 '한국어 모국어 사용자처럼 자연스럽게' 라고 시스템 프롬프트 넣어도 효과적. 전문 용어 많은 분야는 Claude 가 더 자연스러운 결과를 자주 준다.",
    },
    {
      q: "한국어 회의록·받아쓰기 어디가 1등?",
      a: "네이버 클로바노트(100% 무료) 가 정확도·요약·화자 분리에서 글로벌 도구 대비 우위. 회사 단위 도입은 한국 토종 Daglo 가 SSO·관리자 기능 있어서 같이 검토할 만하다. 글로벌 Whisper API 는 한국어 정확도가 클로바노트보다 살짝 떨어짐.",
    },
  ],
};

// ===========================================================================
// 2. 정부지원금 / 환급금
// ===========================================================================
const MONEY: PickCategory = {
  slug: "money",
  title: "정부지원금·환급금 받는 사이트 모음 — 숨은돈 찾는 22곳",
  metaTitle: "정부지원금·환급금 받는 사이트 모음 — 숨은돈 찾는 22곳",
  shortTitle: "정부지원금",
  emoji: "💰",
  oneLiner: "신청만 하면 받는 돈. 안 받으면 손해.",
  description:
    "정부24, 보조금24, 복지로, 카드포인트 통합조회, 내보험 찾아줌, 휴면예금 찾아줌, 홈택스 등 신청만 하면 받는 정부·금융 공식 사이트 22곳. 30분이면 평균 10만원.",
  longIntro: [
    "여기는 정부·공공기관·금융결제원 공식 사이트만 적었다. 도메인 끝이 .go.kr / .or.kr 인지 항상 확인하자. 정부지원금·환급금 빙자한 보이스피싱·문자 사칭 매우 많다.",
    "처음 시작이면 정부24의 보조금24부터 → 카드포인트 통합조회 → 내 계좌 한눈에(어카운트인포) → 내보험 찾아줌 → 휴면예금 찾아줌. 이 다섯 곳 30분 안에 돌면 평균 10만원 이상 회수된다. 본인 인증(공동인증·간편인증)만 있으면 즉시 결과 나옴.",
    "세금 환급은 시즌이 있다. 연말정산은 1~3월, 종합소득세는 5월, 부가가치세는 1·7월. 홈택스에서 환급금 조회 메뉴로 미수령 환급금 확인 가능. 5년 이내라면 경정청구로 추가 환급도 받을 수 있다.",
    "청년이면 온통청년(youthcenter.go.kr) 부터. 19~39세 대상 주거·취업·금융 지원이 한 번에 검색된다. 청년도약계좌, 청년월세 한시 특별지원, 국민취업지원제도 등 자격만 맞으면 받을 수 있는 게 매년 새로 나옴.",
    "보이스피싱·사칭 문자 클릭하지 말 것. 정부·공공기관은 문자나 전화로 '지금 클릭하면 받는다' 며 링크 유도하지 않는다. 모든 신청은 본인이 공식 사이트 직접 접속해서 진행해야 한다.",
  ],
  selectionCriteria: [
    "정부·공공기관 공식 사이트만 (.go.kr / .or.kr)",
    "민간 중개·광고 사이트 일절 제외",
    "본인 인증만으로 즉시 조회·신청 가능",
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
    "보조금24",
    "내 계좌 한눈에",
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
            "행정안전부 운영. 주민등록등본·가족관계증명서 같은 민원 발급부터 보조금 자동 매칭까지 한 곳에서. 간편인증(카카오·네이버·통신사) 로그인 후 '나의 혜택' 메뉴에서 받을 수 있는 지원금이 자동으로 뜬다.",
          useCases: [
            "받을 수 있는 정부지원금 자동 진단",
            "주민등록등본·증명서 무료 발급",
            "출산·결혼·이사 시 행정 처리",
            "정부 민원 신청 추적",
          ],
          pricing: "free",
          pricingNote: "전부 무료",
          tip: "로그인 후 '나의 혜택' 결과를 캡처해두면 1년 후 재확인할 때 비교 편함.",
          founded: "2015",
          korean: true,
        },
        {
          name: "보조금24",
          url: "https://www.gov.kr/portal/subsidy24/cmm/main",
          blurb: "정부보조금 1,400개 자동 매칭.",
          details:
            "정부24 안에 들어있는 서비스. 1,400개 이상 중앙·지방 보조금을 본인 정보(나이·소득·가구원·거주지)에 맞춰 자동 매칭. 청년·신혼부부·소상공인은 평균 5~10개 항목 잡힌다.",
          useCases: [
            "본인 자격 보조금 자동 검색",
            "신혼·청년·소상공인 지원금 일괄 확인",
            "출산·돌봄·교육 보조금",
            "지자체 한정 지원도 같이 노출",
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
            "보건복지부 운영. 기초생활보장·의료급여·한부모가족지원·청년월세지원 등 복지 사업 신청·자격 진단 한 곳에서. '복지서비스 모의계산' 으로 받을 수 있는 급여 금액 미리 시뮬레이션 가능.",
          useCases: [
            "기초생활·차상위·한부모 자격 진단",
            "청년월세지원 신청",
            "장애인·노인 돌봄",
            "긴급 복지 신청",
          ],
          pricing: "free",
          founded: "2010",
          korean: true,
        },
        {
          name: "온통청년",
          url: "https://www.youthcenter.go.kr",
          blurb: "청년 정책 통합. 주거·취업·금융.",
          details:
            "국무조정실 운영. 19~39세 청년 대상 중앙·지자체 정책 1만+ 건 통합 검색. 청년도약계좌, 청년월세, 청년창업, 국가기술자격 응시료 지원까지 일괄 확인.",
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
      title: "💸 숨은 돈 찾기 (보험·예금·포인트)",
      items: [
        {
          name: "내보험 찾아줌",
          url: "https://cont.insure.or.kr",
          blurb: "본인 명의 모든 보험 + 숨은보험금.",
          details:
            "생명·손해보험협회 공동 운영. 본인 명의 보험 가입 내역과 미수령 만기·중도·휴면 보험금 한 번에 조회. 부모님 사후 보험금 미신청 사례 많아 가족 단위로 한 번씩 돌리는 게 안전.",
          useCases: [
            "본인 보험 가입 현황 확인",
            "가족 사후 미수령 보험금 청구",
            "휴면 보험금 환급",
            "중복 보험 정리",
          ],
          pricing: "free",
          tip: "조회만으로 끝나지 않음. '미수령' 표시되면 해당 보험사 콜센터로 직접 청구해야 함.",
          alternatives: ["파인"],
          founded: "2017",
          korean: true,
        },
        {
          name: "휴면예금·보험금 찾아줌",
          url: "https://www.sleepmoney.or.kr",
          blurb: "10년 이상 거래 없는 예금·보험금.",
          details:
            "서민금융진흥원 운영. 10년 이상 거래 없어 사실상 잊혀진 예금·보험금을 본인 인증 한 번으로 통합 조회·환급 신청. 평균 환급액 5~30만원.",
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
          blurb: "전 금융권 계좌·대출·연금·신용 통합.",
          details:
            "금융감독원 공식. '내 계좌 한눈에', '내 카드 한눈에', '잠자는 내 돈 찾기' 등 14개 금융 조회 서비스 한 곳에. 가장 강력한 게 연금 가입 현황 — 국민·퇴직·개인연금 통합 노후 시뮬레이션.",
          useCases: [
            "전 금융권 계좌·잔액 조회",
            "본인 명의 대출·카드 발급 내역",
            "국민·퇴직·개인연금 통합",
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
            "여신금융협회 운영. 신한·삼성·KB·현대·롯데·하나·우리·NH·BC 모든 카드사 포인트 한 화면. 클릭 두 번이면 본인 계좌로 1원 단위까지 현금 출금. 평균 3~5만원 회수.",
          useCases: [
            "전 카드사 포인트 통합 확인",
            "포인트 → 계좌로 즉시 현금화",
            "유효기간 임박 포인트 점검",
            "분기별 정기 점검",
          ],
          pricing: "free",
          tip: "분기마다 한 번씩만 들러도 충분. 출금까지 5분 안 걸림.",
          founded: "2018",
          korean: true,
        },
        {
          name: "내 계좌 한눈에 (어카운트인포)",
          url: "https://www.payinfo.or.kr",
          blurb: "전 은행 계좌 조회 + 비활동 계좌 정리.",
          details:
            "금융결제원 운영. 본인 명의 모든 은행·증권·저축은행·우체국 계좌 한 번에 조회. 1년 이상 거래 없는 비활동 계좌의 잔액을 본인 주거래 계좌로 일괄 이체·해지까지 가능.",
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
            "국세청 운영. 5월 종합소득세 신고, 1월 연말정산 간소화, 부가가치세, 경정청구(과거 5년 세금 재계산), 환급금 조회까지 세금 행정의 시작점. '환급금 조회·신청' 메뉴에서 미수령 환급금이 자동 표시된다.",
          useCases: [
            "5월 종합소득세 신고",
            "연말정산 간소화 자료 발급",
            "과거 5년 경정청구 (놓친 공제 환급)",
            "사업자 부가가치세",
          ],
          pricing: "free",
          tip: "5월 종합소득세 기간엔 '환급금 조회' 메뉴부터 확인. 과거 환급받지 못한 돈이 자동 표시됨.",
          founded: "2002",
          korean: true,
        },
        {
          name: "위택스",
          url: "https://www.wetax.go.kr",
          blurb: "지방세(자동차·재산·주민세) 납부·환급.",
          details:
            "행정안전부 운영. 국세는 홈택스, 지방세는 위택스로 이원화. 자동차세 연납 신청(1월, 최대 9.15% 할인), 주민세, 재산세, 지방소득세까지. 환급금 조회도 홈택스와 별도로 해야 함.",
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
            "국세청 공식 안내. 근로장려금 최대 330만원, 자녀장려금 자녀 1명당 100만원. 5월 정기 신청, 9월 반기 신청 가능(1년 두 번). 자격 자동진단 도구도 같이 제공. 단독·홑벌이·맞벌이 소득 기준 다름.",
          useCases: [
            "5월 정기 신청",
            "9월 반기 신청",
            "자격 자동 진단",
            "최대 430만원 (근로+자녀)",
          ],
          pricing: "free",
          founded: "2009",
          korean: true,
        },
      ],
    },
    {
      title: "👷 고용 / 실업 / 직업훈련",
      items: [
        {
          name: "고용24 (워크넷)",
          url: "https://www.work24.go.kr",
          blurb: "구직·실업급여·내일배움카드 통합.",
          details:
            "고용노동부 공식. 워크넷·HRD-Net·실업급여·청년수당 통합. 실업급여(구직급여) 신청, 국민내일배움카드(연 500만원 직업훈련비), 청년구직활동지원금까지 다 여기서. 2024년 전면 개편되며 사용성 크게 개선됨.",
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
          name: "국민취업지원제도",
          url: "https://www.work24.go.kr/cm/main.do",
          blurb: "월 50만원 × 6개월 구직촉진수당.",
          details:
            "고용24 안에서 신청. 저소득 구직자에게 월 50만원 × 6개월 구직촉진수당 지급 + 취업활동 지원. Ⅰ유형(중위소득 60% 이하), Ⅱ유형(특정계층) 으로 구분. 신청은 고용센터 방문 + 온라인 병행.",
          useCases: [
            "장기 구직자 월 50만원 6개월",
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
          blurb: "국민연금·건강·고용·산재 통합.",
          details:
            "국민연금공단 운영. 본인 국민연금·건강보험·고용보험·산재보험 가입 이력과 납부액 한 번에 확인. 퇴사·이직 시 4대보험 자격 변동 확인 필수.",
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
      title: "🍼 출산 / 보육 / 교육",
      items: [
        {
          name: "임신육아종합포털 아이사랑",
          url: "https://www.childcare.go.kr",
          blurb: "출산·육아·어린이집 통합.",
          details:
            "보건복지부 운영. 출산·육아·어린이집·아이돌봄서비스·양육수당·아동수당 통합 포털. 어린이집 입소 대기, 아이돌봄 신청, 보육료·양육수당 신청 다 여기서.",
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
            "사회서비스 전자바우처. 임신 1회당 100만원(다태아 140만원) 진료비 바우처 + 첫만남이용권 200만원(2026년 기준). 카드사 7곳에서 발급, 가까운 산부인과·병원에서 결제 가능.",
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
          blurb: "정부 지원 아이돌보미. 시간당 1만원 안팎.",
          details:
            "여성가족부 운영. 만 12세 이하 자녀를 둔 가정에 정부 인증 돌보미를 시간 단위로 파견. 소득 구간별로 정부지원금이 차등 적용돼 본인 부담은 시간당 1,500~12,180원 수준(2026년 기준). 갑작스러운 일·병원 등 단시간 돌봄에 가장 유용.",
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
        {
          name: "한국장학재단",
          url: "https://www.kosaf.go.kr",
          blurb: "학자금 대출·국가장학금 통합.",
          details:
            "교육부 산하 공공기관. 국가장학금(소득 구간별 차등), 학자금 대출(취업 후 상환·일반 상환), 근로장학금, 우수장학금까지 대학생 자금 지원 통합 포털. 신청은 보통 4월·8월 정기 + 수시.",
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
      ],
    },
    {
      title: "🏠 주거 / 소상공인",
      items: [
        {
          name: "마이홈 포털",
          url: "https://www.myhome.go.kr",
          blurb: "공공주택·전세임대 통합 안내.",
          details:
            "국토교통부 운영. 공공임대, 행복주택, 매입임대, 전세임대 등 LH·SH 등 모든 공공주택 정보 한 곳에. 본인 자격(소득·자산·가구원) 입력하면 해당 주택 자동 매칭.",
          useCases: [
            "공공임대 자격 확인",
            "행복주택 입주 신청",
            "전세임대 한도 조회",
            "청년 1인가구 공공주택",
          ],
          pricing: "free",
          alternatives: ["LH 청약센터", "SH 서울주택공사"],
          founded: "2013",
          korean: true,
        },
        {
          name: "LH 청약플러스",
          url: "https://apply.lh.or.kr",
          blurb: "LH 공공임대·분양 청약.",
          details:
            "한국토지주택공사 공식. 전국 공공임대·분양·신혼희망타운·청년주택 청약 통합. 청약 일정·자격·당첨 결과까지 한 곳에.",
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
          name: "소상공인 마당",
          url: "https://www.sbiz.or.kr",
          blurb: "소상공인 정책자금·교육·컨설팅.",
          details:
            "소상공인시장진흥공단 운영. 정책자금 대출, 폐업 지원, 재기 지원, 교육·컨설팅 통합. 코로나 이후 정책자금 신청 폭증한 곳.",
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
      ],
    },
  ],
  faq: [
    {
      q: "정부지원금·환급금 받으려면 어디부터?",
      a: "정부24 보조금24 → 카드포인트 통합조회 → 내 계좌 한눈에 → 내보험 찾아줌 → 휴면예금 찾아줌 다섯 곳 순서대로 30분 안에. 모두 본인 인증만 있으면 즉시 결과 나오고 평균 회수 금액은 10만원 이상.",
    },
    {
      q: "보이스피싱·사칭 어떻게 구분?",
      a: "정부·공공기관은 문자·전화로 '지금 신청하면 받는다' 며 클릭 유도 안 한다. 모든 신청은 본인이 공식 사이트(.go.kr / .or.kr)에 직접 접속해 본인 인증 후 진행해야 한다. 문자 속 링크는 절대 클릭하지 말 것. 검색해도 '광고' 표시 붙은 결과 대신 공식 도메인을 확인.",
    },
    {
      q: "근로장려금·자녀장려금 누구나 받나?",
      a: "아님. 단독 가구 연소득 2,200만원, 홑벌이 3,200만원, 맞벌이 3,800만원 이하 + 재산 2.4억원 미만(2026년 기준). 홈택스 '근로장려금 자동 진단' 으로 자격 확인 가능. 5월 정기 신청 외 9월 반기 신청도 있음.",
    },
    {
      q: "카드포인트 진짜 현금으로 출금되나?",
      a: "됨. cardpoint.or.kr 에서 본인 인증 후 모든 카드사 포인트를 한 번에 본인 명의 계좌로 출금. 1원 단위까지 가능, 수수료 없음. 출금 후 1~3영업일 내 입금. 분기마다 한 번씩 점검하면 됨.",
    },
    {
      q: "연말정산 놓치거나 잘못했는데 다시 환급 가능?",
      a: "과거 5년 이내라면 홈택스 '경정청구' 로 누락된 소득공제·세액공제를 다시 신청해 환급받을 수 있음. 의료비·기부금·월세 세액공제 등이 흔히 누락된다. 5년 지나면 청구 불가하니 매년 5월 종합소득세 기간에 같이 점검.",
    },
    {
      q: "휴면예금·휴면보험금은 어떻게 다른가?",
      a: "휴면예금은 만기·해지 후 5년 이상, 휴면보험금은 만기·해지·실효 후 3년 이상 청구 없는 자산. 둘 다 sleepmoney.or.kr 에서 한 번에 조회 가능. 환급 신청 후 본인 계좌로 입금. 사망자의 휴면자산도 상속인이 대신 청구 가능.",
    },
    {
      q: "청년월세·청년도약계좌 어디서?",
      a: "청년월세는 복지로(bokjiro.go.kr), 청년도약계좌는 취급 은행 앱·창구. 두 사업 다 온통청년(youthcenter.go.kr) 에서 자격 진단·신청 링크 통합 안내. 청년도약계좌는 만 19~34세, 개인소득 7,500만원 이하 등 자격 있으니 가입 전 진단 필수.",
    },
    {
      q: "출산하면 받을 수 있는 돈은?",
      a: "첫만남이용권 200만원(국민행복카드), 임신·출산 진료비 100만원 바우처, 부모급여(2026년 0세 월 100만원·1세 월 50만원), 아동수당(0~7세 월 10만원), 지자체별 출산축하금까지. 임신육아종합포털 아이사랑(childcare.go.kr) 에서 통합 안내.",
    },
  ],
};

// ===========================================================================
// 3. 무료 리소스 (폰트·이미지·PPT)
// ===========================================================================
const FREE: PickCategory = {
  slug: "free",
  title: "상업용 무료 폰트·이미지·PPT 사이트 모음 28선",
  metaTitle: "상업용 무료 폰트·이미지·PPT 모음 28선 (라이선스 확인)",
  shortTitle: "무료 리소스",
  emoji: "🎁",
  oneLiner: "디자인·블로그·발표자료 만들 때 쓰는 무료 사이트.",
  description:
    "눈누, 미리캔버스, Unsplash, Pexels, Flaticon, Slidesgo, YouTube 오디오 보관함 등 상업용 무료 폰트·이미지·일러스트·PPT 템플릿·BGM·효과음 사이트 28곳.",
  longIntro: [
    "여기 적은 사이트는 전부 상업용 이용이 허용된 무료 리소스. 다만 100% 자유로운 곳은 일부고, 대부분 저작자 표시(CC-BY) 또는 재배포 금지 같은 조건이 붙는다. 다운로드 직전 라이선스 페이지 한 번 더 확인하는 게 안전.",
    "한국에서 가장 안전한 출발은 눈누(noonnu.cc), 공유마당 폰트, 미리캔버스. 셋 다 한국 운영, 한국어 인터페이스, 라이선스가 한글로 정리돼 있어 분쟁 가능성 거의 없다.",
    "해외 사이트(Unsplash·Pexels·Pixabay)는 라이선스가 너그럽지만, 사진 속 인물 초상권·브랜드 로고·예술작품은 별도 권리가 살아있다. 인물 사진을 광고에 쓸 때나 미술관 작품을 상업물에 쓸 때는 추가 확인 필요.",
    "PPT·디자인은 미리캔버스랑 Canva 가 양강. 미리캔버스는 한국식 카드뉴스·한글 폰트가 압도적, Canva 는 글로벌 트렌드·인스타·릴스 템플릿이 강하다. 둘 다 무료 플랜으로 충분.",
    "유튜브 BGM 은 YouTube 스튜디오 안 오디오 보관함이 가장 안전하다. 콘텐츠 ID 클레임이 사전 면제돼 있어 수익 창출 영상에 안심하고 쓸 수 있다.",
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
          blurb: "한글 상업용 무료 폰트 1등. 라이선스 표 명확.",
          details:
            "한글 무료 폰트 큐레이션 사실상 표준. 1,000+ 무료 폰트를 인쇄·웹·영상·BI/CI·OFL 6개 사용 영역별로 표시. 디자이너가 아니어도 라이선스 즉시 판단 가능. 본문용·제목용·손글씨 카테고리별 검색·미리보기·다운로드 한 페이지에서.",
          useCases: [
            "PPT·문서 본문 한글 폰트",
            "유튜브 썸네일 제목",
            "로고·BI 제작 (OFL 폰트 선별)",
            "상업물 라이선스 확인",
          ],
          pricing: "free",
          pricingNote: "100% 무료, 광고 기반",
          tip: "검색 필터 '본문용' 켜면 가독성 좋은 폰트만 추려진다. 폰트 카드의 사용 범위 표는 항상 사이트에서 다시 확인.",
          alternatives: ["공유마당 폰트", "폰트프리"],
          founded: "2017",
          korean: true,
        },
        {
          name: "공유마당 폰트",
          url: "https://gongu.copyright.or.kr",
          blurb: "한국저작권위원회 공식. 안심 폰트.",
          details:
            "한국저작권위원회 운영. 만료 저작물 기반 폰트와 공공기관 배포 폰트만 모아 분쟁 가능성 가장 낮음. 디자인 품질은 눈누 대비 보수적이지만 공공기관 문서·교과서 같은 안전 용도에 최적.",
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
          blurb: "기업 무료 폰트 모음. 카카오·네이버 등.",
          details:
            "카카오·네이버·NHN·아모레퍼시픽 같은 기업이 배포한 무료 한글 폰트 모음. 상업용 OK 라이선스가 대부분이라 안심. 눈누에 없는 기업 폰트 발견할 때 좋음.",
          useCases: [
            "기업 무료 폰트 (카카오, 네이버 등)",
            "눈누에 없는 폰트 발견",
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
          blurb: "1,500+ 무료. 노토 산스 KR 포함.",
          details:
            "Google 운영. 모든 폰트가 SIL Open Font License 또는 Apache 2.0 으로 상업·재배포 100% 자유. 한글은 노토 산스 KR, 나눔 시리즈 등 메이저 한글 폰트도 다수. CDN 으로 웹사이트에 즉시 임베드 가능.",
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
          blurb: "Adobe CC 구독자 무료 17,000+ 폰트.",
          details:
            "Adobe Creative Cloud 구독자라면 추가 비용 없이 17,000+ 폰트 사용 가능. 상업 OK, 웹·인쇄 모두. 한글 폰트도 일부 포함. Photoshop·Illustrator 사용자라면 굳이 다른 폰트 안 찾아도 됨.",
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
          blurb: "고화질 사진 500만+. 상업 OK, 표시 불필요.",
          details:
            "Getty Images 자회사. 500만+ 고화질 사진을 Unsplash 라이선스로 제공 — 상업·수정·배포 모두 자유, 저작자 표시는 의무 아님(해주면 좋음). 사진 품질이 스톡 사진 회사 수준으로 일관. AI 이미지가 늘면서 '실사 사진' 만 쓸 때 1순위.",
          useCases: [
            "블로그·웹사이트 헤더",
            "PPT 표지·섹션",
            "유튜브 썸네일 배경",
            "광고·인쇄물",
          ],
          pricing: "free",
          tip: "사진 속 인물 초상권·브랜드 로고는 별도 권리. 광고·홍보용 인물 사진은 모델 릴리스 있는 유료 스톡 쓰는 게 안전.",
          alternatives: ["Pexels", "Pixabay"],
          founded: "2013",
        },
        {
          name: "Pexels",
          url: "https://www.pexels.com",
          blurb: "사진 + 영상. 한국어 검색 OK.",
          details:
            "사진과 영상(스톡 비디오) 같이 제공. Pexels 라이선스로 상업·수정·배포 자유, 저작자 표시 의무 없음. Unsplash 비교하면 영상 라이브러리가 강점이고, 한국어 검색 인식해 한국 사용자 편함.",
          useCases: [
            "유튜브·릴스 b-roll 영상",
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
            "독일 운영. 사진뿐 아니라 일러스트·벡터·동영상·음악·효과음까지 한 사이트에서. Pixabay 라이선스로 상업 OK, 저작자 표시 무관. 일러스트·벡터는 AI 생성물 비중 늘고 있어 품질 편차 큼.",
          useCases: [
            "사진·일러스트·음악 통합",
            "벡터(SVG·AI) 다운로드",
            "유튜브 BGM·효과음",
            "예산 없는 1인 크리에이터",
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
            "5~30초 짜리 시네마틱 영상을 Coverr 라이선스로 무료 제공(상업 OK, 출처 표시는 해주면 좋음). 웹사이트 헤더 배경, 랜딩 페이지 영상으로 특화. 사진보다 영상이 필요할 때.",
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
            "영상·BGM·효과음·Premiere/After Effects 템플릿 무료. Mixkit 라이선스로 상업 OK, 저작자 표시 불필요. 유튜버가 가장 자주 보는 사이트 중 하나.",
          useCases: [
            "유튜브 b-roll",
            "BGM·효과음",
            "Premiere/AE 템플릿",
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
            "1인 프로젝트(Katerina Limpitsouni). 모든 일러스트가 SVG 라 색상을 한 번에 브랜드 컬러로 변경 가능. unDraw 라이선스로 상업·수정·재배포 자유, 출처 표기조차 불필요. 랜딩 페이지에 가장 많이 쓰이는 일러스트 스타일.",
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
            "Freepik 그룹 운영. 일러스트를 정적 PNG·SVG 뿐 아니라 애니메이션 GIF·Lottie 로도 받을 수 있다. 컬러 팔레트 즉시 변경, 스타일별(라이너·라운드·라인)로 톤 통일 가능.",
          useCases: [
            "애니메이션 일러스트 (GIF·Lottie)",
            "온보딩 화면 단계별",
            "다양한 스타일에서 통일",
            "광고용 캐릭터",
          ],
          pricing: "free",
          pricingNote: "무료 (출처 표시) / Premium 출처 불필요",
          alternatives: ["unDraw"],
          founded: "2020",
        },
        {
          name: "Open Peeps",
          url: "https://www.openpeeps.com",
          blurb: "조립식 사람 캐릭터 일러스트.",
          details:
            "Pablo Stanley 제작. 사람 캐릭터의 머리·표정·옷·자세를 부분별로 조립해 본인만의 캐릭터를 만드는 핸드 드로잉 일러스트 키트. CC0 라이선스로 100% 자유.",
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
          blurb: "아이콘 1,400만+. 무료(출처) / 유료.",
          details:
            "Freepik 그룹 운영. 1,400만+ 아이콘과 7만+ 스티커 팩. 무료 플랜은 flaticon.com 출처 표시 필수, 유료(€10/월)는 표시 불필요. 동일 컬렉션 안에서 일관된 톤 아이콘 받을 수 있어 디자인 통일성 유리.",
          useCases: [
            "PPT·문서 아이콘",
            "앱·웹 UI 아이콘 (Premium)",
            "인포그래픽",
            "교육 자료",
          ],
          pricing: "freemium",
          pricingNote: "무료(출처) / Premium €10/월",
          alternatives: ["Lucide", "Heroicons"],
          founded: "2013",
        },
        {
          name: "Lucide",
          url: "https://lucide.dev",
          blurb: "오픈소스 SVG 아이콘 1,400+. 100% 자유.",
          details:
            "Feather Icons 커뮤니티 포크. ISC License 로 상업·수정·재배포 완전 자유. 출처 표시 불필요. React·Vue·Svelte 패키지 제공. 본 사이트(eloan)도 사용 중.",
          useCases: [
            "웹·앱 개발자",
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
            "Tailwind CSS 만든 팀이 제작한 SVG 아이콘. MIT 라이선스. Outline·Solid·Mini 3 스타일. Tailwind 기반 프로젝트의 사실상 표준.",
          useCases: [
            "Tailwind 프로젝트",
            "Outline/Solid 두 톤 필요",
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
            "5,500+ 무료 아이콘. MIT 라이선스. 검색 키워드가 풍부해서 원하는 아이콘 찾기 쉽고, 모서리 굵기·둥글기까지 사이트에서 즉시 조절 가능.",
          useCases: [
            "다양성 필요할 때 (5,500+)",
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
          blurb: "한국 1위 무료 디자인 툴. PPT·썸네일·명함.",
          details:
            "(주)미리디 운영. 한국 1위 디자인 SaaS. 학생·소상공인·1인 마케터가 가장 많이 사용. PPT·카드뉴스·썸네일·명함·전단지 한국식 마케팅 자료 템플릿이 압도적. 무료 플랜에서도 워터마크 없음.",
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
          blurb: "글로벌 1위. 인스타·릴스 템플릿 강점.",
          details:
            "호주 Canva 운영, 전 세계 1.5억+ MAU. 한국어 인터페이스·한국 인기 폰트 제공. 글로벌 디자인 트렌드·인스타그램 릴스 템플릿이 가장 빠르게 업데이트. AI 기능(Magic Studio)도 무료 일부 사용 가능.",
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
            "(주)리아모어소프트 운영. 미리캔버스와 양강 구도지만 카드뉴스·인포그래픽 템플릿이 더 다양. PPT 보다 SNS 콘텐츠가 주력이라면 망고보드, 슬라이드 위주면 미리캔버스.",
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
            "Freepik 그룹 운영. Google Slides·PowerPoint·Canva 형식 모두 다운로드 가능한 PPT 템플릿 전문. 글로벌 1위로 비즈니스·교육·마케팅 카테고리 풍부. 무료는 출처 표시 슬라이드 1장 자동 포함.",
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
          blurb: "유튜브 공식. 콘텐츠 ID 안전 BGM·효과음.",
          details:
            "YouTube 공식. 모든 음원이 유튜브 콘텐츠 ID 시스템에서 클레임 안 받도록 사전 보장. 수익 창출 영상에 무조건 안전한 음원이 필요할 때 1순위. 채널 없어도 구글 계정만 있으면 접속 가능.",
          useCases: [
            "유튜브 BGM (콘텐츠 ID 안전)",
            "효과음 (장르별 검색)",
            "수익 창출 영상",
            "팟캐스트·릴스 음원",
          ],
          pricing: "free",
          tip: "유튜브 스튜디오 → 좌측 메뉴 '오디오 보관함'. 채널 없어도 구글 계정만 있으면 됨.",
          alternatives: ["Pixabay Music", "Bensound"],
          founded: "2013",
          korean: true,
        },
        {
          name: "Bensound",
          url: "https://www.bensound.com",
          blurb: "BGM 전문. 무료(출처 표시) / 유료.",
          details:
            "독립 작곡가 Benjamin Tissot 운영. 클래시컬·재즈·록·일렉트로닉 등 장르별 무료 BGM. 무료 사용 시 출처 표시 의무. Pro 라이선스($19~) 사면 출처 표시 불필요.",
          useCases: [
            "유튜브 BGM (출처 표기 OK)",
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
            "Universitat Pompeu Fabra 운영, 비영리. 60만+ 사운드 클립을 CC0·CC-BY 등 크리에이티브 커먼즈로 제공. 효과음·환경음·필드 레코딩 강점. 다운로드 전 각 사운드의 정확한 라이선스 확인 필수.",
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
            "스페이스바 한 번이면 새로운 색상 팔레트가 즉시 생성. 잠금 기능으로 특정 색만 유지하고 나머지만 변경 가능. 무료로 무제한 생성·저장·내보내기(PNG/PDF/SCSS).",
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
            "Adobe 공식. 색상 휠로 보색·유사색·삼각배색 자동 생성. 접근성(WCAG) 대비비 체크 기능이 다른 도구 대비 강점. 무료 회원가입 시 Adobe CC 와 자동 동기화.",
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
            "본인이 좋아하는 색 50개를 골라주면 AI 가 그 취향을 학습해 무한대로 새 컬러 조합을 추천. 한 번 학습시켜두면 매번 비슷한 결과 안 나옴. 그라데이션·타이포·이미지에 미리 적용된 형태로 보여주는 게 큰 장점.",
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
            "컬러를 고르는 즉시 가상의 웹페이지에 적용된 모습이 실시간으로 보임. Tailwind config·CSS 변수·Figma 토큰 형식으로 즉시 내보내기. 디자인 시안 단계에서 가장 빠르게 컬러 의사결정 가능.",
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
      q: "'상업용 무료' 라고 적혀 있어도 광고에 써도 되나?",
      a: "각 사이트 라이선스에 따라 다르다. Unsplash·Pexels·Pixabay·unDraw·Lucide 는 광고·인쇄·재배포 다 가능. Slidesgo·Flaticon 무료 플랜은 출처 표시 의무, 미리캔버스·Canva 는 결과물은 상업 OK 지만 템플릿 자체 재판매는 금지. 다운로드 직전 라이선스 페이지 확인 필수.",
    },
    {
      q: "Unsplash 사진에 사람 찍혀 있는데 광고에 써도?",
      a: "사진 라이선스(상업 OK)와 인물 초상권은 별개. 사진가가 자유 라이선스로 풀었어도 모델 본인이 광고 허락 안 했으면 분쟁 가능. 인물 식별되는 사진을 광고·홍보에 쓸 땐 모델 릴리스 있는 유료 스톡(Getty·Shutterstock) 쓰는 게 안전.",
    },
    {
      q: "한글 폰트를 회사 BI·CI 로고에 써도?",
      a: "폰트마다 다름. 눈누에서 '사용 범위' 표의 'BI/CI' 열 확인. 가장 안전한 건 SIL Open Font License(OFL) 폰트로, 로고 임베드까지 100% 자유. 일부 폰트는 본문·웹은 OK 지만 BI/CI 는 별도 라이선스 구매 필요한 경우 있음.",
    },
    {
      q: "무료 PPT 템플릿 받아서 수정해 재판매 가능?",
      a: "거의 모든 사이트가 금지. 미리캔버스·Slidesgo·Canva 약관은 템플릿 사용한 완성 PPT 는 상업 OK 지만, 템플릿 자체나 약간 수정한 템플릿을 재판매·재배포는 금지. 본인 결과물만 판매 가능.",
    },
    {
      q: "유튜브 BGM 어디가 가장 안전?",
      a: "YouTube 스튜디오 오디오 보관함이 1순위. 유튜브가 직접 라이선스 확보한 음원이라 콘텐츠 ID 클레임 발생 안 함. Pixabay Music·Bensound 도 무료지만 종종 다른 채널이 같은 음원 등록해 클레임 발생하므로, 수익 창출 중요하면 유튜브 공식 라이브러리 우선.",
    },
    {
      q: "AI 가 생성한 이미지를 Unsplash 등에서 받았는데 상업 사용 OK?",
      a: "사이트 라이선스는 허용하지만 AI 생성물의 저작권 인정 여부가 미국·EU·한국 모두 미정. 향후 법 개정으로 소급 적용 가능성 있음. AI 생성 명시 이미지는 광고·브랜드 자료에는 피하고, 본인이 직접 만든 AI 이미지(Midjourney 유료 등) 쓰는 게 안전.",
    },
    {
      q: "한국 폰트인지 영문 폰트인지 어떻게 구분?",
      a: "Google Fonts 는 좌측 필터에서 Language → Korean 선택. 눈누는 한글 전용. 외국 폰트가 한글을 지원하는 경우도 있는데 자모 일부만 지원해서 깨지는 경우 많으니 다운로드 후 한글 텍스트로 직접 확인하는 게 안전.",
    },
    {
      q: "효과음·BGM 사이트 너무 많은데 우선순위는?",
      a: "유튜버라면 YouTube 오디오 보관함 → Pixabay Music → Bensound 순서. 게임·앱 사운드 디자인이면 Freesound → Mixkit. 광고·CM 송이면 Suno·Udio 같은 AI 생성으로 본인만의 음원 만드는 게 분쟁 가능성 가장 낮음.",
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
  oneLiner: "트레이더가 매일 쓰는 무료 도구만.",
  description:
    "TradingView, 업비트, CoinGecko, DART, KRX, Glassnode, DefiLlama, 한경 컨센서스 등 한국 트레이더가 실제로 쓰는 코인·주식 차트·백테스트·온체인·공시 무료 도구 23곳.",
  longIntro: [
    "코인·주식 도구 추천 글 진짜 많은데 대부분 광고비 받고 적는 것. 여기는 운영자가 본업으로 트레이딩하며 3년 이상 직접 쓴 것만 골랐다. 어필리에이트 링크 없음.",
    "전략 검증은 백테스트부터. 본 사이트(eloan) 는 업비트 KRW 마켓 + 12종 빌트인 전략 무료. TradingView 는 Pine Script 로 본인 전략 만들 수 있다. 백테스트 결과는 슬리피지·체결지연 때문에 실전 대비 10~20% 할인해서 봐야 안전.",
    "시세는 CoinGecko + 네이버 증권, 온체인은 Glassnode + DefiLlama, 한국 주식 공시는 DART + KRX 정보데이터시스템. 다 광고 없는 1차 출처라 노이즈 적다.",
    "한국 트레이더라면 한경 컨센서스 필수. 증권사 애널리스트 리포트를 회원가입 없이 PDF 로 다운받을 수 있어 종목 분석 1차 출처로 가장 빠름. 단, 리포트는 작성 시점 의견이라 매매는 본인 판단으로.",
    "거래소 계정은 국내 1곳 + 해외 1곳 양쪽 만들어두면 좋다. 국내는 업비트·빗썸·코빗, 해외는 Binance·Bybit. 김프 차익은 안 노리더라도 글로벌 알트코인 대응이 빨라진다.",
  ],
  selectionCriteria: [
    "3년 이상 직접 사용한 도구만",
    "어필리에이트·광고 추천 일절 제외",
    "1차 출처(거래소·공공기관·메이저 리서치) 우선",
    "무료 플랜만으로도 가치 있는 서비스",
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
            "본 사이트(eloan) 의 핵심 기능. 업비트 KRW 마켓 모든 코인에 대해 12종 빌트인 전략(이동평균·RSI·MACD·볼린저·스토캐스틱 등)을 무료로 백테스트. 결과를 슬러그 URL 로 공유 가능. 회원 가입 시 결과 저장·랭킹·커뮤니티 토론까지 연결.",
          useCases: [
            "본인 매매 전략 과거 성과 검증",
            "여러 코인·기간 비교",
            "결과 공유 URL 로 토론",
            "수수료·MDD·승률 자동 계산",
          ],
          pricing: "free",
          pricingNote: "100% 무료",
          tip: "결과 페이지 하단 '전략 설명 박스' 에서 각 지표 표준 공식과 활용법 확인 가능.",
          alternatives: ["TradingView Pine"],
          founded: "2024",
          korean: true,
        },
        {
          name: "TradingView",
          url: "https://www.tradingview.com",
          blurb: "글로벌 표준 차트. Pine Script 백테스트.",
          details:
            "글로벌 1위 차트 플랫폼, 월 활성 8천만+. Pine Script 라는 자체 언어로 인디케이터·전략을 직접 만들고 백테스트. 무료는 인디케이터 동시 2개 제한이지만 코인·주식·외환 데이터 무료 제공.",
          useCases: [
            "본인 전략 Pine Script 구현",
            "차트 위 인디케이터 시각화",
            "코인·주식·외환 통합 차트",
            "커뮤니티 공유 스크립트",
          ],
          pricing: "freemium",
          pricingNote: "무료 / Essential $14.95/월~",
          tip: "무료는 인디케이터 동시 2개 제한. 핵심만 골라 쓰자.",
          alternatives: ["eloan", "QuantConnect"],
          founded: "2011",
          korean: true,
        },
        {
          name: "QuantConnect",
          url: "https://www.quantconnect.com",
          blurb: "Python·C# 알고리즘 트레이딩 백테스트.",
          details:
            "글로벌 알고리즘 트레이딩 플랫폼. Python·C# 코드로 본인 전략을 만들고 무료 클라우드 컴퓨팅으로 백테스트 실행. 주식·옵션·선물·외환·코인 통합 데이터 무료. 실전 자동매매 연결까지 한 사이트에서 가능.",
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
            "두나무 운영. 한국 코인 거래량 1위, KRW 마켓 가장 큼. 공개 REST API 가 인증 없이 분당 1만 회까지 무료라 본 사이트(eloan) 백테스트의 1차 데이터 소스. 차트·시세·호가 조회 무료.",
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
            "빗썸코리아 운영. 거래량은 업비트보다 작지만 일부 알트코인은 업비트 상장 전에 먼저 풀리는 경우 있다. 거래 수수료 0.04% 로 업비트보다 살짝 저렴. 메이커·테이커 동일.",
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
          blurb: "신한금융 인수. 안정성·법적 보호 강점.",
          details:
            "신한금융그룹이 인수. 거래량은 작지만 신한과 연동되는 법적 보호·자금 안정성이 다른 거래소 대비 명확. 보수적인 투자자가 보조 거래소로 자주 활용.",
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
            "글로벌 1위 거래소. 알트코인 종류, 선물·옵션·스테이킹·런치풀 등 상품 다양성 압도적. 한국 사용자는 KYC 통과 후 USDT 입금으로 사용. 김프 차익을 안 노리더라도 글로벌 알트 대응에 필수.",
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
            "글로벌 2~3위. 선물·파생 거래에 특화돼 있고 UI 가 Binance 보다 깔끔하다는 평. 신규 코인 상장 속도도 빠른 편. KYC·USDT 입금으로 사용.",
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
          blurb: "Web3·DeFi 지갑 통합 글로벌 거래소.",
          details:
            "글로벌 톱 5 거래소. 중앙화 거래소 + Web3 지갑 + DeFi 거래 + NFT 마켓플레이스를 한 앱에서 통합. 신규 알트·DeFi·체인별 토큰 접근이 빠름. KYC 필요. 한국어 지원.",
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
            "싱가포르 운영. CMC 대비 광고 적어 데이터 가독성 좋다는 평. DeFi·NFT·체인별 통계가 디테일하고 API 무료 한도 큼. 본 사이트(eloan) 외부 시세 조회도 일부 사용.",
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
            "Binance 자회사. 1만+ 코인 시세, 거래소별 가격, BTC 도미넌스, 공포·탐욕 지수 등 매크로 지표. 광고 비중이 늘면서 메인 페이지가 다소 복잡.",
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
            "네이버 공식. 한국 주식 시세 보는 가장 빠른 경로. KOSPI·KOSDAQ 시세·차트·재무·뉴스·종목 토론 한 페이지. 종목 토론은 노이즈 많지만 단기 심리 파악에 유용.",
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
            "글로벌 주식·ETF·외환·암호화폐 통합. 과거 시세 CSV 다운로드가 무료라 데이터 분석·백테스트 1차 소스로 자주 사용. 한국 종목(.KS·.KQ) 일부 지원.",
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
            "미국 주식 스크리닝(필터) 사이트. PER·PBR·배당률 등 100+ 지표로 종목 필터링이 빠름. 메인 화면의 S&P500 히트맵이 시각화 표준.",
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
          blurb: "BTC·ETH 온체인 표준. 무료만으로도 유용.",
          details:
            "스위스 운영. BTC·ETH 온체인 지표 사실상 표준. SOPR·MVRV·HODL Waves 등 학술 논문 인용 지표 다수. 무료는 24시간 지연 데이터지만 매크로 분석엔 충분.",
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
            "오픈소스·광고 없음·100% 무료. 모든 체인의 DeFi 프로토콜 TVL(Total Value Locked)·수익률·스테이블코인 발행량을 통합 추적. API 도 무료.",
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
          blurb: "온체인 SQL 대시보드. 타인 대시보드 무료.",
          details:
            "이더리움·솔라나 등 주요 체인 온체인 데이터를 SQL 로 쿼리해 대시보드 생성. 본인이 쿼리 안 짜도 커뮤니티 만든 수만 개 대시보드 무료 조회. NFT 마켓플레이스 점유율, L2 트랜잭션 비교 같은 거.",
          useCases: [
            "커뮤니티 대시보드 무료 열람",
            "본인 SQL 쿼리",
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
          blurb: "한국 스타트업 발 온체인 분석.",
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
        {
          name: "Token Terminal",
          url: "https://tokenterminal.com",
          blurb: "코인 프로젝트 매출·이익 데이터.",
          details:
            "코인 프로젝트의 매출·이익·사용자수 등 전통 재무 데이터로 변환해 보여주는 사이트. P/S, P/E 비율로 코인 밸류에이션 비교 가능. 메인 지표 무료.",
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
            "한국경제신문 운영. 한국 30+ 증권사 종목·산업·이코노믹 리포트 가입 없이 PDF 다운로드. 종목 분석 1차 출처로 가장 빠름. 외국계 증권사 리포트도 일부 포함.",
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
            "금융감독원 공식. 상장사·외감사 대상 기업의 모든 공시(사업·반기·분기·감사·증권신고서) 무료 열람·다운로드. 종목 분석 진짜 1차 출처 — 한경 컨센서스 리포트의 원천 자료도 결국 DART.",
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
            "한국거래소(KRX) 공식 데이터 포털. 종목·지수·파생·ETF 의 과거 데이터(시·고·저·종·거래량)를 일별로 CSV 다운로드. 본인이 직접 백테스트·분석할 때 가장 신뢰할 수 있는 한국 시장 1차 데이터.",
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
            "장외(K-OTC 포함) 비상장 주식 시세·매매 정보. IPO 예정·청약 일정 정리가 한국에서 가장 빠르고 정확. UI 는 옛날 그대로지만 데이터가 정확해 트레이더가 매일 본다.",
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
      q: "eloan 백테스트와 TradingView 백테스트 차이?",
      a: "eloan 은 한국 KRW 코인 시장에 특화돼 업비트 데이터를 그대로 쓰고, 12종 빌트인 전략을 코드 없이 클릭으로 검증 가능. TradingView 는 글로벌 전 시장(주식·코인·외환) 다루지만 본인 전략은 Pine Script 로 직접 작성해야 함. 간단한 검증·공유는 eloan, 복잡한 본인 전략 개발은 TradingView.",
    },
    {
      q: "백테스트 결과 그대로 실전 적용해도 되나?",
      a: "절대 그대로 적용하면 위험. 백테스트는 슬리피지·체결지연·시장 충격을 완벽히 반영 못 한다. 본 사이트도 백테스트 결과에 10~20% 할인해서 실전 기대치 잡는 게 안전하고, 실전 진입 전엔 소액 모의·실전 비교를 한 달 이상 거치는 게 좋다.",
    },
    {
      q: "온체인 데이터 처음 보는데 어디부터?",
      a: "Glassnode 무료 차트 중 SOPR(Spent Output Profit Ratio)·MVRV(Market Value to Realized Value)·HODL Waves 세 가지부터. BTC 사이클의 거시 위치를 한눈에 파악할 수 있다. 다음 단계로 DefiLlama TVL, Dune 커뮤니티 대시보드로 확장.",
    },
    {
      q: "한경 컨센서스 리포트 믿을 만?",
      a: "리포트는 작성 시점 의견이고 증권사는 종목 거래하는 이해관계자라는 점을 항상 고려. 목표주가보다 실적 추정치·산업 분석·경쟁사 비교 같은 객관 데이터를 보는 게 낫다. 같은 종목 여러 증권사 리포트 교차 비교(컨센서스)가 단일 리포트보다 안전.",
    },
    {
      q: "DART 공시 너무 많은데 우선순위?",
      a: "투자 목적이면 사업보고서(연 1회, 가장 디테일) → 분기보고서(분기별 실적 추세) → 주요사항보고서(유상증자·전환사채·합병 등 가격 변동 이벤트) 셋만 우선. 90% 커버. Open DART API 로 본인 관심 종목 신규 공시 자동 알림도 가능.",
    },
    {
      q: "코인·주식 차트 어디가 가장 정확?",
      a: "거래소 직접 차트가 1차 출처 — 한국 코인은 업비트, 미국 주식은 NYSE·NASDAQ, 한국 주식은 KRX. 종합 플랫폼은 TradingView 가 동기화·지연 면에서 가장 정확. 네이버 증권은 지연 5~15분, Yahoo Finance 는 미국 종목 15분 지연이 기본.",
    },
    {
      q: "주식·코인 API 무료로 어디서?",
      a: "한국 코인은 업비트 공개 API(분당 1만회 무료), 글로벌 코인은 CoinGecko 무료(분당 30회), 한국 주식은 한국투자·키움증권 OpenAPI(계좌 있으면 무료), 글로벌 주식은 Yahoo Finance 비공식 라이브러리(yfinance)나 Alpha Vantage 무료 플랜.",
    },
    {
      q: "국내 거래소 + 해외 거래소 둘 다 만드는 게 좋나?",
      a: "추천. 국내(업비트·빗썸)는 KRW 입출금이 편하고 알트도 빠르게 상장, 해외(Binance·Bybit)는 글로벌 알트·선물·스테이킹 종합. 김프 차익을 안 노리더라도 한국 미상장 알트 대응이 빨라진다. 양쪽 KYC 인증해두면 필요할 때 USDT 송금만 하면 됨.",
    },
  ],
};

// ===========================================================================
// 허브 FAQ
// ===========================================================================
export const HUB_FAQ: FaqEntry[] = [
  {
    q: "주소모음 사이트들은 어떤 기준으로 선정?",
    a: "합법·공식 서비스(정부·공공기관·메이저 운영사), 한국에서 바로 쓸 수 있는 곳(한국어 또는 한국 결제수단), 운영자가 직접 사용·검증한 곳, 어필리에이트·광고 추천 없음. 이 네 가지 만족 못 하면 등록 안 함.",
  },
  {
    q: "도박·성인·불법 스트리밍 같은 주소모음 있나?",
    a: "전혀 없음. 합법·공식 큐레이션만 다루며 회색지대 콘텐츠는 어떤 형태로도 등록 안 한다.",
  },
  {
    q: "얼마나 자주 업데이트?",
    a: "각 카테고리 페이지 상단에 마지막 업데이트 일자 표시. 매월 1회 전수 점검으로 사이트 폐쇄·서비스 중단·라이선스 변경 반영. 새로 등록할 만한 서비스 생기면 수시 추가.",
  },
  {
    q: "여기 없는 좋은 사이트 제안 가능?",
    a: "본 사이트는 운영자 1인이 큐레이션하는 구조라 외부 제안은 받지 않음. 합법·공식 서비스이며 한국 사용자 가치 높으면 운영자가 자체 발견 후 점검 거쳐 추가 가능.",
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
