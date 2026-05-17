import { NextResponse } from "next/server";
import { resolveStock } from "@/lib/stock-resolver";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ symbol: null });
  }
  const entry = await resolveStock(q);
  if (!entry) return NextResponse.json({ symbol: null });
  const symbol = entry.id.replace(/^yahoo:/, "");
  return NextResponse.json({
    symbol,
    name: entry.name,
    subtitle: entry.subtitle,
  });
}
