// Registre d'icônes vêtements dessinées à la main, extensible.
// Pour ajouter une nouvelle silhouette pour une autre marque, ajoute une
// entrée { viewBox, paths } à ICON_REGISTRY et référence sa clé dans
// site.config.js (products[].icon).
const ICON_REGISTRY = {
  gilet: {
    viewBox: '0 0 100 120',
    ratio: 1.2,
    paths: [
      'M20,18 L38,18 L50,30 L62,18 L80,18 Q86,20 86,32 Q90,70 84,100 Q82,113 68,113 L32,113 Q18,113 16,100 Q10,70 14,32 Q14,20 20,18 Z',
    ],
  },
  pull: {
    viewBox: '0 0 110 120',
    ratio: 1.09,
    paths: [
      'M23,25 L31,17 Q55,7 79,17 L87,25 Q92,60 88,100 Q86,113 73,113 L37,113 Q24,113 22,100 Q18,60 23,25 Z',
      'M23,25 L4,44 Q0,54 6,61 L16,70 L28,49 Z',
      'M87,25 L106,44 Q110,54 104,61 L94,70 L82,49 Z',
    ],
  },
  jean: {
    viewBox: '0 0 100 120',
    ratio: 1.2,
    rects: [{ x: 20, y: 14, width: 60, height: 17, rx: 6 }],
    paths: [
      'M22,31 L46,31 L48,110 Q48,114 43,114 L28,114 Q23,114 23,110 Z',
      'M54,31 L78,31 L77,110 Q77,114 72,114 L57,114 Q52,114 52,110 Z',
    ],
  },
  chemise: {
    viewBox: '0 0 110 120',
    ratio: 1.09,
    paths: [
      'M27,24 L39,15 L55,23 L71,15 L83,24 Q88,58 86,102 Q85,113 73,113 L37,113 Q25,113 24,102 Q22,58 27,24 Z',
      'M27,24 L10,31 Q6,37 10,43 L21,48 L30,32 Z',
      'M83,24 L100,31 Q104,37 100,43 L89,48 L80,32 Z',
    ],
    rects: [{ x: 38, y: 46, width: 16, height: 15, rx: 2 }],
    circles: [
      { cx: 55, cy: 52, r: 2 },
      { cx: 55, cy: 68, r: 2 },
      { cx: 55, cy: 84, r: 2 },
    ],
  },
};

export default function ProductIcon({ icon, stroke = 'var(--color-ink)', size = 100 }) {
  const def = ICON_REGISTRY[icon];
  if (!def) return null;
  const width = size;
  const height = size * def.ratio;

  return (
    <svg viewBox={def.viewBox} width={width} height={height} aria-hidden="true">
      {(def.paths || []).map((d, i) => (
        <path
          key={i}
          d={d}
          fill={i > 1 && def.rects ? 'none' : 'none'}
          stroke={stroke}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {(def.rects || []).map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.width}
          height={r.height}
          rx={r.rx}
          fill="none"
          stroke={stroke}
          strokeWidth={r.strokeWidth || 3}
        />
      ))}
      {(def.circles || []).map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={stroke} />
      ))}
    </svg>
  );
}

export { ICON_REGISTRY };
