// Recadrage de la photo avant vectorisation : cadre déplaçable et
// redimensionnable, formats imposés, rotation par quart de tour.

const $ = (s) => document.querySelector(s);
const HANDLE = 14; // zone de prise des poignées (px écran)

/**
 * Ouvre la fenêtre de recadrage.
 * @param {HTMLImageElement|HTMLCanvasElement} img
 * @param {{hoopRatio?: number}} opts  rapport largeur/hauteur du cadre machine
 * @returns {Promise<HTMLCanvasElement|null>}  image recadrée, ou null si annulé
 */
export function openCropper(img, { hoopRatio = null } = {}) {
  const dialog = $("#cropDialog");
  const canvas = $("#cropCanvas");
  const ctx = canvas.getContext("2d");
  const stage = $("#cropStage");
  const ratioSel = $("#cropRatio");

  // Image de travail (tournée au besoin).
  let src = toCanvas(img);
  let rect = { x: 0, y: 0, w: src.width, h: src.height }; // en px de l'image
  let view = { s: 1, ox: 0, oy: 0 };
  let drag = null;

  const hoopOpt = ratioSel.querySelector('option[value="hoop"]');
  hoopOpt.hidden = !hoopRatio;
  if (!hoopRatio && ratioSel.value === "hoop") ratioSel.value = "free";

  function ratio() {
    const v = ratioSel.value;
    if (v === "free") return null;
    if (v === "hoop") return hoopRatio;
    const [a, b] = v.split(":").map(Number);
    return a / b;
  }

  function fitRectToRatio() {
    const r = ratio();
    if (!r) return;
    // Plus grand rectangle au bon format, centré sur le cadre actuel.
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    let w = Math.min(src.width, src.height * r);
    let h = w / r;
    const shrink = Math.min(1, Math.max(rect.w / w, rect.h / h));
    w *= shrink;
    h *= shrink;
    rect = clampRect({ x: cx - w / 2, y: cy - h / 2, w, h });
  }

  function clampRect(r) {
    const w = Math.min(r.w, src.width);
    const h = Math.min(r.h, src.height);
    return {
      x: Math.max(0, Math.min(src.width - w, r.x)),
      y: Math.max(0, Math.min(src.height - h, r.y)),
      w,
      h,
    };
  }

  function layout() {
    const box = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    canvas.style.width = box.width + "px";
    canvas.style.height = box.height + "px";
    const pad = 16;
    view.s = Math.min((box.width - pad * 2) / src.width, (box.height - pad * 2) / src.height);
    view.ox = (box.width - src.width * view.s) / 2;
    view.oy = (box.height - src.height * view.s) / 2;
    draw();
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, view.ox, view.oy, src.width * view.s, src.height * view.s);
    const r = toScreen(rect);
    // Voile hors du cadre.
    ctx.fillStyle = "rgba(20,18,15,.55)";
    ctx.beginPath();
    ctx.rect(view.ox, view.oy, src.width * view.s, src.height * view.s);
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill("evenodd");
    // Cadre + tiers + poignées.
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,.45)";
    ctx.beginPath();
    for (const f of [1 / 3, 2 / 3]) {
      ctx.moveTo(r.x + r.w * f, r.y);
      ctx.lineTo(r.x + r.w * f, r.y + r.h);
      ctx.moveTo(r.x, r.y + r.h * f);
      ctx.lineTo(r.x + r.w, r.y + r.h * f);
    }
    ctx.stroke();
    ctx.fillStyle = "#fff";
    for (const [hx, hy] of handles(r)) ctx.fillRect(hx - 5, hy - 5, 10, 10);
    $("#cropSize").textContent = `${Math.round(rect.w)} × ${Math.round(rect.h)} px`;
  }

  const toScreen = (r) => ({ x: view.ox + r.x * view.s, y: view.oy + r.y * view.s, w: r.w * view.s, h: r.h * view.s });

  function handles(r) {
    return [
      [r.x, r.y, "nw"],
      [r.x + r.w / 2, r.y, "n"],
      [r.x + r.w, r.y, "ne"],
      [r.x + r.w, r.y + r.h / 2, "e"],
      [r.x + r.w, r.y + r.h, "se"],
      [r.x + r.w / 2, r.y + r.h, "s"],
      [r.x, r.y + r.h, "sw"],
      [r.x, r.y + r.h / 2, "w"],
    ];
  }

  function hit(px, py) {
    const r = toScreen(rect);
    for (const [hx, hy, name] of handles(r)) if (Math.abs(px - hx) < HANDLE && Math.abs(py - hy) < HANDLE) return name;
    if (px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h) return "move";
    return "new";
  }

  function pos(e) {
    const b = canvas.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  }

  function onDown(e) {
    const [px, py] = pos(e);
    canvas.setPointerCapture(e.pointerId);
    const mode = hit(px, py);
    const ix = (px - view.ox) / view.s;
    const iy = (py - view.oy) / view.s;
    drag = { mode, ix, iy, start: { ...rect } };
    if (mode === "new") drag.start = { x: ix, y: iy, w: 0, h: 0 };
  }

  function onMove(e) {
    const [px, py] = pos(e);
    if (!drag) {
      const m = hit(px, py);
      canvas.style.cursor = m === "move" ? "move" : m === "new" ? "crosshair" : `${m}-resize`;
      return;
    }
    const ix = Math.max(0, Math.min(src.width, (px - view.ox) / view.s));
    const iy = Math.max(0, Math.min(src.height, (py - view.oy) / view.s));
    const s = drag.start;
    const r = ratio();
    if (drag.mode === "move") {
      rect = clampRect({ ...s, x: s.x + ix - drag.ix, y: s.y + iy - drag.iy });
    } else {
      // Bords opposés fixes ; le coin/bord saisi suit le pointeur.
      let x0 = s.x;
      let y0 = s.y;
      let x1 = s.x + s.w;
      let y1 = s.y + s.h;
      const m = drag.mode === "new" ? "se" : drag.mode;
      if (m.includes("w")) x0 = ix;
      if (m.includes("e")) x1 = ix;
      if (m.includes("n")) y0 = iy;
      if (m.includes("s")) y1 = iy;
      if (drag.mode === "new") [x0, y0] = [s.x, s.y];
      let nx = Math.min(x0, x1);
      let ny = Math.min(y0, y1);
      let nw = Math.max(8, Math.abs(x1 - x0));
      let nh = Math.max(8, Math.abs(y1 - y0));
      if (r) {
        if (m === "n" || m === "s") nw = nh * r;
        else if (m === "e" || m === "w") nh = nw / r;
        else if (nw / nh > r) nw = nh * r;
        else nh = nw / r;
        if (m.includes("w") || (drag.mode === "new" && x1 < x0)) nx = Math.max(x0, x1) - nw;
        if (m.includes("n") || (drag.mode === "new" && y1 < y0)) ny = Math.max(y0, y1) - nh;
      }
      rect = clampRect({ x: nx, y: ny, w: nw, h: nh });
    }
    draw();
  }

  function onUp() {
    drag = null;
  }

  function rotate() {
    const c = document.createElement("canvas");
    c.width = src.height;
    c.height = src.width;
    const g = c.getContext("2d");
    g.translate(c.width, 0);
    g.rotate(Math.PI / 2);
    g.drawImage(src, 0, 0);
    // Le cadre tourne avec l'image.
    rect = { x: src.height - rect.y - rect.h, y: rect.x, w: rect.h, h: rect.w };
    src = c;
    fitRectToRatio();
    layout();
  }

  function reset() {
    rect = { x: 0, y: 0, w: src.width, h: src.height };
    fitRectToRatio();
    draw();
  }

  return new Promise((resolve) => {
    const ro = new ResizeObserver(layout);
    const onRatio = () => {
      fitRectToRatio();
      draw();
    };
    const finish = (result) => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      ratioSel.removeEventListener("change", onRatio);
      $("#cropRotate").onclick = null;
      $("#cropReset").onclick = null;
      $("#cropOk").onclick = null;
      $("#cropFull").onclick = null;
      $("#cropCancel").onclick = null;
      dialog.onclose = null;
      if (dialog.open) dialog.close();
      resolve(result);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    ratioSel.addEventListener("change", onRatio);
    $("#cropRotate").onclick = rotate;
    $("#cropReset").onclick = reset;
    $("#cropOk").onclick = () => finish(cropCanvas(src, rect));
    $("#cropFull").onclick = () => finish(src);
    $("#cropCancel").onclick = () => finish(null);
    dialog.onclose = () => finish(null);
    dialog.showModal();
    fitRectToRatio();
    ro.observe(stage);
    layout();
  });
}

function toCanvas(img) {
  if (img instanceof HTMLCanvasElement) return img;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width || 800;
  c.height = img.naturalHeight || img.height || 800;
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function cropCanvas(src, r) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(r.w));
  c.height = Math.max(1, Math.round(r.h));
  c.getContext("2d").drawImage(src, Math.round(r.x), Math.round(r.y), c.width, c.height, 0, 0, c.width, c.height);
  return c;
}
