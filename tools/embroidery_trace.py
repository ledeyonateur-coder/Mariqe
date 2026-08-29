#!/usr/bin/env python3
"""
Image -> separated-by-colour embroidery files.

Does what embroiderytrace.com does, locally:
  1. quantises the image down to N thread colours
  2. cleans up speckle so the machine doesn't chase 3-pixel islands
  3. traces every colour into real vector outlines (holes included)
  4. writes ONE layer per colour into an SVG, in stitch order
  5. generates actual fill stitches and writes machine files
     (.DST / .PES / .EXP / .JEF) with a colour change between each layer
  6. prints a thread chart (hex, coverage, stitch count, order)

Usage:
  python3 embroidery_trace.py INPUT.png -o OUTDIR --colors 4 --width-mm 100
"""

from __future__ import annotations

import argparse
import json
import math
import os
from dataclasses import dataclass, field

import numpy as np
from PIL import Image


# --------------------------------------------------------------------------
# 1. Quantisation
# --------------------------------------------------------------------------

def quantise(img: Image.Image, n_colors: int) -> tuple[np.ndarray, list[tuple[int, int, int]]]:
    """Reduce to n_colors. Returns (index map HxW, palette list of RGB)."""
    rgb = img.convert("RGB")
    pal_img = rgb.quantize(colors=n_colors, method=Image.MEDIANCUT, dither=Image.NONE)
    idx = np.array(pal_img, dtype=np.int32)
    raw = pal_img.getpalette()[: n_colors * 3]
    palette = [(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]) for i in range(n_colors)]
    return idx, palette


def despeckle(mask: np.ndarray, min_area: int) -> np.ndarray:
    """Drop connected blobs smaller than min_area px (4-connectivity, iterative
    flood fill -- no scipy in this environment)."""
    if min_area <= 1:
        return mask
    h, w = mask.shape
    out = np.zeros_like(mask)
    seen = np.zeros_like(mask)
    for sy in range(h):
        row = mask[sy]
        for sx in range(w):
            if not row[sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]
            seen[sy, sx] = True
            comp = []
            while stack:
                y, x = stack.pop()
                comp.append((y, x))
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if len(comp) >= min_area:
                for y, x in comp:
                    out[y, x] = True
    return out


# --------------------------------------------------------------------------
# 2. Contour tracing (marching-squares style border following)
# --------------------------------------------------------------------------

def trace_contours(mask: np.ndarray) -> list[list[tuple[float, float]]]:
    """Extract every closed boundary loop of a binary mask.

    Pixel (y,x) covers the square [x,x+1] x [y,y+1]. For each inside pixel we
    emit the sides that touch outside, oriented consistently, then chain those
    unit segments into loops. Outer boundaries and holes both fall out of this
    naturally, so the SVG just needs fill-rule="evenodd".
    """
    h, w = mask.shape
    padded = np.zeros((h + 2, w + 2), dtype=bool)
    padded[1:-1, 1:-1] = mask

    edges: dict[tuple[int, int], list[tuple[int, int]]] = {}

    ys, xs = np.nonzero(padded)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if not padded[y - 1, x]:
            edges.setdefault((x, y), []).append((x + 1, y))
        if not padded[y, x + 1]:
            edges.setdefault((x + 1, y), []).append((x + 1, y + 1))
        if not padded[y + 1, x]:
            edges.setdefault((x + 1, y + 1), []).append((x, y + 1))
        if not padded[y, x - 1]:
            edges.setdefault((x, y + 1), []).append((x, y))

    loops = []
    while edges:
        start = next(iter(edges))
        loop = [start]
        cur = start
        while True:
            outs = edges.get(cur)
            if not outs:
                break
            nxt = outs.pop()
            if not outs:
                del edges[cur]
            loop.append(nxt)
            cur = nxt
            if cur == start:
                break
        if len(loop) > 3:
            # shift back by the 1px pad
            loops.append([(float(px - 1), float(py - 1)) for px, py in loop])
    return loops


