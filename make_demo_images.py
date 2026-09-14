"""Generate a synthetic bi-temporal pair to exercise the demo server.

NOT real satellite data -- a drawn scene, used only so the visual-evidence
overlay has a known change to find. The change is a new housing block plus a
cleared earth pad on what was open field in the BEFORE frame, so a human can
check by eye whether the outlined regions are the right ones.
"""
import numpy as np
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent / "demo_images"
OUT.mkdir(exist_ok=True)
S = 512
rng = np.random.default_rng(7)


def fields():
    a = np.zeros((S, S, 3), np.int32)
    # patchwork of fields
    for _ in range(26):
        y, x = rng.integers(0, S - 60), rng.integers(0, S - 60)
        h, w = rng.integers(50, 150), rng.integers(50, 150)
        a[y:y + h, x:x + w] = rng.choice([
            [58, 92, 44], [74, 104, 52], [96, 112, 58], [50, 84, 48], [110, 118, 66]])
    a += rng.integers(-7, 8, (S, S, 3))
    return a


def roads(a):
    for c in (120, 330):
        a[:, c:c + 9] = [128, 126, 122]
        a[c:c + 9, :] = [128, 126, 122]
    a += rng.integers(-4, 5, (S, S, 3))
    return a


def existing_buildings(a):
    for (y, x, h, w) in [(30, 30, 70, 90), (30, 360, 80, 110), (370, 40, 90, 80),
                         (380, 360, 70, 100), (200, 150, 60, 60)]:
        a[y:y + h, x:x + w] = [150, 144, 138]
        for i in range(y, y + h, 14):            # roof rows
            a[i:i + 5, x:x + w] = [176, 170, 162]
    return a


before = roads(existing_buildings(fields()))

after = before.copy()
# --- the actual change: open field -> cleared pad + a new housing block -------
after[170:300, 355:495] = [124, 102, 74]                     # cleared earth
for r in range(0, 4):                                          # 4 rows of houses
    for c in range(0, 5):
        y, x = 182 + r * 28, 366 + c * 26
        after[y:y + 17, x:x + 18] = [214, 208, 200]            # bright rooftops
        after[y + 17:y + 21, x:x + 18] = [96, 92, 88]          # shadow side
after[150:168, 355:495] = [86, 84, 82]                         # new access track

Image.fromarray(np.clip(before, 0, 255).astype(np.uint8)).save(OUT / "before_2019.png")
Image.fromarray(np.clip(after, 0, 255).astype(np.uint8)).save(OUT / "after_2023.png")

changed = (np.abs(before.astype(int) - after.astype(int)).max(axis=2) > 12)
print(f"wrote {OUT/'before_2019.png'} and {OUT/'after_2023.png'}")
print(f"true changed pixels: {changed.mean() * 100:.2f}% of the frame")
ys, xs = np.where(changed)
print(f"true changed bbox  : x[{xs.min()},{xs.max()}] y[{ys.min()},{ys.max()}]")
