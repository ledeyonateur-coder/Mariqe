// Réduction des couleurs (k-means) et nettoyage de la carte de couleurs.
// Module pur (aucun accès au DOM) : utilisable dans le navigateur et sous Node.

/** Générateur pseudo-aléatoire déterministe : même image -> même résultat. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Distance perceptuelle approchée (pondération "redmean").
function dist2(r1, g1, b1, r2, g2, b2) {
  const rm = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

/**
 * Quantifie une image RGBA en `k` couleurs.
 * @param {Uint8ClampedArray} rgba  pixels
 * @param {number} k                nombre de couleurs voulu
 * @returns {{labels: Int16Array, palette: number[][]}}  labels = -1 pour les pixels transparents
 */
export function quantize(rgba, k, { iterations = 14, maxSamples = 24000, seed = 7 } = {}) {
  const n = rgba.length >> 2;
  const opaque = [];
  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] >= 128) opaque.push(i);
  const labels = new Int16Array(n).fill(-1);
  if (!opaque.length) return { labels, palette: [] };

  const rand = mulberry32(seed);
  const step = Math.max(1, Math.floor(opaque.length / maxSamples));
  const samples = [];
  for (let i = 0; i < opaque.length; i += step) samples.push(opaque[i]);
  const S = samples.length;
  const sr = new Float32Array(S);
  const sg = new Float32Array(S);
  const sb = new Float32Array(S);
  samples.forEach((p, i) => {
    sr[i] = rgba[p * 4];
    sg[i] = rgba[p * 4 + 1];
    sb[i] = rgba[p * 4 + 2];
  });

  // Initialisation k-means++
  k = Math.max(1, Math.min(k, S));
  const cent = [];
  const first = Math.floor(rand() * S);
  cent.push([sr[first], sg[first], sb[first]]);
  const best = new Float64Array(S).fill(Infinity);
  while (cent.length < k) {
    const c = cent[cent.length - 1];
    let total = 0;
    for (let i = 0; i < S; i++) {
      const d = dist2(sr[i], sg[i], sb[i], c[0], c[1], c[2]);
      if (d < best[i]) best[i] = d;
      total += best[i];
    }
    if (total === 0) break; // moins de couleurs distinctes que demandé
    let r = rand() * total;
    let pick = S - 1;
    for (let i = 0; i < S; i++) {
      r -= best[i];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    cent.push([sr[pick], sg[pick], sb[pick]]);
  }

  const assign = new Int32Array(S);
  for (let it = 0; it < iterations; it++) {
    const acc = cent.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < S; i++) {
      let bi = 0;
      let bd = Infinity;
      for (let c = 0; c < cent.length; c++) {
        const d = dist2(sr[i], sg[i], sb[i], cent[c][0], cent[c][1], cent[c][2]);
        if (d < bd) {
          bd = d;
          bi = c;
        }
      }
      assign[i] = bi;
      const a = acc[bi];
      a[0] += sr[i];
      a[1] += sg[i];
      a[2] += sb[i];
      a[3]++;
    }
    let moved = 0;
    for (let c = 0; c < cent.length; c++) {
      const a = acc[c];
      if (!a[3]) continue;
      const nc = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
      moved += Math.abs(nc[0] - cent[c][0]) + Math.abs(nc[1] - cent[c][1]) + Math.abs(nc[2] - cent[c][2]);
      cent[c] = nc;
    }
    if (moved < 0.5) break;
  }

  // Affectation de tous les pixels (avec cache par couleur exacte).
  const cache = new Map();
  const counts = new Int32Array(cent.length);
  for (const p of opaque) {
    const r = rgba[p * 4];
    const g = rgba[p * 4 + 1];
    const b = rgba[p * 4 + 2];
    const key = (r << 16) | (g << 8) | b;
    let bi = cache.get(key);
    if (bi === undefined) {
      let bd = Infinity;
      bi = 0;
      for (let c = 0; c < cent.length; c++) {
        const d = dist2(r, g, b, cent[c][0], cent[c][1], cent[c][2]);
        if (d < bd) {
          bd = d;
          bi = c;
        }
      }
      cache.set(key, bi);
    }
    labels[p] = bi;
    counts[bi]++;
  }

  // Tri par surface décroissante, suppression des couleurs vides.
  const order = [...cent.keys()].filter((c) => counts[c] > 0).sort((a, b) => counts[b] - counts[a]);
  const remap = new Int16Array(cent.length).fill(-1);
  order.forEach((c, i) => (remap[c] = i));
  for (let i = 0; i < n; i++) if (labels[i] >= 0) labels[i] = remap[labels[i]];
  const palette = order.map((c) => cent[c].map((v) => Math.round(v)));
  return { labels, palette };
}

