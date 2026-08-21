"use client";

import { useEffect, useRef } from "react";
import GrainOverlay from "./GrainOverlay";
import { registerScrollAnimations, gsap, ScrollTrigger, useReducedMotion } from "@/lib/scrollAnimations";
import { config } from "@/data/config";
import { lerpColor } from "@/lib/color";

const SKY_STAGES = [
  "linear-gradient(180deg, #12141C 0%, #1a1d29 55%, #232838 100%)",
  "linear-gradient(180deg, #232838 0%, #5c6478 55%, #8B96A8 100%)",
  "linear-gradient(180deg, #8B96A8 0%, #d69a8a 55%, #FFB37A 100%)",
  "linear-gradient(180deg, #FFB37A 0%, #ff8a55 55%, #FF6B3D 100%)",
  "linear-gradient(180deg, #FF6B3D 0%, #ffa347 55%, #F3B23E 100%)",
];

// The top (0%) and bottom (100%) stops of each SKY_STAGES gradient above —
// interpolated independently so the desktop gutter (--ambient-live-bg)
// renders as the same two-stop vertical gradient as the sky, not just an
// approximate flat tone. That's what makes the sides actually match the
// center instead of merely echoing its general hue.
const SKY_AMBIENT_TOP = ["#12141C", "#232838", "#8B96A8", "#FFB37A", "#FF6B3D"];
const SKY_AMBIENT_BOTTOM = ["#232838", "#8B96A8", "#FFB37A", "#FF6B3D", "#F3B23E"];

