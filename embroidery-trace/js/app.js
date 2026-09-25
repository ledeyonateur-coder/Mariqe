// Éditeur FilTrace : import d'image, calques de fil, édition manuelle,
// simulation de broderie et export des fichiers machine. Tout tourne
// localement dans le navigateur : l'image n'est envoyée nulle part.

import { contentBounds, DEFAULT_SETTINGS, APPLIQUE_LABELS } from "./core/pipeline.js";
import { STITCH, JUMP, TRIM, COLOR_CHANGE, STITCH_TYPES, DEFAULT_LAYER, effectiveAngle, patternBounds, scalePattern, patternStats } from "./core/stitch.js";
import { PEC_THREADS, JEF_THREADS, THREAD_CHARTS, nearestThreadIndex, nearestInChart, hexToRgb, rgbToHex } from "./core/threads.js";
import { loopsToPath } from "./core/trace.js";
import { FORMATS, writeFormat } from "./formats/writers.js";
import { makeZip } from "./core/zip.js";
import { engine } from "./engine.js";
import { MACHINES, DEFAULT_MACHINE, machineFileName } from "./machines.js";
import { openCropper } from "./crop.js";
import { readEmbroidery } from "./formats/readers.js";
import { FABRICS } from "./fabrics.js";
import { adjustPixels, sketchPixels } from "./photo.js";
import { checkPattern } from "./core/checks.js";
import { FONTS, drawText, measureText } from "./text.js";
import { saveProject, listProjects, getProject, deleteProject } from "./projects.js";


const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const MIN_WORK = 600; // côté long minimum de l'image de travail (px)
const MAX_WORK = 900; // côté long maximum (px)
const HISTORY_MAX = 30;

const state = {
  fileName: "",
  source: null, // canvas de l'image de travail
  w: 0,
  h: 0,
  rgba: null,
  settings: { ...DEFAULT_SETTINGS },
  labels: null,
  layers: [], // ordre de broderie
  background: -1,
  vectors: new Map(),
  paths: new Map(),
  pattern: null,
  patternScale: 1,
  widthMm: 100,
  machine: DEFAULT_MACHINE,
  format: MACHINES[DEFAULT_MACHINE].format,
  style: "fill", // fill | outline | outline1
  outlineColor: "#1D1A16",
  outlineTriple: false,
  outlineLength: 2.5,
  spacing: DEFAULT_LAYER.density, // espacement global entre les rangs (mm)
  stitchLength: DEFAULT_LAYER.stitchLength,
  original: null, // image importée, avant recadrage
  mode: "image", // image | file (fichier de broderie importé)
  filePattern: null, // points du fichier importé (1/10 mm, centrés)
  rgbaBase: null, // pixels avant retouche photo
  photo: { brightness: 0, contrast: 0, saturation: 100 },
  fabricType: "coton",
  threadChart: "brother",
  projectId: null,
  guideStep: 0,
  pendingWidthMm: null,
  pendingTextOnly: false,
  compare: false,
  focus: null, // point mis en évidence par une alerte
  compareX: 0.5, // position du séparateur avant / après (0..1)
  owned: [], // Mes bobines : couleurs de fil possédées
  useOwned: false, // motif texte seul : l'intérieur des lettres reste vide
  hoop: MACHINES[DEFAULT_MACHINE].hoops[0],
  view: "stitch",
  tool: "pan",
  brush: 10,
  selected: null,
  expanded: new Set(),
  fabric: "#f4efe6",
  showJumps: false,
  progress: 0,
  playing: false,
  stroke: null,
  undo: [],
  redo: [],
};

const view = { s: 1, tx: 0, ty: 0 };
const canvas = $("#view");
const ctx = canvas.getContext("2d");
const raster = document.createElement("canvas");
const rasterCtx = raster.getContext("2d");

// ------------------------------------------------------------------ utilitaires

const clone = (o) => JSON.parse(JSON.stringify(o));
const layerById = (id) => state.layers.find((L) => L.id === id);
const fmt = (n, d = 0) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });

function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const t = f < 0 ? 0 : 255;
  const p = Math.abs(f);
  return rgbToHex([r + (t - r) * p, g + (t - g) * p, b + (t - b) * p]);
}

// Hébergé sur une page Claude, le téléchargement passe par la capacité
// "downloads", qui n'accepte que certaines extensions : les fichiers machine
// (.EXP, .PES…) sont alors livrés dans un .zip.
const SAVE_ALLOWED = /\.(gif|png|jpe?g|webp|txt|json|md|html|svg|pdf|csv|zip)$/i;
const hostedDownloads = window.claude?.use ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null);
hostedDownloads.then((d) => {
  if (d) document.body.classList.add("hosted");
});

function toast(msg, kind = "") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast " + kind;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 6000);
}

async function download(data, name, type = "application/octet-stream") {
  const hosted = await hostedDownloads;
  if (hosted) {
    let filename = name;
    let payload = data instanceof Blob ? data : new Blob([data], { type });
    if (!SAVE_ALLOWED.test(name)) {
      const bytes = new Uint8Array(await payload.arrayBuffer());
      payload = new Blob([makeZip([{ name, data: bytes }])]);
      filename = name.replace(/\.[^.]+$/, "") + ".zip";
    }
    try {
      await hosted.save({ filename, data: payload });
      toast(filename === name ? `${name} enregistré.` : `${filename} enregistré : décompressez-le pour obtenir ${name}.`, "ok");
    } catch (e) {
      if (e?.code !== "declined") toast("Téléchargement impossible ici (" + (e?.code || "erreur") + ").", "bad");
    }
    return;
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

let busyTimer = null;
function busy(on) {
  clearTimeout(busyTimer);
  if (on) busyTimer = setTimeout(() => ($("#busy").hidden = false), 120);
  else $("#busy").hidden = true;
}

engine.setProgressHandler((label, v) => {
  $("#busyLabel").textContent = `${label}… ${Math.round(v * 100)} %`;
  $("#busyBar").style.width = `${Math.round(v * 100)}%`;
});

// ------------------------------------------------------------------ historique

// Réglages suivis par Annuler / Rétablir (taille, tissu, machine, style…).
const SNAP_KEYS = ["widthMm", "spacing", "stitchLength", "fabricType", "machine", "hoop", "format", "style", "outlineColor", "outlineTriple", "outlineLength", "photo", "settings"];

function snapshot() {
  const snap = {
    labels: state.labels ? new Int16Array(state.labels) : null,
    layers: clone(state.layers),
    background: state.background,
    selected: state.selected,
    // Références (jamais modifiées sur place) : l'image peut avoir été agrandie.
    w: state.w,
    h: state.h,
    source: state.source,
    rgbaBase: state.rgbaBase,
  };
  for (const k of SNAP_KEYS) snap[k] = clone(state[k]);
  return snap;
}

function pushHistory() {
  if (!state.labels) return;
  state.undo.push(snapshot());
  if (state.undo.length > HISTORY_MAX) state.undo.shift();
  state.redo = [];
  updateHistoryButtons();
}

function restore(snap) {
  const photoChanged = JSON.stringify(snap.photo) !== JSON.stringify(state.photo) || snap.rgbaBase !== state.rgbaBase;
  Object.assign(state, {
    labels: snap.labels,
    layers: snap.layers,
    background: snap.background,
    selected: snap.selected,
    w: snap.w,
    h: snap.h,
    source: snap.source,
    rgbaBase: snap.rgbaBase,
  });
  for (const k of SNAP_KEYS) state[k] = snap[k];
  if (photoChanged && state.rgbaBase) state.rgba = adjustPixels(state.rgbaBase, state.photo);
  syncSettingsUI();
  refreshAll();
}

function undo() {
  if (!state.undo.length) return;
  state.redo.push(snapshot());
  restore(state.undo.pop());
  updateHistoryButtons();
}

function redo() {
  if (!state.redo.length) return;
  state.undo.push(snapshot());
  restore(state.redo.pop());
  updateHistoryButtons();
}

/** Une seule entrée d'historique par glissement de curseur. */
function historyOnce(el) {
  if (el._hist) return;
  el._hist = true;
  pushHistory();
}
document.addEventListener("change", (e) => (e.target._hist = false), true);

/** Applique un curseur pendant qu'on le glisse (aperçu en direct). */
function liveRange(el, apply, delay = 300) {
  let t = null;
  el.addEventListener("input", () => {
    historyOnce(el);
    clearTimeout(t);
    t = setTimeout(() => apply(el.value), delay);
  });
  el.addEventListener("change", () => {
    clearTimeout(t);
    apply(el.value);
  });
}

function updateHistoryButtons() {
  $("#btnUndo").disabled = !state.undo.length;
  $("#btnRedo").disabled = !state.redo.length;
}

// ------------------------------------------------------------------ chargement

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = url;
  });
}

const EMB_EXT = /\.(dst|exp|jef|pes|pec|vp3)$/i;

async function loadFile(file) {
  if (!file) return;
  if (EMB_EXT.test(file.name)) return loadEmbroideryFile(file);
  if (!/^image\//.test(file.type) && !/\.(png|jpe?g|svg|webp|gif|bmp)$/i.test(file.name)) {
    toast("Format non pris en charge. Utilisez PNG, JPG, SVG ou WEBP.", "bad");
    return;
  }
  try {
    const img = await readFileAsImage(file);
    const cropped = await cropImage(img);
    if (!cropped) return;
    state.original = img;
    loadImage(cropped, file.name.replace(/\.[^.]+$/, ""));
  } catch (e) {
    toast(e.message, "bad");
  }
}

function cropImage(img) {
  const hoop = hoopSize();
  return openCropper(img, { hoopRatio: hoop ? hoop[0] / hoop[1] : null });
}

$("#btnCrop").addEventListener("click", async () => {
  if (!state.original) return;
  const cropped = await cropImage(state.original);
  if (cropped) loadImage(cropped, state.fileName);
});

