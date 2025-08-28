import { NextResponse } from "next/server";
import { fetchEarningsCalendar, fetchEpsSurprises } from "@/lib/adapters";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");
  const from = url.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  if (symbol) {
    const eps = await fetchEpsSurprises(symbol);
    return NextResponse.json({ data: eps, updatedAt: Date.now() });
  }
  const cal = await fetchEarningsCalendar(from, to);
  return NextResponse.json({ data: cal, updatedAt: Date.now() });
}


