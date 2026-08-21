import Link from "next/link";

// Persistent "SOLEIL" brand mark at the top of every page. Same font, color
// and drop-shadow treatment as the big wordmark reveal in the hero — reads
// as the site's actual logo continuing across pages, rather than a generic
// UI chip sitting on top of it.
export default function SiteWordmark() {
  return (
    <Link
      href="/"
      aria-label="Soleil — retour à l'accueil"
      className="fixed left-4 z-40 font-wordmark text-2xl leading-none text-[#8098DD] drop-shadow-sm transition-transform duration-300 ease-signature hover:scale-105"
      style={{ top: "calc(env(safe-area-inset-top) + 1.1rem)" }}
    >
      SOLEIL
    </Link>
  );
}
