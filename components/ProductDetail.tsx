"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Product } from "@/data/products";
import { useCart } from "@/lib/cart";
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

export default function ProductDetail({ product, index }: { product: Product; index: number }) {
  const images = product.variantImages && product.variantImages.length > 0 ? product.variantImages : [product.image];
  const [variantIndex, setVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const reducedMotion = useReducedMotion();
  const { addItem, open } = useCart();

  function handleAddToCart() {
    addItem(product.id, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
    setTimeout(open, 350);
  }

  return (
    <motion.article
      className="flex min-h-[100dvh] w-full flex-col gap-6 bg-cream-khaki px-6 pb-16"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 4.5rem)" }}
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <Link
        href="/#collection"
        className="font-body text-sm text-ink/60 underline decoration-dashed underline-offset-4"
      >
        ← Retour à la collection
      </Link>

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[variantIndex]}
          alt={product.name}
          className="h-full w-full object-cover"
          loading={index === 0 ? "eager" : "lazy"}
        />
      </div>

      {images.length > 1 && (
        <div className="flex justify-center gap-2" role="tablist" aria-label="Variantes">
          {images.map((image, i) => (
            <button
              key={image}
              type="button"
              role="tab"
              aria-selected={i === variantIndex}
              aria-label={`Variante ${i + 1}`}
              onClick={() => setVariantIndex(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ease-signature ${
                i === variantIndex ? "scale-125 bg-ink" : "bg-ink/25"
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h1 className="font-display text-2xl text-ink">{product.name}</h1>
        <p className="font-body text-sm leading-relaxed text-ink/70">{product.description}</p>
        <span
          className={`stitched-border inline-flex w-fit items-center gap-1 px-3 py-1 font-display text-base text-ink ${ACCENT_BG[product.accent]}`}
        >
          {product.price} €
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="font-body text-sm text-ink/70">Quantité</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Diminuer la quantité"
            className="stitched-border h-9 w-9 font-body text-lg text-ink"
          >
            −
          </button>
          <span className="w-6 text-center font-display text-lg text-ink">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Augmenter la quantité"
            className="stitched-border h-9 w-9 font-body text-lg text-ink"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        className="stitched-border mt-2 flex items-center justify-center bg-ink px-4 py-4 font-display text-sm text-paper transition-transform duration-300 ease-signature active:scale-95"
      >
        {justAdded ? "Ajouté au panier ✓" : "Ajouter au panier"}
      </button>
    </motion.article>
  );
}
