// IndexNow: 새 글 주소를 검색엔진에 즉시 알린다 (무료).
// 지원: 네이버(2023-07~), Bing, Yandex 등. 구글은 미지원(구글은 sitemap 으로 수집).
// 키 확인 파일: public/{INDEXNOW_KEY}.txt (내용 = 키). 키는 공개돼도 되는 값.

export const INDEXNOW_KEY = "4355a6536dc6aa94cc8f8bfb3433f65c";
const HOST = "www.eloan.kr";
const ENDPOINTS = ["https://searchadvisor.naver.com/indexnow", "https://api.indexnow.org/IndexNow"];

export type IndexNowResult = { endpoint: string; status: number | string };

export async function pingIndexNow(paths: string[]): Promise<IndexNowResult[]> {
  const urlList = paths.map((p) => `https://${HOST}${p}`);
  const body = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
    urlList,
  });
  return Promise.all(
    ENDPOINTS.map(async (endpoint) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          body,
        });
        return { endpoint, status: res.status };
      } catch (e) {
        return { endpoint, status: e instanceof Error ? e.message : "error" };
      }
    }),
  );
}
