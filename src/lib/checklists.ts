// 체크리스트 시리즈 데이터.
// 톤: 표준 존댓말, 사실·금액·기한 중심. 권유·자기 PR 최소화.
// 사용자가 본인 상황에 따라 분기 토글로 필터링한 뒤 체크 가능.
// localStorage 로 진행률 보관.

export type ChecklistBranch = {
  id: string;
  label: string;
  description?: string;
};

export type ChecklistItem = {
  id: string;
  title: string;
  description?: string;
  important?: boolean;
  estimatedImpact?: string;
  branches?: string[];
  relatedPick?: { category: string; hub: string; label: string };
  externalLink?: { label: string; url: string };
};

export type ChecklistSection = {
  id: string;
  title: string;
  description?: string;
  items: ChecklistItem[];
};

export type ChecklistFaq = { q: string; a: string };

export type Checklist = {
  slug: string;
  title: string;
  metaTitle: string;
  shortTitle: string;
  emoji: string;
  oneLiner: string;
  headline: string;
  description: string;
  longIntro: string[];
  deadline?: string;
  season?: string;
  totalImpact?: string;
  branches?: ChecklistBranch[];
  sections: ChecklistSection[];
  faq: ChecklistFaq[];
  relatedKeywords: string[];
  publishedAt: string;
  updatedAt: string;
};

const TODAY = "2026-05-14";