/** Couleur la plus présente sur le bord de l'image, si elle domine (>= 55 %). */
export function detectBackground(labels, w, h) {
  const counts = new Map();
  let total = 0;
  const add = (i) => {
    const l = labels[i];
    total++;
    if (l >= 0) counts.set(l, (counts.get(l) || 0) + 1);
  };
  for (let x = 0; x < w; x++) {
    add(x);
    add((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    add(y * w);
    add(y * w + w - 1);
  }
  let bestL = -1;
  let bestC = 0;
  for (const [l, c] of counts) {
    if (c > bestC) {
      bestC = c;
      bestL = l;
    }
  }
  return bestC / Math.max(1, total) >= 0.55 ? bestL : -1;
}

/**
 * Fusionne les îlots de moins de `minArea` pixels dans la couleur voisine
 * majoritaire : la machine ne perd pas de temps sur des points isolés.
 */
export function mergeSmallRegions(labels, w, h, minArea) {
  if (minArea <= 1) return labels;
  const n = w * h;
  const comp = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let id = 0;
  for (let s = 0; s < n; s++) {
    if (comp[s] !== -1) continue;
    const lab = labels[s];
    let head = 0;
    let tail = 0;
    queue[tail++] = s;
    comp[s] = id;
    while (head < tail) {
      const p = queue[head++];
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0 && comp[p - 1] === -1 && labels[p - 1] === lab) (comp[p - 1] = id), (queue[tail++] = p - 1);
      if (x < w - 1 && comp[p + 1] === -1 && labels[p + 1] === lab) (comp[p + 1] = id), (queue[tail++] = p + 1);
      if (y > 0 && comp[p - w] === -1 && labels[p - w] === lab) (comp[p - w] = id), (queue[tail++] = p - w);
      if (y < h - 1 && comp[p + w] === -1 && labels[p + w] === lab) (comp[p + w] = id), (queue[tail++] = p + w);
    }
    if (tail < minArea) {
      // Couleur voisine la plus fréquente sur le pourtour de l'îlot.
      const votes = new Map();
      for (let q = 0; q < tail; q++) {
        const p = queue[q];
        const x = p % w;
        const y = (p - x) / w;
        const nb = [];
        if (x > 0) nb.push(p - 1);
        if (x < w - 1) nb.push(p + 1);
        if (y > 0) nb.push(p - w);
        if (y < h - 1) nb.push(p + w);
        for (const m of nb) if (comp[m] !== id) votes.set(labels[m], (votes.get(labels[m]) || 0) + 1);
      }
      let target = lab;
      let bc = 0;
      for (const [l, c] of votes) if (c > bc) (bc = c), (target = l);
      for (let q = 0; q < tail; q++) labels[queue[q]] = target;
    }
    id++;
  }
  return labels;
}

/** Filtre de mode 3x3 : adoucit les bords en escalier. */
export function smoothLabels(labels, w, h, passes = 1) {
  let src = labels;
  for (let pass = 0; pass < passes; pass++) {
    const out = new Int16Array(src);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const counts = new Map();
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const l = src[i + dy * w + dx];
            counts.set(l, (counts.get(l) || 0) + 1);
          }
        }
        let bl = src[i];
        let bc = counts.get(bl);
        for (const [l, c] of counts) if (c > bc) (bc = c), (bl = l);
        if (bc >= 5) out[i] = bl;
      }
    }
    src = out;
  }
  return src;
}
