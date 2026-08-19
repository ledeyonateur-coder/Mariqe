import { products } from "@/data/products";
import ProductWindow from "./ProductWindow";

export default function ProductShowcase() {
  return (
    <section
      id="collection"
      className="scroll-snap-container h-[100dvh] w-full snap-y bg-cream-khaki"
      aria-label="La collection — 6 pièces"
    >
      {products.map((product, index) => (
        <ProductWindow key={product.id} product={product} index={index} />
      ))}
    </section>
  );
}
