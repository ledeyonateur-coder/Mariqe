// Génération des points de broderie : remplissage (tatami), satin, point droit.
// Toutes les coordonnées ici sont en millimètres.

import { columnSatinRuns, borderSatinRuns, insideLoops } from "./satin.js";

export const STITCH = 0;
export const JUMP = 1;
export const TRIM = 2;
export const END = 4;
export const COLOR_CHANGE = 5;

export const STITCH_TYPES = {
  auto: "Auto",
  fill: "Remplissage",
  satin: "Satin",
  running: "Point droit",
  applique: "Appliqué",
  none: "Ignorer",
};

export const DEFAULT_LAYER = {
  type: "auto",
  angle: 45, // degrés ; null = automatique (satin)
  density: 0.4, // mm entre deux rangs (satin : entre deux pointes du même côté)
  stitchLength: 3, // longueur max d'un point de remplissage / point droit
  pullComp: 0.2, // compensation d'étirement (mm ajoutés aux extrémités)
  underlay: true,
  outline: false, // contour en point droit par-dessus le remplissage
  triple: false, // point droit triple (point haricot)
};

const rot = (p, c, s) => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c];
const unrot = (p, c, s) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Découpe les polygones en segments horizontaux (dans le repère tourné). */
function scanSegments(loops, angleDeg, spacing) {
  const a = (angleDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const edges = [];
  let ymin = Infinity;
  let ymax = -Infinity;
  for (const loop of loops) {
    const r = loop.map((p) => rot(p, c, s));
    for (let i = 0; i < r.length; i++) {
      const p = r[i];
      const q = r[(i + 1) % r.length];
      if (p[1] === q[1]) continue;
      edges.push(p[1] < q[1] ? [p[0], p[1], q[0], q[1]] : [q[0], q[1], p[0], p[1]]);
      ymin = Math.min(ymin, p[1], q[1]);
      ymax = Math.max(ymax, p[1], q[1]);
    }
  }
  const rows = [];
  if (!edges.length) return { rows, c, s };
  edges.sort((e1, e2) => e1[1] - e2[1]);
  let r = 0;
  for (let y = ymin + spacing / 2; y < ymax; y += spacing, r++) {
    const xs = [];
    for (const e of edges) {
      if (e[1] > y) break;
      if (e[3] > y) xs.push(e[0] + ((y - e[1]) * (e[2] - e[0])) / (e[3] - e[1]));
    }
    xs.sort((m, n) => m - n);
    const segs = [];
    for (let i = 0; i + 1 < xs.length; i += 2) {
      if (xs[i + 1] - xs[i] > 0.05) segs.push({ r, y, x0: xs[i], x1: xs[i + 1], used: false });
    }
    rows.push(segs);
  }
  return { rows, c, s };
}

/**
 * Ordonne les segments en groupes continus (aller-retour rang par rang).
 * Un nouveau groupe = un déplacement (saut) nécessaire.
 */
function orderSegments(rows, spacing) {
  const all = rows.flat();
  let remaining = all.length;
  const groups = [];
  let cur = null;
  let pos = null;
  let dir = 1;
  let group = null;
  // Au-delà, relier deux rangs traverserait un trou : on préfère un saut.
  const maxLink = Math.max(1.2, spacing * 3);
  while (remaining > 0) {
    let next = null;
    if (cur) {
      for (const d of [dir, -dir]) {
        const row = rows[cur.r + d];
        if (!row) continue;
        let best = Infinity;
        for (const sg of row) {
          if (sg.used) continue;
          const ov = Math.min(sg.x1, cur.x1) - Math.max(sg.x0, cur.x0);
          if (ov <= 0) continue;
          const reach = Math.min(Math.abs(sg.x0 - pos[0]), Math.abs(sg.x1 - pos[0]));
          if (reach < maxLink && reach < best) (best = reach), (next = sg);
        }
        if (next) {
          dir = d;
          break;
        }
      }
    }
    if (!next) {
      // Saut vers le segment libre le plus proche.
      let bd = Infinity;
      for (const sg of all) {
        if (sg.used) continue;
        const d = pos ? Math.min(Math.hypot(sg.x0 - pos[0], sg.y - pos[1]), Math.hypot(sg.x1 - pos[0], sg.y - pos[1])) : sg.r;
        if (d < bd) (bd = d), (next = sg);
      }
      group = [];
      groups.push(group);
      dir = 1;
    }
    next.used = true;
    remaining--;
    const forward = !pos || Math.abs(next.x0 - pos[0]) <= Math.abs(next.x1 - pos[0]);
    const from = forward ? next.x0 : next.x1;
    const to = forward ? next.x1 : next.x0;
    group.push({ r: next.r, y: next.y, from, to });
    pos = [to, next.y];
    cur = next;
  }
  return groups;
}

// Décalage des perforations d'un rang à l'autre : évite les lignes visibles.
const TATAMI_OFFSETS = [0, 0.5, 0.25, 0.75];

function splitRun(xa, xb, L, off) {
  const lo = Math.min(xa, xb);
  const hi = Math.max(xa, xb);
  const vals = [];
  for (let x = Math.ceil((lo - off) / L) * L + off; x < hi; x += L) {
    if (x - lo > L * 0.3 && hi - x > L * 0.3) vals.push(x);
  }
  if (xa > xb) vals.reverse();
  return [xa, ...vals, xb];
}

/** Remplissage tatami : renvoie une liste de "runs" (suites de points cousus). */
function fillRuns(loops, angle, spacing, L, pullComp, inset = 0) {
  const { rows, c, s } = scanSegments(loops, angle, spacing);
  for (const row of rows) {
    for (let i = row.length - 1; i >= 0; i--) {
      const sg = row[i];
      const len = sg.x1 - sg.x0;
      if (inset > 0) {
        if (len < 2 * inset + 0.5) row.splice(i, 1);
        else (sg.x0 += inset), (sg.x1 -= inset);
      } else if (pullComp > 0 && len > 1) {
        sg.x0 -= pullComp / 2;
        sg.x1 += pullComp / 2;
      }
    }
  }
  return orderSegments(rows, spacing).map((group) => {
    const pts = [];
    for (const sg of group) {
      const off = TATAMI_OFFSETS[sg.r % 4] * L;
      for (const x of splitRun(sg.from, sg.to, L, off)) pts.push(unrot([x, sg.y], c, s));
    }
    return pts;
  });
}

/** Satin : zigzag d'un bord à l'autre, perpendiculaire à l'axe de la forme. */
function satinRuns(loops, angle, density, pullComp, maxLen = 7) {
  const { rows, c, s } = scanSegments(loops, angle, density / 2);
  for (const row of rows) {
    for (const sg of row) {
      if (sg.x1 - sg.x0 > 0.8) (sg.x0 -= pullComp / 2), (sg.x1 += pullComp / 2);
    }
  }
  return orderSegments(rows, 0.7).map((group) => {
    const pts = [unrot([group[0].from, group[0].y], c, s)];
    for (const sg of group) {
      const target = unrot([sg.to, sg.y], c, s);
      const prev = pts[pts.length - 1];
      const n = Math.max(1, Math.ceil(dist(prev, target) / maxLen));
      for (let k = 1; k <= n; k++) {
        pts.push([prev[0] + ((target[0] - prev[0]) * k) / n, prev[1] + ((target[1] - prev[1]) * k) / n]);
      }
    }
    return pts;
  });
}

/** Point droit le long des contours (option triple = point haricot). */
function runningRuns(loops, L, triple) {
  const runs = [];
  for (const loop of loops) {
    const pts = [loop[0]];
    const closed = loop.concat([loop[0]]);
    for (let i = 1; i < closed.length; i++) {
      const a = closed[i - 1];
      const b = closed[i];
      const n = Math.max(1, Math.ceil(dist(a, b) / L));
      for (let k = 1; k <= n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    if (!triple) {
      runs.push(pts);
      continue;
    }
    const t = [pts[0]];
    for (let i = 1; i < pts.length; i++) t.push(pts[i], pts[i - 1], pts[i]);
    runs.push(t);
  }
  return runs;
}

/** Angle de l'axe principal d'une forme (analyse en composantes principales). */
export function principalAngle(loops) {
  let n = 0;
  let mx = 0;
  let my = 0;
  for (const l of loops) for (const p of l) (mx += p[0]), (my += p[1]), n++;
  if (!n) return 0;
  mx /= n;
  my /= n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const l of loops) {
    for (const p of l) {
      const dx = p[0] - mx;
      const dy = p[1] - my;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
  }
  return (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI;
}

/** Retire les points trop rapprochés (< minLen) : la machine casserait le fil. */
function dedupe(run, minLen) {
  const out = [run[0]];
  for (let i = 1; i < run.length; i++) {
    if (dist(run[i], out[out.length - 1]) >= minLen || i === run.length - 1) out.push(run[i]);
  }
  if (out.length > 2 && dist(out[out.length - 1], out[out.length - 2]) < minLen) out.splice(out.length - 2, 1);
  return out;
}

/** Angle effectif d'un calque (automatique si non renseigné). */
export function effectiveAngle(loops, cfg) {
  if (cfg.angle !== null && cfg.angle !== undefined && cfg.angle !== "") return Number(cfg.angle);
  if (cfg.type === "satin") return principalAngle(loops) + 90;
  return 45;
}

function signedArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1]);
  return a / 2;
}

function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function perimeter(pts) {
  let p = 0;
  for (let i = 0; i < pts.length; i++) p += dist(pts[i], pts[(i + 1) % pts.length]);
  return p;
}

/** Regroupe les boucles en formes : un contour extérieur + ses trous. */
export function groupRegions(loops) {
  if (!loops.length) return [];
  const areas = loops.map(signedArea);
  let big = 0;
  areas.forEach((a, i) => Math.abs(a) > Math.abs(areas[big]) && (big = i));
  const outerSign = Math.sign(areas[big]);
  const regions = [];
  const holes = [];
  loops.forEach((l, i) => (Math.sign(areas[i]) === outerSign ? regions.push({ outer: l, area: Math.abs(areas[i]), loops: [l] }) : holes.push(i)));
  for (const hi of holes) {
    const p = loops[hi][0];
    let host = null;
    for (const r of regions) if (pointInPolygon(p, r.outer) && (!host || r.area < host.area)) host = r;
    if (host) host.loops.push(loops[hi]);
  }
  return regions;
}

/** Largeur moyenne d'une forme (2 x aire / périmètre), en mm. */
export function regionWidth(region) {
  const area = region.loops.reduce((s, l) => s + Math.abs(signedArea(l)) * (l === region.outer ? 1 : -1), 0);
  const per = region.loops.reduce((s, l) => s + perimeter(l), 0);
  return per > 0 ? (2 * area) / per : 0;
}

export const AUTO_SATIN_MAX_WIDTH = 3.5;

/**
 * Points d'un calque. `loops` en mm.
 * @returns {number[][][]} runs
 */
export function layerRuns(loops, cfg) {
  const c = { ...DEFAULT_LAYER, ...cfg };
  if (!loops.length || c.type === "none") return [];
  if (c.type === "auto") {
    // Satin automatique : les formes étroites en satin (angle propre à chaque
    // forme), les grandes surfaces en remplissage.
    const runs = [];
    for (const region of groupRegions(loops)) {
      const w = regionWidth(region);
      const type = w < 0.6 ? "running" : w <= AUTO_SATIN_MAX_WIDTH ? "satin" : "fill";
      const sub = { ...c, type, angle: type === "satin" ? null : c.angle };
      if (type === "satin") sub.density = Math.min(c.density, 0.4);
      runs.push(...layerRuns(region.loops, sub));
    }
    return runs;
  }
  const angle = effectiveAngle(loops, c);
  let runs = [];
  if (c.type === "fill") {
    if (c.underlay) runs.push(...fillRuns(loops, angle + 90, 2.2, 3.5, 0, 0.45));
    runs.push(...fillRuns(loops, angle, c.density, c.stitchLength, c.pullComp));
    if (c.outline) runs.push(...runningRuns(loops, 2.5, false));
  } else if (c.type === "satin") {
    // Angle automatique : satin qui suit la forme (colonnes courbes),
    // sinon angle fixe choisi par l'utilisateur.
    const column =
      c.angle === null || c.angle === undefined || c.angle === ""
        ? columnSatinRuns(loops, { density: c.density, pullComp: c.pullComp, underlay: c.underlay })
        : null;
    if (column) {
      runs.push(...column);
    } else {
      if (c.underlay) runs.push(...fillRuns(loops, angle + 90, 1.6, 3, 0, 0.35));
      runs.push(...satinRuns(loops, angle, c.density, c.pullComp));
    }
  } else if (c.type === "running") {
    runs.push(...runningRuns(loops, c.stitchLength, c.triple));
  } else if (c.type === "applique") {
    // Les trois étapes de l'appliqué (voir appliqueSteps) ; ici : bordure seule.
    runs.push(...borderSatinRuns(loops, { width: 2.5, density: Math.min(c.density, 0.4) }));
  }
  return runs.map((r) => dedupe(r, 0.3)).filter((r) => r.length > 1);
}

/**
 * Appliqué en trois passages, séparés par un arrêt machine :
 * 1. ligne de placement, 2. fixation du tissu posé, 3. bordure satin.
 */
export function appliqueSteps(loops, cfg) {
  const c = { ...DEFAULT_LAYER, ...cfg };
  return [
    { step: "placement", runs: runningRuns(loops, 2.5, false) },
    { step: "fixation", runs: runningRuns(loops, 2, false).map((r) => r.concat(r.slice(0, -1).reverse())) },
    { step: "bordure", runs: borderSatinRuns(loops, { width: 2.5, density: Math.min(c.density, 0.4) }) },
  ].map((s) => ({ ...s, runs: s.runs.map((r) => dedupe(r, 0.3)).filter((r) => r.length > 1) }));
}

/** Point le plus proche sur une boucle : [index du segment, t, distance]. */
function nearestOnLoop(p, loop) {
  let best = [0, 0, Infinity];
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const l2 = ex * ex + ey * ey || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / l2));
    const d = Math.hypot(a[0] + ex * t - p[0], a[1] + ey * t - p[1]);
    if (d < best[2]) best = [i, t, d];
  }
  return best;
}

