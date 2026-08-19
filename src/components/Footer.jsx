import { Link } from 'react-router-dom';
import { useSiteConfig } from '../context/SiteConfigContext';
import WaveDivider from './WaveDivider';

export default function Footer() {
  const config = useSiteConfig();
  const { footer, nav } = config;

  return (
    <footer className="site-footer">
      <div className="wrap">
        <WaveDivider color={footer.waveColor} />
      </div>
      <p className="tag-line">{footer.tagline}</p>
      <nav className="footer-nav">
        {nav.map((item) => (
          <Link key={item.path} to={item.path}>{item.label}</Link>
        ))}
      </nav>
      <p className="footer-credit">{footer.credit}</p>
    </footer>
  );
}
