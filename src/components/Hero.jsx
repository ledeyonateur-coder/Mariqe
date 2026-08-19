import Button from './Button';
import { useSiteConfig } from '../context/SiteConfigContext';

export default function Hero({ hero }) {
  const { brand } = useSiteConfig();

  return (
    <div className="hero">
      <span className="tape tape-left" aria-hidden="true"></span>
      <span className="tape tape-right" aria-hidden="true"></span>
      <p className="eyebrow">{hero.eyebrow}</p>
      <h1 className="wordmark">
        {brand.name}
        <span className="crescent" aria-hidden="true"></span>
      </h1>
      <span className="sparkle sp-1" aria-hidden="true">✦</span>
      <span className="sparkle sp-2" aria-hidden="true">✦</span>
      <p className="manifesto">{hero.manifesto}</p>
      <div className="hero-ctas">
        {hero.ctas.map((cta) => (
          <Button key={cta.to} to={cta.to} variant={cta.variant}>{cta.label}</Button>
        ))}
      </div>
    </div>
  );
}
