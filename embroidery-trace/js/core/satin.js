// Satin qui suit la forme : on calcule la ligne médiane (squelette) de la
// colonne, puis on coud en zigzag perpendiculairement à cette ligne. Les
// lettres courbes (O, C, S…) et les anneaux gardent ainsi des points bien
// orientés partout. Tout est en millimètres.

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function edgesOf(loops) {
  const e = [];
  for (const l of loops) for (let i = 0; i < l.length; i++) e.push([l[i], l[(i + 1) % l.length]]);
  return e;
}

export function insideLoops(p, loops) {
  let inside = false;
  for (const poly of loops) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Distance du point p au bord, le long de la direction d (rayon). */
function rayHit(p, d, edges, maxD) {
  let best = maxD;
  for (const [a, b] of edges) {
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const den = d[0] * ey - d[1] * ex;
    if (Math.abs(den) < 1e-12) continue;
    const wx = a[0] - p[0];
    const wy = a[1] - p[1];
    const t = (wx * ey - wy * ex) / den;
    const u = (wx * d[1] - wy * d[0]) / den;
    if (t > 1e-6 && t < best && u >= 0 && u <= 1) best = t;
  }
  return best < maxD ? best : null;
}

/** Rasterise les boucles (pair-impair) sur une grille de pas `res`. */
function rasterize(loops, res) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const l of loops) for (const [x, y] of l) (x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y));
  x0 -= 2 * res;
  y0 -= 2 * res;
  const w = Math.ceil((x1 - x0) / res) + 3;
  const h = Math.ceil((y1 - y0) / res) + 3;
  const grid = new Uint8Array(w * h);
  const edges = edgesOf(loops);
  for (let r = 0; r < h; r++) {
    const y = y0 + (r + 0.5) * res;
    const xs = [];
    for (const [a, b] of edges) {
      if (a[1] > y !== b[1] > y) xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const c0 = Math.max(0, Math.ceil((xs[i] - x0) / res - 0.5));
      const c1 = Math.min(w - 1, Math.floor((xs[i + 1] - x0) / res - 0.5));
      for (let c = c0; c <= c1; c++) grid[r * w + c] = 1;
    }
  }
  return { grid, w, h, x0, y0, res };
}

/** Amincissement de Zhang-Suen : squelette d'un pixel de large. */
function thin(grid, w, h) {
  const g = grid;
  let changed = true;
  const del = [];
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x]);
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (!g[y * w + x]) continue;
          const p = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
          const B = p.reduce((s, v) => s + v, 0);
          if (B < 2 || B > 6) continue;
          let A = 0;
          for (let i = 0; i < 8; i++) if (!p[i] && p[(i + 1) % 8]) A++;
          if (A !== 1) continue;
          if (pass === 0 ? p[0] * p[2] * p[4] || p[2] * p[4] * p[6] : p[0] * p[2] * p[6] || p[0] * p[4] * p[6]) continue;
          del.push(y * w + x);
        }
      }
      for (const i of del) g[i] = 0;
      if (del.length) changed = true;
    }
  }
  return g;
}

