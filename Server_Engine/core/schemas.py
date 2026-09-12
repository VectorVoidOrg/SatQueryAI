"""
The engine's I/O contract. Lock this early and change it rarely — every
other module (router, orchestrator, vectorizer, API layer, tests) is
built against these shapes.
"""

from pydantic import BaseModel
from enum import Enum
from typing import Optional


class TaskType(str, Enum):
    VQA = "vqa"
    GROUNDING = "grounding"
    CROSS_MODAL_FUSION = "cross_modal_fusion"
    CHANGE_VQA = "change_vqa"


class ImageInput(BaseModel):
    path: str
    modality: str                       # "optical" | "sar"
    timestamp: Optional[str] = None     # required for change_vqa inputs
    crs: str                            # e.g. "EPSG:32643"
    bounds: tuple[float, float, float, float]   # (minx, miny, maxx, maxy) in source CRS
    transform: Optional[list[float]] = None     # rasterio Affine as [a, b, c, d, e, f]


class EngineRequest(BaseModel):
    query: str
    images: list[ImageInput]            # 1 = single-image task, 2 = fusion or change


class TaskIntent(BaseModel):
    task_type: TaskType
    target_class: Optional[str] = None
    temporal_context: Optional[str] = None


class Evidence(BaseModel):
    geojson: dict
    confidence: float
    iou_reference: Optional[float] = None   # from held-out val split, not computed live


class EngineResponse(BaseModel):
    answer: str
    task_intent: TaskIntent
    adapter_used: str
    evidence: Optional[Evidence] = None
    inference_ms: float
    trace: list[str]                    # the audit trail judges actually evaluate