// ===========================================================================
// 1. 유튜버·블로거·인플루언서 5월 종합소득세 신고 체크리스트
// ===========================================================================
const YOUTUBER_TAX_2026: Checklist = {
  slug: "youtuber-tax-2026",
  title: "2026 유튜버·블로거 5월 종합소득세 신고 체크리스트 — 안 챙기면 평균 50만원 손해",
  metaTitle: "2026 유튜버·블로거 5월 종합소득세 신고 체크리스트",
  shortTitle: "유튜버·블로거 종소세",
  emoji: "📹",
  oneLiner: "구글 애드센스·애드포스트·쿠팡파트너스 수익이 있다면 5월 31일까지 신고해야 합니다.",
  headline: "이 체크리스트를 안 챙기면 평균 30~50만원 손해 + 가산세",
  description:
    "유튜브 애드센스·네이버 애드포스트·쿠팡파트너스·티스토리 애드센스 수익이 있는 크리에이터를 위한 2026년 5월 종합소득세 신고 통합 체크리스트. 소득 분류·사업자등록 시점·경비 처리·신고 절차까지 22개 항목.",
  longIntro: [
    "구글 애드센스·네이버 애드포스트·쿠팡파트너스 같은 부수입은 *사업소득* 또는 *기타소득* 으로 분류되어 매년 5월 종합소득세 신고 의무가 있습니다. 신고를 누락하면 무신고 가산세(20%) + 납부지연 가산세(연 8.03%) 가 부과됩니다.",
    "10명 중 8명의 크리에이터가 본인이 처리할 수 있는 경비를 모르고 누락한다는 통계가 있습니다. 카메라·노트북·소프트웨어·자료비·통신비·홈오피스 일부는 모두 경비로 인정받을 수 있으며 평균 30~50만원의 환급 차이를 만듭니다.",
    "이 체크리스트는 본인 수익 구조(유튜브만 / 블로그만 / 둘 다) 에 따라 항목을 자동 필터링합니다. 항목별 진행률은 본인 브라우저에 저장되어 다음 방문에도 유지됩니다.",
  ],
  deadline: "2026-05-31",
  season: "5월 정기",
  totalImpact: "평균 30~50만원 환급 차이 + 가산세 회피",
  branches: [
    {
      id: "youtube",
      label: "유튜브 애드센스만",
      description: "유튜브 광고 수익만 있고 블로그·제휴 수익은 없음",
    },
    {
      id: "blog",
      label: "블로그·제휴만",
      description: "네이버 애드포스트·쿠팡파트너스·티스토리 애드센스 등",
    },
    {
      id: "both",
      label: "유튜브 + 블로그·제휴",
      description: "두 가지 이상의 콘텐츠 수익",
    },
  ],
  sections: [
    {
      id: "income-classification",
      title: "1. 소득 분류 확인",
      description: "사업소득과 기타소득의 차이를 먼저 정리합니다. 신고 방식과 세율이 달라집니다.",
      items: [
        {
          id: "check-recurring",
          title: "작년 수익이 반복적으로 발생했는지 확인",
          description:
            "월 1회 이상 정기적으로 입금되었다면 *사업소득*. 1~2회 단발성이면 *기타소득* 으로 분류 가능. 대부분의 크리에이터는 사업소득.",
          important: true,
        },
        {
          id: "check-threshold",
          title: "기타소득 분리과세 가능 금액(연 300만원) 이하인지 확인",
          description:
            "연 300만원 이하 기타소득은 분리과세(22%) 선택 가능. 다만 다른 소득이 적다면 종합과세가 더 유리할 수 있으니 두 가지 모두 계산 후 선택.",
        },
        {
          id: "check-other-income",
          title: "본업(근로소득) 외 다른 소득 합산 여부 확인",
          description:
            "직장인이라면 회사 근로소득 + 부수입을 합산해 누진세율 적용. 회사에 부수입이 알려지는 것은 *없음* (5월 본인이 직접 신고하므로).",
        },
      ],
    },
    {
      id: "business-registration",
      title: "2. 사업자등록 필요 여부",
      description: "사업자등록을 하면 경비 처리 폭이 넓어지지만, 매출 규모에 따라 다릅니다.",
      items: [
        {
          id: "biz-code",
          title: "1인 미디어 콘텐츠 창작자 업종코드(940306) 확인",
          description:
            "유튜버·블로거의 공식 업종코드. 사업자등록 시 이 코드로 신청. 부가가치세 면세 사업자로 분류됩니다.",
          branches: ["youtube", "blog", "both"],
        },
        {
          id: "biz-when",
          title: "연 수익 추정해 사업자등록 시점 판단",
          description:
            "월 100만원(연 1,200만원) 이상 안정적으로 발생하면 사업자등록이 유리. 그 이하라도 경비가 많다면 등록 고려.",
          important: true,
        },
        {
          id: "biz-simple-vs-general",
          title: "간이과세자(연매출 1억400만원 미만) vs 일반과세자 선택",
          description:
            "1인 미디어는 부가세 면세이므로 간이/일반 구분이 큰 의미는 없으나, 다른 매출(강의·외주) 이 섞이면 간이가 유리할 수 있음.",
        },
        {
          id: "biz-overseas-income",
          title: "구글 애드센스 외화 수령 신고",
          description:
            "연 1만 달러 이상 외화 수령 시 한국은행에 자동 신고됨. 신고 누락 페널티는 없으나 종소세 신고 시 외화→원화 환산액으로 신고.",
          branches: ["youtube", "both"],
        },
      ],
    },
    {
      id: "filing",
      title: "3. 5월 종소세 신고 절차",
      description: "신고 기한은 2026년 5월 31일 23시 59분까지. 이후 신고 시 가산세 부과.",
      items: [
        {
          id: "filing-hometax",
          title: "홈택스 가입 + 공동인증서/간편인증 준비",
          description:
            "신고는 전적으로 홈택스에서 처리. 카카오·통신사·금융인증서 모두 가능. 모바일 손택스 앱도 가능.",
          important: true,
          relatedPick: { category: "money", hub: "hometax", label: "홈택스 가이드" },
        },
        {
          id: "filing-adsense-statement",
          title: "구글 애드센스 연간 수입 명세서 다운로드",
          description:
            "Google AdSense → 결제 → 거래 → 연간 보고서 다운로드. 월별 원화 환산액(지급일 기준 환율) 정리.",
          branches: ["youtube", "both"],
        },
        {
          id: "filing-blog-statement",
          title: "애드포스트·쿠팡파트너스·티스토리 연간 수익 내역 다운로드",
          description:
            "각 플랫폼 마이페이지 → 수익 내역 → 2025년 1~12월 전체 다운로드. 원천징수 3.3% 차감된 금액 vs 총 지급액 구분 확인.",
          branches: ["blog", "both"],
        },
        {
          id: "filing-3o3",
          title: "삼쩜삼 등 자동 신고 도구로 미환급세금 조회",
          description:
            "삼쩜삼은 작년 원천징수된 3.3% 중 환급 가능 금액을 자동 계산. 단순 환급은 5,000~20,000원 수수료로 위임 가능. 단 사업소득 신고는 본인 진행 또는 세무사 위임.",
          relatedPick: { category: "money", hub: "3o3", label: "삼쩜삼" },
        },
        {
          id: "filing-submit",
          title: "종합소득세 신고서 제출 (5월 31일까지)",
          description:
            "홈택스 → 신고/납부 → 종합소득세 → 일반신고 → 사업소득 또는 기타소득 입력. 신고 후 납부서 발급 → 6월 30일까지 납부.",
          important: true,
        },
        {
          id: "filing-compare",
          title: "분리과세 vs 종합과세 시뮬레이션 후 유리한 쪽 선택",
          description:
            "기타소득 분리과세 가능 금액이라면 양쪽 모두 계산 후 환급액·납부액 비교. 홈택스 모의계산 기능 사용 또는 세무사 상담.",
        },
      ],
    },
    {
      id: "expenses",
      title: "4. 경비 처리 — 빠뜨리지 말 것",
      description: "10명 중 8명이 누락하는 경비 항목. 평균 30~50만원 환급 차이.",
      items: [
        {
          id: "exp-equipment",
          title: "카메라·렌즈·삼각대·마이크 등 촬영 장비",
          description:
            "100% 콘텐츠 제작 용도면 전액 경비 처리. 일부 사적 사용 시 안분 비율(예: 70%) 적용. 영수증·카드 명세서 보관.",
          estimatedImpact: "10~50만원",
          branches: ["youtube", "both"],
        },
        {
          id: "exp-computer",
          title: "노트북·모니터·외장 SSD·편집 소프트웨어",
          description:
            "콘텐츠 제작에 사용한 컴퓨터·주변기기. Adobe Premiere·Final Cut·Photoshop 등 소프트웨어 구독료 전액 경비.",
          estimatedImpact: "5~30만원",
        },
        {
          id: "exp-research",
          title: "자료 수집비 — 책·강의·구독료",
          description:
            "콘텐츠 주제 관련 도서·전자책·온라인 강의(인프런·클래스101)·뉴스 구독료(매일경제·한경)·OTT 일부.",
          estimatedImpact: "3~15만원",
          relatedPick: { category: "study", hub: "inflearn", label: "인프런" },
        },
        {
          id: "exp-internet",
          title: "인터넷·통신요금 일부 (안분)",
          description:
            "콘텐츠 제작 용도 비율만큼 경비 처리(보통 30~50%). 휴대폰 요금도 동일하게 적용 가능.",
          estimatedImpact: "5~15만원",
        },
        {
          id: "exp-homeoffice",
          title: "홈오피스 — 전기·임차료·관리비 일부",
          description:
            "자가는 전기·관리비 일부, 전세·월세는 임차료까지 안분 가능(작업 공간 면적 비율). 사업자등록자만 적극 활용 권장.",
          estimatedImpact: "10~30만원",
          important: true,
        },
        {
          id: "exp-ads",
          title: "광고비 — 채널 홍보 SNS 광고·검색 광고",
          description:
            "유튜브·인스타그램·페이스북 광고비, 네이버·구글 검색 광고비 전액 경비 처리.",
          estimatedImpact: "5~50만원",
          branches: ["youtube", "blog", "both"],
        },
      ],
    },
    {
      id: "next-year",
      title: "5. 다음해 절세 준비",
      description: "올해 신고가 끝났다면 내년을 위한 준비. 평소 관리가 5월 환급액을 좌우합니다.",
      items: [
        {
          id: "next-card",
          title: "사업용 신용카드·계좌 분리",
          description:
            "콘텐츠 제작 비용만 결제하는 카드·계좌 분리. 홈택스에 등록하면 자동으로 경비 집계됨. 영수증 보관 부담 감소.",
          important: true,
        },
        {
          id: "next-receipts",
          title: "영수증·세금계산서 자동 보관 시스템",
          description:
            "현금영수증은 사업자번호로 발급. 모든 카드 사용은 자동 집계. 직접 영수증 모으는 시대 끝.",
        },
        {
          id: "next-irp",
          title: "노란우산공제·IRP 가입으로 추가 세액공제",
          description:
            "노란우산공제는 소상공인 전용 연 500만원 한도 세액공제. IRP는 연 700만원 한도. 1인 사업자 절세 양대 도구.",
          relatedPick: { category: "money", hub: "noranumbrella", label: "노란우산공제" },
        },
      ],
    },
  ],
  faq: [
    {
      q: "사업자등록을 안 하면 신고를 안 해도 되나요?",
      a: "아닙니다. 사업자등록 여부와 무관하게 발생한 소득은 모두 신고 의무가 있습니다. 사업자등록은 *경비 처리 범위가 넓어지는* 효과일 뿐 신고 의무 자체를 바꾸지 않습니다.",
    },
    {
      q: "직장에 다니면서 부수입을 신고하면 회사에 알려지나요?",
      a: "아닙니다. 종합소득세 신고는 본인이 5월에 직접 진행하며, 회사는 본인 *근로소득 원천징수* 만 처리합니다. 부수입은 회사 인사·총무팀이 알 수 없습니다. 단, 건강보험료가 부수입 기준으로 인상되어 통보될 수는 있습니다(별도 절차).",
    },
    {
      q: "작년 수익이 100만원 미만이어도 신고해야 하나요?",
      a: "기타소득이라면 연 300만원 이하 분리과세 선택 가능(별도 신고 면제 효과). 사업소득이라면 *금액과 무관하게* 신고 의무가 있습니다. 다만 결손(수익 < 경비) 신고를 해두면 다음해 손실 이월 가능.",
    },
    {
      q: "구글 애드센스 외화 수령 시 환차익도 신고해야 하나요?",
      a: "환차익(달러 → 원화 환산 시 환율 차이로 발생한 이익)은 별도 신고하지 않습니다. 매월 *지급일 기준 환율* 로 원화 환산해 합산한 금액을 사업소득으로 신고합니다.",
    },
    {
      q: "신고를 누락했는데 어떻게 해야 하나요?",
      a: "발견 즉시 *기한 후 신고* 가능. 무신고 가산세 20% + 납부지연 가산세(연 8.03%) 부과되지만 자진 신고 시 가산세 50% 감면. 더 늦을수록 페널티 커지므로 즉시 신고.",
    },
    {
      q: "5월 31일이 토·일이면 마감이 연장되나요?",
      a: "예. 5월 31일이 토·일·공휴일이면 다음 평일까지 자동 연장. 2026년 5월 31일은 일요일이므로 *6월 1일(월)* 까지 신고·납부 가능.",
    },
    {
      q: "세무사 위임 vs 본인 신고 — 어떤 게 유리한가요?",
      a: "연 수익 3,000만원 이하 단순 구조면 본인 신고로 충분(홈택스 자동 계산 기능 활용). 그 이상이거나 경비 항목이 복잡하면 세무사 위임이 절세 효과 큼(수수료 15~50만원이지만 환급액으로 충분히 회수).",
    },
    {
      q: "사업용 카드를 따로 만들지 않아도 경비 처리 되나요?",
      a: "됩니다. 사용 내역을 본인이 입증할 수 있다면 어느 카드로 결제했는지는 무관. 다만 사적 사용과 섞이면 안분 계산이 복잡해지므로 *사업용 분리* 권장.",
    },
  ],
  relatedKeywords: [
    "유튜버 종합소득세 신고",
    "블로거 종합소득세",
    "애드센스 세금",
    "쿠팡파트너스 세금",
    "1인 미디어 세금",
    "크리에이터 세금",
    "유튜브 사업자등록",
    "애드포스트 신고",
    "유튜브 경비 처리",
    "유튜버 종소세",
  ],
  publishedAt: TODAY,
  updatedAt: TODAY,
};

// ===========================================================================
// 전체 export
// ===========================================================================
export const CHECKLISTS: Checklist[] = [YOUTUBER_TAX_2026];

export function getChecklist(slug: string): Checklist | undefined {
  return CHECKLISTS.find((c) => c.slug === slug);
}

export function totalChecklistCount(): number {
  return CHECKLISTS.length;
}

export function checklistItemCount(checklist: Checklist): number {
  return checklist.sections.reduce((sum, s) => sum + s.items.length, 0);
}
