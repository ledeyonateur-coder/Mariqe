import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markSoldOut } from "@/lib/soldOutStore";

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    console.error("Stripe webhook reçu mais STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET manquant.");
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Signature de webhook Stripe invalide", error);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const productIds = session.metadata?.product_ids?.split(",").filter(Boolean) ?? [];
    await Promise.all(productIds.map((id) => markSoldOut(id)));
  }

  return NextResponse.json({ received: true });
}
