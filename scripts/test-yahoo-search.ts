// Hit Yahoo search directly to confirm the endpoint + parsing.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function search(q: string) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0&enableFuzzyQuery=false&lang=en-US&region=US`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  console.log(`\n=== "${q}" (HTTP ${res.status}) ===`);
  if (!res.ok) return;
  const json: any = await res.json();
  for (const r of json.quotes ?? []) {
    console.log(
      `  ${String(r.symbol).padEnd(14)} ${String(r.quoteType ?? "").padEnd(7)} ${String(r.exchDisp ?? "").padEnd(10)}  ${r.longname ?? r.shortname ?? ""}`,
    );
  }
}

async function main() {
  for (const q of [
    "samsung",
    "삼성",
    "카카오",
    "005930",
    "apple",
    "tesla",
    "QQQ",
    "현대차",
    "하이브",
    "KODEX 200",
  ]) {
    await search(q);
  }
}

main().catch(console.error);
