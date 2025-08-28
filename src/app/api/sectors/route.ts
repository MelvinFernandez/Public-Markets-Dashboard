import { NextResponse } from "next/server";
import { fetchSectorPrices } from "@/lib/adapters";

const SECTORS = ["XLK", "XLF", "XLY", "XLE", "XLV", "XLI", "XLU", "XLB", "XLRE", "XLC"];

export async function GET() {
  const data = await fetchSectorPrices(SECTORS);
  return NextResponse.json({ data, updatedAt: Date.now() });
}


