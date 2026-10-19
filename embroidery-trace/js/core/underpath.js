// Déplacements cachés : au lieu de sauter (et de couper le fil), l'aiguille
// chemine en petits points à l'intérieur de la couleur en cours ou sous les
// couleurs brodées plus tard, qui les recouvriront.
// Précieux sur les machines sans coupe-fil (bernette Chicago 7…).
// Coordonnées en mm.

const CELL = 0.3; // taille d'une case de la grille (mm)

/** Grille couvrant toutes les boucles (+ marge). */
export function makeGrid(loopSets) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const loops of loopSets) {
    for (const l of loops) {
      for (const [x, y] of l) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x0 === Infinity) return null;
  x0 -= 2 * CELL;
  y0 -= 2 * CELL;
  const gw = Math.ceil((x1 - x0) / CELL) + 4;
  const gh = Math.ceil((y1 - y0) / CELL) + 4;
  if (gw * gh > 4e6) return null; // motif démesuré : on s'abstient
  return { x0, y0, gw, gh };
}

/** Remplit (règle pair-impair) les boucles dans `mask`. */
export function rasterize(loops, g, mask) {
  const xs = [];
  for (let r = 0; r < g.gh; r++) {
    const y = g.y0 + (r + 0.5) * CELL;
    xs.length = 0;
    for (const l of loops) {
      for (let i = 0, j = l.length - 1; i < l.length; j = i++) {
        const [xi, yi] = l[i];
        const [xj, yj] = l[j];
        if (yi > y !== yj > y) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k] - g.x0) / CELL - 0.5));
      const c1 = Math.min(g.gw - 1, Math.floor((xs[k + 1] - g.x0) / CELL - 0.5));
      for (let c = c0; c <= c1; c++) mask[r * g.gw + c] = 1;
    }
  }
  return mask;
}

/** Rétrécit la zone de `n` cases : les déplacements restent loin des bords. */
export function erode(mask, g, n) {
  let src = mask;
  for (let k = 0; k < n; k++) {
    const out = new Uint8Array(src.length);
    for (let r = 1; r < g.gh - 1; r++) {
      for (let c = 1; c < g.gw - 1; c++) {
        const i = r * g.gw + c;
        out[i] = src[i] && src[i - 1] && src[i + 1] && src[i - g.gw] && src[i + g.gw] ? 1 : 0;
      }
    }
    src = out;
  }
  return src;
}

const cellOf = (g, p) => [Math.floor((p[0] - g.x0) / CELL), Math.floor((p[1] - g.y0) / CELL)];
const center = (g, c, r) => [g.x0 + (c + 0.5) * CELL, g.y0 + (r + 0.5) * CELL];

/** Case autorisée la plus proche (rayon de quelques cases), ou -1. */
function nearestFree(mask, g, p, radius = 4) {
  const [c, r] = cellOf(g, p);
  let best = -1;
  let bd = Infinity;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const cc = c + dc;
      const rr = r + dr;
      if (cc < 0 || rr < 0 || cc >= g.gw || rr >= g.gh || !mask[rr * g.gw + cc]) continue;
      const d = dc * dc + dr * dr;
      if (d < bd) (bd = d), (best = rr * g.gw + cc);
    }
  }
  return best;
}

/** Ligne droite entre deux cases entièrement dans la zone ? */
function lineFree(mask, g, a, b) {
  const [ac, ar] = [a % g.gw, Math.floor(a / g.gw)];
  const [bc, br] = [b % g.gw, Math.floor(b / g.gw)];
  const n = Math.max(Math.abs(bc - ac), Math.abs(br - ar)) * 2;
  for (let k = 1; k < n; k++) {
    const c = Math.round(ac + ((bc - ac) * k) / n);
    const r = Math.round(ar + ((br - ar) * k) / n);
    if (!mask[r * g.gw + c]) return false;
  }
  return true;
}

/**
 * Chemin de a à b qui reste dans `mask` (A* sur la grille, puis lissé).
 * @returns {number[][]|null} points intermédiaires puis b, en mm
 */
export function findPath(mask, g, a, b, { maxExpand = 60000, maxLen = Infinity } = {}) {
  const s = nearestFree(mask, g, a);
  const t = nearestFree(mask, g, b);
  if (s < 0 || t < 0) return null;
  const W = g.gw;
  const tc = t % W;
  const tr = Math.floor(t / W);
  const h = (i) => {
    const dc = Math.abs((i % W) - tc);
    const dr = Math.abs(Math.floor(i / W) - tr);
    return Math.max(dc, dr) + 0.414 * Math.min(dc, dr);
  };
  const cost = new Map([[s, 0]]);
  const from = new Map();
  // Tas binaire [f, i]
  const heap = [[h(s), s]];
  const pushH = (e) => {
    heap.push(e);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const popH = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  const steps = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [-1, -1, 1.414],
  ];
  let found = s === t;
  let expanded = 0;
  while (heap.length && !found) {
    const [f, i] = popH();
    const gi = cost.get(i);
    if (f - h(i) > gi + 1e-9) continue; // entrée périmée
    if (++expanded > maxExpand || gi * CELL > maxLen) return null;
    const c = i % W;
    const r = Math.floor(i / W);
    for (const [dc, dr, w] of steps) {
      const cc = c + dc;
      const rr = r + dr;
      if (cc < 0 || rr < 0 || cc >= W || rr >= g.gh) continue;
      const j = rr * W + cc;
      if (!mask[j]) continue;
      // Pas de coin coupé en diagonale.
      if (dc && dr && (!mask[r * W + cc] || !mask[rr * W + c])) continue;
      const ng = gi + w;
      if (ng < (cost.get(j) ?? Infinity)) {
        cost.set(j, ng);
        from.set(j, i);
        if (j === t) found = true;
        pushH([ng + h(j), j]);
      }
    }
  }
  if (!found) return null;
  const cells = [t];
  while (cells[cells.length - 1] !== s) cells.push(from.get(cells[cells.length - 1]));
  cells.reverse();
  // Lissage : on garde seulement les virages nécessaires.
  const keep = [cells[0]];
  let k = 0;
  while (k < cells.length - 1) {
    let far = k + 1;
    while (far + 1 < cells.length && lineFree(mask, g, cells[k], cells[far + 1])) far++;
    keep.push(cells[far]);
    k = far;
  }
  const pts = keep.map((i) => center(g, i % W, Math.floor(i / W)));
  pts.push(b);
  return pts;
}