function loadImage(img, name, { widthMm = null } = {}) {
  imageGen++;
  state.pendingWidthMm = widthMm;
  leaveFileMode();
  let iw = img.naturalWidth || img.width || 800;
  let ih = img.naturalHeight || img.height || 800;
  const long = Math.max(iw, ih);
  const target = Math.min(MAX_WORK, Math.max(MIN_WORK, long));
  const k = target / long;
  const w = Math.max(1, Math.round(iw * k));
  const h = Math.max(1, Math.round(ih * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.imageSmoothingQuality = "high";
  cx.drawImage(img, 0, 0, w, h);
  state.source = c;
  state.w = w;
  state.h = h;
  state.rgbaBase = cx.getImageData(0, 0, w, h).data;
  state.rgba = adjustPixels(state.rgbaBase, state.photo);
  state.fileName = name || "motif";
  state.projectId = null;
  $("#fileName").textContent = state.fileName;
  $("#designName").value = safeDesignName(state.fileName);
  state.undo = [];
  state.redo = [];
  updateHistoryButtons();
  document.body.classList.add("has-image");
  $("#emptyState").hidden = true;
  $("#btnCrop").disabled = !state.original;
  runAnalyze({ fitSize: true });
  fitView();
}

const safeDesignName = (s) => s.normalize("NFD").replace(/[^\w-]/g, "").slice(0, 16) || "motif";

async function loadSample() {
  const img = new Image();
  img.onload = () => {
    state.original = img;
    loadImage(img, "exemple");
  };
  img.src = "assets/exemple.svg";
}

// ------------------------------------------------------------------ fichier de broderie importé

function leaveFileMode() {
  if (state.mode !== "file") return;
  state.mode = "image";
  state.filePattern = null;
  document.body.classList.remove("file-mode");
}

async function loadEmbroideryFile(file) {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const p = readEmbroidery(file.name, bytes);
    openFilePattern(p, file.name.replace(/\.[^.]+$/, ""));
    toast(`${file.name} ouvert : ${fmt(state.pattern.stats.stitchCount)} points. Redimensionnez-le ou exportez-le dans un autre format.`, "ok");
  } catch (e) {
    toast(e.message, "bad");
  }
}

function openFilePattern(p, name, widthMm = null) {
  const stitches = scalePattern(p.stitches, 1);
  const [x0, y0, x1, y1] = patternBounds(stitches.filter((s) => s[2] === STITCH));
  state.mode = "file";
  state.filePattern = { stitches, threads: p.threads };
  // Monde : 1 px = 0,1 mm à l'échelle d'origine.
  state.w = Math.max(10, x1 - x0);
  state.h = Math.max(10, y1 - y0);
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 1;
  state.source = c;
  state.original = null;
  state.labels = new Int16Array(0);
  state.vectors = new Map();
  state.paths = new Map();
  state.layers = p.threads.map((t, i) => ({ id: i, source: t.color, color: t.color, name: t.name || threadLabel(t.color), visible: true, ...DEFAULT_LAYER }));
  state.widthMm = widthMm || state.w / 10;
  state.fileName = name;
  state.projectId = null;
  state.undo = [];
  state.redo = [];
  updateHistoryButtons();
  $("#fileName").textContent = name;
  $("#designName").value = safeDesignName(name);
  document.body.classList.add("has-image", "file-mode");
  $("#emptyState").hidden = true;
  $("#btnCrop").disabled = true;
  imageGen++;
  stitchFileNow();
  refreshUI();
  setView("stitch");
  fitView();
}

$("#embInput").addEventListener("change", (e) => {
  if (e.target.files[0]) loadEmbroideryFile(e.target.files[0]);
  e.target.value = "";
});

// ------------------------------------------------------------------ retouche photo

for (const k of ["brightness", "contrast", "saturation"]) {
  $("#" + k).addEventListener("input", (e) => ($("#" + k + "Out").textContent = e.target.value));
  liveRange(
    $("#" + k),
    (v) => {
      if (state.photo[k] === Number(v)) return;
      state.photo = { ...state.photo, [k]: Number(v) };
      applyPhoto();
    },
    450,
  );
}
$("#btnResetPhoto").addEventListener("click", () => {
  pushHistory();
  state.photo = { brightness: 0, contrast: 0, saturation: 100 };
  syncPhotoUI();
  applyPhoto();
});
function applyPhoto() {
  if (!state.rgbaBase || state.mode === "file") return;
  state.rgba = adjustPixels(state.rgbaBase, state.photo);
  runAnalyze();
}
function syncPhotoUI() {
  for (const k of ["brightness", "contrast", "saturation"]) {
    $("#" + k).value = state.photo[k];
    $("#" + k + "Out").textContent = state.photo[k];
  }
}

// ------------------------------------------------------------------ pipeline

/** Remplace les couleurs par la bobine possédée la plus proche (Mes bobines). */
function applyOwnedThreads(layers) {
  if (!state.useOwned || !state.owned.length) return;
  for (const L of layers) {
    if (L.type === "none") continue;
    const c = hexToRgb(L.color);
    let best = state.owned[0];
    let bd = Infinity;
    for (const hex of state.owned) {
      const o = hexToRgb(hex);
      const d = 2 * (c[0] - o[0]) ** 2 + 4 * (c[1] - o[1]) ** 2 + 3 * (c[2] - o[2]) ** 2;
      if (d < bd) (bd = d), (best = hex);
    }
    L.color = best;
    L.name = threadLabel(best) + (L.name.endsWith("(intérieur)") ? " (intérieur)" : L.text ? " (texte)" : "");
  }
}

// File de calcul : les demandes rapprochées sont fusionnées et seul le
// dernier état est recalculé. Niveaux : 1 points, 2 vecteurs + points,
// 3 analyse des couleurs + vecteurs + points.
const LEVEL = { stitch: 1, vectorize: 2, analyze: 3 };
let pendingLevel = 0;
let pendingFit = false;
let computing = false;
let imageGen = 0; // change à chaque nouvelle image : ignore les résultats périmés

function requestCompute(kind, { fit = false } = {}) {
  pendingLevel = Math.max(pendingLevel, LEVEL[kind]);
  pendingFit ||= fit;
  if (!computing) runQueue();
}

async function runQueue() {
  computing = true;
  busy(true);
  while (pendingLevel) {
    const level = pendingLevel;
    const fit = pendingFit;
    pendingLevel = 0;
    pendingFit = false;
    const gen = imageGen;
    try {
      if (level >= 3 && !(await doAnalyze(gen, fit))) continue;
      if (level >= 2 && !(await doVectorize(gen))) continue;
      if (!(await doStitch(gen))) continue;
      refreshUI();
      if (fit) fitView();
    } catch (e) {
      console.error(e);
      toast("Erreur de calcul : " + e.message, "bad");
    }
  }
  busy(false);
  computing = false;
}

async function doAnalyze(gen, fitSize) {
  if (!state.rgba) return false;
  // Dessin au trait : la photo devient des traits noirs sur blanc avant l'analyse.
  const sketch = state.style === "sketch";
  const pixels = sketch ? sketchPixels(state.rgba, state.w, state.h, 5) : state.rgba;
  const settings = sketch ? { ...state.settings, colors: 2, removeBackground: true, cleanup: Math.max(12, state.settings.cleanup) } : state.settings;
  const textLayers = state.layers.filter((L) => L.text);
  const { labels, layers, background } = await engine.analyze(pixels, state.w, state.h, settings);
  if (gen !== imageGen) return false;
  state.labels = labels;
  const fab = FABRICS[state.fabricType] || FABRICS.coton;
  for (const L of layers) {
    L.density = state.spacing;
    L.stitchLength = state.stitchLength;
    L.pullComp = fab.pullComp;
    L.underlay = fab.underlay;
    L.name = threadLabel(L.color) + (L.name.endsWith("(intérieur)") ? " (intérieur)" : "");
  }
  if (state.pendingTextOnly) {
    for (const L of layers) if (L.name.endsWith("(intérieur)")) L.type = "none";
    state.pendingTextOnly = false;
  }
  if (sketch) for (const L of layers) if (L.name.endsWith("(intérieur)")) L.type = "none";
  applyOwnedThreads(layers);
  // Les textes ajoutés sont redessinés par-dessus la nouvelle analyse.
  for (const T of textLayers) {
    T.id = Math.max(-1, ...layers.map((L) => L.id)) + 1;
    await paintTextLayer(T, labels);
    layers.push(T);
  }
  state.layers = layers;
  state.background = background;
  state.selected = (layers.find((L) => L.type !== "none") || layers[0] || {}).id ?? null;
  state.expanded.clear();
  if (fitSize) {
    state.widthMm = state.pendingWidthMm || 100;
    state.pendingWidthMm = null;
    const fit = hoopFitWidth();
    if (fit && fit < state.widthMm) state.widthMm = Math.floor(fit);
  }
  return true;
}

async function doVectorize(gen) {
  if (!state.labels || state.mode === "file") return true;
  const vectors = await engine.vectorize(state.labels, state.w, state.h, state.layers, state.settings);
  if (gen !== imageGen) return false;
  state.vectors = vectors;
  state.paths = new Map();
  for (const [id, loops] of state.vectors) state.paths.set(id, new Path2D(loopsToPath(loops, 1, 2)));
  updateRaster();
  return true;
}

async function doStitch(gen) {
  const { mmPerPx } = geometry();
  if (state.mode === "file") {
    stitchFileNow();
    return true;
  }
  if (!state.labels) return false;
  const pattern = await engine.stitch(state.layers, state.vectors, mmPerPx, {
    style: state.style === "sketch" ? "fill" : state.style,
    outlineColor: state.outlineColor,
    outlineTriple: state.outlineTriple,
    outlineLength: state.outlineLength,
  });
  if (gen !== imageGen) return false;
  state.patternScale = mmPerPx;
  state.pattern = pattern;
  state.progress = pattern.stitches.length;
  stitchCache = null;
  return true;
}

/** Fichier importé : simple mise à l'échelle des points existants (rapide). */
function stitchFileNow() {
  const { mmPerPx } = geometry();
  state.patternScale = mmPerPx;
  const stitches = scalePattern(state.filePattern.stitches, 10 * mmPerPx);
  const threads = state.layers.map((L) => ({ color: L.color, name: L.name }));
  state.pattern = {
    stitches,
    threads,
    origin: [(state.w / 2) * mmPerPx, (state.h / 2) * mmPerPx],
    stats: patternStats(stitches, threads),
    layerIds: state.layers.map((L) => L.id),
    steps: [],
  };
  state.progress = stitches.length;
  stitchCache = null;
}

function runAnalyze({ fitSize = false } = {}) {
  requestCompute("analyze", { fit: fitSize });
}

let stitchTimer = null;
function scheduleStitch(delay = 120) {
  clearTimeout(stitchTimer);
  stitchTimer = setTimeout(() => requestCompute("stitch"), delay);
}

function scheduleVectorize(delay = 60) {
  clearTimeout(stitchTimer);
  stitchTimer = setTimeout(() => requestCompute("vectorize"), delay);
}

/** Recalcule tout depuis la carte de couleurs courante (après annulation, fusion…). */
function refreshAll() {
  if (!state.labels) return;
  if (state.mode === "file") {
    stitchFileNow();
    refreshUI();
    return;
  }
  requestCompute("vectorize");
}

// ------------------------------------------------------------------ géométrie

function geometry() {
  if (state.mode === "file") {
    const mmPerPx = state.widthMm / state.w;
    return { box: { x: 0, y: 0, w: state.w, h: state.h }, mmPerPx, heightMm: state.h * mmPerPx };
  }
  if (!state.labels) return { box: { x: 0, y: 0, w: 1, h: 1 }, mmPerPx: 1, heightMm: 0 };
  const ignored = new Set(state.layers.filter((L) => L.type === "none").map((L) => L.id));
  const box = contentBounds(state.labels, state.w, state.h, ignored);
  const mmPerPx = state.widthMm / box.w;
  return { box, mmPerPx, heightMm: box.h * mmPerPx };
}

function hoopSize() {
  if (state.hoop === "none") return null;
  return state.hoop.split("x").map(Number);
}

function hoopFitWidth() {
  const hoop = hoopSize();
  if (!hoop || !state.labels) return null;
  const { box } = geometry();
  const ratio = box.h / box.w;
  const [hw, hh] = hoop;
  const margin = 0.95;
  return Math.max(Math.min(hw, hh / ratio), Math.min(hh, hw / ratio)) * margin;
}

function fitsHoop() {
  const hoop = hoopSize();
  if (!hoop) return true;
  const { heightMm } = geometry();
  const w = state.widthMm;
  const [hw, hh] = hoop;
  return (w <= hw && heightMm <= hh) || (w <= hh && heightMm <= hw);
}

// ------------------------------------------------------------------ rendu

function updateRaster() {
  if (!state.labels) return;
  raster.width = state.w;
  raster.height = state.h;
  const img = rasterCtx.createImageData(state.w, state.h);
  const colors = new Map(
    state.layers.map((L) => {
      const [r, g, b] = hexToRgb(L.color);
      const a = !L.visible ? 30 : L.type === "none" ? 55 : 255;
      return [L.id, [r, g, b, a]];
    }),
  );
  const d = img.data;
  const labels = state.labels;
  for (let i = 0; i < labels.length; i++) {
    const c = colors.get(labels[i]);
    if (!c) continue;
    d[i * 4] = c[0];
    d[i * 4 + 1] = c[1];
    d[i * 4 + 2] = c[2];
    d[i * 4 + 3] = c[3];
  }
  rasterCtx.putImageData(img, 0, 0);
}

let stitchCache = null;
function buildStitchPaths(limit) {
  const p = state.pattern;
  if (!p) return { blocks: [], jumps: new Path2D(), needle: null };
  const k = 1 / (10 * state.patternScale);
  const ox = p.origin[0] / state.patternScale;
  const oy = p.origin[1] / state.patternScale;
  const blocks = [];
  const jumps = new Path2D();
  let ci = 0;
  let block = { color: p.threads[0]?.color || "#000", path: new Path2D() };
  blocks.push(block);
  let prev = null;
  let prevCmd = null;
  let needle = null;
  const n = Math.min(limit, p.stitches.length);
  for (let i = 0; i < n; i++) {
    const [x, y, c] = p.stitches[i];
    const wx = x * k + ox;
    const wy = y * k + oy;
    if (c === COLOR_CHANGE) {
      ci++;
      block = { color: p.threads[ci]?.color || "#000", path: new Path2D() };
      blocks.push(block);
    } else if (c === STITCH) {
      if (prev && prevCmd === STITCH) {
        block.path.moveTo(prev[0], prev[1]);
        block.path.lineTo(wx, wy);
      }
      needle = [wx, wy];
    } else if (c === JUMP && prev) {
      jumps.moveTo(prev[0], prev[1]);
      jumps.lineTo(wx, wy);
    }
    if (c === STITCH || c === JUMP) {
      prev = [wx, wy];
      prevCmd = c;
    }
  }
  return { blocks, jumps, needle };
}

let drawQueued = false;
function render() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    draw();
  });
}

function resizeCanvas() {
  const r = $("#canvasWrap").getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  canvas.style.width = r.width + "px";
  canvas.style.height = r.height + "px";
  render();
}

function draw() {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.source) return;
  const v = state.stroke && state.view === "vector" ? "raster" : state.view;
  if (v === "stitch") {
    ctx.fillStyle = state.fabric;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.tx, dpr * view.ty);
  ctx.imageSmoothingEnabled = v === "original";

  if (v === "original") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, state.w, state.h);
    ctx.drawImage(state.source, 0, 0);
  } else if (v === "raster") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, state.w, state.h);
    ctx.drawImage(raster, 0, 0);
    drawSelectedOutline();
  } else if (v === "vector") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, state.w, state.h);
    for (const L of state.layers) {
      const path = state.paths.get(L.id);
      if (!path || !L.visible) continue;
      ctx.globalAlpha = L.type === "none" ? 0.18 : 1;
      ctx.fillStyle = L.color;
      ctx.fill(path, "evenodd");
    }
    ctx.globalAlpha = 1;
    drawSelectedOutline();
    drawHoop();
  } else if (v === "stitch") {
    drawHoop();
    drawStitches();
    if (state.compare && state.mode === "image") drawCompare(dpr);
    if (state.focus) {
      ctx.beginPath();
      ctx.arc(state.focus[0], state.focus[1], 14 / view.s, 0, Math.PI * 2);
      ctx.lineWidth = 3 / view.s;
      ctx.strokeStyle = "#f3a712";
      ctx.stroke();
    }
  }
  if (state.cursor && ["brush", "eraser"].includes(state.tool) && v !== "stitch" && v !== "original") {
    ctx.beginPath();
    ctx.arc(state.cursor[0], state.cursor[1], state.brush / 2, 0, Math.PI * 2);
    ctx.lineWidth = 1.5 / view.s;
    ctx.strokeStyle = "rgba(0,0,0,.7)";
    ctx.stroke();
    ctx.lineWidth = 0.75 / view.s;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  }
}

