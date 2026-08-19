import { colorVar } from '../utils/color';

let uid = 0;

/**
 * Séparateur en vaguelettes, coloré via une clé de la config (ex: "primary",
 * "terracotta", "gold"...). Purement décoratif, réutilisable partout.
 */
export default function WaveDivider({ color = 'primary' }) {
  const id = 'wave-' + (uid++);
  const stroke = colorVar(color);
  return (
    <svg className="wave" viewBox="0 0 400 22" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id={id} width="30" height="22" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="22" r="13" fill="none" stroke={stroke} strokeWidth="2.2" />
          <circle cx="0" cy="22" r="13" fill="none" stroke={stroke} strokeWidth="2.2" />
          <circle cx="30" cy="22" r="13" fill="none" stroke={stroke} strokeWidth="2.2" />
        </pattern>
      </defs>
      <rect width="400" height="22" fill={`url(#${id})`} />
    </svg>
  );
}
