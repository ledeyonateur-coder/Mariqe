import { Link } from 'react-router-dom';

/**
 * Bouton générique piloté par `variant` ('primary' | 'outline').
 * Rend un <Link> si `to` est fourni, sinon un <button>.
 */
export default function Button({ to, variant = 'primary', className = '', children, ...rest }) {
  const classes = `btn btn-${variant} ${className}`.trim();
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
