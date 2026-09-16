"""
tests/stub_env.py

Installs a lightweight fake for the Gemini API call into app.py so
that the REAL SatQuery AI backend can be imported and exercised over
real HTTP (FastAPI TestClient) on a machine without a Gemini API key.

Nothing here mocks the routing, validation, guardrail, trace or evidence
logic - app.py runs its actual production code paths. Only the Gemini API
call is replaced with a fake that returns a canned answer.

Set env vars before importing to control what the fake emits:
    FAKE_ANSWER  - the decoded answer string
"""
import os
import sys
import types
from pathlib import Path


def install():
    """
    Monkeypatches app._gemini_raw_call so that AgenticModelRuntime.predict
    gets a canned answer instead of calling the real Gemini API.
    """
    # Ensure backend/ is on sys.path
    backend_dir = str(Path(__file__).resolve().parent.parent)
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    # Also stub rasterio for tests that don't use GeoTIFF
    if "rasterio" not in sys.modules:
        rasterio = types.ModuleType("rasterio")
        rasterio.open = lambda *a, **k: (_ for _ in ()).throw(
            RuntimeError("rasterio stub: tests use PNG inputs only"))
        enums = types.ModuleType("rasterio.enums")
        enums.Resampling = types.SimpleNamespace(bilinear="bilinear")
        rasterio.enums = enums
        sys.modules["rasterio"] = rasterio
        sys.modules["rasterio.enums"] = enums

    # Now import app (rasterio is stubbed, no real Gemini key needed)
    import app as app_module

    def _fake_raw_call(api_key, model, parts):
        answer = os.environ.get("FAKE_ANSWER", "stub answer from fake Gemini")
        return {
            "candidates": [{
                "content": {
                    "role": "model",
                    "parts": [{"text": answer}]
                }
            }]
        }

    app_module._gemini_raw_call = _fake_raw_call

    return {"_fake_raw_call": _fake_raw_call}
