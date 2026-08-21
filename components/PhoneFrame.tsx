export default function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Fixed to the viewport (not the page) so the color always tracks
          --ambient-bg as you scroll, instead of fading to flat black once
          you're deep in a tall page. No z-index: it's the first element in
          the DOM, so paint order alone keeps it behind the card — a negative
          z-index here was actually rendering it behind the <body> background. */}
      <div
        className="fixed inset-0 transition-[background-color] duration-300 ease-signature"
        style={{ backgroundColor: "var(--ambient-bg)" }}
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
