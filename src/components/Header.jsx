import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useCart } from '../context/CartContext';

export default function Header() {
  const config = useSiteConfig();
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="nav-inner">
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <span>{config.brand.name}</span>
          {config.brand.showLogoDot && <span className="dot" />}
        </NavLink>

        <button
          className="menu-toggle"
          id="menuToggle"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span></span><span></span><span></span>
        </button>

        <nav className={`nav-links${open ? ' open' : ''}`}>
          {config.nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/boutique" className="cart-btn" onClick={() => setOpen(false)}>
            Panier <span className="cart-count">{count}</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
