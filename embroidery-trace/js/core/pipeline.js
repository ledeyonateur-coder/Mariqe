// Enchaînement complet image -> calques -> points -> motif machine.
// Pur (sans DOM) : le même code tourne dans l'éditeur et dans les tests Node.

import { quantize, detectBackground, mergeSmallRegions, smoothLabels } from "./quantize.js";
import { vectorizeLayer } from "./trace.js";
import { layerRuns, buildPattern, appliqueSteps, DEFAULT_LAYER } from "./stitch.js";

export const APPLIQUE_LABELS = {
  placement: "ligne de placement",
  fixation: "fixation du tissu",
  bordure: "bordure satin",
};
import { rgbToHex, nearestThreadName } from "./threads.js";

export const DEFAULT_SETTINGS = {
  colors: 6,
  removeBackground: true,
  cleanup: 30, // surface min. d'un îlot (px)
  smoothing: 1, // passes du filtre de mode
  curve: 1, // lissage des contours (Chaikin)
  detail: 0.7, // tolérance de simplification (px)
};

/** Étape 1 : réduction des couleurs + nettoyage. */
export function analyzeImage(rgba, w, h, settings = {}) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  let { labels, palette } = quantize(rgba, s.colors);
  if (s.smoothing > 0) labels = smoothLabels(labels, w, h, s.smoothing);
  mergeSmallRegions(labels, w, h, s.cleanup);
  const background = s.removeBackground ? detectBackground(labels, w, h) : -1;
  let innerId = -1;
  if (background >= 0) {
    // Seules les zones de fond reliées au bord sont retirées : un blanc
    // entièrement entouré (reflet, œil, lettre) reste un calque à broder.
    if (splitEnclosed(labels, w, h, background, palette.length)) {
      innerId = palette.length;
      palette.push(palette[background]);
    }
  }
  const counts = new Int32Array(palette.length);
  for (let i = 0; i < labels.length; i++) if (labels[i] >= 0) counts[labels[i]]++;
  const layers = palette.map((rgb, i) => {
    const hex = rgbToHex(rgb);
    return {
      id: i,
      source: hex,
      color: hex,
      name: nearestThreadName(hex).name + (i === innerId ? " (intérieur)" : ""),
      visible: true,
      ...DEFAULT_LAYER,
      type: i === background ? "none" : DEFAULT_LAYER.type,
    };
  });
  return { labels, layers: layers.filter((L) => counts[L.id] > 0), background };
}

/** Réaffecte à `into` les pixels `value` non reliés au bord de l'image. */
function splitEnclosed(labels, w, h, value, into) {
  const seen = new Uint8Array(w * h);
  const stack = [];
  const seed = (i) => {
    if (labels[i] === value && !seen[i]) (seen[i] = 1), stack.push(i);
  };
  for (let x = 0; x < w; x++) seed(x), seed((h - 1) * w + x);
  for (let y = 0; y < h; y++) seed(y * w), seed(y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (p >= w) seed(p - w);
    if (p < w * (h - 1)) seed(p + w);
  }
  let moved = false;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === value && !seen[i]) {
      labels[i] = into;
      moved = true;
    }
  }
  return moved;
}

/** Étape 2 : contours vectoriels de chaque calque (en pixels). */
export function vectorizeAll(labels, w, h, layers, settings = {}, onProgress = null) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const out = new Map();
  layers.forEach((L, i) => {
    out.set(L.id, vectorizeLayer(labels, w, h, L.id, { smoothing: s.curve, simplify: s.detail }));
    onProgress?.((i + 1) / layers.length);
  });
  return out;
}

/**
 * Étape 3 : points machine.
 * @param layers  calques dans l'ordre de broderie
 * @param vectors Map id -> boucles en px
 * @param mmPerPx échelle
 * @param options.style  "fill" (normal), "outline" (contours seulement, une
 *                       couleur par calque) ou "outline1" (contours d'un seul fil)
 */
export function stitchDesign(layers, vectors, mmPerPx, options = {}) {
  const { style = "fill", outlineColor = "#1D1A16", outlineTriple = false, outlineLength = 2.5, onProgress = null, ...buildOptions } = options;
  const visible = layers.filter((L) => L.visible && L.type !== "none");
  let done = 0;
  const outline = style === "outline" || style === "outline1";
  let prepared = layers
    .filter((L) => L.visible && L.type !== "none")
    .map((L) => {
      onProgress?.(done++ / Math.max(1, visible.length));
      const cfg = outline ? { ...L, type: "running", triple: outlineTriple, stitchLength: outlineLength } : L;
      const loops = (vectors.get(L.id) || []).map((loop) => loop.map(([x, y]) => [x * mmPerPx, y * mmPerPx]));
      if (cfg.type === "applique" && !outline) {
        // Trois passages séparés par un arrêt : placement, fixation, bordure.
        return appliqueSteps(loops, cfg).map((st) => ({
          color: L.color,
          name: `${L.name} — ${APPLIQUE_LABELS[st.step]}`,
          id: L.id,
          step: st.step,
          loops,
          runs: st.runs,
        }));
      }
      return { color: L.color, name: L.name, id: L.id, loops, runs: layerRuns(loops, cfg) };
    })
    .flat()
    .filter((L) => L.runs.length);
  if (style === "outline1" && prepared.length) {
    // Un seul fil : tous les contours à la suite, du plus proche au plus proche.
    const runs = orderRuns(prepared.flatMap((L) => L.runs));
    prepared = [{ color: outlineColor, name: "Contour", id: prepared[0].id, runs }];
  }
  const pattern = buildPattern(prepared, buildOptions);
  pattern.layerIds = prepared.map((L) => L.id);
  pattern.steps = prepared.map((L) => L.step || null);
  return pattern;
}

/** Enchaîne les tracés en allant toujours au départ le plus proche (moins de sauts). */
function orderRuns(runs) {
  const left = runs.slice();
  const out = [];
  let pos = null;
  while (left.length) {
    let bi = 0;
    if (pos) {
      let bd = Infinity;
      left.forEach((r, i) => {
        const d = Math.hypot(r[0][0] - pos[0], r[0][1] - pos[1]);
        if (d < bd) (bd = d), (bi = i);
      });
    }
    const [r] = left.splice(bi, 1);
    out.push(r);
    pos = r[r.length - 1];
  }
  return out;
}

/** Boîte englobante des pixels non transparents et hors fond. */
export function contentBounds(labels, w, h, ignored) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = labels[y * w + x];
      if (l < 0 || ignored.has(l)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w, h };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