def rdp(points: list[tuple[float, float]], eps: float) -> list[tuple[float, float]]:
    """Ramer-Douglas-Peucker simplification (iterative)."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        i0, i1 = stack.pop()
        if i1 <= i0 + 1:
            continue
        x0, y0 = points[i0]
        x1, y1 = points[i1]
        dx, dy = x1 - x0, y1 - y0
        norm = math.hypot(dx, dy)
        best_d, best_i = -1.0, -1
        for i in range(i0 + 1, i1):
            px, py = points[i]
            if norm == 0:
                d = math.hypot(px - x0, py - y0)
            else:
                d = abs(dy * px - dx * py + x1 * y0 - y1 * x0) / norm
            if d > best_d:
                best_d, best_i = d, i
        if best_d > eps and best_i > 0:
            keep[best_i] = True
            stack.append((i0, best_i))
            stack.append((best_i, i1))
    return [p for p, k in zip(points, keep) if k]


# --------------------------------------------------------------------------
# 3. Fill stitch generation
# --------------------------------------------------------------------------

def fill_stitches(
    mask: np.ndarray,
    px_to_units: float,
    spacing_px: float,
    max_len_units: float,
) -> list[tuple[float, float]]:
    """Boustrophedon (back-and-forth) scanline fill.

    Walks row by row at the given spacing, finds each solid run on the row and
    lays stitches along it, flipping direction every row so the needle never
    travels empty. Returns points in machine units (0.1 mm).
    """
    h, w = mask.shape
    pts: list[tuple[float, float]] = []
    row = 0.0
    flip = False
    while row < h:
        y = int(row)
        if y >= h:
            break
        line = mask[y]
        runs = []
        x = 0
        while x < w:
            if line[x]:
                x0 = x
                while x < w and line[x]:
                    x += 1
                runs.append((x0, x - 1))
            else:
                x += 1
        if flip:
            runs.reverse()
        for a, b in runs:
            if flip:
                a, b = b, a
            ax, ay = a * px_to_units, y * px_to_units
            bx = b * px_to_units
            length = abs(bx - ax)
            steps = max(1, int(length / max_len_units))
            for s in range(steps + 1):
                t = s / steps
                pts.append((ax + (bx - ax) * t, ay))
        flip = not flip
        row += spacing_px
    return pts


# --------------------------------------------------------------------------
# 4. Orchestration
# --------------------------------------------------------------------------

@dataclass
class Layer:
    index: int
    rgb: tuple[int, int, int]
    mask: np.ndarray
    coverage: float
    loops: list = field(default_factory=list)
    stitches: list = field(default_factory=list)

    @property
    def hexcode(self) -> str:
        return "#%02X%02X%02X" % self.rgb


def is_background(rgb, tol=26) -> bool:
    return all(c >= 255 - tol for c in rgb)


def run(
    src: str,
    outdir: str,
    n_colors: int,
    width_mm: float,
    density_mm: float,
    max_stitch_mm: float,
    min_area: int,
    keep_bg: bool,
    simplify: float,
    mono: str | None = None,
    hoop: tuple[float, float] | None = None,
    fit_hoop: bool = False,
):
    os.makedirs(outdir, exist_ok=True)
    img = Image.open(src)
    if img.mode in ("RGBA", "LA", "P"):
        flat = Image.new("RGB", img.size, (255, 255, 255))
        conv = img.convert("RGBA")
        flat.paste(conv, mask=conv.split()[-1])
        img = flat
    W, H = img.size

    # Crop to the artwork's own bounding box first. Without this, --width-mm
    # would scale the *canvas* (white margins included) and the stitched motif
    # would come out smaller than asked -- e.g. 104 mm instead of the 120 mm
    # the operator typed.
    arr0 = np.asarray(img)
    content = ~np.all(arr0 >= 229, axis=2)
    cys, cxs = np.nonzero(content)
    if cys.size:
        img = img.crop((int(cxs.min()), int(cys.min()), int(cxs.max()) + 1, int(cys.max()) + 1))
        W, H = img.size

    idx, palette = quantise(img, n_colors)

    layers: list[Layer] = []
    total_px = W * H

    if mono:
        # Single-thread test run: everything that isn't background becomes one
        # mask sewn in one colour. This is what you stitch out first to check
        # placement and density on real fabric before committing to a
        # multi-colour run with all the thread changes.
        rgb = tuple(int(mono.lstrip("#")[i: i + 2], 16) for i in (0, 2, 4))
        mask = np.zeros((H, W), dtype=bool)
        for i, prgb in enumerate(palette):
            if keep_bg or not is_background(prgb):
                mask |= idx == i
        mask = despeckle(mask, min_area)
        if mask.any():
            layers.append(
                Layer(index=0, rgb=rgb, mask=mask, coverage=100.0 * mask.sum() / total_px)
            )
    else:
        for i, rgb in enumerate(palette):
            mask = idx == i
            if not mask.any():
                continue
            if not keep_bg and is_background(rgb):
                continue
            mask = despeckle(mask, min_area)
            if not mask.any():
                continue
            layers.append(
                Layer(index=i, rgb=rgb, mask=mask, coverage=100.0 * mask.sum() / total_px)
            )

        # Sew the biggest areas first, fine detail last -- standard practice so
        # the detail sits on top instead of being buried.
        layers.sort(key=lambda L: -L.coverage)

    # Hoop check. A design wider than the hoop simply cannot be stitched, and
    # the machine will refuse the file (or silently clip it), so catch it here
    # rather than at the machine. Checked in both orientations.
    height_mm_req = width_mm * H / W
    if hoop:
        hw, hh = hoop
        fits = (width_mm <= hw and height_mm_req <= hh) or (
            width_mm <= hh and height_mm_req <= hw
        )
        if not fits:
            scale = max(
                min(hw / width_mm, hh / height_mm_req),
                min(hh / width_mm, hw / height_mm_req),
            )
            new_w = width_mm * scale
            print(
                f"  ! {width_mm:.0f} x {height_mm_req:.0f} mm ne rentre pas dans "
                f"le cadre {hw:.0f} x {hh:.0f} mm"
            )
            if fit_hoop:
                width_mm = new_w
                print(f"  -> reduit a {width_mm:.1f} x {width_mm * H / W:.1f} mm")
            else:
                print(f"  -> utiliser --fit-hoop (donnerait {new_w:.1f} mm) ou --width-mm {new_w:.0f}")

    px_per_mm = W / width_mm
    px_to_units = 10.0 / px_per_mm           # px -> 0.1 mm machine units
    spacing_px = density_mm * px_per_mm
    max_len_units = max_stitch_mm * 10.0

    for L in layers:
        L.loops = [rdp(c, simplify) for c in trace_contours(L.mask)]
        L.stitches = fill_stitches(L.mask, px_to_units, spacing_px, max_len_units)

    write_svg(os.path.join(outdir, "separation.svg"), layers, W, H)
    for n, L in enumerate(layers, 1):
        write_layer_png(os.path.join(outdir, f"layer-{n}-{L.hexcode.lstrip('#')}.png"), L, W, H)
    write_machine_files(outdir, layers, width_mm, H * px_to_units)
    chart = write_chart(outdir, layers, W, H, width_mm, density_mm)
    return chart


def write_svg(path, layers, W, H):
    # The inkscape: prefix MUST be declared or the file is invalid XML and
    # Inkscape/Ink-Stitch refuses to open it. groupmode="layer" is what makes
    # each colour show up as a real, separately selectable layer.
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" '
        f'xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.0.dtd" '
        f'width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
        '<rect width="100%" height="100%" fill="#ffffff"/>',
    ]
    for n, L in enumerate(layers, 1):
        d = []
        for loop in L.loops:
            if len(loop) < 3:
                continue
            d.append("M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in loop) + " Z")
        parts.append(
            f'<g id="couleur-{n}" inkscape:groupmode="layer" '
            f'inkscape:label="{n} - {L.hexcode}" '
            f'data-order="{n}" data-hex="{L.hexcode}">'
            f'<path fill="{L.hexcode}" fill-rule="evenodd" d="{" ".join(d)}"/></g>'
        )
    parts.append("</svg>")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(parts))


def write_layer_png(path, L, W, H):
    canvas = np.full((H, W, 3), 255, dtype=np.uint8)
    canvas[L.mask] = L.rgb
    Image.fromarray(canvas).save(path)


def write_machine_files(outdir, layers, width_mm, height_units):
    import pyembroidery

    pattern = pyembroidery.EmbPattern()
    for L in layers:
        if not L.stitches:
            continue
        pattern.add_block(
            [(x, y) for x, y in L.stitches],
            "#%02X%02X%02X" % L.rgb,
        )
    pattern.end()
    written = []
    for ext in ("dst", "pes", "exp", "jef"):
        p = os.path.join(outdir, f"broderie.{ext}")
        try:
            pyembroidery.write(pattern, p)
            written.append(os.path.basename(p))
        except Exception as e:  # noqa: BLE001 - report, don't abort the run
            print(f"  ! {ext.upper()} non ecrit: {e}")
    return written


def write_chart(outdir, layers, W, H, width_mm, density_mm):
    height_mm = width_mm * H / W
    rows = []
    for n, L in enumerate(layers, 1):
        rows.append(
            {
                "ordre": n,
                "hex": L.hexcode,
                "rgb": list(L.rgb),
                "couverture_%": round(L.coverage, 2),
                "points": len(L.stitches),
                "contours": len(L.loops),
            }
        )
    chart = {
        "source_px": [W, H],
        "taille_mm": [round(width_mm, 1), round(height_mm, 1)],
        "densite_mm": density_mm,
        "nb_couleurs": len(layers),
        "total_points": sum(r["points"] for r in rows),
        "couleurs": rows,
    }
    with open(os.path.join(outdir, "couleurs.json"), "w", encoding="utf-8") as f:
        json.dump(chart, f, indent=2, ensure_ascii=False)

    lines = [
        "ORDRE DE BRODERIE / CHANGEMENT DE FIL",
        f"Taille : {width_mm:.0f} x {height_mm:.0f} mm   Densite : {density_mm} mm   "
        f"Total : {chart['total_points']} points",
        "",
        f"{'#':>2}  {'COULEUR':9}  {'RGB':16}  {'SURFACE':>8}  {'POINTS':>8}",
    ]
    for r in rows:
        lines.append(
            f"{r['ordre']:>2}  {r['hex']:9}  {str(tuple(r['rgb'])):16}  "
            f"{r['couverture_%']:>7.2f}%  {r['points']:>8}"
        )
    txt = "\n".join(lines)
    with open(os.path.join(outdir, "couleurs.txt"), "w", encoding="utf-8") as f:
        f.write(txt + "\n")
    return txt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("-o", "--out", default="embroidery-out")
    ap.add_argument("--colors", type=int, default=4)
    ap.add_argument("--width-mm", type=float, default=100.0)
    ap.add_argument("--density-mm", type=float, default=0.4)
    ap.add_argument("--max-stitch-mm", type=float, default=3.0)
    ap.add_argument("--min-area", type=int, default=60)
    ap.add_argument("--keep-background", action="store_true")
    ap.add_argument("--simplify", type=float, default=0.8)
    ap.add_argument("--hoop", metavar="WxH", help="cadre en mm, ex. 100x170")
    ap.add_argument("--fit-hoop", action="store_true", help="reduire pour entrer dans le cadre")
    ap.add_argument(
        "--mono",
        metavar="HEX",
        help="test un seul fil : tout le motif dans cette couleur (ex. #D8432E)",
    )
    a = ap.parse_args()

    chart = run(
        a.input, a.out, a.colors, a.width_mm, a.density_mm,
        a.max_stitch_mm, a.min_area, a.keep_background, a.simplify, a.mono,
        tuple(float(v) for v in a.hoop.lower().split("x")) if a.hoop else None,
        a.fit_hoop,
    )
    print(chart)
    print(f"\n-> {a.out}/")


if __name__ == "__main__":
    main()
