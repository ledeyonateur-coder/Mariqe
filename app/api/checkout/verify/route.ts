import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const paymentIntentId = request.nextUrl.searchParams.get("payment_intent");

  if (!secretKey || !paymentIntentId) {
    return NextResponse.json({ paid: false }, { status: 400 });
  }

  try {
    const stripe = new Stripe(secretKey);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return NextResponse.json({ paid: paymentIntent.status === "succeeded" });
  } catch (error) {
    console.error("Stripe PaymentIntent verification failed", error);
    return NextResponse.json({ paid: false }, { status: 500 });
  }
}
