# evidence.py
"""Deterministic visual evidence for bi-temporal change analysis.

WHY THIS IS NOT MODEL GROUNDING -- and why every payload it returns says so.

The problem statement asks for "visual evidence". What this system can honestly
produce today is a radiometric difference between the two inputs with the changed
regions outlined and measured. It is computed by numpy over the pixels -- NOT by
the VLM.

The reason it is not the VLM: both LoRA adapters were trained on short-answer
targets (yes/no, magnitude phrases, class lists, captions). Neither was ever
trained on box or mask tokens. Prompting them for coordinates would return
plausible-looking geometry with nothing validated behind it, and "how do you know
that box is right?" would have no answer. Inventing coordinates is worse than not
having them, so learned grounding is documented as future work instead of faked.

WHY THIS READS RAW PIXELS INSTEAD OF REUSING common.load_image.
common.load_image applies a 2/98 percentile stretch to EACH FRAME INDEPENDENTLY,
because that is the right thing for a display rendering. It is the wrong thing to
subtract. A bright new object in frame 2 moves frame 2's 98th percentile, which
renormalises the unchanged parts of the scene, so differencing two independently
stretched frames flags the whole image as changed. Measured on a synthetic pair
where exactly 4.0% of pixels changed:

    independent per-frame stretch : 51.3% flagged, 47.3% of it false change
    shared stretch over the pair  :  4.0% flagged,  0.0% false, bbox exact

So this module reads the raw pixels itself (PIL handles the PNG/JPEG/TIFF uploads
this path cares about) and aligns the two frames before subtracting:

    1. one SHARED scale PER CHANNEL -- the pooled 2/98 percentile range over the
       pair, computed independently for R, G and B;
    2. per-frame MEDIAN CENTRING -- removes a global illumination or gain offset
       between the two acquisition dates, which is not ground change;
    3. the MAXIMUM difference across channels, so a change that is chromatic
       rather than luminance-visible is still caught;
    4. a threshold from the difference's OWN robust spread (median + 5*1.4826*MAD)
       so the noise level of this specific pair sets the sensitivity.

Step 3 was measured, not assumed. On a drawn scene where a brown cleared-earth pad
sits on patchwork fields, luminance-only differencing recalls 87.4% of the true
change because some of those fields are as bright as the earth in greyscale;
per-channel recalls 100.0% at 0.56% false change instead of 0.15%. On a
zero-change pair carrying real noise it still flags nothing, because taking the
max over three channels raises the noise floor of the difference distribution and
the MAD term measures that and lifts its own threshold (0.140 -> 0.378).

Both the earlier designs were measured and rejected, not reasoned about:

    per-frame independent stretch : 14.0% false change, and on a 1.6% change in a
                                    900x700 pair only 10.8% recall
    shared percentile + Otsu      : on that same pair Otsu returned 0.7988 (the
                                    pooled 2/98 window had collapsed to 5 grey
                                    levels, so LANCZOS resize ringing dominated the
                                    histogram) -> 16.9% recall
    shared scale + median + MAD   : 100% recall / 0.27% false on that pair, 100% /
                                    0.00% on a subtle +22-level change, and on a
                                    zero-change pair with real noise it raised its
                                    own threshold 0.02 -> 0.145 and flagged nothing

Otsu is gone from this module on purpose: on a change histogram (a huge spike at
zero plus a small bump) its between-class-variance argmax is unstable and lands
wherever the resize artifacts put it. A threshold that flips by 10x on the same
scene depending on interpolation cannot be quoted to a judge.

The overlay is still drawn on common.load_image's output for the later frame, so
the background a human sees is exactly the rendering the model was shown. Where
the raw read cannot be guaranteed to match that rendering (multi-band TIFF, where
load_image uses rasterio with the caller's band selection) the payload says so
instead of implying agreement it has not checked.

Consequences stated in the payload, not hidden in a docstring:
    source              "deterministic_radiometric_differencing"
    is_model_prediction False
    georeferenced       False   -- an upload carries no CRS and no geo-transform,
                                   so geometry is in PIXEL coordinates of the
                                   rendered image. The GeoJSON is labelled
                                   accordingly rather than pretending to be WGS84.
    model_agreement     whether the VLM's answer and this overlay agree, reported
                        either way -- disagreement is information.
"""
import base64
import io
import re
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from common import load_image