/**
 * Chemin de déplacement cousu à l'intérieur de la forme, pour éviter un
 * saut + coupe de fil (précieux sur les machines sans coupe-fil).
 * Ligne droite si elle reste dans la forme, sinon le long du contour.
 * @returns {number[][]|null}
 */
export function travelPath(a, b, loops, maxLen = 60) {
  if (!loops || !loops.length) return null;
  const d = dist(a, b);
  const straightInside = () => {
    const n = Math.ceil(d / 0.4);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (t * d < 0.5 || (1 - t) * d < 0.5) continue; // extrémités posées sur le bord
      if (!insideLoops([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], loops)) return false;
    }
    return true;
  };
  if (straightInside()) return [b];
  // Le long du contour commun aux deux points.
  for (const loop of loops) {
    const [ia, ta, da] = nearestOnLoop(a, loop);
    const [ib, tb, db] = nearestOnLoop(b, loop);
    if (da > 1 || db > 1) continue;
    const n = loop.length;
    const measure = (pts) => {
      let len = 0;
      let prev = a;
      for (const q of pts) (len += dist(prev, q)), (prev = q);
      return { pts, len };
    };
    const forward = () => {
      if (ia === ib && tb >= ta) return measure([b]);
      const pts = [];
      for (let i = (ia + 1) % n, g = 0; g <= n; g++, i = (i + 1) % n) {
        pts.push(loop[i]);
        if (i === ib) break;
      }
      return measure(pts.concat([b]));
    };
    const backward = () => {
      if (ia === ib && tb <= ta) return measure([b]);
      const pts = [];
      for (let i = ia, g = 0; g <= n; g++, i = (i - 1 + n) % n) {
        pts.push(loop[i]);
        if (i === (ib + 1) % n) break;
      }
      return measure(pts.concat([b]));
    };
    const f = forward();
    const r = backward();
    const best = f.len <= r.len ? f : r;
    if (best.len <= maxLen) return best.pts;
  }
  return null;
}

