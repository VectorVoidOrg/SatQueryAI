"""
Converts raw model output (a binary mask or a pixel bounding box) into
EPSG:4326 GeoJSON, simplified for lightweight transport over SSE to the
Leaflet frontend.
"""

import numpy as np
from shapely.geometry import shape, mapping, box
from shapely.ops import transform as shp_transform
from rasterio import features, Affine
import pyproj


def affine_from_list(coeffs: list[float]) -> Affine:
    """ImageInput.transform is stored as a flat [a,b,c,d,e,f] list so it
    survives JSON serialization across the API boundary; convert back to
    a rasterio Affine right before use."""
    return Affine(*coeffs)


def mask_to_geojson(
    mask: np.ndarray,
    transform_coeffs: list[float],
    source_crs: str,
    simplify_tolerance: float = 0.0001,
) -> dict:
    """mask: 2D binary array (1 = feature, 0 = background)."""
    affine_transform = affine_from_list(transform_coeffs)
    shapes_gen = features.shapes(
        mask.astype(np.uint8), mask=mask.astype(bool), transform=affine_transform
    )
    project = pyproj.Transformer.from_crs(source_crs, "EPSG:4326", always_xy=True).transform

    polygons = []
    for geom, value in shapes_gen:
        if value != 1:
            continue
        poly = shape(geom)
        poly_wgs84 = shp_transform(project, poly)
        poly_simplified = poly_wgs84.simplify(simplify_tolerance, preserve_topology=True)
        polygons.append(mapping(poly_simplified))

    return {
        "type": "FeatureCollection",
        "features": [{"type": "Feature", "geometry": g, "properties": {}} for g in polygons],
    }


def bbox_to_geojson(bbox_pixels: tuple, transform_coeffs: list[float], source_crs: str) -> dict:
    """bbox_pixels: (col_min, row_min, col_max, row_max) in pixel coords,
    as typically returned by a grounding model."""
    affine_transform = affine_from_list(transform_coeffs)
    x_min, y_min = affine_transform * (bbox_pixels[0], bbox_pixels[1])
    x_max, y_max = affine_transform * (bbox_pixels[2], bbox_pixels[3])
    geom = box(min(x_min, x_max), min(y_min, y_max), max(x_min, x_max), max(y_min, y_max))

    project = pyproj.Transformer.from_crs(source_crs, "EPSG:4326", always_xy=True).transform
    geom_wgs84 = shp_transform(project, geom)

    return {
        "type": "FeatureCollection",
        "features": [{"type": "Feature", "geometry": mapping(geom_wgs84), "properties": {}}],
    }