const N8 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Découpe le squelette en branches (listes de pixels) entre extrémités et jonctions. */
function branches(sk, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : sk[y * w + x]);
  const nb = (i) => {
    const x = i % w;
    const y = (i - x) / w;
    const out = [];
    // Voisins 4-connexes d'abord : le chemin suit l'escalier sans le couper.
    for (const [dx, dy] of N8) if (at(x + dx, y + dy)) out.push((y + dy) * w + x + dx);
    return out;
  };
  // Nombre de passages 0->1 autour du pixel : 1 = extrémité, 2 = milieu de
  // ligne (même dans un escalier), 3 ou plus = jonction.
  const crossings = (i) => {
    const x = i % w;
    const y = (i - x) / w;
    const ring = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
    let a = 0;
    for (let k = 0; k < 8; k++) if (!ring[k] && ring[(k + 1) % 8]) a++;
    return a;
  };
  const nodes = new Set();
  const pixels = [];
  for (let i = 0; i < sk.length; i++) {
    if (!sk[i]) continue;
    pixels.push(i);
    if (crossings(i) !== 2) nodes.add(i);
  }
  const visited = new Set();
  const usedNodeEdge = new Set();
  const key = (a, b) => (a < b ? a * 1e7 + b : b * 1e7 + a);
  const result = [];
  const walk = (start, next) => {
    const path = [start];
    let prev = start;
    let cur = next;
    for (;;) {
      path.push(cur);
      if (cur === start || nodes.has(cur)) break;
      visited.add(cur);
      const cand = nb(cur).filter((n) => n !== prev && (n === start || nodes.has(n) || !visited.has(n)));
      if (!cand.length) break;
      // Évite de revenir sur le départ trop tôt (ferme la boucle seulement à la fin).
      const n = cand.find((c) => c !== start && !nodes.has(c)) ?? cand[0];
      if (nodes.has(n) || n === start) usedNodeEdge.add(key(cur, n));
      prev = cur;
      cur = n;
    }
    return path;
  };
  for (const s of nodes) {
    for (const n of nb(s)) {
      if (nodes.has(n)) {
        if (!usedNodeEdge.has(key(s, n))) (usedNodeEdge.add(key(s, n)), result.push([s, n]));
      } else if (!visited.has(n)) {
        usedNodeEdge.add(key(s, n));
        result.push(walk(s, n));
      }
    }
  }
  // Boucles fermées sans extrémité ni jonction (anneau, lettre O).
  for (const i of pixels) {
    if (visited.has(i) || nodes.has(i)) continue;
    visited.add(i);
    const ns = nb(i).filter((n) => !visited.has(n));
    if (ns.length) result.push(walk(i, ns[0]));
  }
  return { result, nodes, nb };
}

function smooth(pts, k = 3) {
  if (pts.length < 5) return pts;
  const closed = dist(pts[0], pts[pts.length - 1]) < 1e-9;
  const n = pts.length;
  return pts.map((p, i) => {
    if (!closed && (i === 0 || i === n - 1)) return p;
    let sx = 0;
    let sy = 0;
    let c = 0;
    for (let j = -k; j <= k; j++) {
      let q = i + j;
      if (closed) q = (q + n - 1) % (n - 1);
      else if (q < 0 || q >= n) continue;
      sx += pts[q][0];
      sy += pts[q][1];
      c++;
    }
    return [sx / c, sy / c];
  });
}

function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = dist(a, b);
    let t = step - carry;
    while (t <= d) {
      out.push([a[0] + ((b[0] - a[0]) * t) / d, a[1] + ((b[1] - a[1]) * t) / d]);
      t += step;
    }
    carry = d - (t - step);
  }
  if (dist(out[out.length - 1], pts[pts.length - 1]) > step * 0.3) out.push(pts[pts.length - 1]);
  return out;
}

function tangentAt(path, i) {
  const a = path[Math.max(0, i - 3)];
  const b = path[Math.min(path.length - 1, i + 3)];
  const d = dist(a, b) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
}

/** Prolonge une extrémité libre jusqu'au bord, pour couvrir le bout de la colonne. */
function extendEnd(path, loops, step, backward) {
  const p = backward ? path[0] : path[path.length - 1];
  const t0 = tangentAt(path, backward ? 0 : path.length - 1);
  const t = backward ? [-t0[0], -t0[1]] : t0;
  const ext = [];
  for (let s = step; s < 12; s += step) {
    const q = [p[0] + t[0] * s, p[1] + t[1] * s];
    if (!insideLoops(q, loops)) break;
    ext.push(q);
  }
  return backward ? ext.reverse().concat(path) : path.concat(ext);
}

/**
 * Satin en colonne(s) suivant la forme.
 * @returns {number[][][]|null} runs, ou null si la forme ne s'y prête pas
 */