export default function SunriseHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const skyRefs = useRef<Array<HTMLDivElement | null>>([]);
  const sunRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLDivElement>(null);
  const hillFarRef = useRef<HTMLDivElement>(null);
  const hillNearRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const gsapInstance = registerScrollAnimations();
    const wrapper = wrapperRef.current;
    const section = sectionRef.current;
    if (!wrapper || !section || !gsapInstance) return;

    const ctx = gsapInstance.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          onUpdate: (self) => {
            // Only drive the ambient gutter while actually inside the hero's
            // pinned range — otherwise AmbientBackground's section-based
            // colors (countdown/collection/footer) take over.
            if (!self.isActive) return;
            const segment = 1 / (SKY_AMBIENT_TOP.length - 1);
            const index = Math.min(SKY_AMBIENT_TOP.length - 2, Math.floor(self.progress / segment));
            const localT = (self.progress - index * segment) / segment;
            const top = lerpColor(SKY_AMBIENT_TOP[index], SKY_AMBIENT_TOP[index + 1], localT);
            const bottom = lerpColor(SKY_AMBIENT_BOTTOM[index], SKY_AMBIENT_BOTTOM[index + 1], localT);
            document.documentElement.style.setProperty(
              "--ambient-live-bg",
              `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`
            );
          },
        },
      });

      const segment = 1 / (SKY_STAGES.length - 1);
      skyRefs.current.forEach((el, index) => {
        if (!el || index === 0) return;
        tl.to(el, { opacity: 1, ease: "none", duration: segment }, (index - 1) * segment);
      });

      tl.to(
        sunRef.current,
        { yPercent: -170, filter: "brightness(1) saturate(1)", ease: "none", duration: 1 },
        0
      ).to(
        wordmarkRef.current,
        { yPercent: -170, ease: "none", duration: 1 },
        0
      ).to(
        wordmarkRef.current,
        { opacity: 1, ease: "none", duration: 0.12 },
        0.5
      ).to(
        glowRef.current,
        { yPercent: -170, opacity: 0.9, ease: "none", duration: 1 },
        0
      ).to(
        waterRef.current,
        { opacity: 0.8, ease: "none", duration: 1 },
        0
      ).to(
        hillFarRef.current,
        { yPercent: -4, ease: "none", duration: 1 },
        0
      ).to(
        hillNearRef.current,
        { yPercent: -10, ease: "none", duration: 1 },
        0
      ).to(
        scrollHintRef.current,
        { opacity: 0, ease: "none", duration: 0.15 },
        0
      );
    }, wrapper);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div id="hero" ref={wrapperRef} className={`relative w-full ${reducedMotion ? "h-[100dvh]" : "h-[250dvh]"}`}>
    <section
      ref={sectionRef}
      className="sticky top-0 h-[100dvh] w-full overflow-hidden"
      aria-label="Lever de soleil sur la mer"
    >
      {SKY_STAGES.map((background, index) => (
        <div
          key={background}
          ref={(el) => {
            skyRefs.current[index] = el;
          }}
          className="absolute inset-0"
          style={{
            background,
            opacity: reducedMotion ? (index === SKY_STAGES.length - 2 ? 1 : 0) : index === 0 ? 1 : 0,
          }}
        />
      ))}

      {/* Sun glow — barely there at the dark start, builds up with the sun itself */}
      <div
        ref={glowRef}
        className="absolute left-1/2 top-[62%] h-40 w-40 -translate-x-1/2 rounded-full bg-sunset-gold blur-3xl lg:h-56 lg:w-56"
        style={{ opacity: reducedMotion ? 0.9 : 0.1, transform: reducedMotion ? "translate(-50%, -170%)" : undefined }}
      />

      {/* Wordmark — appears once the sun has cleared 50% of its rise, moves in
          lockstep with it. A soft warm glow (echoing the sun's own glow, not
          just a flat drop-shadow) grounds it in the scene instead of reading
          as text pasted on top of the sky. */}
      <div
        ref={wordmarkRef}
        className="pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2 whitespace-nowrap font-wordmark text-6xl text-[#1E3A8A] sm:text-7xl lg:text-8xl"
        style={{
          opacity: reducedMotion ? 1 : 0,
          transform: reducedMotion ? "translate(-50%, -170%)" : undefined,
          filter:
            "drop-shadow(0 2px 4px rgba(23,20,15,0.25)) drop-shadow(0 0 28px rgba(255,179,122,0.65))",
        }}
        aria-hidden="true"
      >
        SOLEIL
      </div>

      {/* Sun — starts almost unlit (barely distinguishable from the dark
          night sky behind it) and lights up to full brightness in lockstep
          with the sky stages via the "filter" tween above, for a real
          "lever de soleil" reveal instead of a sun that's always visible. */}
      <div
        ref={sunRef}
        className="absolute left-1/2 top-[62%] h-24 w-24 -translate-x-1/2 rounded-full bg-gradient-to-b from-sunset-gold to-sunset-coral shadow-[0_0_60px_20px_rgba(243,178,62,0.45)] lg:h-36 lg:w-36"
        style={{
          filter: reducedMotion ? "brightness(1) saturate(1)" : "brightness(0.12) saturate(0.15)",
          transform: reducedMotion ? "translate(-50%, -170%)" : undefined,
        }}
      />

      {/* Water reflection */}
      <div
        ref={waterRef}
        className="absolute bottom-0 left-0 h-[30%] w-full bg-gradient-to-t from-sunset-gold/40 via-sunset-coral/20 to-transparent blur-md"
        style={{ opacity: reducedMotion ? 0.8 : 0.15 }}
      />

      {/* Hills — far layer */}
      <div
        ref={hillFarRef}
        className="absolute bottom-0 left-0 h-[22%] w-full"
        style={{ transform: reducedMotion ? "translateY(-4%)" : undefined }}
      >
        <svg viewBox="0 0 430 100" preserveAspectRatio="none" className="h-full w-full">
          <path d="M0,100 L0,55 Q60,20 120,45 T240,40 T430,50 L430,100 Z" fill="#1c2130" opacity="0.85" />
        </svg>
      </div>

      {/* Hills — near layer */}
      <div
        ref={hillNearRef}
        className="absolute bottom-0 left-0 h-[16%] w-full"
        style={{ transform: reducedMotion ? "translateY(-10%)" : undefined }}
      >
        <svg viewBox="0 0 430 70" preserveAspectRatio="none" className="h-full w-full">
          <path d="M0,70 L0,35 Q90,5 180,30 T430,25 L430,70 Z" fill="#12141C" />
        </svg>
      </div>

      <GrainOverlay opacity={0.25} />

      <div
        ref={scrollHintRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 font-display text-xs tracking-[0.3em] text-sunset-gold"
        style={{ opacity: reducedMotion ? 0 : undefined }}
      >
        <span className="animate-pulse">{config.hero.scrollHint} ↓</span>
      </div>
    </section>
    </div>
  );
}
