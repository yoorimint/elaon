// 상품명 관련 공통 판정 (상품 선정·검수가 같은 기준을 쓴다)

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 글에서 상품명이 나온 곳을 찾아, 이름 바로 뒤에 세대 숫자가 붙었는지 본다.
// - exact: 이름이 그대로 나온 곳이 있음  ("JBL TUNE BEAM 후기")
// - other: 이름 바로 뒤에 숫자가 붙은 다른 세대가 나옴 ("JBL TUNE BEAM 2", "TUNE BEAM2")
// 상품명이 숫자가 든 단어로 끝나면(메가 3L, 포켓쉴 20000) 뒤 숫자는 세대가 아니라서 검사하지 않는다.
// 쉼표 등이 끼면 세대가 아니다 ("메가 3L, 2단계"). (run #31: 공백·문장부호를 지우고 비교해 오탐)
export function generationMentions(name: string, text: string): { exact: boolean; other: boolean } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { exact: false, other: false };
  const re = new RegExp(`${words.map(escapeRe).join("\\s*")}(\\s?\\d)?`, "gi");
  let exact = false;
  let other = false;
  for (const m of text.matchAll(re)) {
    if (m[1]) other = true;
    else exact = true;
  }
  if (/\d/.test(words[words.length - 1])) return { exact: exact || other, other: false };
  return { exact, other };
}
