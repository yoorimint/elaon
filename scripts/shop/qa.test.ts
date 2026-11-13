// 자동 검수 회귀 테스트: 실제로 문제가 됐던 초안을 다시 통과시키지 않는지 확인한다.
// 실행: npm run test:shop  (외부 호출 없음 — Gemini 응답은 가짜)

import assert from "node:assert/strict";
import type { ShopPostContent } from "@/lib/shop-post-types";
import { MIN_REAL_REVIEWS, countRealReviews, isModelName, isOtherGeneration, isSafetyRisk, mentionedIn, sameType } from "./discover";
import { checkNumbers, isNonAnswer, judgeAudit, lintPost, locallySupported, quoteFound, repetitionNotes, reviewAndFix, thinEvidenceWarnings } from "./qa";
import { CLAUDE_MODEL } from "./providers/claude";
import { StrongModelUnavailableError, geminiGenerate, shortError } from "./providers/gemini";
import { generate } from "./providers/llm";
import type { ProductResearch } from "./research";
import type { WrittenPost } from "./writer";

// 2026-11-13 실제 초안(케어팟 X50V)에서 문제가 된 부분
const real: WrittenPost = {
  title: "케어팟 X50V 후기 및 장단점 분석",
  description: "케어팟 X50V 실사용 후기 분석",
  content: {
    summary:
      "케어팟 X50V는 스테인리스 수조와 저온 가열 기능을 갖춰 위생 관리가 편리한 대용량 가습기예요. 다만 남은 물 양에 따른 작동 중단이나 분무 온도 체감 등 구매 전 확인할 점이 있어요.",
    intro: "겨울철 건조함과 아이 비염 걱정으로 가습기를 찾는 분들이 많아요.",
    products: [
      {
        name: "케어팟 X50V",
        oneLiner: "위생적인 스테인리스 수조와 저온 가열 기능을 갖춘 대용량 복합식 가습기",
        pros: ["세척 편의성: 스테인리스 수조와 완전 분리 구조", "안전성: 약 40도 저온 가열", "디자인과 용량: 4.2L 대용량 수조"],
        cons: ["작동 중단: 물이 1/3 이상 남아 있어도 진동자 보호로 인해 작동이 멈춰요", "분무 온도: 따뜻하게 느껴지지 않아요"],
        bestFor: "아이 있는 집",
        notFor: "고온 가열식을 찾는 사람",
        review:
          "아이를 키우는 가정에서 위생적인 면에서 좋은 평가를 받고 있어요. 다만 물이 꽤 남아 있어도 센서 때문에 멈추거나 분무 온도가 미지근해 아쉬움이 남기도 해요.",
      },
    ],
    comparison: [
      { label: "수조 용량", values: ["4.2L"] },
      { label: "최대 분무량", values: ["440cc"] },
      { label: "미스트 온도", values: ["약 40도"] },
      { label: "연속 시간", values: ["최대 30시간"] },
    ],
    recommendations: [{ situation: "신생아나 어린 자녀가 있어 화상 위험 없는 가습기를 찾는다면", pick: 0, reason: "저온 가열" }],
    commonComplaints: ["수조에 물이 상당량 남아 있는 상태에서도 센서로 인해 작동이 멈출 수 있으니 물을 자주 확인해 주세요."],
    verdict: "위생적인 관리와 안전한 저온 가열을 중시하는 가정에 알맞은 가습기예요.",
    faq: [
      { q: "물이 남아 있는데도 작동하지 않아요.", a: "진동자 보호를 위해 물이 남아 있어도 작동이 중단될 수 있어요." },
      { q: "방 공기를 데워주나요?", a: "약 40도 온도를 유지하는 저온 가열 방식이라 화상 위험은 없지만 체감은 적어요." },
      { q: "전기세는?", a: "최소 29W에서 최대 150W라 부담이 적은 편이에요." },
    ],
    buyingGuide: [
      { criterion: "세척과 위생", detail: "304 스테인리스 수조와 완전 분리 구조예요." },
      { criterion: "수조 용량", detail: "진동자 보호로 일정량의 물이 남는 점은 고려해야 해요." },
    ],
  } as ShopPostContent,
};

// 수집 자료 (440cc 는 일부러 뺌, 온도는 ℃ 표기)
const evidence = `케어팟 X50V 스펙: 수조 용량 4.2L, 연속 가습 최대 30시간, 소비전력 29W~150W, 미스트 온도 약 40℃.
후기: 통세척이 가능하고 스테인리스 수조라 위생적이에요. 물이 1/3 정도 남았는데 진동자 보호 때문에 멈춰요.`;

