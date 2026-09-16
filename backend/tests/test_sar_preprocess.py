"""
tests/test_sar_preprocess.py

Regression suite for the SAR rendering path in common.py:load_image().

Written BEFORE the fix, so it first documents the four broken conventions, then
proves the fix. Every case asserts the output is a usable image: contrasty, not
saturated, not blank, no NaN, correct shape/dtype.

Usage: python tests/test_sar_preprocess.py
"""
import sys
import tempfile
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin
from PIL import Image

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))
from common import load_image  # noqa: E402

TMP = Path(tempfile.mkdtemp(prefix="sar_test_"))
PASS, FAIL = [], []
H = W = 64


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(f"  [{'PASS' if cond else 'FAIL'}] {name}" + (f"   {detail}" if detail else ""))


def write_tif(name, arr):
    """Write a 2-D (single band) or 3-D (bands, H, W) array to a GeoTIFF."""
    p = TMP / name
    a = np.asarray(arr)
    if a.ndim == 2:
        a = a[None, ...]                     # -> (1, H, W)
    count, h, w = a.shape
    prof = dict(driver="GTiff", height=h, width=w, count=count,
                dtype=str(a.dtype), crs="EPSG:32632",
                transform=from_origin(600000, 5400000, 10, 10))
    with rasterio.open(p, "w", **prof) as ds:
        ds.write(a)
    return str(p)


def sar(arr, path=None, name="s.tif"):
    path = path or write_tif(name, arr)
    out = np.array(load_image({"path": path, "modality": "sar", "bands": [1]}, max_dim=H))
    return out, out[..., 0]


def usable(g):
    """A SAR render is usable if it is contrasty and not blank/saturated."""
    uniq = len(np.unique(g))
    p2, p98 = np.percentile(g, [2, 98])
    return (uniq >= 32) and (p98 - p2) >= 20, f"unique={uniq} p2={p2:.0f} p98={p98:.0f}"


