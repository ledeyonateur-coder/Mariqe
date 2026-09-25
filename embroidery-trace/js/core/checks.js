// Alertes de broderie : ce qui risque de mal se passer sur la machine.
// Coordonnées en 1/10 mm (celles du motif).

import { STITCH } from "./stitch.js";

/**
 * @returns {{kind:string, level:"warn"|"info", text:string, at:number[]|null}[]}
 */
export function checkPattern(pattern, { maxStitches = 60000 } = {}) {
  const out = [];
  const st = pattern.stitches;
  // 1. Points trop longs : ils s'accrochent et se détendent.
  const longs = [];
  for (let i = 1; i < st.length; i++) {
    const [x, y, c] = st[i];
    const [px, py, pc] = st[i - 1];
    if (c !== STITCH || pc !== STITCH) continue;
    const d = Math.hypot(x - px, y - py);
    if (d > 80) longs.push([(x + px) / 2, (y + py) / 2, d]);
  }
  if (longs.length) {
    longs.sort((a, b) => b[2] - a[2]);
    out.push({
      kind: "long",
      level: "warn",
      text: `${longs.length} point(s) de plus de 8 mm : ils risquent de s'accrocher. Réduisez la longueur de point ou passez la zone en remplissage.`,
      at: longs[0],
    });
  }
  // 2. Zones trop denses (trop de piqûres au même endroit : fil qui casse, tissu troué).
  const cell = 20; // 2 mm
  const grid = new Map();
  for (const [x, y, c] of st) {
    if (c !== STITCH) continue;
    const k = Math.floor(x / cell) * 100000 + Math.floor(y / cell);
    grid.set(k, (grid.get(k) || 0) + 1);
  }
  let worst = null;
  let dense = 0;
  for (const [k, n] of grid) {
    // Remplissage normal : ~15 à 25 piqûres par carré de 2 mm ; au-delà de 60, c'est trop.
    if (n > 60) {
      dense++;
      if (!worst || n > worst[1]) worst = [k, n];
    }
  }
  if (dense) {
    const kx = Math.floor(worst[0] / 100000);
    const ky = worst[0] - kx * 100000;
    out.push({
      kind: "dense",
      level: "warn",
      text: `${dense} zone(s) très dense(s) (couleurs superposées ou espacement trop serré) : risque de casser le fil. Augmentez l'espacement ou retirez une couleur cachée.`,
      at: [kx * cell + cell / 2, ky * cell + cell / 2],
    });
  }
  // 3. Motif très long à broder.
  const n = st.filter((s) => s[2] === STITCH).length;
  if (n > maxStitches) {
    out.push({ kind: "big", level: "info", text: `${n.toLocaleString("fr-FR")} points : broderie longue (plus d'une heure et demie). Réduisez la taille ou passez en contours.`, at: null });
  }
  return out;
}
