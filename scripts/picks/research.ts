// 근거 자료 모으기: 공식 사이트 글자 + 네이버 블로그·뉴스에서 이 서비스를 직접 언급한 글.
// 글은 이 근거 안에서만 쓰고, 검수도 이 근거와 대조한다.

import { cleanNaverText, naverSearch } from "../shop/providers/naver";
import type { Secrets } from "../shop/providers/types";
import { fetchOfficial, type OfficialPage } from "./web";

export type ServiceEvidence = {
  name: string;
  url: string;
  official: OfficialPage;
  mentions: string[]; // 네이버 블로그·뉴스 중 이름이 들어간 글 (제목 — 요약)
};

const mentionsName = (text: string, name: string) => text.replace(/\s/g, "").includes(name.replace(/\s/g, ""));

export async function naverMentions(secrets: Secrets, query: string, name: string): Promise<string[]> {
  const out: string[] = [];
  for (const [type, n] of [["blog", 30], ["news", 15]] as const) {
    try {
      for (const it of await naverSearch(secrets, type, query, n)) {
        const line = `${cleanNaverText(it.title)} — ${cleanNaverText(it.description)}`;
        if (mentionsName(line, name)) out.push(line);
      }
    } catch (e) {
      console.warn(`  ⚠ 네이버 ${type} 검색 실패: ${e instanceof Error ? e.message.slice(0, 100) : e}`);
    }
  }
  return [...new Set(out)];
}

export async function researchService(secrets: Secrets, name: string, url: string): Promise<ServiceEvidence> {
  const [official, mentions] = await Promise.all([fetchOfficial(url), naverMentions(secrets, name, name)]);
  return { name, url, official, mentions };
}

export function evidenceText(e: ServiceEvidence): string {
  const o = e.official;
  return [
    `### ${e.name} (${e.url})`,
    o.ok ? `[공식 사이트] 제목: ${o.title}\n설명: ${o.description}\n본문: ${o.text}` : "[공식 사이트] 내용을 가져오지 못함",
    `[네이버 블로그·뉴스 언급 ${e.mentions.length}건]`,
    ...e.mentions.slice(0, 40).map((m) => `- ${m}`),
  ].join("\n");
}
