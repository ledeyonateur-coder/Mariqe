"use client";

import { useEffect, useRef, useState } from "react";
import { products } from "@/data/products";
import { useSoldOutOverrides, withLiveSoldOut } from "@/lib/soldOut";
import ProductWindow from "./ProductWindow";

export default function ProductShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const soldOutOverrides = useSoldOutOverrides();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const index = Math.round(container.scrollLeft / container.clientWidth);
        setActiveIndex(Math.min(products.length - 1, Math.max(0, index)));
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      id="collection"
      className="relative h-[100dvh] w-full bg-cream-khaki"
      aria-label="La collection — 6 pièces, glisser pour découvrir"
    >
      <div
        ref={containerRef}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        {products.map((product, index) => (
          <div key={product.id} className="h-full w-full flex-shrink-0 snap-start [scroll-snap-stop:always]">
            <ProductWindow product={withLiveSoldOut(product, soldOutOverrides)} index={index} />
          </div>
        ))}
      </div>

      <div
        className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2"
        aria-hidden="true"
      >
        {products.map((product, index) => (
          <span
            key={product.id}
            className={`h-1.5 rounded-full transition-all duration-300 ease-signature ${
              index === activeIndex ? "w-5 bg-ink" : "w-1.5 bg-ink/30"
            }`}
          />
        ))}
      </div>

      <p className="pointer-events-none absolute right-4 top-4 font-display text-[0.65rem] tracking-[0.25em] text-ink/50">
        GLISSER →
      </p>
    </section>
  );
}
