// 기계적으로 고칠 수 있는 문제는 AI 수정에 맡기지 않고 코드로 바로 고친다.
// (run #36: "자료에는" 한 단어가 AI 수정 2번을 거치고도 남아 그대로 저장됨)
// - 표현 치환: 독자가 모르는 "자료", 수집 경로("웹문서 기재"), 어색한 어미
// - 비교표에서 모든 제품이 "확인 안 됨"인 행, "모델명"처럼 비교 의미가 없는 행 삭제 (run #39)
// 뜻이 바뀔 수 있는 치환(조사가 달라지는 "자료를/자료가" 등)은 하지 않고 검사에서 지적만 한다.

import type { WrittenPost } from "./writer";

export const isUnknownValue = (v: string) => /확인\s*안\s*됨|확인되지 않|확인 필요/.test(v);
// 제품 이름·모델 번호 행은 비교가 아니라 이름 반복 (제목·카드에 이미 있음)
const isNameRow = (label: string) => /^(모델명|모델|제품명|품명|상품명|모델 번호)$/.test(label.trim());

const REPLACEMENTS: [RegExp, string][] = [
  [/\s*\(\s*웹\s?문서[^)]*\)/g, ""], // "5년(웹문서 기재)" → "5년"
  [/웹\s?문서\s*기준/g, "판매처 표기 기준"],
  [/자료에\s*따르면/g, "알려진 내용에 따르면"],
  [/자료만으로는/g, "알려진 내용만으로는"],
  [/자료에서는/g, "소개된 내용에서는"],
  [/자료에서/g, "소개된 내용에서"],
  [/자료에는/g, "소개된 내용에는"],
  [/자료에도/g, "소개된 내용에도"],
  [/자료\s*(없음|부족|미확인)/g, "확인 안 됨"],
  [/않음이에요|않음입니다/g, "않아요"],
];

function fixText(s: string): string {
  return REPLACEMENTS.reduce((t, [re, to]) => t.replace(re, to), s);
}

// 글의 모든 문자열에 치환을 적용 (원본은 건드리지 않고 새 객체)
function mapStrings<T>(v: T): T {
  if (typeof v === "string") return fixText(v) as T;
  if (Array.isArray(v)) return v.map(mapStrings) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x)])) as T;
  }
  return v;
}

export function autoFix(w: WrittenPost): { post: WrittenPost; fixes: string[] } {
  const fixes: string[] = [];
  const post = mapStrings(w);
  if (JSON.stringify(post) !== JSON.stringify(w)) fixes.push("표현 치환(자료·웹문서·어색한 어미)");

  const rows = post.content.comparison;
  const kept = rows.filter((r) => !(r.values.length && r.values.every(isUnknownValue)) && !isNameRow(r.label));
  if (kept.length !== rows.length) {
    fixes.push(`비교표에서 모두 '확인 안 됨'인 행·모델명 행 ${rows.length - kept.length}개 삭제`);
    post.content.comparison = kept;
  }
  return { post, fixes };
}