/** Image d'origine à gauche du séparateur, broderie à droite. */
function drawCompare(dpr) {
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  const x = W * state.compareX;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.beginPath();
  ctx.rect(0, 0, x, H);
  ctx.clip();
  ctx.fillStyle = state.fabric;
  ctx.fillRect(0, 0, x, H);
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.tx, dpr * view.ty);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(state.source, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - 1.5, 0, 3, H);
  ctx.beginPath();
  ctx.arc(x, H / 2, 16, 0, Math.PI * 2);
  ctx.fillStyle = "#1d1a16";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("‹ ›", x, H / 2 + 1);
  ctx.font = "600 12px Inter, sans-serif";
  ctx.fillStyle = "rgba(0,0,0,.6)";
  ctx.fillText("Image", x / 2, 16);
  ctx.fillText("Broderie", x + (W - x) / 2, 16);
  ctx.restore();
}

function drawSelectedOutline() {
  const path = state.paths.get(state.selected);
  if (!path) return;
  ctx.save();
  ctx.lineWidth = 2 / view.s;
  ctx.setLineDash([6 / view.s, 4 / view.s]);
  ctx.strokeStyle = "#111";
  ctx.stroke(path);
  ctx.lineDashOffset = 5 / view.s;
  ctx.strokeStyle = "#fff";
  ctx.stroke(path);
  ctx.restore();
}

function drawHoop() {
  const hoop = hoopSize();
  if (!hoop || !state.labels) return;
  const { box, mmPerPx } = geometry();
  let [hw, hh] = hoop;
  // Oriente le cadre comme le motif.
  if ((box.w > box.h) !== (hw > hh)) [hw, hh] = [hh, hw];
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const w = hw / mmPerPx;
  const h = hh / mmPerPx;
  const r = Math.min(w, h) * 0.08;
  ctx.save();
  ctx.lineWidth = 2 / view.s;
  ctx.strokeStyle = fitsHoop() ? "rgba(40,40,40,.45)" : "rgba(200,40,30,.85)";
  ctx.setLineDash([10 / view.s, 6 / view.s]);
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.font = `${12 / view.s}px Inter, sans-serif`;
  ctx.fillText(`Cadre ${hoop[0]} × ${hoop[1]} mm`, cx - w / 2 + 8 / view.s, cy - h / 2 - 6 / view.s);
  // repères de centre
  ctx.beginPath();
  ctx.moveTo(cx - 10 / view.s, cy);
  ctx.lineTo(cx + 10 / view.s, cy);
  ctx.moveTo(cx, cy - 10 / view.s);
  ctx.lineTo(cx, cy + 10 / view.s);
  ctx.lineWidth = 1 / view.s;
  ctx.stroke();
  ctx.restore();
}

function drawStitches(target = ctx, scaleForWidth = view.s) {
  const p = state.pattern;
  if (!p) return;
  const full = state.progress >= p.stitches.length;
  let data;
  if (full && target === ctx) {
    if (!stitchCache) stitchCache = buildStitchPaths(Infinity);
    data = stitchCache;
  } else {
    data = buildStitchPaths(target === ctx ? state.progress : Infinity);
  }
  const t = 0.42 / state.patternScale; // épaisseur du fil (~0,42 mm)
  const minW = 0.6 / scaleForWidth;
  target.lineCap = "round";
  target.lineJoin = "round";
  for (const b of data.blocks) {
    target.strokeStyle = shade(b.color, -0.45);
    target.lineWidth = Math.max(t * 1.3, minW * 1.3);
    target.stroke(b.path);
    target.strokeStyle = b.color;
    target.lineWidth = Math.max(t, minW);
    target.stroke(b.path);
    target.save();
    target.translate(-t * 0.18, -t * 0.18);
    target.globalAlpha = 0.45;
    target.strokeStyle = shade(b.color, 0.55);
    target.lineWidth = Math.max(t * 0.3, minW * 0.4);
    target.stroke(b.path);
    target.restore();
  }
  if (state.showJumps && target === ctx) {
    target.save();
    target.setLineDash([4 / view.s, 3 / view.s]);
    target.lineWidth = 1 / view.s;
    target.strokeStyle = "rgba(220,30,30,.8)";
    target.stroke(data.jumps);
    target.restore();
  }
  if (!full && data.needle && target === ctx) {
    const [x, y] = data.needle;
    target.beginPath();
    target.arc(x, y, 6 / view.s, 0, Math.PI * 2);
    target.fillStyle = "rgba(216,67,46,.9)";
    target.fill();
    target.lineWidth = 2 / view.s;
    target.strokeStyle = "#fff";
    target.stroke();
  }
}

// ------------------------------------------------------------------ vue (zoom / déplacement)

function fitView() {
  const r = $("#canvasWrap").getBoundingClientRect();
  if (!state.w || !r.width) return;
  let w = state.w;
  let h = state.h;
  let x0 = 0;
  let y0 = 0;
  const hoop = hoopSize();
  if (hoop && state.labels && (state.view === "stitch" || state.view === "vector")) {
    const { box, mmPerPx } = geometry();
    let [hw, hh] = hoop;
    if ((box.w > box.h) !== (hw > hh)) [hw, hh] = [hh, hw];
    const cw = hw / mmPerPx;
    const ch = hh / mmPerPx;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    x0 = Math.min(0, cx - cw / 2);
    y0 = Math.min(0, cy - ch / 2);
    w = Math.max(state.w, cx + cw / 2) - x0;
    h = Math.max(state.h, cy + ch / 2) - y0;
  }
  const pad = 32;
  view.s = Math.min((r.width - pad * 2) / w, (r.height - pad * 2) / h);
  view.tx = (r.width - w * view.s) / 2 - x0 * view.s;
  view.ty = (r.height - h * view.s) / 2 - y0 * view.s;
  render();
}

function zoomAt(factor, sx, sy) {
  const ns = Math.min(40, Math.max(0.05, view.s * factor));
  const f = ns / view.s;
  view.tx = sx - (sx - view.tx) * f;
  view.ty = sy - (sy - view.ty) * f;
  view.s = ns;
  render();
}

function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left - view.tx) / view.s, (e.clientY - r.top - view.ty) / view.s];
}

// ------------------------------------------------------------------ outils d'édition

function paintStamp(x, y, value) {
  const rad = state.brush / 2;
  const x0 = Math.max(0, Math.floor(x - rad));
  const x1 = Math.min(state.w - 1, Math.ceil(x + rad));
  const y0 = Math.max(0, Math.floor(y - rad));
  const y1 = Math.min(state.h - 1, Math.ceil(y + rad));
  const r2 = rad * rad;
  let changed = false;
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = px + 0.5 - x;
      const dy = py + 0.5 - y;
      if (dx * dx + dy * dy > r2) continue;
      const i = py * state.w + px;
      if (state.labels[i] !== value) {
        state.labels[i] = value;
        changed = true;
      }
    }
  }
  return changed;
}

function paintLine(a, b, value) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.max(1, Math.ceil(d / Math.max(1, state.brush / 4)));
  let changed = false;
  for (let i = 1; i <= steps; i++) {
    changed = paintStamp(a[0] + ((b[0] - a[0]) * i) / steps, a[1] + ((b[1] - a[1]) * i) / steps, value) || changed;
  }
  return changed;
}

function floodFill(x, y, value) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= state.w || y >= state.h) return false;
  const { w, h, labels } = state;
  const from = labels[y * w + x];
  if (from === value) return false;
  const stack = [y * w + x];
  labels[y * w + x] = value;
  while (stack.length) {
    const p = stack.pop();
    const px = p % w;
    const py = (p - px) / w;
    const nb = [];
    if (px > 0) nb.push(p - 1);
    if (px < w - 1) nb.push(p + 1);
    if (py > 0) nb.push(p - w);
    if (py < h - 1) nb.push(p + w);
    for (const q of nb) {
      if (labels[q] === from) {
        labels[q] = value;
        stack.push(q);
      }
    }
  }
  return true;
}

function labelAt(x, y) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= state.w || y >= state.h) return null;
  return state.labels[y * state.w + x];
}

function setTool(tool) {
  state.tool = tool;
  $$("#tools [data-tool]").forEach((b) => b.classList.toggle("active", b.dataset.tool === tool));
  if (tool !== "pan" && (state.view === "stitch" || state.view === "original")) setView("raster");
  canvas.dataset.tool = tool;
  render();
}

function setView(v) {
  const changedFrame = (v === "stitch" || v === "vector") !== (state.view === "stitch" || state.view === "vector");
  state.view = v;
  $$("#viewTabs [data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  document.body.dataset.view = v;
  if ((v === "stitch" || v === "original") && state.tool !== "pan") setTool("pan");
  if (changedFrame) fitView();
  render();
}

let pan = null;
let spaceDown = false;

// Zoom à deux doigts : on suit tous les doigts posés sur l'aperçu.
const touches = new Map();
let pinch = null;

function pinchInfo() {
  const [a, b] = [...touches.values()];
  const r = canvas.getBoundingClientRect();
  return { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mx: (a[0] + b[0]) / 2 - r.left, my: (a[1] + b[1]) / 2 - r.top };
}

function startPinch() {
  // Un trait de pinceau commencé avec le premier doigt est annulé.
  if (state.stroke) {
    const snap = state.undo.pop();
    if (snap) state.labels = snap.labels;
    state.stroke = null;
    updateRaster();
    updateHistoryButtons();
  }
  pan = null;
  const i = pinchInfo();
  pinch = { ...i, s: view.s, tx: view.tx, ty: view.ty };
}

function movePinch() {
  const i = pinchInfo();
  const ns = Math.min(40, Math.max(0.05, (pinch.s * i.d) / pinch.d));
  const f = ns / pinch.s;
  // Le point sous les doigts reste sous les doigts (zoom + déplacement).
  view.tx = i.mx - (pinch.mx - pinch.tx) * f;
  view.ty = i.my - (pinch.my - pinch.ty) * f;
  view.s = ns;
  render();
}

canvas.addEventListener("pointerdown", (e) => {
  if (!state.labels) return;
  canvas.setPointerCapture(e.pointerId);
  touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (touches.size === 2) return startPinch();
  if (touches.size > 2) return;
  if (state.compare && state.view === "stitch") {
    const r = canvas.getBoundingClientRect();
    if (Math.abs(e.clientX - r.left - r.width * state.compareX) < 28) {
      state.dragCompare = true;
      return;
    }
  }
  if (state.mode === "file") {
    pan = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    return;
  }
  const panning = state.tool === "pan" || e.button === 1 || spaceDown || state.view === "stitch" || state.view === "original";
  if (panning) {
    pan = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    canvas.classList.add("grabbing");
    return;
  }
  const p = toWorld(e);
  if (state.tool === "picker") {
    const l = labelAt(p[0], p[1]);
    if (l !== null && l >= 0) selectLayer(l);
    return;
  }
  if (state.tool === "move") {
    // Déplacer : attrape le calque sous le doigt (ou le calque sélectionné).
    const l = labelAt(p[0], p[1]);
    const id = l !== null && l >= 0 ? l : state.selected;
    if (id === null || !layerById(id)) return;
    pushHistory();
    const idx = [];
    const base = new Int16Array(state.labels);
    for (let i = 0; i < base.length; i++) if (base[i] === id) (idx.push(i), (base[i] = -1));
    state.moving = { id, base, idx, start: p, dx: 0, dy: 0 };
    if (state.selected !== id) selectLayer(id);
    return;
  }
  if (state.tool === "wand") {
    // Baguette : retire toute la zone de même couleur (fond, reflet…).
    const l = labelAt(p[0], p[1]);
    if (l === null || l < 0) return;
    pushHistory();
    floodFill(p[0], p[1], -1);
    updateRaster();
    render();
    scheduleVectorize(10);
    return;
  }
  if (state.tool === "bucket") {
    if (state.selected === null) return;
    pushHistory();
    if (floodFill(p[0], p[1], state.selected)) {
      updateRaster();
      render();
      scheduleVectorize(10);
    }
    return;
  }
  if (state.tool === "brush" && state.selected === null) return;
  pushHistory();
  const value = state.tool === "eraser" ? -1 : state.selected;
  state.stroke = { last: p, value, changed: paintStamp(p[0], p[1], value) };
  updateRaster();
  render();
});

canvas.addEventListener("pointermove", (e) => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch) {
    if (touches.size >= 2) movePinch();
    return;
  }
  if (state.dragCompare) {
    const r = canvas.getBoundingClientRect();
    state.compareX = Math.min(0.98, Math.max(0.02, (e.clientX - r.left) / r.width));
    render();
    return;
  }
  if (pan) {
    view.tx = pan.tx + e.clientX - pan.x;
    view.ty = pan.ty + e.clientY - pan.y;
    render();
    return;
  }
  const p = toWorld(e);
  state.cursor = p;
  if (state.moving) {
    const m = state.moving;
    const dx = Math.round(p[0] - m.start[0]);
    const dy = Math.round(p[1] - m.start[1]);
    if (dx !== m.dx || dy !== m.dy) {
      m.dx = dx;
      m.dy = dy;
      const { w, h, labels } = state;
      labels.set(m.base);
      for (const i of m.idx) {
        const x = (i % w) + dx;
        const y = Math.floor(i / w) + dy;
        if (x >= 0 && y >= 0 && x < w && y < h) labels[y * w + x] = m.id;
      }
      updateRaster();
      render();
    }
    return;
  }
  if (state.stroke) {
    if (paintLine(state.stroke.last, p, state.stroke.value)) {
      state.stroke.changed = true;
      updateRaster();
    }
    state.stroke.last = p;
  }
  render();
});

