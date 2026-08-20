import { NextResponse } from "next/server";
import { getSoldQuantities } from "@/lib/stockStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const sold = await getSoldQuantities();
  return NextResponse.json({ sold });
}