let passed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    });
}

async function main() {
  // ---- 규칙 검사 ----
  await test("근거 없는 단정('화상 위험은 없지만', '위험 없는') 검출", () => {
    const issues = lintPost(real, 1).filter((x) => x.includes("단정"));
    assert.ok(issues.some((x) => x.startsWith("faq[1].a")), issues.join("\n"));
    assert.ok(issues.some((x) => x.startsWith("recommendations[0]")), issues.join("\n"));
  });

  // ---- 자동 선정: 브랜드명만 있는 후보 제외 (2026-11-13 lite 모델이 뽑은 실제 후보) ----
  await test("'조지루시 가습기' 같은 브랜드+카테고리는 제외, 실제 모델명은 통과", () => {
    for (const bad of ["조지루시 가습기", "케어팟 가습기", "스텐팟 가습기", "가습기", "조지루시"]) {
      assert.equal(isModelName(bad, "가습기"), false, bad);
    }
    for (const ok of ["케어팟 X50V", "미로 MH7000", "조지루시 EE-DVH35K", "에어메이드 더 위대한 2.0", "쿠쿠 인스퓨어 가습기"]) {
      assert.equal(isModelName(ok, "가습기"), true, ok);
    }
  });

  // ---- 2026-11-13 Claude 작성 초안(보바 VA-123)에서 나온 표현 ----
  await test("독자에게 '자료' 표현·'확인되지 않음이에요' 같은 어색한 문장 검출", () => {
    const w = structuredClone(real);
    w.content.faq = [
      { q: "케이블 길이는?", a: "케이블 길이는 후기에서 확인되지 않음이에요. 자료에도 길이 정보는 나와 있지 않아요." },
      { q: "출력은?", a: "자료에 따르면 최대 22.5W예요. 무게는 자료 없음." },
      { q: "무게는?", a: "후기에서는 가볍다는 의견이 많아요." },
    ];
    const issues = lintPost(w, 1);
    assert.ok(issues.some((x) => x.startsWith("faq[0].a") && x.includes("어색한")), issues.join("\n"));
    assert.ok(issues.some((x) => x.startsWith("faq[0].a") && x.includes("자료")), issues.join("\n"));
    assert.ok(issues.some((x) => x.startsWith("faq[1].a") && x.includes("자료")), issues.join("\n"));
    assert.ok(!issues.some((x) => x.startsWith("faq[2]")), issues.join("\n"));
  });
  await test("'가격은 쿠팡에서 확인하세요' 안내문은 근거 없는 주장으로 보지 않음", () => {
    const issues = judgeAudit(
      { claims: [{ section: "정리", claim: "현재 가격은 쿠팡에서 확인할 수 있다", quote: "" }] },
      evidence,
      ["정리"],
    );
    assert.deepEqual(issues, []);
  });
  await test("자동 선정: 모은 글에 없는 모델명(AI 가 지어낸 이름)은 제외", () => {
    const titles = "보바 VA-122 보조배터리 후기 — 20000mAh 가볍고 좋아요\n삼성 EB-P4520 추천";
    assert.equal(mentionedIn("보바 VA-122", "보조배터리", titles), true);
    assert.equal(mentionedIn("삼성 EB-P4520", "보조배터리", titles), true);
    assert.equal(mentionedIn("보바 VA-123", "보조배터리", titles), false);
    assert.equal(mentionedIn("앤커 프라임 A1695", "보조배터리", titles), false);
  });
  await test("Gemini 한도 오류 로그는 한도 종류만 짧게 (일일/분당 구분)", () => {
    const daily = 'HTTP 429 — {"error":{"message":"You exceeded your current quota, please check your plan and billing details. ... \\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash"}}';
    assert.match(shortError(daily), /한도 초과 — generativelanguage\.googleapis\.com\/generate_content_free_tier_requests \(한도 20\)/);
    const minute = 'Quota exceeded for metric: input_token_count PerMinute. "retryDelay": "31s"';
    assert.match(shortError(minute), /31초 뒤 재시도/);
  });

  // ---- 2026-11-13 비교글(P31i vs MUSEPOP3) 실행에서 나온 오탐·잡음 ----
  await test("모델명 뒤 조사('MUSEPOP3도')는 수치로 보지 않음", () => {
    const w = structuredClone(real);
    w.content.verdict = "가볍게 시작하고 싶다면 브리츠 MUSEPOP3도 후보예요. 케어팟 X50V도 괜찮아요.";
    assert.ok(!checkNumbers(w, evidence).some((x) => x.startsWith("verdict")), checkNumbers(w, evidence).join("\n"));
  });
  await test("검수자 잡음 제외: '확인되지 않아요' 문장, '수정 없음' 항목", () => {
    const issues = judgeAudit(
      {
        claims: [{ section: "고르는 기준", claim: "MUSEPOP3의 배터리 시간은 후기에서 확인되지 않는다", quote: "" }],
        others: [
          { section: "장점", problem: "가볍다는 내용과 무겁다는 내용 사이 실제 모순 없음", fix: "수정 없음" },
          { section: "정리", problem: "N70 비교 방향이 후기 요약과 반대", fix: "후기 요약에 맞추기" },
        ],
      },
      evidence,
      ["고르는 기준", "장점", "정리"],
    );
    assert.equal(issues.length, 1, issues.join("\n"));
    assert.ok(issues[0].startsWith("정리"));
  });
  await test("반복: 표·제목 제외 4곳까지 정상, 5~6곳은 참고만", () => {
    const names = ["결론", "고르는 기준", "표", "장점", "후기 요약", "정리", "제목"];
    const ok = judgeAudit({ topics: [{ topic: "배터리", sections: ["제목", "표", "고르는 기준", "장점", "후기 요약", "정리"] }] }, evidence, names);
    assert.deepEqual(ok, []);
    const five = { topics: [{ topic: "ANC", sections: ["결론", "고르는 기준", "장점", "후기 요약", "정리"] }] };
    assert.deepEqual(judgeAudit(five, evidence, names), [], "5곳은 수정 대상 아님");
    assert.equal(repetitionNotes(five, names).length, 1, "5곳은 참고로 기록");
  });
  await test("비교표 절반 이상 '확인 안 됨'인 상품은 근거 부족 경고", () => {
    const w = structuredClone(real);
    w.content.products = [w.content.products[0], { ...w.content.products[0], name: "브리츠 MUSEPOP3" }];
    w.content.comparison = [
      { label: "블루투스", values: ["6.1", "6.0"] },
      { label: "배터리", values: ["8시간", "확인 안 됨"] },
      { label: "케이스", values: ["40시간", "확인 안 됨"] },
      { label: "방수", values: ["IP55", "확인 안 됨"] },
    ];
    const warns = thinEvidenceWarnings(w);
    assert.equal(warns.length, 1);
    assert.ok(warns[0].startsWith("브리츠 MUSEPOP3"));
  });

  // ---- 상품 선정: 실제 사용 후기가 충분한 상품만 (2026-11-13 MUSEPOP3: 후기 대부분이 쇼핑 설명) ----
  await test("실사용 후기 수: 광고·쇼핑 글과 다른 모델 글은 세지 않음", () => {
    const items = [
      { title: "브리츠 <b>MUSEPOP3</b> 한달 사용 후기", description: "출퇴근 지하철에서 써보니 노캔이 괜찮아요" },
      { title: "MUSEPOP3 솔직 리뷰 장단점", description: "내돈내산 3주 사용" },
      { title: "MUSEPOP3 최저가 특가 할인", description: "쿠폰 적용 시 2만원대 후기 이벤트" },
      { title: "MUSEPOP3 체험단 후기", description: "업체로부터 제품을 제공받아 작성" },
      { title: "브리츠 MUSEPOP2 후기", description: "전작 사용기" },
      { title: "MUSEPOP3 판매합니다", description: "미개봉" },
    ];
    assert.equal(countRealReviews("브리츠 MUSEPOP3", "무선이어폰", items), 2);
    assert.ok(MIN_REAL_REVIEWS >= 5);
  });
  await test("모델 번호가 있으면 브랜드를 생략한 표기도 같은 제품으로 인정", () => {
    assert.equal(mentionedIn("앤커 사운드코어 P31i", "무선이어폰", "사운드코어 p31i 후기"), true);
    assert.equal(mentionedIn("쿠쿠 인스퓨어", "가습기", "쿠쿠 인스퓨어 가습기 후기"), true);
    assert.equal(mentionedIn("쿠쿠 인스퓨어", "가습기", "인스퓨어 후기"), false);
  });

  // ---- 2026-11-13 run #16 초안: 답 없는 FAQ ----
  await test("답이 '확인되지 않아요'뿐인 FAQ 검출, 정보가 있는 답은 통과", () => {
    assert.equal(isNonAnswer("후기에서는 X60과의 직접 비교가 확인되지 않아요. X50과 비교한 글은 일부 있으니 참고해 보세요."), true);
    assert.equal(
      isNonAnswer("후기에서는 정해진 세척 주기나 소모품 교체 정보가 자세히 확인되지 않아요. 세척 방법과 관리 주기는 제조사 안내나 판매 페이지에서 확인해 보세요."),
      true,
    );
    assert.equal(isNonAnswer("살균은 약 70℃에서 이뤄진다는 언급이 있어요. 살균과 가습 온도가 다르다는 점을 알고 쓰는 게 좋아요."), false);
    assert.equal(isNonAnswer("매일 물을 갈고 주 1회 통세척하라는 후기가 많아요."), false);
    const w = structuredClone(real);
    w.content.faq[0] = { q: "X60과 어떻게 다른가요?", a: "후기에서는 X60과의 직접 비교가 확인되지 않아요." };
    assert.ok(lintPost(w, 1).some((x) => x.startsWith("faq[0]") && x.includes("다른 질문")));
    // run #20: "가격은 어디서 확인하나요?" 채우기용 FAQ
    w.content.faq[1] = { q: "가격은 어디서 확인하나요?", a: "가격은 쿠팡에서 현재 가격을 확인하세요. 옵션과 배송 조건도 살펴보면 좋아요." };
    assert.ok(lintPost(w, 1).some((x) => x.startsWith("faq[1]") && x.includes("가격·구매처")));
  });

  // ---- 2026-11-13 run #17 (보바 VA-123 vs 포켓쉴 20000) ----
  await test("상품명 숫자 + 조사 '도'('포켓쉴 20000도')는 온도로 보지 않음", () => {
    const w = structuredClone(real);
    w.content.products = [{ ...w.content.products[0], name: "포켓쉴 20000" }];
    w.content.verdict = "포켓쉴 20000도 좋은 선택이에요.";
    assert.ok(!checkNumbers(w, evidence).some((x) => x.startsWith("verdict")));
  });
  await test("인용을 못 찾아도 주장의 수치가 모두 자료에 있으면 근거 있음", () => {
    const ev = "포켓쉴 20000 스펙: 무게 315g, 최대 22.5W 출력";
    const issues = judgeAudit({ claims: [{ section: "표", claim: "포켓쉴 20000 무게 315g", quote: "무게는 315그램이에요" }] }, ev, ["표"]);
    assert.deepEqual(issues, []);
  });
  await test("후기 출처의 광고 이야기 문장 검출", () => {
    const w = structuredClone(real);
    w.content.commonComplaints = ["광고 글 주의 · 블로그 후기에 파트너스 문구가 많아 과장된 칭찬은 걸러서 보세요"];
    assert.ok(lintPost(w, 1).some((x) => x.startsWith("commonComplaints[0]") && x.includes("광고")));
  });
  await test("안전 이슈: 같은 브랜드·종류 제품의 리콜·안전기준 미흡 보도가 있으면 제외", () => {
    const news = [
      { title: "보바 보조배터리 VA-122 자발적 리콜", description: "과충전 안전기준 미흡 제품으로 회수 조치" },
    ];
    assert.equal(isSafetyRisk("보바 VA-123", "보조배터리", news), true);
    assert.equal(isSafetyRisk("포켓쉴 20000", "보조배터리", news), false);
    assert.equal(isSafetyRisk("케어팟 X50V", "가습기", [{ title: "가습기 살균제 리콜", description: "다른 회사" }]), false);
    // run #21 오탐: 제목에 안전 단어가 없는 업계·실적 기사는 제외 사유가 아님
    const industry = [
      { title: "“삼성전자 관계자도 귀 ‘쫑긋’했대”…작심하고 내놓은 中앤커 새 이어폰", description: "보조배터리 리콜 이후 앤커는 무선이어폰 시장에" },
      { title: "가민 아태 총괄 \"매년 2배 성장...글로벌 3위 목표\"", description: "스마트워치 시장, 경쟁사 화재 리콜 이후" },
      { title: "비행기 안에서도 불붙었다…보조배터리 화재·사망 리콜 잇따라", description: "벨킨 등 여러 브랜드" },
    ];
    assert.equal(isSafetyRisk("앤커 사운드코어 P31i", "무선이어폰", industry), false);
    assert.equal(isSafetyRisk("가민 포러너 265", "스마트워치", industry), false);
    assert.equal(isSafetyRisk("벨킨 BPD014", "보조배터리", industry), false, "제목에 브랜드 없음");
    // 진짜 리콜 기사는 계속 걸러짐
    assert.equal(isSafetyRisk("보바 VA-123", "보조배터리", [{ title: "빠니보틀 광고한 '보바 맥세이프 보조배터리' 자발적 리콜", description: "" }]), true);
    assert.equal(isSafetyRisk("경동나비엔 숙면매트 EQM555", "온수매트", [{ title: "경동나비엔과 하이젠, 온수매트 '리콜'", description: "온수매트 제품" }]), true);
  });

  // ---- 2026-11-13 run #19 (신일 팬히터 1200 vs 에디르 오방난로) ----
  await test("비교 짝짓기: 같은 종류만 (캠핑용 등유 팬히터 ≠ 카본 전기히터)", () => {
    assert.equal(sameType("등유 팬히터", "카본 전기히터", "전기히터"), false);
    assert.equal(sameType("등유 팬히터", "등유팬히터", "전기히터"), true);
    assert.equal(sameType("팬히터", "등유 팬히터", "전기히터"), true);
    assert.equal(sameType("", "등유 팬히터", "전기히터"), false);
    // run #21: 표현이 조금 달라도 같은 종류
    assert.equal(sameType("여행용 대용량 보조배터리", "PD 대용량 보조배터리", "보조배터리"), true);
    assert.equal(sameType("커널형 무선이어폰", "커널형 노이즈캔슬링 이어폰", "무선이어폰"), true);
    assert.equal(sameType("스마트워치", "러닝 스마트워치", "스마트워치"), true);
    assert.equal(sameType("오픈형 무선이어폰", "무선 게이밍 이어폰", "무선이어폰"), false);
  });
  await test("근거 보완: 핵심 단어가 자료 한 부분에 함께 있으면 근거 있음, 흩어져 있으면 없음", () => {
    const filler = "가".repeat(2000);
    const ev = (`에디르 오방난로는 상단과 옆면까지 5면을 개별로 켤 수 있어 편해요. ${filler} 텐트 안에서는 냄새가 나요. ${filler} 신일은 빠르게 데워요.`)
      .toLowerCase().replace(/[^가-힣a-z0-9]/g, "");
    const products = ["에디르", "오방난로", "신일", "팬히터"];
    assert.equal(locallySupported("에디르 오방난로는 5면을 개별로 켤 수 있다", ev, products), true);
    assert.equal(locallySupported("신일 팬히터는 텐트 안을 빠르게 데운다", ev, products), false, "떨어진 단어 짜깁기");
    assert.equal(locallySupported("에디르는 자동 살균 기능이 있다", ev, products), false);
  });
  await test("천 단위 쉼표 표기 차이는 같은 수치 (1,700W = 1700W)", () => {
    const w = structuredClone(real);
    w.content.comparison[0] = { label: "소비전력", values: ["1700W"] };
    assert.ok(!checkNumbers(w, "소비전력 1,700W").some((x) => x.includes("1700W")));
    w.content.comparison[0] = { label: "소비전력", values: ["1,700W"] };
    assert.ok(!checkNumbers(w, "소비전력 1700W").some((x) => x.includes("700W")));
    assert.ok(checkNumbers(w, "소비전력 700W").some((x) => x.includes("1,700W") || x.includes("700W")));
  });
  await test("33㎡(제곱미터)와 33평은 다른 단위", () => {
    const w = structuredClone(real);
    w.content.comparison[0] = { label: "난방 면적", values: ["33㎡"] };
    assert.ok(checkNumbers(w, "난방 면적 33평").some((x) => x.includes("33㎡")));
    assert.ok(!checkNumbers(w, "난방 면적 33㎡").some((x) => x.includes("33㎡")));
  });

  // ---- 2026-11-13 run #24: 세대 혼동(TUNE BEAM vs BEAM2), 오래된 리콜 기사 ----
  await test("다른 세대 후기는 세지 않음, 같은 세대는 셈", () => {
    assert.equal(isOtherGeneration("JBL TUNE BEAM", "JBL TUNE BEAM 2 한달 사용 후기"), true);
    assert.equal(isOtherGeneration("JBL TUNE BEAM", "JBL TUNE BEAM 후기, BEAM 2 와 비교"), false);
    assert.equal(isOtherGeneration("갤럭시 버즈3 프로", "갤럭시 버즈3 프로 후기"), false);
    const items = [
      { title: "JBL TUNE BEAM 2 한달 사용 후기", description: "노캔 솔직 리뷰" },
      { title: "JBL TUNE BEAM 솔직 후기", description: "한달 사용" },
    ];
    assert.equal(countRealReviews("JBL TUNE BEAM", "무선이어폰", items), 1);
  });
  await test("글에 상품명과 다른 세대 이름이 있으면 검출", () => {
    const w = structuredClone(real);
    w.content.products = [{ ...w.content.products[0], name: "JBL TUNE BEAM" }];
    w.title = "JBL TUNE BEAM2 후기 · 장단점 총정리";
    assert.ok(lintPost(w, 1).some((x) => x.startsWith("제목") && x.includes("다른 세대")));
    w.title = "JBL TUNE BEAM 후기 · 장단점 총정리";
    assert.ok(!lintPost(w, 1).some((x) => x.includes("다른 세대")));
  });
  await test("안전 필터: 3년 넘은 기사, 제목에 카테고리 없는 브랜드 기사는 제외 사유 아님", () => {
    const old = [{ title: "아이폰7 흥행 성공, 갤럭시노트7 리콜 때문만일까", description: "무선이어폰 시장", pubDate: "Mon, 12 Sep 2016 09:00:00 +0900" }];
    assert.equal(isSafetyRisk("갤럭시 버즈2 프로", "무선이어폰", old), false);
    const recentNoCat = [{ title: "갤럭시 스마트폰 리콜", description: "무선이어폰도 언급", pubDate: new Date().toUTCString() }];
    assert.equal(isSafetyRisk("갤럭시 버즈2 프로", "무선이어폰", recentNoCat), false);
  });

  // ---- 숫자 검사 ----
  await test("자료에 없는 수치(440cc) 검출, 40도=40℃ 같은 표기 차이는 통과", () => {
    const issues = checkNumbers(real, evidence);
    assert.ok(issues.some((x) => x.includes("440cc")), issues.join("\n"));
    assert.ok(!issues.some((x) => /40도|4\.2L|30시간|29W|150W/.test(x)), issues.join("\n"));
  });

  // ---- AI 추출 → 코드 판정 ----
  const names = ["결론", "도입", "고르는 기준", "표", "후기 요약", "장점", "단점", "구매 전 확인", "FAQ", "정리"];
  await test("같은 단점이 7곳 이상이면 수정 대상, 적은 곳은 허용", () => {
    const issues = judgeAudit(
      {
        topics: [
          { topic: "물이 남아도 작동 멈춤", sections: ["결론", "도입", "고르는 기준", "후기 요약", "단점", "구매 전 확인", "FAQ"] },
          { topic: "저온 가열", sections: ["장점", "결론", "정리"] },
        ],
      },
      evidence,
      names,
    );
    assert.equal(issues.length, 1, issues.join("\n"));
    assert.ok(issues[0].includes("7곳"));
  });
  await test("근거 인용이 없거나 자료에 없는 문장이면 판정, 진짜 인용은 통과", () => {
    const issues = judgeAudit(
      {
        claims: [
          { section: "표", claim: "최대 분무량 440cc", quote: "" },
          { section: "장점", claim: "자동 살균", quote: "UV 램프로 99.9% 자동 살균되는 기능이 있어요" },
          { section: "장점", claim: "4.2L 수조", quote: "수조 용량 4.2L,  연속 가습 최대 30시간" },
        ],
      },
      evidence,
      names,
    );
    assert.equal(issues.length, 2, issues.join("\n"));
    assert.ok(issues[0].includes("근거 없음") && issues[1].includes("지어냄"));
  });
  await test("인용 대조는 띄어쓰기·문장부호 차이를 무시", () => {
    const n = evidence.toLowerCase().replace(/[^가-힣a-z0-9]/g, "");
    assert.ok(quoteFound("통세척이 가능하고, 스테인리스 수조라 위생적이에요!", n));
    assert.ok(!quoteFound("필터 교체 주기는 6개월이에요", n));
  });

  // ---- 검수 → 수정 루프 + 모델 선택 (가짜 Gemini) ----
  const clean = structuredClone(real);
  clean.content.faq = [
    { q: "관리 주기는?", a: "매일 물을 갈고 주 1회 통세척하라는 후기가 많아요." },
    { q: "설치 위치는?", a: "평평한 곳에 두라는 의견이 많아요." },
    { q: "전기세는?", a: "최소 29W에서 최대 150W라고 소개돼요." },
  ];
  clean.content.comparison = clean.content.comparison.map((r) =>
    r.label === "최대 분무량" ? { label: "소비 전력", values: ["29~150W"] } : r,
  );
  clean.content.recommendations = [{ situation: "아이가 있는 집이라면", pick: 0, reason: "저온 가열" }];
  clean.content.buyingGuide = [
    { criterion: "세척과 위생", detail: "스테인리스 수조와 완전 분리 구조라는 설명이 많아요." },
    { criterion: "수조 용량", detail: "4.2L 수조로 최대 30시간이라고 소개돼요." },
  ];
  clean.content.products[0].pros.push("관리: 통세척이 가능해요");
  clean.content.products[0].review += " 위생 관리가 쉽다는 의견이 많아요.";

  const models = (names: string[]) =>
    new Response(JSON.stringify({ models: names.map((n) => ({ name: `models/${n}`, supportedGenerationMethods: ["generateContent"] })) }));
  const reply = (obj: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }));
  const err429 = (msg: string) => new Response(JSON.stringify({ error: { code: 429, message: msg } }), { status: 429 });
  const calls: string[] = [];
  let mode: "loop" | "worse" | "quota" = "loop";
  let minuteHits = 0;
  const claudeBodies: { model: string; output_config?: { format: { schema: { additionalProperties?: boolean; properties: Record<string, { items?: { additionalProperties?: boolean } }> } } } }[] = [];
  let claudeFails = false;

  globalThis.fetch = (async (url: string, init?: { body?: string }) => {
    const u = String(url);
    if (u.startsWith("https://api.anthropic.com/v1/messages")) {
      const body = JSON.parse(init!.body!);
      calls.push(`claude:${body.model}`);
      claudeBodies.push(body);
      if (claudeFails) return new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "credit balance is too low" } }), { status: 400, headers: { "content-type": "application/json" } });
      assert.equal(body.stream, true, "Claude 는 스트리밍으로 받아야 함 (긴 출력 시간 초과 방지)");
      const sse = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
      const stream = [
        sse("message_start", { message: { id: "msg_1", type: "message", role: "assistant", model: body.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1000, output_tokens: 1 } } }),
        sse("content_block_start", { index: 0, content_block: { type: "text", text: "" } }),
        sse("content_block_delta", { index: 0, delta: { type: "text_delta", text: JSON.stringify({ issues: [] }) } }),
        sse("content_block_stop", { index: 0 }),
        sse("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 200 } }),
        sse("message_stop", {}),
      ].join("");
      return new Response(stream, { headers: { "content-type": "text/event-stream" } });
    }
    if (u.includes("/models?")) return models(["gemini-3.6-flash", "gemini-3.5-flash-lite"]);
    const model = /models\/([^:]+):/.exec(u)?.[1] ?? "";
    const prompt = JSON.parse(init!.body!).contents[0].parts[0].text as string;
    calls.push(model);
    if (mode === "quota") {
      if (prompt.includes("분당")) {
        // 분당 한도 → 잠깐 뒤 같은 모델 성공해야 함
        if (minuteHits++ === 0) return err429('Quota exceeded for metric: input_token_count PerMinute. "retryDelay": "1s"');
        return reply({ ok: 1 });
      }
      return err429("You exceeded your current quota. Quota exceeded for metric: requests PerDay, limit: 20");
    }
    if (prompt.includes("꼼꼼한 검수자")) {
      const first = calls.filter((c) => c === "audit").length === 0;
      calls.push("audit");
      if (mode === "worse") {
        const topic = (t: string) => ({ topic: t, sections: ["결론", "도입", "고르는 기준", "후기 요약", "단점", "FAQ", "정리"] });
        return reply({ claims: [], topics: first ? [topic("A")] : [topic("A"), topic("B")], others: [] });
      }
      return reply(
        first
          ? { claims: [], topics: [{ topic: "물이 남아도 멈춤", sections: ["결론", "도입", "고르는 기준", "후기 요약", "단점", "구매 전 확인", "FAQ"] }], others: [] }
          : { claims: [], topics: [], others: [] },
      );
    }
    if (prompt.includes("검수 지적사항")) {
      calls.push("revise");
      if (mode === "worse") {
        const bad = structuredClone(real);
        bad.content.intro += " 최저가 보장";
        return reply({ title: bad.title, description: bad.description, ...bad.content });
      }
      assert.ok(prompt.includes("7곳에서 반복"), "반복 지적이 수정 프롬프트에 전달돼야 함");
      assert.ok(prompt.includes("440cc"), "숫자 지적이 수정 프롬프트에 전달돼야 함");
      const { title, description, content } = clean;
      return reply({ title, description, ...content });
    }
    throw new Error("예상 못한 프롬프트");
  }) as typeof fetch;

  const research = [
    {
      product: { name: "케어팟 X50V", link: "" },
      reviews: [{ title: "후기", text: evidence, url: "", source: "blog" }],
      videos: [], comments: [], videoNotes: [], news: [], webSummary: null, webSourceCount: 0, errors: [],
    },
  ] as unknown as ProductResearch[];

  await test("검수 → 수정 → 재검수: 실제 초안의 문제를 고친 뒤 통과", async () => {
    const r = await reviewAndFix({ GEMINI_API_KEY: "x" } as never, real, research, [null]);
    assert.equal(calls.filter((c) => c === "revise").length, 1);
    assert.equal(r.qa.aiChecked, true);
    assert.deepEqual(r.qa.remaining, [], r.qa.remaining.join("\n"));
    assert.ok(r.qa.issuesFound >= 4);
  });

  await test("수정본이 더 나빠지면 문제가 가장 적은 버전(원본)을 저장", async () => {
    mode = "worse";
    calls.length = 0;
    const r = await reviewAndFix({ GEMINI_API_KEY: "x" } as never, real, research, [null]);
    assert.equal(r.post.content.intro, real.content.intro);
    assert.equal(r.qa.revisions, 2);
    assert.equal(r.qa.remaining.length, Math.min(10, r.qa.issuesFound));
  });

  mode = "quota";
  await test("분당 한도는 기다렸다 같은 모델로 재시도 (lite 로 안 내려감)", async () => {
    calls.length = 0;
    const r = await geminiGenerate({ GEMINI_API_KEY: "x" } as never, "분당 테스트");
    assert.equal(r.model, "gemini-3.6-flash");
    assert.deepEqual(calls, ["gemini-3.6-flash", "gemini-3.6-flash"]);
  });
  await test("좋은 모델이 일일 한도면 strongOnly 호출은 lite 를 쓰지 않고 중단", async () => {
    calls.length = 0;
    await assert.rejects(
      geminiGenerate({ GEMINI_API_KEY: "x" } as never, "작성", { strongOnly: true }),
      StrongModelUnavailableError,
    );
    assert.ok(!calls.some((c) => c.endsWith("-lite")), calls.join(","));
  });
  await test("Gemini 가 막히면 Claude Haiku 5.5 로 대신 (구조화 출력 스키마 변환)", async () => {
    calls.length = 0;
    const schema = { type: "object", properties: { issues: { type: "array", items: { type: "object", properties: { a: { type: "string" } }, required: ["a"] } } }, required: ["issues"] };
    const r = await generate({ GEMINI_API_KEY: "x", ANTHROPIC_API_KEY: "y" } as never, "작성", { strongOnly: true, jsonSchema: schema });
    assert.equal(r.model, CLAUDE_MODEL);
    assert.deepEqual(JSON.parse(r.text), { issues: [] });
    assert.ok(!calls.some((c) => c.endsWith("-lite")), calls.join(","));
    const sent = claudeBodies.at(-1)!;
    assert.equal(sent.model, "claude-haiku-5-5");
    assert.equal(sent.output_config!.format.schema.additionalProperties, false);
    assert.equal(sent.output_config!.format.schema.properties.issues.items!.additionalProperties, false);
  });
  await test("Gemini·Claude 둘 다 안 되면 저장하지 않고 건너뜀(StrongModelUnavailableError)", async () => {
    claudeFails = true;
    await assert.rejects(
      generate({ GEMINI_API_KEY: "x", ANTHROPIC_API_KEY: "y" } as never, "작성", { strongOnly: true }),
      StrongModelUnavailableError,
    );
    claudeFails = false;
  });
  await test("AI 검수를 못 하면 '통과'가 아니라 aiChecked=false", async () => {
    const r = await reviewAndFix({ GEMINI_API_KEY: "x" } as never, clean, research, [null]);
    assert.equal(r.qa.aiChecked, false);
  });

  console.log(`\n${passed}개 통과`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
