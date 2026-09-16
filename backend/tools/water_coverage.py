"""
Real water/flood coverage computation from actual image pixels.
Zero GPU usage: uses rasterio for multi-band GeoTIFF NDWI or numpy/PIL for RGB heuristic.
"""

from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
from PIL import Image
import logging

logger = logging.getLogger("satquery.tools.water_coverage")


def compute(image_path: str) -> Dict[str, Any]:
    """
    Compute water surface coverage from image pixels.
    - If GeoTIFF with >= 4 bands (including NIR): computes true NDWI.
    - Otherwise (RGB JPEG/PNG): computes adaptive blue-dominance heuristic with honest caveat.
    """
    path_obj = Path(image_path)
    if not path_obj.exists():
        return {
            "tool": "water_coverage",
            "status": "error",
            "reason": f"Image file not found: {image_path}",
            "water_percentage": 0.0,
            "total_pixels": 0,
            "water_pixels": 0,
            "caveat": "File does not exist.",
        }

    # Path A: Try multi-band GeoTIFF if extension is tif/tiff
    if path_obj.suffix.lower() in [".tif", ".tiff"]:
        try:
            import rasterio
            with rasterio.open(str(path_obj)) as src:
                # Check band count
                if src.count >= 4:
                    # Common standard: Band 2 = Green, Band 4 = NIR (or Band 3 Green, Band 4 NIR)
                    # Band 2 = Green, Band 4 = NIR in standard 4-band PlanetScope / Sentinel-2 subset
                    green = src.read(2).astype(np.float32)
                    nir = src.read(4).astype(np.float32)
                    denom = green + nir
                    denom[denom == 0] = 1e-6
                    ndwi = (green - nir) / denom

                    water_mask = ndwi > 0.0
                    water_pixels = int(np.sum(water_mask))
                    total_pixels = int(water_mask.size)
                    water_pct = round((water_pixels / total_pixels) * 100.0, 2)

                    return {
                        "tool": "water_coverage",
                        "status": "success",
                        "method": "ndwi",
                        "water_percentage": water_pct,
                        "total_pixels": total_pixels,
                        "water_pixels": water_pixels,
                        "ndwi_mean": round(float(np.mean(ndwi)), 4),
                        "caveat": None,
                    }
        except Exception as e:
            logger.warning(f"[SatQuery Tools] rasterio NDWI attempt failed, falling back to RGB heuristic: {e}")

    # Path B: Standard RGB / JPEG / PNG pixel computation
    try:
        with Image.open(str(path_obj)) as img:
            rgb_img = img.convert("RGB")
            arr = np.array(rgb_img, dtype=np.float32)

        r = arr[:, :, 0]
        g = arr[:, :, 1]
        b = arr[:, :, 2]

        total_pixels = int(r.size)
        if total_pixels == 0:
            return {
                "tool": "water_coverage",
                "status": "error",
                "reason": "Image has 0 pixels",
                "water_percentage": 0.0,
                "total_pixels": 0,
                "water_pixels": 0,
                "caveat": "Empty image.",
            }

        # Adaptive threshold based on image's blue channel statistics
        b_mean = float(np.mean(b))
        b_std = float(np.std(b))
        # Water bodies in RGB are typically deep/bright blue relative to red & green
        # and exceed average blue intensity in non-water environments
        intensity_thresh = max(40.0, b_mean + 0.3 * b_std)

        water_mask = (b > r * 1.12) & (b > g * 1.08) & (b > intensity_thresh)
        water_pixels = int(np.sum(water_mask))
        water_pct = round((water_pixels / total_pixels) * 100.0, 2)

        return {
            "tool": "water_coverage",
            "status": "success",
            "method": "rgb_blue_dominance_heuristic",
            "water_percentage": water_pct,
            "total_pixels": total_pixels,
            "water_pixels": water_pixels,
            "caveat": "No NIR band available. This is a coarse RGB approximation, not a validated NDWI water index.",
        }

    except Exception as e:
        logger.exception("Error computing water coverage")
        return {
            "tool": "water_coverage",
            "status": "unavailable",
            "reason": f"Water coverage computation failed: {str(e)}",
            "water_percentage": 0.0,
            "total_pixels": 0,
            "water_pixels": 0,
            "caveat": "Computation unavailable.",
        }
