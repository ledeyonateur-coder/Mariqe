// Vectorisation : contour de chaque couleur -> polygones lissés.
// Même principe que tools/embroidery_trace.py (suivi des bords de pixels),
// puis lissage et simplification Ramer-Douglas-Peucker.

/**
 * Extrait toutes les boucles fermées du masque `labels === value`.
 * Chaque pixel (x,y) couvre [x,x+1]x[y,y+1] ; les bords intérieurs/extérieurs
 * (trous compris) tombent naturellement : remplissage en règle pair-impair.
 */
export function traceContours(labels, w, h, value) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && labels[y * w + x] === value;
  const W = w + 1;
  const size = W * (h + 1);
  // Au plus deux arêtes sortantes par sommet (cas des coins en diagonale).
  const outA = new Int32Array(size).fill(-1);
  const outB = new Int32Array(size).fill(-1);
  const starts = [];
  const addEdge = (x0, y0, x1, y1) => {
    const a = y0 * W + x0;
    const b = y1 * W + x1;
    if (outA[a] === -1) outA[a] = b;
    else outB[a] = b;
    starts.push(a);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (labels[y * w + x] !== value) continue;
      if (!inside(x, y - 1)) addEdge(x, y, x + 1, y);
      if (!inside(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1);
      if (!inside(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1);
      if (!inside(x - 1, y)) addEdge(x, y + 1, x, y);
    }
  }
  const take = (v) => {
    let n = outA[v];
    if (n !== -1) {
      outA[v] = outB[v];
      outB[v] = -1;
    }
    return n;
  };
  const loops = [];
  for (const s of starts) {
    if (outA[s] === -1) continue;
    const loop = [];
    let cur = s;
    for (;;) {
      loop.push([cur % W, Math.floor(cur / W)]);
      const nxt = take(cur);
      if (nxt === -1 || nxt === s) break;
      cur = nxt;
    }
    if (loop.length >= 4) loops.push(loop);
  }
  return loops;
}

/** Aire signée (formule du lacet). */
export function polygonArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1]);
  }
  return a / 2;
}

/** Remplace l'escalier de pixels par les milieux des segments (diagonales propres). */
function midpoints(loop) {
  const out = [];
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    out.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return out;
}

/** Lissage de Chaikin (courbe fermée). */
function chaikin(pts, iterations) {
  let p = pts;
  for (let it = 0; it < iterations; it++) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    p = out;
  }
  return p;
}

/** Ramer-Douglas-Peucker itératif sur polyligne ouverte. */
function rdpOpen(points, eps) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [i0, i1] = stack.pop();
    if (i1 <= i0 + 1) continue;
    const [x0, y0] = points[i0];
    const [x1, y1] = points[i1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const norm = Math.hypot(dx, dy);
    let bd = -1;
    let bi = -1;
    for (let i = i0 + 1; i < i1; i++) {
      const [px, py] = points[i];
      const d = norm === 0 ? Math.hypot(px - x0, py - y0) : Math.abs(dy * px - dx * py + x1 * y0 - y1 * x0) / norm;
      if (d > bd) (bd = d), (bi = i);
    }
    if (bd > eps) {
      keep[bi] = 1;
      stack.push([i0, bi], [bi, i1]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Simplification d'une boucle fermée (coupée en deux au point le plus éloigné). */
export function simplifyLoop(loop, eps) {
  if (loop.length < 4 || eps <= 0) return loop;
  let far = 0;
  let fd = -1;
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > fd) (fd = d), (far = i);
  }
  const a = rdpOpen(loop.slice(0, far + 1), eps);
  const b = rdpOpen(loop.slice(far).concat([loop[0]]), eps);
  return a.concat(b.slice(1, -1));
}

/**
 * Vectorise une couleur : boucles lissées et simplifiées, en pixels.
 * @returns {number[][][]} liste de boucles [[x,y],...]
 */
export function vectorizeLayer(labels, w, h, value, { smoothing = 1, simplify = 0.6, minLoopArea = 4 } = {}) {
  const raw = traceContours(labels, w, h, value);
  const loops = [];
  for (const loop of raw) {
    if (Math.abs(polygonArea(loop)) < minLoopArea) continue;
    let p = midpoints(loop);
    p = simplifyLoop(p, 0.35);
    if (smoothing > 0) p = chaikin(p, smoothing);
    p = simplifyLoop(p, simplify);
    if (p.length >= 3) loops.push(p);
  }
  return loops;
}

/** Boucles -> attribut `d` SVG. */
export function loopsToPath(loops, scale = 1, digits = 2) {
  return loops
    .map((l) => "M" + l.map(([x, y]) => `${(x * scale).toFixed(digits)},${(y * scale).toFixed(digits)}`).join("L") + "Z")
    .join("");
}