function endPointer(e) {
  if (e) touches.delete(e.pointerId);
  state.dragCompare = false;
  if (pinch) {
    if (touches.size < 2) pinch = null;
    pan = null;
    return;
  }
  if (pan) {
    pan = null;
    canvas.classList.remove("grabbing");
  }
  if (state.moving) {
    const m = state.moving;
    state.moving = null;
    if (!m.dx && !m.dy) {
      state.undo.pop();
      updateHistoryButtons();
    } else {
      const L = layerById(m.id);
      if (L?.text) (L.text.cx += m.dx), (L.text.cy += m.dy);
      scheduleVectorize(10);
    }
    return;
  }
  if (state.stroke) {
    const changed = state.stroke.changed;
    state.stroke = null;
    if (changed) scheduleVectorize(10);
    else state.undo.pop(), updateHistoryButtons();
    render();
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("pointerleave", () => {
  state.cursor = null;
  render();
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  },
  { passive: false },
);

// ------------------------------------------------------------------ calques

function selectLayer(id) {
  state.selected = id;
  renderLayers();
  render();
}

function layerCounts() {
  const counts = new Map();
  if (!state.pattern) return counts;
  state.pattern.layerIds.forEach((id, i) => counts.set(id, state.pattern.stats.layers[i]));
  return counts;
}

const TYPE_OPTIONS = Object.entries(STITCH_TYPES)
  .map(([k, v]) => `<option value="${k}">${v}</option>`)
  .join("");
function chartOptions() {
  return THREAD_CHARTS[state.threadChart].threads
    .map((t) => `<option value="#${t[0]}" style="background:#${t[0]}">${t[2]} · ${t[1]}</option>`)
    .join("");
}

/** Nom du fil le plus proche dans le nuancier choisi, ex. « Red · 5 ». */
function threadLabel(hex) {
  const t = nearestInChart(hex, state.threadChart);
  return `${t.name} · ${t.ref}`;
}

function renderLayers() {
  syncStitchPick();
  const list = $("#layers");
  const counts = layerCounts();
  list.innerHTML = "";
  if (state.mode === "file") {
    // Fichier importé : un bloc par couleur, seule la couleur se modifie.
    state.layers.forEach((L, idx) => {
      const st = counts.get(L.id);
      const li = document.createElement("li");
      li.className = "layer";
      li.dataset.id = L.id;
      li.innerHTML = `<div class="layer-main"><span class="order">${idx + 1}</span>
        <input type="color" class="swatch" data-act="color" value="${L.color.toLowerCase()}" title="Couleur du fil" />
        <div class="layer-name"><b>${L.name}</b><small>${L.color} · ${st ? fmt(st.stitches) + " pts" : "—"}</small></div></div>`;
      list.appendChild(li);
    });
    return;
  }
  state.layers.forEach((L, idx) => {
    const li = document.createElement("li");
    li.className = "layer" + (L.id === state.selected ? " selected" : "") + (!L.visible || L.type === "none" ? " off" : "");
    li.dataset.id = L.id;
    const st = counts.get(L.id);
    const open = state.expanded.has(L.id);
    const loops = state.vectors.get(L.id) || [];
    const autoAngle = Math.round(effectiveAngle(loops.map((l) => l.map(([x, y]) => [x, y])), { ...L, angle: null }));
    const others = state.layers
      .filter((o) => o.id !== L.id)
      .map((o) => `<option value="${o.id}">${o.name} (${o.color})</option>`)
      .join("");
    li.innerHTML = `
      <div class="layer-main">
        <span class="order">${idx + 1}</span>
        <input type="color" class="swatch" data-act="color" value="${L.color.toLowerCase()}" title="Couleur du fil" />
        <button class="layer-name" data-act="select" title="Sélectionner pour peindre">
          <b>${L.name}</b>
          <small>${L.color} · ${st ? fmt(st.stitches) + " pts" : L.type === "none" ? "non brodé" : "—"}</small>
        </button>
        <select data-act="type" title="Type de point — Auto : satin pour les formes fines, remplissage pour les surfaces">${TYPE_OPTIONS}</select>
        <button class="icon" data-act="visible" title="${L.visible ? "Masquer" : "Afficher"}">${L.visible ? "👁" : "◌"}</button>
        <button class="icon" data-act="expand" title="Réglages" aria-expanded="${open}">${open ? "▴" : "▾"}</button>
      </div>
      <div class="layer-more" ${open ? "" : "hidden"}>
        ${
          L.text
            ? `<div class="text-edit">
          <div class="field"><label>Texte</label><textarea data-act="textValue" rows="2" maxlength="120"></textarea></div>
          <div class="row2">
            <div class="field"><label>Hauteur (mm)</label><input type="number" data-act="textSize" min="4" max="120" step="1" value="${Math.round(L.text.px * state.patternScale)}" /></div>
            <div class="field"><label>Police</label><select data-act="textFont">${FONTS.map((f) => `<option value="${f.family}">${f.label}</option>`).join("")}</select></div>
          </div>
          <button class="btn small primary" data-act="textApply">Mettre à jour le texte</button>
          <p class="hint small">Pour le déplacer : outil ✥ puis glissez le texte sur l'aperçu.</p>
        </div>`
            : ""
        }
        <div class="row2">
          <div class="field">
            <label>Angle (°)</label>
            <div class="inline">
              <input type="number" data-act="angle" min="-180" max="180" step="5" value="${L.angle ?? autoAngle}" ${L.angle === null ? "disabled" : ""} />
              <label class="check small"><input type="checkbox" data-act="angleAuto" ${L.angle === null ? "checked" : ""}/> auto</label>
            </div>
          </div>
          <div class="field">
            <label>Densité (mm) <output>${L.density}</output></label>
            <input type="range" data-act="density" min="0.2" max="1.5" step="0.05" value="${L.density}" />
          </div>
          <div class="field">
            <label>Long. de point (mm) <output>${L.stitchLength}</output></label>
            <input type="range" data-act="stitchLength" min="1" max="7" step="0.5" value="${L.stitchLength}" />
          </div>
          <div class="field">
            <label>Compensation (mm) <output>${L.pullComp}</output></label>
            <input type="range" data-act="pullComp" min="0" max="1" step="0.05" value="${L.pullComp}" />
          </div>
        </div>
        <div class="checks">
          <label class="check small"><input type="checkbox" data-act="underlay" ${L.underlay ? "checked" : ""}/> Sous-couche</label>
          <label class="check small"><input type="checkbox" data-act="outline" ${L.outline ? "checked" : ""}/> Contour</label>
          <label class="check small"><input type="checkbox" data-act="triple" ${L.triple ? "checked" : ""}/> Point triple</label>
        </div>
        <div class="field">
          <label>Fil du nuancier ${THREAD_CHARTS[state.threadChart].label}</label>
          <select data-act="thread"><option value="">— choisir un fil —</option>${chartOptions()}</select>
        </div>
        <div class="field">
          <label>Fusionner avec</label>
          <select data-act="merge"><option value="">— calque —</option>${others}</select>
        </div>
        <div class="layer-actions">
          <button class="btn small ghost" data-act="up" ${idx === 0 ? "disabled" : ""}>↑ Monter</button>
          <button class="btn small ghost" data-act="down" ${idx === state.layers.length - 1 ? "disabled" : ""}>↓ Descendre</button>
          <button class="btn small ghost danger" data-act="delete">Supprimer</button>
        </div>
      </div>`;
    li.querySelector('[data-act="type"]').value = L.type;
    if (L.text) {
      li.querySelector('[data-act="textValue"]').value = L.text.text;
      li.querySelector('[data-act="textFont"]').value = L.text.font;
    }
    list.appendChild(li);
  });
}

function layerFromEvent(e) {
  const li = e.target.closest(".layer");
  return li ? layerById(Number(li.dataset.id)) : null;
}

$("#layers").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  const L = layerFromEvent(e);
  if (!btn || !L) return;
  const act = btn.dataset.act;
  if (act === "select") {
    selectLayer(L.id);
  } else if (act === "expand") {
    state.expanded.has(L.id) ? state.expanded.delete(L.id) : state.expanded.add(L.id);
    renderLayers();
  } else if (act === "visible") {
    pushHistory();
    L.visible = !L.visible;
    updateRaster();
    changedLayers();
  } else if (act === "up" || act === "down") {
    pushHistory();
    const i = state.layers.indexOf(L);
    const j = act === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= state.layers.length) return;
    [state.layers[i], state.layers[j]] = [state.layers[j], state.layers[i]];
    changedLayers();
  } else if (act === "textApply") {
    const li = btn.closest(".layer");
    const text = li.querySelector('[data-act="textValue"]').value.trim();
    if (!text) return;
    pushHistory();
    const sizeMm = Number(li.querySelector('[data-act="textSize"]').value) || 10;
    L.text = { ...L.text, text, font: li.querySelector('[data-act="textFont"]').value, px: sizeMm / (state.patternScale || geometry().mmPerPx) };
    ensureTextFonts();
    paintTextLayer(L, state.labels).then(() => {
      updateRaster();
      scheduleVectorize(10);
    });
  } else if (act === "delete") {
    pushHistory();
    for (let i = 0; i < state.labels.length; i++) if (state.labels[i] === L.id) state.labels[i] = -1;
    state.layers = state.layers.filter((o) => o !== L);
    if (state.selected === L.id) state.selected = state.layers[0]?.id ?? null;
    refreshAll();
  }
});

$("#layers").addEventListener("change", (e) => {
  const el = e.target;
  const L = layerFromEvent(e);
  if (!L || !el.dataset.act) return;
  const act = el.dataset.act;
  if (["textValue", "textSize", "textFont"].includes(act)) return;
  if ((act === "thread" || act === "merge") && !el.value) return;
  pushHistory();
  if (act === "color" || act === "thread") {
    L.color = el.value.toUpperCase();
    L.name = threadLabel(L.color);
    updateRaster();
    changedLayers();
  } else if (act === "type") {
    L.type = el.value;
    if (L.type === "satin" && L.angle !== null) L.angle = null;
    changedLayers();
  } else if (act === "angle") {
    L.angle = Number(el.value) || 0;
    changedLayers();
  } else if (act === "angleAuto") {
    L.angle = el.checked ? null : 45;
    changedLayers();
  } else if (["density", "stitchLength", "pullComp"].includes(act)) {
    state.undo.pop(); // déjà enregistré au début du glissement
    updateHistoryButtons();
    L[act] = Number(el.value);
    changedLayers();
  } else if (["underlay", "outline", "triple"].includes(act)) {
    L[act] = el.checked;
    changedLayers();
  } else if (act === "merge") {
    const target = Number(el.value);
    if (!el.value || !layerById(target)) return;
    for (let i = 0; i < state.labels.length; i++) if (state.labels[i] === L.id) state.labels[i] = target;
    state.layers = state.layers.filter((o) => o !== L);
    state.selected = target;
    refreshAll();
  }
});

// Retour visuel immédiat sur les curseurs.
let layerSliderTimer = null;
$("#layers").addEventListener("input", (e) => {
  const out = e.target.parentElement.querySelector("output") || e.target.closest(".field")?.querySelector("output");
  if (out && e.target.type === "range") out.textContent = e.target.value;
  // Aperçu en direct pendant le glissement, sans redessiner la liste.
  const act = e.target.dataset.act;
  const L = layerFromEvent(e);
  if (L && ["density", "stitchLength", "pullComp"].includes(act)) {
    historyOnce(e.target);
    L[act] = Number(e.target.value);
    clearTimeout(layerSliderTimer);
    layerSliderTimer = setTimeout(() => requestCompute("stitch"), 300);
  }
});

function changedLayers() {
  renderLayers();
  render();
  scheduleStitch(60);
}

const NEW_COLORS = ["#E4572E", "#29335C", "#F3A712", "#669BBC", "#2E933C", "#A8201A", "#8E5572", "#111111", "#FFFFFF"];
$("#btnAddLayer").addEventListener("click", () => {
  if (!state.labels) return;
  pushHistory();
  const used = new Set(state.layers.map((L) => L.color));
  const color = NEW_COLORS.find((c) => !used.has(c)) || "#E4572E";
  const id = Math.max(-1, ...state.layers.map((L) => L.id)) + 1;
  state.layers.push({ id, source: color, color, name: threadLabel(color), visible: true, ...DEFAULT_LAYER, density: state.spacing });
  state.selected = id;
  state.expanded.add(id);
  renderLayers();
  setTool("brush");
});

