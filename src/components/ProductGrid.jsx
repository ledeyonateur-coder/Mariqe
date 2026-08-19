import ProductCard from './ProductCard';

export default function ProductGrid({ products, columns = 4 }) {
  return (
    <div className={`grid-row grid-${columns}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
