// Grand motif en plusieurs fois : découpe en morceaux qui tiennent chacun
// dans le cadre, avec des croix de repère pour aligner les morceaux.
// Module pur (sans DOM).

/** Polygone découpé par un rectangle (Sutherland–Hodgman). */
export function clipPolygon(poly, r) {
  let out = poly;
  const edges = [
    [(p) => p[0] >= r.x0, (a, b) => cut(a, b, 0, r.x0)],
    [(p) => p[0] <= r.x1, (a, b) => cut(a, b, 0, r.x1)],
    [(p) => p[1] >= r.y0, (a, b) => cut(a, b, 1, r.y0)],
    [(p) => p[1] <= r.y1, (a, b) => cut(a, b, 1, r.y1)],
  ];
  for (const [inside, inter] of edges) {
    if (!out.length) break;
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[(i + src.length - 1) % src.length];
      const b = src[i];
      if (inside(b)) {
        if (!inside(a)) out.push(inter(a, b));
        out.push(b);
      } else if (inside(a)) out.push(inter(a, b));
    }
  }
  return out;
}

function cut(a, b, axis, v) {
  const t = (v - a[axis]) / (b[axis] - a[axis]);
  return axis === 0 ? [v, a[1] + (b[1] - a[1]) * t] : [a[0] + (b[0] - a[0]) * t, v];
}

/** Tracé ouvert découpé par un rectangle : renvoie les morceaux à l'intérieur. */
export function clipPolyline(pts, r) {
  const inside = (p) => p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.y0 && p[1] <= r.y1;
  const parts = [];
  let cur = null;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i === 0) {
      if (inside(p)) cur = [p];
      continue;
    }
    const seg = clipSegment(pts[i - 1], p, r);
    if (!seg) {
      if (cur && cur.length > 1) parts.push(cur);
      cur = null;
      continue;
    }
    const [a, b] = seg;
    if (!cur) cur = [a];
    else if (Math.hypot(cur[cur.length - 1][0] - a[0], cur[cur.length - 1][1] - a[1]) > 1e-6) {
      if (cur.length > 1) parts.push(cur);
      cur = [a];
    }
    cur.push(b);
    if (!inside(p)) {
      if (cur.length > 1) parts.push(cur);
      cur = null;
    }
  }
  if (cur && cur.length > 1) parts.push(cur);
  return parts;
}

/** Liang–Barsky. */
function clipSegment(a, b, r) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [
    [-dx, a[0] - r.x0],
    [dx, r.x1 - a[0]],
    [-dy, a[1] - r.y0],
    [dy, r.y1 - a[1]],
  ]) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
  }
  if (t0 > t1) return null;
  return [
    [a[0] + dx * t0, a[1] + dy * t0],
    [a[0] + dx * t1, a[1] + dy * t1],
  ];
}

/**
 * Plan de découpe d'un motif de `w` × `h` mm pour un cadre `hoop` [largeur, hauteur].
 * `margin` : bord laissé libre dans le cadre ; `overlap` : chevauchement des morceaux.
 * @returns {{cols:number, rows:number, rotated:boolean, pieces:{x0,y0,x1,y1,col,row}[], cuts:{x0,y0,x1,y1}[]}|null}
 */
export function planPieces(w, h, hoop, { margin = 3, overlap = 1, maxPieces = 9 } = {}) {
  let best = null;
  for (const rotated of [false, true]) {
    const [hw, hh] = rotated ? [hoop[1], hoop[0]] : hoop;
    const uw = hw - 2 * margin - overlap;
    const uh = hh - 2 * margin - overlap;
    if (uw <= 10 || uh <= 10) continue;
    const cols = Math.ceil(w / uw);
    const rows = Math.ceil(h / uh);
    // Moins de morceaux d'abord, puis les morceaux les plus « carrés ».
    const score = cols * rows * 1000 + Math.abs(w / cols - h / rows);
    if (!best || score < best.score) best = { cols, rows, rotated, score };
  }
  if (!best || best.cols * best.rows > maxPieces) return null;
  const { cols, rows, rotated } = best;
  const pw = w / cols;
  const ph = h / rows;
  const pieces = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pieces.push({
        col: c,
        row: r,
        x0: c * pw - (c > 0 ? overlap / 2 : 0),
        x1: (c + 1) * pw + (c < cols - 1 ? overlap / 2 : 0),
        y0: r * ph - (r > 0 ? overlap / 2 : 0),
        y1: (r + 1) * ph + (r < rows - 1 ? overlap / 2 : 0),
      });
    }
  }
  const cuts = [];
  for (let c = 1; c < cols; c++) cuts.push({ x0: c * pw, y0: 0, x1: c * pw, y1: h });
  for (let r = 1; r < rows; r++) cuts.push({ x0: 0, y0: r * ph, x1: w, y1: r * ph });
  return { cols, rows, rotated, pieces, cuts, pw, ph };
}

/**
 * Croix de repère communes à deux morceaux voisins (en mm, repère du motif).
 * Deux croix par bord commun, à 6 mm des extrémités.
 */
export function sharedMarks(plan, a, b) {
  const A = plan.pieces[a];
  const B = plan.pieces[b];
  const marks = [];
  if (A.row === B.row && Math.abs(A.col - B.col) === 1) {
    const x = Math.max(A.col, B.col) * plan.pw;
    const y0 = A.row * plan.ph;
    const y1 = y0 + plan.ph;
    marks.push(...endsOf(y0, y1).map((y) => [x, y]));
  } else if (A.col === B.col && Math.abs(A.row - B.row) === 1) {
    const y = Math.max(A.row, B.row) * plan.ph;
    const x0 = A.col * plan.pw;
    const x1 = x0 + plan.pw;
    marks.push(...endsOf(x0, x1).map((x) => [x, y]));
  }
  return marks;
}

const endsOf = (a, b) => (b - a > 24 ? [a + 6, b - 6] : [(a + b) / 2]);

/** Croix de 6 mm en point droit (deux traits). */
export function crossRuns([x, y], size = 3, step = 1.5) {
  const line = (p, q) => {
    const n = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / step));
    return Array.from({ length: n + 1 }, (_, k) => [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n]);
  };
  // Un seul trajet : gauche → droite, retour au centre, haut → bas.
  const h = line([x - size, y], [x + size, y]);
  const back = line([x + size, y], [x, y]).slice(1);
  const v1 = line([x, y], [x, y - size]).slice(1);
  const v2 = line([x, y - size], [x, y + size]).slice(1);
  return [h.concat(back, v1, v2)];
}
