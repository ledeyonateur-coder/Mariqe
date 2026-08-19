import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="not-found">
      <p className="eyebrow">404</p>
      <h1 className="page-title">Cette page n'existe pas</h1>
      <p className="page-lede"><Link to="/">Retour à l'accueil</Link></p>
    </div>
  );
}
