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
      <div className="stitched-border flex bg-clay-brown/40 px-1.5 py-1 font-display text-2xl text-paper sm:text-3xl lg:text-4xl">
        {digits.map((digit, index) => (
          <FlipDigit key={index} value={digit} reducedMotion={reducedMotion} />
        ))}
      </div>
      <span className="font-body text-[0.65rem] tracking-[0.25em] text-paper/70">{label}</span>
    </div>
  );
}

type RevealStage = "counting" | "flash" | "dissolve" | "logo";

// The headline is a short manifesto line followed by an optional lighter
// supporting sentence; the CTA is a short description followed by the
// actual clickable label. Both are split on blank/newlines so the data
// file keeps plain text while the render gets an editorial hierarchy.
function splitParagraphs(text: string): [string, string] {
  const [first, ...rest] = text.trim().split(/\n{2,}/);
  return [first?.trim() ?? "", rest.join(" ").trim()];
}

function splitCta(text: string): [string, string] {
  const lines = text.trim().split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return ["", lines[0] ?? text.trim()];
  return [lines.slice(0, -1).join(" "), lines[lines.length - 1]];
}

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

  const [headlineMain, headlineSub] = splitParagraphs(config.countdown.headline);
  const [ctaBody, ctaLabel] = splitCta(config.countdown.previewCta);

  return (
    <section
      id="countdown"
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-start overflow-hidden bg-[#F7D98F] px-6 pb-16 pt-24 text-center"
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

      {(stage === "counting" || stage === "flash") && (
        <div
          aria-hidden="true"
          className="absolute top-10 left-1/2 z-10 flex w-[calc(100%-3rem)] -translate-x-1/2 items-center gap-3"
        >
          <span className="h-px flex-1 border-t-2 border-dashed border-ink/30" />
          <span className="stitched-border h-3 w-3 rounded-full bg-paper/80" />
          <span className="h-px flex-1 border-t-2 border-dashed border-ink/30" />
        </div>
      )}

      <div className="relative z-10 flex min-h-[48vh] w-full items-center justify-center">
        <motion.div
          initial={false}
          animate={{
            opacity: stage === "counting" || stage === "flash" ? 1 : 0,
            scale: stage === "counting" || stage === "flash" ? 1 : 0.85,
          }}
          transition={{ duration: 0.5, ease: EASE }}
          className={`absolute inset-0 flex flex-col items-center justify-center gap-8 ${
            stage === "counting" || stage === "flash" ? "" : "pointer-events-none"
          }`}
          aria-hidden={stage !== "counting" && stage !== "flash"}
        >
          <p className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-rust-orange lg:text-xs">
            {config.countdown.eyebrow}
          </p>

          <div className="flex max-w-xs flex-col gap-3 lg:max-w-md">
            <h2 className="whitespace-pre-line font-display text-xl leading-snug text-ink sm:text-2xl lg:text-3xl">
              {headlineMain}
            </h2>
            {headlineSub && (
              <p className="whitespace-pre-line font-body text-sm italic leading-relaxed text-ink/70 lg:text-base">
                {headlineSub}
              </p>
            )}
          </div>

          <div className="flex items-end gap-2 sm:gap-3">
            <CountUnit value={time?.days ?? 0} label="JOURS" reducedMotion={reducedMotion} />
            <span className="pb-4 font-display text-xl text-ink/60">:</span>
            <CountUnit value={time?.hours ?? 0} label="HEURES" reducedMotion={reducedMotion} />
            <span className="pb-4 font-display text-xl text-ink/60">:</span>
            <CountUnit value={time?.minutes ?? 0} label="MIN" reducedMotion={reducedMotion} />
            <span className="pb-4 font-display text-xl text-ink/60">:</span>
            <CountUnit value={time?.seconds ?? 0} label="SEC" reducedMotion={reducedMotion} />
          </div>

          <div className="flex max-w-xs flex-col items-center gap-3 lg:max-w-md">
            {ctaBody && (
              <p className="whitespace-pre-line font-body text-xs leading-relaxed text-ink/70 lg:text-sm">{ctaBody}</p>
            )}
            <button
              type="button"
              onClick={handleSkip}
              className="font-display text-xs font-semibold uppercase tracking-[0.15em] underline decoration-dashed underline-offset-4 text-ink transition-colors duration-300 ease-signature hover:text-rust-orange"
            >
              {ctaLabel}
            </button>
          </div>
        </motion.div>

        <motion.div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4"
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
