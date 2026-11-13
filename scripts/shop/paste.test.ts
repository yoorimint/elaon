// 붙여넣기 인식기(src/lib/shop-paste.ts)·블록 편집(src/lib/shop-manual.ts) 회귀 테스트 — 외부 호출 없음
// 실행: npm run test:shop (qa.test.ts·webreviews.test.ts 다음에 실행됨)
// 고친 문제마다 여기에 테스트를 하나씩 추가한다.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isManualContent, isManualPost, type ShopManualBlock, type ShopPost } from "@/lib/shop-post-types";
import { AUTO_PLACEMENT, inferTableColumns, nameHintOf, parsePastedDraft, reparseInto, tableFromText } from "@/lib/shop-paste";
import {
  addTableColumn,
  addTableRow,
  autoDescription,
  countBlocks,
  insertBlock,
  makeBlock,
  moveBlock,
  postDescription,
  postImages,
  publishProblems,
  removeBlock,
  removeProduct,
  removeTableColumn,
  removeTableRow,
  sanitizeManualInput,
  setTableCell,
  setBlockImage,
} from "@/lib/shop-manual";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// 차례대로 b1, b2 … (결과 비교를 쉽게)
function ids() {
  let n = 0;
  return () => `b${++n}`;
}
const types = (bs: ShopManualBlock[]) => bs.map((b) => b.type);
const first = <T extends ShopManualBlock["type"]>(bs: ShopManualBlock[], t: T) =>
  bs.find((b) => b.type === t) as Extract<ShopManualBlock, { type: T }>;

// 운영자가 쓴 샘플 (가상 제품 "샘플 A100") — 마커가 여러 형태로 섞여 있다
const SAMPLE = "자취방 무선청소기, 20만 원대에서 고른다면? 샘플 A100 한 달 사용 정리\n\n혼자 사는 원룸에서 제일 귀찮은 집안일이 뭐냐고 물으면 대부분 청소기 꺼내는 일이라고 답해요. 유선 청소기는 콘센트를 옮겨 꽂아야 하고, 로봇청소기는 좁은 방에서 의자 다리에 걸려 멈추기 일쑤죠. 그래서 요즘 자취생 사이에서 20만 원대 무선청소기가 다시 인기예요.\n\n오늘은 그중 후기가 많은 샘플 A100을 중심으로, 실제로 써 본 사람들이 어떤 점에 만족하고 어떤 점에서 아쉬워하는지 정리해 봤어요.\n\n[이미지: 제품 전체 모습]\n\n## 1. 무게가 가벼워서 매일 꺼내게 돼요\n\n샘플 A100의 본체 무게는 1.3kg 정도예요. 한 손으로 들고 책상 위나 침대 밑까지 휘휘 돌릴 수 있는 수준이라, \"청소기를 꺼내는 게 귀찮지 않다\"는 후기가 가장 많았어요.\n\n특히 벽에 거치대를 달아 두면 충전과 보관이 한 번에 해결돼요. 퇴근하고 신발 벗자마자 현관 모래를 30초 만에 치우는 루틴이 생겼다는 사람도 있었어요.\n\n👉 샘플 A100 최저가 보러가기\n\n## 2. 흡입력은 원룸에 충분, 카펫에서는 아쉬워요\n\n마룻바닥과 장판에서는 머리카락과 과자 부스러기를 한 번에 빨아들인다는 평이 대부분이에요. 다만 털이 긴 러그나 카펫 위에서는 두세 번 왕복해야 깨끗해진다는 의견이 있었어요.\n\n(사진)\n\n강아지나 고양이를 키운다면 털 엉킴 방지 브러시가 따로 들어 있는지 꼭 확인하세요. 기본 구성에는 일반 브러시만 들어 있어요.\n\n## 3. 배터리는 25분, 원룸 한 번 청소엔 넉넉해요\n\n기본 모드 기준 25분 정도 쓸 수 있어요. 원룸이나 투룸을 한 번 청소하는 데는 10분이면 충분해서 배터리가 모자란다는 후기는 거의 없었어요. 대신 강력 모드로만 쓰면 8분 안팎으로 확 줄어들어요.\n\n[사진]\n\n배터리는 분리형이라 나중에 교체용 배터리만 따로 살 수 있어요. 2~3년 쓰다 보면 배터리가 먼저 지치니까 이 부분은 큰 장점이에요.\n\n[쿠팡 링크]\n\n## 4. 아쉬운 점도 분명해요\n\n먼지통이 0.4L로 작아서 매번 비워야 해요. 먼지통을 비울 때 먼지가 날린다는 불만도 꽤 있었어요. 비닐봉지를 씌우고 비우면 훨씬 덜 날린다는 팁이 많이 공유되고 있어요.\n\n소음은 일반 모드에서는 대화가 가능한 수준이지만, 강력 모드에서는 꽤 커요. 늦은 밤 원룸에서 쓰기엔 조금 부담스러울 수 있어요.\n\n[이미지]\n\n## 이런 분께 추천해요\n\n- 원룸·투룸에 혼자 사는 분\n- 무거운 청소기 때문에 청소를 미루게 되는 분\n- 배터리를 오래 쓰고 싶어 교체형을 원하는 분\n\n반대로 넓은 집이나 카펫이 많은 집, 털이 많이 빠지는 반려동물과 사는 집이라면 흡입력이 더 센 상위 모델을 보는 게 나아요.\n\n정리하면, 샘플 A100은 \"자주 꺼내 쓰게 되는 가벼운 청소기\"가 필요한 1~2인 가구에 잘 맞는 제품이에요. 가격은 시기마다 달라지니 구매 전에 한 번 확인해 보세요.\n\n[구매하기 버튼]";


