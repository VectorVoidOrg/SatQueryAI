# common.py — Image loading, SAR preprocessing, prompt formatting
import json
from pathlib import Path
import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling

# Toggle between models — uncomment one:
#BASE_MODEL = "gemini-3.6-flash"           # 20 RPD free tier
BASE_MODEL = "gemini-3.5-flash"              # separate quota bucket
# BASE_MODEL = "gemini-2.5-flash"        # lightweight


def _sar_to_uint8(arr):
    """
    Render a single SAR band to 8-bit greyscale.
    Four conventions: float linear power, linear power at integer scale,
    8-bit integer raster, float already in dB.
    Percentile stretch makes the result calibration-scale invariant.
    """
    src = np.asarray(arr)
    if src.ndim == 3:
        src = src[..., 0]
    as_float = src.astype(np.float64)
    finite_mask = np.isfinite(as_float)
    if not finite_mask.any():
        return np.zeros(src.shape[:2], dtype=np.uint8)
    finite = as_float[finite_mask]

    is_int = np.issubdtype(src.dtype, np.integer)
    is_float = np.issubdtype(src.dtype, np.floating)

    if is_float and bool((finite < 0).any()):
        # D: already in dB
        vals = as_float
        invalid = ~finite_mask
    elif is_int and src.dtype.itemsize == 1:
        # C: 8-bit raster
        vals = as_float
        invalid = ~finite_mask
    else:
        # A / B: linear power at some unknown scale
        pos = finite[finite > 0]
        if pos.size == 0:
            vals = as_float
            invalid = ~finite_mask
        else:
            floor = float(pos.min())
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
    """Format messages for the VLM. Kept for compatibility; Gemini uses its own format."""
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
        "You are SatQuery AI, a specialist remote sensing visual language model. "
        "Analyze the satellite imagery provided and answer the user's question "
        "accurately based on what you observe in the image(s).\n\n"
        "RULES:\n"
        "1. Base your answer on what is visible in the imagery.\n"
        "2. For change detection, compare the BEFORE and AFTER images carefully.\n"
        "3. For cross-modal queries, integrate information from both optical and SAR inputs.\n"
        "4. Be concise and factual."
    )

    content.append({"type": "text", "text": f"Question: {row['query']}"})

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": content}
    ]
