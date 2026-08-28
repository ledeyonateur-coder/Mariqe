"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

let registered = false;

/** Registers the GSAP plugins used across the site. Safe to call repeatedly. */
export function registerScrollAnimations() {
  if (registered || typeof window === "undefined") return gsap;
  gsap.registerPlugin(ScrollTrigger);
  // The mobile browser toolbar collapsing/expanding fires resize events
  // mid-scroll; a full ScrollTrigger refresh at that moment recomputes all
  // trigger positions and visibly jolts the page. Ignore those resizes —
  // section heights are in svh so they don't actually change anyway.
  ScrollTrigger.config({ ignoreMobileResize: true });
  registered = true;
  return gsap;
}

/** The site's single signature easing curve — used by every GSAP tween and CSS transition. */
export const SIGNATURE_EASE = "0.65, 0, 0.35, 1";

export { gsap, ScrollTrigger };

/** Tracks prefers-reduced-motion so components can render a static/atténuée fallback. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return reduced;
}
