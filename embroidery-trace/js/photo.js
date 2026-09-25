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