export function columnSatinRuns(loops, { density = 0.4, pullComp = 0.2, underlay = true, maxHalf = 6, maxStitch = 8 } = {}) {
  let area = 0;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const l of loops) for (const [x, y] of l) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
  area = (x1 - x0) * (y1 - y0);
  let res = 0.12;
  while (area / (res * res) > 1.5e6) res *= 1.4;
  const { grid, w, h, x0: gx, y0: gy } = rasterize(loops, res);
  const sk = thin(grid, w, h);
  const { result, nb } = branches(sk, w, h);
  if (!result.length) return null;
  const edges = edgesOf(loops);
  const toMm = (i) => {
    const x = i % w;
    const y = (i - x) / w;
    return [gx + (x + 0.5) * res, gy + (y + 0.5) * res];
  };
  // Largeur typique : sert à éliminer les petits éperons du squelette.
  const halfWidths = [];
  const paths = result
    .filter((b) => b.length >= 2)
    .map((b) => {
      const p = b.map(toMm);
      // Branche terminale : une de ses extrémités est un bout libre du squelette.
      const terminal = nb(b[0]).length === 1 || nb(b[b.length - 1]).length === 1;
      return { p, terminal, len: p.reduce((s, q, i) => (i ? s + dist(p[i - 1], q) : 0), 0) };
    });
  for (const { p } of paths) {
    const m = p[Math.floor(p.length / 2)];
    const t = tangentAt(p, Math.floor(p.length / 2));
    const n = [-t[1], t[0]];
    const a = rayHit(m, n, edges, maxHalf);
    const b = rayHit(m, [-n[0], -n[1]], edges, maxHalf);
    if (a && b) halfWidths.push((a + b) / 2);
  }
  halfWidths.sort((a, b) => a - b);
  const hw = halfWidths[Math.floor(halfWidths.length / 2)] || 1;
  // Les petits éperons (coins, bouts plats) sont couverts par le prolongement
  // de la branche principale : on les écarte.
  const longest = Math.max(...paths.map((q) => q.len));
  const kept = paths.filter(({ len, terminal }) => len === longest || len > hw * (terminal ? 3 : 1.2));
  if (!kept.length) return null;

  const runs = [];
  const step = density / 2;
  for (const { p } of kept) {
    const closed = dist(p[0], p[p.length - 1]) < res * 2;
    let path = resample(smooth(p), step);
    if (!closed) {
      path = extendEnd(path, loops, step, true);
      path = extendEnd(path, loops, step, false);
    }
    if (path.length < 3) continue;
    const pts = [];
    let side = 1;
    for (let i = 0; i < path.length; i++) {
      const t = tangentAt(path, i);
      const n = [-t[1], t[0]];
      const dir = side > 0 ? n : [-n[0], -n[1]];
      const d = rayHit(path[i], dir, edges, maxHalf);
      if (d === null) continue;
      const e = Math.min(d + pullComp / 2, maxHalf);
      pts.push([path[i][0] + dir[0] * e, path[i][1] + dir[1] * e]);
      side = -side;
    }
    if (pts.length < 3) continue;
    // Découpe les points trop longs (colonnes larges).
    const sat = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = sat[sat.length - 1];
      const b = pts[i];
      const k = Math.max(1, Math.ceil(dist(a, b) / maxStitch));
      for (let j = 1; j <= k; j++) sat.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
    }
    if (underlay) {
      // Sous-couche centrale : aller le long de l'axe, puis satin au retour.
      const walk = resample(path, 2);
      runs.push(walk.concat(sat.slice().reverse()));
    } else {
      runs.push(sat);
    }
  }
  return runs.length ? runs : null;
}

/**
 * Bordure satin centrée sur un contour (appliqué, liseré).
 * @param width largeur de la bordure en mm
 */
export function borderSatinRuns(loops, { width = 2.5, density = 0.4 } = {}) {
  const runs = [];
  for (const loop of loops) {
    const path = resample(loop.concat([loop[0]]), density / 2);
    if (path.length < 4) continue;
    const pts = [];
    path.forEach((q, i) => {
      const t = tangentAt(path, i);
      const n = [-t[1], t[0]];
      const s = i % 2 ? 1 : -1;
      pts.push([q[0] + (n[0] * s * width) / 2, q[1] + (n[1] * s * width) / 2]);
    });
    runs.push(pts);
  }
  return runs;
}
