// 2단계: 상품별 분석(digest)과 원자료 일부를 근거로 Gemini 가 글을 JSON 구조로 작성.
// 상품 1개 = 단일 상품 후기 분석, 2개 이상 = 비교글 (구조는 같고 작성 규칙만 다름)
// 링크는 AI 에게 맡기지 않고 관리자 입력값을 그대로 붙인다.

import { SOURCE_LABEL, type ShopPostContent } from "@/lib/shop-post-types";
import { digestBlock, type ProductDigest } from "./digest";
import { fixHanja } from "./hanja";
import { generate } from "./providers/llm";
import type { Secrets } from "./providers/types";
import type { ProductResearch } from "./research";

export type WriterOptions = {
  titleStyle: string;
  titleKeyword?: string; // 제목 맨 앞에 그대로 쓸 검색 키워드
  extraPrompt: string;
};

export type WrittenPost = { title: string; description: string; content: ShopPostContent };

// 섹션별 작성 목표 — 작성 규칙·SCHEMA 와 검수 지적 문구(qa.ts lintPost)가 같은 값을 쓰도록 한 곳에 둔다.
// 2026-11-13 운영자 검토(점검 실행 33~35): 구매 전 확인·추천 이유·FAQ·후기 문단이 얇아 "대충 쓴 글"로 보임 → 목표를 올림.
// 검수의 최소 개수(구성 부족 판정)는 목표와 따로 낮게 둔다 — 이유는 qa.ts lintPost 주석.
export const SECTION_GOALS = {
  review: "5~7문장",
  // 휴대폰에서 5~7문장이 한 덩어리면 벽글로 보임 (2026-11-13 운영자 지적) → 빈 줄로 나눈 짧은 문단으로
  reviewParagraphs: "2~3개",
  faq: "6개",
  faqAnswer: "2~3문장",
  commonComplaints: "4~5개",
  recommendationReason: "2~3문장",
  buyingGuide: "3~5개",
  buyingGuideDetail: "3문장",
} as const;
const G = SECTION_GOALS;
// "확인하세요" 꼴 안내의 글 전체 상한 (qa.ts 가 같은 값으로 검사). 확인 팁을 늘리면서 이 말만 되풀이하지 않도록 작성 규칙에도 적는다
export const MAX_CHECK_PHRASES = 5;
// 읽기 쉬운 글 기준 (qa.ts 가 같은 값으로 검사 — 기준값의 근거는 qa.ts 의 각 검사 주석)
export const READABILITY = {
  paragraphSentences: 4, // 빈 줄로 나눈 한 문단의 최대 문장 수 (목표는 2~3문장)
  paragraphChars: 250, // 한 문단 최대 글자 수 (390px 휴대폰에서 약 12줄)
  sameOpening: 2, // 한 목록에서 같은 시작 구 허용 횟수
  evidenceTails: 2, // 한 구역에서 "~후기가 있어요/평가가 나와요" 꼴 근거 꼬리 허용 횟수
} as const;
const R = READABILITY;

