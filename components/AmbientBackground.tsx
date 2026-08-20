"use client";

import { useEffect } from "react";

// On desktop, the card floats over visible gutters (see PhoneFrame). Those
// gutters used to stay a flat navy no matter which section — a bright
// orange countdown or cream product card — was showing, which clashed.
// This shifts the --ambient-bg custom property to a dark, desaturated
// echo of whichever section is currently in view. Invisible on phones,
// where the card fills the viewport and no gutter shows.
const SECTION_BACKDROPS: Record<string, string> = {
  hero: "radial-gradient(ellipse at top, #1c2130 0%, #0a0b10 70%)",
  countdown: "radial-gradient(ellipse at top, #9c5a1f 0%, #2a1608 70%)",
  collection: "radial-gradient(ellipse at top, #6b5f42 0%, #1a1710 70%)",
  footer: "radial-gradient(ellipse at top, #1c2130 0%, #0a0b10 70%)",
};

const DEFAULT_BACKDROP = SECTION_BACKDROPS.hero;

export default function AmbientBackground() {
  useEffect(() => {
    const sections = Object.keys(SECTION_BACKDROPS)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const backdrop = mostVisible && SECTION_BACKDROPS[mostVisible.target.id];
        if (backdrop) {
          document.documentElement.style.setProperty("--ambient-bg", backdrop);
        }
      },
      { threshold: [0.35, 0.5, 0.65] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty("--ambient-bg", DEFAULT_BACKDROP);
    };
  }, []);

  return null;
}
