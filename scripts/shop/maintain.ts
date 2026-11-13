// 운영 정리용: 쇼핑 글 목록 확인과 지정한 글 삭제.
// .github/shop-maintain-request 파일 내용으로 동작 (shop-maintain.yml 이 작업 브랜치 push 때 실행)
//   list                      → 모든 글(초안 포함)을 검수 결과와 함께 출력 (읽기만)
//   delete: slug1, slug2 …    → 적힌 slug 만 삭제 (적지 않은 글은 절대 건드리지 않음)
// 한 파일에 list 와 delete 를 같이 적으면 삭제 후 목록을 다시 출력한다.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const REQUEST_FILE = ".github/shop-maintain-request";

type Row = {
  slug: string;
  title: string;
  status: string;
  created_at: string;
  content: { qa?: { passed?: boolean; remaining?: string[]; aiChecked?: boolean } } | null;
  products: { link?: string }[] | null;
};

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  return createClient(url, key, { auth: { persistSession: false } });
}
const sb = client();

function parseRequest(text: string): { list: boolean; deletes: string[] } {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const deletes = lines
    .filter((l) => l.startsWith("delete:"))
    .flatMap((l) => l.slice("delete:".length).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return { list: lines.includes("list"), deletes };
}

async function listPosts(): Promise<void> {
  const { data, error } = await sb
    .from("shop_posts")
    .select("slug,title,status,created_at,content,products")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`목록 읽기 실패: ${error.message}`);
  const rows = (data ?? []) as Row[];
  console.log(`📋 쇼핑 글 ${rows.length}개 (최신순)`);
  for (const r of rows) {
    const qa = r.content?.qa;
    const verdict = qa?.passed === true ? "합격" : qa?.passed === false ? "미달" : qa ? "판정없음" : "검수없음";
    const left = qa?.remaining?.length ?? "-";
    const links = (r.products ?? []).every((p) => p.link?.trim()) ? "링크있음" : "링크없음";
    console.log(
      `- ${r.slug} | ${r.status} | ${r.created_at.slice(0, 16)} | ${verdict} 남은문제 ${left} | ${links} | ${r.title}`,
    );
    for (const x of (qa?.remaining ?? []).slice(0, 3)) console.log(`    · ${x.slice(0, 140)}`);
  }
}

async function deletePosts(slugs: string[]): Promise<void> {
  for (const slug of slugs) {
    const { data, error } = await sb.from("shop_posts").delete().eq("slug", slug).select("slug,title,status");
    if (error) console.error(`❌ ${slug}: 삭제 실패 — ${error.message}`);
    else if (!data?.length) console.warn(`⚠ ${slug}: 그런 글 없음`);
    else console.log(`🗑 삭제: ${slug} (${data[0].status}) ${data[0].title}`);
  }
}

async function main() {
  const req = parseRequest(readFileSync(REQUEST_FILE, "utf8"));
  if (req.deletes.length) await deletePosts(req.deletes);
  if (req.list || !req.deletes.length) await listPosts();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
