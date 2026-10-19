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
export async function drawText(ctx, text, { font = "Anton", px = 80, color = "#1D1A16", align = "center", cx, cy, spacing = 1.2, arc = null }) {
  if (arc) {
    // Texte courbé : une seule ligne, lettre par lettre le long d'un cercle.
    const em = px / 0.7;
    ctx.font = await ensureFont(font, em);
    const L = arcLayout(ctx, text, px, arc);
    const dx = arc.ox ?? cx - L.box.cx;
    const dy = arc.oy ?? cy - L.box.cy;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for (const g of L.glyphs) {
      ctx.save();
      ctx.translate(dx + g.x, dy + g.y);
      ctx.rotate(g.rot);
      ctx.fillText(g.ch, 0, 0);
      ctx.restore();
    }
    return { width: L.box.w, height: L.box.h };
  }
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

/**
 * Disposition d'un texte en arc, autour du centre du cercle (0, 0).
 * arc.dir : "up" (en arche, au-dessus) ou "down" (en sourire, en dessous)
 * arc.radius (rayon en px) ou arc.angle (ouverture en degrés).
 * `ctx.font` doit déjà être réglé.
 */
export function arcLayout(ctx, text, px, arc) {
  const line = text.replace(/\s*\r?\n\s*/g, " ");
  const chars = [...line];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const extra = px * 0.06; // les lettres s'écartent un peu sur la courbe
  const total = widths.reduce((a, b) => a + b, 0) + extra * Math.max(0, chars.length - 1);
  // Le texte est posé à l'extérieur du cercle (arche) ou à l'intérieur (sourire) :
  // on mesure l'arc à mi-hauteur des lettres.
  let R = arc.radius;
  if (!R) R = total / (((Math.max(20, Math.min(340, arc.angle || 120)) * Math.PI) / 180));
  const up = arc.dir !== "down";
  const rMid = R + px / 2;
  const A = total / rMid;
  const glyphs = [];
  let s = 0;
  chars.forEach((ch, i) => {
    const mid = s + widths[i] / 2;
    s += widths[i] + extra;
    const th = mid / rMid - A / 2; // -A/2 (début) … +A/2 (fin)
    if (up) glyphs.push({ ch, x: rMid * Math.sin(th), y: -rMid * Math.cos(th), rot: th });
    else glyphs.push({ ch, x: -rMid * Math.sin(-th), y: rMid * Math.cos(th), rot: -th });
  });
  // Boîte englobante approchée (coins de chaque lettre).
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  glyphs.forEach((g, i) => {
    const hw = widths[i] / 2;
    const hh = (px / 0.7) * 0.5;
    for (const [u, v] of [
      [-hw, -hh],
      [hw, -hh],
      [-hw, hh],
      [hw, hh],
    ]) {
      const x = g.x + u * Math.cos(g.rot) - v * Math.sin(g.rot);
      const y = g.y + u * Math.sin(g.rot) + v * Math.cos(g.rot);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  });
  return { glyphs, radius: R, box: { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 } };
}

/** Mesure le texte (largeur, hauteur) sans le dessiner. */
export async function measureText(text, opts) {
  const c = document.createElement("canvas").getContext("2d");
  if (opts.arc) {
    c.font = await ensureFont(opts.font, (opts.px || 80) / 0.7);
    const L = arcLayout(c, text, opts.px || 80, opts.arc);
    return { width: L.box.w, height: L.box.h, box: L.box };
  }
  const lines = text.split(/\r?\n/);
  const em = (opts.px || 80) / 0.7;
  c.font = await ensureFont(opts.font, em);
  return { width: Math.max(1, ...lines.map((l) => c.measureText(l).width)), height: em * (opts.spacing || 1.2) * lines.length };
}
