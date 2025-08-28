import { NextResponse } from "next/server";
import { fetchForm4Latest } from "@/lib/adapters";

export async function GET() {
  const data = await fetchForm4Latest();
  return NextResponse.json({ data, updatedAt: Date.now() });
}


