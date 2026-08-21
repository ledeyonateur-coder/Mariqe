"use client";

import { useEffect } from "react";

// On desktop, the card floats over visible gutters (see PhoneFrame). This
// sets --ambient-bg to the EXACT same flat color as whichever section is
// currently in view, so the gutters read as a seamless continuation of the
// card rather than an approximate echo. Invisible on phones, where the card
// fills the viewport and no gutter shows.
const SECTION_BACKDROPS: Record<string, string> = {
  hero: "#12141c",
  countdown: "#F7D98F",
  collection: "#E7DEC4",
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
