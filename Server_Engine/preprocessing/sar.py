"""
SAR preprocessing: dB conversion, speckle reduction, normalization.

Every calibration constant lives in SARConfig, not as a literal in the
functions below. This is deliberate: the training data (Sentinel-1, via
BigEarthNet.txt) and the final ISRO/SAC evaluation set (RISAT) are
different sensors with different backscatter characteristics. Swapping
sensors should mean swapping a config, not rewriting this file.
"""

from dataclasses import dataclass
import numpy as np
import rasterio
from scipy.ndimage import median_filter


@dataclass
class SARConfig:
    db_min: float = -25.0
    db_max: float = 0.0
    speckle_kernel_size: int = 5
    # Set True only if the source raster is already linear-scale
    # backscatter (typical for raw Sentinel-1 GRD); set False if the
    # source is already in dB (varies by provider/sensor — verify before
    # running on a new sensor).
    input_is_linear: bool = True


SENTINEL1_CONFIG = SARConfig(db_min=-25.0, db_max=0.0, speckle_kernel_size=5, input_is_linear=True)

# TODO: calibrate against real RISAT sample data before final evaluation.
# Values below are a starting point, not verified against RISAT specs.
RISAT_CONFIG = SARConfig(db_min=-25.0, db_max=0.0, speckle_kernel_size=5, input_is_linear=True)


def linear_to_db(array: np.ndarray) -> np.ndarray:
    array = np.clip(array, 1e-10, None)  # avoid log(0)
    return 10 * np.log10(array)


def speckle_filter(array: np.ndarray, kernel_size: int) -> np.ndarray:
    return median_filter(array, size=kernel_size)


def normalize(array: np.ndarray, db_min: float, db_max: float) -> np.ndarray:
    clipped = np.clip(array, db_min, db_max)
    return (clipped - db_min) / (db_max - db_min)


def preprocess_sar(path: str, config: SARConfig = SENTINEL1_CONFIG) -> np.ndarray:
    """Reads a SAR GeoTIFF band and returns a normalized [0,1] array
    ready for the vision encoder."""
    with rasterio.open(path) as src:
        array = src.read(1).astype(np.float32)

    if config.input_is_linear:
        array = linear_to_db(array)

    array = speckle_filter(array, config.speckle_kernel_size)
    array = normalize(array, config.db_min, config.db_max)
    return array
