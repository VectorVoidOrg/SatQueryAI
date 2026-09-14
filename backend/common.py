# common.py
import json
from pathlib import Path
import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling

BASE_MODEL = "Qwen/Qwen2.5-VL-3B-Instruct"


def _sar_to_uint8(arr):
    """
    Render a single SAR band to 8-bit greyscale.

    Four conventions appear in real SAR products and ALL FOUR must work:
      A  float linear power ~[0,1]          (calibrated SLC/GRD)  -> 10*log10
      B  linear power at an integer scale   (Sentinel-1 GRD and BigEarthNet-S1
                                             ship uint16 x10000)  -> 10*log10
      C  8-bit integer raster               (uint8 tif / preview that someone
                                             already rendered)    -> use directly
      D  float already in dB                (has negative values) -> use directly

    Normalisation then uses MEASURED 2/98 percentiles of the transformed array
    rather than a hardcoded [-25, 0] dB window. That is what makes the result
    calibration-scale invariant:

        log10(k * x) = log10(k) + log10(x)

    so any multiplicative calibration scale becomes a constant dB offset, and a
    percentile stretch cancels constant offsets exactly. The previous hardcoded
    window assumed float linear power in ~[0.003, 1]; every uint16 and every
    8-bit SAR input landed above 0 dB and clipped to a SOLID WHITE image, and
    pre-dB float input clipped to SOLID BLACK. The vision tower then received no
    signal at all for cross_modal, and the model narrated SAR content it had
    never seen.

    Non-finite and non-positive pixels (nodata) are excluded from the stretch
    and rendered black rather than being allowed to crush the histogram.
    """
    src = np.asarray(arr)
    if src.ndim == 3:                      # defensive: caller already took band 0
        src = src[..., 0]
    as_float = src.astype(np.float64)
    finite_mask = np.isfinite(as_float)
    if not finite_mask.any():
        return np.zeros(src.shape[:2], dtype=np.uint8)
    finite = as_float[finite_mask]

    is_int = np.issubdtype(src.dtype, np.integer)
    is_float = np.issubdtype(src.dtype, np.floating)

    if is_float and bool((finite < 0).any()):
        # D: already in dB. Logging again would be meaningless (log of a negative).
        vals = as_float
        invalid = ~finite_mask
    elif is_int and src.dtype.itemsize == 1:
        # C: 8-bit raster is an already-rendered product. Do not re-log it.
        vals = as_float
        invalid = ~finite_mask
    else:
        # A / B: linear power at some unknown scale.
        pos = finite[finite > 0]
        if pos.size == 0:
            vals = as_float                # no positive energy: nothing to log
            invalid = ~finite_mask
        else:
            floor = float(pos.min())       # data-relative epsilon, not a hardcoded 1e-5
            good = finite_mask & (as_float > 0)
            vals = 10.0 * np.log10(np.where(good, as_float, floor))
            invalid = ~good

    vals = np.where(invalid, np.nan, vals)
    valid = vals[np.isfinite(vals)]
    if valid.size == 0:
        return np.zeros(src.shape[:2], dtype=np.uint8)

    lo, hi = np.percentile(valid, [2, 98])
    if not np.isfinite(lo) or not np.isfinite(hi) or hi <= lo:
        hi = lo + 1.0
    out = np.clip((vals - lo) / (hi - lo), 0.0, 1.0) * 255.0
    out = np.nan_to_num(out, nan=0.0, posinf=255.0, neginf=0.0)
    return out.astype(np.uint8)


def load_image(spec, max_dim=512):
    path = Path(spec["path"])
    modality = spec.get("modality", "optical").lower()

    if path.suffix.lower() in {".png", ".jpg", ".jpeg"}:
        with Image.open(path) as img:
            img = img.convert("RGB")
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            arr = np.array(img, dtype=np.float32)
    else:
        with rasterio.open(path) as ds:
            bands = spec.get("bands", [1, 2, 3])
            max_b = ds.count
            bands = [b if b <= max_b else 1 for b in bands]

            scale = min(1.0, max_dim / max(ds.width, ds.height))
            h, w = max(1, round(ds.height * scale)), max(1, round(ds.width * scale))
            data = ds.read(bands, out_shape=(len(bands), h, w), resampling=Resampling.bilinear, masked=True)

            if hasattr(data, "filled"):
                arr = np.asarray(data.filled(0), dtype=np.float32)
            else:
                arr = np.nan_to_num(np.asarray(data, dtype=np.float32))

            if arr.ndim == 3:
                arr = np.transpose(arr, (1, 2, 0))

    if modality == "sar":
        if arr.ndim == 3:
            arr = arr[..., 0]
        sar_uint8 = _sar_to_uint8(arr)
        return Image.fromarray(np.stack([sar_uint8, sar_uint8, sar_uint8], axis=-1))

    if arr.ndim == 2:
        arr = np.stack([arr, arr, arr], axis=-1)

    rendered = []
    for c_idx in range(min(3, arr.shape[-1])):
        c = arr[..., c_idx]
        valid = c[np.isfinite(c)]
        lo, hi = np.percentile(valid, [2, 98]) if valid.size > 0 else (0.0, 255.0)
        if hi == lo: hi = lo + 1.0
        c_norm = np.clip((c - lo) / (hi - lo), 0, 1) * 255.0
        rendered.append(c_norm.astype(np.uint8))

    while len(rendered) < 3:
        rendered.append(rendered[0])

    return Image.fromarray(np.stack(rendered[:3], axis=-1))


def format_messages(row):
    content = []
    task = row["task"]

    for idx, img_spec in enumerate(row["images"]):
        mod = img_spec.get("modality", "optical").upper()
        date_str = f" ({img_spec['timestamp']})" if img_spec.get("timestamp") else ""

        if task == "cross_modal":
            label = f"Image {idx+1} [{mod}{date_str}]:"
        elif task == "change_vqa":
            label = f"Image {idx+1} [{'BEFORE' if idx==0 else 'AFTER'}{date_str}]:"
        else:
            label = f"Satellite Image [{mod}{date_str}]:"

        content.extend([{"type": "text", "text": label}, {"type": "image"}])

    system_prompt = (
        "You are SatQuery AI, an expert remote-sensing assistant. "
        "Examine the visual pixels of the image carefully and answer accurately. "
        "Do not invent water, buildings, or changes that are not clearly visible. "
        "Format the answer for scanning: use a short heading, concise bullet points, "
        "and a Markdown table only when numerical or statistical values need comparison. "
        "Use prose or bullets for descriptive answers; do not force a table. "
        "Keep the final answer factual and compact."
    )

    conversation_context = row.get("conversation_context") or []
    if conversation_context:
        context_lines = ["Recent conversation context:"]
        for turn in conversation_context[-6:]:
            context_lines.append(f"User: {turn.get('query', '')}")
            context_lines.append(f"Assistant: {turn.get('answer', '')}")
        content.append({"type": "text", "text": "\n".join(context_lines)})

    content.append({"type": "text", "text": f"Current question: {row['query']}"})

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": content}
    ]
