import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!secretKey || !sessionId) {
    return NextResponse.json({ paid: false }, { status: 400 });
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return NextResponse.json({ paid: session.payment_status === "paid" });
  } catch (error) {
    console.error("Stripe session verification failed", error);
    return NextResponse.json({ paid: false }, { status: 500 });
  }
}