// 사장님이 실제로 붙여넣은 글 (2026-11-14 초안 /shop/20261114-34b2c9). 저장된 블록에서 복원한 원문 —
// 소제목 서식이 빠진 평문 줄, 칸 구분 없이 한 줄로 붙은 표, "👉 … 가격·옵션 보기" 링크 줄, 끝의 ※ 안내 문단이 들어 있다.
const FULAS = readFileSync(join(__dirname, "fixtures", "paste-fulas-7l.txt"), "utf8");
const FULAS_FLAT_TABLE =
  "모드 최대 가습량 7L를 해당 가습량으로 계속 분무한다고 계산하면 일반모드 시간당 360mL 약 19시간 가열모드 시간당 780mL 약 9시간";
const FULAS_CELLS = [
  "모드",
  "최대 가습량",
  "7L를 해당 가습량으로 계속 분무한다고 계산하면",
  "일반모드",
  "시간당 360mL",
  "약 19시간",
  "가열모드",
  "시간당 780mL",
  "약 9시간",
];
const FULAS_HEADINGS = [
  "누웠다가 물 채우러 다시 일어나는 일이 싫다면",
  "습도를 맞춰두는 기능이 반가운 이유",
  "가열 기능은 반갑지만, 전기는 모드별로 봐야 해요",
  "예쁜 가습기도 결국 싱크대 앞에 서게 돼요",
  "침실에서는 작은 기능이 은근히 커져요",
  "오래 쓸 생각이라면 A/S 조건도 한 줄 더 읽어보세요",
  "이런 생활이라면 풀라스 7L가 눈에 들어올 것 같아요",
];
const tableOfResult = (bs: ShopManualBlock[]) => bs.filter((b): b is Extract<ShopManualBlock, { type: "table" }> => b.type === "table");

