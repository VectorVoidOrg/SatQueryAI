"""
Optical/multispectral preprocessing. Simpler than SAR — mainly band
selection and reflectance normalization — but kept as its own module so
the ingestion pipeline treats optical and SAR uniformly (same call
shape, same return type) regardless of internal differences.
"""

import numpy as np
import rasterio


def preprocess_optical(path: str, bands: tuple[int, ...] = (1, 2, 3), reflectance_max: float = 10000.0) -> np.ndarray:
    """
    Reads the given band indices (1-indexed, rasterio convention) from a
    GeoTIFF and returns a normalized [0,1] array, channel-last.

    reflectance_max=10000.0 matches Sentinel-2 L2A surface-reflectance
    scaling; adjust per sensor (Cartosat-2S digital-number range differs
    — verify against actual product documentation before final eval).
    """
    with rasterio.open(path) as src:
        array = src.read(bands).astype(np.float32)  # (bands, H, W)

    array = np.clip(array, 0, reflectance_max) / reflectance_max
    return np.transpose(array, (1, 2, 0))  # -> (H, W, bands)
