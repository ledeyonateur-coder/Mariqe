// Texte brodé : dessin des lettres dans un canevas, ensuite vectorisé comme
// une image (les lettres étroites passent en satin automatiquement).

export const FONTS = [
  { family: "Anton", label: "Anton (bâton épais)" },
  { family: "Bebas Neue", label: "Bebas Neue (majuscules)" },
  { family: "Archivo Black", label: "Archivo Black (gras)" },
  { family: "Roboto Slab", label: "Roboto Slab (empattements)", weight: 700 },
  { family: "Lobster", label: "Lobster (rétro)" },
  { family: "Pacifico", label: "Pacifico (script)" },
  { family: "Dancing Script", label: "Dancing Script (manuscrit)", weight: 700 },
  { family: "Arial Black", label: "Arial Black (système)", system: true },
  { family: "Georgia", label: "Georgia (système)", weight: 700, system: true },
];

export async function ensureFont(font, px) {
  const f = FONTS.find((x) => x.family === font) || FONTS[0];
  const spec = `${f.weight || 400} ${px}px "${f.family}"`;
  try {
    await document.fonts.load(spec, "Ab");
  } catch {}
  return spec;
}

/**
 * Dessine le texte (plusieurs lignes) dans `ctx`, centré sur (cx, cy).
 * @param px hauteur des majuscules en pixels
 */
export async function drawText(ctx, text, { font = "Anton", px = 80, color = "#1D1A16", align = "center", cx, cy, spacing = 1.2 }) {
  const lines = text.split(/\r?\n/).filter((l, i, all) => l.trim() || all.length === 1);
  // La taille demandée est la hauteur des majuscules (~0,7 em).
  const em = px / 0.7;
  ctx.font = await ensureFont(font, em);
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = align;
  const lh = em * spacing;
  const widths = lines.map((l) => ctx.measureText(l).width);
  const maxW = Math.max(1, ...widths);
  const x = align === "center" ? cx : align === "left" ? cx - maxW / 2 : cx + maxW / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, cy + (i - (lines.length - 1) / 2) * lh));
  return { width: maxW, height: lh * lines.length };
}

/** Mesure le texte (largeur, hauteur) sans le dessiner. */
export async function measureText(text, opts) {
  const c = document.createElement("canvas").getContext("2d");
  const lines = text.split(/\r?\n/);
  const em = (opts.px || 80) / 0.7;
  c.font = await ensureFont(opts.font, em);
  return { width: Math.max(1, ...lines.map((l) => c.measureText(l).width)), height: em * (opts.spacing || 1.2) * lines.length };
}
