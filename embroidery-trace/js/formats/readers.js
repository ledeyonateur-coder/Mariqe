// Lecture de fichiers de broderie existants : DST, EXP, JEF, PES/PEC, VP3.
// Décodage repris des lecteurs de pyembroidery (licence MIT).
// Sortie : { stitches: [[x, y, cmd]] en 1/10 mm (y vers le bas), threads: [{color, name}] }

import { STITCH, JUMP, TRIM, END, COLOR_CHANGE } from "../core/stitch.js";
import { PEC_THREADS, JEF_THREADS } from "../core/threads.js";

const s8 = (b) => (b > 127 ? b - 256 : b);

class Out {
  constructor() {
    this.stitches = [];
    this.threads = [];
    this.x = 0;
    this.y = 0;
  }
  add(dx, dy, c) {
    this.x += dx;
    this.y += dy;
    this.stitches.push([this.x, this.y, c]);
  }
  stitch(dx, dy) {
    this.add(dx, dy, STITCH);
  }
  move(dx, dy) {
    this.add(dx, dy, JUMP);
  }
  trim() {
    this.add(0, 0, TRIM);
  }
  colorChange() {
    this.add(0, 0, COLOR_CHANGE);
  }
  thread(hex, name) {
    this.threads.push({ color: ("#" + hex.replace("#", "")).toUpperCase(), name: name || hex });
  }
  result() {
    this.stitches.push([this.x, this.y, END]);
    // Autant de fils que de blocs de couleur (couleurs par défaut si absentes).
    const blocks = 1 + this.stitches.filter((s) => s[2] === COLOR_CHANGE).length;
    const fallback = ["1D1A16", "D8432E", "1F3A5F", "2E933C", "F3A712", "8E5572", "669BBC", "A8201A"];
    while (this.threads.length < blocks) this.thread(fallback[this.threads.length % fallback.length], "Fil " + (this.threads.length + 1));
    return { stitches: this.stitches, threads: this.threads.slice(0, blocks) };
  }
}

const bit = (b, p) => (b >> p) & 1;

