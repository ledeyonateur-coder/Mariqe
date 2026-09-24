// Écriture des fichiers machine : DST (Tajima), PES (Brother), JEF (Janome),
// EXP (Melco), VP3 (Pfaff / Husqvarna Viking).
// Structure binaire reprise des writers de pyembroidery (licence MIT).
//
// Entrée commune : pattern = { stitches: [[x, y, cmd]...] en 1/10 mm, threads: [{color:"#RRGGBB"}] }

import { STITCH, JUMP, TRIM, END, COLOR_CHANGE, patternBounds } from "../core/stitch.js";
import { PEC_THREADS, JEF_THREADS, nearestThreadIndex, hexToRgb } from "../core/threads.js";

class Bytes {
  constructor() {
    this.buf = new Uint8Array(4096);
    this.len = 0;
  }
  ensure(n) {
    if (this.len + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.len + n) size *= 2;
    const b = new Uint8Array(size);
    b.set(this.buf.subarray(0, this.len));
    this.buf = b;
  }
  u8(v) {
    this.ensure(1);
    this.buf[this.len++] = v & 0xff;
  }
  bytes(arr) {
    for (const v of arr) this.u8(v);
  }
  ascii(s) {
    for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i) & 0x7f);
  }
  u16le(v) {
    this.u8(v);
    this.u8(v >> 8);
  }
  u16be(v) {
    this.u8(v >> 8);
    this.u8(v);
  }
  u24le(v) {
    this.u8(v);
    this.u8(v >> 8);
    this.u8(v >> 16);
  }
  u24be(v) {
    this.u8(v >> 16);
    this.u8(v >> 8);
    this.u8(v);
  }
  i32le(v) {
    this.u8(v);
    this.u8(v >> 8);
    this.u8(v >> 16);
    this.u8(v >> 24);
  }
  i32be(v) {
    this.u8(v >> 24);
    this.u8(v >> 16);
    this.u8(v >> 8);
    this.u8(v);
  }
  patchI32be(at, v) {
    this.buf[at] = (v >> 24) & 0xff;
    this.buf[at + 1] = (v >> 16) & 0xff;
    this.buf[at + 2] = (v >> 8) & 0xff;
    this.buf[at + 3] = v & 0xff;
  }
  patchU24le(at, v) {
    this.buf[at] = v & 0xff;
    this.buf[at + 1] = (v >> 8) & 0xff;
    this.buf[at + 2] = (v >> 16) & 0xff;
  }
  result() {
    return this.buf.slice(0, this.len);
  }
}

const safeName = (name, max) => (name || "Untitled").normalize("NFD").replace(/[^\x20-\x7e]/g, "").slice(0, max) || "Untitled";
const pad = (s, n) => (s + " ".repeat(n)).slice(0, Math.max(n, s.length));
const padNum = (v, n) => String(v).padStart(n, " ");

/** Déplacements relatifs arrondis, comme les writers pyembroidery. */
function* deltas(stitches) {
  let xx = 0;
  let yy = 0;
  for (const [x, y, c] of stitches) {
    const dx = Math.round(x - xx);
    const dy = Math.round(y - yy);
    xx += dx;
    yy += dy;
    yield [dx, dy, c, xx, yy];
  }
}

// ------------------------------------------------------------------ DST
function dstRecord(x, y, cmd) {
  y = -y;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  if (cmd === JUMP) b2 |= 0x80;
  if (cmd === STITCH || cmd === JUMP) {
    b2 |= 0x03;
    if (x > 40) (b2 |= 0x04), (x -= 81);
    if (x < -40) (b2 |= 0x08), (x += 81);
    if (x > 13) (b1 |= 0x04), (x -= 27);
    if (x < -13) (b1 |= 0x08), (x += 27);
    if (x > 4) (b0 |= 0x04), (x -= 9);
    if (x < -4) (b0 |= 0x08), (x += 9);
    if (x > 1) (b1 |= 0x01), (x -= 3);
    if (x < -1) (b1 |= 0x02), (x += 3);
    if (x > 0) (b0 |= 0x01), (x -= 1);
    if (x < 0) (b0 |= 0x02), (x += 1);
    if (y > 40) (b2 |= 0x20), (y -= 81);
    if (y < -40) (b2 |= 0x10), (y += 81);
    if (y > 13) (b1 |= 0x20), (y -= 27);
    if (y < -13) (b1 |= 0x10), (y += 27);
    if (y > 4) (b0 |= 0x20), (y -= 9);
    if (y < -4) (b0 |= 0x10), (y += 9);
    if (y > 1) (b1 |= 0x80), (y -= 3);
    if (y < -1) (b1 |= 0x40), (y += 3);
    if (y > 0) (b0 |= 0x80), (y -= 1);
    if (y < 0) (b0 |= 0x40), (y += 1);
    if (x !== 0 || y !== 0) throw new Error("DST : déplacement trop long (> 12,1 mm)");
  } else if (cmd === COLOR_CHANGE) {
    b2 = 0xc3;
  } else if (cmd === END) {
    b2 = 0xf3;
  }
  return [b0, b1, b2];
}