// 공통 규칙 + 글 종류별 규칙. 상품 1개 = 단일 상품 후기 분석, 2개 이상 = 비교글
const COMMON_RULES = `반드시 지킬 규칙:
1. 아래 "근거 자료"에 있는 내용만 쓴다. 근거에 없는 스펙·수치·기능은 절대 지어내지 않는다.
2. 가격은 쓰지 않는다. 가격 안내는 verdict(정리) 끝에 "쿠팡에서 현재 가격을 확인하세요" 한 번만 쓴다.
   품절·재입고·공구(공동구매)·할인·특가·구매 시점 이야기는 어느 섹션에도 쓰지 않는다(구매를 부추기는 판매 문구로 읽혀 신뢰를 깎는다).
3. 직접 써본 것처럼 쓰지 않는다("써보니", "제가 사용해보니" 금지). 여러 후기를 모아 읽고 정리해 주는 에디터 관점으로 쓴다.
   후기 속 1인칭 경험은 "한 달 쓴 사용자는 ~"처럼 3인칭으로 옮긴다.
4. "최저가", "1위", "무조건" 같은 확인되지 않은 과장 표현 금지.
5. 장점과 단점을 균형 있게 쓴다. 단점도 반드시 쓴다.
6. 해요체 존댓말. 짧고 읽기 쉬운 문장.
7. 근거가 부족한 항목은 "후기에서는 확인되지 않아요"처럼 자연스럽게 적는다. 독자에게 "자료"라는 말은 쓰지 않는다("후기에서는", "판매 페이지에서"로).
   후기 의견이 엇갈리면(예: 가볍다 vs 무겁다) 장점·단점에 반대로 나눠 쓰지 말고 한 곳에서 "의견이 엇갈려요"라고 정리한다.
8. 후기·댓글 건수, 언급 횟수, 출처 개수 같은 숫자는 제목·본문 어디에도 쓰지 않는다. "많다", "일부", "자주" 같은 표현만 쓴다.
9. 한글로만 쓴다. 한자·중국어·일본어 문자 금지(예: "内部" 대신 "내부"). 영문은 모델명·단위만.
10. 같은 내용을 여러 섹션에서 반복하지 않는다. 한 가지 사실(특히 단점)은 글 전체에서 최대 3곳까지만:
   pros/cons 에서 자세히 + summary·verdict 중 한 곳에서 짧게 + (필요하면) commonComplaints 의 대처 팁.
   intro·buyingGuide·review·faq 에서 같은 단점을 다시 설명하지 않는다. 섹션마다 역할이 다르다:
   - intro: 이 제품을 고민하는 사람의 구체적 상황 장면 (장단점 나열 금지)
   - buyingGuide: 이 제품군을 고를 때 볼 기준과 이 제품의 위치 (단점 재설명 금지)
   - review: 실사용 장면으로 보여주는, 어떤 사람에게 어떤 경험이 되고 어떤 경우 불만이 생기는지의 맥락
   - verdict: 후기를 모아 본 에디터의 정리 (앞에서 다룬 단점을 다시 풀어 설명하지 않음)
   - pros/cons: 각 항목의 구체적 설명
   - commonComplaints: 단점 반복 금지. "구매 전 확인할 점과 대처 팁"(예: 취침 전 물을 가득 채우면 중간에 멈추지 않아요)
   - faq: 위에서 다루지 않은 궁금증(관리 주기, 설치 공간, 소모품, 다른 사용 환경 등). 단, 근거 자료로 답할 수 있는 질문만.
     답이 "확인되지 않아요"뿐인 질문, 가격·구매처를 묻는 질문은 넣지 않는다.
11. 표(comparison)의 항목·수치는 자료에 그대로 나온 것만, 용어는 정확하게(예: 온수 온도, 소비전력). 확실하지 않은 항목은 빼라.
16. 후기 분석의 "출처마다 엇갈리는 정보"는 한쪽으로 단정하지 않는다. 그 항목은 한 곳(고르는 기준 또는 구매 전 확인)에서만
    어떻게 다른지 구체적으로 설명하고 확인 방법을 알려준다. 한줄평·장점·표에서 한쪽 값으로 쓰지 않는다(표에는 "확인 필요").
    같은 안내 문장을 여러 번 되풀이하지 말고, "엇갈려요"라는 말은 글 전체에서 두 번까지만.
17. "실사용 팁"은 구매 전 확인할 점·FAQ 답에 구체적으로 활용한다 (일반론보다 실제 사용자가 알려준 요령 우선).
18. 비교표(comparison)에 모든 제품이 "확인 안 됨"인 항목은 넣지 않는다. "모델명" 같은 이름 항목도 넣지 않는다.
    비교글의 표는 두 제품 모두 값이 있는 항목 위주로 만든다. 한쪽만 확인된 항목은 2개까지.
19. 수집 경로("웹문서 기재", "검색 결과에서")나 다른 제품의 후기를 글에 쓰지 않는다. 이 글의 상품 정보만 쓴다. 출처 표시가 꼭 필요하면 "판매처 표기 기준"처럼 쓴다.
15. recommendations(잘 맞는 상황)에는 이 제품이 실제로 잘 맞는 상황만 쓴다. "빠른 난방이 최우선이라면 → 이 제품보다 다른 게 낫다"처럼
    맞지 않는 상황은 recommendations 가 아니라 notFor(비추천 대상)에 쓴다.
    상황마다 이유가 서로 달라야 한다. 같은 장점(예: 조용함)을 상황만 바꿔 두 번 쓰지 않는다 ("아이방에서 조용히" + "조용한 취침" 금지).
13. 후기 출처가 광고인지 아닌지에 대한 이야기("광고성 글이 섞여 있어요", "과장된 칭찬은 걸러 보세요")는 쓰지 않는다.
14. 비교글이면 비교 기준(제목·결론)이 표와 맞아야 한다. 예: 한쪽만 "케이블 일체형"이라고 비교하려면 표에서도 그렇게 나와야 한다.
    같은 상품 안에서도 앞뒤가 맞아야 한다(예: "케이블 일체형"이라면서 구성품에 별도 케이블).
12. 단정하지 않는다. "위험이 없어요", "전혀", "완벽", "절대", "100%" 금지. 후기 내용은 후기에서 나온 말임이 드러나게("후기를 보면", "사용자들은"),
    제조사 설명이면 "~라고 소개돼요".
칼럼 규칙 (보고서가 아니라 읽히는 글로 — 단, 위 사실성 규칙이 항상 우선):
20. 근거의 "실제 사용 장면"을 글에 녹인다. intro 는 그 장면에서 가져온 구체적 상황으로 시작하고
    (예: 가습기라면 "아기를 재운 뒤 기계 소리에 다시 깰까 신경 쓰이는 분이라면"), 제품마다 review 에 장면 1~2개를 넣어
    어떤 사람에게 어떤 경험이 되는지 보여준다. 장면은 "~했다는 사용자도 있어요"처럼 후기에서 나온 이야기임이 드러나게 쓴다.
21. 장면·감정 묘사는 근거 자료(실제 사용 장면의 "원문"·원자료 발췌)에 있는 것만 쓴다. 장면을 옮길 때는 "원문"을 기준으로 삼고,
    다듬은 "장면" 문장에 원문보다 더 나간 내용이 있으면 원문을 따른다. 근거에 없는 시간·장소·인물·행동·결과·감정을
    덧붙이거나 지어내지 않는다(근거가 "아기 방에서 약풍으로 틀었다"뿐이면 "새벽 세 시", "아기가 뒤척이다 다시 잠들었다"를 붙이지 않는다).
    독자의 감정을 넘겨짚는 문장("얼마나 답답하셨을까요")도 쓰지 않는다. 쓸 장면이 없으면 지어내지 말고 상황만 짧게 쓴다.
22. 말꼬리를 바꿔 가며 쓴다. "~라는 의견이 많아요", "~다는 평이 많아요", "~다는 후기가 있어요" 같은 같은 꼴은 글 전체에서 합쳐 6번 이내,
    "~다고 해요"도 6번 이내.
    근거 표시는 구역(목록 하나, 또는 문단 하나)의 첫머리에서 한 번만 밝힌다("후기를 모아 보면", "사용자들이 공통으로 꼽는 건").
    "~후기가 있어요", "~평가가 나와요", "~평가도 함께 나와", "후기에서 언급돼요", "~반응도 보여요", "~느낀 사용자가 있어요"처럼
    문장 끝에 출처를 붙이는 근거 꼬리는 한 구역에서 ${R.evidenceTails}번까지. 이어지는 문장은 근거 꼬리 없이 담백하게 서술한다
    (나쁜 예: "기름이 덜 튄다는 후기가 있어요. 겉바속촉이라는 평가도 나와요." → 좋은 예: "후기를 보면 기름이 덜 튀어요. 겉은 바삭하고 속은 촉촉하게 익는 편이에요.").
    장점·단점 칸은 제목이 이미 "좋다는 평"·"아쉽다는 평"이라 항목마다 "~평이 많아요", "~사용자가 있어요"를 붙이지 않는다.
    근거 표시를 줄여도 후기 내용을 확정된 사실처럼 단정하지 않는다(12번).
23. 섹션은 따로 노는 목록이 아니라 한 편의 글이다. intro 에서 꺼낸 고민을 buyingGuide·review 가 이어받고 verdict 가 그 고민에 답한다.
    verdict 는 "후기를 모아 보면 결국 핵심은 ~예요"처럼 에디터가 정리하는 관점으로 쓴다(이 문구를 그대로 베끼지 말고 글에 맞게).
가독성 규칙 (모바일에서 훑어보기 쉽게):
- 표의 label 은 6자 이내 명사(예: 흡입력, 소음, 물걸레), values 는 12자 이내 짧은 값(예: 강함, 보통, 지원, 확인 안 됨). 문장 금지.
- 장점·단점은 제품당 각 3~4개, "핵심어: 한 문장" 형식(예: "흡입력: 카펫 위에서도 힘이 달리지 않는다는 쪽이 대부분이에요",
  "소음: 밤에 약풍으로 두면 거슬리지 않는 수준이라고 해요"). 항목마다 같은 말꼬리를 붙이지 않는다(22번).
- 상황 situation 은 "~라면" 으로 끝나는 짧은 구(예: 반려동물을 키운다면).
- summary 는 2문장 이내. 한 문장은 40자 안팎.
- 문단은 짧게: 한 문단은 2~3문장. ${R.paragraphSentences}문장이나 ${R.paragraphChars}자를 넘는 문단은 쓰지 않는다.
  긴 글(review·verdict·intro)은 문단 사이에 빈 줄("\\n\\n")을 넣어 나눈다. 문장 하나가 너무 길면 둘로 끊는다.
- 목록(recommendations 의 reason, commonComplaints, faq 의 a, buyingGuide 의 detail, pros, cons)은 항목마다 시작을 다르게 쓴다.
  한 목록에서 같은 말로 시작하는 항목은 ${R.sameOpening}개까지(예: 이유마다 "이 상황에서는 ~", 설명마다 "두 제품 모두 ~", 답마다 "후기를 보면 ~"으로 열지 않기).
풍성함 규칙 (얇은 글은 검색엔진이 스팸으로 보고 독자는 대충 쓴 글로 본다 — 근거 자료 안에서 최대한 깊게):
- 제품마다 review 는 ${G.review} 문단: 실사용 장면 1~2개를 녹여 어떤 사람에게 어떤 경험이 되는지,
  어떤 경우 불만이 나오는지, 그래서 어떤 사람에게 맞는지까지 이어서 쓴다(장단점 목록 반복 금지).
  한 덩어리로 쓰지 말고 빈 줄("\\n\\n")로 나눈 짧은 문단 ${G.reviewParagraphs}로 쓴다(문단당 2~3문장).
  예: 첫 문단은 잘 맞는 사람의 경험(장면), 다음 문단은 불만이 나오는 경우, 마지막 문단은 그래서 어떤 사람에게 맞는지.
  근거 표시는 각 문단 첫머리에 한 번만(22번).
- 제품마다 notFor 는 이 제품이 맞지 않는 사람 1~2문장.
- recommendations 의 reason 은 ${G.recommendationReason}. 이 제품의 어떤 점이(후기 근거) 그 상황에 왜 맞는지 담고, 알아 둘 점이 있으면 덧붙인다.
  문장 구조와 순서는 이유마다 자유롭게 바꾼다. 이유들을 같은 말로 시작하지 않는다("이 상황에서는 ~가 중요해요"처럼 매번 같은 틀로 열지 않기).
  첫 문장부터 그 상황에 맞는 구체적인 내용으로 쓴다. "조용해서 좋아요" 같은 한 줄 이유 금지.
- commonComplaints(구매 전 확인할 점)는 ${G.commonComplaints}. 항목마다 2문장: 어떤 상황에서 생기는 일인지 + 실제 사용자가 알려준 대처 팁
  (예: "물을 반쯤 남긴 채로 두면 밤사이 멈췄다는 사용자가 있어요. 자기 전에 물을 가득 채워 두는 게 사용자들이 알려 준 요령이에요").
  항목이 늘어도 말꼬리는 22번대로 바꿔 가며 쓴다.
  상황 문장은 단점(cons)을 되풀이하지 말고 언제·어떤 환경에서 생기는지로 짧게 쓰고, 무게는 대처 팁에 둔다(10번).
- 확인 팁(buyingGuide·commonComplaints)은 "설치할 자리 폭을 먼저 재 보세요"처럼 구체적인 행동으로 쓴다.
  "확인하세요"라는 말은 글 전체에서 ${MAX_CHECK_PHRASES}번 이내.
- faq 는 ${G.faq}(답은 ${G.faqAnswer}), verdict 는 3~5문장(4문장 이상이면 빈 줄로 두 문단).
- 분량은 근거 안에서만 채운다. 근거가 부족하면 개수·문장 수를 줄여도 된다 — 분량을 맞추려고 지어내지 않는다.
  같은 내용을 말만 바꿔 늘리지도 않는다(10번).`;

