import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useCart } from '../context/CartContext';
import ProductIcon from '../components/icons/ProductIcon';
import { colorVar } from '../utils/color';

export default function ProductDetail() {
  const { id } = useParams();
  const { products } = useSiteConfig();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const product = products.find((p) => p.id === id);
  if (!product) return <Navigate to="/boutique" replace />;

  function handleAdd() {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div style={{ paddingTop: 28 }}>
      <Link className="back-link" to="/boutique">← Retour à la boutique</Link>
      <div className="product-detail">
        <div className={`pd-visual tex-${product.texture}`}>
          <ProductIcon icon={product.icon} stroke={colorVar(product.iconStroke)} size={150} />
        </div>
        <div className="pd-info">
          <div className="pd-type">{product.type}</div>
          <h1 className="pd-name">{product.name}</h1>
          <p className="pd-price">{product.price}</p>
          <p className="pd-ref">{product.ref} · {product.availability}</p>
          <p className="pd-desc">{product.description}</p>
          <div className="pd-specs">
            {product.specs.map((spec, i) => (
              <div className="row" key={i}>
                <span>{spec.label}</span>
                <span>{spec.value}</span>
              </div>
            ))}
          </div>
          <div className="add-cart-wrap">
            <button className="btn btn-primary" onClick={handleAdd}>Ajouter au panier</button>
            {added && <span className="toast">Ajouté ✦</span>}
          </div>
          <p className="cart-note">Aperçu de design — panier non connecté à un paiement réel.</p>
        </div>
      </div>
    </div>
  );
}
