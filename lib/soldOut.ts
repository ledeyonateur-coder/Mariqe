"use client";

import { useEffect, useState } from "react";

// Overlays the automatic (Stripe-webhook-confirmed) sold-out ids from
// /api/sold-out on top of the manual Product.soldOut flag, so the UI
// reflects a real completed sale without needing a code edit + redeploy.
export function useSoldOutOverrides(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;

    async function fetchOverrides() {
      try {
        const response = await fetch("/api/sold-out", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && Array.isArray(data.ids)) {
          setIds(new Set(data.ids));
        }
      } catch {
        // Offline or endpoint unreachable — keep relying on the manual flag.
      }
    }

    fetchOverrides();
    const interval = setInterval(fetchOverrides, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return ids;
}

export function withLiveSoldOut<T extends { id: string; soldOut?: boolean }>(
  product: T,
  overrides: Set<string>
): T {
  if (product.soldOut || !overrides.has(product.id)) return product;
  return { ...product, soldOut: true };
}
