import { NextResponse } from "next/server";
import { getSoldOutIds } from "@/lib/soldOutStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const ids = await getSoldOutIds();
  return NextResponse.json({ ids });
}
