export default function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop ambient backdrop, three stacked fixed layers (no z-index:
          DOM order alone keeps them behind the card — a negative z-index
          previously rendered them behind the <body> background instead).

          - #ambient-live: continuously updated by the hero's scroll-linked
            gradient, no transition (a transition on top of GSAP's own scrub
            made it visibly lag/chase behind the actual sky color).
          - #ambient-overlay-a / -b: sit above the live layer, opacity-only
            crossfade between them driven by AmbientBackground.tsx whenever
            the dominant section changes (countdown/collection/footer), so
            that jump doesn't cut abruptly the way changing `background`
            directly would — opacity transitions smoothly regardless of
            whether the two backgrounds are gradients or flat colors,
            which a `background` transition can't reliably do. */}
      <div className="fixed inset-0" style={{ background: "var(--ambient-live-bg)" }} aria-hidden="true" />
      <div
        id="ambient-overlay-a"
        className="fixed inset-0 opacity-0 transition-opacity duration-500 ease-signature"
        aria-hidden="true"
      />
      <div
        id="ambient-overlay-b"
        className="fixed inset-0 opacity-0 transition-opacity duration-500 ease-signature"
        aria-hidden="true"
      />
      <div
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-phone flex-col bg-night-navy shadow-[0_0_80px_rgba(0,0,0,0.6)] sm:my-0 sm:border-x sm:border-white/5 lg:max-w-phone-lg"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {children}
      </div>
    </>
  );
}
