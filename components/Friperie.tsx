"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { friperieCategories, type FriperieCategory } from "@/data/friperie";
import { useReducedMotion } from "@/lib/scrollAnimations";

const EASE = [0.65, 0, 0.35, 1] as const;

// Pastille de couleur par categorie : les memes teintes que les tags prix des
// pieces uniques (voir ProductWindow.tsx), pour que les deux espaces se
// lisent comme une seule et meme marque.
const ACCENT_BG: Record<FriperieCategory["accent"], string> = {
  rust: "bg-rust-orange",
  denim: "bg-denim-blue",
  sage: "bg-sage-green",
  mustard: "bg-mustard",
  dusty: "bg-dusty-pink",
  olive: "bg-olive",
  clay: "bg-clay-brown",
  red: "bg-pop-red",
};

function CategoryCard({ category, index }: { category: FriperieCategory; index: number }) {
  const reducedMotion = useReducedMotion();
  const empty = category.pieces <= 0;

  const inner = (
    <>
      <span aria-hidden="true" className={`h-1.5 w-8 rounded-full ${ACCENT_BG[category.accent]}`} />
      <h3 className="font-display text-sm leading-tight text-ink lg:text-base">{category.name}</h3>
      <p className="font-body text-[0.7rem] leading-relaxed text-ink/60 lg:text-xs">{category.description}</p>
      <span className="mt-auto font-body text-[0.6rem] tracking-[0.2em] text-ink/45">
        {empty ? "BIENTÔT" : `${category.pieces} PIÈCE${category.pieces > 1 ? "S" : ""}`}
      </span>
    </>
  );

  return (
    <motion.article
      className="flex h-full flex-col"
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.4, once: true }}
      transition={{ duration: 0.5, ease: EASE, delay: reducedMotion ? 0 : index * 0.05 }}
    >
      {category.href ? (
        <Link
          href={category.href}
          className="stitched-border flex h-full flex-col gap-2 bg-cream-khaki p-4 transition-transform duration-300 ease-signature hover:scale-[1.03] active:scale-95"
        >
          {inner}
        </Link>
      ) : (
        <div className="stitched-border flex h-full flex-col gap-2 bg-cream-khaki p-4">{inner}</div>
      )}
    </motion.article>
  );
}

export default function Friperie() {
  return (
    <section
      id="friperie"
      className="relative flex w-full flex-col items-center gap-8 overflow-hidden bg-paper px-6 py-20"
      aria-label="L'espace friperie — seconde main chinée"
    >
      <div aria-hidden="true" className="flex w-full items-center gap-3">
        <span className="h-px flex-1 border-t-2 border-dashed border-ink/25" />
        <span className="stitched-border h-3 w-3 rounded-full bg-cream-khaki" />
        <span className="h-px flex-1 border-t-2 border-dashed border-ink/25" />
      </div>

      <div className="flex max-w-xs flex-col items-center gap-3 text-center lg:max-w-md">
        <p className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-ink/50 lg:text-xs">
          L&apos;espace friperie
        </p>
        <h2 className="font-wordmark text-2xl leading-snug text-ink sm:text-3xl lg:text-4xl">
          Chiné, trié, remis en rayon.
        </h2>
        <p className="font-body text-sm italic leading-relaxed text-ink/60 lg:text-base">
          À côté des pièces uniques, tout ce qu&apos;on chine et qui mérite une deuxième vie telle quelle.
        </p>
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3 lg:max-w-xl lg:gap-4">
        {friperieCategories.map((category, index) => (
          <CategoryCard key={category.id} category={category} index={index} />
        ))}
      </div>

      <span aria-hidden="true" className="h-px w-16 border-t-2 border-dashed border-ink/25" />
    </section>
  );
}
