export default function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-[radial-gradient(ellipse_at_top,_#1c2130_0%,_#0a0b10_70%)]">
      <div
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-phone flex-col bg-night-navy shadow-[0_0_80px_rgba(0,0,0,0.6)] sm:my-0 sm:border-x sm:border-white/5"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
