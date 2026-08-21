"use client";

import { useEffect, useRef } from "react";

// Flat colors, matching each section's actual background exactly (see
// PhoneFrame.tsx for how these get crossfaded onto the desktop gutters).
// "hero" has no entry — the live gradient layer shows through instead.
const SECTION_BACKDROPS: Record<string, string> = {
  countdown: "#8098DD",
  collection: "#E7DEC4",
  footer: "#12141c",
};

export default function AmbientBackground() {
  const activeOverlay = useRef<"a" | "b" | null>(null);

  useEffect(() => {
    const sectionIds = ["hero", "countdown", "collection", "footer"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const overlayA = document.getElementById("ambient-overlay-a");
    const overlayB = document.getElementById("ambient-overlay-b");
    const wordmark = document.getElementById("site-wordmark");
    if (sections.length === 0 || !overlayA || !overlayB) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!mostVisible) return;

        // The top-left logo is the same blue as the countdown background —
        // switch it to cream there so it stays readable, blue everywhere else.
        if (wordmark) {
          wordmark.style.color = mostVisible.target.id === "countdown" ? "#F6F2E9" : "#8098DD";
        }

        const backdrop = SECTION_BACKDROPS[mostVisible.target.id];
        if (!backdrop) {
          // Hero: fade both overlays out to reveal the live gradient layer.
          overlayA.style.opacity = "0";
          overlayB.style.opacity = "0";
          activeOverlay.current = null;
          return;
        }

        const current = activeOverlay.current;
        const next = current === "a" ? "b" : "a";
        const nextEl = next === "a" ? overlayA : overlayB;
        const prevEl = current === "a" ? overlayA : current === "b" ? overlayB : null;

        nextEl.style.background = backdrop;
        void nextEl.offsetHeight; // force layout so the opacity change below actually transitions
        nextEl.style.opacity = "1";
        if (prevEl) prevEl.style.opacity = "0";
        activeOverlay.current = next;
      },
      { threshold: 0.5 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      overlayA.style.opacity = "0";
      overlayB.style.opacity = "0";
      if (wordmark) wordmark.style.color = "#8098DD";
      activeOverlay.current = null;
    };
  }, []);

  return null;
}
