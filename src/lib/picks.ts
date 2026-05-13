// 주소모음 (Curated link directory).
// 각 카테고리 = 한 페이지(/picks/[slug]) 가 되며, 검색 의도가 명확한
// "OO 모음" 키워드를 잡기 위한 콘텐츠 허브.
//
// 등록 원칙:
//  - 합법·공식 서비스만 (도박/성인/불법 스트리밍 X)
//  - 한국 사용자 검색 의도 기준으로 정렬 (한국 서비스 우선)
//  - 외부 링크는 noopener noreferrer 로 처리 (페이지 컴포넌트에서)

export type PickCategorySlug = "ai" | "money" | "free" | "coin";

export type PickItem = {
  name: string;
  url: string;
  blurb: string; // 한 줄 요약 (검색결과 노출용)
  tip?: string; // 사용 팁 1줄 (체류시간 ↑)
  free?: boolean; // 완전 무료 여부
  korean?: boolean; // 한국어 지원/한국 서비스
};

export type PickGroup = {
  title: string;
  items: PickItem[];
};

export type PickCategory = {
  slug: PickCategorySlug;
  title: string; // h1
  shortTitle: string; // nav, breadcrumb
  emoji: string;
  oneLiner: string;
  description: string; // SEO 메타
  intro: string; // 페이지 상단 도입부 (2~3 문장)
  groups: PickGroup[];
  updatedAt: string; // YYYY-MM-DD
};

const TODAY = "2026-05-12";