// ------------------------------------------------------------------ interface

// ------------------------------------------------------------------ taille rapide

/** Règle la taille par le côté le plus long du motif (mm). */
function setLongSide(mm) {
  pushHistory();
  const { box } = geometry();
  state.widthMm = box.w >= box.h ? mm : (mm * box.w) / box.h;
  refreshUI();
  scheduleStitch(0);
  if (state.mode === "file") setTimeout(fitView, 150);
}

function syncSizeBar() {
  if (!state.labels) return;
  const { heightMm } = geometry();
  const long = Math.max(state.widthMm, heightMm);
  const hoop = hoopSize();
  const max = hoop ? Math.max(...hoop) : 400;
  $("#sizeRange").max = Math.max(max, Math.ceil(long));
  $("#sizeRange").value = Math.round(long);
  $("#sizeOut").textContent = `${fmt(state.widthMm)} × ${fmt(heightMm)} mm`;
  $("#sizeOut").classList.toggle("bad", !fitsHoop());
  const fit = hoopFitWidth();
  for (const b of $$("#sizeChips [data-size]")) {
    const v = b.dataset.size;
    b.classList.toggle("active", v !== "max" && Math.abs(Number(v) - long) < 0.6);
    if (v === "max") b.disabled = !fit;
  }
}

$("#sizeChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-size]");
  if (!b || !state.labels) return;
  if (b.dataset.size === "max") {
    const fit = hoopFitWidth();
    if (!fit) return;
    pushHistory();
    state.widthMm = Math.floor(fit);
    refreshUI();
    scheduleStitch(0);
    if (state.mode === "file") setTimeout(fitView, 150);
  } else setLongSide(Number(b.dataset.size));
});
$("#sizeRange").addEventListener("input", (e) => {
  // Aperçu immédiat des dimensions pendant le glissement.
  const { box } = geometry();
  const long = Number(e.target.value);
  const w = box.w >= box.h ? long : (long * box.w) / box.h;
  $("#sizeOut").textContent = `${fmt(w)} × ${fmt((w * box.h) / box.w)} mm`;
});
let sizeTimer = null;
$("#sizeRange").addEventListener("input", (e) => {
  clearTimeout(sizeTimer);
  sizeTimer = setTimeout(() => setLongSide(Number(e.target.value)), 350);
});
$("#sizeRange").addEventListener("change", (e) => {
  clearTimeout(sizeTimer);
  setLongSide(Number(e.target.value));
});

function refreshUI() {
  syncSizeBar();
  syncSimpleSteps();
  const { heightMm } = geometry();
  $("#widthMm").value = Math.round(state.widthMm);
  $("#heightMm").value = Math.round(heightMm);
  const hoop = hoopSize();
  const fits = fitsHoop();
  const status = $("#hoopStatus");
  if (!hoop) {
    status.textContent = "";
    status.className = "hoop-status";
  } else {
    status.textContent = fits
      ? `✓ Le motif (${fmt(state.widthMm)} × ${fmt(heightMm)} mm) rentre dans le cadre.`
      : `⚠ ${fmt(state.widthMm)} × ${fmt(heightMm)} mm ne rentre pas dans le cadre ${hoop[0]} × ${hoop[1]} mm.`;
    status.className = "hoop-status " + (fits ? "ok" : "bad");
  }
  $("#btnFitHoop").hidden = fits;
  $("#btnExport").disabled = !state.pattern || !state.pattern.stats.stitchCount;
  $("#btnQuick").disabled = $("#btnExport").disabled;
  $("#btnSaveProject").disabled = !state.labels;
  $("#btnGuide").disabled = !state.pattern || !state.pattern.stats.stitchCount;
  const total = state.pattern ? state.pattern.stitches.length : 0;
  $("#progress").max = total;
  $("#progress").value = state.progress;
  renderLayers();
  renderStats();
  render();
}

let alerts = [];
function renderAlerts() {
  const box = $("#alerts");
  alerts = state.pattern && state.pattern.stats.stitchCount ? checkPattern(state.pattern) : [];
  if (state.labels && !fitsHoop()) alerts.unshift({ kind: "hoop", level: "warn", text: "Le motif dépasse le cadre choisi : utilisez « Max cadre » sous l'aperçu.", at: null });
  for (const L of state.layers) {
    if (L.text && L.text.px * state.patternScale < 5 && L.visible) {
      alerts.push({ kind: "small", level: "warn", text: `Texte « ${L.text.text} » : lettres de moins de 5 mm, elles se brodent mal. Agrandissez-le.`, at: null });
    }
  }
  if (!alerts.length) {
    box.innerHTML = state.pattern?.stats.stitchCount ? `<p class="alert ok">✓ Aucun problème détecté.</p>` : "";
    return;
  }
  box.innerHTML = alerts
    .map((a, i) => `<div class="alert ${a.level}"><span></span>${a.at ? `<button class="btn small ghost" data-alert="${i}">Voir</button>` : ""}</div>`)
    .join("");
  // Texte inséré sans HTML (il peut contenir un texte saisi).
  alerts.forEach((a, i) => (box.children[i].querySelector("span").textContent = (a.level === "warn" ? "⚠ " : "ℹ ") + a.text));
}
$("#alerts").addEventListener("click", (e) => {
  const b = e.target.closest("[data-alert]");
  if (!b || !state.pattern) return;
  const a = alerts[Number(b.dataset.alert)];
  const k = 1 / (10 * state.patternScale);
  const wx = a.at[0] * k + state.pattern.origin[0] / state.patternScale;
  const wy = a.at[1] * k + state.pattern.origin[1] / state.patternScale;
  if (state.view !== "stitch") setView("stitch");
  const r = canvas.getBoundingClientRect();
  view.s = Math.max(view.s, 4);
  view.tx = r.width / 2 - wx * view.s;
  view.ty = r.height / 2 - wy * view.s;
  state.focus = [wx, wy];
  setMobileTab("apercu");
  render();
});

function renderStats() {
  renderAlerts();
  const p = state.pattern;
  if (!p) {
    $("#stats").innerHTML = "";
    return;
  }
  const s = p.stats;
  const thread = s.layers.reduce((a, L) => a + L.lengthMm, 0) / 1000;
  $("#stats").innerHTML = `
    <h2>Résumé</h2>
    <dl>
      <div><dt>Points</dt><dd>${fmt(s.stitchCount)}</dd></div>
      <div><dt>Couleurs</dt><dd>${s.colors}</dd></div>
      <div><dt>Taille</dt><dd>${fmt(s.widthMm, 1)} × ${fmt(s.heightMm, 1)} mm</dd></div>
      <div><dt>Coupes de fil</dt><dd>${s.trims}</dd></div>
      <div><dt>Fil utilisé</dt><dd>≈ ${fmt(thread, 1)} m</dd></div>
      <div><dt>Durée estimée</dt><dd>≈ ${fmt(Math.max(1, Math.round(s.minutes)))} min</dd></div>
    </dl>`;
}

function bindRange(id, key, handler, parse = Number) {
  const el = $("#" + id);
  const out = $("#" + id + "Out");
  el.addEventListener("input", () => {
    if (out) out.textContent = el.value;
  });
  liveRange(
    el,
    (v) => {
      if (state.settings[key] === parse(v)) return;
      state.settings[key] = parse(v);
      handler();
    },
    450,
  );
}

bindRange("colors", "colors", () => runAnalyze());
bindRange("cleanup", "cleanup", () => runAnalyze());
bindRange("smoothing", "smoothing", () => runAnalyze());
bindRange("curve", "curve", () => scheduleVectorize());
bindRange("detail", "detail", () => scheduleVectorize());
$("#removeBg").addEventListener("change", (e) => {
  state.settings.removeBackground = e.target.checked;
  runAnalyze();
});

$("#widthMm").addEventListener("change", (e) => {
  const v = Number(e.target.value);
  if (!(v > 0)) return;
  pushHistory();
  state.widthMm = v;
  refreshUI();
  scheduleStitch(0);
  if (state.mode === "file") setTimeout(fitView, 150);
});
$("#heightMm").addEventListener("change", (e) => {
  const v = Number(e.target.value);
  if (!(v > 0) || !state.labels) return;
  pushHistory();
  const { box } = geometry();
  state.widthMm = (v * box.w) / box.h;
  refreshUI();
  scheduleStitch(0);
  if (state.mode === "file") setTimeout(fitView, 150);
});
const HOOP_LABEL = (h) => {
  const [w, hh] = h.split("x").map(Number);
  return `${w} × ${hh} mm (${fmt(w / 25.4, 1)}″ × ${fmt(hh / 25.4, 1)}″)`;
};

function fillMachineUI() {
  $("#machine").innerHTML = Object.entries(MACHINES)
    .map(([k, m]) => `<option value="${k}">${m.label} — .${m.format.toUpperCase()}</option>`)
    .join("");
  $("#machine").value = state.machine;
  const m = MACHINES[state.machine];
  if (!m.hoops.includes(state.hoop) && state.hoop !== "none") state.hoop = m.hoops[0];
  $("#hoop").innerHTML = m.hoops.map((h) => `<option value="${h}">${HOOP_LABEL(h)}</option>`).join("") + `<option value="none">Aucun</option>`;
  $("#hoop").value = state.hoop;
  $("#fileFormat").innerHTML = Object.entries(FORMATS)
    .map(([k, f]) => `<option value="${k}">.${f.label} — ${f.machine}${k === m.format ? " (recommandé)" : ""}</option>`)
    .join("");
  if (!FORMATS[state.format]) state.format = m.format;
  $("#fileFormat").value = state.format;
  const ext = state.format.toUpperCase();
  $("#btnQuick").textContent = `⬇ Fichier .${ext}`;
  $("#btnQuick").title = `Télécharger pour ${m.label}`;
  $("#btnMachineDownload").textContent = `⬇ Télécharger pour ${m.label} (.${ext})`;
  hostedDownloads.then((d) => {
    if (d) $("#btnMachineDownload").textContent = `⬇ Télécharger pour ${m.label} (.${ext} dans un .zip)`;
  });
  $("#machineHelp").textContent = m.usb;
}

$("#machine").addEventListener("change", (e) => {
  pushHistory();
  state.machine = e.target.value;
  try {
    localStorage.setItem("filtrace.machine", state.machine);
  } catch {}
  state.hoop = MACHINES[state.machine].hoops[0];
  state.format = MACHINES[state.machine].format;
  fillMachineUI();
  refreshUI();
  fitView();
});

$("#fileFormat").addEventListener("change", (e) => {
  pushHistory();
  state.format = e.target.value;
  fillMachineUI();
  const rec = MACHINES[state.machine].format;
  if (state.format !== rec) toast(`Attention : votre machine lit le format .${rec.toUpperCase()}.`, "bad");
});

/** Type de point commun à tous les calques brodés (null si mélangé). */
function commonStitchType() {
  const types = new Set(state.layers.filter((L) => L.type !== "none").map((L) => L.type));
  return types.size === 1 ? [...types][0] : null;
}

function syncStitchPick() {
  const t = commonStitchType();
  for (const b of $$("#stitchPick [data-type]")) b.setAttribute("aria-checked", String(b.dataset.type === t));
  $("#stitchPickHint").textContent = t
    ? "Réglable ensuite couleur par couleur dans « Calques de fil »."
    : "Types différents selon les couleurs (voir « Calques de fil »). Choisissez-en un pour tout le motif.";
}

$("#stitchPick").addEventListener("click", (e) => {
  const b = e.target.closest("[data-type]");
  if (!b || !state.labels) return;
  pushHistory();
  for (const L of state.layers) {
    if (L.type === "none") continue;
    L.type = b.dataset.type;
    if (L.type === "satin") L.angle = null;
    else if (L.angle === null) L.angle = DEFAULT_LAYER.angle;
  }
  changedLayers();
});

function syncStyleUI() {
  const outline = state.style !== "fill";
  $("#spacingField").hidden = outline;
  $("#stitchPickField").hidden = outline;
  const len = outline ? state.outlineLength : state.stitchLength;
  $("#stitchLen").value = len;
  $("#stitchLenOut").textContent = len;
  $("#spacing").value = state.spacing;
  $("#spacingOut").textContent = state.spacing;
  $("#style").value = state.style;
  $("#outlineOpts").hidden = state.style === "fill";
  $("#outlineColorWrap").hidden = state.style !== "outline1";
  $("#outlineColor").value = state.outlineColor.toLowerCase();
  $("#outlineTriple").checked = state.outlineTriple;
}
// Réglages globaux : appliqués à tous les calques (modifiables ensuite calque par calque).
for (const id of ["spacing", "stitchLen"]) {
  $("#" + id).addEventListener("input", (e) => ($("#" + id + "Out").textContent = e.target.value));
}
liveRange($("#spacing"), (v) => {
  state.spacing = Number(v);
  for (const L of state.layers) L.density = state.spacing;
  renderLayers();
  scheduleStitch(0);
});
liveRange($("#stitchLen"), (v) => {
  const n = Number(v);
  if (state.style !== "fill") {
    state.outlineLength = n;
  } else {
    state.stitchLength = n;
    for (const L of state.layers) L.stitchLength = n;
    renderLayers();
  }
  scheduleStitch(0);
});

