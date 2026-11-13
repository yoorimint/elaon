// 운영 정리용: 쇼핑 글 목록 확인과 지정한 글 삭제.
// .github/shop-maintain-request 파일 내용으로 동작 (shop-maintain.yml 이 작업 브랜치 push 때 실행)
//   list                      → 모든 글(초안 포함)을 검수 결과와 함께 출력 (읽기만)
//   delete: slug1, slug2 …    → 적힌 slug 만 삭제 (적지 않은 글은 절대 건드리지 않음)
//   restore-photos: all       → 사진 보관함에 올라가 있는데 글 데이터에서 빠진 사진을 다시 연결
//                               (이미 사진이 있는 자리는 건드리지 않음)
//   check                     → 저장된 글을 지금의 코드 검사(규칙 검사)로 다시 검사해 문제를 출력 (비용 없음, 읽기만)
// 한 파일에 list 와 delete 를 같이 적으면 삭제 후 목록을 다시 출력한다.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ownPhoto, withPhoto, type PhotoSpot, type ShopPostContent, type ShopPostInputProduct } from "@/lib/shop-post-types";
import { lintPost } from "./qa";

const REQUEST_FILE = ".github/shop-maintain-request";

type Row = {
  id: string;
  slug: string;
  title: string;
  status: string;
  created_at: string;
  content: { qa?: { passed?: boolean; remaining?: string[]; aiChecked?: boolean } } | null;
  products: { link?: string; image?: string; images?: Record<string, string> }[] | null;
};

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  return createClient(url, key, { auth: { persistSession: false } });
}
const sb = client();

function parseRequest(text: string): { list: boolean; deletes: string[]; restore: boolean; check: boolean } {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const deletes = lines
    .filter((l) => l.startsWith("delete:"))
    .flatMap((l) => l.slice("delete:".length).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return { list: lines.includes("list"), deletes, restore: lines.includes("restore-photos: all"), check: lines.includes("check") };
}

async function listPosts(): Promise<void> {
  const { data, error } = await sb
    .from("shop_posts")
    .select("id,slug,title,status,created_at,content,products")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`목록 읽기 실패: ${error.message}`);
  const rows = (data ?? []) as Row[];
  console.log(`📋 쇼핑 글 ${rows.length}개 (최신순)`);
  for (const r of rows) {
    const qa = r.content?.qa;
    const verdict = qa?.passed === true ? "합격" : qa?.passed === false ? "미달" : qa ? "판정없음" : "검수없음";
    const left = qa?.remaining?.length ?? "-";
    const links = (r.products ?? []).every((p) => p.link?.trim()) ? "링크있음" : "링크없음";
    // 사진: 글 데이터에 저장된 사진 수 / 사진 보관함에 올라간 파일 수 (다르면 저장이 안 된 것)
    const saved = (r.products ?? []).reduce(
      (n, p) => n + (p.image ? 1 : 0) + Object.keys(p.images ?? {}).length,
      0,
    );
    const files = await sb.storage.from("shop-images").list(r.id);
    const uploaded = files.error ? "?" : (files.data ?? []).length;
    console.log(
      `- ${r.slug} | ${r.status} | ${r.created_at.slice(0, 16)} | ${verdict} 남은문제 ${left} | ${links} | 사진 저장 ${saved}·파일 ${uploaded} | ${r.title}`,
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

// 사진 파일 이름: "{상품 번호}-{자리}-{시각}.jpg" (예전 형식 "{상품 번호}-{시각}.jpg" 는 대표 사진)
const SPOTS: PhotoSpot[] = ["main", "feature", "table", "thumb", "detail", "bottom"];
function parsePhotoFile(name: string): { index: number; spot: PhotoSpot; time: number } | null {
  const m = /^(\d+)-(?:([a-z]+)-)?(\d+)\.jpg$/.exec(name);
  if (!m) return null;
  const spot = (m[2] ?? "main") as PhotoSpot;
  if (!SPOTS.includes(spot)) return null;
  return { index: Number(m[1]), spot, time: Number(m[3]) };
}

async function restorePhotos(): Promise<void> {
  const { data, error } = await sb.from("shop_posts").select("id,slug,title,products");
  if (error) throw new Error(`목록 읽기 실패: ${error.message}`);
  for (const r of (data ?? []) as { id: string; slug: string; title: string; products: ShopPostInputProduct[] }[]) {
    const files = await sb.storage.from("shop-images").list(r.id);
    if (files.error || !files.data?.length) continue;
    // 자리마다 가장 최근에 올린 파일
    const latest = new Map<string, { index: number; spot: PhotoSpot; time: number; name: string }>();
    for (const f of files.data) {
      const p = parsePhotoFile(f.name);
      if (!p || p.index >= r.products.length) continue;
      const key = `${p.index}:${p.spot}`;
      if ((latest.get(key)?.time ?? -1) < p.time) latest.set(key, { ...p, name: f.name });
    }
    let products = r.products;
    const restored: string[] = [];
    for (const f of latest.values()) {
      if (ownPhoto(products[f.index], f.spot)) continue; // 이미 있는 사진은 그대로
      const url = sb.storage.from("shop-images").getPublicUrl(`${r.id}/${f.name}`).data.publicUrl;
      products = products.map((p, i) => (i === f.index ? withPhoto(p, f.spot, url) : p));
      restored.push(`${f.index + 1}번 상품 ${f.spot}`);
    }
    if (!restored.length) continue;
    const up = await sb.from("shop_posts").update({ products, updated_at: new Date().toISOString() }).eq("id", r.id).select("id");
    if (up.error || !up.data?.length) console.error(`❌ ${r.slug}: 사진 복구 저장 실패 ${up.error?.message ?? ""}`);
    else console.log(`🖼 사진 복구: ${r.slug} (${restored.join(", ")}) ${r.title}`);
  }
}

// 저장된 글을 지금 규칙 검사로 다시 검사 (예전 규칙으로 만든 초안을 발행해도 되는지 판단용)
async function checkPosts(): Promise<void> {
  const { data, error } = await sb
    .from("shop_posts")
    .select("slug,title,description,status,content,products")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`목록 읽기 실패: ${error.message}`);
  const rows = (data ?? []) as { slug: string; title: string; description: string; status: string; content: ShopPostContent; products: unknown[] }[];
  console.log(`🔎 지금 규칙으로 다시 검사 (${rows.length}개)`);
  for (const r of rows) {
    const issues = lintPost({ title: r.title, description: r.description, content: r.content }, r.products.length);
    console.log(`- ${r.slug} | ${r.status} | 문제 ${issues.length}개 | ${r.title}`);
    for (const x of issues) console.log(`    · ${x.slice(0, 150)}`);
  }
}

async function main() {
  const req = parseRequest(readFileSync(REQUEST_FILE, "utf8"));
  if (req.check) await checkPosts();
  if (req.restore) await restorePhotos();
  if (req.deletes.length) await deletePosts(req.deletes);
  if (req.list || !req.deletes.length) await listPosts();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
