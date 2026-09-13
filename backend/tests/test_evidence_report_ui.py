"""
tests/test_evidence_report_ui.py

Covers the four gaps closed this round:
  [GAP 1] visual evidence   - evidence.py unit tests against synthetic pairs
                              where the true changed region is KNOWN, so the
                              bounding box can be checked pixel-exactly rather
                              than merely asserted to exist.
  [GAP 2] downloadable report - report.py unit tests + real HTTP GETs.
  [GAP 4] minimal frontend    - GET / contract: talks to the real /analyze,
                              no CDN, no mock fallback.

Everything here runs the REAL modules. Only the model weights are stubbed
(via stub_env), exactly as in test_backend.py.

Usage:  python tests/test_evidence_report_ui.py
"""
import os
import sys
import json
import html
import base64
import shutil
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tests"))

import stub_env                     # noqa: E402
STUBS = stub_env.install()

import numpy as np                  # noqa: E402
from PIL import Image               # noqa: E402

BACKEND = ROOT / "satquery_backend" if (ROOT / "satquery_backend" / "app.py").is_file() else ROOT
sys.path.insert(0, str(BACKEND))

ARTIFACTS = BACKEND / "artifacts"
CREATED_DIRS = []
for a in ("adapter_a", "adapter_b"):
    d = ARTIFACTS / a
    if not d.exists():
        d.mkdir(parents=True, exist_ok=True)
        CREATED_DIRS.append(d)

os.chdir(BACKEND)

import evidence                     # noqa: E402
import report as report_lib         # noqa: E402
from ui import INDEX_HTML           # noqa: E402
from fastapi.testclient import TestClient   # noqa: E402
import app as app_module            # noqa: E402

TMP = Path(tempfile.mkdtemp(prefix="satquery_ev_"))
PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(f"  -> [{'PASS' if cond else 'FAIL'}] {name}" + (f"  [{detail}]" if detail else ""))


# ---------------------------------------------------------------- fixtures
def scene(seed=1, size=200):
    """A synthetic optical scene: dark background, texture, one field block."""
    rng = np.random.default_rng(seed)
    a = np.full((size, size, 3), 40, np.int32)
    a += rng.integers(0, 12, (size, size, 3))
    a[20:90, 110:190] = [70, 120, 60]
    return np.clip(a, 0, 255).astype(np.uint8)


def save(arr, name):
    p = TMP / name
    Image.fromarray(arr).save(p)
    return p


BASE = scene(1)
CHANGED = BASE.copy()
CHANGED[60:100, 60:100] = [235, 235, 235]      # exactly 4.0% of a 200x200 frame
SPECK = BASE.copy()
SPECK[150, 150] = [250, 250, 250]              # a single pixel
WIDE = scene(2, 300)[:120]                     # 300x120 -> different aspect ratio
BIG = scene(3, 900)[:700]                      # 900x700 -> exceeds the 448 budget
BIG_CHANGED = BIG.copy()
BIG_CHANGED[300:400, 300:400] = [240, 240, 240]

P_BASE = save(BASE, "base.png")
P_CHANGED = save(CHANGED, "changed.png")
P_BASE_COPY = save(BASE, "base_copy.png")
P_SPECK = save(SPECK, "speck.png")
P_WIDE = save(WIDE, "wide.png")
P_BIG = save(BIG, "big.png")
P_BIG_CHANGED = save(BIG_CHANGED, "big_changed.png")


def spec(path, modality="optical", ts=None):
    return {"path": str(path), "modality": modality, "timestamp": ts, "bands": [1, 2, 3]}


print("#" * 78)
print("# [GAP 1] VISUAL EVIDENCE - evidence.py, ground truth known")
print("#" * 78)

# --- the pair with a KNOWN change ---------------------------------------
EV = evidence.change_evidence(
    spec(P_BASE, ts="2023-01-01"), spec(P_CHANGED, ts="2024-06-15"),
    "Yes, the built-up area expanded between the two dates.")

check("E1 synthetic pair -> status ok", EV["status"] == "ok", EV["status"])
check("E2 exactly 1 region found", EV["region_count"] == 1, EV["region_count"])
bbox = EV["regions"][0]["bbox_pixels"]
check("E3 bbox is pixel-exact against injected square [60,60,100,100]",
      bbox == [60, 60, 100, 100], str(bbox))
check("E4 changed_pixel_fraction ~= 0.04 (truth 0.04)",
      abs(EV["changed_pixel_fraction"] - 0.04) < 0.01, EV["changed_pixel_fraction"])
check("E5 NO false change outside the square (frac within 1% of truth)",
      EV["changed_pixel_fraction"] < 0.05,
      f"{EV['changed_pixel_fraction']} vs truth 0.0400")