const COMPARE_RULES = `너는 한국 소비자를 위한 제품 비교 글을 쓰는 에디터야.
${COMMON_RULES}
비교글 규칙:
- 두 제품을 공정하게 비교한다.
- intro 는 이 제품군을 고민하는 사람의 구체적 상황 장면(근거의 실제 사용 장면에서)으로 시작해, 두 제품 사이에서 무엇을 보고 고르면 되는지로 이어지는 3~4문장.
- buyingGuide 는 이 제품군을 고를 때 볼 기준 ${G.buyingGuide}. 각 detail 은 ${G.buyingGuideDetail}: 왜 중요한지 + 두 제품이 어떻게 다른지 + 살 때 확인하는 팁.
- comparison 은 항목별 비교 6~8개(values 는 제품 순서대로).
- recommendations 는 상황별로 어느 제품이 맞는지 3~5개(pick = 제품 번호).
- verdict 는 후기를 모아 본 에디터의 정리: 두 제품이 갈리는 핵심을 한마디로 짚은 뒤 상황별 선택을 정리.
- 한 제품을 고르는 이유(summary·recommendations·verdict)는 두 제품의 "차이"여야 한다. 두 제품 모두 해당하는 특징은
  한쪽을 고르는 이유로 쓰지 않는다(예: 둘 다 원두를 갈아 쓰는 머신인데 "캡슐 쓰레기를 줄이려면 B").`;

