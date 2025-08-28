import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/adapters";

export async function GET() {
  const data = await fetchNews();
  return NextResponse.json({ data, updatedAt: Date.now() });
}