# A 4-neighbour (cross) structuring element erodes the square to 38x38 and the
# dilation cannot restore the 4 corners, so 1596 is the CORRECT area here, not
# 1600. Asserted exactly because it pins the structuring-element geometry.
check("E6 area_pixels == 1596 (40x40 minus 4 corners a cross SE cannot restore)",
      EV["regions"][0]["area_pixels"] == 1596, EV["regions"][0]["area_pixels"])
check("E7 fill_fraction >= 0.99 for a solid square",
      EV["regions"][0]["fill_fraction"] >= 0.99, EV["regions"][0]["fill_fraction"])
check("E8 share_of_all_change == 1.0 (only region)",
      EV["regions"][0]["share_of_all_change"] == 1.0)
check("E9 bbox coords in bounds and ordered",
      0 <= bbox[0] < bbox[2] <= EV["image_size_pixels"][0] and
      0 <= bbox[1] < bbox[3] <= EV["image_size_pixels"][1])

# --- honesty invariants on EVERY produced payload -----------------------
check("E10 source names the method", EV["source"] == "deterministic_radiometric_differencing")
check("E11 is_model_prediction is False", EV["is_model_prediction"] is False)
check("E12 georeferenced is False", EV["georeferenced"] is False)
check("E13 coordinate_space is pixel", EV["coordinate_space"] == "pixel")
check("E14 timestamps echoed back", (EV["t1"], EV["t2"]) == ("2023-01-01", "2024-06-15"))
check("E15 caveats list is non-empty", isinstance(EV["caveats"], list) and len(EV["caveats"]) >= 3)
check("E16 caveats deny learned grounding",
      any("no learned grounding" in c for c in EV["caveats"]))
check("E17 threshold derived from the difference's own spread and reported",
      "MAD" in EV["threshold_method"] and EV["threshold"] >= evidence.THRESHOLD_FLOOR,
      EV["threshold_method"])
check("E18 radiometric alignment is declared, incl. the offset it removed",
      EV["normalization"]["method"].startswith("per_channel_shared_pooled_range") and
      "median_offset_removed_per_channel" in EV["normalization"] and
      EV["normalization"]["channels"] == 3,
      EV["normalization"]["method"])
check("E19 raw read declared faithful to the model's rendering",
      EV["raw_read_matches_model_rendering"] is True)

# --- the radiometric alignment is actually load-bearing ------------------
# Regression guard for the two designs this module rejected BY MEASUREMENT:
# common.load_image stretches each frame independently for display, and
# subtracting two such frames flags most of the scene as changed.
truth = np.zeros((200, 200), dtype=bool)
truth[60:100, 60:100] = True


def _gray_unit(img):
    a = np.asarray(img.convert("L"), dtype=np.float32)
    lo, hi = np.percentile(a, [2, 98])
    return np.clip((a - lo) / (hi - lo), 0.0, 1.0)


i1 = evidence.load_image(spec(P_BASE), max_dim=448)
i2 = evidence.load_image(spec(P_CHANGED), max_dim=448)
d_ind = np.abs(_gray_unit(i1) - _gray_unit(i2))
false_ind = float(((d_ind > 0.08) & ~truth).mean())
raw_a = np.asarray(Image.open(P_BASE).convert("RGB"), np.float32)
raw_b = np.asarray(Image.open(P_CHANGED).convert("RGB"), np.float32)
d_align, thr_align, _bind, _meta = evidence._radiometric_align(raw_a, raw_b)
false_aligned = float(((d_align > thr_align) & ~truth).mean())
recall_aligned = float(((d_align > thr_align) & truth).sum() / truth.sum())
check("E20 alignment removes the false change independent stretching creates",
      false_aligned < 0.005 and false_ind > 0.10,
      f"independent={false_ind:.3f} vs aligned={false_aligned:.4f} falsely flagged")
check("E20b alignment still recalls the true change", recall_aligned > 0.95, f"{recall_aligned:.3f}")

# the threshold adapts to measured noise instead of being a pinned constant
noisy = np.clip(raw_a.astype(np.int32) +
                np.random.default_rng(9).integers(-4, 5, raw_a.shape), 0, 255).astype(np.float32)
_d2, thr2, bind2, meta2 = evidence._radiometric_align(raw_a, noisy)
check("E20c threshold rises when the pair actually contains noise",
      thr2 > evidence.THRESHOLD_FLOOR and bind2 == "median+K*sigma",
      f"clean thr={thr_align:.4f} -> noisy thr={thr2:.4f} ({bind2})")
check("E20d a zero-change noisy pair flags nothing", float((_d2 > thr2).mean()) == 0.0,
      f"{float((_d2 > thr2).mean())*100:.3f}% flagged")

