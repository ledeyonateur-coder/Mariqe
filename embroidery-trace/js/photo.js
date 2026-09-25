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