export function writeDST(pattern, name = "Design") {
  const { stitches } = pattern;
  const b = new Bytes();
  const [minX, minY, maxX, maxY] = patternBounds(stitches);
  const last = stitches[stitches.length - 1] || [0, 0];
  const ax = Math.trunc(last[0]);
  const ay = -Math.trunc(last[1]);
  const count = stitches.filter((s) => s[2] === STITCH).length;
  const colors = stitches.filter((s) => s[2] === COLOR_CHANGE).length;
  b.ascii(`LA:${pad(safeName(name, 16), 16)}\r`);
  b.ascii(`ST:${padNum(count, 7)}\r`);
  b.ascii(`CO:${padNum(colors, 3)}\r`);
  b.ascii(`+X:${padNum(Math.abs(maxX), 5)}\r`);
  b.ascii(`-X:${padNum(Math.abs(minX), 5)}\r`);
  b.ascii(`+Y:${padNum(Math.abs(maxY), 5)}\r`);
  b.ascii(`-Y:${padNum(Math.abs(minY), 5)}\r`);
  b.ascii(`AX:${ax >= 0 ? "+" : "-"}${padNum(Math.abs(ax), 5)}\r`);
  b.ascii(`AY:${ay >= 0 ? "+" : "-"}${padNum(Math.abs(ay), 5)}\r`);
  b.ascii(`MX:+${padNum(0, 5)}\r`);
  b.ascii(`MY:+${padNum(0, 5)}\r`);
  b.ascii(`PD:******\r`);
  b.u8(0x1a);
  while (b.len < 512) b.u8(0x20);
  for (const [dx, dy, c] of deltas(stitches)) {
    if (c === TRIM) {
      // Coupe de fil = trois sauts qui s'annulent (convention Tajima).
      b.bytes(dstRecord(2, 2, JUMP));
      b.bytes(dstRecord(-4, -4, JUMP));
      b.bytes(dstRecord(2, 2, JUMP));
    } else {
      b.bytes(dstRecord(dx, dy, c));
    }
  }
  return b.result();
}

// ------------------------------------------------------------------ EXP
export function writeEXP(pattern, name, { trims = true } = {}) {
  // Sans coupe-fil (ex. bernette Chicago 7), on n'écrit pas les coupes :
  // la machine fait les sauts et on coupe les fils à la main.
  const b = new Bytes();
  for (const [dx, dy, c] of deltas(pattern.stitches)) {
    if (c === STITCH) b.bytes([dx & 0xff, -dy & 0xff]);
    else if (c === JUMP) b.bytes([0x80, 0x04, dx & 0xff, -dy & 0xff]);
    else if (c === TRIM && trims) b.bytes([0x80, 0x80, 0x07, 0x00]);
    else if (c === COLOR_CHANGE) b.bytes([0x80, 0x01, 0x00, 0x00]);
  }
  return b.result();
}

// ------------------------------------------------------------------ JEF
function jefHoop(w, h) {
  if (w < 500 && h < 500) return 1; // 50 x 50
  if (w < 1260 && h < 1100) return 3; // 126 x 110
  if (w < 1400 && h < 2000) return 2; // 140 x 200
  if (w < 2000 && h < 2000) return 4; // 200 x 200
  return 0; // 110 x 110
}

