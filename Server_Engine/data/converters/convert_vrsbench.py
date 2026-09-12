"""
Converts VRSBench into UnifiedRecord JSONL. VRSBench covers captioning,
VQA, and referring-expression grounding on single optical images — used
here mainly as a held-out evaluation split, and optionally as extra
training signal for Adapter A.

IMPORTANT: field names are illustrative — verify against the actual
downloaded VRSBench release format before running at scale.
"""

import json
import argparse
from pathlib import Path
from data.converters.common import UnifiedRecord, write_jsonl


def convert(annotations_path: str, image_root: str, out_path: str) -> None:
    records = []
    with open(annotations_path) as f:
        raw_entries = json.load(f)  # TODO: confirm actual file format

    for entry in raw_entries:
        image_path = str(Path(image_root) / entry["image_id"])

        if entry.get("caption"):
            records.append(UnifiedRecord(
                image_paths=[image_path],
                modality=["optical"],
                query="Describe this image.",
                answer=entry["caption"],
                task_type="vqa",
            ))

        for qa in entry.get("vqa_pairs", []):
            records.append(UnifiedRecord(
                image_paths=[image_path],
                modality=["optical"],
                query=qa["question"],
                answer=qa["answer"],
                task_type="vqa",
            ))

        for ref in entry.get("grounding", []):
            records.append(UnifiedRecord(
                image_paths=[image_path],
                modality=["optical"],
                query=ref["expression"],
                answer=ref["expression"],
                bbox=ref["bbox"],
                task_type="grounding",
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
