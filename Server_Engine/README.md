# SatQuery AI — Model Backend (Server_Engine)

Scaffold for the model backend engine only — no UI. Matches the
architecture and build guide discussed earlier.

## Directory map

```
core/          schemas.py (I/O contract), router.py, intent_parser.py,
               orchestrator.py (the agentic controller), vectorizer.py
preprocessing/ sar.py, optical.py — sensor-agnostic, config-driven
data/          converters/ — one script per dataset -> unified JSONL
models/        base.py (model+LoRA loading), train.py (fine-tuning loop)
eval/          benchmark.py — run held-out splits through the full engine
tests/         test_engine.py — orchestrator logic, no GPU required
api/           main.py — thin FastAPI + SSE wrapper
```

## Status of each piece

- **schemas / router / orchestrator / vectorizer / intent_parser** —
  fully implemented, logic-tested (see `tests/`). No external model
  dependency to exercise the control flow.
- **preprocessing/sar.py, optical.py** — implemented; calibration
  constants are config objects (`SARConfig`), not literals, specifically
  so recalibrating for RISAT/Cartosat is a config change.
- **data/converters/** — implemented against the *illustrated* field
  names from each dataset's paper/documentation. Each file has a
  `TODO` comment: verify actual field names once you've downloaded the
  real files, before running at scale.
- **models/base.py, train.py** — implemented, untested here (needs GPU +
  real weights). Run once per adapter.
- **eval/benchmark.py** — implemented for VQA/change-VQA exact-match
  accuracy; grounding IoU scoring is a TODO once real geo-referenced
  eval images are wired in.
- **api/main.py** — minimal SSE wrapper; inference runs via
  `asyncio.to_thread` so it never blocks the event loop.

## Running the tests (no GPU needed)

```bash
pip install pydantic pytest rasterio shapely pyproj scipy
cd Server_Engine
pytest tests/test_engine.py -v
```

## Order to actually build in

1. `pytest tests/test_engine.py` — confirm orchestration logic first,
   with stub adapters, before touching real model weights.
2. Run each `data/converters/convert_*.py` against real downloaded
   data, fixing field names per the TODOs.
3. `python -m models.train --data data/unified/adapter_a_train.jsonl --out models/adapter_a`
4. Repeat for Adapter B on the CDVQA-derived JSONL.
5. Wire real adapters into `api/main.py`, replacing the `engine = None` stub.
6. `python -m eval.benchmark --data data/unified/adapter_a_test.jsonl`
   against held-out VRSBench/RSVQA/CDVQA splits, record the numbers.
