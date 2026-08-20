"use client";

import { useEffect } from "react";

// On desktop, the card floats over visible gutters (see PhoneFrame). Those
// gutters used to stay a flat navy no matter which section — a bright
// orange countdown or cream product card — was showing, which clashed.
// This shifts the --ambient-bg custom property to a flat, uniform, dark
// echo of whichever section is currently in view (a radial fade was tried
// first, but the falloff made the tint unnoticeable — a flat color reads
// clearly as "harmonized" instead of a plain black band). Invisible on
// phones, where the card fills the viewport and no gutter shows.
const SECTION_BACKDROPS: Record<string, string> = {
  hero: "#12141c",
  countdown: "#5a4318",
  collection: "#4f4630",
  footer: "#12141c",
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
      { threshold: 0.5 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty("--ambient-bg", DEFAULT_BACKDROP);
    };
  }, []);

  return null;
}