# a pair with no dynamic range is refused rather than rendered as noise
FLAT = np.full((120, 120, 3), 77, np.uint8)
P_FLAT = save(FLAT, "flat.png")
EV_FLAT = evidence.change_evidence(spec(P_FLAT), spec(P_FLAT))
check("E20e flat pair (zero dynamic range) -> not_applicable, not a fake overlay",
      EV_FLAT["status"] == "not_applicable" and "dynamic range" in EV_FLAT["reason"],
      EV_FLAT.get("reason", "")[:70])

# --- per-channel differencing is load-bearing ---------------------------
# A change can be chromatic and almost luminance-neutral: the green field block
# [70,120,60] has luma 98.21 and the grey [98,98,98] that replaces it has 98.00.
# Greyscale differencing is blind to this. Measured, because the whole reason
# this module reads colour is that measurement.
CHROM = BASE.copy()
CHROM[20:90, 110:190] = [98, 98, 98]
P_CHROM = save(CHROM, "chromatic.png")
EV_CHROM = evidence.change_evidence(spec(P_BASE), spec(P_CHROM))
chrom_bbox = EV_CHROM["regions"][0]["bbox_pixels"] if EV_CHROM["regions"] else None
check("E54 a luminance-neutral CHROMATIC change is still localised",
      EV_CHROM["status"] == "ok" and chrom_bbox == [110, 20, 190, 90], str(chrom_bbox))
_l1 = np.asarray(Image.open(P_BASE).convert("L"), np.float32)[..., None].repeat(3, axis=2)
_l2 = np.asarray(Image.open(P_CHROM).convert("L"), np.float32)[..., None].repeat(3, axis=2)
_dg, _tg, _bg, _mg = evidence._radiometric_align(_l1, _l2)
check("E55 the SAME code on greyscale input is blind to it (why colour is read)",
      float(evidence._binary_open(_dg > _tg).mean()) == 0.0,
      f"greyscale flagged {float(evidence._binary_open(_dg > _tg).mean())*100:.4f}%")
check("E56 chromatic area == 5596 (70x80 block minus 4 cross-SE corners)",
      EV_CHROM["regions"][0]["area_pixels"] == 5596,
      EV_CHROM["regions"][0]["area_pixels"])

# --- overlay PNG --------------------------------------------------------
ov = Image.open(__import__("io").BytesIO(base64.b64decode(EV["overlay_png_base64"])))
check("E21 overlay PNG decodes", ov.format == "PNG")
check("E22 overlay size == frame the model was shown",
      list(ov.size) == EV["image_size_pixels"], f"{ov.size} vs {EV['image_size_pixels']}")
oa = np.asarray(ov.convert("RGB"), dtype=np.int32)
inside = oa[70:90, 70:90].mean(axis=(0, 1))
outside = oa[5:25, 5:25].mean(axis=(0, 1))
check("E23 changed pixels are tinted red-dominant", inside[0] > inside[2],
      f"inside RGB={inside.round(1)}")
check("E24 unchanged pixels are NOT tinted", outside[2] >= outside[0] - 5,
      f"outside RGB={outside.round(1)}")
check("E25 overlay drawn on the later frame (load_image rendering)",
      EV["computed_at_max_dim"] == evidence.PAIR_MAX_DIM == 448)

# --- GeoJSON ------------------------------------------------------------
gj = EV["geojson"]
check("E26 geojson is a FeatureCollection", gj["type"] == "FeatureCollection")
check("E27 one feature per region", len(gj["features"]) == EV["region_count"])
ring = gj["features"][0]["geometry"]["coordinates"][0]
check("E28 geometry is a closed 5-point Polygon",
      gj["features"][0]["geometry"]["type"] == "Polygon" and len(ring) == 5 and ring[0] == ring[-1])
check("E29 ring matches the reported bbox", ring == evidence._ring(*bbox))
check("E30 crs is explicitly null", gj["crs"] is None)
check("E31 geojson carries the not-WGS84 warning",
      "PIXELS" in gj["warning"] and gj["georeferenced"] is False)

# --- model cross-check --------------------------------------------------
check("E32 agreement: yes-answer + regions -> agree True", EV["model_agreement"]["agree"] is True)
EV_NO = evidence.change_evidence(spec(P_BASE), spec(P_CHANGED), "no change between the dates")
check("E33 agreement: no-answer + regions -> agree False (disagreement surfaced)",
      EV_NO["model_agreement"]["agree"] is False, EV_NO["model_agreement"]["agree"])
EV_ID = evidence.change_evidence(spec(P_BASE), spec(P_BASE_COPY), "no change")
check("E34 identical pair -> no regions above threshold",
      EV_ID["status"] == "no_regions_above_threshold", EV_ID["status"])