export function writeJEF(pattern, date = new Date()) {
  const { stitches, threads } = pattern;
  const b = new Bytes();
  // Couleurs Janome : deux calques consécutifs ne doivent pas tomber sur le même fil.
  const palette = [];
  threads.forEach((t, i) => {
    let idx = nearestThreadIndex(t.color, JEF_THREADS);
    if (i > 0 && idx === palette[i - 1] && t.color !== threads[i - 1].color) {
      idx = nearestThreadIndex(t.color, JEF_THREADS, idx);
    }
    palette.push(idx);
  });
  const colorCount = palette.length;
  let points = 1;
  for (const [, , c] of stitches) {
    if (c === STITCH) points += 1;
    else if (c === JUMP || c === COLOR_CHANGE) points += 2;
    else if (c === END) break;
  }
  const [minX, minY, maxX, maxY] = patternBounds(stitches);
  const w = Math.round(maxX - minX);
  const h = Math.round(maxY - minY);
  const two = (n) => String(n).padStart(2, "0");
  const dateStr = `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`;
  b.i32le(0x74 + colorCount * 8);
  b.i32le(0x14);
  b.ascii(dateStr);
  b.u8(0);
  b.u8(0);
  b.i32le(colorCount);
  b.i32le(points);
  b.i32le(jefHoop(w, h));
  const hw = Math.round(w / 2);
  const hh = Math.round(h / 2);
  b.i32le(hw);
  b.i32le(hh);
  b.i32le(hw);
  b.i32le(hh);
  const edge = (x, y) => {
    const ok = Math.min(x, y) >= 0;
    for (const v of [x, y, x, y]) b.i32le(ok ? v : -1);
  };
  edge(550 - hw, 550 - hh);
  edge(250 - hw, 250 - hh);
  edge(700 - hw, 1000 - hh);
  edge(700 - hw, 1000 - hh);
  for (const p of palette) b.i32le(p);
  for (let i = 0; i < colorCount; i++) b.i32le(0x0d);
  for (const [dx, dy, c] of deltas(stitches)) {
    if (c === STITCH) b.bytes([dx & 0xff, -dy & 0xff]);
    else if (c === COLOR_CHANGE) b.bytes([0x80, 0x01, dx & 0xff, -dy & 0xff]);
    else if (c === JUMP) b.bytes([0x80, 0x02, dx & 0xff, -dy & 0xff]);
    else if (c === END) break;
  }
  b.bytes([0x80, 0x10]);
  return b.result();
}

// ------------------------------------------------------------------ PES / PEC
const PEC_BLANK = [0x00,0x00,0x00,0x00,0x00,0x00,0xF0,0xFF,0xFF,0xFF,0xFF,0x0F,0x08,0x00,0x00,0x00,0x00,0x10,0x04,0x00,0x00,0x00,0x00,0x20,...Array(30).fill([0x02,0x00,0x00,0x00,0x00,0x40]).flat(),0x04,0x00,0x00,0x00,0x00,0x20,0x08,0x00,0x00,0x00,0x00,0x10,0xF0,0xFF,0xFF,0xFF,0xFF,0x0F,0x00,0x00,0x00,0x00,0x00,0x00];

function pecThumbnail(bounds, points, buffer) {
  const g = PEC_BLANK.slice();
  const [left, top, right, bottom] = bounds;
  const dw = right - left || 1;
  const dh = bottom - top || 1;
  const scale = Math.min((48 - buffer) / dw, (38 - buffer) / dh);
  const tx = -((right + left) / 2) * scale + 24;
  const ty = -((bottom + top) / 2) * scale + 19;
  for (const [x, y] of points) {
    const px = Math.floor(x * scale + tx);
    const py = Math.floor(y * scale + ty);
    const i = py * 6 + Math.floor(px / 8);
    if (px >= 0 && py >= 0 && i < g.length) g[i] |= 1 << (px % 8);
  }
  return g;
}

function pecValue(b, v, long, flag = 0) {
  if (!long && v > -64 && v < 63) {
    b.u8(v & 0x7f);
  } else {
    let x = (v & 0x0fff) | 0x8000 | (flag << 8);
    b.u8(x >> 8);
    b.u8(x);
  }
}

