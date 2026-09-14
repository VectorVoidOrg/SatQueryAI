"""dev_stub_server.py — DELETE BEFORE SUBMISSION.

Runs the REAL backend (evidence, report, UI, all guardrails) with the model
weights faked. Everything computed at request time is real:
  * radiometric differencing, threshold, regions, bounding boxes
  * overlay PNG drawn on the actual rendered frame
  * GeoJSON, model-vs-pixel cross-check
  * per-analysis HTML/JSON report

Only the VLM answer is canned (labelled as STUB in the text so it's obvious).

Usage:
    cd <repo-root>
    python dev_stub_server.py
    # → http://localhost:8000

To point the Next.js frontend at it:
    cd frontend && BACKEND_URL=http://127.0.0.1:8000 npm run dev
"""
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = REPO_ROOT / "backend"
TESTS_DIR = BACKEND_DIR / "tests"

sys.path.insert(0, str(TESTS_DIR))
import stub_env          # noqa: E402
stub_env.install()

sys.path.insert(0, str(BACKEND_DIR))
os.chdir(str(BACKEND_DIR))

# The stub answer starts with "Yes" so model-vs-pixel cross-check can run for real.
os.environ["FAKE_ANSWER"] = (
    "Yes, the built-up area expanded: new rooftops and a cleared pad appear in the "
    "eastern part of the scene. [STUB MODEL - no GPU or adapter weights; "
    "the overlay and report are computed on real pixels, this sentence is not.]"
)
os.environ["FAKE_PROBS"] = "0.91,0.87,0.94,0.83,0.88"

import uvicorn          # noqa: E402
import app              # noqa: E402

if __name__ == "__main__":
    print("=" * 70)
    print("SatQuery AI — DEV STUB SERVER")
    print("Model:   STUBBED (no GPU needed)")
    print("Evidence/Report/UI:  REAL code, real pixels")
    print(f"Demo images: {REPO_ROOT / 'demo_images'}")
    print("=" * 70)
    print()
    print("Frontend dev server:")
    print("  cd frontend")
    print("  BACKEND_URL=http://127.0.0.1:8000 npm run dev")
    print()
    print("Or set in frontend/.env.local:")
    print("  BACKEND_URL=http://127.0.0.1:8000")
    print()
    uvicorn.run(app.app, host="0.0.0.0", port=8000, log_level="info")
