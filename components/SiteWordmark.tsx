import Link from "next/link";

// Persistent "SOLEIL" brand mark at the top of every page, mirroring the
// cart button's fixed pill treatment so it stays readable over any section
// background (dark hero, cream product pages, orange countdown, etc).
export default function SiteWordmark() {
  return (
    <Link
      href="/"
      aria-label="Soleil — retour à l'accueil"
      className="fixed left-4 z-40 flex h-11 items-center rounded-full bg-ink/80 px-4 font-wordmark text-lg leading-none text-paper shadow-lg backdrop-blur transition-transform duration-300 ease-signature hover:scale-105"
      style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      SOLEIL
    </Link>
  );
}
