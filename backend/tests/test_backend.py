"""
tests/test_backend.py

Runs the REAL SatQuery AI backend over real HTTP (FastAPI TestClient)
against the fake Gemini runtime, and prints actual JSON responses.

Usage:  python tests/test_backend.py
"""
import os
import sys
import json
import shutil
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tests"))

import stub_env
STUBS = stub_env.install()

import numpy as np
from PIL import Image

sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from fastapi.testclient import TestClient   # noqa: E402
import app as app_module                    # noqa: E402

TMP = Path(tempfile.mkdtemp(prefix="satquery_test_"))


def make_png(name, seed, size=96):
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 255, (size, size, 3), dtype=np.uint8)
    arr[size // 4: size // 2, size // 4: size // 2] = [30, 90, 200]
    p = TMP / name
    Image.fromarray(arr).save(p)
    return p


IMG_A = make_png("scene_a.png", seed=1)
IMG_B = make_png("scene_b.png", seed=2)
IMG_A_COPY = TMP / "scene_a_copy.png"
shutil.copy(IMG_A, IMG_A_COPY)
IMG_SAR = make_png("sar_a.png", seed=3)

client = TestClient(app_module.app)

PASS, FAIL = [], []


def show(title, resp):
    print("\n" + "=" * 78)
    print(f"### {title}")
    print(f"HTTP {resp.status_code}")
    try:
        print(json.dumps(resp.json(), indent=2))
    except Exception:
        print(resp.text)


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(f"  -> [{'PASS' if cond else 'FAIL'}] {name} {detail}")


with client:
    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# HEALTH CHECK")
    print("#" * 78)
    r = client.get("/health")
    show("GET /health", r)
    check("/health returns ready", r.status_code == 200 and r.json().get("status") == "ready")
    check("/health returns gemini model", "gemini" in r.json().get("base_model", "").lower())

    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# TASK 2 - routing")
    print("#" * 78)

    os.environ["FAKE_ANSWER"] = ("Built-up area increased: the AFTER image shows new "
                                 "rooftops and cleared plots in the north-west quadrant.")

    # (a) 2 optical, DIFFERENT timestamps
    r = client.post("/analyze",
                    data={"query": "What changed between these two dates?",
                          "modalities": "optical,optical",
                          "timestamps": "2023-01-01,2024-06-15"},
                    files=[("files", ("t1.png", IMG_A.read_bytes(), "image/png")),
                           ("files", ("t2.png", IMG_B.read_bytes(), "image/png"))])
    show("TASK 2 (a) 2 optical + distinct timestamps -> expect 200 change_vqa", r)
    j = r.json()
    check("(a) status 200", r.status_code == 200)
    check("(a) task_intent == change_vqa", j.get("task_intent") == "change_vqa")
    trace_ic = [t for t in j.get("auditable_execution_trace", []) if t.get("tool") == "agentic_intent_classifier"]
    check("(a) trace has 'basis'", trace_ic and "basis" in trace_ic[0], trace_ic[0].get("basis") if trace_ic else "")
    reg = [t for t in j.get("auditable_execution_trace", []) if t.get("tool") == "specialist_registry"]
    check("(a) routed to gemini_vlm", reg and reg[0].get("active_adapter") == "gemini_vlm", str(reg))
    check("(a) timestamps reach image metadata",
          [i.get("timestamp") for i in j.get("inputs", [])] == ["2023-01-01", "2024-06-15"])

    # (b) 1 optical + 1 SAR, NO timestamps
    r = client.post("/analyze",
                    data={"query": "Use the optical and SAR images together to identify built-up and water-covered regions.",
                          "modalities": "optical,sar",
                          "timestamps": ""},
                    files=[("files", ("opt.png", IMG_A.read_bytes(), "image/png")),
                           ("files", ("sar.png", IMG_SAR.read_bytes(), "image/png"))])
    show("TASK 2 (b) optical + SAR, no timestamps -> expect 200 cross_modal", r)
    j = r.json()
    check("(b) status 200", r.status_code == 200)
    check("(b) task_intent == cross_modal", j.get("task_intent") == "cross_modal")
    trace_ic = [t for t in j.get("auditable_execution_trace", []) if t.get("tool") == "agentic_intent_classifier"]
    check("(b) trace basis mentions SAR pair", trace_ic and "SAR" in trace_ic[0].get("basis", ""), trace_ic[0].get("basis") if trace_ic else "")
    pre = [t for t in j.get("auditable_execution_trace", []) if t.get("tool") == "preprocessor"]
    check("(b) SAR dB preprocessor selected", pre and pre[0].get("rendering") == "multisensor_sar_db_stretch", str(pre))

    # (c) 2 optical, NO timestamps, NO sar -> must 400
    r = client.post("/analyze",
                    data={"query": "Tell me about these images.",
                          "modalities": "optical,optical",
                          "timestamps": ""},
                    files=[("files", ("a.png", IMG_A.read_bytes(), "image/png")),
                           ("files", ("b.png", IMG_B.read_bytes(), "image/png"))])
    show("TASK 2 (c) 2 optical, no timestamps, no SAR -> expect 400", r)
    check("(c) status 400", r.status_code == 400)
    check("(c) message asks to clarify", "Ambiguous two-image intent" in r.json().get("detail", ""))

    # (d) 2 optical, IDENTICAL timestamps -> must 400
    r = client.post("/analyze",
                    data={"query": "What changed?", "modalities": "optical,optical",
                          "timestamps": "2024-05-05,2024-05-05"},
                    files=[("files", ("a.png", IMG_A.read_bytes(), "image/png")),
                           ("files", ("b.png", IMG_B.read_bytes(), "image/png"))])
    show("TASK 2 (d) 2 optical, SAME timestamp -> expect 400", r)
    check("(d) status 400", r.status_code == 400)
    check("(d) reason names identical timestamps", "both timestamps identical" in r.json().get("detail", ""))

    # (e) identical files + distinct timestamps -> guardrail bypasses VLM
    r = client.post("/analyze",
                    data={"query": "Has the built-up area increased, decreased, or remained unchanged?",
                          "modalities": "optical,optical",
                          "timestamps": "2023-01-01,2024-06-15"},
                    files=[("files", ("same.png", IMG_A.read_bytes(), "image/png")),
                           ("files", ("same2.png", IMG_A_COPY.read_bytes(), "image/png"))])
    show("TASK 2 (e) byte-identical pair -> guardrail, VLM bypassed", r)
    j = r.json()
    check("(e) status 200", r.status_code == 200)
    check("(e) guardrail fired", j["auditable_execution_trace"][0].get("status") == "identical_inputs_detected")
    check("(e) confidence present + sourced", j.get("confidence") == 1.0 and j.get("confidence_source") == "deterministic_byte_equality_guardrail")

    # (f) positional timestamp alignment regression: ",2024-06-15"
    r = client.post("/analyze",
                    data={"query": "What changed?", "modalities": "optical,optical",
                          "timestamps": ",2024-06-15"},
                    files=[("files", ("a.png", IMG_A.read_bytes(), "image/png")),
                           ("files", ("b.png", IMG_B.read_bytes(), "image/png"))])
    show("TASK 2 (f) leading-empty timestamp ',2024-06-15' -> expect 400 (no misalignment)", r)
    check("(f) status 400, empty ts did not shift onto file 0", r.status_code == 400)

    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# TASK 4 - cross-modal modality validation")
    print("#" * 78)

    r = client.post("/analyze",
                    data={"query": "Fuse these.", "modalities": "sar,sar", "timestamps": ""},
                    files=[("files", ("s1.png", IMG_SAR.read_bytes(), "image/png")),
                           ("files", ("s2.png", IMG_SAR.read_bytes(), "image/png"))])
    show("TASK 4 two SAR images -> expect 400", r)
    check("T4 status 400", r.status_code == 400)
    check("T4 exact message", r.json().get("detail", "").startswith(
        "Cross-modal fusion requires exactly one optical and one SAR image"), r.json().get("detail"))

    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# TASK 3 - confidence is heuristic, not constant")
    print("#" * 78)

    # Gemini uses heuristic confidence based on answer length + task
    os.environ["FAKE_ANSWER"] = "Short answer."
    r = client.post("/analyze",
                    data={"query": "What is this?", "modalities": "optical"},
                    files=[("files", ("a.png", IMG_A.read_bytes(), "image/png"))])
    j_short = r.json()
    short_conf = j_short.get("confidence", 0)

    os.environ["FAKE_ANSWER"] = ("This is a very detailed and comprehensive answer that describes "
                                  "many aspects of the satellite imagery including land cover, "
                                  "infrastructure, vegetation patterns, water bodies, and urban "
                                  "development trends visible in the scene.")
    r = client.post("/analyze",
                    data={"query": "Describe this image in detail.", "modalities": "optical"},
                    files=[("files", ("a.png", IMG_A.read_bytes(), "image/png"))])
    j_long = r.json()
    long_conf = j_long.get("confidence", 0)

    print(f"\n  short answer confidence: {short_conf}")
    print(f"  long answer confidence:  {long_conf}")
    check("T3 short answer has confidence", short_conf > 0)
    check("T3 long answer has confidence", long_conf > 0)
    check("T3 confidence_source is heuristic", j_long.get("confidence_source") == "heuristic_estimate")
    check("T3 longer answer gets higher confidence", long_conf > short_conf)

    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# SINGLE-IMAGE ROUTING (regression check)")
    print("#" * 78)

    os.environ["FAKE_ANSWER"] = "The scene shows dense urban area with buildings and roads."
    r = client.post("/analyze",
                    data={"query": "Describe the land-cover and major objects visible in this image.",
                          "modalities": "optical"},
                    files=[("files", ("a.png", IMG_A.read_bytes(), "image/png"))])
    show("single image, 'describe' -> expect caption", r)
    j = r.json()
    check("single 'describe' -> caption", j.get("task_intent") == "caption")
    check("single image -> gemini_vlm",
          [t for t in j["auditable_execution_trace"] if t["tool"] == "specialist_registry"][0].get("active_adapter") == "gemini_vlm")

    r = client.post("/analyze",
                    data={"query": "How many swimming pools are visible?", "modalities": "optical"},
                    files=[("files", ("a.png", IMG_A.read_bytes(), "image/png"))])
    show("single image, plain question -> expect vqa", r)
    check("single question -> vqa", r.json().get("task_intent") == "vqa")

    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# FILE-COUNT GUARDRAIL (regression check)")
    print("#" * 78)
    r = client.post("/analyze",
                    data={"query": "x", "modalities": "optical,optical,optical"},
                    files=[("files", ("a.png", IMG_A.read_bytes(), "image/png"))] * 3)
    show("3 files -> expect 400", r)
    check("3 files rejected", r.status_code == 400)

    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# INDEX PAGE")
    print("#" * 78)
    r = client.get("/")
    show("GET /", r)
    check("GET / returns HTML", r.status_code == 200 and "SatQuery AI" in r.text)
    check("UI mentions Gemini", "Gemini" in r.text)

# ------------------------------------------------------------------
shutil.rmtree(TMP, ignore_errors=True)

print("\n" + "=" * 78)
print(f"RESULTS:  {len(PASS)} passed,  {len(FAIL)} failed")
if FAIL:
    print("FAILED:")
    for f in FAIL:
        print("   -", f)
print("=" * 78)
sys.exit(1 if FAIL else 0)