/** Découpe un chemin en points de longueur <= step. */
function splitPath(from, pts, step) {
  const out = [];
  let prev = from;
  for (const q of pts) {
    const n = Math.max(1, Math.ceil(dist(prev, q) / step));
    for (let k = 1; k <= n; k++) out.push([prev[0] + ((q[0] - prev[0]) * k) / n, prev[1] + ((q[1] - prev[1]) * k) / n]);
    prev = q;
  }
  return out;
}

/**
 * Assemble tous les calques en un motif machine.
 * @param {{color:string,name:string,runs:number[][][]}[]} layers  runs en mm
 * @returns {{stitches:number[][], threads:{color:string,name:string}[], origin:number[], stats:object}}
 *   stitches = [x, y, commande] en 1/10 mm, centrés sur (0,0)
 */
export function buildPattern(layers, { tieStitches = true, trimDistance = 3, maxDelta = 121, travel = true } = {}) {
  const cmds = [];
  let cur = null;
  const push = (p, c) => {
    cmds.push([p[0], p[1], c]);
    cur = p;
  };
  const tieOff = () => {
    if (!tieStitches || cmds.length < 2) return;
    const a = cmds[cmds.length - 2];
    const b = cmds[cmds.length - 1];
    if (a[2] !== STITCH || b[2] !== STITCH) return;
    const d = dist(a, b) || 1;
    const u = [(a[0] - b[0]) / d, (a[1] - b[1]) / d];
    push([b[0] + u[0] * 0.5, b[1] + u[1] * 0.5], STITCH);
    push([b[0], b[1]], STITCH);
  };
  const threads = [];
  const layerStats = [];
  for (const layer of layers) {
    const runs = layer.runs.filter((r) => r.length > 1);
    if (!runs.length) continue;
    if (threads.length) {
      tieOff();
      push(cur, TRIM);
      push(cur, COLOR_CHANGE);
    }
    threads.push({ color: layer.color, name: layer.name });
    let count = 0;
    let length = 0;
    runs.forEach((run, ri) => {
      let needJump = ri === 0 || !cur || dist(cur, run[0]) > trimDistance;
      if (needJump && ri > 0 && cur && travel && layer.loops) {
        // Déplacement cousu à l'intérieur de la forme plutôt qu'une coupe.
        const path = travelPath(cur, run[0], layer.loops);
        if (path) {
          for (const q of splitPath(cur, path, 2.5)) {
            length += dist(cur, q);
            push(q, STITCH);
            count++;
          }
          needJump = false;
        }
      }
      if (needJump) {
        if (ri > 0) {
          tieOff();
          push(cur, TRIM);
        }
        push(run[0], JUMP);
        push(run[0], STITCH);
        if (tieStitches && run.length > 1) {
          const d = dist(run[0], run[1]) || 1;
          const u = [(run[1][0] - run[0][0]) / d, (run[1][1] - run[0][1]) / d];
          push([run[0][0] + u[0] * 0.5, run[0][1] + u[1] * 0.5], STITCH);
          push(run[0], STITCH);
        }
      } else {
        length += dist(cur, run[0]);
        push(run[0], STITCH);
        count++;
      }
      for (let i = 1; i < run.length; i++) {
        length += dist(run[i - 1], run[i]);
        push(run[i], STITCH);
        count++;
      }
    });
    layerStats.push({ color: layer.color, name: layer.name, stitches: count, lengthMm: length });
  }
  if (cur) {
    tieOff();
    push(cur, TRIM);
  }

  // Centrage et conversion en 1/10 mm.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y, c] of cmds) {
    if (c !== STITCH) continue;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (minX === Infinity) minX = minY = maxX = maxY = 0;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const stitches = [];
  let px = 0;
  let py = 0;
  for (const [x, y, c] of cmds) {
    const tx = Math.round((x - cx) * 10);
    const ty = Math.round((y - cy) * 10);
    if (c === STITCH || c === JUMP) {
      // Découpe des déplacements trop longs pour les formats à 1 octet.
      const n = Math.ceil(Math.max(Math.abs(tx - px), Math.abs(ty - py)) / maxDelta);
      for (let k = 1; k < n; k++) {
        stitches.push([Math.round(px + ((tx - px) * k) / n), Math.round(py + ((ty - py) * k) / n), c]);
      }
      stitches.push([tx, ty, c]);
      px = tx;
      py = ty;
    } else {
      stitches.push([px, py, c]);
    }
  }
  stitches.push([px, py, END]);

  const count = (c) => stitches.reduce((n, s) => n + (s[2] === c ? 1 : 0), 0);
  const stitchCount = count(STITCH);
  const trims = count(TRIM);
  const colorChanges = count(COLOR_CHANGE);
  return {
    stitches,
    threads,
    origin: [cx, cy],
    stats: {
      stitchCount,
      jumps: count(JUMP),
      trims,
      colorChanges,
      colors: threads.length,
      widthMm: maxX - minX,
      heightMm: maxY - minY,
      // ~650 points/min + ~30 s par changement de fil + 4 s par coupe
      minutes: stitchCount / 650 + colorChanges * 0.5 + (trims * 4) / 60,
      layers: layerStats,
    },
  };
}

