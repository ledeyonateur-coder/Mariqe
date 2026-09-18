"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { piecesOf, type FriperieCategory, type FriperiePiece } from "@/data/friperie";
import { useAmbientColor } from "@/lib/useAmbientColor";
import { useReducedMotion } from "@/lib/scrollAnimations";

const EASE = [0.65, 0, 0.35, 1] as const;

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

function PieceCard({
  piece,
  accent,
  index,
  reducedMotion,
}: {
  piece: FriperiePiece;
  accent: FriperieCategory["accent"];
  index: number;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      className="stitched-border flex flex-col overflow-hidden bg-paper"
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.3, once: true }}
      transition={{ duration: 0.5, ease: EASE, delay: reducedMotion ? 0 : (index % 2) * 0.05 }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-cream-khaki">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={piece.image}
          alt={piece.name}
          className={`h-full w-full object-cover ${piece.sold ? "grayscale" : ""}`}
          loading={index < 2 ? "eager" : "lazy"}
        />
        {piece.sold && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
            <span className="stitched-border -rotate-6 bg-paper px-3 py-1 font-wordmark text-xs tracking-widest text-ink">
              PARTIE
            </span>
          </div>
        )}
        <span className="absolute bottom-1.5 left-1.5 bg-ink/70 px-1.5 py-0.5 font-body text-[0.55rem] tracking-widest text-paper">
          {piece.size}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h2 className="font-display text-sm leading-tight text-ink">{piece.name}</h2>
        <span
          className={`mt-auto inline-flex w-fit items-center px-2.5 py-1 font-display text-xs text-ink ${
            piece.sold ? "bg-ink/15 text-ink/50 line-through" : ACCENT_BG[accent]
          }`}
        >
          {piece.price} €
        </span>
      </div>
    </motion.article>
  );
}

export default function FriperieCategoryView({ category }: { category: FriperieCategory }) {
  useAmbientColor("#F6F2E9");
  const reducedMotion = useReducedMotion();
  const pieces = piecesOf(category.id);
  const available = pieces.filter((piece) => !piece.sold).length;

  return (
    <main
      className="flex min-h-[100svh] w-full flex-col gap-6 bg-paper px-6 pb-16"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 4.5rem)" }}
    >
      <Link
        href="/#friperie"
        className="font-body text-sm text-ink/60 underline decoration-dashed underline-offset-4"
      >
        ← Retour à la friperie
      </Link>

      <header className="flex flex-col gap-3">
        <span aria-hidden="true" className={`h-1.5 w-10 rounded-full ${ACCENT_BG[category.accent]}`} />
        <h1 className="font-wordmark text-2xl leading-snug text-ink sm:text-3xl">{category.name}</h1>
        <p className="font-body text-sm leading-relaxed text-ink/60">{category.description}</p>
        <span className="font-body text-[0.6rem] tracking-[0.2em] text-ink/45">
          {available > 0 ? `${available} PIÈCE${available > 1 ? "S" : ""} DISPONIBLE${available > 1 ? "S" : ""}` : "AUCUNE PIÈCE POUR L'INSTANT"}
        </span>
        <span aria-hidden="true" className="h-px w-full border-t-2 border-dashed border-ink/25" />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        {pieces.map((piece, index) => (
          <PieceCard
            key={piece.id}
            piece={piece}
            accent={category.accent}
            index={index}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>

      {/* Pas de panier ici : les pieces de friperie ne passent pas par Stripe
          (elles ne sont pas dans data/products.ts). Le contact se fait en
          message, comme une friperie physique. */}
      <p className="font-body text-xs leading-relaxed text-ink/55">
        Une pièce vous plaît ? Écrivez-nous en message privé sur Instagram pour la réserver.
      </p>
    </main>
  );
}
