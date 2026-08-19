import { BRAND_NAME, config } from "@/data/config";

export default function Footer() {
  return (
    <footer className="flex w-full flex-col items-center gap-4 bg-night-navy px-6 py-12 text-center">
      <span className="font-display text-lg tracking-widest text-paper">{BRAND_NAME}</span>
      <p className="max-w-[28ch] font-body text-xs text-paper/60">{config.footer.tagline}</p>
      <nav className="flex gap-6" aria-label="Réseaux sociaux">
        {config.footer.social.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="font-body text-xs tracking-widest text-paper/70 underline decoration-dashed underline-offset-4 transition-colors duration-300 ease-signature hover:text-paper"
          >
            {link.label}
          </a>
        ))}
      </nav>
      <p className="font-body text-[0.65rem] text-paper/30">© {new Date().getFullYear()} {BRAND_NAME}</p>
    </footer>
  );
}
