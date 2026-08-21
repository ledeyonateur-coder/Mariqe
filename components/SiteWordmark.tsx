import Link from "next/link";

// Persistent "SOLEIL" brand mark at the top of every page. Transparent
// background (no pill) so it reads as a logotype rather than a badge.
// Its text color is toggled by AmbientBackground.tsx (by id, see there) to
// cream whenever the countdown section — same blue as this logo — is behind
// it, so the logo doesn't disappear against a same-color background.
export default function SiteWordmark() {
  return (
    <Link
      id="site-wordmark"
      href="/"
      aria-label="Soleil — retour à l'accueil"
      className="fixed left-4 z-40 flex h-11 items-center font-wordmark text-lg leading-none text-[#8098DD] transition-[color,transform] duration-500 ease-signature hover:scale-105"
      style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      SOLEIL
    </Link>
  );
}
