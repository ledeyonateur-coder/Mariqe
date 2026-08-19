import { Link } from 'react-router-dom';
import ProductIcon from './icons/ProductIcon';
import { colorVar } from '../utils/color';

export default function ProductCard({ product }) {
  return (
    <Link className="card" to={`/boutique/${product.id}`}>
      <div className={`product-visual tex-${product.texture}`}>
        {product.badge && <span className="unique-pill">{product.badge}</span>}
        <ProductIcon icon={product.icon} stroke={colorVar(product.iconStroke)} size={70} />
      </div>
      <div className="card-info">
        <div className="card-type">{product.type}</div>
        <div className="card-name">{product.name}</div>
        <div className="card-price">{product.price} · {product.ref}</div>
      </div>
    </Link>
  );
}
