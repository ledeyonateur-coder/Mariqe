import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { products } from "@/data/products";
import { getSoldQuantity } from "@/lib/stockStore";
import { reserveForCheckout, releaseReservation } from "@/lib/checkoutLock";
import { getStripeServer } from "@/lib/stripeServer";

// Give the Stripe SDK's own retries room to run within Vercel's function
// timeout instead of the platform killing the request mid-retry.
export const maxDuration = 30;

type CheckoutRequestBody = {
  lines: { productId: string; quantity: number }[];
  customer: {
    name: string;
    email: string;
    phone?: string;
    address: { line1: string; city: string; postalCode: string; country: string };
  };
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
  const address = body.customer.address;
  if (!address?.line1 || !address?.city || !address?.postalCode || !address?.country) {
    return NextResponse.json({ error: "Adresse de livraison incomplète." }, { status: 400 });
  }

  // Prices always come from the server-side catalog, never trust client-submitted amounts.
  let amount = 0;
  const normalizedLines: { productId: string; quantity: number }[] = [];
  for (const line of body.lines) {
    const product = products.find((p) => p.id === line.productId);
    const quantity = Math.max(1, Math.min(20, Math.floor(line.quantity)));
    if (!product || !Number.isFinite(quantity)) {
      return NextResponse.json({ error: "Article invalide dans le panier." }, { status: 400 });
    }
    const soldQty = await getSoldQuantity(product.id);
    const availableStock = Math.max(0, product.stock - soldQty);
    if (availableStock < quantity) {
      return NextResponse.json(
        { error: `"${product.name}" est épuisée — retire-la de ton panier.` },
        { status: 409 }
      );
    }
    normalizedLines.push({ productId: product.id, quantity });
    amount += Math.round(product.price * 100) * quantity;
  }

  // Reserve every unique piece for the duration of the payment so a second
  // buyer can't start paying for the same item in the meantime. If any one
  // of them is already reserved, roll back and reject the whole cart.
  const productIds = normalizedLines.map((line) => line.productId);
  const reserved: string[] = [];
  for (const productId of productIds) {
    if (!reserveForCheckout(productId)) {
      reserved.forEach(releaseReservation);
      const product = products.find((p) => p.id === productId);
      return NextResponse.json(
        {
          error: `"${product?.name ?? productId}" vient d'être réservée par quelqu'un d'autre — réessaie dans quelques minutes.`,
        },
        { status: 409 }
      );
    }
    reserved.push(productId);
  }

  const stripe = getStripeServer(secretKey);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      receipt_email: body.customer.email,
      shipping: {
        name: body.customer.name,
        phone: body.customer.phone,
        address: {
          line1: address.line1,
          city: address.city,
          postal_code: address.postalCode,
          country: address.country,
        },
      },
      metadata: {
        customer_name: body.customer.name,
        customer_phone: body.customer.phone ?? "",
        lines: normalizedLines.map((line) => `${line.productId}:${line.quantity}`).join(","),
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    reserved.forEach(releaseReservation);
    console.error("Stripe PaymentIntent creation failed", error);
    // Stripe's own error messages are written to be safe to show end users
    // (e.g. "Invalid API Key provided" surfaces a key mix-up immediately
    // instead of a dead-end generic message) — anything else stays generic.
    const detail = error instanceof Stripe.errors.StripeError ? error.message : null;
    return NextResponse.json(
      { error: detail ? `Impossible de créer le paiement : ${detail}` : "Impossible de créer le paiement." },
      { status: 500 }
    );
  }
}
