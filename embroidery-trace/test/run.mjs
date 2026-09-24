// Test de bout en bout : image synthétique -> pipeline -> fichiers machine.
// Les fichiers sont ensuite relus par pyembroidery (test/check.py).
//   node test/run.mjs && python3 test/check.py

import { mkdirSync, writeFileSync } from "node:fs";
import { analyzeImage, vectorizeAll, stitchDesign, contentBounds } from "../js/core/pipeline.js";
import { writeFormat, FORMATS } from "../js/formats/writers.js";

const W = 320;
const H = 240;
const rgba = new Uint8ClampedArray(W * H * 4);
const put = (x, y, [r, g, b]) => {
  const i = (y * W + x) * 4;
  rgba.set([r, g, b, 255], i);
};
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let c = [255, 255, 255]; // fond blanc
    const d = Math.hypot(x - 110, y - 120);
    if (d < 90) c = [216, 67, 46]; // disque rouge
    if (d < 55) c = [250, 210, 60]; // coeur jaune
    if (d < 20) c = [255, 255, 255]; // trou
    if (x > 220 && x < 300 && y > 40 && y < 200) c = [30, 60, 140]; // rectangle bleu
    if (Math.abs(y - 25) < 4 && x > 20 && x < 300) c = [20, 20, 20]; // bande fine noire (satin)
    // bruit : quelques pixels isolés à nettoyer
    if ((x * 7919 + y * 104729) % 997 === 0) c = [0, 200, 0];
    put(x, y, c);
  }
}

const settings = { colors: 6, removeBackground: true, cleanup: 30 };
const { labels, layers, background } = analyzeImage(rgba, W, H, settings);
const vectors = vectorizeAll(labels, W, H, layers, settings);
const active = layers.filter((L) => L.type !== "none");
const box = contentBounds(labels, W, H, new Set([background]));
const widthMm = 100;
const mmPerPx = widthMm / box.w;
const pattern = stitchDesign(active, vectors, mmPerPx);

console.log("calques :", layers.map((L) => `${L.source}:${L.type}`).join(" "));
console.log("fond :", background, "boîte :", box);
console.log("stats :", JSON.stringify({ ...pattern.stats, layers: undefined }));

const out = new URL("./out/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const ext of Object.keys(FORMATS)) {
  const bytes = writeFormat(ext, pattern, "TestDesign");
  writeFileSync(new URL(`design.${ext}`, out), bytes);
}
writeFileSync(
  new URL("expected.json", out),
  JSON.stringify({
    stitches: pattern.stats.stitchCount,
    colors: pattern.threads.length,
    threads: pattern.threads.map((t) => t.color),
    stitchList: pattern.stitches,
  }),
);
console.log("fichiers écrits dans test/out/");