function writePEC(b, pattern, name) {
  const { stitches, threads } = pattern;
  const bounds = patternBounds(stitches);
  const indices = threads.map((t) => nearestThreadIndex(t.color, PEC_THREADS));
  // En-tête PEC : 512 octets.
  b.ascii(`LA:${pad(safeName(name, 8), 16)}\r`);
  b.bytes([0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0xff, 0x00]);
  b.u8(6); // 48 px / 8
  b.u8(38);
  if (indices.length) {
    b.bytes(Array(12).fill(0x20));
    b.u8(indices.length - 1);
    b.bytes(indices);
  } else {
    b.bytes([0x20, 0x20, 0x20, 0x20, 0x64, 0x20, 0x00, 0x20, 0x00, 0x20, 0x20, 0x20, 0xff]);
  }
  for (let i = indices.length; i < 463; i++) b.u8(0x20);

  // Bloc de points.
  const start = b.len;
  b.bytes([0x00, 0x00]);
  b.u24le(0);
  b.bytes([0x31, 0xff, 0xf0]);
  b.u16le(Math.round(bounds[2] - bounds[0]));
  b.u16le(Math.round(bounds[3] - bounds[1]));
  b.u16le(0x1e0);
  b.u16le(0x1b0);
  let colorTwo = true;
  let jumping = true;
  let init = true;
  for (const [dx, dy, c] of deltas(stitches)) {
    if (c === STITCH) {
      if (jumping) {
        if (dx !== 0 && dy !== 0) (pecValue(b, 0), pecValue(b, 0));
        jumping = false;
      }
      pecValue(b, dx);
      pecValue(b, dy);
    } else if (c === JUMP) {
      jumping = true;
      const flag = init ? 0x10 : 0x20;
      pecValue(b, dx, true, flag);
      pecValue(b, dy, true, flag);
    } else if (c === COLOR_CHANGE) {
      if (jumping) {
        pecValue(b, 0);
        pecValue(b, 0);
        jumping = false;
      }
      b.bytes([0xfe, 0xb0, colorTwo ? 2 : 1]);
      colorTwo = !colorTwo;
    } else if (c === END) {
      b.u8(0xff);
      break;
    }
    init = false;
  }
  b.patchU24le(start + 2, b.len - start);

  // Vignettes 48 x 38 : motif complet puis une par couleur.
  const all = stitches.filter((s) => s[2] === STITCH);
  b.bytes(pecThumbnail(bounds, all, 4));
  let block = [];
  const blocks = [block];
  for (const s of stitches) {
    if (s[2] === COLOR_CHANGE) blocks.push((block = []));
    else if (s[2] === STITCH) block.push(s);
  }
  for (const blk of blocks) b.bytes(pecThumbnail(bounds, blk, 5));
}

