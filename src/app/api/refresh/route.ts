import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
  // Placeholder: server action would populate caches. For now, noop and revalidate.
  revalidatePath("/");
  return NextResponse.json({ ok: true, updatedAt: Date.now() });
}

export async function POST() {
  // Placeholder: server action would populate caches. For now, noop and revalidate.
  revalidatePath("/");
  return NextResponse.json({ ok: true, updatedAt: Date.now() });
}


