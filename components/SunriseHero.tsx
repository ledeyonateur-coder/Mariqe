"use client";

import { useEffect, useRef } from "react";
import GrainOverlay from "./GrainOverlay";
import { registerScrollAnimations, gsap, ScrollTrigger, useReducedMotion } from "@/lib/scrollAnimations";
import { config } from "@/data/config";

const SKY_STAGES = [
  "linear-gradient(180deg, #12141C 0%, #1a1d29 55%, #232838 100%)",
  "linear-gradient(180deg, #232838 0%, #5c6478 55%, #8B96A8 100%)",
  "linear-gradient(180deg, #8B96A8 0%, #d69a8a 55%, #FFB37A 100%)",
  "linear-gradient(180deg, #FFB37A 0%, #ff8a55 55%, #FF6B3D 100%)",
  "linear-gradient(180deg, #FF6B3D 0%, #ffa347 55%, #F3B23E 100%)",
];

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
        },
      });

      const segment = 1 / (SKY_STAGES.length - 1);
      skyRefs.current.forEach((el, index) => {
        if (!el || index === 0) return;
        tl.to(el, { opacity: 1, ease: "none", duration: segment }, (index - 1) * segment);
      });

      tl.to(
        sunRef.current,
        { yPercent: -170, ease: "none", duration: 1 },
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
    <div ref={wrapperRef} className={`relative w-full ${reducedMotion ? "h-[100dvh]" : "h-[250dvh]"}`}>
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

      {/* Sun glow */}
      <div
        ref={glowRef}
        className="absolute left-1/2 top-[62%] h-40 w-40 -translate-x-1/2 rounded-full bg-sunset-gold blur-3xl"
        style={{ opacity: reducedMotion ? 0.9 : 0.4, transform: reducedMotion ? "translate(-50%, -170%)" : undefined }}
      />

      {/* Wordmark — appears once the sun has cleared 50% of its rise, moves in lockstep with it */}
      <div
        ref={wordmarkRef}
        className="pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2 whitespace-nowrap font-wordmark text-[2.6rem] text-denim-blue drop-shadow-sm"
        style={{
          opacity: reducedMotion ? 1 : 0,
          transform: reducedMotion ? "translate(-50%, -170%)" : undefined,
        }}
        aria-hidden="true"
      >
        Soleil
      </div>

      {/* Sun */}
      <div
        ref={sunRef}
        className="absolute left-1/2 top-[62%] h-24 w-24 -translate-x-1/2 rounded-full bg-gradient-to-b from-sunset-gold to-sunset-coral shadow-[0_0_60px_20px_rgba(243,178,62,0.45)]"
        style={{ transform: reducedMotion ? "translate(-50%, -170%)" : undefined }}
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
        className="absolute bottom-8 left-1/2 -translate-x-1/2 font-display text-xs tracking-[0.3em] text-paper/80"
        style={{ opacity: reducedMotion ? 0 : undefined }}
      >
        <span className="animate-pulse">{config.hero.scrollHint} ↓</span>
      </div>
    </section>
    </div>
  );
}
