"""
Converts BigEarthNet.txt annotations into UnifiedRecord JSONL.

IMPORTANT: field names below (`s1_image_id`, `s2_image_id`, `caption`,
`qa_pairs`, `referring_expressions`) are illustrative, based on the
dataset paper's description (captions + VQA pairs + referring-expression
bounding boxes over co-registered Sentinel-1/Sentinel-2 pairs). Verify
the exact file format and field names against the real files downloaded
from txt.bigearth.net before running this at scale, and adjust the
parsing block below accordingly.
"""

import json
import argparse
from pathlib import Path
from data.converters.common import UnifiedRecord, write_jsonl


def convert(annotations_path: str, image_root: str, out_path: str) -> None:
    records = []
    with open(annotations_path) as f:
        raw_entries = json.load(f)  # TODO: confirm actual file format (json/parquet/csv)

    for entry in raw_entries:
        s1_path = str(Path(image_root) / entry["s1_image_id"])  # SAR
        s2_path = str(Path(image_root) / entry["s2_image_id"])  # optical

        # 1. Caption -> phrase as a VQA "describe this scene" example
        if entry.get("caption"):
            records.append(UnifiedRecord(
                image_paths=[s2_path],
                modality=["optical"],
                query="Describe the land-cover and major features visible in this image.",
                answer=entry["caption"],
                task_type="vqa",
            ))

        # 2. Direct VQA pairs
        for qa in entry.get("qa_pairs", []):
            records.append(UnifiedRecord(
                image_paths=[s2_path],
                modality=["optical"],
                query=qa["question"],
                answer=qa["answer"],
                task_type="vqa",
            ))

        # 3. Referring expressions -> grounding
        for ref in entry.get("referring_expressions", []):
            records.append(UnifiedRecord(
                image_paths=[s2_path],
                modality=["optical"],
                query=ref["expression"],
                answer=ref["expression"],
                bbox=ref["bbox"],
                task_type="grounding",
            ))

        # 4. Co-registered S1+S2 pair -> synthetic cross-modal fusion example
        if entry.get("caption"):
            records.append(UnifiedRecord(
                image_paths=[s2_path, s1_path],
                modality=["optical", "sar"],
                query="Using the optical and SAR images together, describe this scene.",
                answer=entry["caption"],
                task_type="cross_modal_fusion",
            ))

    write_jsonl(records, out_path)
    print(f"Wrote {len(records)} records to {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--annotations", required=True)
    parser.add_argument("--image-root", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    convert(args.annotations, args.image_root, args.out)