export function readDST(bytes) {
  const o = new Out();
  // Couleurs éventuelles dans l'en-tête étendu (TC:#rrggbb,nom,ref).
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, 512));
  for (const m of header.matchAll(/TC:\s*(#[0-9a-fA-F]{6}),([^,\r\n]*)/g)) o.thread(m[1], m[2].trim());
  for (let i = 512; i + 2 < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const dx =
      bit(b2, 2) * 81 - bit(b2, 3) * 81 + bit(b1, 2) * 27 - bit(b1, 3) * 27 + bit(b0, 2) * 9 - bit(b0, 3) * 9 + bit(b1, 0) * 3 - bit(b1, 1) * 3 + bit(b0, 0) - bit(b0, 1);
    const dy = -(
      bit(b2, 5) * 81 - bit(b2, 4) * 81 + bit(b1, 5) * 27 - bit(b1, 4) * 27 + bit(b0, 5) * 9 - bit(b0, 4) * 9 + bit(b1, 7) * 3 - bit(b1, 6) * 3 + bit(b0, 7) - bit(b0, 6)
    );
    if ((b2 & 0xf3) === 0xf3) break;
    if ((b2 & 0xc3) === 0xc3) o.colorChange();
    else if ((b2 & 0x83) === 0x83) o.move(dx, dy);
    else o.stitch(dx, dy);
  }
  return o.result();
}

export function readEXP(bytes) {
  const o = new Out();
  for (let i = 0; i + 1 < bytes.length; ) {
    if (bytes[i] !== 0x80) {
      o.stitch(s8(bytes[i]), -s8(bytes[i + 1]));
      i += 2;
      continue;
    }
    const ctrl = bytes[i + 1];
    if (i + 3 >= bytes.length) break;
    const x = s8(bytes[i + 2]);
    const y = -s8(bytes[i + 3]);
    i += 4;
    if (ctrl === 0x80) o.trim();
    else if (ctrl === 0x02) o.stitch(x, y);
    else if (ctrl === 0x04) o.move(x, y);
    else if (ctrl === 0x01) {
      o.colorChange();
      if (x || y) o.move(x, y);
    } else break;
  }
  return o.result();
}

export function readJEF(bytes) {
  const o = new Out();
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offset = dv.getInt32(0, true);
  const colors = dv.getInt32(24, true);
  for (let i = 0; i < colors; i++) {
    const idx = Math.abs(dv.getInt32(116 + i * 4, true)) % JEF_THREADS.length;
    const t = JEF_THREADS[idx];
    if (t) o.thread(t[0], t[1]);
  }
  for (let i = offset; i + 1 < bytes.length; ) {
    if (bytes[i] !== 0x80) {
      o.stitch(s8(bytes[i]), -s8(bytes[i + 1]));
      i += 2;
      continue;
    }
    const ctrl = bytes[i + 1];
    if (ctrl === 0x10 || i + 3 >= bytes.length) break;
    const x = s8(bytes[i + 2]);
    const y = -s8(bytes[i + 3]);
    i += 4;
    if (ctrl === 0x02) o.move(x, y);
    else if (ctrl === 0x01) o.colorChange();
    else break;
  }
  return o.result();
}

function readPEC(bytes, start) {
  const o = new Out();
  let p = start + 3 + 16 + 15 + 2 + 12;
  const cc = bytes[p++];
  for (let i = 0; i <= cc; i++) {
    const t = PEC_THREADS[bytes[p + i] % PEC_THREADS.length] || PEC_THREADS[20];
    o.thread(t[0], t[1]);
  }
  p = start + 512 + 2 + 3 + 11;
  const s12 = (v) => {
    v &= 0xfff;
    return v > 0x7ff ? v - 0x1000 : v;
  };
  const s7 = (v) => (v > 63 ? v - 128 : v);
  while (p + 1 < bytes.length) {
    let v1 = bytes[p++];
    let v2 = bytes[p++];
    if (v1 === 0xff && v2 === 0x00) break;
    if (v1 === 0xff) break;
    if (v1 === 0xfe && v2 === 0xb0) {
      p++;
      o.colorChange();
      continue;
    }
    let jump = false;
    let trim = false;
    let x;
    let y;
    if (v1 & 0x80) {
      trim ||= !!(v1 & 0x20);
      jump ||= !!(v1 & 0x10);
      x = s12((v1 << 8) | v2);
      v2 = bytes[p++];
    } else x = s7(v1);
    if (v2 & 0x80) {
      trim ||= !!(v2 & 0x20);
      jump ||= !!(v2 & 0x10);
      y = s12((v2 << 8) | bytes[p++]);
    } else y = s7(v2);
    if (jump) o.move(x, y);
    else if (trim) {
      o.trim();
      o.move(x, y);
    } else o.stitch(x, y);
  }
  return o.result();
}

export function readPES(bytes) {
  const sig = new TextDecoder("latin1").decode(bytes.subarray(0, 8));
  if (sig === "#PEC0001") return readPEC(bytes, 8);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return readPEC(bytes, dv.getInt32(8, true));
}

export function readVP3(bytes) {
  const o = new Out();
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 6;
  const skipStr = () => (p += 2 + dv.getUint16(p));
  skipStr();
  p += 7;
  skipStr();
  p += 32;
  const cx = dv.getInt32(p) / 100;
  const cy = -dv.getInt32(p + 4) / 100;
  p += 8 + 27;
  skipStr();
  p += 24;
  skipStr();
  const blocks = dv.getUint16(p);
  p += 2;
  for (let b = 0; b < blocks; b++) {
    p += 3;
    const len = dv.getUint32(p);
    p += 4;
    const end = p + len;
    const sx = dv.getInt32(p) / 100;
    const sy = -dv.getInt32(p + 4) / 100;
    p += 8;
    const ax = sx + cx;
    const ay = sy + cy;
    if (ax !== 0 && ay !== 0) o.move(ax - o.x, ay - o.y);
    // Fil
    const colors = bytes[p];
    p += 2;
    let color = 0;
    for (let m = 0; m < colors; m++) {
      color = (bytes[p] << 16) | (bytes[p + 1] << 8) | bytes[p + 2];
      p += 6;
    }
    p += 2;
    const readStr = () => {
      const n = dv.getUint16(p);
      const s = new TextDecoder("latin1").decode(bytes.subarray(p + 2, p + 2 + n));
      p += 2 + n;
      return s;
    };
    readStr();
    const desc = readStr();
    readStr();
    o.thread(color.toString(16).padStart(6, "0"), desc);
    p += 15 + 3;
    while (p < end - 1) {
      const x = s8(bytes[p]);
      const y = s8(bytes[p + 1]);
      p += 2;
      if ((x & 0xff) !== 0x80) {
        o.stitch(x, y);
        continue;
      }
      if (y === 0x01) {
        const lx = dv.getInt16(p);
        const ly = dv.getInt16(p + 2);
        p += 6;
        o.stitch(lx, ly);
      } else if (y === 0x03) o.trim();
    }
    p = end;
    if (b + 1 < blocks) o.colorChange();
  }
  return o.result();
}

export const READERS = { dst: readDST, exp: readEXP, jef: readJEF, pes: readPES, pec: readPES, vp3: readVP3 };

/** Lit un fichier de broderie d'après son extension. */
export function readEmbroidery(name, bytes) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const reader = READERS[ext];
  if (!reader) throw new Error("Format non reconnu : ." + ext + " (DST, EXP, JEF, PES ou VP3)");
  const p = reader(bytes);
  if (!p.stitches.some((s) => s[2] === STITCH)) throw new Error("Aucun point trouvé dans ce fichier.");
  return p;
}
