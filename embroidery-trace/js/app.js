// Éditeur FilTrace : import d'image, calques de fil, édition manuelle,
// simulation de broderie et export des fichiers machine. Tout tourne
// localement dans le navigateur : l'image n'est envoyée nulle part.

import { analyzeImage, vectorizeAll, stitchDesign, contentBounds, DEFAULT_SETTINGS } from "./core/pipeline.js";
import { STITCH, JUMP, COLOR_CHANGE, STITCH_TYPES, DEFAULT_LAYER, effectiveAngle } from "./core/stitch.js";
import { PEC_THREADS, JEF_THREADS, nearestThreadIndex, nearestThreadName, hexToRgb, rgbToHex } from "./core/threads.js";
import { loopsToPath } from "./core/trace.js";
import { FORMATS, writeFormat } from "./formats/writers.js";
import { makeZip } from "./core/zip.js";

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
  hoop: "130x180",
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

function download(data, name, type = "application/octet-stream") {
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

// ------------------------------------------------------------------ historique

function snapshot() {
  return {
    labels: state.labels ? new Int16Array(state.labels) : null,
    layers: clone(state.layers),
    background: state.background,
    selected: state.selected,
  };
}

function pushHistory() {
  if (!state.labels) return;
  state.undo.push(snapshot());
  if (state.undo.length > HISTORY_MAX) state.undo.shift();
  state.redo = [];
  updateHistoryButtons();
}

function restore(snap) {
  state.labels = snap.labels;
  state.layers = snap.layers;
  state.background = snap.background;
  state.selected = snap.selected;
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

async function loadFile(file) {
  if (!file) return;
  if (!/^image\//.test(file.type) && !/\.(png|jpe?g|svg|webp|gif|bmp)$/i.test(file.name)) {
    alert("Format non pris en charge. Utilisez PNG, JPG, SVG ou WEBP.");
    return;
  }
  try {
    const img = await readFileAsImage(file);
    loadImage(img, file.name.replace(/\.[^.]+$/, ""));
  } catch (e) {
    alert(e.message);
  }
}

function loadImage(img, name) {
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
  state.rgba = cx.getImageData(0, 0, w, h).data;
  state.fileName = name || "motif";
  $("#fileName").textContent = state.fileName;
  $("#designName").value = safeDesignName(state.fileName);
  state.undo = [];
  state.redo = [];
  updateHistoryButtons();
  document.body.classList.add("has-image");
  $("#emptyState").hidden = true;
  runAnalyze({ fitSize: true });
  fitView();
}

const safeDesignName = (s) => s.normalize("NFD").replace(/[^\w-]/g, "").slice(0, 16) || "motif";

async function loadSample() {
  const img = new Image();
  img.onload = () => loadImage(img, "exemple");
  img.src = "assets/exemple.svg";
}

// ------------------------------------------------------------------ pipeline

function withBusy(fn) {
  busy(true);
  setTimeout(() => {
    try {
      fn();
    } catch (e) {
      console.error(e);
      alert("Erreur de calcul : " + e.message);
    } finally {
      busy(false);
    }
  }, 16);
}

function runAnalyze({ fitSize = false } = {}) {
  if (!state.rgba) return;
  withBusy(() => {
    const { labels, layers, background } = analyzeImage(state.rgba, state.w, state.h, state.settings);
    state.labels = labels;
    state.layers = layers;
    state.background = background;
    state.selected = (layers.find((L) => L.type !== "none") || layers[0] || {}).id ?? null;
    state.expanded.clear();
    if (fitSize) {
      state.widthMm = 100;
      const fit = hoopFitWidth();
      if (fit && fit < state.widthMm) state.widthMm = Math.floor(fit);
    }
    vectorizeNow();
    stitchNow();
    refreshUI();
    if (fitSize) fitView();
  });
}

function vectorizeNow() {
  state.vectors = vectorizeAll(state.labels, state.w, state.h, state.layers, state.settings);
  state.paths = new Map();
  for (const [id, loops] of state.vectors) state.paths.set(id, new Path2D(loopsToPath(loops, 1, 2)));
  updateRaster();
}

function stitchNow() {
  const { mmPerPx } = geometry();
  state.patternScale = mmPerPx;
  state.pattern = stitchDesign(state.layers, state.vectors, mmPerPx);
  state.progress = state.pattern.stitches.length;
  stitchCache = null;
}

let stitchTimer = null;
function scheduleStitch(delay = 120) {
  clearTimeout(stitchTimer);
  stitchTimer = setTimeout(() => {
    withBusy(() => {
      stitchNow();
      refreshUI();
    });
  }, delay);
}

function scheduleVectorize(delay = 60) {
  clearTimeout(stitchTimer);
  stitchTimer = setTimeout(() => {
    withBusy(() => {
      vectorizeNow();
      stitchNow();
      refreshUI();
    });
  }, delay);
}

/** Recalcule tout depuis la carte de couleurs courante (après annulation, fusion…). */
function refreshAll() {
  if (!state.labels) return;
  withBusy(() => {
    vectorizeNow();
    stitchNow();
    refreshUI();
  });
}

// ------------------------------------------------------------------ géométrie

function geometry() {
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

canvas.addEventListener("pointerdown", (e) => {
  if (!state.labels) return;
  canvas.setPointerCapture(e.pointerId);
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
  if (pan) {
    view.tx = pan.tx + e.clientX - pan.x;
    view.ty = pan.ty + e.clientY - pan.y;
    render();
    return;
  }
  const p = toWorld(e);
  state.cursor = p;
  if (state.stroke) {
    if (paintLine(state.stroke.last, p, state.stroke.value)) {
      state.stroke.changed = true;
      updateRaster();
    }
    state.stroke.last = p;
  }
  render();
});

function endPointer() {
  if (pan) {
    pan = null;
    canvas.classList.remove("grabbing");
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
const PEC_OPTIONS = PEC_THREADS.map((t, i) => (t ? `<option value="#${t[0]}" style="background:#${t[0]}">${i}. ${t[1]}</option>` : ""))
  .join("");

function renderLayers() {
  const list = $("#layers");
  const counts = layerCounts();
  list.innerHTML = "";
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
          <label>Fil du nuancier Brother</label>
          <select data-act="thread"><option value="">— choisir un fil —</option>${PEC_OPTIONS}</select>
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
  if ((act === "thread" || act === "merge") && !el.value) return;
  pushHistory();
  if (act === "color" || act === "thread") {
    L.color = el.value.toUpperCase();
    L.name = nearestThreadName(L.color).name;
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
$("#layers").addEventListener("input", (e) => {
  const out = e.target.parentElement.querySelector("output") || e.target.closest(".field")?.querySelector("output");
  if (out && e.target.type === "range") out.textContent = e.target.value;
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
  state.layers.push({ id, source: color, color, name: nearestThreadName(color).name, visible: true, ...DEFAULT_LAYER });
  state.selected = id;
  state.expanded.add(id);
  renderLayers();
  setTool("brush");
});

// ------------------------------------------------------------------ interface

function refreshUI() {
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
  $("#btnSaveProject").disabled = !state.labels;
  const total = state.pattern ? state.pattern.stitches.length : 0;
  $("#progress").max = total;
  $("#progress").value = state.progress;
  renderLayers();
  renderStats();
  render();
}

function renderStats() {
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
  el.addEventListener("change", () => {
    state.settings[key] = parse(el.value);
    handler();
  });
}

bindRange("colors", "colors", () => runAnalyze());
bindRange("cleanup", "cleanup", () => runAnalyze());
bindRange("smoothing", "smoothing", () => runAnalyze());
bindRange("curve", "curve", () => {
  pushHistory();
  scheduleVectorize();
});
bindRange("detail", "detail", () => {
  pushHistory();
  scheduleVectorize();
});
$("#removeBg").addEventListener("change", (e) => {
  state.settings.removeBackground = e.target.checked;
  runAnalyze();
});

$("#widthMm").addEventListener("change", (e) => {
  const v = Number(e.target.value);
  if (!(v > 0)) return;
  state.widthMm = v;
  refreshUI();
  scheduleStitch(0);
});
$("#heightMm").addEventListener("change", (e) => {
  const v = Number(e.target.value);
  if (!(v > 0) || !state.labels) return;
  const { box } = geometry();
  state.widthMm = (v * box.w) / box.h;
  refreshUI();
  scheduleStitch(0);
});
$("#hoop").addEventListener("change", (e) => {
  state.hoop = e.target.value;
  refreshUI();
  fitView();
});
$("#btnFitHoop").addEventListener("click", () => {
  const fit = hoopFitWidth();
  if (!fit) return;
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
$("#btnSample").addEventListener("click", loadSample);
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
    const map = { h: "pan", b: "brush", e: "eraser", g: "bucket", i: "picker" };
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

// ------------------------------------------------------------------ export

function designName() {
  return safeDesignName($("#designName").value || state.fileName);
}

function exportSVG() {
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
      return `<tr><td>${i + 1}</td><td><span class="sw" style="background:${L.color}"></span>${L.color}</td>
        <td>${bro} · ${PEC_THREADS[bro][1]}</td><td>${jan} · ${JEF_THREADS[jan][1]}</td>
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
<table><thead><tr><th>#</th><th>Couleur</th><th>Brother</th><th>Janome</th><th>Points</th><th>Fil</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

async function exportExtra(kind) {
  const name = designName();
  if (kind === "svg") download(exportSVG(), `${name}.svg`, "image/svg+xml");
  else if (kind === "png") download(await canvasToBytes(renderPNG()), `${name}.png`, "image/png");
  else if (kind === "sheet") {
    const html = sheetHTML(renderPNG(6).toDataURL("image/png"));
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const win = window.open(url, "_blank");
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

$("#btnSaveProject").addEventListener("click", () => {
  const project = {
    app: "filtrace",
    version: 1,
    name: state.fileName,
    w: state.w,
    h: state.h,
    image: state.source.toDataURL("image/png"),
    labels: toBase64(new Uint8Array(state.labels.buffer.slice(0))),
    layers: state.layers,
    background: state.background,
    settings: state.settings,
    widthMm: state.widthMm,
    hoop: state.hoop,
    fabric: state.fabric,
  };
  download(JSON.stringify(project), `${designName()}.filtrace.json`, "application/json");
});

$("#projectInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const project = JSON.parse(await file.text());
    if (project.app !== "filtrace") throw new Error("Ce fichier n'est pas un projet FilTrace.");
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
    Object.assign(state, {
      source: c,
      w: project.w,
      h: project.h,
      rgba: cx.getImageData(0, 0, project.w, project.h).data,
      fileName: project.name || "motif",
      labels: new Int16Array(fromBase64(project.labels).buffer),
      layers: project.layers,
      background: project.background,
      settings: { ...DEFAULT_SETTINGS, ...project.settings },
      widthMm: project.widthMm,
      hoop: project.hoop,
      fabric: project.fabric || state.fabric,
      selected: project.layers[0]?.id ?? null,
      undo: [],
      redo: [],
    });
    syncSettingsUI();
    $("#fileName").textContent = state.fileName;
    $("#designName").value = safeDesignName(state.fileName);
    document.body.classList.add("has-image");
    $("#emptyState").hidden = true;
    updateHistoryButtons();
    refreshAll();
    fitView();
  } catch (err) {
    alert(err.message);
  }
  e.target.value = "";
});

function syncSettingsUI() {
  for (const k of ["colors", "cleanup", "smoothing", "curve", "detail"]) {
    $("#" + k).value = state.settings[k];
    $("#" + k + "Out").textContent = state.settings[k];
  }
  $("#removeBg").checked = state.settings.removeBackground;
  $("#hoop").value = state.hoop;
  $("#fabric").value = state.fabric;
}

// ------------------------------------------------------------------ démarrage

new ResizeObserver(() => {
  resizeCanvas();
}).observe($("#canvasWrap"));
syncSettingsUI();
setView("stitch");
if (new URLSearchParams(location.search).has("exemple")) loadSample();
