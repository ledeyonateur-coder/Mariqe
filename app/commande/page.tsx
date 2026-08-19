"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  const { lines, totalPrice } = useCart();
  const searchParams = useSearchParams();
  const wasCancelled = searchParams.get("cancelled") === "1";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
          customer: { name, email, phone },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        setError(data.error ?? "Une erreur est survenue.");
        setIsSubmitting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Impossible de contacter le serveur de paiement.");
      setIsSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div
        className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-cream-khaki px-6 text-center"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <p className="font-body text-sm text-ink/70">Ton panier est vide.</p>
        <Link
          href="/#collection"
          className="font-body text-sm underline decoration-dashed underline-offset-4 text-ink"
        >
          ← Voir la collection
        </Link>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col gap-6 bg-cream-khaki px-6 pb-16"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 4.5rem)" }}
    >
      <Link href="/#collection" className="font-body text-sm text-ink/60 underline decoration-dashed underline-offset-4">
        ← Continuer mes achats
      </Link>

      <h1 className="font-display text-2xl text-ink">Commande</h1>

      {wasCancelled && (
        <p className="stitched-border bg-dusty-pink/40 px-3 py-2 font-body text-sm text-ink">
          Paiement annulé — tu peux réessayer quand tu veux.
        </p>
      )}

      <ul className="flex flex-col gap-3 border-b border-dashed border-ink/20 pb-4">
        {lines.map((line) => (
          <li key={line.productId} className="flex items-center justify-between font-body text-sm text-ink">
            <span>
              {line.product.name} × {line.quantity}
            </span>
            <span>{(line.product.price * line.quantity).toFixed(0)} €</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between font-display text-lg text-ink">
        <span>Total</span>
        <span>{totalPrice.toFixed(0)} €</span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="font-body text-xs text-ink/60">
          L&apos;adresse de livraison et le paiement se font ensuite sur la page sécurisée Stripe.
        </p>

        <label className="flex flex-col gap-1 font-body text-sm text-ink">
          Nom complet
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="stitched-border bg-paper px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1 font-body text-sm text-ink">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="stitched-border bg-paper px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1 font-body text-sm text-ink">
          Téléphone (optionnel)
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="stitched-border bg-paper px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        {error && <p className="font-body text-sm text-pop-red">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="stitched-border mt-2 flex items-center justify-center bg-ink px-4 py-4 font-display text-sm text-paper transition-transform duration-300 ease-signature active:scale-95 disabled:opacity-60"
        >
          {isSubmitting ? "Redirection..." : "Payer en toute sécurité"}
        </button>
      </form>
    </div>
  );
}