$("#style").addEventListener("change", (e) => {
  pushHistory();
  const wasSketch = state.style === "sketch";
  state.style = e.target.value;
  if (wasSketch !== (state.style === "sketch")) {
    syncStyleUI();
    runAnalyze();
    return;
  }
  syncStyleUI();
  scheduleStitch(0);
});
$("#outlineColor").addEventListener("change", (e) => {
  pushHistory();
  state.outlineColor = e.target.value.toUpperCase();
  scheduleStitch(0);
});
$("#outlineTriple").addEventListener("change", (e) => {
  pushHistory();
  state.outlineTriple = e.target.checked;
  scheduleStitch(0);
});

$("#hoop").addEventListener("change", (e) => {
  pushHistory();
  state.hoop = e.target.value;
  refreshUI();
  fitView();
});
$("#btnFitHoop").addEventListener("click", () => {
  const fit = hoopFitWidth();
  if (!fit) return;
  pushHistory();
  state.widthMm = Math.floor(fit);
  refreshUI();
  scheduleStitch(0);
});

$$("#viewTabs [data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
$$("#tools [data-tool]").forEach((b) => b.addEventListener("click", () => setTool(b.dataset.tool)));
$("#brushSize").addEventListener("input", (e) => {
  state.brush = Number(e.target.value);
  render();
});
$("#zoomIn").addEventListener("click", () => zoomAt(1.25, canvas.clientWidth / 2, canvas.clientHeight / 2));
$("#zoomOut").addEventListener("click", () => zoomAt(0.8, canvas.clientWidth / 2, canvas.clientHeight / 2));
$("#zoomFit").addEventListener("click", fitView);
$("#btnUndo").addEventListener("click", undo);
$("#btnRedo").addEventListener("click", redo);

$("#fabric").addEventListener("input", (e) => {
  state.fabric = e.target.value;
  render();
});
$("#showJumps").addEventListener("change", (e) => {
  state.showJumps = e.target.checked;
  render();
});

// Simulation de broderie
$("#progress").addEventListener("input", (e) => {
  state.progress = Number(e.target.value);
  stopPlay();
  if (state.view !== "stitch") setView("stitch");
  render();
});
function stopPlay() {
  state.playing = false;
  $("#btnPlay").textContent = "▶ Simuler";
}
$("#btnPlay").addEventListener("click", () => {
  if (!state.pattern) return;
  if (state.playing) return stopPlay();
  if (state.view !== "stitch") setView("stitch");
  const total = state.pattern.stitches.length;
  if (state.progress >= total) state.progress = 0;
  state.playing = true;
  $("#btnPlay").textContent = "❚❚ Pause";
  const tick = () => {
    if (!state.playing) return;
    state.progress = Math.min(total, state.progress + Number($("#speed").value));
    $("#progress").value = state.progress;
    render();
    if (state.progress >= total) stopPlay();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// Import
$("#fileInput").addEventListener("change", (e) => loadFile(e.target.files[0]));
// ------------------------------------------------------------------ modèles

const TEMPLATES = [
  ["coeur", "Cœur"],
  ["etoile", "Étoile"],
  ["fleur", "Fleur"],
  ["badge-montagne", "Badge montagne"],
  ["patte", "Patte"],
  ["ancre", "Ancre"],
  ["couronne", "Couronne"],
  ["eclair", "Éclair"],
  ["arc-en-ciel", "Arc-en-ciel"],
];
$("#templateGrid").innerHTML = TEMPLATES.map(
  ([k, label]) => `<button type="button" data-tpl="${k}"><img src="assets/modeles/${k}.svg" alt="" loading="lazy" />${label}</button>`,
).join("");
$("#btnTemplates").addEventListener("click", () => $("#templatesDialog").showModal());
$("#templatesClose").addEventListener("click", () => $("#templatesDialog").close());
$("#templateGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tpl]");
  if (!b) return;
  const img = new Image();
  img.onload = () => {
    $("#templatesDialog").close();
    state.original = img;
    loadImage(img, b.dataset.tpl);
  };
  img.src = `assets/modeles/${b.dataset.tpl}.svg`;
});

// ------------------------------------------------------------------ thème, mode simple, visite guidée

function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  const dark = theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  $("#btnTheme").textContent = dark ? "☀" : "☾";
  $("#btnTheme").title = dark ? "Passer en mode clair" : "Passer en mode sombre";
}
$("#btnTheme").addEventListener("click", () => {
  const dark = $("#btnTheme").textContent === "☾";
  const theme = dark ? "dark" : "light";
  try {
    localStorage.setItem("filtrace.theme", theme);
  } catch {}
  applyTheme(theme);
  render();
});

function setSimple(on) {
  document.body.classList.toggle("simple", on);
  $("#btnMode").textContent = on ? "Mode avancé" : "Mode simple";
  $("#btnMode").title = on ? "Afficher tous les réglages" : "N'afficher que l'essentiel";
  try {
    localStorage.setItem("filtrace.mode", on ? "simple" : "advanced");
  } catch {}
  if (on && state.tool !== "pan") setTool("pan");
  if (on && (state.view === "raster" || state.view === "vector")) setView("stitch");
}
$("#btnMode").addEventListener("click", () => setSimple(!document.body.classList.contains("simple")));

function syncSimpleSteps() {
  $("#sstep1").classList.toggle("done", !!state.labels);
  $("#sstep2").classList.toggle("done", !!state.labels && fitsHoop());
}

const TOUR = [
  { el: "#dropzone", tab: "reglages", text: "Commencez ici : importez une image (photo, logo, dessin), ou choisissez un de nos modèles." },
  { el: "#btnText", tab: "reglages", text: "Ajoutez un prénom ou un mot, dans la police et à la hauteur de votre choix." },
  { el: "#machine", tab: "reglages", text: "Choisissez votre machine : le bon format de fichier et les bons cadres sont réglés pour vous." },
  { el: "#sizeBar", tab: "apercu", text: "Choisissez la taille de la broderie. Elle passe en rouge si elle ne rentre pas dans le cadre." },
  { el: "#btnQuick", tab: null, text: "Téléchargez le fichier et copiez-le sur la clé USB de votre machine." },
  { el: "#btnMode", tab: null, text: "Besoin de plus de réglages (types de points, densité, retouches) ? Passez en mode avancé." },
];
let tourStep = -1;
function showTour(i) {
  $$(".tour-highlight").forEach((e) => e.classList.remove("tour-highlight"));
  tourStep = i;
  const step = TOUR[i];
  if (!step) {
    $("#tour").hidden = true;
    try {
      localStorage.setItem("filtrace.tour", "done");
    } catch {}
    return;
  }
  if (step.tab && matchMedia("(max-width: 860px)").matches) setMobileTab(step.tab);
  const el = $(step.el);
  el.scrollIntoView({ block: "center", behavior: "instant" });
  el.classList.add("tour-highlight");
  $("#tourText").textContent = step.text;
  $("#tourCount").textContent = `${i + 1} / ${TOUR.length}`;
  $("#tourNext").textContent = i === TOUR.length - 1 ? "Terminer" : "Suivant";
  const tour = $("#tour");
  tour.hidden = false;
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    const t = tour.getBoundingClientRect();
    const below = r.bottom + 12 + t.height < innerHeight;
    tour.style.top = `${below ? r.bottom + 12 : Math.max(12, r.top - t.height - 12)}px`;
    tour.style.left = `${Math.min(innerWidth - t.width - 12, Math.max(12, r.left))}px`;
  });
}
$("#tourNext").addEventListener("click", () => showTour(tourStep + 1));
$("#tourSkip").addEventListener("click", () => showTour(TOUR.length));
$("#btnTour").addEventListener("click", () => showTour(0));

// ------------------------------------------------------------------ avant / après

$("#btnCompare").addEventListener("click", () => {
  state.compare = !state.compare;
  $("#btnCompare").setAttribute("aria-pressed", String(state.compare));
  if (state.compare && state.view !== "stitch") setView("stitch");
  render();
});

for (const zone of [$("#dropzone"), $("#canvasWrap")]) {
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("drag");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag");
    loadFile(e.dataTransfer.files[0]);
  });
}
document.addEventListener("paste", (e) => {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
  if (item) loadFile(item.getAsFile());
});

// Raccourcis clavier
document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, select, textarea")) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === "z") {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
  } else if (mod && e.key.toLowerCase() === "y") {
    e.preventDefault();
    redo();
  } else if (!mod) {
    const map = { h: "pan", b: "brush", e: "eraser", g: "bucket", i: "picker", w: "wand", m: "move" };
    const views = { 1: "original", 2: "raster", 3: "vector", 4: "stitch" };
    if (map[e.key]) setTool(map[e.key]);
    else if (views[e.key]) setView(views[e.key]);
    else if (e.key === " ") {
      spaceDown = true;
      e.preventDefault();
    } else if (e.key === "+" || e.key === "=") zoomAt(1.25, canvas.clientWidth / 2, canvas.clientHeight / 2);
    else if (e.key === "-") zoomAt(0.8, canvas.clientWidth / 2, canvas.clientHeight / 2);
    else if (e.key === "0") fitView();
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key === " ") spaceDown = false;
});

// ------------------------------------------------------------------ tissu & nuancier

$("#fabricType").innerHTML = Object.entries(FABRICS)
  .map(([k, f]) => `<option value="${k}">${f.label}</option>`)
  .join("");
$("#fabricType").addEventListener("change", (e) => {
  state.fabricType = e.target.value;
  const f = FABRICS[state.fabricType];
  pushHistory();
  state.spacing = f.spacing;
  state.stitchLength = f.stitchLength;
  for (const L of state.layers) {
    L.density = f.spacing;
    L.stitchLength = f.stitchLength;
    L.pullComp = f.pullComp;
    L.underlay = f.underlay;
  }
  syncStyleUI();
  syncFabricUI();
  renderLayers();
  scheduleStitch(0);
});
function syncFabricUI() {
  $("#fabricType").value = state.fabricType;
  $("#fabricTip").textContent = FABRICS[state.fabricType]?.tip || "";
}

$("#threadChart").innerHTML = Object.entries(THREAD_CHARTS)
  .map(([k, c]) => `<option value="${k}">${c.label}</option>`)
  .join("");
$("#threadChart").addEventListener("change", (e) => {
  state.threadChart = e.target.value;
  try {
    localStorage.setItem("filtrace.chart", state.threadChart);
  } catch {}
  for (const L of state.layers) L.name = threadLabel(L.color) + (L.name.endsWith("(intérieur)") ? " (intérieur)" : "");
  renderLayers();
  if (state.pattern) state.pattern.threads.forEach((t, i) => (t.name = state.layers.find((L) => L.color === t.color)?.name || t.name));
});

// ------------------------------------------------------------------ mes bobines

function renderOwned() {
  const set = new Set(state.owned);
  $("#ownedGrid").innerHTML = THREAD_CHARTS[state.threadChart].threads
    .map(
      (t) => `<label class="owned-item" title="${t[1]} · ${t[2]}"><input type="checkbox" value="#${t[0]}" ${set.has("#" + t[0]) ? "checked" : ""} />
      <span class="sw" style="background:#${t[0]}"></span><span>${t[2]} · ${t[1]}</span></label>`,
    )
    .join("");
  $("#useOwned").checked = state.useOwned;
  $("#ownedCount").textContent = `${state.owned.length} bobine(s) cochée(s)`;
  $("#btnOwned").textContent = `Mes bobines (${state.owned.length})`;
}
function saveOwned() {
  try {
    localStorage.setItem("filtrace.owned", JSON.stringify({ owned: state.owned, use: state.useOwned }));
  } catch {}
}
$("#btnOwned").addEventListener("click", () => {
  renderOwned();
  $("#ownedDialog").showModal();
});
$("#ownedClose").addEventListener("click", () => $("#ownedDialog").close());
$("#ownedGrid").addEventListener("change", (e) => {
  const v = e.target.value.toUpperCase();
  state.owned = e.target.checked ? [...new Set([...state.owned, v])] : state.owned.filter((h) => h !== v);
  saveOwned();
  $("#ownedCount").textContent = `${state.owned.length} bobine(s) cochée(s)`;
  $("#btnOwned").textContent = `Mes bobines (${state.owned.length})`;
});
$("#useOwned").addEventListener("change", (e) => {
  state.useOwned = e.target.checked;
  saveOwned();
});
$("#ownedApply").addEventListener("click", () => {
  $("#ownedDialog").close();
  if (!state.useOwned || !state.owned.length) {
    toast("Cochez vos bobines et « N'utiliser que mes bobines ».", "bad");
    return;
  }
  pushHistory();
  applyOwnedThreads(state.layers);
  updateRaster();
  changedLayers();
  toast("Couleurs remplacées par vos bobines les plus proches.", "ok");
});

// ------------------------------------------------------------------ texte

$("#textFont").innerHTML = FONTS.map((f) => `<option value="${f.family}">${f.label}</option>`).join("");
let textPreviewTimer = null;

function textOptions() {
  return {
    text: $("#textValue").value.trim() || "Texte",
    font: $("#textFont").value,
    sizeMm: Math.max(4, Number($("#textSize").value) || 15),
    pos: $("#textPos").value,
    color: $("#textColor").value.toUpperCase(),
  };
}

