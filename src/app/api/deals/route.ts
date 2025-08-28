import { NextResponse } from "next/server";
import { fetchDeals } from "@/lib/adapters";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const data = await fetchDeals(from, to);
  return NextResponse.json({ data, updatedAt: Date.now() });
}


