"""
tests/test_backend.py

Runs the REAL satquery_backend/app.py over real HTTP (FastAPI TestClient)
against the stub model runtime, and prints actual JSON responses.

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

# Works both inside the satquery repo (app lives in satquery_backend/)
# and in the standalone backend/ drop (app lives at the root).
BACKEND = ROOT / "satquery_backend" if (ROOT / "satquery_backend" / "app.py").is_file() else ROOT
sys.path.insert(0, str(BACKEND))

# Create dummy adapter dirs so the PeftModel registration paths execute for real.
# SAFETY: never touch a pre-existing artifacts/ tree - if real trained adapters are
# already there we use them as-is and delete nothing on teardown.
ARTIFACTS = BACKEND / "artifacts"
CREATED_DIRS = []
for a in ("adapter_a", "adapter_b"):
    d = ARTIFACTS / a
    if not d.exists():
        d.mkdir(parents=True, exist_ok=True)
        CREATED_DIRS.append(d)

os.chdir(BACKEND)

from fastapi.testclient import TestClient   # noqa: E402
import app as app_module                    # noqa: E402

TMP = Path(tempfile.mkdtemp(prefix="satquery_test_"))


def make_png(name, seed, size=96):
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 255, (size, size, 3), dtype=np.uint8)
    # add structure so it is not pure noise
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
    print("# TASK 1 - processor pixel budget")
    print("#" * 78)
    kw = STUBS["FakeProcessor"].last_init_kwargs
    print(f"AutoProcessor.from_pretrained kwargs actually passed: {kw}")
    check("min_pixels == 64*28*28 (50176)", kw.get("min_pixels") == 64 * 28 * 28, f"got {kw.get('min_pixels')}")
    check("max_pixels == 256*28*28 (200704)", kw.get("max_pixels") == 256 * 28 * 28, f"got {kw.get('max_pixels')}")
    check("max_pixels implies ~448x448", int((256 * 28 * 28) ** 0.5) == 448)

    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# HEALTH CHECK")
    print("#" * 78)
    r = client.get("/health")
    show("GET /health", r)
    check("/health returns ready", r.status_code == 200 and r.json().get("status") == "ready")

    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# TASK 2 - routing")
    print("#" * 78)

    os.environ["FAKE_ANSWER"] = ("Built-up area increased: the AFTER image shows new "
                                 "rooftops and cleared plots in the north-west quadrant.")
    os.environ["FAKE_PROBS"] = "0.92,0.88,0.95,0.81"

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
    check("(a) routed to adapter_b", reg and reg[0].get("active_adapter") == "adapter_b", str(reg))
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
    check("T4 status 400 (was 422)", r.status_code == 400)
    check("T4 exact message", r.json().get("detail", "").startswith(
        "Cross-modal fusion requires exactly one optical and one SAR image"), r.json().get("detail"))

    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# TASK 3 - confidence is computed, not constant")
    print("#" * 78)

    def get_conf(probs, eos_at=None, answer="stub"):
        os.environ["FAKE_PROBS"] = probs
        os.environ["FAKE_ANSWER"] = answer
        if eos_at is None:
            os.environ.pop("FAKE_EOS_AT", None)
        else:
            os.environ["FAKE_EOS_AT"] = str(eos_at)
        r = client.post("/analyze",
                        data={"query": "Describe the land-cover and major objects visible in this image.",
                              "modalities": "optical"},
                        files=[("files", ("a.png", IMG_A.read_bytes(), "image/png"))])
        return r.status_code, r.json()

    for label, probs, expected in [
        ("high-certainty greedy decode", "0.97,0.95,0.98,0.96", None),
        ("low-certainty decode",         "0.21,0.18,0.25,0.19", None),
        ("mixed",                        "0.90,0.30,0.75,0.12", None),
    ]:
        st, j = get_conf(probs, answer=f"answer for {label}")
        p = [float(x) for x in probs.split(",")]
        exp = round(sum(p) / len(p), 4)
        print(f"\n  probs={probs}  ->  confidence={j.get('confidence')}   hand-computed mean={exp}")
        check(f"T3 {label}: confidence == mean(probs)", j.get("confidence") == exp,
              f"got {j.get('confidence')} expected {exp}")
        check(f"T3 {label}: confidence_source correct", j.get("confidence_source") == "mean_top1_token_probability")
        check(f"T3 {label}: 0 < confidence <= 1", 0.0 < j.get("confidence", 0) <= 1.0)

    confs = []
    for probs in ["0.97,0.95,0.98,0.96", "0.21,0.18,0.25,0.19", "0.90,0.30,0.75,0.12"]:
        _, j = get_conf(probs)
        confs.append(j["confidence"])
    check("T3 confidence VARIES with model output (not hardcoded)", len(set(confs)) == 3, f"values={confs}")

    # EOS truncation: steps after EOS must not count
    st, j = get_conf("0.90,0.10,0.99,0.99", eos_at=2)
    exp = round((0.90 + 0.10) / 2, 4)
    print(f"\n  probs=0.90,0.10,0.99,0.99 with EOS at step 2 -> confidence={j.get('confidence')} (expected {exp})")
    check("T3 EOS truncates the mean", j.get("confidence") == exp, f"got {j.get('confidence')}")

    st, j = get_conf("0.90,0.10,0.99,0.99", eos_at=0)
    print(f"\n  EOS at step 0 (nothing generated) -> confidence={j.get('confidence')}")
    check("T3 empty generation -> 0.0", j.get("confidence") == 0.0)

    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# SINGLE-IMAGE ROUTING (unchanged branches, regression check)")
    print("#" * 78)

    st, j = get_conf("0.8,0.8", answer="The scene is a dense urban area with ...")
    os.environ["FAKE_PROBS"] = "0.83,0.79"
    r = client.post("/analyze",
                    data={"query": "Describe the land-cover and major objects visible in this image.",
                          "modalities": "optical"},
                    files=[("files", ("a.png", IMG_A.read_bytes(), "image/png"))])
    show("single image, 'describe' -> expect caption", r)
    j = r.json()
    check("single 'describe' -> caption", j.get("task_intent") == "caption")
    check("single image -> adapter_a", [t for t in j["auditable_execution_trace"] if t["tool"] == "specialist_registry"][0]["active_adapter"] == "adapter_a")

    r = client.post("/analyze",
                    data={"query": "How many swimming pools are visible?", "modalities": "optical"},
                    files=[("files", ("a.png", IMG_A.read_bytes(), "image/png"))])
    show("single image, plain question -> expect vqa", r)
    check("single question -> vqa", r.json().get("task_intent") == "vqa")

    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# FILE-COUNT GUARDRAIL (unchanged, regression check)")
    print("#" * 78)
    r = client.post("/analyze",
                    data={"query": "x", "modalities": "optical,optical,optical"},
                    files=[("files", ("a.png", IMG_A.read_bytes(), "image/png"))] * 3)
    show("3 files -> expect 400", r)
    check("3 files rejected", r.status_code == 400)

# ------------------------------------------------------------------
shutil.rmtree(TMP, ignore_errors=True)
# SAFETY: remove ONLY directories this script created. Never rmtree artifacts/.
for d in CREATED_DIRS:
    shutil.rmtree(d, ignore_errors=True)
if CREATED_DIRS and ARTIFACTS.exists() and not any(ARTIFACTS.iterdir()):
    ARTIFACTS.rmdir()

print("\n" + "=" * 78)
print(f"RESULTS:  {len(PASS)} passed,  {len(FAIL)} failed")
if FAIL:
    print("FAILED:")
    for f in FAIL:
        print("   -", f)
print("=" * 78)
sys.exit(1 if FAIL else 0)