const SINGLE_RULES = `너는 한국 소비자를 위한 제품 후기 분석 글을 쓰는 에디터야. 한 제품의 구매자 후기를 모아 분석한다.
${COMMON_RULES}
단일 상품 글 규칙:
- 제목은 상품명을 포함하고 "후기", "장단점" 같은 검색어를 자연스럽게 넣는다.
- intro 는 이 제품을 고민하는 사람의 구체적 상황 장면(근거의 실제 사용 장면에서)으로 시작해, 살 만한지·어떤 사람에게 맞는지라는 궁금증으로 이어지는 3~4문장.
- buyingGuide 는 이 제품을 살 때 따져볼 포인트 ${G.buyingGuide}. 각 detail 은 ${G.buyingGuideDetail}: 왜 중요한지 + 이 제품은 그 점에서 어떤지 + 살 때 확인하는 팁.
- comparison 은 이 제품의 주요 특징 6~8개(values 는 값 1개짜리 배열).
- recommendations 는 이 제품이 잘 맞는 상황 3~4개(pick 은 항상 0).
- verdict 는 후기를 모아 본 에디터의 정리: 이 제품의 핵심을 한마디로 짚은 뒤 누가 사면 좋고 누가 다른 제품을 보는 게 나은지.`;

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "검색에 걸리고 클릭하고 싶은 제목, 40자 이내, 두 제품명 포함" },
    description: { type: "string", description: "검색 결과 설명문, 120자 이내" },
    summary: { type: "string", description: "한 줄 결론 2~3문장" },
    intro: { type: "string", description: "구체적 상황 장면으로 시작하는 도입 3~4문장" },
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          oneLiner: { type: "string" },
          pros: { type: "array", items: { type: "string" }, description: "3~4개, '핵심어: 한 문장'" },
          cons: { type: "array", items: { type: "string" }, description: "3~4개, '핵심어: 한 문장'" },
          bestFor: { type: "string" },
          review: {
            type: "string",
            description: `실사용 장면 1~2개를 녹인 후기 ${G.review}. 빈 줄("\\n\\n")로 나눈 짧은 문단 ${G.reviewParagraphs}(문단당 2~3문장)`,
          },
          notFor: { type: "string", description: "이 제품이 맞지 않는 사람 1~2문장" },
        },
        required: ["name", "oneLiner", "pros", "cons", "bestFor", "review", "notFor"],
      },
    },
    comparison: {
      type: "array",
      description: "항목별 비교 6~8개. label 6자 이내, values 는 제품 순서대로 12자 이내 짧은 값",
      items: {
        type: "object",
        properties: { label: { type: "string" }, values: { type: "array", items: { type: "string" } } },
        required: ["label", "values"],
      },
    },
    recommendations: {
      type: "array",
      description: "상황별 추천 3~5개. pick 은 제품 번호(0부터)",
      items: {
        type: "object",
        properties: {
          situation: { type: "string", description: "'~라면'으로 끝나는 짧은 구" },
          pick: { type: "integer" },
          reason: {
            type: "string",
            description: `왜 맞는지 ${G.recommendationReason}: 이 제품의 어떤 점이(후기 근거) 그 상황에 맞는지 + 알아 둘 점. 이유마다 다른 말로 시작`,
          },
        },
        required: ["situation", "pick", "reason"],
      },
    },
    commonComplaints: {
      type: "array",
      items: { type: "string" },
      description: `구매 전 확인할 점 ${G.commonComplaints}, 항목마다 2문장(어떤 상황에서 생기는 일 + 실사용자의 대처 팁). 근거가 부족하면 적게`,
    },
    verdict: { type: "string", description: "후기를 모아 본 에디터의 정리 3~5문장 (4문장 이상이면 빈 줄로 두 문단)" },
    buyingGuide: {
      type: "array",
      description: `고르는 기준 ${G.buyingGuide}`,
      items: {
        type: "object",
        properties: {
          criterion: { type: "string" },
          detail: { type: "string", description: `${G.buyingGuideDetail}: 왜 중요한지 + 이 제품은 어떤지 + 확인 팁` },
        },
        required: ["criterion", "detail"],
      },
    },
    faq: {
      type: "array",
      description: `구매 전 자주 묻는 질문 ${G.faq} (근거로 답할 수 있는 것만, 부족하면 적게)`,
      items: {
        type: "object",
        properties: { q: { type: "string" }, a: { type: "string", description: G.faqAnswer } },
        required: ["q", "a"],
      },
    },
  },
  required: [
    "title",
    "description",
    "summary",
    "intro",
    "products",
    "comparison",
    "recommendations",
    "commonComplaints",
    "verdict",
    "faq",
    "buyingGuide",
  ],
};

