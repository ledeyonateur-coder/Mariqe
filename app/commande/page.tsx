"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import { isSoldOut } from "@/data/products";
import { useCart } from "@/lib/cart";
import { getStripe } from "@/lib/stripeClient";
import { useAmbientColor } from "@/lib/useAmbientColor";
import { useAddressSuggestions } from "@/lib/useAddressSuggestions";

// Matches the site's own inputs (dashed border, paper background, Inter body
// font) as closely as Stripe's Appearance API allows — the card fields
// themselves stay inside Stripe's PCI-compliant iframe, this just themes them.
const STRIPE_APPEARANCE: Appearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#17140F",
    colorBackground: "#F6F2E9",
    colorText: "#17140F",
    colorDanger: "#D8432E",
    fontFamily: "var(--font-body), Inter, system-ui, sans-serif",
    fontSizeBase: "0.875rem",
    borderRadius: "6px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1.5px dashed rgba(23, 20, 15, 0.35)",
      boxShadow: "none",
      padding: "10px 12px",
    },
    ".Input:focus": {
      border: "1.5px solid #17140F",
      boxShadow: "none",
    },
    ".Label": {
      fontSize: "0.875rem",
      color: "rgba(23, 20, 15, 0.85)",
    },
  },
};

const ALLOWED_COUNTRIES: { code: string; label: string }[] = [
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "CH", label: "Suisse" },
  { code: "LU", label: "Luxembourg" },
  { code: "MC", label: "Monaco" },
  { code: "DE", label: "Allemagne" },
  { code: "ES", label: "Espagne" },
  { code: "IT", label: "Italie" },
  { code: "GB", label: "Royaume-Uni" },
];

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  useAmbientColor("#E7DEC4");
  const { lines, totalPrice, removeItem } = useCart();
  const hasSoldOutLine = lines.some((line) => isSoldOut(line.product));
  const searchParams = useSearchParams();
  const wasCancelled = searchParams.get("cancelled") === "1";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("FR");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [addressVerified, setAddressVerified] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressSuggestions = useAddressSuggestions(addressLine1, country === "FR" && !addressVerified);

  function handleSelectSuggestion(suggestion: { street: string; city: string; postalCode: string }) {
    setAddressLine1(suggestion.street);
    setCity(suggestion.city);
    setPostalCode(suggestion.postalCode);
    setAddressVerified(true);
    setShowSuggestions(false);
  }

  async function handleInfoSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
          customer: { name, email, phone, address: { line1: addressLine1, city, postalCode, country } },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.clientSecret) {
        setError(data.error ?? "Une erreur est survenue.");
        setIsSubmitting(false);
        return;
      }
      setClientSecret(data.clientSecret);
      setIsSubmitting(false);
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
          <li key={line.productId} className="flex items-center gap-3 font-body text-sm text-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={line.product.image}
              alt={line.product.name}
              className={`stitched-border h-14 w-14 flex-shrink-0 rounded-lg object-cover ${
                isSoldOut(line.product) ? "grayscale" : ""
              }`}
            />
            {isSoldOut(line.product) ? (
              <>
                <span className="flex-1 font-wordmark text-pop-red">
                  {line.product.name} — épuisée
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(line.productId)}
                  className="font-body text-xs underline decoration-dashed underline-offset-4 text-ink/60"
                >
                  Retirer
                </button>
              </>
            ) : (
              <>
                <span className="flex-1">
                  {line.product.name} × {line.quantity}
                </span>
                <span>{(line.product.price * line.quantity).toFixed(0)} €</span>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between font-display text-lg text-ink">
        <span>Total</span>
        <span>{totalPrice.toFixed(0)} €</span>
      </div>

      {!clientSecret ? (
        <form onSubmit={handleInfoSubmit} className="flex flex-col gap-4">
          <p className="font-body text-xs text-ink/60">Tes coordonnées, puis le paiement juste en dessous.</p>

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

          <label className="relative flex flex-col gap-1 font-body text-sm text-ink">
            Adresse
            <input
              required
              type="text"
              autoComplete="off"
              value={addressLine1}
              onChange={(e) => {
                setAddressLine1(e.target.value);
                setAddressVerified(false);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="stitched-border bg-paper px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink"
            />
            {addressVerified && (
              <span className="mt-1 flex items-center gap-1 font-body text-xs text-pop-green">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Adresse vérifiée
              </span>
            )}
            {showSuggestions && addressSuggestions.length > 0 && (
              <ul className="stitched-border absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto bg-paper shadow-lg">
                {addressSuggestions.map((suggestion) => (
                  <li key={suggestion.label}>
                    <button
                      type="button"
                      onMouseDown={() => handleSelectSuggestion(suggestion)}
                      className="w-full px-3 py-2 text-left font-body text-sm text-ink hover:bg-cream-khaki"
                    >
                      {suggestion.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 font-body text-sm text-ink">
              Ville
              <input
                required
                type="text"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setAddressVerified(false);
                }}
                className="stitched-border bg-paper px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="flex w-28 flex-col gap-1 font-body text-sm text-ink">
              Code postal
              <input
                required
                type="text"
                value={postalCode}
                onChange={(e) => {
                  setPostalCode(e.target.value);
                  setAddressVerified(false);
                }}
                className="stitched-border bg-paper px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 font-body text-sm text-ink">
            Pays
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setAddressVerified(false);
              }}
              className="stitched-border bg-paper px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink"
            >
              {ALLOWED_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="font-body text-sm text-pop-red">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || hasSoldOutLine}
            className="stitched-border mt-2 flex items-center justify-center bg-ink px-4 py-4 font-display text-sm text-paper transition-transform duration-300 ease-signature active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {hasSoldOutLine
              ? "Retire les pièces épuisées pour continuer"
              : isSubmitting
                ? "Un instant..."
                : "Continuer vers le paiement"}
          </button>
        </form>
      ) : (
        <Elements stripe={getStripe()} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
          <PaymentForm onBack={() => setClientSecret(null)} />
        </Elements>
      )}
    </div>
  );
}

function PaymentForm({ onBack }: { onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { clear } = useCart();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setIsPaying(true);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/commande/succes`,
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Le paiement a échoué — réessaie.");
      setIsPaying(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      clear();
      router.push(`/commande/succes?payment_intent=${paymentIntent.id}`);
      return;
    }

    setIsPaying(false);
  }

  return (
    <form onSubmit={handlePay} className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="w-fit font-body text-xs text-ink/60 underline decoration-dashed underline-offset-4"
      >
        ← Modifier mes coordonnées
      </button>

      <PaymentElement />

      {error && <p className="font-body text-sm text-pop-red">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || isPaying}
        className="stitched-border mt-2 flex items-center justify-center bg-ink px-4 py-4 font-display text-sm text-paper transition-transform duration-300 ease-signature active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPaying ? "Paiement en cours..." : "Payer en toute sécurité"}
      </button>

      <div className="flex items-center justify-center gap-2 font-body text-xs text-ink/60">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Paiement chiffré via Stripe — aucune donnée bancaire ne transite par ce site
      </div>
    </form>
  );
}
