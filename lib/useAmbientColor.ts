"use client";

import { useEffect } from "react";

// Single-color pages (checkout, product detail, success) aren't part of the
// home page's per-section AmbientBackground tracking, so without this the
// desktop gutter keeps whatever color it last had on the home page instead
// of matching this page's own background.
export function useAmbientColor(color: string) {
  useEffect(() => {
    document.documentElement.style.setProperty("--ambient-live-bg", color);
    return () => {
      document.documentElement.style.setProperty("--ambient-live-bg", "#12141c");
    };
  }, [color]);
}
