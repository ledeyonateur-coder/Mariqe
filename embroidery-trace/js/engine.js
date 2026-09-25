// Accès aux calculs : dans un Worker quand le navigateur le permet,
// sinon directement (même code, mêmes résultats).
import { analyzeImage, vectorizeAll, stitchDesign } from "./core/pipeline.js";

let worker = null;
try {
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
} catch {
  worker = null;
}

let nextId = 1;
const jobs = new Map();
let onProgress = () => {};

if (worker) {
  worker.onmessage = ({ data }) => {
    const job = jobs.get(data.id);
    if (!job) return;
    if ("progress" in data) return onProgress(job.label, data.progress);
    jobs.delete(data.id);
    data.error ? job.reject(new Error(data.error)) : job.resolve(data.result);
  };
  worker.onerror = () => {
    // Worker indisponible (ancien navigateur) : bascule en calcul direct.
    for (const job of jobs.values()) job.fallback();
    jobs.clear();
    worker = null;
  };
}

function direct(op, args) {
  if (op === "analyze") return analyzeImage(...args);
  if (op === "vectorize") return vectorizeAll(...args, (v) => onProgress("Vectorisation", v));
  return stitchDesign(args[0], args[1], args[2], { ...args[3], onProgress: (v) => onProgress("Calcul des points", v) });
}

function run(op, label, args) {
  if (!worker) {
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        try {
          resolve(direct(op, args));
        } catch (e) {
          reject(e);
        }
      }, 16),
    );
  }
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const fallback = () => {
      try {
        resolve(direct(op, args));
      } catch (e) {
        reject(e);
      }
    };
    jobs.set(id, { resolve, reject, label, fallback });
    onProgress(label, 0);
    worker.postMessage({ id, op, args });
  });
}

export const engine = {
  setProgressHandler(fn) {
    onProgress = fn;
  },
  analyze: (rgba, w, h, settings) => run("analyze", "Analyse des couleurs", [rgba, w, h, settings]),
  vectorize: (labels, w, h, layers, settings) => run("vectorize", "Vectorisation", [labels, w, h, layers, settings]),
  // Les options ne doivent contenir que des données (pas de fonctions).
  stitch: (layers, vectors, mmPerPx, options) => run("stitch", "Calcul des points", [layers, vectors, mmPerPx, options]),
};
