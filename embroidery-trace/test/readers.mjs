// Relit les fichiers écrits par test/run.mjs avec nos propres lecteurs et
// compare les points cousus au motif d'origine.
//   node test/run.mjs && node test/readers.mjs
import { readFileSync } from "node:fs";
import { readEmbroidery } from "../js/formats/readers.js";

const out = new URL("./out/", import.meta.url);
const expected = JSON.parse(readFileSync(new URL("expected.json", out)));
const exp = expected.stitchList.filter((s) => s[2] === 0);
const center = (pts) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return pts.map((p) => [p[0] - cx, p[1] - cy]);
};
let ok = true;
for (const ext of ["dst", "pes", "jef", "exp", "vp3"]) {
  const p = readEmbroidery("design." + ext, new Uint8Array(readFileSync(new URL("design." + ext, out))));
  const pts = p.stitches.filter((s) => s[2] === 0);
  let err = Infinity;
  if (pts.length === exp.length) {
    const a = center(pts);
    const b = center(exp);
    err = Math.max(...a.map((q, i) => Math.max(Math.abs(q[0] - b[i][0]), Math.abs(q[1] - b[i][1]))));
  }
  const good = pts.length === exp.length && err <= 1.01 && p.threads.length === expected.colors;
  ok &&= good;
  console.log(`${ext}: ${good ? "OK " : "ERR"} points=${pts.length}/${exp.length} écart=${err} fils=${p.threads.length}`);
}
process.exit(ok ? 0 : 1);