/** Limites [minX, minY, maxX, maxY] des points cousus (1/10 mm). */
export function patternBounds(stitches) {
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of stitches) {
    b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)];
  }
  if (b[0] === Infinity) return [0, 0, 0, 0];
  return b;
}

/**
 * Motif recentré et mis à l'échelle (fichier de broderie importé).
 * Les déplacements trop longs sont redécoupés pour rester lisibles partout.
 */
export function scalePattern(stitches, scale, maxDelta = 121) {
  const [x0, y0, x1, y1] = patternBounds(stitches.filter((s) => s[2] === STITCH));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const out = [];
  let px = 0;
  let py = 0;
  for (const [x, y, c] of stitches) {
    const tx = Math.round((x - cx) * scale);
    const ty = Math.round((y - cy) * scale);
    if (c === STITCH || c === JUMP) {
      const n = Math.ceil(Math.max(Math.abs(tx - px), Math.abs(ty - py)) / maxDelta);
      for (let k = 1; k < n; k++) out.push([Math.round(px + ((tx - px) * k) / n), Math.round(py + ((ty - py) * k) / n), c]);
      out.push([tx, ty, c]);
      px = tx;
      py = ty;
    } else out.push([px, py, c]);
  }
  if (!out.length || out[out.length - 1][2] !== END) out.push([px, py, END]);
  return out;
}

