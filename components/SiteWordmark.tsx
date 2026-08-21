import Link from "next/link";

// Persistent "SOLEIL" brand mark at the top of every page. Transparent
// background (no pill) so it reads as a logotype rather than a badge.
export default function SiteWordmark() {
  return (
    <Link
      href="/"
      aria-label="Soleil — retour à l'accueil"
      className="fixed left-4 z-40 flex h-11 items-center font-wordmark text-lg leading-none text-[#8098DD] transition-transform duration-300 ease-signature hover:scale-105"
      style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      SOLEIL
    </Link>
  );
}