check("E35 identical pair -> changed_pixel_fraction exactly 0.0",
      EV_ID["changed_pixel_fraction"] == 0.0)
check("E36 identical pair -> no overlay produced", EV_ID["overlay_png_base64"] is None)
check("E37 agreement: no-answer + no regions -> agree True", EV_ID["model_agreement"]["agree"] is True)
EV_NONE = evidence.change_evidence(spec(P_BASE), spec(P_CHANGED))
check("E38 answer=None -> no agreement claim invented", EV_NONE["model_agreement"] is None)
EV_MAYBE = evidence.change_evidence(spec(P_BASE), spec(P_CHANGED), "The scene contains buildings.")
check("E39 non yes/no answer -> cross-check WITHHELD, not guessed",
      EV_MAYBE["model_agreement"] is not None and
      EV_MAYBE["model_agreement"]["agree"] is None and
      EV_MAYBE["model_agreement"]["model_says_change"] is None and
      "WITHHELD" in EV_MAYBE["model_agreement"]["note"],
      str(EV_MAYBE["model_agreement"])[:70])
check("E39b a real cross-check reports its parse basis",
      EV["model_agreement"]["parse_basis"] == "word-boundary match on 'yes'",
      EV["model_agreement"]["parse_basis"])

# --- the polarity parser: word boundary, not prefix ----------------------
# Prefix matching was tried first and is WRONG on all three of the cases marked
# below; they are pinned here so the bug cannot come back. The identical bug
# class was already fixed once in training/benchmark.py's canon().
POLARITY = [
    ("Yes, the built-up area expanded.", True),
    ("yes", True),
    ("  YES, it changed.", True),
    ("no change between the dates", False),
    ("No", False),
    ("no annotated change", False),
    ("There is no annotated change in this pair.", False),
    ("unchanged scene", False),
    ("north-west quadrant shows new buildings", None),   # prefix match said False
    ("Northwest expansion is visible.", None),           # prefix match said False
    ("yesterday's image shows more rooftops", None),     # prefix match said True
    ("notable expansion of the built-up area", None),    # prefix match said False
    ("The built-up area expanded significantly.", None),
    ("", None),
    (None, None),
]
_bad = [(a, exp, evidence._answer_polarity(a)[0]) for a, exp in POLARITY
        if evidence._answer_polarity(a)[0] is not exp]
check("E39c all 15 polarity cases parse correctly (word boundary, not prefix)",
      not _bad, str(_bad))
check("E39d longest negative phrase wins as the reported basis",
      evidence._answer_polarity("no annotated change here")[1] == "no annotated change",
      evidence._answer_polarity("no annotated change here")[1])

# --- refusals and degenerate inputs -------------------------------------
EV_SAR = evidence.change_evidence(spec(P_BASE, "optical"), spec(P_CHANGED, "sar"))
check("E40 optical+SAR refused", EV_SAR["status"] == "not_applicable", EV_SAR["status"])
check("E41 refusal states the sensor-vs-ground reason",
      "measures the sensor" in EV_SAR["reason"])
check("E42 refusal still carries the honesty flags",
      EV_SAR["is_model_prediction"] is False and EV_SAR["georeferenced"] is False)
EV_SARSAR = evidence.change_evidence(spec(P_BASE, "sar"), spec(P_CHANGED, "sar"))
check("E43 SAR+SAR also refused (dB renders are not differenced here)",
      EV_SARSAR["status"] == "not_applicable")
EV_MS = evidence.change_evidence(spec(P_BASE, "multispectral"), spec(P_CHANGED, "optical"))
check("E44 multispectral+optical is NOT refused (F4 normalisation honoured)",
      EV_MS["status"] == "ok" and EV_MS["region_count"] == 1, EV_MS["status"])
EV_MISS = evidence.change_evidence(spec(TMP / "nope.png"), spec(P_CHANGED))
check("E45 unreadable file -> not_applicable with the real reason, no raise",
      EV_MISS["status"] == "not_applicable" and "FileNotFoundError" in EV_MISS["reason"])

# --- speckle suppression ------------------------------------------------
EV_SP = evidence.change_evidence(spec(P_BASE), spec(P_SPECK))
check("E46 single-pixel change is suppressed as speckle",
      EV_SP["region_count"] == 0 and EV_SP["changed_pixel_fraction"] == 0.0,
      f"regions={EV_SP['region_count']} frac={EV_SP['changed_pixel_fraction']}")

# --- downscaling and resampling -----------------------------------------
EV_BIG = evidence.change_evidence(spec(P_BIG), spec(P_BIG_CHANGED))
check("E47 900x700 downscaled to the 448 pair budget",
      max(EV_BIG["image_size_pixels"]) == 448, EV_BIG["image_size_pixels"])