rng = np.random.default_rng(0)
# Structured SAR-like backscatter: bright urban double-bounce, dark water, mid vegetation
base = np.zeros((H, W), dtype=np.float64)
base[:, :W // 3] = rng.uniform(0.30, 0.90, (H, W // 3))     # built-up: strong return
base[:, W // 3:2 * W // 3] = rng.uniform(0.05, 0.25, (H, 2 * W // 3 - W // 3))
base[:, 2 * W // 3:] = rng.uniform(0.001, 0.02, (H, W - 2 * W // 3))  # water: near-zero

CASES = {
    "A float32 linear power in [0,1]  (calibrated SLC/GRD)": base.astype(np.float32),
    "B float32 linear x10000          (GRD integer-scaled)":  (base * 10000).astype(np.float32),
    "C uint16 linear x10000           (Sentinel-1/BigEarthNet-S1)": (base * 10000).astype(np.uint16),
    "D uint8 0-255 pre-rendered       (8-bit tif)":          (base * 255 / base.max()).astype(np.uint8),
    "E float32 already in dB [-25,0]": (10 * np.log10(np.maximum(base, 1e-5))).astype(np.float32),
}

print("=" * 78)
print("SAR RENDERING CONVENTIONS -- each must produce a USABLE image")
print("=" * 78)
results = {}
for label, arr in CASES.items():
    full, g = sar(arr, name=f"case_{abs(hash(label))%9999}.tif")
    ok, detail = usable(g)
    results[label] = g
    print(f"\n  {label}")
    print(f"      in : dtype={arr.dtype} min={np.asarray(arr).min():.4g} max={np.asarray(arr).max():.4g}")
    print(f"      out: min={g.min()} max={g.max()} {detail} saturated={100*(g>=255).mean():.0f}%")
    check(f"{label[0]}: usable contrast", ok, detail)
    check(f"{label[0]}: not solid white", g.max() < 255 or (g >= 255).mean() < 0.5)
    check(f"{label[0]}: not solid black", g.max() > 0)
    check(f"{label[0]}: shape (H,W,3) uint8", full.shape == (H, W, 3) and full.dtype == np.uint8)
    check(f"{label[0]}: 3 identical greyscale channels",
          np.array_equal(full[..., 0], full[..., 1]) and np.array_equal(full[..., 1], full[..., 2]))
    check(f"{label[0]}: no NaN in output", bool(np.isfinite(full.astype(np.float64)).all()))

print("\n" + "=" * 78)
print("INVARIANCE -- the property that makes calibration scale irrelevant")
print("=" * 78)
# log10(k*x) = log10(k) + log10(x): a scale factor becomes a constant dB offset,
# which percentile normalisation cancels. So B and A must render identically.
d_ab = int(np.abs(results["A float32 linear power in [0,1]  (calibrated SLC/GRD)"].astype(int)
                  - results["B float32 linear x10000          (GRD integer-scaled)"].astype(int)).max())
check("scale invariance: linear x1 vs x10000 render identically", d_ab <= 1, f"max |diff| = {d_ab} LSB")

d_ae = int(np.abs(results["A float32 linear power in [0,1]  (calibrated SLC/GRD)"].astype(int)
                  - results["E float32 already in dB [-25,0]"].astype(int)).max())
check("pre-transformed dB input renders like its linear source", d_ae <= 2, f"max |diff| = {d_ae} LSB")

print("\n" + "=" * 78)
print("MONOTONICITY -- brighter backscatter must stay brighter")
print("=" * 78)
grad = np.tile(np.linspace(0.001, 1.0, W), (H, 1)).astype(np.float32)
_, g = sar(grad, name="grad.tif")
row = g[H // 2].astype(np.float64)
# np.maximum.accumulate already includes element 0 - do not prepend it again.
check("monotonic along an increasing backscatter ramp",
      np.array_equal(row, np.maximum.accumulate(row)),
      f"first={row[0]:.0f} last={row[-1]:.0f} len={len(row)}")
check("ramp spans a wide output range", row[-1] - row[0] >= 100, f"span={row[-1]-row[0]:.0f}")

print("\n" + "=" * 78)
print("DEGENERATE INPUTS -- must not crash, must not emit NaN")
print("=" * 78)
for label, arr in [("all zeros (nodata)", np.zeros((H, W), np.float32)),
                   ("all constant", np.full((H, W), 0.5, np.float32)),
                   ("contains NaN", np.where(np.arange(H * W).reshape(H, W) % 37 == 0,
                                             np.nan, base).astype(np.float32)),
                   ("all negative float", (-np.abs(base) - 1).astype(np.float32))]:
    try:
        full, gg = sar(arr, name=f"deg_{abs(hash(label))%9999}.tif")
        check(f"{label}: no crash, no NaN", bool(np.isfinite(full.astype(np.float64)).all()),
              f"min={gg.min()} max={gg.max()}")
    except Exception as e:
        check(f"{label}: no crash", False, f"{type(e).__name__}: {e}")

print("\n" + "=" * 78)
print("8-BIT FILE PATHS -- PNG/JPEG SAR (Mistake 3's trigger) must still be processed")
print("=" * 78)
png = TMP / "sar.png"
Image.fromarray((base * 255 / base.max()).astype(np.uint8)).save(png)
full, g = sar(None, path=str(png))
ok, detail = usable(g)
print(f"      PNG SAR out: min={g.min()} max={g.max()} {detail}")
check("PNG SAR: goes through SAR handling, usable contrast", ok, detail)
check("PNG SAR: 3 identical channels", np.array_equal(full[..., 0], full[..., 1]))

print("\n" + "=" * 78)
print("REGRESSION -- the optical path must be completely unaffected")
print("=" * 78)
opt_tif = write_tif("optical.tif", (rng.integers(200, 4000, (3, H, W))).astype(np.uint16))
spec = {"path": opt_tif, "modality": "optical", "bands": [1, 2, 3]}
o = np.array(load_image(spec, max_dim=H))
check("optical: still (H,W,3) uint8", o.shape == (H, W, 3) and o.dtype == np.uint8)
check("optical: still percentile-stretched to full range", o.min() < 20 and o.max() > 235,
      f"min={o.min()} max={o.max()}")
check("optical: three DIFFERENT bands preserved (not greyscale)",
      not (np.array_equal(o[..., 0], o[..., 1]) and np.array_equal(o[..., 1], o[..., 2])))

png_opt = TMP / "opt.png"
Image.fromarray((rng.integers(0, 255, (H, W, 3))).astype(np.uint8)).save(png_opt)
o2 = np.array(load_image({"path": str(png_opt), "modality": "optical"}, max_dim=H))
check("optical PNG: unchanged path, full range", o2.shape == (H, W, 3) and o2.max() > 200)

print("\n" + "=" * 78)
print(f"SAR PREPROCESS RESULTS:  {len(PASS)} passed,  {len(FAIL)} failed")
if FAIL:
    print("FAILED:")
    for f in FAIL:
        print("   -", f)
print("=" * 78)
sys.exit(1 if FAIL else 0)
