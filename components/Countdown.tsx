"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DROP_DATE, BRAND_NAME, config } from "@/data/config";
import { useReducedMotion } from "@/lib/scrollAnimations";

const EASE = [0.65, 0, 0.35, 1] as const;

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isDone: boolean;
};

function getTimeLeft(target: number): TimeLeft {
  const diff = Math.max(0, target - Date.now());
  const isDone = diff <= 0;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isDone,
  };
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function FlipDigit({ value, reducedMotion }: { value: string; reducedMotion: boolean }) {
  return (
    <span className="relative inline-flex h-[1.15em] w-[0.75em] overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reducedMotion ? false : { rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { rotateX: 90, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.35, ease: EASE }}
          className="absolute inset-0 flex items-center justify-center"
          style={{ transformOrigin: "50% 50%" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function CountUnit({ value, label, reducedMotion }: { value: number; label: string; reducedMotion: boolean }) {
  const digits = pad(value).split("");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="stitched-border flex bg-clay-brown/40 px-1.5 py-1 font-display text-2xl text-paper sm:text-3xl">
        {digits.map((digit, index) => (
          <FlipDigit key={index} value={digit} reducedMotion={reducedMotion} />
        ))}
      </div>
      <span className="font-body text-[0.65rem] tracking-[0.25em] text-paper/70">{label}</span>
    </div>
  );
}

type RevealStage = "counting" | "flash" | "dissolve" | "logo";

export default function Countdown() {
  const target = useMemo(() => new Date(DROP_DATE).getTime(), []);
  const reducedMotion = useReducedMotion();
  // Starts null so the server-rendered markup and the first client render match exactly;
  // the real countdown is only computed once mounted (Date.now() differs between the two).
  const [time, setTime] = useState<TimeLeft | null>(null);
  const [stage, setStage] = useState<RevealStage>("counting");
  const timersStarted = useRef(false);

  useEffect(() => {
    setTime(getTimeLeft(target));
    const interval = setInterval(() => {
      setTime(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  const isDone = time?.isDone ?? false;

  useEffect(() => {
    if (!isDone || timersStarted.current) return;
    timersStarted.current = true;

    if (reducedMotion) {
      setStage("logo");
      return;
    }

    setStage("flash");
    const toDissolve = setTimeout(() => setStage("dissolve"), 200);
    const toLogo = setTimeout(() => setStage("logo"), 800);
    return () => {
      clearTimeout(toDissolve);
      clearTimeout(toLogo);
    };
  }, [isDone, reducedMotion]);

  const handleSkip = () => {
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="countdown"
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sunset-gold via-[#ffa347] to-rust-orange px-6 py-16 text-center"
      aria-label="Compte à rebours avant le prochain drop"
    >
      <AnimatePresence>
        {stage === "flash" && !reducedMotion && (
          <motion.div
            className="absolute inset-0 z-30 bg-paper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex min-h-[65vh] w-full items-center justify-center">
        <motion.div
          initial={false}
          animate={{
            opacity: stage === "counting" || stage === "flash" ? 1 : 0,
            scale: stage === "counting" || stage === "flash" ? 1 : 0.85,
          }}
          transition={{ duration: 0.5, ease: EASE }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-8"
          aria-hidden={stage !== "counting" && stage !== "flash"}
        >
          <p className="font-display text-sm tracking-[0.35em] text-ink/80">{config.countdown.eyebrow}</p>
          <h2 className="max-w-xs font-display text-2xl leading-tight text-ink sm:text-3xl">
            {config.countdown.headline}
          </h2>

          <div className="flex items-end gap-2 sm:gap-3">
            <CountUnit value={time?.days ?? 0} label="JOURS" reducedMotion={reducedMotion} />
            <span className="pb-4 font-display text-xl text-ink/60">:</span>
            <CountUnit value={time?.hours ?? 0} label="HEURES" reducedMotion={reducedMotion} />
            <span className="pb-4 font-display text-xl text-ink/60">:</span>
            <CountUnit value={time?.minutes ?? 0} label="MIN" reducedMotion={reducedMotion} />
            <span className="pb-4 font-display text-xl text-ink/60">:</span>
            <CountUnit value={time?.seconds ?? 0} label="SEC" reducedMotion={reducedMotion} />
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="font-body text-sm underline decoration-dashed underline-offset-4 text-ink/70 transition-colors duration-300 ease-signature hover:text-ink"
          >
            {config.countdown.previewCta}
          </button>
        </motion.div>

        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          initial={false}
          animate={{
            opacity: stage === "logo" ? 1 : 0,
            y: stage === "logo" ? 0 : 24,
          }}
          transition={{ duration: 0.7, ease: EASE }}
          aria-hidden={stage !== "logo"}
        >
          <h2 className="font-display text-5xl tracking-wide text-paper drop-shadow-sm sm:text-6xl">
            {BRAND_NAME}
          </h2>
          <p className="font-body text-sm text-paper/90">{config.countdown.revealTagline}</p>
        </motion.div>
      </div>
    </section>
  );
}