bb = EV_BIG["regions"][0]["bbox_pixels"]
cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
check("E48 bbox lands on the injected square after downscale (centre within 12px)",
      abs(cx - 174) < 12 and abs(cy - 174) < 12, f"centre=({cx:.1f},{cy:.1f})")
check("E49 reports the sizes it actually loaded", EV_BIG["loaded_sizes_pixels"] == [[448, 348]] * 2,
      EV_BIG["loaded_sizes_pixels"])
EV_W = evidence.change_evidence(spec(P_WIDE), spec(P_BASE))
check("E50 mismatched grids -> resampling recorded, not silent",
      EV_W["frames_resampled_to_common_grid"] is True, EV_W["loaded_sizes_pixels"])
check("E51 resampling adds its own caveat",
      any("bilinear interpolation" in c for c in EV_W["caveats"]))
check("E52 resampled frames still share one grid",
      EV_W["image_size_pixels"] == [200, 200], EV_W["image_size_pixels"])

# --- determinism --------------------------------------------------------
EV_AGAIN = evidence.change_evidence(spec(P_BASE, ts="2023-01-01"),
                                    spec(P_CHANGED, ts="2024-06-15"),
                                    "Yes, the built-up area expanded between the two dates.")
check("E53 same inputs -> byte-identical payload (deterministic, no RNG)",
      json.dumps(EV, sort_keys=True) == json.dumps(EV_AGAIN, sort_keys=True))


print("\n" + "#" * 78)
print("# [GAP 2] DOWNLOADABLE REPORT - report.py")
print("#" * 78)

payload = {
    "task_intent": "change_vqa", "query": "Has the built-up area changed?",
    "answer": "Yes, the built-up area expanded.", "confidence": 0.8421,
    "confidence_source": "mean_top1_token_probability", "duration_seconds": 4.31,
    "inputs": [{"filename": "t1.png", "modality": "optical", "timestamp": "2023-01-01"}],
    "visual_evidence": EV,
    "auditable_execution_trace": [{"tool": "specialist_registry", "active_adapter": "adapter_b"}],
}
rec = report_lib.build_record(payload)
check("R1 build_record assigns a report_id", bool(rec.get("report_id")))
check("R2 build_record stamps generated_at in UTC", rec["generated_at"].endswith("UTC"))
check("R3 build_record names the product and base model",
      rec["product"] == "SatQuery AI" and "Qwen2.5-VL-3B" in rec["base_model"])
check("R4 limitations are declared, incl. the uncalibrated-confidence caveat",
      len(rec["limitations"]) == 4 and
      any("not a calibrated" in l for l in rec["limitations"]))
check("R5 limitations declare evidence is not grounding",
      any("not learned grounding" in l for l in rec["limitations"]))

doc = report_lib.render_html(rec)
check("R6 render_html returns a full standalone document",
      doc.startswith("<!doctype html>") and doc.rstrip().endswith("</html>"))
# Strip the embedded base64 blob before substring checks: base64's alphabet
# includes lowercase letters, so a 78KB blob contains "cdn" and similar tokens
# purely by chance. Asserting on the raw document would be testing randomness.
import re as _re
_doc_nodata = _re.sub(r"data:image/png;base64,[A-Za-z0-9+/=]+", "DATA_URI", doc)
check("R7 no external resources (no CDN, no remote fetch, no linked asset)",
      "http://" not in _doc_nodata and "https://" not in _doc_nodata and
      "<script src" not in _doc_nodata and "<link " not in _doc_nodata and
      "@import" not in _doc_nodata and "DATA_URI" in _doc_nodata)
check("R8 the overlay is embedded as a data URI", "data:image/png;base64," in doc)
check("R9 the answer appears in the document", "Yes, the built-up area expanded." in doc)
check("R10 confidence is printed to 3dp with its band", "0.842 (high)" in doc, "0.842 (high)")
check("R11 confidence caveat printed next to the number",
      "NOT a calibrated probability that the answer is correct" in doc and
      "mean top-1 token probability" in doc)
check("R12 evidence declared not a model prediction in the report body",
      "False" in doc and "is_model_prediction" not in doc)  # rendered as a labelled row
check("R13 georeferenced=False is rendered", "georeferenced" in doc and "False" in doc)
check("R14 bbox table rendered", "[60, 60, 100, 100]" in doc)
check("R15 caveats section rendered", "What this evidence does NOT establish" in doc)
check("R16 normalization rationale rendered",
      "per_channel_shared_pooled_range" in doc and "MAD_threshold" in doc)
