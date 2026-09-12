"""
Runs the full Engine (not just the raw model) against held-out splits of
VRSBench / RSVQA / CDVQA and reports accuracy. Also intended to run the
same queries through the un-adapted base model for the
adapted-vs-generic comparison the build guide recommends having ready.
"""

import argparse
from data.converters.common import read_jsonl
from core.schemas import EngineRequest, ImageInput


def normalized_match(pred: str, gold: str) -> bool:
    return pred.strip().lower() == gold.strip().lower()


def run_benchmark(engine, jsonl_path: str) -> dict:
    records = read_jsonl(jsonl_path)
    correct, n, skipped = 0, 0, 0

    for r in records:
        try:
            request = EngineRequest(
                query=r.query,
                images=[
                    ImageInput(path=p, modality=m, timestamp=t, crs="EPSG:4326", bounds=(0, 0, 0, 0))
                    for p, m, t in zip(
                        r.image_paths, r.modality, r.timestamps or [None] * len(r.image_paths)
                    )
                ],
            )
            response = engine.run(request)
        except ValueError:
            skipped += 1
            continue

        n += 1
        if r.task_type in ("vqa", "change_vqa") and normalized_match(response.answer, r.answer):
            correct += 1
        # NOTE: grounding accuracy needs IoU between predicted and gold
        # bbox in a shared coordinate frame — add once real geo-referenced
        # eval images are wired in; skipped here for the scaffold.

    return {
        "n_examples": n,
        "n_skipped": skipped,
        "accuracy": correct / n if n else 0.0,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    args = parser.parse_args()
    print("Construct a real Engine with trained adapters, then call:")
    print("  run_benchmark(engine, args.data)")
