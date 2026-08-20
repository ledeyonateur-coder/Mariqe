"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { isSoldOut } from "@/data/products";
import { useCart } from "@/lib/cart";

const EASE = [0.65, 0, 0.35, 1] as const;

export default function CartWidget() {
  const { lines, totalCount, totalPrice, setQuantity, removeItem, isOpen, open, close } = useCart();
  const hasSoldOutLine = lines.some((line) => isSoldOut(line.product));

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Panier, ${totalCount} article${totalCount > 1 ? "s" : ""}`}
        className="fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-ink/80 text-paper shadow-lg backdrop-blur transition-transform duration-300 ease-signature hover:scale-105"
        style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 8V6a6 6 0 1 1 12 0v2M4 8h16l-1.2 12.1a2 2 0 0 1-2 1.9H7.2a2 2 0 0 1-2-1.9L4 8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        {totalCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pop-red px-1 font-body text-[0.65rem] font-semibold text-paper">
            {totalCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-ink/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={close}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-label="Panier"
              className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[80dvh] w-full max-w-phone flex-col rounded-t-3xl bg-paper px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg text-ink">Panier</h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fermer le panier"
                  className="font-body text-sm text-ink/60 underline decoration-dashed underline-offset-4"
                >
                  Fermer
                </button>
              </div>

              {lines.length === 0 ? (
                <p className="py-8 text-center font-body text-sm text-ink/60">
                  Ton panier est vide pour l&apos;instant.
                </p>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <ul className="flex flex-col gap-4">
                    {lines.map((line) => (
                      <li key={line.productId} className="flex gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={line.product.image}
                          alt={line.product.name}
                          className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                        />
                        <div className="flex flex-1 flex-col gap-1">
                          <span className="font-body text-sm text-ink">{line.product.name}</span>
                          {isSoldOut(line.product) ? (
                            <span className="font-wordmark text-xs text-pop-red">
                              Épuisée — retire-la pour commander
                            </span>
                          ) : (
                            <span className="font-body text-xs text-ink/60">{line.product.price} €</span>
                          )}
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQuantity(line.productId, line.quantity - 1)}
                              aria-label="Diminuer la quantité"
                              className="stitched-border h-6 w-6 font-body text-sm text-ink"
                            >
                              −
                            </button>
                            <span className="w-4 text-center font-body text-sm text-ink">{line.quantity}</span>
                            <button
                              type="button"
                              onClick={() => setQuantity(line.productId, Math.min(line.product.stock, line.quantity + 1))}
                              aria-label="Augmenter la quantité"
                              className="stitched-border h-6 w-6 font-body text-sm text-ink"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(line.productId)}
                              className="ml-2 font-body text-xs text-ink/50 underline decoration-dashed underline-offset-4"
                            >
                              Retirer
                            </button>
                          </div>
                        </div>
                        <span className="font-display text-sm text-ink">
                          {(line.product.price * line.quantity).toFixed(0)} €
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lines.length > 0 && (
                <div className="mt-4 flex flex-col gap-3 border-t border-dashed border-ink/20 pt-4">
                  <div className="flex items-center justify-between font-display text-base text-ink">
                    <span>Sous-total</span>
                    <span>{totalPrice.toFixed(0)} €</span>
                  </div>
                  {hasSoldOutLine ? (
                    <span className="stitched-border flex cursor-not-allowed items-center justify-center bg-ink/30 px-4 py-3 font-display text-sm text-paper/70">
                      Retire les pièces épuisées pour continuer
                    </span>
                  ) : (
                    <Link
                      href="/commande"
                      onClick={close}
                      className="stitched-border flex items-center justify-center bg-ink px-4 py-3 font-display text-sm text-paper transition-transform duration-300 ease-signature active:scale-95"
                    >
                      Passer commande
                    </Link>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
