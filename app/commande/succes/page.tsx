"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent");
  const { clear } = useCart();
  const [status, setStatus] = useState<"checking" | "paid" | "unknown">("checking");

  useEffect(() => {
    if (!paymentIntentId) {
      setStatus("unknown");
      return;
    }
    fetch(`/api/checkout/verify?payment_intent=${encodeURIComponent(paymentIntentId)}`)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.paid ? "paid" : "unknown");
        if (data.paid) clear();
      })
      .catch(() => setStatus("unknown"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentIntentId]);

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-cream-khaki px-6 text-center"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {status === "checking" && <p className="font-body text-sm text-ink/60">Vérification du paiement...</p>}

      {status === "paid" && (
        <>
          <span className="font-display text-3xl text-ink">Merci ✓</span>
          <p className="max-w-[28ch] font-body text-sm text-ink/70">
            Ta commande est confirmée, tu vas recevoir un email de confirmation.
          </p>
        </>
      )}

      {status === "unknown" && (
        <>
          <span className="font-display text-xl text-ink">Statut du paiement introuvable</span>
          <p className="max-w-[28ch] font-body text-sm text-ink/70">
            Si le paiement a bien été effectué, tu recevras un email de confirmation de Stripe.
          </p>
        </>
      )}

      <Link href="/#collection" className="font-body text-sm underline decoration-dashed underline-offset-4 text-ink">
        ← Retour à la collection
      </Link>
    </div>
  );
}