async function drawTextPreview() {
  const c = $("#textPreview");
  const g = c.getContext("2d");
  const o = textOptions();
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  const m = await measureText(o.text, { font: o.font, px: 60 });
  const k = Math.min(1, (c.width - 40) / m.width, (c.height - 30) / m.height);
  await drawText(g, o.text, { font: o.font, px: 60 * k, color: o.color, cx: c.width / 2, cy: c.height / 2 });
}

let textFontsLoaded = false;
/** Polices du texte chargées seulement quand on en a besoin. */
function ensureTextFonts() {
  if (textFontsLoaded) return;
  textFontsLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Dancing+Script:wght@700&family=Lobster&family=Pacifico&family=Roboto+Slab:wght@700&display=swap";
  link.onload = () => drawTextPreview();
  document.head.appendChild(link);
}

function openTextDialog() {
  ensureTextFonts();
  $("#textAdd").disabled = !state.labels || state.mode === "file";
  $("#textDialog").showModal();
  drawTextPreview();
}
$("#btnText").addEventListener("click", openTextDialog);
$("#textCancel").addEventListener("click", () => $("#textDialog").close());
for (const id of ["textValue", "textFont", "textSize", "textColor"]) {
  $("#" + id).addEventListener("input", () => {
    clearTimeout(textPreviewTimer);
    textPreviewTimer = setTimeout(drawTextPreview, 120);
  });
}

// Motif composé uniquement de texte, à la taille réelle demandée.
$("#textNew").addEventListener("click", async () => {
  const o = textOptions();
  const pxPerMm = 8;
  const m = await measureText(o.text, { font: o.font, px: o.sizeMm * pxPerMm });
  const pad = 30;
  const c = document.createElement("canvas");
  c.width = Math.ceil(m.width + pad * 2);
  c.height = Math.ceil(m.height + pad * 2);
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  await drawText(g, o.text, { font: o.font, px: o.sizeMm * pxPerMm, color: o.color, cx: c.width / 2, cy: c.height / 2 });
  $("#textDialog").close();
  state.settings.colors = 2;
  state.style = "fill";
  syncSettingsUI();
  state.original = c;
  state.pendingTextOnly = true;
  // Largeur réelle du texte (sans les marges blanches retirées au calcul).
  loadImage(c, o.text.split(/\s/)[0] || "texte", { widthMm: m.width / pxPerMm });
});

// Texte ajouté à l'image en cours : nouveau calque à la bonne taille.
$("#textAdd").addEventListener("click", async () => {
  if (!state.labels || state.mode === "file") return;
  const o = textOptions();
  const { box, mmPerPx } = geometry();
  const px = o.sizeMm / mmPerPx;
  const m = await measureText(o.text, { font: o.font, px });
  const gap = px * 0.6;
  // Place libre au-dessus / en dessous : on agrandit l'image si nécessaire.
  let cy;
  if (o.pos === "center") cy = box.y + box.h / 2;
  else if (o.pos === "top") cy = box.y - gap - m.height / 2;
  else cy = box.y + box.h + gap + m.height / 2;
  const cx = box.x + box.w / 2;
  const needTop = Math.max(0, Math.ceil(m.height / 2 - cy + 4));
  const needBottom = Math.max(0, Math.ceil(cy + m.height / 2 - state.h + 4));
  const needSide = Math.max(0, Math.ceil(m.width / 2 - cx + 4), Math.ceil(cx + m.width / 2 - state.w + 4));
  pushHistory();
  growCanvas(needTop, needBottom, needSide);
  const id = Math.max(-1, ...state.layers.map((L) => L.id)) + 1;
  const T = {
    id,
    source: o.color,
    color: o.color,
    name: threadLabel(o.color) + " (texte)",
    visible: true,
    ...DEFAULT_LAYER,
    density: state.spacing,
    // Paramètres gardés : le texte reste modifiable et survit aux réanalyses.
    text: { text: o.text, font: o.font, px, cx: cx + needSide, cy: cy + needTop },
  };
  await paintTextLayer(T, state.labels);
  state.layers.push(T);
  // Garde l'échelle : le texte fait bien la hauteur demandée.
  state.selected = id;
  state.expanded.add(id);
  $("#textDialog").close();
  state.widthMm = geometry().box.w * mmPerPx;
  requestCompute("vectorize", { fit: true });
});

/** Dessine les lettres d'un calque texte dans la carte des calques. */
async function paintTextLayer(T, labels) {
  for (let i = 0; i < labels.length; i++) if (labels[i] === T.id) labels[i] = -1;
  const mask = document.createElement("canvas");
  mask.width = state.w;
  mask.height = state.h;
  const mg = mask.getContext("2d", { willReadFrequently: true });
  await drawText(mg, T.text.text, { font: T.text.font, px: T.text.px, color: "#000", cx: T.text.cx, cy: T.text.cy });
  const md = mg.getImageData(0, 0, state.w, state.h).data;
  for (let i = 0; i < labels.length; i++) if (md[i * 4 + 3] >= 128) labels[i] = T.id;
}

/** Agrandit l'image de travail (marges blanches) en conservant les calques. */
function growCanvas(top, bottom, side) {
  if (!top && !bottom && !side) return;
  const w = state.w + side * 2;
  const h = state.h + top + bottom;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#fff";
  g.fillRect(0, 0, w, h);
  g.drawImage(state.source, side, top);
  const labels = new Int16Array(w * h).fill(-1);
  for (let y = 0; y < state.h; y++) labels.set(state.labels.subarray(y * state.w, (y + 1) * state.w), (y + top) * w + side);
  state.source = c;
  state.labels = labels;
  state.w = w;
  state.h = h;
  state.rgbaBase = g.getImageData(0, 0, w, h).data;
  state.rgba = adjustPixels(state.rgbaBase, state.photo);
}

// ------------------------------------------------------------------ guide de broderie

const STEP_NOTES = {
  placement: "Brodez la ligne de placement, puis posez le morceau de tissu dessus pour la recouvrir.",
  fixation: "La machine fixe le tissu. Retirez le cadre sans démonter et découpez le tissu au ras de la couture.",
  bordure: "Bordure satin : elle recouvre le bord coupé du tissu.",
};

function guideBlocks() {
  const p = state.pattern;
  if (!p) return [];
  const blocks = [];
  let start = 0;
  let trims = 0;
  p.stitches.forEach((s, i) => {
    if (s[2] === TRIM) trims++;
    if (s[2] === COLOR_CHANGE || i === p.stitches.length - 1) {
      blocks.push({ end: i + 1, trims });
      start = i + 1;
      trims = 0;
    }
  });
  return blocks.map((b, i) => ({
    ...b,
    thread: p.threads[i] || p.threads[p.threads.length - 1],
    stats: p.stats.layers[i],
    step: p.steps?.[i] || null,
  }));
}

function renderGuide() {
  const blocks = guideBlocks();
  const m = MACHINES[state.machine];
  $("#guideIntro").textContent =
    `${blocks.length} étape(s) de fil pour ${m.label}. ` +
    (m.trims === false ? "Votre machine ne coupe pas le fil toute seule : coupez les fils de saut à la fin de chaque couleur. " : "") +
    "Touchez une étape pour voir ce qui est brodé jusque-là.";
  const cur = Math.min(state.guideStep, blocks.length - 1);
  $("#guideList").innerHTML = blocks
    .map((b, i) => {
      const same = i > 0 && blocks[i - 1].thread.color === b.thread.color;
      const note = b.step ? STEP_NOTES[b.step] : same ? "Même fil : la machine s'arrête seulement." : "Changez de fil.";
      return `<li data-step="${i}" class="${i === cur ? "current" : i < cur ? "done" : ""}">
        <span class="sw" style="background:${b.thread.color}"></span>
        <div><b>${i + 1}. ${b.thread.name}</b>
          <small>${b.thread.color} · ${fmt(b.stats?.stitches || 0)} points${b.trims > 1 ? ` · ${b.trims - 1} fil(s) à couper` : ""}</small>
          <div class="note">${note}</div></div>
        <button class="btn small ghost" data-see="${i}">Voir</button></li>`;
    })
    .join("");
  $("#guidePrev").disabled = cur <= 0;
  $("#guideNext").disabled = cur >= blocks.length - 1;
  showGuideStep(cur);
}

function showGuideStep(i) {
  const blocks = guideBlocks();
  if (!blocks[i]) return;
  state.guideStep = i;
  stopPlay();
  if (state.view !== "stitch") setView("stitch");
  state.progress = blocks[i].end;
  $("#progress").value = state.progress;
  render();
}

$("#btnGuide").addEventListener("click", () => {
  state.guideStep = 0;
  renderGuide();
  $("#guideDialog").showModal();
});
$("#guideClose").addEventListener("click", () => $("#guideDialog").close());
$("#guidePrev").addEventListener("click", () => {
  state.guideStep = Math.max(0, state.guideStep - 1);
  renderGuide();
});
$("#guideNext").addEventListener("click", () => {
  state.guideStep++;
  renderGuide();
});
$("#guideList").addEventListener("click", (e) => {
  const li = e.target.closest("[data-step]");
  if (!li) return;
  state.guideStep = Number(li.dataset.step);
  renderGuide();
});

// ------------------------------------------------------------------ onglets téléphone

function setMobileTab(tab) {
  if (tab === "export") {
    if (state.pattern) $("#btnExport").click();
    return;
  }
  document.body.dataset.mtab = tab;
  $$("#mobileTabs [data-mtab]").forEach((b) => b.classList.toggle("active", b.dataset.mtab === tab));
  if (tab === "apercu") requestAnimationFrame(() => (resizeCanvas(), fitView()));
  window.scrollTo(0, 0);
}
$$("#mobileTabs [data-mtab]").forEach((b) => b.addEventListener("click", () => setMobileTab(b.dataset.mtab)));
document.body.dataset.mtab = "apercu";

// ------------------------------------------------------------------ export

function designName() {
  return safeDesignName($("#designName").value || state.fileName);
}

function exportSVG() {
  if (state.mode === "file") return new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
  const { box, mmPerPx } = geometry();
  const groups = state.layers
    .filter((L) => L.type !== "none" && L.visible)
    .map((L, n) => {
      const loops = (state.vectors.get(L.id) || []).map((l) => l.map(([x, y]) => [x - box.x, y - box.y]));
      return (
        `<g id="couleur-${n + 1}" inkscape:groupmode="layer" inkscape:label="${n + 1} - ${L.color} ${L.name}" data-point="${L.type}">` +
        `<path fill="${L.color}" fill-rule="evenodd" d="${loopsToPath(loops)}"/></g>`
      );
    })
    .join("\n");
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
    `width="${(box.w * mmPerPx).toFixed(2)}mm" height="${(box.h * mmPerPx).toFixed(2)}mm" viewBox="0 0 ${box.w} ${box.h}">\n${groups}\n</svg>\n`;
  return new TextEncoder().encode(svg);
}

function renderPNG(pxPerMm = 10) {
  const p = state.pattern;
  const s = p.stats;
  const pad = 4; // mm
  const scale = Math.min(pxPerMm, 4000 / (s.widthMm + pad * 2), 4000 / (s.heightMm + pad * 2));
  const c = document.createElement("canvas");
  c.width = Math.ceil((s.widthMm + pad * 2) * scale);
  c.height = Math.ceil((s.heightMm + pad * 2) * scale);
  const g = c.getContext("2d");
  g.fillStyle = state.fabric;
  g.fillRect(0, 0, c.width, c.height);
  // monde (px image) -> px du PNG
  const k = scale * state.patternScale;
  const ox = p.origin[0] / state.patternScale;
  const oy = p.origin[1] / state.patternScale;
  g.setTransform(k, 0, 0, k, c.width / 2 - ox * k, c.height / 2 - oy * k);
  drawStitches(g, k);
  return c;
}

const canvasToBytes = (c) =>
  new Promise((res) => c.toBlob(async (b) => res(new Uint8Array(await b.arrayBuffer())), "image/png"));

