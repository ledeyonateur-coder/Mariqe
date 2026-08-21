"use client";

import { useEffect, useState } from "react";

export type AddressSuggestion = {
  label: string;
  street: string;
  city: string;
  postalCode: string;
};

// French government's free, keyless address API (Base Adresse Nationale) —
// used to autocomplete and verify French addresses actually exist, instead
// of trusting free-text entry. No autocomplete for other countries (BAN only
// covers France), so those stay plain manual fields.
export function useAddressSuggestions(query: string, enabled: boolean) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);

  useEffect(() => {
    if (!enabled || query.trim().length < 4) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&autocomplete=1`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        const results: AddressSuggestion[] = (data.features ?? [])
          .map((feature: { properties: { name?: string; label?: string; city?: string; postcode?: string } }) => ({
            label: feature.properties.label ?? "",
            street: feature.properties.name ?? "",
            city: feature.properties.city ?? "",
            postalCode: feature.properties.postcode ?? "",
          }))
          .filter((s: AddressSuggestion) => s.label);
        setSuggestions(results);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, enabled]);

  return suggestions;
}
