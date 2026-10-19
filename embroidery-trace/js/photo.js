// Retouche de la photo avant réduction des couleurs.

/**
 * Luminosité / contraste (-100..100) et saturation (0..200 %).
 * @returns {Uint8ClampedArray} nouvelle copie des pixels
 */
export function adjustPixels(src, { brightness = 0, contrast = 0, saturation = 100 } = {}) {
  const out = new Uint8ClampedArray(src);
  if (!brightness && !contrast && saturation === 100) return out;
  const b = brightness * 2.55;
  const c = (259 * (contrast * 2.55 + 255)) / (255 * (259 - contrast * 2.55));
  const s = saturation / 100;
  for (let i = 0; i < out.length; i += 4) {
    let r = out[i];
    let g = out[i + 1];
    let bl = out[i + 2];
    const grey = 0.299 * r + 0.587 * g + 0.114 * bl;
    r = grey + (r - grey) * s;
    g = grey + (g - grey) * s;
    bl = grey + (bl - grey) * s;
    out[i] = c * (r + b - 128) + 128;
    out[i + 1] = c * (g + b - 128) + 128;
    out[i + 2] = c * (bl + b - 128) + 128;
  }
  return out;
}

/**
 * Photo -> dessin au trait (seuil adaptatif) : les zones plus sombres que
 * leur voisinage deviennent des traits noirs, le reste du blanc.
 * @param detail 1 (peu de traits) à 10 (beaucoup)
 */
export function sketchPixels(src, w, h, detail = 5) {
  const n = w * h;
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = src[i * 4 + 3] / 255;
    g[i] = (0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2]) * a + 255 * (1 - a);
  }
  // Moyenne locale par image intégrale.
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += g[y * w + x];
      I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row;
    }
  }
  const r = Math.max(4, Math.round(Math.min(w, h) / 60));
  const C = 26 - detail * 2;
  const out = new Uint8ClampedArray(n * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w, x + r + 1);
      const sum = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      const v = g[y * w + x] < mean - C || g[y * w + x] < 45 ? 20 : 255;
      out.set([v, v, v, 255], (y * w + x) * 4);
    }
  }
  return out;
}

/**
 * Photo -> illustration : filtre de Kuwahara (lisse les aplats en gardant
 * les bords nets). La réduction des couleurs donne alors de grandes zones
 * propres au lieu d'une multitude de petites taches.
 * @param passes nombre de passages (plus = plus « peint »)
 */
export function illustratePixels(src, w, h, passes = 2) {
  const r = Math.max(2, Math.round(Math.min(w, h) / 160));
  let cur = src;
  for (let p = 0; p < passes; p++) cur = kuwahara(cur, w, h, r);
  // Couleurs un peu plus franches : les teintes proches se séparent mieux en fils.
  return adjustPixels(cur, { saturation: 110 });
}

function kuwahara(src, w, h, r) {
  const W = w + 1;
  const n = W * (h + 1);
  // Images intégrales pondérées par l'opacité : le fond transparent ne déteint pas.
  const SA = new Float64Array(n);
  const SR = new Float64Array(n);
  const SG = new Float64Array(n);
  const SB = new Float64Array(n);
  const SQ = new Float64Array(n); // somme des carrés (r² + g² + b²)
  for (let y = 0; y < h; y++) {
    let a = 0;
    let rr = 0;
    let gg = 0;
    let bb = 0;
    let q = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const al = src[i + 3] / 255;
      a += al;
      rr += al * src[i];
      gg += al * src[i + 1];
      bb += al * src[i + 2];
      q += al * (src[i] * src[i] + src[i + 1] * src[i + 1] + src[i + 2] * src[i + 2]);
      const k = (y + 1) * W + x + 1;
      const u = y * W + x + 1;
      SA[k] = SA[u] + a;
      SR[k] = SR[u] + rr;
      SG[k] = SG[u] + gg;
      SB[k] = SB[u] + bb;
      SQ[k] = SQ[u] + q;
    }
  }
  const box = (S, x0, y0, x1, y1) => S[y1 * W + x1] - S[y0 * W + x1] - S[y1 * W + x0] + S[y0 * W + x0];
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      out[i + 3] = src[i + 3];
      if (src[i + 3] < 8) continue;
      let best = Infinity;
      let bx = null;
      // Quatre quarts autour du pixel : on prend la moyenne du plus uniforme.
      for (const [qx0, qy0, qx1, qy1] of [
        [x - r, y - r, x + 1, y + 1],
        [x, y - r, x + r + 1, y + 1],
        [x - r, y, x + 1, y + r + 1],
        [x, y, x + r + 1, y + r + 1],
      ]) {
        const x0 = Math.max(0, qx0);
        const y0 = Math.max(0, qy0);
        const x1 = Math.min(w, qx1);
        const y1 = Math.min(h, qy1);
        const a = box(SA, x0, y0, x1, y1);
        if (a < 0.5) continue;
        // Variance des trois couleurs : un roux et un vert de même clarté ne se mélangent pas.
        const mr = box(SR, x0, y0, x1, y1) / a;
        const mg = box(SG, x0, y0, x1, y1) / a;
        const mb = box(SB, x0, y0, x1, y1) / a;
        const v = box(SQ, x0, y0, x1, y1) / a - mr * mr - mg * mg - mb * mb;
        if (v < best) (best = v), (bx = [x0, y0, x1, y1, a]);
      }
      if (!bx) {
        out[i] = src[i];
        out[i + 1] = src[i + 1];
        out[i + 2] = src[i + 2];
        continue;
      }
      const [x0, y0, x1, y1, a] = bx;
      out[i] = box(SR, x0, y0, x1, y1) / a;
      out[i + 1] = box(SG, x0, y0, x1, y1) / a;
      out[i + 2] = box(SB, x0, y0, x1, y1) / a;
    }
  }
  return out;
}