check("R17 model-vs-pixel cross-check rendered", "Cross-check" in doc and "AGREE" in doc)
check("R18 trace table rendered", "specialist_registry" in doc and "adapter_b" in doc)
check("R19 json hint rendered", "?format=json" in doc)

XSS = dict(payload, query='<script>alert("xss")</script>', answer='<img src=x onerror=alert(1)>')
xdoc = report_lib.render_html(report_lib.build_record(XSS))
check("R20 hostile query is HTML-escaped", "<script>alert" not in xdoc and
      html.escape('<script>alert("xss")</script>') in xdoc)
check("R21 hostile answer is HTML-escaped", "<img src=x onerror" not in xdoc)

doc_w = report_lib.render_html(report_lib.build_record(
    dict(payload, visual_evidence=dict(EV, model_agreement=EV_MAYBE["model_agreement"]))))
check("R23b withheld cross-check renders as WITHHELD, not DISAGREE",
      "WITHHELD" in doc_w and "DISAGREE" not in doc_w)
doc_d = report_lib.render_html(report_lib.build_record(
    dict(payload, visual_evidence=dict(EV, model_agreement=EV_NO["model_agreement"]))))
check("R23c genuine disagreement still renders as DISAGREE",
      "DISAGREE" in doc_d and "WITHHELD" not in doc_d)

doc_noev = report_lib.render_html(report_lib.build_record(dict(payload, visual_evidence=None)))
check("R22 no-evidence report explains why instead of leaving a hole",
      "Not produced for this task" in doc_noev)
doc_na = report_lib.render_html(report_lib.build_record(dict(payload, visual_evidence=EV_SAR)))
check("R23 refused-evidence report shows the refusal reason",
      "measures the sensor" in doc_na)

store = report_lib.ReportStore(max_entries=3)
ids = [store.put({"answer": f"a{i}"}) for i in range(5)]
check("R24 store evicts oldest beyond max_entries", len(store) == 3, len(store))
check("R25 evicted id is gone", store.get(ids[0]) is None and store.get(ids[1]) is None)
check("R26 newest ids retained", all(store.get(i) is not None for i in ids[2:]))
check("R27 explicit rid honoured", store.put({"x": 1}, rid="fixedrid") == "fixedrid"
      and store.get("fixedrid") == {"x": 1})

big = report_lib.ReportStore(max_entries=500)
errs, got = [], []
def worker(k):
    try:
        for j in range(50):
            rid = big.put({"w": k, "j": j})
            got.append(rid)
    except Exception as e:                                   # pragma: no cover
        errs.append(repr(e))
threads = [threading.Thread(target=worker, args=(k,)) for k in range(8)]
[t.start() for t in threads]
[t.join() for t in threads]
check("R28 concurrent puts raise nothing", not errs, errs[:1])
check("R29 400 concurrent puts all stored and unique",
      len(big) == 400 and len(set(got)) == 400, f"{len(big)} stored, {len(set(got))} unique")
check("R30 every concurrent rid is retrievable", all(big.get(r) is not None for r in got))


print("\n" + "#" * 78)
print("# [GAP 4] MINIMAL FRONTEND + end-to-end HTTP")
print("#" * 78)

check("U1 INDEX_HTML is a complete document",
      INDEX_HTML.startswith("<!doctype html>") and INDEX_HTML.rstrip().endswith("</html>"))
check("U2 no CDN / no external origin anywhere in the page",
      "http://" not in INDEX_HTML and "https://" not in INDEX_HTML and
      "cdn" not in INDEX_HTML.lower() and "<script src" not in INDEX_HTML)
# Assert the BEHAVIOUR, not the absence of a word: the page literally contains
# the disclaimer "No mock data, no fallback", so a substring test on "mock"
# fails on the sentence that documents the property being tested.
check("U3 exactly two data paths: POST /analyze and GET /health",
      INDEX_HTML.count("fetch(") == 2, INDEX_HTML.count("fetch("))
check("U3b no client-side cache, timer or seeded fallback answer",
      not any(t in INDEX_HTML for t in
              ("localStorage", "sessionStorage", "setTimeout", "DEFAULT_ANSWER")))
# The page does contain one `|| {}` default -- it guards the ADAPTER LABEL when a
# trace entry is absent, so the render cannot crash. That is a display default,
# not fabricated analysis output. What must never be defaulted is the result.
_srv = [l for l in INDEX_HTML.splitlines()
        if any(k in l for k in ("b.answer", "b.confidence", "b.task_intent"))]
check("U3d answer/confidence/task come from the response and are never defaulted",
      len(_srv) >= 3 and not any("||" in l for l in _srv), f"{len(_srv)} references")
check("U3c the no-mock-data contract is stated to the operator",
      "No mock data, no fallback" in INDEX_HTML)
