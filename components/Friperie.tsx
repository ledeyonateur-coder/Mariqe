"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { availableCount, friperieCategories, piecesOf, type FriperieCategory } from "@/data/friperie";
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
  const pieces = piecesOf(category.id);
  const available = availableCount(category.id);
  const cover = pieces[0]?.image;

  const inner = (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper">
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={`Aperçu ${category.name}`}
              className="h-full w-full object-cover"
              loading={index < 2 ? "eager" : "lazy"}
            />
            {pieces.length > 1 && (
              <span className="absolute bottom-1.5 right-1.5 bg-ink/70 px-1.5 py-0.5 font-body text-[0.55rem] tracking-widest text-paper">
                +{pieces.length - 1}
              </span>
            )}
          </>
        ) : (
          <span className="flex h-full w-full items-center justify-center font-body text-[0.6rem] tracking-[0.2em] text-ink/35">
            PHOTO À VENIR
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <span aria-hidden="true" className={`h-1.5 w-8 rounded-full ${ACCENT_BG[category.accent]}`} />
        <h3 className="font-display text-sm leading-tight text-ink lg:text-base">{category.name}</h3>
        <span className="mt-auto font-body text-[0.6rem] tracking-[0.2em] text-ink/45">
          {available > 0 ? `${available} PIÈCE${available > 1 ? "S" : ""}` : "BIENTÔT"}
        </span>
      </div>
    </>
  );

  return (
    <motion.article
      className="flex h-full flex-col"
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      // Le decalage se fait par colonne (0 ou 0.05 s), pas par index : avec
      // index * 0.05 la 8e tuile demarrait 0,35 s apres la premiere et
      // n'avait pas fini d'apparaitre quand on etait deja passe devant.
      viewport={{ amount: 0.2, once: true }}
      transition={{ duration: 0.4, ease: EASE, delay: reducedMotion ? 0 : (index % 2) * 0.05 }}
    >
      {/* Une categorie vide ne mene nulle part : la tuile reste une carte
          morte plutot qu'un lien vers une page "aucune piece". */}
      {pieces.length > 0 ? (
        <Link
          href={`/friperie/${category.id}`}
          className="stitched-border flex h-full flex-col overflow-hidden bg-cream-khaki transition-transform duration-300 ease-signature hover:scale-[1.03] active:scale-95"
        >
          {inner}
        </Link>
      ) : (
        <div className="stitched-border flex h-full flex-col overflow-hidden bg-cream-khaki">{inner}</div>
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
