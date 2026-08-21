import Link from "next/link";

// Persistent "SOLEIL" brand mark at the top of every page, in a cream pill
// so it stays readable over any section background (dark hero, cream
// product pages, orange countdown, etc).
export default function SiteWordmark() {
  return (
    <Link
      href="/"
      aria-label="Soleil — retour à l'accueil"
      className="stitched-border fixed left-4 z-40 flex h-11 items-center rounded-full bg-paper/90 px-4 font-wordmark text-lg leading-none text-[#8098DD] shadow-lg transition-transform duration-300 ease-signature hover:scale-105"
      style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      SOLEIL
    </Link>
  );
}
