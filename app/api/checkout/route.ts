import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { products } from "@/data/products";

const ALLOWED_SHIPPING_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection["allowed_countries"] =
  ["FR", "BE", "CH", "LU", "MC", "DE", "ES", "IT", "GB"];

type CheckoutRequestBody = {
  lines: { productId: string; quantity: number }[];
  customer: { name: string; email: string; phone?: string };
};

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      {
        error:
          "Le paiement n'est pas encore configuré : la variable d'environnement STRIPE_SECRET_KEY est manquante.",
      },
      { status: 500 }
    );
  }

  let body: CheckoutRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!body.lines?.length) {
    return NextResponse.json({ error: "Le panier est vide." }, { status: 400 });
  }
  if (!body.customer?.email || !body.customer?.name) {
    return NextResponse.json({ error: "Nom et email requis." }, { status: 400 });
  }

  // Prices always come from the server-side catalog, never trust client-submitted amounts.
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const line of body.lines) {
    const product = products.find((p) => p.id === line.productId);
    const quantity = Math.max(1, Math.min(20, Math.floor(line.quantity)));
    if (!product || !Number.isFinite(quantity)) {
      return NextResponse.json({ error: "Article invalide dans le panier." }, { status: 400 });
    }
    lineItems.push({
      quantity,
      price_data: {
        currency: "eur",
        unit_amount: Math.round(product.price * 100),
        product_data: {
          name: product.name,
          images: [new URL(product.image, request.nextUrl.origin).toString()],
        },
      },
    });
  }

  const stripe = new Stripe(secretKey);
  const origin = request.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: body.customer.email,
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ALLOWED_SHIPPING_COUNTRIES },
      metadata: {
        customer_name: body.customer.name,
        customer_phone: body.customer.phone ?? "",
      },
      success_url: `${origin}/commande/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/commande?cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed", error);
    return NextResponse.json({ error: "Impossible de créer la session de paiement." }, { status: 500 });
  }
}
