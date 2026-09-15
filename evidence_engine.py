import numpy as np
from PIL import Image, ImageOps
from typing import Tuple, Dict, Any, Optional
import os
from pathlib import Path

try:
    import rasterio
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False


def load_as_rgb(file_path: str, is_sar: bool = False) -> np.ndarray:
    """
    Loads any image format (GeoTIFF, PNG, JPG) and returns a clean 8-bit RGB numpy array (H, W, 3).
    Applies percentile contrast stretching for optical and dB scaling for SAR.
    """
    ext = Path(file_path).suffix.lower()

    if ext in [".tif", ".tiff"] and HAS_RASTERIO:
        with rasterio.open(file_path) as src:
            arr = src.read()  # (bands, H, W)
            if is_sar or src.count == 1:
                # Single band SAR / Grayscale
                band = arr[0].astype(np.float32)
                if band.max() > 255 or band.min() < 0 or is_sar:
                    # Log / dB scale conversion if floating point
                    band_clean = np.nan_to_num(band, nan=0.0)
                    if band_clean.max() > 0:
                        db = 10.0 * np.log10(np.clip(band_clean, 1e-5, None))
                        p2, p98 = np.percentile(db, (2, 98))
                        scaled = np.clip((db - p2) / (p98 - p2 + 1e-5) * 255.0, 0, 255)
                    else:
                        scaled = band_clean
                else:
                    p2, p98 = np.percentile(band, (2, 98))
                    scaled = np.clip((band - p2) / (p98 - p2 + 1e-5) * 255.0, 0, 255)

                rgb = np.stack([scaled, scaled, scaled], axis=-1).astype(np.uint8)
                return rgb

            # Multi-band optical (RGB or Multispectral)
            if src.count >= 3:
                rgb_arr = arr[:3].astype(np.float32)  # Take first 3 bands (R, G, B)
                rgb_scaled = np.zeros((src.height, src.width, 3), dtype=np.uint8)
                for c in range(3):
                    band = rgb_arr[c]
                    p2, p98 = np.percentile(band, (2, 98))
                    scaled = np.clip((band - p2) / (p98 - p2 + 1e-5) * 255.0, 0, 255)
                    rgb_scaled[:, :, c] = scaled.astype(np.uint8)
                return rgb_scaled

    # Standard Pillow fallback
    img = Image.open(file_path).convert("RGB")
    arr = np.array(img, dtype=np.uint8)
    return arr


def compute_pixel_difference(img1_path: str, img2_path: str) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Computes deterministic pixel difference metrics between two aligned images (T1 vs T2).
    Returns (change_heatmap_rgb_array, quantitative_summary_dict).
    """
    arr1 = load_as_rgb(img1_path)
    arr2 = load_as_rgb(img2_path)

    # Resize arr2 to match arr1 if dimensions differ
    if arr1.shape[:2] != arr2.shape[:2]:
        img2_pil = Image.fromarray(arr2).resize((arr1.shape[1], arr1.shape[0]), Image.Resampling.BILINEAR)
        arr2 = np.array(img2_pil)

    # Convert to float grayscale for differencing
    gray1 = np.mean(arr1, axis=-1).astype(np.float32)
    gray2 = np.mean(arr2, axis=-1).astype(np.float32)

    diff = gray2 - gray1  # Positive = Brightened (T2 > T1), Negative = Darkened (T2 < T1)
    abs_diff = np.abs(diff)

    # Quantitative evidence metrics
    threshold = 30.0  # Significant change threshold (0-255 scale)
    changed_pixels = np.sum(abs_diff > threshold)
    total_pixels = abs_diff.size
    pct_changed = (changed_pixels / total_pixels) * 100.0

    brightened_pct = (np.sum(diff > threshold) / total_pixels) * 100.0
    darkened_pct = (np.sum(diff < -threshold) / total_pixels) * 100.0
    mean_abs_change = float(np.mean(abs_diff))

    # Construct RGB Heatmap: Red = Brightened (new built-up/cleared land), Blue = Darkened (water/flooding/shadow), Gray = Unchanged
    heatmap = np.zeros_like(arr1, dtype=np.uint8)
    # Background: faint grayscale of T2
    faint_bg = (gray2 * 0.4).astype(np.uint8)
    heatmap[:, :, 0] = faint_bg
    heatmap[:, :, 1] = faint_bg
    heatmap[:, :, 2] = faint_bg

    # Highlight significant changes
    bright_mask = diff > threshold
    dark_mask = diff < -threshold

    heatmap[bright_mask] = [255, 50, 50]   # Bright Red for new structures / land clearing
    heatmap[dark_mask] = [50, 150, 255]   # Bright Cyan/Blue for water / destruction / shadow

    summary = {
        "pct_area_changed": round(pct_changed, 2),
        "pct_brightened_new_structures": round(brightened_pct, 2),
        "pct_darkened_flooding_loss": round(darkened_pct, 2),
        "mean_change_intensity": round(mean_abs_change, 2),
        "image_size": f"{arr1.shape[1]}x{arr1.shape[0]}"
    }

    return heatmap, summary


def compute_cross_modal_composite(opt_path: str, sar_path: str) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Combines Optical RGB + SAR backscatter into a false-color composite image and extracts complementary stats.
    """
    opt_arr = load_as_rgb(opt_path, is_sar=False)
    sar_arr = load_as_rgb(sar_path, is_sar=True)

    if opt_arr.shape[:2] != sar_arr.shape[:2]:
        sar_pil = Image.fromarray(sar_arr).resize((opt_arr.shape[1], opt_arr.shape[0]), Image.Resampling.BILINEAR)
        sar_arr = np.array(sar_pil)

    opt_gray = np.mean(opt_arr, axis=-1).astype(np.float32)
    sar_gray = np.mean(sar_arr, axis=-1).astype(np.float32)

    # False-color composite: Red = Optical Red, Green = Optical Green, Blue = SAR radar backscatter
    composite = np.zeros_like(opt_arr, dtype=np.uint8)
    composite[:, :, 0] = opt_arr[:, :, 0]  # R channel from optical
    composite[:, :, 1] = opt_arr[:, :, 1]  # G channel from optical
    composite[:, :, 2] = sar_arr[:, :, 0]  # B channel from SAR intensity

    # Complementarity index (areas where SAR reveals high reflection despite low optical brightness, e.g. metal structures under cloud/canopy)
    high_sar_low_opt = (sar_gray > 180) & (opt_gray < 80)
    pct_sar_dominant = (np.sum(high_sar_low_opt) / sar_gray.size) * 100.0

    summary = {
        "pct_sar_unique_features": round(pct_sar_dominant, 2),
        "optical_mean_brightness": round(float(np.mean(opt_gray)), 2),
        "sar_mean_backscatter": round(float(np.mean(sar_gray)), 2)
    }

    return composite, summary


if __name__ == "__main__":
    # Test evidence engine
    t1 = np.ones((100, 100, 3), dtype=np.uint8) * 100
    t2 = np.ones((100, 100, 3), dtype=np.uint8) * 100
    t2[:30, :30] = 200  # Brightened patch
    t2[70:, 70:] = 20   # Darkened patch

    Image.fromarray(t1).save("t1.png")
    Image.fromarray(t2).save("t2.png")

    hmap, stats = compute_pixel_difference("t1.png", "t2.png")
    print("Change Stats:", stats)

    Path("t1.png").unlink()
    Path("t2.png").unlink()
