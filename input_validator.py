from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import numpy as np
from PIL import Image

try:
    import rasterio
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False


@dataclass
@dataclass
class ImageMetadata:
    filename: str
    is_valid: bool
    format: str
    modality: str  # 'optical', 'sar', 'multispectral'
    bands: int
    shape: tuple  # (height, width)
    crs: Optional[str] = None
    bounds: Optional[Dict[str, float]] = None
    dtype: str = "uint8"
    error: Optional[str] = None


def inspect_image(file_path: str) -> ImageMetadata:
    path = Path(file_path)
    if not path.exists():
        return ImageMetadata(
            filename=path.name,
            is_valid=False,
            format="unknown",
            modality="unknown",
            bands=0,
            shape=(0, 0),
            error="File does not exist."
        )

    ext = path.suffix.lower()

    if ext in [".tif", ".tiff"] and HAS_RASTERIO:
        try:
            with rasterio.open(file_path) as src:
                count = src.count
                height, width = src.height, src.width
                crs_str = str(src.crs) if src.crs else None
                b = src.bounds if src.crs else None
                bounds_dict = {
                    "left": b.left, "bottom": b.bottom,
                    "right": b.right, "top": b.top
                } if b else None
                dtype_str = str(src.dtypes[0])

                # Modality heuristic for GeoTIFF
                if count in [1, 2]:
                    modality = "sar"
                elif count == 3:
                    modality = "optical"
                elif count >= 4:
                    modality = "multispectral"
                else:
                    modality = "unknown"

                return ImageMetadata(
                    filename=path.name,
                    is_valid=True,
                    format="geotiff",
                    modality=modality,
                    bands=count,
                    shape=(height, width),
                    crs=crs_str,
                    bounds=bounds_dict,
                    dtype=dtype_str
                )
        except Exception as e:
            return ImageMetadata(
                filename=path.name,
                is_valid=False,
                format="geotiff",
                modality="unknown",
                bands=0,
                shape=(0, 0),
                error=f"GeoTIFF read error: {str(e)}"
            )

    # Standard image formats (PNG, JPG, JPEG)
    try:
        with Image.open(file_path) as img:
            mode = img.mode
            width, height = img.size
            bands = len(img.getbands())

            if mode in ["L", "1"] or bands == 1:
                modality = "sar"
            elif bands == 3:
                modality = "optical"
            elif bands >= 4:
                modality = "multispectral"
            else:
                modality = "optical"

            return ImageMetadata(
                filename=path.name,
                is_valid=True,
                format=ext.replace(".", "").lower(),
                modality=modality,
                bands=bands,
                shape=(height, width),
                dtype=str(img.mode)
            )
    except Exception as e:
        return ImageMetadata(
            filename=path.name,
            is_valid=False,
            format="unknown",
            modality="unknown",
            bands=0,
            shape=(0, 0),
            error=f"Image read error: {str(e)}"
        )


def validate_input_pair(images: List[str]) -> Dict[str, Any]:
    if not images:
        return {"valid": False, "pair_type": "none", "error": "No images provided."}

    metas = [inspect_image(p) for p in images]

    for m in metas:
        if not m.is_valid:
            return {"valid": False, "pair_type": "invalid", "error": f"Invalid image {m.filename}: {m.error}"}

    if len(metas) == 1:
        return {
            "valid": True,
            "pair_type": "single",
            "metadata": [metas[0]],
            "description": f"Single {metas[0].modality.upper()} image ({metas[0].shape[1]}x{metas[0].shape[0]})"
        }

    if len(metas) == 2:
        m1, m2 = metas[0], metas[1]
        modalities = {m1.modality, m2.modality}

        if "sar" in modalities and "optical" in modalities:
            pair_type = "cross_modal"
            desc = "Cross-modal Optical + SAR pair"
        elif m1.modality == m2.modality:
            pair_type = "bi_temporal"
            desc = f"Bi-temporal {m1.modality.upper()} pair (Time 1 vs Time 2)"
        else:
            pair_type = "dual_image"
            desc = f"Dual image pair ({m1.modality.upper()} + {m2.modality.upper()})"

        return {
            "valid": True,
            "pair_type": pair_type,
            "metadata": metas,
            "description": desc
        }

    return {"valid": False, "pair_type": "invalid", "error": "Maximum 2 images supported per query."}


if __name__ == "__main__":
    # Quick test
    test_img = Image.new("RGB", (256, 256), color="blue")
    test_img.save("test_opt.png")

    test_sar = Image.new("L", (256, 256), color=128)
    test_sar.save("test_sar.png")

    res = validate_input_pair(["test_opt.png", "test_sar.png"])
    print("Pair validation:", res["pair_type"], "| Description:", res["description"])

    # Clean up test files
    Path("test_opt.png").unlink()
    Path("test_sar.png").unlink()
