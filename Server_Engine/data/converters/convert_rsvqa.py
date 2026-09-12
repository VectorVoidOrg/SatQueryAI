"""
Converts RSVQA into UnifiedRecord JSONL — used as a held-out VQA
evaluation split (and optionally extra training signal for Adapter A).

IMPORTANT: field names are illustrative — verify against the actual
downloaded RSVQA release format before running at scale.
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
        records.append(UnifiedRecord(
            image_paths=[image_path],
            modality=["optical"],
            query=entry["question"],
            answer=entry["answer"],
            task_type="vqa",
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
