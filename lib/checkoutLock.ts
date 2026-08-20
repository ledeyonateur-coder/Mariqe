// Short-lived, best-effort lock preventing two Stripe Checkout sessions from
// being created back-to-back for the same one-of-a-kind product. This is
// in-memory (per warm server instance only) — it closes the "two people
// click Payer within the same second" race, but the real, durable guard
// against a completed double-sale is the Stripe webhook decrementing stock
// in lib/stockStore.ts once payment actually succeeds.

const RESERVATION_TTL_MS = 32 * 60 * 1000; // matches the Checkout Session expires_at below

const reservations = new Map<string, number>();

export function reserveForCheckout(productId: string): boolean {
  const now = Date.now();
  const expiry = reservations.get(productId);
  if (expiry && expiry > now) return false;
  reservations.set(productId, now + RESERVATION_TTL_MS);
  return true;
}

export function releaseReservation(productId: string): void {
  reservations.delete(productId);
}
