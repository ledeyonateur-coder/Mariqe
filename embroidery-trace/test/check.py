"""Relit les fichiers produits par test/run.mjs avec pyembroidery et vérifie
qu'ils décrivent bien le même motif (nombre de points, couleurs, position).

    pip install pyembroidery
    node test/run.mjs && python3 test/check.py
"""

import json
import os
import sys

import pyembroidery
from pyembroidery import STITCH, COLOR_CHANGE, COMMAND_MASK

HERE = os.path.join(os.path.dirname(__file__), "out")
expected = json.load(open(os.path.join(HERE, "expected.json")))

# Positions attendues de chaque point cousu (1/10 mm).
exp_pts = [(s[0], s[1]) for s in expected["stitchList"] if s[2] == 0]

ok = True
for ext in ("dst", "pes", "jef", "exp", "vp3"):
    path = os.path.join(HERE, "design." + ext)
    p = pyembroidery.read(path)
    if p is None:
        print(f"{ext}: ILLISIBLE")
        ok = False
        continue
    pts = [(s[0], s[1]) for s in p.stitches if (s[2] & COMMAND_MASK) == STITCH]
    colors = sum(1 for s in p.stitches if (s[2] & COMMAND_MASK) == COLOR_CHANGE) + 1
    # Certains lecteurs placent l'origine ailleurs : on compare après recentrage.
    def centered(lst):
        xs = [x for x, _ in lst]
        ys = [y for _, y in lst]
        cx = (min(xs) + max(xs)) / 2
        cy = (min(ys) + max(ys)) / 2
        return [(x - cx, y - cy) for x, y in lst]

    same_count = len(pts) == len(exp_pts)
    max_err = None
    if same_count and pts:
        a = centered(pts)
        b = centered(exp_pts)
        max_err = max(max(abs(x1 - x2), abs(y1 - y2)) for (x1, y1), (x2, y2) in zip(a, b))
    bounds = p.bounds()
    size = ((bounds[2] - bounds[0]) / 10, (bounds[3] - bounds[1]) / 10)
    good = same_count and max_err is not None and max_err <= 1.01 and colors == expected["colors"]
    ok &= good
    print(
        f"{ext}: {'OK ' if good else 'ERR'} points={len(pts)}/{len(exp_pts)} "
        f"couleurs={colors}/{expected['colors']} ecart_max={max_err} taille={size[0]:.1f}x{size[1]:.1f} mm "
        f"fils={[t.hex_color() for t in p.threadlist][:8]}"
    )

sys.exit(0 if ok else 1)