/** Statistiques d'une liste de points déjà prête (fichier importé). */
export function patternStats(stitches, threads) {
  const layers = threads.map((t) => ({ color: t.color, name: t.name, stitches: 0, lengthMm: 0 }));
  let ci = 0;
  let prev = null;
  let n = 0;
  let trims = 0;
  let jumps = 0;
  let cc = 0;
  for (const [x, y, c] of stitches) {
    if (c === COLOR_CHANGE) (ci = Math.min(ci + 1, layers.length - 1)), cc++;
    else if (c === TRIM) trims++;
    else if (c === JUMP) jumps++;
    else if (c === STITCH) {
      n++;
      layers[ci].stitches++;
      if (prev && prev[2] === STITCH) layers[ci].lengthMm += Math.hypot(x - prev[0], y - prev[1]) / 10;
    }
    if (c === STITCH || c === JUMP) prev = [x, y, c];
  }
  const [x0, y0, x1, y1] = patternBounds(stitches.filter((s) => s[2] === STITCH));
  return {
    stitchCount: n,
    jumps,
    trims,
    colorChanges: cc,
    colors: threads.length,
    widthMm: (x1 - x0) / 10,
    heightMm: (y1 - y0) / 10,
    minutes: n / 650 + cc * 0.5 + (trims * 4) / 60,
    layers,
  };
}