function sheetHTML(previewDataUrl) {
  const p = state.pattern;
  const s = p.stats;
  const rows = s.layers
    .map((L, i) => {
      const bro = nearestThreadIndex(L.color, PEC_THREADS);
      const jan = nearestThreadIndex(L.color, JEF_THREADS);
      const hus = nearestInChart(L.color, "husqvarna");
      const step = p.steps?.[i] ? ` <em>(${APPLIQUE_LABELS[p.steps[i]]})</em>` : "";
      return `<tr><td>${i + 1}</td><td><span class="sw" style="background:${L.color}"></span>${L.color}${step}</td>
        <td>${bro} · ${PEC_THREADS[bro][1]}</td><td>${jan} · ${JEF_THREADS[jan][1]}</td><td>${hus.ref} · ${hus.name}</td>
        <td>${fmt(L.stitches)}</td><td>${fmt(L.lengthMm / 1000, 1)} m</td></tr>`;
    })
    .join("");
  const name = designName();
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fiche — ${name}</title>
<style>body{font:14px/1.45 Inter,system-ui,sans-serif;color:#1d1a16;margin:32px;max-width:900px}
h1{font-family:Fraunces,Georgia,serif;margin:0 0 4px}.muted{color:#6b6257}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;margin-top:20px}
img{max-width:100%;border:1px solid #ddd;border-radius:8px}table{border-collapse:collapse;width:100%;margin-top:20px}
th,td{border-bottom:1px solid #e6e0d6;padding:8px 6px;text-align:left}th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b6257}
.sw{display:inline-block;width:18px;height:18px;border-radius:4px;border:1px solid rgba(0,0,0,.2);vertical-align:-4px;margin-right:8px}
dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0}dt{color:#6b6257}dd{margin:0;font-weight:600}
@media print{body{margin:12mm}button{display:none}}</style></head><body>
<button onclick="print()" style="float:right;padding:8px 14px">Imprimer</button>
<h1>${name}</h1><div class="muted">Fiche de broderie — FilTrace · ${new Date().toLocaleDateString("fr-FR")}</div>
<div class="grid"><img src="${previewDataUrl}" alt="Aperçu"><dl>
<dt>Taille</dt><dd>${fmt(s.widthMm, 1)} × ${fmt(s.heightMm, 1)} mm</dd>
<dt>Points</dt><dd>${fmt(s.stitchCount)}</dd><dt>Couleurs</dt><dd>${s.colors}</dd>
<dt>Coupes</dt><dd>${s.trims}</dd><dt>Durée estimée</dt><dd>≈ ${fmt(Math.max(1, Math.round(s.minutes)))} min</dd>
<dt>Cadre</dt><dd>${state.hoop === "none" ? "—" : state.hoop.replace("x", " × ") + " mm"}</dd></dl></div>
<table><thead><tr><th>#</th><th>Couleur</th><th>Brother</th><th>Janome</th><th>Husqvarna</th><th>Points</th><th>Fil</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

async function exportExtra(kind) {
  const name = designName();
  if (kind === "svg" && state.mode === "file") toast("Le SVG n'est pas disponible pour un fichier de broderie importé.", "bad");
  else if (kind === "svg") download(exportSVG(), `${name}.svg`, "image/svg+xml");
  else if (kind === "png") download(await canvasToBytes(renderPNG()), `${name}.png`, "image/png");
  else if (kind === "sheet") {
    const html = sheetHTML(renderPNG(6).toDataURL("image/png"));
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const win = (await hostedDownloads) ? null : window.open(url, "_blank");
    if (!win) download(html, `${name}-fiche.html`, "text/html");
  } else if (kind === "zip") {
    const files = Object.keys(FORMATS).map((ext) => ({ name: `${name}.${ext}`, data: writeFormat(ext, state.pattern, name) }));
    files.push({ name: `${name}.svg`, data: exportSVG() });
    const png = renderPNG(6);
    files.push({ name: `${name}.png`, data: await canvasToBytes(png) });
    files.push({ name: `${name}-fiche.html`, data: new TextEncoder().encode(sheetHTML(png.toDataURL("image/png"))) });
    download(makeZip(files), `${name}.zip`, "application/zip");
  }
}

$("#formatButtons").innerHTML = Object.entries(FORMATS)
  .map(([ext, f]) => `<button type="button" class="format" data-format="${ext}"><b>${f.label}</b><span>${f.machine}</span></button>`)
  .join("");

$("#exportDialog").addEventListener("click", (e) => {
  const b = e.target.closest("[data-format], [data-extra]");
  if (!b || !state.pattern) return;
  if (b.dataset.format) {
    const name = designName();
    download(writeFormat(b.dataset.format, state.pattern, name), `${name}.${b.dataset.format}`);
  } else {
    exportExtra(b.dataset.extra);
  }
});

function downloadForMachine() {
  if (!state.pattern) return;
  const m = MACHINES[state.machine];
  const name = designName();
  if (!fitsHoop()) {
    toast("Le motif est plus grand que le cadre : cliquez sur « Ajuster au cadre » avant de télécharger.", "bad");
    return;
  }
  download(writeFormat(state.format, state.pattern, name, { trims: m.trims !== false }), machineFileName(state.machine, name, state.format));
}
$("#btnQuick").addEventListener("click", downloadForMachine);
$("#btnMachineDownload").addEventListener("click", downloadForMachine);

$("#btnExport").addEventListener("click", () => {
  const s = state.pattern.stats;
  $("#exportSummary").textContent = `${fmt(s.stitchCount)} points · ${s.colors} couleur(s) · ${fmt(s.widthMm, 1)} × ${fmt(s.heightMm, 1)} mm${
    fitsHoop() ? "" : " · ⚠ plus grand que le cadre choisi"
  }`;
  $("#exportDialog").showModal();
});

// ------------------------------------------------------------------ projet (.filtrace.json)

function toBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function projectData() {
  const common = {
    app: "filtrace",
    version: 2,
    name: state.fileName,
    widthMm: state.widthMm,
    hoop: state.hoop,
    machine: state.machine,
    format: state.format,
    fabric: state.fabric,
    fabricType: state.fabricType,
    threadChart: state.threadChart,
  };
  if (state.mode === "file") {
    return { ...common, mode: "file", stitches: state.filePattern.stitches, threads: state.layers.map((L) => ({ color: L.color, name: L.name })) };
  }
  return {
    ...common,
    mode: "image",
    w: state.w,
    h: state.h,
    image: state.source.toDataURL("image/png"),
    labels: toBase64(new Uint8Array(state.labels.buffer.slice(0))),
    layers: state.layers,
    background: state.background,
    settings: state.settings,
    photo: state.photo,
    style: state.style,
    outlineColor: state.outlineColor,
    outlineTriple: state.outlineTriple,
    outlineLength: state.outlineLength,
    spacing: state.spacing,
    stitchLength: state.stitchLength,
  };
}

async function loadProjectData(project, id = null) {
  if (project.app !== "filtrace") throw new Error("Ce fichier n'est pas un projet FilTrace.");
  const common = {
    hoop: project.hoop || state.hoop,
    machine: MACHINES[project.machine] ? project.machine : state.machine,
    format: FORMATS[project.format] ? project.format : state.format,
    fabric: project.fabric || state.fabric,
    fabricType: FABRICS[project.fabricType] ? project.fabricType : state.fabricType,
    threadChart: THREAD_CHARTS[project.threadChart] ? project.threadChart : state.threadChart,
  };
  if (project.mode === "file") {
    Object.assign(state, common);
    openFilePattern({ stitches: project.stitches, threads: project.threads }, project.name || "motif", project.widthMm);
    state.projectId = id;
    syncSettingsUI();
    return;
  }
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error("Image du projet illisible"));
    img.src = project.image;
  });
  const c = document.createElement("canvas");
  c.width = project.w;
  c.height = project.h;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  leaveFileMode();
  const base = cx.getImageData(0, 0, project.w, project.h).data;
  const photo = { brightness: 0, contrast: 0, saturation: 100, ...project.photo };
  Object.assign(state, common, {
    source: c,
    w: project.w,
    h: project.h,
    rgbaBase: base,
    rgba: adjustPixels(base, photo),
    photo,
    fileName: project.name || "motif",
    labels: new Int16Array(fromBase64(project.labels).buffer),
    layers: project.layers,
    background: project.background,
    settings: { ...DEFAULT_SETTINGS, ...project.settings },
    widthMm: project.widthMm,
    style: project.style || "fill",
    outlineColor: project.outlineColor || state.outlineColor,
    outlineTriple: !!project.outlineTriple,
    outlineLength: project.outlineLength || 2.5,
    spacing: project.spacing || DEFAULT_LAYER.density,
    stitchLength: project.stitchLength || DEFAULT_LAYER.stitchLength,
    original: img,
    selected: project.layers[0]?.id ?? null,
    projectId: id,
    undo: [],
    redo: [],
  });
  syncSettingsUI();
  $("#fileName").textContent = state.fileName;
  $("#designName").value = safeDesignName(state.fileName);
  document.body.classList.add("has-image");
  $("#emptyState").hidden = true;
  updateHistoryButtons();
  $("#btnCrop").disabled = false;
  refreshAll();
  fitView();
}

// Enregistrer dans « Mes projets » (IndexedDB, sur l'appareil).
$("#btnSaveProject").addEventListener("click", async () => {
  if (!state.pattern) return;
  try {
    const data = projectData();
    const id = state.projectId || `p${Date.now().toString(36)}`;
    const s = state.pattern.stats;
    await saveProject({
      ...data,
      id,
      updatedAt: Date.now(),
      thumb: renderPNG(2).toDataURL("image/png"),
      heightMm: s.heightMm,
      stitchCount: s.stitchCount,
    });
    state.projectId = id;
    toast(`« ${state.fileName} » enregistré dans Mes projets.`, "ok");
  } catch (e) {
    toast("Enregistrement impossible sur cet appareil : " + e.message, "bad");
  }
});

async function renderProjects() {
  const list = $("#projectList");
  let items = [];
  try {
    items = await listProjects();
  } catch {
    list.innerHTML = `<li class="empty-note">Les projets ne peuvent pas être enregistrés dans ce navigateur (mode privé ?).</li>`;
    return;
  }
  if (!items.length) {
    list.innerHTML = `<li class="empty-note">Aucun projet pour l'instant. Utilisez « Enregistrer » en haut de l'éditeur.</li>`;
    return;
  }
  list.innerHTML = items
    .map(
      (p) => `<li data-id="${p.id}">
        <img src="${p.thumb || "assets/favicon.svg"}" alt="" />
        <div class="meta"><b></b><small>${new Date(p.updatedAt).toLocaleString("fr-FR")} · ${fmt(p.widthMm || 0)} × ${fmt(p.heightMm || 0)} mm</small></div>
        <div class="acts">
          <button class="btn small primary" data-pact="open">Ouvrir</button>
          <button class="btn small ghost" data-pact="download">Télécharger</button>
          <button class="btn small ghost danger" data-pact="delete">Supprimer</button>
        </div></li>`,
    )
    .join("");
  // Nom inséré en texte (jamais en HTML).
  items.forEach((p) => (list.querySelector(`[data-id="${p.id}"] .meta b`).textContent = p.name || "motif"));
}

$("#btnProjects").addEventListener("click", () => {
  renderProjects();
  $("#projectsDialog").showModal();
});
$("#projectsClose").addEventListener("click", () => $("#projectsDialog").close());
$("#projectList").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-pact]");
  const li = e.target.closest("[data-id]");
  if (!b || !li) return;
  const id = li.dataset.id;
  try {
    if (b.dataset.pact === "open") {
      const p = await getProject(id);
      $("#projectsDialog").close();
      await loadProjectData(p, id);
    } else if (b.dataset.pact === "download") {
      const { thumb, ...p } = await getProject(id);
      download(JSON.stringify(p), `${safeDesignName(p.name || "motif")}.filtrace.json`, "application/json");
    } else if (b.dataset.pact === "delete") {
      if (b.dataset.confirm !== "1") {
        b.dataset.confirm = "1";
        b.textContent = "Confirmer la suppression";
        return;
      }
      await deleteProject(id);
      if (state.projectId === id) state.projectId = null;
      renderProjects();
    }
  } catch (err) {
    toast(err.message, "bad");
  }
});

$("#projectInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    $("#projectsDialog").close();
    await loadProjectData(JSON.parse(await file.text()));
  } catch (err) {
    toast(err.message, "bad");
  }
  e.target.value = "";
});

function syncSettingsUI() {
  for (const k of ["colors", "cleanup", "smoothing", "curve", "detail"]) {
    $("#" + k).value = state.settings[k];
    $("#" + k + "Out").textContent = state.settings[k];
  }
  $("#removeBg").checked = state.settings.removeBackground;
  fillMachineUI();
  syncStyleUI();
  syncFabricUI();
  syncPhotoUI();
  $("#threadChart").value = state.threadChart;
  $("#fabric").value = state.fabric;
}

// ------------------------------------------------------------------ démarrage

new ResizeObserver(() => {
  resizeCanvas();
}).observe($("#canvasWrap"));
try {
  const chart = localStorage.getItem("filtrace.chart");
  const owned = JSON.parse(localStorage.getItem("filtrace.owned") || "null");
  if (owned) (state.owned = owned.owned || []), (state.useOwned = !!owned.use);
  if (THREAD_CHARTS[chart]) state.threadChart = chart;
  const saved = localStorage.getItem("filtrace.machine");
  if (MACHINES[saved]) {
    state.machine = saved;
    state.hoop = MACHINES[saved].hoops[0];
    state.format = MACHINES[saved].format;
  }
} catch {}
syncSettingsUI();
setView("stitch");
let savedTheme = null;
let savedMode = null;
let tourDone = false;
try {
  savedTheme = localStorage.getItem("filtrace.theme");
  savedMode = localStorage.getItem("filtrace.mode");
  tourDone = localStorage.getItem("filtrace.tour") === "done";
} catch {}
applyTheme(savedTheme);
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => applyTheme(document.documentElement.dataset.theme));
// Première visite : mode simple et visite guidée.
setSimple(savedMode !== "advanced");
if (!tourDone && !window.FILTRACE_AUTOSAMPLE) setTimeout(() => showTour(0), 600);
try {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
} catch {}
if (new URLSearchParams(location.search).has("exemple") || window.FILTRACE_AUTOSAMPLE) loadSample();