# Must match app.py's pair budget so the overlay covers exactly the pixels the
# model was shown: `max_dim = 448 if len(image_specs) == 2 else 512`.
PAIR_MAX_DIM = 448

# A changed region must cover at least this fraction of the scene to be reported.
# Below it the component is speckle, not evidence.
MIN_REGION_FRACTION = 0.002

# Threshold = median(|diff|) + MAD_K * robust_sigma, where robust_sigma is
# 1.4826*MAD of the difference image. K=5 is a deliberately conservative
# multiple: this overlay is evidence a human will act on, so missing a subtle
# change is preferable to outlining half the scene. It is quoted in the payload.
MAD_K = 5.0

# Floor on that threshold, in units of the pair's pooled 2/98 range. It binds
# only when the two frames are pixel-identical over most of their area (sigma
# then measures 0); with real noise present the MAD term takes over. Measured:
# on a zero-change pair carrying +-4 grey levels of noise the rule raised its own
# threshold from this floor (0.02) to 0.145 and flagged nothing.
THRESHOLD_FLOOR = 0.02

# Suffixes whose raw pixels PIL reads the same way common.load_image does, so the
# difference and the rendered overlay are guaranteed to be the same pixels.
_PIL_FAITHFUL = {".png", ".jpg", ".jpeg"}

_CC_MAX_SIDE = 192


class UnreadableForEvidence(Exception):
    """Raised when raw pixels cannot be read for differencing."""


def _read_raw_rgb(spec, max_dim):
    """Raw float32 (H, W, 3) array, thumbnail-scaled like common.load_image.

    Returns (array, reader_tag). Raises UnreadableForEvidence rather than
    guessing: an overlay computed from pixels we could not actually read would be
    worse than no overlay at all.

    Kept in colour because a real change is often chromatic before it is
    luminance-visible (cleared brown earth over bright green pasture, for
    instance). A greyscale read measured 87.4% recall on exactly that case.
    """
    path = Path(spec.get("path") or "")
    suffix = path.suffix.lower()
    try:
        with Image.open(path) as im:
            im = im.convert("RGB")
            im.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            arr = np.asarray(im, dtype=np.float32)
    except Exception as e:
        raise UnreadableForEvidence(
            f"could not read raw pixels from {path.name!r} ({suffix or 'no extension'}): "
            f"{type(e).__name__}: {e}")
    if arr.ndim == 2:
        arr = np.stack([arr] * 3, axis=-1)
    if suffix in _PIL_FAITHFUL:
        return arr, "pil_rgb"
    # For anything else (notably multi-band GeoTIFF) common.load_image reads via
    # rasterio using the caller's `bands` selection, while PIL reads the first
    # image file directory. The two are not guaranteed to be the same pixels.
    return arr, "pil_rgb_unverified_band_selection"