function main() {
  test("샘플: 제목·사진 4·구매 버튼 3·소제목 5·목록 1", () => {
    const r = parsePastedDraft(SAMPLE, { idGen: ids() });
    assert.equal(r.title, "자취방 무선청소기, 20만 원대에서 고른다면? 샘플 A100 한 달 사용 정리");
    const c = countBlocks(r.blocks);
    assert.deepEqual([c.images, c.links, c.headings, c.lists], [4, 3, 5, 1]);
    assert.deepEqual(r.autoPlaced, { images: false, links: false });
    // [이미지: 설명] 의 설명은 대체 텍스트로
    assert.equal(first(r.blocks, "image").alt, "제품 전체 모습");
    // 👉 줄에서 상품 이름 후보, 구매 버튼은 모두 그 상품
    assert.deepEqual(r.products, [{ name: "샘플 A100", link: "" }]);
    assert.ok(r.blocks.every((b) => b.type !== "link" || b.product === 0));
    assert.deepEqual(first(r.blocks, "list").items, [
      "원룸·투룸에 혼자 사는 분",
      "무거운 청소기 때문에 청소를 미루게 되는 분",
      "배터리를 오래 쓰고 싶어 교체형을 원하는 분",
    ]);
    // 마커 글자는 본문에 남지 않는다
    const text = JSON.stringify(r.blocks);
    for (const m of ["[사진]", "(사진)", "[이미지", "[쿠팡 링크]", "[구매하기 버튼]", "👉", "##"]) assert.ok(!text.includes(m), m);
    // 블록 id 는 모두 다르다
    assert.equal(new Set(r.blocks.map((b) => b.id)).size, r.blocks.length);
  });

  test("샘플: 순서 — 소제목 뒤 문단, (사진) 은 문단 사이 그 자리에", () => {
    const r = parsePastedDraft(SAMPLE, { idGen: ids() });
    const t = types(r.blocks);
    assert.deepEqual(t.slice(0, 4), ["paragraph", "paragraph", "image", "heading"]);
    const h2 = r.blocks.findIndex((b) => b.type === "heading" && b.text.startsWith("2."));
    assert.deepEqual(t.slice(h2, h2 + 4), ["heading", "paragraph", "image", "paragraph"]);
    assert.equal(t[t.length - 1], "link");
  });

  test("마커가 전혀 없는 글: 소제목마다 아래 사진 1개, 맨 위·맨 끝 구매 버튼", () => {
    const text = ["무선청소기 고르는 법", "", "## 무게", "", "가벼워야 자주 써요.", "", "## 배터리", "", "20분이면 충분해요."].join("\n");
    const r = parsePastedDraft(text, { idGen: ids() });
    assert.equal(r.title, "무선청소기 고르는 법");
    assert.deepEqual(types(r.blocks), ["link", "heading", "image", "paragraph", "heading", "image", "paragraph", "link"]);
    assert.deepEqual(r.autoPlaced, { images: true, links: true });
    assert.ok(AUTO_PLACEMENT.imageAfterEachHeading && AUTO_PLACEMENT.linkAtTop && AUTO_PLACEMENT.linkAtEnd);
  });

  test("소제목도 마커도 없는 글: 첫 문단 뒤 사진 1개", () => {
    const r = parsePastedDraft("첫 문단이에요. 길게 써 봤어요.\n\n둘째 문단이에요.", { idGen: ids() });
    assert.equal(r.title, ""); // 첫 줄이 마침표로 끝나면 제목이 아니다
    assert.deepEqual(types(r.blocks), ["link", "paragraph", "image", "paragraph", "link"]);
  });

  test("사진 마커만 있으면 구매 버튼만 자동, 링크 마커만 있으면 사진만 자동", () => {
    const a = parsePastedDraft("제목\n\n## 꼭지\n\n본문이에요.\n\n[사진]", { idGen: ids() });
    assert.equal(countBlocks(a.blocks).images, 1);
    assert.deepEqual(a.autoPlaced, { images: false, links: true });
    const b = parsePastedDraft("제목\n\n## 꼭지\n\n본문이에요.\n\n[링크]", { idGen: ids() });
    assert.equal(countBlocks(b.blocks).links, 1);
    assert.deepEqual(b.autoPlaced, { images: true, links: false });
  });

  test("사진 마커 변형: 괄호 종류·공백·번호·설명·이모지", () => {
    const variants: [string, string][] = [
      ["[이미지]", ""],
      ["[ 이미지 ]", ""],
      ["[이미지: 측면 모습]", "측면 모습"],
      ["[이미지 : 측면 모습]", "측면 모습"],
      ["[사진]", ""],
      ["[사진1]", ""],
      ["[사진 2]", ""],
      ["(사진)", ""],
      ["( 사진 )", ""],
      ["(이미지)", ""],
      ["<사진>", ""],
      ["【사진】", ""],
      ["[제품 사진]", "제품 사진"],
      ["📷", ""],
      ["📷 거치대에 꽂은 모습", "거치대에 꽂은 모습"],
      ["📸 사진: 먼지통", "먼지통"],
      ["[image]", ""],
      ["[Photo: front]", "front"],
    ];
    for (const [m, alt] of variants) {
      const r = parsePastedDraft(`제목\n\n본문이에요.\n\n${m}\n\n끝이에요.`, { idGen: ids() });
      const imgs = r.blocks.filter((b) => b.type === "image");
      assert.equal(imgs.length, 1, m);
      assert.equal(first(r.blocks, "image").alt, alt, m);
    }
  });

  test("사진처럼 보이지만 사진 자리가 아닌 괄호는 글자로 남는다", () => {
    const r = parsePastedDraft("제목\n\n(사진 참고) 위 모습처럼 작아요.\n\n[참고] 가격은 바뀌어요.", { idGen: ids() });
    assert.equal(r.blocks.filter((b) => b.type === "image" && !r.autoPlaced.images).length, 0);
    assert.ok(JSON.stringify(r.blocks).includes("(사진 참고)"));
    assert.ok(JSON.stringify(r.blocks).includes("[참고]"));
  });

  test("문장 안에 섞인 [사진] 도 떼어서 사진 자리로", () => {
    const r = parsePastedDraft("제목\n\n가벼워요. [사진] 그래서 자주 써요.", { idGen: ids() });
    assert.deepEqual(types(r.blocks).filter((t) => t !== "link"), ["paragraph", "image", "paragraph"]);
  });

  test("구매 버튼 마커 변형", () => {
    const variants = [
      "[쿠팡 링크]",
      "[링크]",
      "[구매하기 버튼]",
      "[구매 링크]",
      "[구매 버튼]",
      "[쿠팡 파트너스 링크]",
      "(구매 링크)",
      "👉 샘플 A100 최저가 보러가기",
      "👉 구매하기",
      "▶ 구매하기",
      "☞ 쿠팡에서 가격 확인",
      "➡️ 바로가기",
      "샘플 A100 최저가 보러가기",
    ];
    for (const m of variants) {
      const r = parsePastedDraft(`제목\n\n본문이에요.\n\n${m}\n\n끝이에요.`, { idGen: ids() });
      assert.equal(countBlocks(r.blocks).links, 1, m);
      assert.equal(r.autoPlaced.links, false, m);
      assert.ok(!JSON.stringify(r.blocks).includes(m), m);
    }
  });

  test("쿠팡 파트너스 URL 은 상품 링크로 바로 채우고, 링크가 둘이면 상품 둘", () => {
    const text = [
      "두 제품 비교",
      "",
      "A 이야기예요.",
      "",
      "👉 제품 A 보러가기 https://link.coupang.com/a/abc123",
      "",
      "B 이야기예요.",
      "",
      "https://link.coupang.com/a/xyz789",
      "",
      "[구매 링크]",
      "",
      "[샘플 A 보기](https://link.coupang.com/a/abc123)",
    ].join("\n");
    const r = parsePastedDraft(text, { idGen: ids() });
    assert.deepEqual(r.products.map((p) => p.link), ["https://link.coupang.com/a/abc123", "https://link.coupang.com/a/xyz789"]);
    assert.equal(r.products[0].name, "제품 A");
    const links = r.blocks.filter((b): b is Extract<ShopManualBlock, { type: "link" }> => b.type === "link");
    assert.deepEqual(links.map((b) => b.product), [0, 1, 0, 0]); // 주소 없는 [구매 링크] 는 첫 상품, 마크다운 링크는 같은 주소
    assert.ok(!JSON.stringify(r.blocks).includes("https://"));
  });

  test("일반 쿠팡 주소는 경고하고 링크 값은 비워 둔다", () => {
    const r = parsePastedDraft("제목\n\n본문이에요.\n\nhttps://www.coupang.com/vp/products/123?itemId=4", { idGen: ids() });
    assert.equal(countBlocks(r.blocks).links, 1);
    assert.equal(r.products[0].link, "");
    assert.ok(r.warnings.some((w) => w.includes("일반 쿠팡 주소")));
  });

  test("문장 안의 파트너스 링크: 문장은 남기고 링크는 그 뒤 구매 버튼으로", () => {
    const r = parsePastedDraft("제목\n\n자세한 가격은 https://link.coupang.com/a/abc123 에서 확인하면서 비교해 보시면 좋아요.", { idGen: ids() });
    assert.deepEqual(types(r.blocks).filter((t) => t !== "image"), ["paragraph", "link"]);
    assert.ok(!first(r.blocks, "paragraph").text.includes("https://"));
    assert.equal(r.products[0].link, "https://link.coupang.com/a/abc123");
  });

  test("소제목 변형: #·##·###·**굵게**·1.·■·▶·●", () => {
    const text = [
      "제목",
      "",
      "# 큰 제목은 소제목",
      "본문이에요.",
      "### 작은 소제목",
      "본문이에요.",
      "**굵게만 쓴 줄**",
      "본문이에요.",
      "1. 숫자로 시작하는 짧은 줄",
      "본문이에요.",
      "■ 네모 소제목",
      "본문이에요.",
      "▶ 세모 소제목",
      "본문이에요.",
      "● 동그라미 소제목",
      "본문이에요.",
    ].join("\n");
    const r = parsePastedDraft(text, { idGen: ids() });
    const hs = r.blocks.filter((b): b is Extract<ShopManualBlock, { type: "heading" }> => b.type === "heading");
    assert.deepEqual(
      hs.map((h) => `${h.level}:${h.text}`),
      ["2:큰 제목은 소제목", "3:작은 소제목", "2:굵게만 쓴 줄", "2:1. 숫자로 시작하는 짧은 줄", "2:네모 소제목", "3:세모 소제목", "3:동그라미 소제목"],
    );
  });

  test("목록 변형: - • * · 1) ① ✔, 붙은 '1.' 줄과 '●' 줄은 목록", () => {
    const text = ["제목", "", "- 가", "• 나", "* 다", "· 라", "", "1) 하나", "2) 둘", "", "① 첫째", "② 둘째", "", "✔ 체크", "", "1. 첫 줄", "2. 둘째 줄", "", "● 점 하나", "● 점 둘"].join("\n");
    const r = parsePastedDraft(text, { idGen: ids() });
    const lists = r.blocks.filter((b): b is Extract<ShopManualBlock, { type: "list" }> => b.type === "list");
    assert.deepEqual(
      lists.map((l) => `${l.ordered ? "o" : "u"}:${l.items.join(",")}`),
      ["u:가,나,다,라", "o:하나,둘", "o:첫째,둘째", "u:체크", "o:첫 줄,둘째 줄", "u:점 하나,점 둘"],
    );
    assert.equal(countBlocks(r.blocks).headings, 0);
  });

  test("긴 '1.' 줄은 소제목이 아니라 문장", () => {
    const r = parsePastedDraft("제목\n\n1. 이 문장은 소제목이 되기엔 너무 길어서 문단으로 남아야 하는 줄이에요. 정말 길어요.\n\n본문", { idGen: ids() });
    assert.equal(countBlocks(r.blocks).headings, 0);
  });

  test("제목 규칙: 긴 첫 줄·마침표로 끝나는 첫 줄은 제목 아님, '# 제목'·'제목:' 은 제목", () => {
    assert.equal(parsePastedDraft("가".repeat(61) + "\n\n본문").title, "");
    assert.equal(parsePastedDraft("짧지만 문장이에요.\n\n본문").title, "");
    assert.equal(parsePastedDraft("# 마크다운 제목\n\n본문").title, "마크다운 제목");
    assert.equal(parsePastedDraft("제목: 라벨 붙은 제목\n\n본문").title, "라벨 붙은 제목");
    assert.equal(parsePastedDraft("## 소제목으로 시작\n\n본문").title, "");
  });

  test("고지 문구·구분선은 본문에서 빠진다 (화면 위에 자동으로 들어감)", () => {
    const r = parsePastedDraft("제목\n\n이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.\n\n---\n\n본문이에요.", {
      idGen: ids(),
    });
    assert.ok(!JSON.stringify(r.blocks).includes("파트너스 활동"));
    assert.ok(!JSON.stringify(r.blocks).includes("---"));
    assert.ok(r.warnings.some((w) => w.includes("고지 문구")));
  });

  test("Windows 줄바꿈·눈에 안 보이는 글자가 섞여도 같은 결과", () => {
    const a = parsePastedDraft(SAMPLE, { idGen: ids() });
    const b = parsePastedDraft(SAMPLE.replace(/\n/g, "\r\n").replace(/\[사진\]/g, "[\u200b사진]"), { idGen: ids() });
    assert.deepEqual(countBlocks(b.blocks), countBlocks(a.blocks));
  });

  test("상품 이름 후보", () => {
    assert.equal(nameHintOf("👉 샘플 A100 최저가 보러가기"), "샘플 A100");
    assert.equal(nameHintOf("쿠팡에서 가격 보기"), undefined);
  });

  // ---- 2026-11-14 실제 글(풀라스 7L): 평문 소제목·표·링크 줄 ----
  test("풀라스 글: 서식 없는 소제목 7개 인식, 소제목마다 사진 자리", () => {
    const r = parsePastedDraft(FULAS, { idGen: ids() });
    assert.equal(r.title, "풀라스 7L 복합식 가습기, 자꾸 물 채우는 게 귀찮았다면");
    const hs = r.blocks.filter((b): b is Extract<ShopManualBlock, { type: "heading" }> => b.type === "heading");
    assert.deepEqual(hs.map((h) => h.text), FULAS_HEADINGS);
    assert.ok(hs.every((h) => h.level === 2));
    // 사진 표시가 없는 글 → 소제목마다 바로 아래 사진 자리
    assert.ok(countBlocks(r.blocks).images >= 7);
    r.blocks.forEach((b, i) => {
      if (b.type === "heading") assert.equal(r.blocks[i + 1].type, "image", b.text);
    });
    // 짧아도 마침표로 끝나는 문장은 문단 ("그리고 한 가지는 있어요." 로 시작하는 문단이 그대로)
    assert.ok(r.blocks.some((b) => b.type === "paragraph" && b.text.startsWith("그리고 한 가지는 있어요.")));
  });

  test("풀라스 글: 👉 … 가격·옵션 보기 줄은 그 자리 구매 버튼 (상품 이름 후보), 끝에 자동 버튼이 겹치지 않음, ※ 안내는 버튼 뒤 문단", () => {
    const r = parsePastedDraft(FULAS, { idGen: ids() });
    const t = types(r.blocks);
    assert.equal(countBlocks(r.blocks).links, 1);
    assert.equal(r.autoPlaced.links, false);
    assert.deepEqual(r.products, [{ name: "풀라스 7L 복합식 가습기", link: "" }]);
    assert.deepEqual(t.slice(-3), ["paragraph", "link", "paragraph"]);
    const last = r.blocks[r.blocks.length - 1];
    assert.ok(last.type === "paragraph" && last.text.startsWith("※ 직접 사용한 후기가 아닌"));
    assert.ok(!JSON.stringify(r.blocks).includes("👉"));
  });

  test("풀라스 글(저장된 모양 그대로): 칸 구분 없이 한 줄로 붙은 표는 문단으로 두고 경고", () => {
    const r = parsePastedDraft(FULAS, { idGen: ids() });
    assert.equal(countBlocks(r.blocks).tables, 0);
    assert.ok(r.blocks.some((b) => b.type === "paragraph" && b.text === FULAS_FLAT_TABLE));
    assert.ok(r.warnings.some((w) => w.includes("표가 한 줄로 붙어")));
    // 그 경고가 숫자 많은 일반 문장에는 뜨지 않는다 (문장 끝맺음이 있음)
    const ok = parsePastedDraft("제목\n\n소비전력은 일반모드 15~25W, 가열모드 270~280W, 하루 8시간 기준이에요.\n\n끝이에요.");
    assert.ok(!ok.warnings.some((w) => w.includes("표가 한 줄로")));
  });

  test("풀라스 글: 표를 탭 구분·칸마다 한 줄·칸마다 빈 줄·마크다운으로 붙여넣으면 표 1개", () => {
    const expected = { head: FULAS_CELLS.slice(0, 3), rows: [FULAS_CELLS.slice(3, 6), FULAS_CELLS.slice(6, 9)] };
    const variants: Record<string, string> = {
      tab: [0, 3, 6].map((i) => FULAS_CELLS.slice(i, i + 3).join("\t")).join("\n"),
      lines: FULAS_CELLS.join("\n"),
      blank: FULAS_CELLS.join("\n\n"),
      markdown: [0, 3, 6].map((i) => `| ${FULAS_CELLS.slice(i, i + 3).join(" | ")} |`).join("\n").replace("\n", "\n|---|---|---|\n"),
    };
    for (const [k, table] of Object.entries(variants)) {
      const r = parsePastedDraft(FULAS.replace(FULAS_FLAT_TABLE, table), { idGen: ids() });
      const tables = tableOfResult(r.blocks);
      assert.equal(tables.length, 1, k);
      assert.deepEqual({ head: tables[0].head, rows: tables[0].rows }, expected, k);
      // 표 칸이 소제목으로 오인되지 않는다
      assert.equal(countBlocks(r.blocks).headings, 7, k);
      assert.ok(!r.warnings.some((w) => w.includes("표가 한 줄로")), k);
      // 표는 원래 자리 (안내 문단 뒤, 계산 설명 문단 앞)
      const i = r.blocks.findIndex((b) => b.type === "table");
      assert.ok((r.blocks[i - 1] as { text: string }).text.startsWith("다만 ‘7L니까"), k);
      assert.ok((r.blocks[i + 1] as { text: string }).text.startsWith("계산상으로는"), k);
    }
  });

  test("표: 첫 칸이 빈 탭 표·줄 끝 탭, 한 줄짜리 탭 줄은 문단", () => {
    const r = parsePastedDraft("제목\n\n본문이에요.\n\n\t일반\t가열\t\n전력\t15W\t270W\t\n\n끝이에요.", { idGen: ids() });
    const [t] = tableOfResult(r.blocks);
    assert.deepEqual([t.head, t.rows], [["", "일반", "가열"], [["전력", "15W", "270W"]]]);
    const one = parsePastedDraft("제목\n\n본문이에요.\n이름\t값\n끝이에요.", { idGen: ids() });
    assert.equal(countBlocks(one.blocks).tables, 0);
    assert.ok(one.blocks.some((b) => b.type === "paragraph" && b.text === "본문이에요.\n이름 값\n끝이에요."));
  });

  test("표로 못 묶는 짧은 줄 묶음은 줄을 살려 목록으로 (한 문단으로 뭉개지지 않게)", () => {
    const r = parsePastedDraft("제목\n\n본문이에요.\n\n물통 7L\n무드등 3색\n타이머 8시간\n\n끝이에요.", { idGen: ids() });
    assert.deepEqual(first(r.blocks, "list").items, ["물통 7L", "무드등 3색", "타이머 8시간"]);
    // 비슷한 줄을 늘어놓은 목록은 표로 오인하지 않는다
    assert.equal(inferTableColumns(["샤오미 4L", "다이슨 5L", "풀라스 7L", "보랄 3L", "신일 6L", "한경희 4L"]), null);
    assert.equal(inferTableColumns(FULAS_CELLS), 3);
  });

  test("평문 소제목 오탐 방지: 마침표·물음표 문장, 문단 안의 줄, 뒤에 문단이 없는 줄, 짧은 줄이 이어지는 곳", () => {
    const cases = [
      "제목\n\n첫 문단이에요.\n\n그리고 한 가지는 있어요.\n\n둘째 문단이 이어져요. 길게 써요.",
      "제목\n\n첫 문단이에요.\n\n이건 어떨까요?\n\n둘째 문단이 이어져요. 길게 써요.",
      "제목\n\n첫 문단이에요.\n문단 안의 짧은 줄\n둘째 줄이에요.",
      "제목\n\n첫 문단이에요.\n\n마지막 짧은 줄",
      "제목\n\n첫 문단이에요.\n\n짧은 줄 하나\n\n짧은 줄 둘\n\n문단이 이어져요. 길게 써요.",
      "제목\n\n첫 문단이에요.\n\n다음과 같이 정리했어요:\n\n문단이 이어져요. 길게 써요.",
      "제목\n\n첫 문단이에요.\n\n“정말 조용해요”\n\n문단이 이어져요. 길게 써요.",
    ];
    for (const c of cases) assert.equal(countBlocks(parsePastedDraft(c, { idGen: ids() }).blocks).headings, 0, c);
    // 사진·버튼 뒤에 와도 소제목 ("~봐야 해요" 처럼 마침표 없는 해요체도)
    const r = parsePastedDraft("제목\n\n첫 문단이에요.\n\n[사진]\n\n전기는 모드별로 봐야 해요\n\n문단이 이어져요. 길게 써요.", { idGen: ids() });
    assert.equal(first(r.blocks, "heading").text, "전기는 모드별로 봐야 해요");
    // 45자를 넘는 줄은 소제목이 아니다
    const long = parsePastedDraft(`제목\n\n첫 문단이에요.\n\n${"가".repeat(46)}\n\n문단이 이어져요.`, { idGen: ids() });
    assert.equal(countBlocks(long.blocks).headings, 0);
  });

  test("화살표 링크 줄 끝말 변형: 보기·확인·구매·가격", () => {
    for (const m of ["👉 풀라스 7L 현재 가격·옵션 보기", "☞ 상세 옵션 확인", "▶ 샘플 A100 구매", "👉 오늘 가격"]) {
      const r = parsePastedDraft(`제목\n\n본문이에요.\n\n${m}\n\n끝이에요.`, { idGen: ids() });
      assert.equal(countBlocks(r.blocks).links, 1, m);
      assert.equal(r.autoPlaced.links, false, m);
    }
    assert.equal(nameHintOf("👉 풀라스 7L 복합식 가습기 현재 가격·옵션 보기"), "풀라스 7L 복합식 가습기");
    // 화살표가 없으면 "…보기" 로 끝나도 문장/소제목 (구매 버튼으로 바꾸지 않음)
    const r = parsePastedDraft("제목\n\n본문이에요.\n\n옵션별로 한 번 더 보기\n\n문단이 이어져요. 길게 써요.", { idGen: ids() });
    assert.equal(r.autoPlaced.links, true);
  });

  test("편집기 '표로 바꾸기': 탭·| 줄, 칸마다 한 줄, 못 바꾸는 한 줄", () => {
    assert.deepEqual(tableFromText("모드 | 가습량\n일반 | 360mL\n가열 | 780mL"), { head: ["모드", "가습량"], rows: [["일반", "360mL"], ["가열", "780mL"]] });
    assert.deepEqual(tableFromText("모드\t가습량\n일반\t360mL"), { head: ["모드", "가습량"], rows: [["일반", "360mL"]] });
    assert.deepEqual(tableFromText(FULAS_CELLS.join("\n"))?.rows.length, 2);
    assert.equal(tableFromText(FULAS_FLAT_TABLE), null);
  });

  test("표 편집: 칸 고치기·행 추가/삭제·열 추가/삭제 (칸 수는 머리행과 같게)", () => {
    const t = { id: "t", type: "table" as const, head: ["a", "b"], rows: [["1", "2"], ["3", "4"]] };
    assert.deepEqual(setTableCell(t, -1, 1, "B").head, ["a", "B"]);
    assert.deepEqual(setTableCell(t, 1, 0, "X").rows, [["1", "2"], ["X", "4"]]);
    assert.deepEqual(removeTableRow(t, 0).rows, [["3", "4"]]);
    assert.deepEqual(addTableRow(t).rows[2], ["", ""]);
    const wide = addTableColumn(t);
    assert.deepEqual([wide.head, wide.rows[0]], [["a", "b", ""], ["1", "2", ""]]);
    const narrow = removeTableColumn(t, 0);
    assert.deepEqual([narrow.head, narrow.rows], [["b"], [["2"], ["4"]]]);
    assert.deepEqual(removeTableColumn({ ...t, head: ["a"], rows: [["1"]] }, 0).head, ["a"]);
    // 저장 전 정리: 행 칸 수를 머리행에 맞추고(넘치는 칸은 마지막 칸에 이어 붙임), 머리행이 없으면 버림
    const s = sanitizeManualInput({
      title: "t",
      description: "",
      content: { kind: "manual", blocks: [{ id: "t1", type: "table", head: ["a", "b"], rows: [["1"], ["2", "3", "4"]] }, { id: "t2", type: "table", head: [], rows: [] }] },
      products: [{ name: "", link: "" }],
    });
    assert.deepEqual(s?.content.blocks, [{ id: "t1", type: "table", head: ["a", "b"], rows: [["1", ""], ["2", "3 4"]] }]);
  });

  test("원문 다시 붙여넣기: 본문만 새로, 상품 링크·제목·올린 사진은 유지", () => {
    const saved = {
      title: "고친 제목",
      category: "",
      blocks: [
        { id: "p1", type: "paragraph" as const, text: "예전 문단" },
        { id: "i1", type: "image" as const, alt: "", src: "https://x/1.jpg" },
        { id: "l1", type: "link" as const, product: 0 },
      ],
      products: [{ name: "", link: "https://link.coupang.com/a/abc" }],
    };
    const r = reparseInto(saved, FULAS);
    assert.equal(r.draft.title, "고친 제목");
    assert.equal(r.draft.category, "");
    assert.equal(countBlocks(r.draft.blocks).headings, 7);
    assert.deepEqual(r.draft.products, [{ name: "풀라스 7L 복합식 가습기", link: "https://link.coupang.com/a/abc" }]);
    assert.equal(first(r.draft.blocks, "image").src, "https://x/1.jpg");
    assert.equal(r.lostPhotos, 0);
    assert.ok(r.warnings.some((w) => w.includes("표가 한 줄로")));
  });

  // ---- 블록 편집 ----
  test("끼워 넣기·삭제·위아래 이동", () => {
    let bs: ShopManualBlock[] = [makeBlock("paragraph", "p1"), makeBlock("paragraph", "p2")];
    bs = insertBlock(bs, 1, makeBlock("image", "i1"));
    assert.deepEqual(bs.map((b) => b.id), ["p1", "i1", "p2"]);
    bs = moveBlock(bs, "i1", -1);
    assert.deepEqual(bs.map((b) => b.id), ["i1", "p1", "p2"]);
    assert.equal(moveBlock(bs, "i1", -1), bs); // 맨 위에서 더 못 올라감
    bs = moveBlock(bs, "p2", 1);
    assert.deepEqual(bs.map((b) => b.id), ["i1", "p1", "p2"]);
    bs = removeBlock(bs, "p1");
    assert.deepEqual(bs.map((b) => b.id), ["i1", "p2"]);
    bs = insertBlock(bs, 99, makeBlock("link", "l1"));
    assert.equal(bs[bs.length - 1].id, "l1");
  });

  test("사진은 그 블록에만 들어간다 (위아래 같은 사진 재발 방지)", () => {
    const bs = [makeBlock("image", "a"), makeBlock("paragraph", "p"), makeBlock("image", "b")];
    const out = setBlockImage(bs, "b", "https://x/b.jpg");
    assert.equal((out[0] as { src?: string }).src, undefined);
    assert.equal((out[2] as { src?: string }).src, "https://x/b.jpg");
    const both = setBlockImage(out, "a", "https://x/a.jpg");
    assert.deepEqual(postImages({ content: { kind: "manual", blocks: both }, products: [] }), ["https://x/a.jpg", "https://x/b.jpg"]);
  });

  test("만든 블록 id 는 겹치지 않는다", () => {
    const n = 500;
    assert.equal(new Set(Array.from({ length: n }, () => makeBlock("image").id)).size, n);
  });

  test("상품 삭제: 그 상품의 구매 버튼은 첫 상품으로, 뒤 번호는 당김", () => {
    const products = [{ name: "A", link: "" }, { name: "B", link: "" }, { name: "C", link: "" }];
    const blocks: ShopManualBlock[] = [
      { id: "1", type: "link", product: 0 },
      { id: "2", type: "link", product: 1 },
      { id: "3", type: "link", product: 2 },
    ];
    const r = removeProduct(products, blocks, 1);
    assert.deepEqual(r.products.map((p) => p.name), ["A", "C"]);
    assert.deepEqual(r.blocks.map((b) => (b as { product: number }).product), [0, 0, 1]);
    assert.equal(removeProduct([products[0]], blocks, 0).products.length, 1); // 마지막 하나는 못 지움
  });

  // ---- 발행 검사 ----
  test("링크 빈 구매 버튼 자리가 있으면 발행 막음", () => {
    const r = parsePastedDraft(SAMPLE, { idGen: ids() });
    const problems = publishProblems({ title: r.title, blocks: r.blocks, products: r.products });
    assert.ok(problems.some((p) => p.includes("링크가 비었어요") && p.includes("3곳")), problems.join("\n"));
    const ok = publishProblems({ title: r.title, blocks: r.blocks, products: [{ name: "샘플 A100", link: "https://link.coupang.com/a/test" }] });
    assert.deepEqual(ok, []);
    const bad = publishProblems({ title: r.title, blocks: r.blocks, products: [{ name: "샘플 A100", link: "https://www.coupang.com/vp/products/1" }] });
    assert.ok(bad.some((p) => p.includes("형식이 아니에요")));
    assert.ok(publishProblems({ title: "", blocks: r.blocks, products: [{ name: "x", link: "https://link.coupang.com/a/t" }] }).some((p) => p.includes("제목")));
  });

  test("검색 설명 자동: 본문 앞부분, 150자 안, 문장 끝에서 자름", () => {
    const r = parsePastedDraft(SAMPLE, { idGen: ids() });
    const d = autoDescription(r.blocks);
    assert.ok(d.length <= 150 && d.length >= 60, String(d.length));
    assert.ok(d.startsWith("혼자 사는 원룸에서"));
    assert.ok(/[요다]\.$|…$/.test(d), d);
  });

  test("글 종류 구분: 직접 쓴 글 / AI 글", () => {
    assert.equal(isManualContent({ kind: "manual", blocks: [] }), true);
    assert.equal(isManualContent({ summary: "x" }), false);
    const post = { description: "", content: { kind: "manual", blocks: [{ id: "p", type: "paragraph", text: "본문이에요." }] } } as unknown as ShopPost;
    assert.equal(isManualPost(post), true);
    assert.equal(postDescription(post), "본문이에요.");
  });

  test("저장 전 정리: 겹친 블록 id 는 새로(사진이 두 자리에 들어가지 않게), 없는 상품 번호는 첫 상품으로, 모르는 블록은 버림", () => {
    const r = sanitizeManualInput({
      title: " 제목 ",
      description: "",
      content: {
        kind: "manual",
        blocks: [
          { id: "a1", type: "image", alt: "", src: "https://x/1.jpg" },
          { id: "a1", type: "image", alt: "" },
          { id: "l1", type: "link", product: 7 },
          { id: "z", type: "script", text: "<b>" },
          { id: "BAD ID!", type: "paragraph", text: "본문" },
        ],
      },
      products: [{ name: "A", link: "https://link.coupang.com/a/t", extra: 1 }],
    });
    assert.ok(r);
    assert.equal(r.title, "제목");
    assert.deepEqual(types(r.content.blocks), ["image", "image", "link", "paragraph"]);
    assert.notEqual(r.content.blocks[0].id, r.content.blocks[1].id);
    assert.equal((r.content.blocks[1] as { src?: string }).src, undefined);
    assert.equal((r.content.blocks[2] as { product: number }).product, 0);
    assert.match(r.content.blocks[3].id, /^[a-z0-9]+$/);
    assert.deepEqual(r.products, [{ name: "A", link: "https://link.coupang.com/a/t" }]);
    assert.equal(sanitizeManualInput({ content: { summary: "AI 글" }, products: [] }), null);
  });

  console.log(`\n${passed}개 통과`);
}

main();
