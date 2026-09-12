"""
Shared utilities for all dataset converters. Every converter must
produce records in this exact schema so the training loop and benchmark
runner never need dataset-specific branching.
"""

from pydantic import BaseModel
from typing import Optional


class UnifiedRecord(BaseModel):
    image_paths: list[str]              # 1 path = single-image task, 2 = fusion/change
    modality: list[str]                  # e.g. ["optical"] or ["optical", "sar"]
    timestamps: Optional[list[str]] = None   # required for change_vqa records
    query: str
    answer: str
    bbox: Optional[list[float]] = None   # [x_min, y_min, x_max, y_max] pixels, if grounding
    task_type: str                       # "vqa" | "grounding" | "cross_modal_fusion" | "change_vqa"


def write_jsonl(records: list[UnifiedRecord], out_path: str) -> None:
    with open(out_path, "w") as f:
        for r in records:
            f.write(r.model_dump_json() + "\n")


def read_jsonl(path: str) -> list[UnifiedRecord]:
    records = []
    with open(path) as f:
        for line in f:
            if line.strip():
                records.append(UnifiedRecord.model_validate_json(line))
    return records