check("U4 posts to the real endpoint with the real field names",
      "fetch('/analyze'" in INDEX_HTML and all(
          f"'{k}'" in INDEX_HTML or f'"{k}"' in INDEX_HTML or f"append('{k}'" in INDEX_HTML
          for k in ["query", "dataset", "modalities", "timestamps", "bands", "files"]))
check("U5 surfaces the backend's refusal text rather than hiding it",
      "body.detail" in INDEX_HTML and "Refused by the backend" in INDEX_HTML)
check("U6 reads the health endpoint", "fetch('/health')" in INDEX_HTML)
check("U6b the page distinguishes agree true / false / withheld",
      "WITHHELD" in INDEX_HTML and "a.agree === true" in INDEX_HTML and
      "a.agree === false" in INDEX_HTML and "'na'" in INDEX_HTML)

client = TestClient(app_module.app)
os.environ["FAKE_ANSWER"] = "Yes, the built-up area expanded in the north-west quadrant."
os.environ["FAKE_PROBS"] = "0.91,0.87,0.94,0.83"

with client:
    r = client.get("/")
    check("U7 GET / -> 200 HTML", r.status_code == 200 and
          r.headers["content-type"].startswith("text/html"))
    check("U8 served page is the module's page", r.text == INDEX_HTML)

    r = client.post("/analyze",
                    data={"query": "Has the built-up area changed between the two images?",
                          "modalities": "optical,optical",
                          "timestamps": "2023-01-01,2024-06-15"},
                    files=[("files", ("t1.png", P_BASE.read_bytes(), "image/png")),
                           ("files", ("t2.png", P_CHANGED.read_bytes(), "image/png"))])
    j = r.json()
    check("U9 change_vqa 2-image -> 200", r.status_code == 200, r.status_code)
    check("U10 response carries visual_evidence", isinstance(j.get("visual_evidence"), dict))
    ev = j["visual_evidence"]
    check("U11 evidence found the injected change over real HTTP",
          ev["status"] == "ok" and ev["regions"][0]["bbox_pixels"] == [60, 60, 100, 100],
          str(ev.get("regions", [{}])[0].get("bbox_pixels")))
    check("U12 evidence declares itself not a model prediction",
          ev["is_model_prediction"] is False and ev["georeferenced"] is False)
    check("U13 overlay survived JSON transport", ev["overlay_png_base64"] and
          Image.open(__import__("io").BytesIO(base64.b64decode(ev["overlay_png_base64"]))).format == "PNG")
    tr = [t for t in j["auditable_execution_trace"] if t["tool"] == "visual_evidence_generator"]
    check("U14 evidence is recorded in the auditable trace", bool(tr), str(tr))
    check("U15 trace entry says is_model_prediction False", tr and tr[0]["is_model_prediction"] is False)

    rep = j.get("report")
    check("U16 response carries a report link block", isinstance(rep, dict) and
          all(k in rep for k in ("report_id", "view_url", "download_url", "json_url")), str(rep))
    rid = rep["report_id"]
    check("U17 report_id is a 16-hex token", len(rid) == 16 and all(c in "0123456789abcdef" for c in rid))
    check("U18 report urls are relative (proxy/tunnel safe)",
          all(u.startswith("/report/") for u in (rep["view_url"], rep["download_url"], rep["json_url"])))

    rd = client.get(rep["download_url"])
    check("U19 GET download_url -> 200 HTML attachment", rd.status_code == 200 and
          "attachment" in rd.headers.get("content-disposition", "") and
          f"satquery_report_{rid}.html" in rd.headers.get("content-disposition", ""),
          rd.headers.get("content-disposition", ""))
    check("U20 downloaded report contains the real answer",
          "Yes, the built-up area expanded in the north-west quadrant." in rd.text)
    check("U21 downloaded report embeds the overlay", "data:image/png;base64," in rd.text)
    rv = client.get(rep["view_url"])
    check("U22 view_url renders inline (no attachment header)",
          rv.status_code == 200 and "attachment" not in rv.headers.get("content-disposition", ""))
    rj = client.get(rep["json_url"])
    jj = rj.json()
    check("U23 json_url -> machine-readable record", rj.status_code == 200 and
          jj["report_id"] == rid and jj["task_intent"] == "change_vqa")
    check("U24 json record keeps evidence + limitations",
          jj["visual_evidence"]["region_count"] == 1 and len(jj["limitations"]) == 4)
    r404 = client.get("/report/deadbeefdeadbeef")
    check("U25 unknown report -> 404 with an honest explanation",
          r404.status_code == 404 and "process memory" in r404.json()["detail"],
          r404.json().get("detail", "")[:60])

    # cross-modal: evidence must refuse, not invent
    rx = client.post("/analyze",
                     data={"query": "Identify land cover and the built-up and water-covered regions.",
                           "modalities": "optical,sar"},
                     files=[("files", ("o.png", P_BASE.read_bytes(), "image/png")),
                            ("files", ("s.png", P_CHANGED.read_bytes(), "image/png"))])
    jx = rx.json()
    check("U26 cross_modal -> 200", rx.status_code == 200, rx.status_code)
    check("U27 cross_modal evidence refused as not_applicable",
          jx["visual_evidence"]["status"] == "not_applicable", jx["visual_evidence"]["status"])
    check("U28 refusal reason reaches the client", "measures the sensor" in jx["visual_evidence"]["reason"])
    check("U29 refused evidence still gets a report", "report" in jx and
          client.get(jx["report"]["json_url"]).status_code == 200)

    # single image: no evidence at all, key present and null
    r1 = client.post("/analyze", data={"query": "How many buildings are visible?"},
                     files=[("files", ("a.png", P_BASE.read_bytes(), "image/png"))])
    j1 = r1.json()
    check("U30 single image -> visual_evidence is null, not fabricated",
          r1.status_code == 200 and j1["visual_evidence"] is None)
    check("U31 single image still gets a report", "report" in j1 and
          client.get(j1["report"]["view_url"]).status_code == 200)
    check("U32 single-image report explains the absence",
          "Not produced for this task" in client.get(j1["report"]["download_url"]).text)

    # identical-bytes guardrail path
    ri = client.post("/analyze",
                     data={"query": "Has the built-up area changed?",
                           "modalities": "optical,optical",
                           "timestamps": "2023-01-01,2024-06-15"},
                     files=[("files", ("t1.png", P_BASE.read_bytes(), "image/png")),
                            ("files", ("t2.png", P_BASE_COPY.read_bytes(), "image/png"))])
    ji = ri.json()
    check("U33 identical bytes -> guardrail answer, confidence 1.0",
          ri.status_code == 200 and ji["confidence"] == 1.0 and
          ji["confidence_source"] == "deterministic_byte_equality_guardrail")
    check("U34 guardrail path also reports evidence as not_applicable",
          ji["visual_evidence"]["status"] == "not_applicable" and
          "byte-identical" in ji["visual_evidence"]["reason"])
    check("U35 guardrail path is also downloadable",
          client.get(ji["report"]["download_url"]).status_code == 200)
    check("U36 guardrail payload now lists its inputs",
          [i["filename"] for i in ji["inputs"]] == ["t1.png", "t2.png"], str(ji.get("inputs")))

    # refusals must NOT mint reports
    r4 = client.post("/analyze", data={"query": "What is in these images?", "modalities": "optical,optical"},
                     files=[("files", ("t1.png", P_BASE.read_bytes(), "image/png")),
                            ("files", ("t2.png", P_CHANGED.read_bytes(), "image/png"))])
    check("U37 ambiguous 2-image intent -> 400 (regression)", r4.status_code == 400)
    check("U38 a 400 carries no report and no evidence (nothing was analysed)",
          "report" not in r4.json() and "visual_evidence" not in r4.json())
    r3 = client.post("/analyze", data={"query": "x"},
                     files=[("files", ("a.png", P_BASE.read_bytes(), "image/png")),
                            ("files", ("b.png", P_CHANGED.read_bytes(), "image/png")),
                            ("files", ("c.png", P_WIDE.read_bytes(), "image/png"))])
    check("U39 3 files -> 400 (regression)", r3.status_code == 400)
    rs = client.post("/analyze", data={"query": "x", "modalities": "optical,optical"},
                     files=[("files", ("a.png", P_BASE.read_bytes(), "image/png")),
                            ("files", ("b.png", P_CHANGED.read_bytes(), "image/png"))])
    check("U40 cross_modal with 2 optical -> 400 (regression)", rs.status_code == 400)

    # non-448 evidence path must not disturb the existing pixel budget
    kw = STUBS["FakeProcessor"].last_init_kwargs
    check("U41 processor pixel budget untouched by this work",
          kw.get("max_pixels") == 256 * 28 * 28 and kw.get("min_pixels") == 64 * 28 * 28)

shutil.rmtree(TMP, ignore_errors=True)
for d in CREATED_DIRS:
    shutil.rmtree(d, ignore_errors=True)

print("\n" + "=" * 78)
print(f"RESULTS:  {len(PASS)} passed,  {len(FAIL)} failed")
if FAIL:
    print("FAILED CHECKS:")
    for f in FAIL:
        print("   -", f)
print("=" * 78)
sys.exit(1 if FAIL else 0)
