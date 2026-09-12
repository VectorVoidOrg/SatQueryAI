"""
Converts CDVQA into UnifiedRecord JSONL — the primary training and
evaluation data for Adapter B (bi-temporal change-VQA).

IMPORTANT: field names are illustrative — verify against the actual
downloaded CDVQA release format before running at scale.
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
        t1_path = str(Path(image_root) / entry["t1_image_id"])
        t2_path = str(Path(image_root) / entry["t2_image_id"])

        for qa in entry.get("qa_pairs", []):
            records.append(UnifiedRecord(
                image_paths=[t1_path, t2_path],
                modality=["optical", "optical"],
                timestamps=[entry["t1_date"], entry["t2_date"]],
                query=qa["question"],
                answer=qa["answer"],
                task_type="change_vqa",
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