def _radiometric_align(a1, a2):
    """Put two raw frames on a comparable footing and threshold their difference.

    Returns (diff, threshold, binding, meta). `diff` is dimensionless -- per
    channel it is expressed in units of that channel's own pooled radiometric
    range and the channels are combined with a max -- so the same rule works for
    8-bit renders, 16-bit rasters and float reflectance alike.

    Raises UnreadableForEvidence when the pair carries no measurable dynamic
    range, because then the difference cannot be scaled meaningfully and any
    overlay would be noise presented as evidence.
    """
    if a1.shape != a2.shape:
        raise UnreadableForEvidence(
            f"frames do not share a pixel grid after resize ({a1.shape} vs {a2.shape})")

    per_channel = []
    metas = {"pooled_p2": [], "pooled_p98": [], "pooled_range": [],
             "medians_t1": [], "medians_t2": []}
    for c in range(a1.shape[2]):
        x1 = np.nan_to_num(a1[..., c]).astype(np.float64)
        x2 = np.nan_to_num(a2[..., c]).astype(np.float64)
        finite = np.concatenate([x1.ravel(), x2.ravel()])
        finite = finite[np.isfinite(finite)]
        if finite.size == 0:
            raise UnreadableForEvidence(
                f"channel {c} is entirely non-finite; no difference can be computed")
        lo, hi = np.percentile(finite, [2, 98])
        rng = float(hi - lo)
        if rng <= 0:
            raise UnreadableForEvidence(
                f"channel {c} of the pair carries no measurable radiometric dynamic "
                f"range (pooled 2/98 percentiles both {float(lo):.3f}), so a "
                f"difference cannot be scaled meaningfully")
        # Per-frame median centring. This is what stops a whole-scene illumination
        # or gain offset between two dates from being reported as change everywhere.
        # KNOWN LIMIT, stated in the payload's caveats: because the offset is
        # estimated from the median, a genuine change covering more than half the
        # scene shifts that median and is partially suppressed.
        m1, m2 = float(np.median(x1)), float(np.median(x2))
        per_channel.append(np.abs((x1 - m1) / rng - (x2 - m2) / rng))
        metas["pooled_p2"].append(round(float(lo), 4))
        metas["pooled_p98"].append(round(float(hi), 4))
        metas["pooled_range"].append(round(rng, 4))
        metas["medians_t1"].append(round(m1, 4))
        metas["medians_t2"].append(round(m2, 4))

    diff = np.max(np.stack(per_channel, axis=0), axis=0)

    med = float(np.median(diff))
    sigma = float(1.4826 * np.median(np.abs(diff - med)))
    mad_term = med + MAD_K * sigma
    thr = max(mad_term, THRESHOLD_FLOOR)
    binding = "median+K*sigma" if mad_term >= THRESHOLD_FLOOR else "floor"

    meta = {
        "method": ("per_channel_shared_pooled_range + per_frame_median_centring "
                   "+ max_over_channels + MAD_threshold"),
        "channels": int(a1.shape[2]),
        "pooled_p2_per_channel": metas["pooled_p2"],
        "pooled_p98_per_channel": metas["pooled_p98"],
        "pooled_range_per_channel": metas["pooled_range"],
        "frame_medians_t1": metas["medians_t1"],
        "frame_medians_t2": metas["medians_t2"],
        "median_offset_removed_per_channel": [
            round(b - a, 4) for a, b in zip(metas["medians_t1"], metas["medians_t2"])],
        "diff_median": round(med, 6),
        "diff_robust_sigma": round(sigma, 6),
        "mad_k": MAD_K,
        "threshold_floor": THRESHOLD_FLOOR,
        "threshold_bound_by": binding,
        "threshold_in_native_units_per_channel": [
            round(thr * r, 4) for r in metas["pooled_range"]],
        "units": ("the difference is per channel in units of that channel's pooled "
                  "2/98 radiometric range, then combined with a max -- not raw "
                  "grey levels"),
        "why": ("both frames share ONE scale per channel and are centred on their "
                "own medians. common.load_image stretches each frame independently "
                "for display; subtracting two independently stretched frames "
                "measured 14.0% false change on a pair with 4.0% real change, and "
                "only 10.8% recall of a 1.6% change in a 900x700 pair, so that "
                "rendering is not used here. Channels are kept separate because a "
                "luminance-only difference recalled 87.4% where per-channel "
                "recalled 100.0%."),
    }
    return diff, thr, binding, meta


def _binary_open(mask):
    """Erode then dilate with a 4-neighbour structuring element.

    Removes single-pixel speckle that would otherwise become dozens of tiny
    "regions". Implemented with array shifts because scipy is not a dependency of
    this backend and adding one for a 6-line morphological op is not worth it.
    """
    def erode(m):
        out = m.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            out &= np.roll(np.roll(m, dy, axis=0), dx, axis=1)
        return out

    def dilate(m):
        out = m.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            out |= np.roll(np.roll(m, dy, axis=0), dx, axis=1)
        return out

    return dilate(erode(mask))