// ---------------------------------------------------------------------------
// 1. AI 도구 모음
// ---------------------------------------------------------------------------
const AI: PickCategory = {
  slug: "ai",
  title: "AI 도구 모음 — 글쓰기·이미지·영상·코딩 (2026 최신)",
  shortTitle: "AI 도구",
  emoji: "🤖",
  oneLiner: "한국에서 바로 쓸 수 있는 AI 도구를 용도별로 정리했습니다.",
  description:
    "ChatGPT·Claude·Gemini·Midjourney·Suno 등 글쓰기·이미지·영상·음성·코딩 AI 도구를 용도별로 모았습니다. 무료/유료 여부와 한국어 지원 여부를 함께 표시합니다.",
  intro:
    "2026년 현재 실제 업무·창작에 쓰이는 대표 AI 도구만 추렸습니다. 새로 등장하는 서비스가 매주 늘어나기 때문에, 검증된 메이저만 우선 등록하고 매월 1회 점검합니다.",
  updatedAt: TODAY,
  groups: [
    {
      title: "💬 대화형 / 글쓰기",
      items: [
        {
          name: "ChatGPT",
          url: "https://chat.openai.com",
          blurb: "OpenAI 의 대표 챗봇. GPT-5 기반, 무료 플랜에서도 다수 모델 사용 가능.",
          tip: "무료 플랜은 일일 사용량 한도가 있으니 긴 글은 한 번에 끝내자.",
          korean: true,
        },
        {
          name: "Claude",
          url: "https://claude.ai",
          blurb: "Anthropic 의 챗봇. 긴 문서 요약·코드 리뷰·정확한 한국어가 강점.",
          tip: "프로젝트 기능에 자료를 미리 넣어두면 같은 맥락에서 계속 대화 가능.",
          korean: true,
        },
        {
          name: "Gemini",
          url: "https://gemini.google.com",
          blurb: "Google 의 멀티모달 AI. Gmail·문서·검색과 통합.",
          korean: true,
        },
        {
          name: "Perplexity",
          url: "https://www.perplexity.ai",
          blurb: "출처 표기까지 해주는 검색형 AI. 리서치·자료조사에 최적.",
          tip: "한국어로 물어도 영문 출처를 자동 번역해 보여준다.",
          korean: true,
        },
        {
          name: "뤼튼 (Wrtn)",
          url: "https://wrtn.ai",
          blurb: "한국 토종 AI 플랫폼. 다양한 LLM 을 한 화면에서 무료로 사용.",
          free: true,
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
        },
        {
          name: "ChatGPT 이미지 (DALL·E 3)",
          url: "https://chat.openai.com",
          blurb: "ChatGPT 안에서 바로 그림 생성. 한국어 프롬프트 가장 잘 이해.",
          korean: true,
        },
        {
          name: "Leonardo AI",
          url: "https://leonardo.ai",
          blurb: "Stable Diffusion 기반, 무료 크레딧으로 매일 이미지 생성 가능.",
          free: true,
        },
        {
          name: "Krea AI",
          url: "https://www.krea.ai",
          blurb: "실시간 캔버스 + 업스케일·리얼타임 변환에 강함.",
        },
      ],
    },
    {
      title: "🎬 영상 / 음악 / 음성",
      items: [
        {
          name: "Runway",
          url: "https://runwayml.com",
          blurb: "텍스트→영상, 이미지→영상 대표 도구. Gen-3.",
        },
        {
          name: "Suno",
          url: "https://suno.com",
          blurb: "가사+장르 입력 → 완성된 노래. 한국어 보컬 가능.",
          korean: true,
        },
        {
          name: "ElevenLabs",
          url: "https://elevenlabs.io",
          blurb: "초고품질 음성 합성·복제. 다국어, 한국어 지원.",
          korean: true,
        },
        {
          name: "Clovanote (네이버)",
          url: "https://clovanote.naver.com",
          blurb: "한국어 회의록·받아쓰기 1위. 무료.",
          free: true,
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
        },
        {
          name: "GitHub Copilot",
          url: "https://github.com/features/copilot",
          blurb: "에디터 안에서 자동완성·채팅. 학생·OSS 메인테이너 무료.",
        },
        {
          name: "v0 by Vercel",
          url: "https://v0.dev",
          blurb: "프롬프트로 React/Tailwind UI 즉시 생성.",
        },
        {
          name: "Claude Code",
          url: "https://www.claude.com/product/claude-code",
          blurb: "터미널·IDE 기반 AI 페어 프로그래머. 멀티파일 리팩터링 강력.",
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
          free: true,
          korean: true,
        },
        {
          name: "Notion AI",
          url: "https://www.notion.so/product/ai",
          blurb: "노션 안에서 요약·작성·번역. 워크스페이스 통합.",
          korean: true,
        },
        {
          name: "Grammarly",
          url: "https://www.grammarly.com",
          blurb: "영문 문법·톤 교정. 영어 글쓰기 필수.",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. 정부지원금 / 환급금 모음
// ---------------------------------------------------------------------------
const MONEY: PickCategory = {
  slug: "money",
  title: "정부지원금·환급금 받는 사이트 모음 (숨은돈 찾기)",
  shortTitle: "정부지원금",
  emoji: "💰",
  oneLiner: "안 받으면 손해. 신청만 하면 받는 돈을 한 번에 정리.",
  description:
    "숨은보험금, 휴면예금, 카드포인트, 환급세액, 청년지원금까지 — 신청만 하면 받을 수 있는 정부·금융 서비스 공식 사이트만 모았습니다.",
  intro:
    "모두 정부·공공기관·금융결제원 등 공식 사이트입니다. 사이트 접속 시 도메인이 .go.kr / .or.kr 로 끝나는지 반드시 확인하세요. 보이스피싱·사칭 사이트가 매우 많은 영역입니다.",
  updatedAt: TODAY,
  groups: [
    {
      title: "🏛️ 정부 통합 포털",
      items: [
        {
          name: "정부24",
          url: "https://www.gov.kr",
          blurb: "정부 민원·증명서·지원금 통합 포털. 보조금24 기능 내장.",
          tip: "로그인 → '나의 혜택' 에서 받을 수 있는 지원금 자동 조회.",
          free: true,
          korean: true,
        },
        {
          name: "보조금24",
          url: "https://www.gov.kr/portal/subsidy24/cmm/main",
          blurb: "내가 받을 수 있는 정부보조금을 한 번에 확인.",
          free: true,
          korean: true,
        },
        {
          name: "복지로",
          url: "https://www.bokjiro.go.kr",
          blurb: "복지급여·바우처·일자리·돌봄 — 복지 통합 포털.",
          free: true,
          korean: true,
        },
        {
          name: "온통청년",
          url: "https://www.youthcenter.go.kr",
          blurb: "청년 정책 통합 사이트. 주거·취업·금융 지원 검색.",
          free: true,
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
          blurb: "본인 명의 모든 보험계약·숨은보험금 일괄 조회.",
          free: true,
          korean: true,
        },
        {
          name: "휴면예금·보험금 찾아줌",
          url: "https://www.sleepmoney.or.kr",
          blurb: "10년 이상 거래 없는 예금·보험금 통합 조회.",
          free: true,
          korean: true,
        },
        {
          name: "파인 (금융감독원)",
          url: "https://fine.fss.or.kr",
          blurb: "전 금융권 계좌·대출·연금·신용정보 통합 조회.",
          free: true,
          korean: true,
        },
        {
          name: "카드포인트 통합조회",
          url: "https://www.cardpoint.or.kr",
          blurb: "전 카드사 포인트 한 번에 조회 + 계좌로 현금 출금.",
          free: true,
          korean: true,
        },
        {
          name: "내 계좌 한눈에 (어카운트인포)",
          url: "https://www.payinfo.or.kr",
          blurb: "전 은행 계좌·잔액 일괄 조회 + 소액·비활동 계좌 정리.",
          free: true,
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
          tip: "5월 종합소득세 기간엔 '환급금 조회' 메뉴부터 확인.",
          free: true,
          korean: true,
        },
        {
          name: "위택스",
          url: "https://www.wetax.go.kr",
          blurb: "지방세(주민세·자동차세·재산세) 납부·환급.",
          free: true,
          korean: true,
        },
        {
          name: "근로장려금 안내 (국세청)",
          url: "https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2308&cntntsId=7741",
          blurb: "근로·자녀장려금 자격·신청 안내. 5월 정기신청.",
          free: true,
          korean: true,
        },
      ],
    },
    {
      title: "👷 고용·실업 지원",
      items: [
        {
          name: "워크넷 / 고용24",
          url: "https://www.work24.go.kr",
          blurb: "구직·실업급여·국민내일배움카드 통합.",
          free: true,
          korean: true,
        },
        {
          name: "4대보험 정보연계센터",
          url: "https://www.4insure.or.kr",
          blurb: "국민연금·건강·고용·산재 가입이력 통합 조회.",
          free: true,
          korean: true,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. 무료 리소스 모음 (폰트·이미지·PPT)
// ---------------------------------------------------------------------------
const FREE: PickCategory = {
  slug: "free",
  title: "상업용 무료 폰트·이미지·PPT 템플릿 사이트 모음",
  shortTitle: "무료 리소스",
  emoji: "🎁",
  oneLiner: "디자인·블로그·발표자료 만들 때 쓰는 무료 리소스 모음.",
  description:
    "상업적 이용까지 허용되는 한글 폰트, 이미지, 일러스트, PPT 템플릿, 효과음 사이트를 모았습니다. 모두 라이선스 확인 후 등록.",
  intro:
    "모든 항목이 '상업용 무료' 라이선스를 제공하지만, 다운로드 시 각 사이트의 라이선스 페이지를 한 번 더 확인하세요. 일부 항목은 '저작자 표시(CC-BY)' 또는 '재배포 금지' 같은 조건이 붙습니다.",
  updatedAt: TODAY,
  groups: [
    {
      title: "🔤 한글·영문 폰트",
      items: [
        {
          name: "눈누",
          url: "https://noonnu.cc",
          blurb: "한글 상업용 무료 폰트 종합. 라이선스 표시가 가장 명확.",
          tip: "검색 시 '본문용' 필터를 켜면 가독성 좋은 폰트만 골라낸다.",
          free: true,
          korean: true,
        },
        {
          name: "Google Fonts",
          url: "https://fonts.google.com",
          blurb: "전 세계 1,500+ 무료 폰트. 한글 노토 산스 KR 등 포함.",
          free: true,
        },
        {
          name: "공유마당 폰트",
          url: "https://gongu.copyright.or.kr/gongu/wrt/wrtCl/listWrtFont.do",
          blurb: "한국저작권위원회 공식. 만료저작물 기반 안심 폰트.",
          free: true,
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
          blurb: "고화질 사진 무료. 상업적 이용 OK, 저작자 표시 불필요.",
          free: true,
        },
        {
          name: "Pexels",
          url: "https://www.pexels.com",
          blurb: "사진 + 영상 둘 다. 한국어 검색 가능.",
          free: true,
          korean: true,
        },
        {
          name: "Pixabay",
          url: "https://pixabay.com",
          blurb: "사진·일러스트·벡터·영상·음악 종합 무료.",
          free: true,
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
          blurb: "아이콘 1,400만+. 무료 (저작자 표시 필요) / 유료 (표시 불필요).",
          free: true,
        },
        {
          name: "Lucide",
          url: "https://lucide.dev",
          blurb: "오픈소스 SVG 아이콘 1,400+. 라이선스 100% 자유.",
          free: true,
        },
        {
          name: "unDraw",
          url: "https://undraw.co",
          blurb: "테마 색상 변경 가능한 SVG 일러스트. 출처 표기조차 불필요.",
          free: true,
        },
        {
          name: "IRA Design",
          url: "https://iradesign.io",
          blurb: "조립식 일러스트 — 부분 부분 갈아끼우기 가능.",
          free: true,
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
          free: true,
          korean: true,
        },
        {
          name: "망고보드",
          url: "https://www.mangoboard.net",
          blurb: "한국형 디자인 플랫폼. 카드뉴스·인포그래픽 강점.",
          korean: true,
        },
        {
          name: "Canva",
          url: "https://www.canva.com",
          blurb: "글로벌 1위. 무료로도 충분, 한국어 폰트·템플릿 다수.",
          free: true,
          korean: true,
        },
        {
          name: "Slidesgo",
          url: "https://slidesgo.com",
          blurb: "Google Slides·PowerPoint 무료 템플릿.",
          free: true,
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
          free: true,
        },
        {
          name: "YouTube 오디오 보관함",
          url: "https://studio.youtube.com",
          blurb: "유튜브 스튜디오 안. 저작권 안전 BGM·효과음 무료.",
          free: true,
          korean: true,
        },
        {
          name: "Coverr",
          url: "https://coverr.co",
          blurb: "웹사이트 배경에 쓰기 좋은 무료 짧은 영상.",
          free: true,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 4. 코인 / 주식 무료 도구 (eloan 시너지)
// ---------------------------------------------------------------------------
const COIN: PickCategory = {
  slug: "coin",
  title: "코인·주식 무료 도구 모음 — 백테스트·차트·온체인",
  shortTitle: "코인·주식 도구",
  emoji: "📈",
  oneLiner: "트레이더가 실제로 매일 쓰는 무료 도구만 모았습니다.",
  description:
    "코인·주식 차트, 백테스트, 온체인 분석, 김치프리미엄, 포트폴리오 관리까지 — 회원가입 없이 또는 무료로 쓸 수 있는 검증된 도구만 정리했습니다.",
  intro:
    "본 사이트(eloan)에서 백테스트한 전략을 실전에 적용하려면 함께 보면 좋은 도구들입니다. 모두 1차 출처(거래소·공공기관·메이저 리서치)이며, 광고성·사칭 도구는 배제했습니다.",
  updatedAt: TODAY,
  groups: [
    {
      title: "🧪 백테스트 / 전략 검증",
      items: [
        {
          name: "eloan 백테스트",
          url: "/backtest",
          blurb: "본 사이트. 업비트 KRW 마켓 + 12종 전략 무료 백테스트.",
          tip: "결과는 슬러그 URL 로 공유 가능. 커뮤니티에서 다른 사람 결과도 볼 수 있음.",
          free: true,
          korean: true,
        },
        {
          name: "TradingView",
          url: "https://www.tradingview.com",
          blurb: "글로벌 표준 차트. Pine Script 로 자체 전략 백테스트.",
          tip: "무료 플랜은 인디케이터 동시 사용 2개 제한. 핵심 지표만 골라 쓰자.",
          free: true,
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
          blurb: "글로벌 시총·거래량·DEX·도미넌스 표준.",
          korean: true,
        },
        {
          name: "CoinGecko",
          url: "https://www.coingecko.com",
          blurb: "CMC 대안. 알트·DeFi·NFT 데이터 풍부.",
          korean: true,
        },
        {
          name: "네이버 증권",
          url: "https://finance.naver.com",
          blurb: "한국 주식·환율·세계지수 무료 통합. 가장 빠른 시세.",
          free: true,
          korean: true,
        },
        {
          name: "Yahoo Finance",
          url: "https://finance.yahoo.com",
          blurb: "글로벌 주식·ETF·실적·뉴스. 과거 데이터 CSV 다운로드.",
          free: true,
        },
      ],
    },
    {
      title: "🔬 온체인 / 데이터 분석",
      items: [
        {
          name: "Glassnode",
          url: "https://glassnode.com",
          blurb: "BTC·ETH 온체인 표준. 무료 메트릭만으로도 충분히 유용.",
          free: true,
        },
        {
          name: "DefiLlama",
          url: "https://defillama.com",
          blurb: "DeFi TVL · 체인별 자금흐름. 광고 없이 100% 무료.",
          free: true,
        },
        {
          name: "Dune",
          url: "https://dune.com",
          blurb: "온체인 데이터 SQL 대시보드. 다른 사람 대시보드 무료 열람.",
          free: true,
        },
        {
          name: "CryptoQuant",
          url: "https://cryptoquant.com",
          blurb: "거래소 입출금 흐름 등 한국발 온체인 데이터.",
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
          blurb: "한국 1위 코인 거래소. 공개 API 무제한 · 본 사이트 백테스트 데이터 출처.",
          free: true,
          korean: true,
        },
        {
          name: "한경 컨센서스",
          url: "https://consensus.hankyung.com",
          blurb: "증권사 애널리스트 리포트 무료 통합. 가입 없이 다운로드.",
          free: true,
          korean: true,
        },
        {
          name: "전자공시 DART",
          url: "https://dart.fss.or.kr",
          blurb: "금융감독원 전자공시. 사업·반기·분기보고서 1차 출처.",
          free: true,
          korean: true,
        },
        {
          name: "KRX 정보데이터시스템",
          url: "https://data.krx.co.kr",
          blurb: "한국거래소 공식 데이터. 종목·지수 과거 데이터 CSV.",
          free: true,
          korean: true,
        },
      ],
    },
  ],
};

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
