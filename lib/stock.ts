"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/products";

// Overlays units sold since deploy (confirmed by the Stripe webhook, via
// /api/stock) on top of each product's static `stock` count, so the UI
// reflects a real completed sale without needing a code edit + redeploy.
export function useStockOverrides(): Record<string, number> {
  const [sold, setSold] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    async function fetchOverrides() {
      try {
        const response = await fetch("/api/stock", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data.sold && typeof data.sold === "object") {
          setSold(data.sold);
        }
      } catch {
        // Offline or endpoint unreachable — keep relying on the static stock.
      }
    }

    fetchOverrides();
    const interval = setInterval(fetchOverrides, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return sold;
}

export function withLiveStock<T extends Product>(product: T, sold: Record<string, number>): T {
  const soldQty = sold[product.id] ?? 0;
  if (soldQty <= 0) return product;
  return { ...product, stock: Math.max(0, product.stock - soldQty) };
}