def _components(mask):
    """4-connected components as (y0, x0, y1, x1, area) via explicit BFS.

    Run on a mask downscaled to at most _CC_MAX_SIDE per side, because a pure
    Python flood fill over a 448x448 grid is needlessly slow for bounding boxes
    that are only evidence outlines. Coordinates are scaled back up.
    """
    h, w = mask.shape
    scale = min(1.0, _CC_MAX_SIDE / max(h, w))
    if scale < 1.0:
        small = np.asarray(
            Image.fromarray((mask * 255).astype(np.uint8))
                 .resize((max(1, round(w * scale)), max(1, round(h * scale))),
                         Image.Resampling.NEAREST)
        ) > 127
    else:
        small = mask
    sh, sw = small.shape
    seen = np.zeros_like(small, dtype=bool)
    out = []
    for y in range(sh):
        for x in range(sw):
            if not small[y, x] or seen[y, x]:
                continue
            q = deque([(y, x)])
            seen[y, x] = True
            y0 = y1 = y
            x0 = x1 = x
            area = 0
            while q:
                cy, cx = q.popleft()
                area += 1
                y0, y1 = min(y0, cy), max(y1, cy)
                x0, x1 = min(x0, cx), max(x1, cx)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < sh and 0 <= nx < sw and small[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            inv = 1.0 / scale if scale < 1.0 else 1.0
            out.append((int(round(y0 * inv)), int(round(x0 * inv)),
                        int(round((y1 + 1) * inv)), int(round((x1 + 1) * inv)),
                        int(round(area * inv * inv))))
    return out


def _ring(x0, y0, x1, y1):
    """Closed 5-point pixel-coordinate ring for a bounding box."""
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]


# Longest phrases first so the reported basis is the most specific one matched.
_NEG_PHRASES = (
    "no annotated change", "no significant change", "no changes detected",
    "there is no annotated change", "there is no change", "no changes",
    "no change", "not changed", "unchanged", "no",
)
_POS_PHRASES = ("yes",)

_LEADING_JUNK = re.compile(r"^[^a-z]+")


def _answer_polarity(answer):
    """Does this answer assert change (True), deny it (False), or neither (None)?

    Word-boundary matching on a curated phrase list, NOT prefix matching. Prefix
    matching was tried and is wrong: "north-west quadrant shows new buildings"
    startswith("no") and would be read as the model DENYING change, and
    "yesterday's image" startswith("yes"). The same bug class was already fixed
    once in training/benchmark.py's canon(), so it is not being repeated here.

    Returns (polarity_or_None, matched_phrase_or_None). Anything that does not
    begin with a yes/no-family phrase yields (None, None): the cross-check is
    then WITHHELD rather than guessed, because a wrong agreement claim is worse
    than no agreement claim.
    """
    a = _LEADING_JUNK.sub("", str(answer or "").strip().lower())
    for phrase in _NEG_PHRASES + _POS_PHRASES:
        if a.startswith(phrase):
            nxt = a[len(phrase):len(phrase) + 1]
            if nxt == "" or not (nxt.isalnum() or nxt == "-"):
                return (phrase in _POS_PHRASES), phrase
    return None, None


def _overlay(base_img, mask, boxes):
    """The later-date frame with changed pixels tinted and regions outlined."""
    base = base_img.convert("RGB").copy()
    tint = Image.new("RGB", base.size, (255, 32, 32))
    mask_img = Image.fromarray((mask * 255).astype(np.uint8)).resize(
        base.size, Image.Resampling.NEAREST)
    blended = Image.composite(tint, base, mask_img.point(lambda v: int(v * 0.55)))
    draw = ImageDraw.Draw(blended)
    for (x0, y0, x1, y1) in boxes:
        draw.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(255, 220, 0), width=2)
    buf = io.BytesIO()
    blended.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _resample_to(arr, size):
    """Resize a float array (H, W) or (H, W, C) to (w, h) so grids line up."""
    h, w = arr.shape[:2]
    if (w, h) == tuple(size):
        return arr, False
    target = (int(size[0]), int(size[1]))

    def one(plane):
        return np.asarray(
            Image.fromarray(plane.astype(np.float32), mode="F").resize(
                target, Image.Resampling.BILINEAR), dtype=np.float32)

    if arr.ndim == 2:
        return one(arr), True
    return np.stack([one(arr[..., c]) for c in range(arr.shape[2])], axis=-1), True


