import { HashRouter, Routes, Route } from 'react-router-dom';
import { SiteConfigProvider } from './context/SiteConfigContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './theme/ThemeProvider';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Story from './pages/Story';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import ScrollToTop from './router/ScrollToTop';
import { siteConfig } from './config/site.config';
import './styles/global.css';

/**
 * Point d'entrée applicatif. Passe `configOverride` pour déployer une
 * version reskinnée du même site (autre marque = autre config, mêmes
 * composants).
 */
export default function App({ configOverride }) {
  const config = configOverride || siteConfig;
  const brandTitle = `${config.brand.name} — ${config.brand.tagline}`;

  return (
    <SiteConfigProvider config={config}>
      <ThemeProvider theme={config.theme} brandName={brandTitle}>
        <CartProvider>
          <HashRouter>
            <ScrollToTop />
            <div className="grain-overlay" />
            <Header />
            <main className="wrap">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/boutique" element={<Shop />} />
                <Route path="/boutique/:id" element={<ProductDetail />} />
                <Route path="/histoire" element={<Story />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </HashRouter>
        </CartProvider>
      </ThemeProvider>
    </SiteConfigProvider>
  );
}
