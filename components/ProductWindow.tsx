"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { Product } from "@/data/products";
import { useReducedMotion } from "@/lib/scrollAnimations";

const EASE = [0.65, 0, 0.35, 1] as const;

const ACCENT_BG: Record<Product["accent"], string> = {
  rust: "bg-rust-orange",
  sage: "bg-sage-green",
  mustard: "bg-mustard",
  denim: "bg-denim-blue",
  dusty: "bg-dusty-pink",
  olive: "bg-olive",
};

export default function ProductWindow({ product, index }: { product: Product; index: number }) {
  const reducedMotion = useReducedMotion();

  const rotateXRaw = useMotionValue(0);
  const rotateYRaw = useMotionValue(0);
  const rotateX = useSpring(rotateXRaw, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(rotateYRaw, { stiffness: 200, damping: 20 });
  const glossX = useTransform(rotateY, [-4, 4], [0, 100]);
  const glossLeft = useTransform(glossX, (v) => `${v - 50}%`);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateYRaw.set(px * 8);
    rotateXRaw.set(-py * 8);
  }

  function handlePointerLeave() {
    rotateXRaw.set(0);
    rotateYRaw.set(0);
  }

  return (
    <motion.article
      className="relative flex h-[100dvh] w-full flex-col items-center justify-center gap-6 px-6 py-16"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.5, once: false }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <span className="font-display text-xs tracking-[0.3em] text-ink/50">
        {String(index + 1).padStart(2, "0")} / 06
      </span>

      <Link href={`/produits/${product.id}`} className="flex flex-col items-center gap-6">
        <motion.div
          className="relative aspect-[3/4] w-full max-w-[280px] cursor-pointer overflow-hidden rounded-2xl shadow-xl lg:max-w-[380px]"
          style={{
            rotateX: reducedMotion ? 0 : rotateX,
            rotateY: reducedMotion ? 0 : rotateY,
            transformPerspective: 800,
          }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          whileTap={reducedMotion ? undefined : { scale: 0.97 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            className={`h-full w-full object-cover ${product.soldOut ? "grayscale" : ""}`}
            loading={index === 0 ? "eager" : "lazy"}
          />
          {!reducedMotion && !product.soldOut && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              style={{ left: glossLeft }}
            />
          )}
          {product.soldOut ? (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
              <span className="stitched-border -rotate-6 bg-paper px-4 py-1.5 font-display text-sm tracking-widest text-ink">
                ÉPUISÉ
              </span>
            </div>
          ) : (
            <span className="stitched-border absolute bottom-3 right-3 bg-paper/90 px-2 py-1 font-body text-[0.6rem] tracking-widest text-ink/70">
              VOIR →
            </span>
          )}
        </motion.div>

        <div className="flex flex-col items-center gap-3 text-center">
          <h3 className="font-display text-xl text-paper lg:text-2xl">{product.name}</h3>
          <p className="max-w-[26ch] font-body text-sm text-paper/70 lg:max-w-[36ch] lg:text-base">{product.description}</p>
          <span
            className={`stitched-border inline-flex items-center gap-1 px-3 py-1 font-display text-sm text-ink ${
              product.soldOut ? "bg-ink/20 text-paper/70 line-through" : ACCENT_BG[product.accent]
            }`}
          >
            {product.price} €
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
