// Enchaînement complet image -> calques -> points -> motif machine.
// Pur (sans DOM) : le même code tourne dans l'éditeur et dans les tests Node.

import { quantize, detectBackground, mergeSmallRegions, smoothLabels } from "./quantize.js";
import { vectorizeLayer } from "./trace.js";
import { layerRuns, buildPattern, DEFAULT_LAYER } from "./stitch.js";
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
export function vectorizeAll(labels, w, h, layers, settings = {}) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const out = new Map();
  for (const L of layers) {
    out.set(L.id, vectorizeLayer(labels, w, h, L.id, { smoothing: s.curve, simplify: s.detail }));
  }
  return out;
}

/**
 * Étape 3 : points machine.
 * @param layers  calques dans l'ordre de broderie
 * @param vectors Map id -> boucles en px
 * @param mmPerPx échelle
 */
export function stitchDesign(layers, vectors, mmPerPx, options = {}) {
  const prepared = layers
    .filter((L) => L.visible && L.type !== "none")
    .map((L) => {
      const loops = (vectors.get(L.id) || []).map((loop) => loop.map(([x, y]) => [x * mmPerPx, y * mmPerPx]));
      return { color: L.color, name: L.name, id: L.id, runs: layerRuns(loops, L) };
    })
    .filter((L) => L.runs.length);
  const pattern = buildPattern(prepared, options);
  pattern.layerIds = prepared.map((L) => L.id);
  return pattern;
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
