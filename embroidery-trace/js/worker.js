// Calculs lourds hors du fil principal : l'interface reste fluide.
import { analyzeImage, vectorizeAll, stitchDesign } from "./core/pipeline.js";

self.onmessage = ({ data }) => {
  const { id, op, args } = data;
  const progress = (value) => self.postMessage({ id, progress: value });
  try {
    let result;
    if (op === "analyze") result = analyzeImage(...args);
    else if (op === "vectorize") result = vectorizeAll(...args, progress);
    else if (op === "stitch") result = stitchDesign(args[0], args[1], args[2], { ...args[3], onProgress: progress });
    else throw new Error("Opération inconnue : " + op);
    self.postMessage({ id, result });
  } catch (e) {
    self.postMessage({ id, error: e.message || String(e) });
  }
};