// 분석(digest)이 있으면 그것을 중심으로, 원자료는 어투·구체성 참고용으로 일부만.
// 분석이 실패한 상품은 원자료를 더 많이 넘긴다.
const RAW_LIMITS = {
  withDigest: { reviews: 25, comments: 20, videoNotes: 2 },
  withoutDigest: { reviews: 100, comments: 100, videoNotes: 5 },
};

function evidenceBlock(r: ProductResearch, digest: ProductDigest | null, index: number): string {
  const lim = digest ? RAW_LIMITS.withDigest : RAW_LIMITS.withoutDigest;
  const reviews = r.reviews
    .slice(0, lim.reviews)
    .map((s) => `- [${SOURCE_LABEL[s.kind]}] ${s.title}: ${s.text}`)
    .join("\n");
  const comments = r.comments
    .slice(0, lim.comments)
    .map((c) => `- ${c}`)
    .join("\n");
  const notes = r.videoNotes
    .slice(0, lim.videoNotes)
    .map((n) => `- [${n.title}] ${n.text}`)
    .join("\n");
  return `## 제품 ${index}: ${r.product.name}
${digest ? `### 후기 분석 (전체 자료 기준)\n${digestBlock(digest)}\n` : ""}### 원자료 발췌 — 네이버
${reviews || "(없음)"}
### 원자료 발췌 — 유튜브 영상 설명
${notes || "(없음)"}
### 원자료 발췌 — 유튜브 댓글
${comments || "(없음)"}
### 웹 후기 요약 (구글 검색)
${r.webSummary ?? "(없음)"}`;
}

function cleanList(list: unknown, max: number): string[] {
  return (Array.isArray(list) ? list : [])
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}

// AI 출력 검증·보정. 형식이 깨지면 예외 → 저장하지 않음.
function validate(raw: unknown, productCount: number): WrittenPost {
  const o = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => String(v ?? "").trim();
  const products = Array.isArray(o.products) ? (o.products as Record<string, unknown>[]) : [];
  if (products.length < productCount) throw new Error(`제품 ${productCount}개 중 ${products.length}개만 작성됨`);

  const content: ShopPostContent = {
    summary: str(o.summary),
    intro: str(o.intro),
    products: products.slice(0, productCount).map((p) => ({
      name: str(p.name),
      oneLiner: str(p.oneLiner),
      pros: cleanList(p.pros, 6),
      cons: cleanList(p.cons, 6),
      bestFor: str(p.bestFor),
      review: str(p.review),
      notFor: str(p.notFor),
    })),
    comparison: (Array.isArray(o.comparison) ? (o.comparison as Record<string, unknown>[]) : [])
      .map((c) => ({ label: str(c.label), values: cleanList(c.values, productCount) }))
      .filter((c) => c.label && c.values.length === productCount)
      .slice(0, 10),
    recommendations: (Array.isArray(o.recommendations) ? (o.recommendations as Record<string, unknown>[]) : [])
      .map((r) => ({ situation: str(r.situation), pick: Number(r.pick), reason: str(r.reason) }))
      .filter((r) => r.situation && Number.isInteger(r.pick) && r.pick >= 0 && r.pick < productCount)
      .slice(0, 6),
    commonComplaints: cleanList(o.commonComplaints, 6),
    verdict: str(o.verdict),
    faq: (Array.isArray(o.faq) ? (o.faq as Record<string, unknown>[]) : [])
      .map((f) => ({ q: str(f.q), a: str(f.a) }))
      .filter((f) => f.q && f.a)
      .slice(0, 8),
    buyingGuide: (Array.isArray(o.buyingGuide) ? (o.buyingGuide as Record<string, unknown>[]) : [])
      .map((g) => ({ criterion: str(g.criterion), detail: str(g.detail) }))
      .filter((g) => g.criterion && g.detail)
      .slice(0, 6),
  };

  const title = str(o.title).slice(0, 80);
  if (!title || !content.summary || content.products.some((p) => !p.name)) {
    throw new Error("필수 항목(제목·결론·제품명) 누락");
  }
  return { title, description: str(o.description).slice(0, 160), content };
}

// 근거 자료 텍스트 (작성·검수·수정이 같은 자료를 본다)
export function buildEvidence(research: ProductResearch[], digests: (ProductDigest | null)[]): string {
  return research.map((r, i) => evidenceBlock(r, digests[i] ?? null, i)).join("\n\n");
}

// 작성 지시(system). 테스트에서 분량·사실성 규칙이 들어갔는지 확인한다
export function rulesFor(productCount: number) {
  return productCount === 1 ? SINGLE_RULES : COMPARE_RULES;
}

async function generateJson(secrets: Secrets, prompt: string, productCount: number): Promise<WrittenPost> {
  // 글 품질이 중요하므로 flash-lite 로는 쓰지 않음 (막혀 있으면 이번 실행 건너뜀)
  const r = await generate(secrets, prompt, { system: rulesFor(productCount), jsonSchema: SCHEMA, strongOnly: true });
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.text);
  } catch {
    throw new Error("Gemini 응답이 JSON 형식이 아님");
  }
  // 저장 전 검사: 한자 섞임 수정
  return fixHanja(secrets, validate(parsed, productCount));
}

export async function writePost(
  secrets: Secrets,
  research: ProductResearch[],
  digests: (ProductDigest | null)[],
  opts: WriterOptions,
): Promise<WrittenPost> {
  const single = research.length === 1;
  const names = research.map((r) => r.product.name).join(" vs ");
  const task = single
    ? `"${names}" 구매자 후기 분석 글을 써줘. products 는 이 제품 1개만.`
    : `"${names}" 비교 글을 써줘.
제품 순서: ${research.map((r, i) => `${i}=${r.product.name}`).join(", ")} (products·values·pick 모두 이 순서)
이 번호는 데이터 순서일 뿐이다. 글에서 제품은 반드시 이름(짧게 줄인 이름도 가능)으로 부르고, "0번", "1번", "A제품" 같은 번호로 부르지 않는다.`;
  const prompt = `${task}
${opts.titleKeyword ? `제목은 반드시 "${opts.titleKeyword}"(실제로 많이 검색되는 표현)로 시작한다. description 첫 문장에도 이 표현을 넣는다.\n` : ""}${opts.titleStyle ? `제목 스타일: ${opts.titleStyle}\n` : ""}${opts.extraPrompt ? `추가 지시: ${opts.extraPrompt}\n` : ""}
=== 근거 자료 ===
${buildEvidence(research, digests)}
===`;
  return generateJson(secrets, prompt, research.length);
}

// 검수에서 나온 지적사항대로 글을 고친다 (지적 안 된 부분은 유지)
export async function revisePost(
  secrets: Secrets,
  research: ProductResearch[],
  digests: (ProductDigest | null)[],
  written: WrittenPost,
  issues: string[],
): Promise<WrittenPost> {
  const prompt = `아래 글(JSON)을 검수 지적사항대로 고쳐서 같은 형식의 JSON 전체로 다시 줘.
- 지적된 문장만 고치고, 나머지 문장은 글자 그대로 둔다.
- 새 사실·새 비교·새 문장을 추가하지 않는다. 고치는 방법은 "삭제" 또는 "근거 자료에 있는 표현으로 바꾸기" 둘뿐이다.
- 근거가 없다는 지적은 그 문장을 통째로 삭제한다(또는 "후기에서는 확인되지 않아요"로 바꾼다).
  같은 내용을 다른 표현으로 바꿔 쓰지 않는다 — 내용이 같으면 다시 근거 없음으로 지적된다
  (점검 실행 45: "테트리스처럼 배열" → "퍼즐처럼 배열"로만 바꿔 문제가 줄지 않음).
- 반복 지적은 해당 섹션에서 그 문장을 삭제하는 것으로 고친다(섹션 최소 분량은 유지).
- 삭제하면 섹션이 최소 개수(고르는 기준 3개, 제품별 장점 3개·단점 2개, FAQ 4개, 표 6개) 아래로 줄어드는 경우에는
  삭제 대신 근거 자료에 있는 다른 내용으로 그 항목을 바꾼다. 섹션을 통째로 비우지 않는다.
- "[구성]" 지적(섹션이 비거나 빈약함)은 예외로, 근거 자료에 있는 내용으로 항목을 채운다.
- 읽기 지적(말꼬리 반복·근거 표시 반복·같은 시작 반복·긴 문단)은 문장의 내용(사실·장면·근거)은 그대로 두고
  끝맺음·첫머리·문단 나누기만 바꾼다 — 이때만 "글자 그대로" 규칙의 예외다.
  근거 표시를 지울 때는 그 구역 첫머리에 후기에서 나온 말임이 한 번 드러나게 남기고, 내용을 단정으로 바꾸지 않는다.
  긴 문단 지적은 문단 사이에 빈 줄("\\n\\n")을 넣어 2~3문장씩 나눈다(문장을 지우거나 새로 쓰지 않는다).
- 고칠 때도 근거 없는 장면·감정을 새로 넣지 않는다.

=== 검수 지적사항 ===
${issues.map((x, i) => `${i + 1}. ${x}`).join("\n")}

=== 현재 글 ===
${JSON.stringify({ title: written.title, description: written.description, ...written.content })}

=== 근거 자료 ===
${buildEvidence(research, digests)}
===`;
  return generateJson(secrets, prompt, research.length);
}
