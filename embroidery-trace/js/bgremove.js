// Retirer le fond automatiquement.
// 1. Intelligence artificielle (MediaPipe DeepLab v3, copie locale) : repère
//    personnes et animaux courants (chat, chien, oiseau, cheval…), objets.
// 2. Sinon, méthode par couleurs : le fond est ce qui ressemble au bord de
//    l'image et y est relié (idéal pour les fonds unis).
// Tout est calculé dans le navigateur.

const BASE = new URL("../vendor/mediapipe/", import.meta.url).href;
let segmenterPromise = null;

function loadSegmenter() {
  segmenterPromise ||= (async () => {
    const vision = await import(BASE + "vision_bundle.mjs");
    const fileset = await vision.FilesetResolver.forVisionTasks(BASE + "wasm");
    return vision.ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: BASE + "deeplab_v3.tflite", delegate: "CPU" },
      runningMode: "IMAGE",
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
  })();
  segmenterPromise.catch(() => (segmenterPromise = null));
  return segmenterPromise;
}

// Classes du modèle (Pascal VOC) : oiseau, chat, vache, chien, cheval, personne, mouton.
const LIVING = new Set([3, 8, 10, 12, 13, 15, 17]);

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("délai dépassé")), ms))]);

/** Masque du sujet par l'IA (1 = garder), ou null si rien de net n'est trouvé. */
async function aiMask(canvas, rgba) {
  const seg = await withTimeout(loadSegmenter(), 25000);
  const res = seg.segment(canvas);
  const cat = res.categoryMask;
  const data = cat.getAsUint8Array();
  const w = cat.width;
  const h = cat.height;
  // Personnes et animaux d'abord : le canapé, la chaise ou la table sous le
  // sujet restent dans le fond. S'il n'y en a pas, tout objet reconnu compte.
  let living = 0;
  for (const c of data) if (LIVING.has(c)) living++;
  const keep = living > data.length * 0.01 ? (c) => LIVING.has(c) : (c) => c !== 0;
  const low = new Float32Array(w * h);
  for (let i = 0; i < low.length; i++) low[i] = keep(data[i]) ? 1 : 0;
  res.close?.();
  const mask = refineEdges(low, w, h, rgba, canvas.width, canvas.height);
  const cover = mask.reduce((s, v) => s + v, 0) / mask.length;
  return cover > 0.01 && cover < 0.97 ? mask : null;
}

/** Flou 3x3 (en place, renvoie une copie). */
function blur3(a, w, h) {
  const out = new Float32Array(a.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          s += a[yy * w + xx];
          n++;
        }
      }
      out[y * w + x] = s / n;
    }
  }
  return out;
}

/**
 * Le modèle travaille en basse résolution (≈ 257 px) : ses bords sont en
 * escalier. On agrandit son masque en douceur, puis, dans la bande du bord,
 * chaque pixel rejoint le sujet ou le fond selon sa couleur, comparée aux
 * couleurs sûres du voisinage.
 */