export function writePES(pattern, name = "Design") {
  const b = new Bytes();
  // PES v1 "tronqué" : l'en-tête pointe directement sur la section PEC,
  // seule partie lue par les machines Brother / Baby Lock.
  b.ascii("#PES0001");
  b.bytes([0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  writePEC(b, pattern, name);
  return b.result();
}

// ------------------------------------------------------------------ VP3
function vp3String16(b, s) {
  b.u16be(s.length * 2);
  for (let i = 0; i < s.length; i++) b.u16be(s.charCodeAt(i));
}

function vp3String8(b, s) {
  b.u16be(s.length);
  b.ascii(s);
}

function vp3Placeholder(b) {
  const at = b.len;
  b.i32be(0);
  return at;
}

const vp3Patch = (b, at) => b.patchI32be(at, b.len - at - 4);

export function writeVP3(pattern) {
  const { stitches, threads } = pattern;
  const b = new Bytes();
  b.ascii("%vsm%");
  b.u8(0);
  vp3String16(b, "Produced by     Software Ltd");
  b.bytes([0x00, 0x02, 0x00]);
  const fileEnd = vp3Placeholder(b);
  vp3String16(b, "");

  // Découpe en blocs de couleur (chaque bloc commence au changement de fil).
  const blocks = [];
  let last = 0;
  stitches.forEach((s, i) => {
    if (s[2] === COLOR_CHANGE) {
      blocks.push(stitches.slice(last, i));
      last = i;
    }
  });
  blocks.push(stitches.slice(last));

  const [l, t, r, bt] = patternBounds(stitches);
  b.i32be(Math.trunc(r * 100));
  b.i32be(Math.trunc(t * -100));
  b.i32be(Math.trunc(l * 100));
  b.i32be(Math.trunc(bt * -100));
  const ends = stitches.filter((s) => s[2] === END).length;
  b.i32be(stitches.length - ends);
  b.u8(0);
  b.u8(blocks.length);
  b.u8(12);
  b.u8(0);
  b.u8(1); // un seul motif

  b.bytes([0x00, 0x03, 0x00]);
  const designEnd = vp3Placeholder(b);
  const width = r - l;
  const height = bt - t;
  const hw = width / 2;
  const hh = height / 2;
  const cx = r - hw;
  const cy = bt - hh;
  b.i32be(Math.trunc(cx) * 100);
  b.i32be(Math.trunc(cy) * -100);
  b.bytes([0, 0, 0]);
  b.i32be(Math.trunc(hw) * -100);
  b.i32be(Math.trunc(hw) * 100);
  b.i32be(Math.trunc(hh) * -100);
  b.i32be(Math.trunc(hh) * 100);
  b.i32be(Math.trunc(width) * 100);
  b.i32be(Math.trunc(height) * 100);
  vp3String16(b, "");
  b.bytes([0x64, 0x64]);
  b.i32be(4096);
  b.i32be(0);
  b.i32be(0);
  b.i32be(4096);
  b.ascii("xxPP");
  b.bytes([0x01, 0x00]);
  vp3String16(b, "Produced by     Software Ltd");
  b.u16be(blocks.length);

  blocks.forEach((blk, bi) => {
    b.bytes([0x00, 0x05, 0x00]);
    const blockEnd = vp3Placeholder(b);
    let fx = 0;
    let fy = 0;
    let lx = 0;
    let ly = 0;
    if (blk.length) {
      [fx, fy] = bi === 0 ? [0, 0] : blk[0];
      [lx, ly] = blk[blk.length - 1];
    }
    b.i32be(Math.trunc(fx - cx) * 100);
    b.i32be(Math.trunc(-(fy - cy)) * 100);
    const thread = threads[bi] || { color: "#000000" };
    b.bytes([0x01, 0x00]);
    const [cr, cg, cb] = hexToRgb(thread.color);
    b.u24be((cr << 16) | (cg << 8) | cb);
    b.bytes([0x00, 0x00, 0x00, 0x05, 0x28]);
    vp3String8(b, "");
    vp3String8(b, thread.color.toLowerCase());
    vp3String8(b, "");
    b.i32be(Math.trunc(lx - fx) * 100);
    b.i32be(Math.trunc(-(ly - fy)) * 100);

    b.bytes([0x00, 0x01, 0x00]);
    const stitchEnd = vp3Placeholder(b);
    b.bytes([0x0a, 0xf6, 0x00]);
    let px = fx;
    let py = fy;
    for (const [x, y, c] of blk) {
      if (c === END) {
        b.bytes([0x80, 0x03]);
        break;
      }
      if (c === TRIM) {
        b.bytes([0x80, 0x03]);
        continue;
      }
      if (c !== STITCH) continue; // VP3 n'a pas de saut : le point suivant s'y rend.
      const dx = Math.trunc(x - px);
      const dy = Math.trunc(y - py);
      px += dx;
      py += dy;
      if (dx >= -127 && dx <= 127 && dy >= -127 && dy <= 127) {
        b.bytes([dx & 0xff, dy & 0xff]);
      } else {
        b.bytes([0x80, 0x01]);
        b.u16be(dx & 0xffff);
        b.u16be(dy & 0xffff);
        b.bytes([0x80, 0x02]);
      }
    }
    vp3Patch(b, stitchEnd);
    b.u8(0);
    vp3Patch(b, blockEnd);
  });
  vp3Patch(b, designEnd);
  vp3Patch(b, fileEnd);
  return b.result();
}

export const FORMATS = {
  dst: { label: "DST", machine: "Tajima, Barudan, machines pro", write: writeDST },
  pes: { label: "PES", machine: "Brother, Baby Lock, Bernette", write: writePES },
  jef: { label: "JEF", machine: "Janome, Elna, Kenmore", write: writeJEF },
  exp: { label: "EXP", machine: "bernette Chicago, Bernina, Melco", write: writeEXP },
  vp3: { label: "VP3", machine: "Pfaff, Husqvarna Viking", write: writeVP3 },
};

export function writeFormat(ext, pattern, name, options = {}) {
  const f = FORMATS[ext];
  if (!f) throw new Error(`Format inconnu : ${ext}`);
  if (ext === "jef") return f.write(pattern);
  if (ext === "exp") return f.write(pattern, name, options);
  return f.write(pattern, name);
}
