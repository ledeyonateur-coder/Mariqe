export default function WavyFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className="absolute -inset-3 -rotate-6 bg-pop-blue/70"
        style={{ borderRadius: "42% 58% 68% 32% / 45% 40% 60% 55%" }}
      />
      <div
        aria-hidden="true"
        className="absolute -inset-3 rotate-3 bg-pop-green/70"
        style={{ borderRadius: "60% 40% 35% 65% / 55% 65% 35% 45%" }}
      />
      <div
        aria-hidden="true"
        className="absolute -inset-2 -rotate-2 bg-mustard/80"
        style={{ borderRadius: "38% 62% 55% 45% / 60% 40% 60% 40%" }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