function refineEdges(low, lw, lh, rgba, W, H) {
  const soft = blur3(blur3(low, lw, lh), lw, lh);
  const s = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const fy = Math.min(lh - 1, Math.max(0, ((y + 0.5) * lh) / H - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(lh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < W; x++) {
      const fx = Math.min(lw - 1, Math.max(0, ((x + 0.5) * lw) / W - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(lw - 1, x0 + 1);
      const tx = fx - x0;
      const top = soft[y0 * lw + x0] * (1 - tx) + soft[y0 * lw + x1] * tx;
      const bot = soft[y1 * lw + x0] * (1 - tx) + soft[y1 * lw + x1] * tx;
      s[y * W + x] = top * (1 - ty) + bot * ty;
    }
  }
  // Couleurs « sûres » (loin du bord) : sommes cumulées pour des moyennes locales.
  const IW = W + 1;
  const n = IW * (H + 1);
  const sums = [0, 1].map(() => [new Float64Array(n), new Float64Array(n), new Float64Array(n), new Float64Array(n)]);
  for (let y = 0; y < H; y++) {
    const row = [0, 1].map(() => [0, 0, 0, 0]);
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const sure = s[p] > 0.97 ? 1 : s[p] < 0.03 && rgba[p * 4 + 3] > 127 ? 0 : -1;
      if (sure >= 0) {
        const r = row[sure];
        r[0]++;
        r[1] += rgba[p * 4];
        r[2] += rgba[p * 4 + 1];
        r[3] += rgba[p * 4 + 2];
      }
      const k = (y + 1) * IW + x + 1;
      for (let f = 0; f < 2; f++) for (let c = 0; c < 4; c++) sums[f][c][k] = sums[f][c][k - IW] + row[f][c];
    }
  }
  const R = Math.max(6, Math.round((3 * W) / lw));
  const mask = new Uint8Array(W * H);
  const mean = (f, x0, y0, x1, y1) => {
    const S = sums[f];
    const get = (c) => S[c][y1 * IW + x1] - S[c][y0 * IW + x1] - S[c][y1 * IW + x0] + S[c][y0 * IW + x0];
    const cnt = get(0);
    return cnt < 4 ? null : [get(1) / cnt, get(2) / cnt, get(3) / cnt];
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const v = s[p];
      if (v >= 0.97 || v <= 0.03) {
        mask[p] = v >= 0.5 ? 1 : 0;
        continue;
      }
      const x0 = Math.max(0, x - R);
      const y0 = Math.max(0, y - R);
      const x1 = Math.min(W, x + R + 1);
      const y1 = Math.min(H, y + R + 1);
      const fg = mean(1, x0, y0, x1, y1);
      const bg = mean(0, x0, y0, x1, y1);
      if (!fg || !bg) {
        mask[p] = v >= 0.5 ? 1 : 0;
        continue;
      }
      const i = p * 4;
      const dF = (rgba[i] - fg[0]) ** 2 + (rgba[i + 1] - fg[1]) ** 2 + (rgba[i + 2] - fg[2]) ** 2;
      const dB = (rgba[i] - bg[0]) ** 2 + (rgba[i + 1] - bg[1]) ** 2 + (rgba[i + 2] - bg[2]) ** 2;
      const byColor = dF + dB > 0 ? dB / (dF + dB) : 0.5;
      mask[p] = 0.35 * v + 0.65 * byColor >= 0.5 ? 1 : 0;
    }
  }
  return mask;
}

/** Masque du sujet par les couleurs du bord (1 = garder). */
export function colorMask(rgba, w, h) {
  const n = w * h;
  // Couleurs du bord (bande de 3 px), résumées en 4 groupes.
  const border = [];
  const band = Math.max(2, Math.round(Math.min(w, h) / 120));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= band && y >= band && x < w - band && y < h - band) continue;
      const i = (y * w + x) * 4;
      if (rgba[i + 3] < 128) continue;
      border.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
    }
  }
  if (!border.length) return null;
  let cents = [0, 0.33, 0.66, 0.99].map((f) => border[Math.floor(f * (border.length - 1))].slice());
  for (let it = 0; it < 8; it++) {
    const acc = cents.map(() => [0, 0, 0, 0]);
    for (const c of border) {
      let bi = 0;
      let bd = Infinity;
      cents.forEach((k, j) => {
        const d = (c[0] - k[0]) ** 2 + (c[1] - k[1]) ** 2 + (c[2] - k[2]) ** 2;
        if (d < bd) (bd = d), (bi = j);
      });
      const a = acc[bi];
      (a[0] += c[0]), (a[1] += c[1]), (a[2] += c[2]), a[3]++;
    }
    cents = acc.filter((a) => a[3] > border.length * 0.03).map((a) => [a[0] / a[3], a[1] / a[3], a[2] / a[3]]);
    if (!cents.length) return null;
  }
  // Distance de chaque pixel au fond, puis seuil d'Otsu.
  const dist = new Float32Array(n);
  const hist = new Float64Array(256);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (rgba[i + 3] < 128) {
      dist[p] = 0;
      continue;
    }
    let bd = Infinity;
    for (const k of cents) bd = Math.min(bd, 2 * (rgba[i] - k[0]) ** 2 + 4 * (rgba[i + 1] - k[1]) ** 2 + 3 * (rgba[i + 2] - k[2]) ** 2);
    dist[p] = Math.sqrt(bd);
    hist[Math.min(255, Math.floor(dist[p] / 3))]++;
  }
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let thr = 20;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) (best = between), (thr = t);
  }
  const limit = Math.max(18, Math.min(60, thr * 3));
  // Fond = pixels proches des couleurs du bord ET reliés au bord.
  const bg = new Uint8Array(n);
  const stack = [];
  const seed = (p) => {
    if (!bg[p] && dist[p] < limit) (bg[p] = 1), stack.push(p);
  };
  for (let x = 0; x < w; x++) seed(x), seed((h - 1) * w + x);
  for (let y = 0; y < h; y++) seed(y * w), seed(y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (p >= w) seed(p - w);
    if (p < n - w) seed(p + w);
  }
  const mask = new Uint8Array(n);
  for (let p = 0; p < n; p++) mask[p] = bg[p] ? 0 : 1;
  const cover = mask.reduce((s, v) => s + v, 0) / n;
  return cover > 0.01 && cover < 0.98 ? mask : null;
}

/** Nettoyage : garde les grandes parties du sujet et bouche ses petits trous. */
function cleanMask(mask, w, h) {
  const n = w * h;
  const comp = new Int32Array(n).fill(-1);
  const sizes = [];
  const stack = [];
  for (let s = 0; s < n; s++) {
    if (comp[s] !== -1) continue;
    const v = mask[s];
    const id = sizes.length;
    let size = 0;
    const members = [];
    comp[s] = id;
    stack.push(s);
    let touchesBorder = false;
    while (stack.length) {
      const p = stack.pop();
      members.push(p);
      size++;
      const x = p % w;
      const y = (p - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesBorder = true;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && comp[q] === -1 && mask[q] === v) (comp[q] = id), stack.push(q);
      }
    }
    sizes.push({ v, size, members, touchesBorder });
  }
  const biggest = Math.max(1, ...sizes.filter((c) => c.v === 1).map((c) => c.size));
  for (const c of sizes) {
    // Morceaux du sujet minuscules : retirés. Petits trous dans le sujet : bouchés.
    if (c.v === 1 && c.size < biggest * 0.04) for (const p of c.members) mask[p] = 0;
    if (c.v === 0 && !c.touchesBorder && c.size < n * 0.01) for (const p of c.members) mask[p] = 1;
  }
  return mask;
}

/**
 * Masque du sujet pour l'image `canvas`.
 * @returns {Promise<{mask: Uint8Array, method: "ia"|"couleurs"}|null>}
 */
export async function findSubject(canvas, rgba) {
  const w = canvas.width;
  const h = canvas.height;
  let mask = null;
  let method = "ia";
  try {
    mask = await aiMask(canvas, rgba);
  } catch (e) {
    console.warn("Détourage IA indisponible :", e);
  }
  if (!mask) {
    method = "couleurs";
    mask = colorMask(rgba, w, h);
  }
  if (!mask) return null;
  return { mask: cleanMask(mask, w, h), method };
}