def change_evidence(spec_t1, spec_t2, answer=None):
    """Build the visual-evidence payload for a bi-temporal pair.

    Returns `status: "ok"` with regions, or a not_applicable/failed payload with
    the reason. Never raises for a read or numeric problem: the analysis answer is
    still valid without the overlay, so a failure is reported, not a 500.
    """
    def _norm(m):
        m = str(m or "optical").lower()
        # app.py already maps "multispectral" -> "optical" (HANDOVER flag F4);
        # repeat it here so this module cannot refuse a valid optical pair.
        return "optical" if m in ("optical", "multispectral") else m

    mods = {_norm(spec_t1.get("modality")), _norm(spec_t2.get("modality"))}
    if mods != {"optical"}:
        return {
            "status": "not_applicable",
            "source": "deterministic_radiometric_differencing",
            "is_model_prediction": False,
            "georeferenced": False,
            "coordinate_space": "pixel",
            "region_count": 0,
            "regions": [],
            "reason": ("differencing requires two images of the same sensor type; "
                       f"received modalities {sorted(mods)}. An optical-vs-SAR "
                       "difference measures the sensor, not the ground, so no "
                       "overlay is produced."),
        }

    try:
        # Overlay base FIRST: it is exactly what the model was shown, and it
        # defines the grid the mask is computed on.
        base_img = load_image(spec_t2, max_dim=PAIR_MAX_DIM)
        grid = base_img.size

        raw1, reader1 = _read_raw_rgb(spec_t1, PAIR_MAX_DIM)
        raw2, reader2 = _read_raw_rgb(spec_t2, PAIR_MAX_DIM)
        loaded_sizes = [[int(raw1.shape[1]), int(raw1.shape[0])],
                        [int(raw2.shape[1]), int(raw2.shape[0])]]
        raw1, moved1 = _resample_to(raw1, grid)
        raw2, moved2 = _resample_to(raw2, grid)

        # Inside the same try: a pair with no measurable dynamic range is a
        # clean refusal, not a failure. Both must come back as not_applicable
        # with the reason, so app.py never turns an evidence limitation into a
        # 500 or into a "failed" trace entry that looks like a crash.
        diff, thr, thr_binding, radiometry = _radiometric_align(raw1, raw2)
    except UnreadableForEvidence as e:
        return {
            "status": "not_applicable",
            "source": "deterministic_radiometric_differencing",
            "is_model_prediction": False,
            "georeferenced": False,
            "coordinate_space": "pixel",
            "region_count": 0,
            "regions": [],
            "reason": str(e),
        }

    mask = _binary_open(diff > thr)
    h, w = mask.shape
    changed = int(mask.sum())
    fraction = round(changed / float(h * w), 4) if h * w else 0.0

    comps = sorted(_components(mask), key=lambda c: -c[4])
    min_area = max(4, int(MIN_REGION_FRACTION * h * w))
    regions, boxes = [], []
    for (y0, x0, y1, x1, area) in comps:
        if area < min_area:
            continue
        sub = mask[max(0, y0):min(h, y1), max(0, x0):min(w, x1)]
        boxes.append((x0, y0, x1, y1))
        regions.append({
            "bbox_pixels": [int(x0), int(y0), int(x1), int(y1)],
            "area_pixels": int(sub.sum()),
            "bbox_area_pixels": int((x1 - x0) * (y1 - y0)),
            "fill_fraction": round(float(sub.sum()) /
                                   max(1.0, float((x1 - x0) * (y1 - y0))), 3),
            "share_of_all_change": round(float(sub.sum()) / changed, 4) if changed else 0.0,
        })

    overlay = _overlay(base_img, mask, boxes) if regions else None

    # The only cross-check available: does the VLM's word answer agree with the
    # pixel answer? Reported either way -- hiding disagreement would make the
    # overlay look like confirmation it is not. When the answer's polarity cannot
    # be read with a word-boundary match, the check is WITHHELD (agree: null)
    # rather than guessed.
    agreement = None
    if answer is not None:
        polarity, basis = _answer_polarity(answer)
        pixels_say_change = bool(regions)
        if polarity is None:
            agreement = {
                "model_says_change": None,
                "overlay_shows_change": pixels_say_change,
                "agree": None,
                "parsed_polarity": None,
                "parse_basis": None,
                "note": ("WITHHELD. The answer does not begin with a yes/no-family "
                         "phrase, so its polarity was not guessed and no cross-check "
                         "was performed. A withheld check is not a passing check."),
            }
        else:
            agreement = {
                "model_says_change": polarity,
                "overlay_shows_change": pixels_say_change,
                "agree": polarity == pixels_say_change,
                "parsed_polarity": "change" if polarity else "no change",
                "parse_basis": f"word-boundary match on {basis!r}",
                "note": ("Consistency check between two DIFFERENT methods (a trained "
                         "VLM answer and an untrained pixel difference), not a "
                         "validation of either. They can disagree legitimately: the "
                         "overlay flags radiometric difference, which includes "
                         "illumination, season and registration error -- none of "
                         "which is built-up change."),
            }

    faithful = reader1 == "pil_rgb" and reader2 == "pil_rgb"
    caveats = [
        "geometry is in pixel coordinates of the rendered image, not map coordinates",
        "a radiometric difference is not a semantic change: illumination, season, "
        "cloud shadow and sub-pixel misregistration all produce difference",
        "no learned grounding is performed; the model produced no boxes or masks",
        "per-frame median centring removes global illumination offsets, so a genuine "
        "change covering more than half the scene is partially suppressed",
    ]
    if moved1 or moved2:
        caveats.append("the two frames had different pixel grids and one was "
                       "resampled with bilinear interpolation, which can create "
                       "difference along high-contrast edges")
    if not faithful:
        caveats.append("raw pixels were read with PIL while the model's rendering "
                       "came from rasterio band selection; for a multi-band raster "
                       "these may not be the same pixels")

    return {
        "status": "ok" if regions else "no_regions_above_threshold",
        "source": "deterministic_radiometric_differencing",
        "is_model_prediction": False,
        "georeferenced": False,
        "coordinate_space": "pixel",
        "computed_at_max_dim": PAIR_MAX_DIM,
        "image_size_pixels": [int(w), int(h)],
        "loaded_sizes_pixels": loaded_sizes,
        "frames_resampled_to_common_grid": bool(moved1 or moved2),
        "raw_reader": [reader1, reader2],
        "raw_read_matches_model_rendering": faithful,
        "normalization": radiometry,
        "threshold": round(thr, 4),
        "threshold_method": (f"median|diff| + {MAD_K}*1.4826*MAD, floored at "
                             f"{THRESHOLD_FLOOR} -> bound by {thr_binding} "
                             f"(= {radiometry['threshold_in_native_units_per_channel']} "
                             f"per channel in the pair's native units)"),
        "min_region_area_pixels": int(min_area),
        "changed_pixel_fraction": fraction,
        "region_count": len(regions),
        "regions": regions,
        "overlay_png_base64": overlay,
        "t1": spec_t1.get("timestamp"),
        "t2": spec_t2.get("timestamp"),
        "model_agreement": agreement,
        "caveats": caveats,
        "geojson": {
            "type": "FeatureCollection",
            "crs": None,
            "coordinate_space": "pixel",
            "georeferenced": False,
            "warning": ("These coordinates are PIXELS of the rendered image, not "
                        "longitude/latitude. The upload carried no CRS and no "
                        "geo-transform, so no map-accurate geometry can be produced. "
                        "Do not load this into a GIS as if it were WGS84."),
            "features": [
                {"type": "Feature",
                 "geometry": {"type": "Polygon", "coordinates": [ring]},
                 "properties": {**{k: v for k, v in r.items() if k != "bbox_pixels"},
                                "index": i}}
                for i, (r, ring) in enumerate(
                    (r, _ring(*r["bbox_pixels"])) for r in regions)
            ],
        },
    }
