# SatQuery AI — backend (standalone drop)

Agentic remote-sensing VLM backend for SIH. Qwen2.5-VL-3B-Instruct + two
task-specific QLoRA adapters, with real confidence scoring, an auditable
execution trace, and hard input guardrails.

This folder is self-contained. It is a copy of `satquery/satquery_backend/`
plus the tests, docs and launcher, arranged so you can run it without anything
else from the repo.

```
backend/
  app.py                     FastAPI app: /health, /analyze
  common.py                  image loading (incl. SAR dB stretch), prompt contract
  requirements.txt
  run.sh                     launches uvicorn on 0.0.0.0:8000
  artifacts/
    adapter_a/               <- unzip satquery_adapter_a_clean.zip HERE
    adapter_b/               <- unzip satquery_adapter_b_clean.zip HERE
  tests/
    test_backend.py          39 checks, real HTTP over the real app.py
    test_sar_preprocess.py   44 checks, all four SAR conventions
    stub_env.py              CPU fakes for torch/transformers/peft/rasterio
    run_tests.sh
  reports/
    kaggle_audit_trail/      <- drop the Kaggle audit JSONs here for your report
```

---

## 1. What to download from Kaggle

**Required — the model weights (nothing works without these):**

| file | size | goes to |
|---|---|---|
| `satquery_adapter_a_clean.zip` | 154.5 MB | unzip into `artifacts/adapter_a/` |
| `satquery_adapter_b_clean.zip` | 154.3 MB | unzip into `artifacts/adapter_b/` |

After unzipping, each folder must contain `adapter_model.safetensors`,
`adapter_config.json`, `tokenizer.json`, `tokenizer_config.json`,
`processor_config.json`, `chat_template.jinja`, `satquery_meta.json`.
The zips already hold exactly these — just unzip so the files land **directly**
in `artifacts/adapter_a/`, not in a nested subfolder.

**For your SIH report — the audit trail (small, worth keeping):**

```
probe_results.json                          <- the four probe scores
levir_change_train.audit.json               <- change_vqa conversion audit
rsvqa_clean_train.audit.json                <- vqa/caption conversion audit
ssl4eo_crossmodal_train.audit.json          <- cross-modal conversion audit
satquery_adapters/adapter_a/satquery_meta.json   <- training config, A
satquery_adapters/adapter_b/satquery_meta.json   <- training config, B
data/fetch_report.json                      <- what was downloaded, from where
satquery_paths.json                         <- which mounts were used
```

Put them in `reports/kaggle_audit_trail/`. These are your evidence that every
training label is grounded in a documented source or measured from the raster.

**Optional — the training data itself** (only if you want to re-run or extend
training without re-converting; ~6.6 MB total):

```
rsvqa_clean_train.jsonl        5054.5 KB
levir_change_train.jsonl        820.8 KB
ssl4eo_crossmodal_train.jsonl   793.4 KB
```

**Do not bother downloading:** `_run_A/`, `_run_B/` (scratch), or anything under
`/kaggle/working/data/` (multi-GB raw source data; the converter output above is
what matters).

---

## 2. Install

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

**Critical:** `torchao` must NOT be installed. peft 0.20's
`is_torchao_available()` raises `ImportError` on torchao < 0.16.0, which kills
adapter loading. Quantisation here is bitsandbytes NF4, never torchao. If pip
pulls it in as a dependency:

```bash
pip uninstall -y torchao
```

CUDA is required to serve. The base model (~7 GB) downloads from Hugging Face on
first start; the adapters are loaded from `artifacts/`.

---

## 3. Run

```bash
./run.sh
# or: uvicorn app:app --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
# {"status":"ready","base_model":"Qwen/Qwen2.5-VL-3B-Instruct"}
```

Adapter paths default to `./artifacts/adapter_a` and `./artifacts/adapter_b`,
relative to the working directory — so **run from inside `backend/`**. Override
with `ADAPTER_A_PATH` / `ADAPTER_B_PATH` (see §6).

---

## 4. API

**Use the exact query wording the adapters were trained on.** A LoRA adapter is
narrow: paraphrasing the question can quietly degrade the answer. The trained
phrasings are listed in §4.1 — copy them verbatim rather than inventing your own.

### 4.1 Trained query phrasings

| task | adapter | exact query |
|---|---|---|
| cross_modal | A | `Use the optical and SAR images together to identify the land-cover and the built-up and water-covered regions.` |
| change_vqa | B | `Has the built-up area changed between the two images?` |
| change_vqa | B | `How much of the scene changed between the two dates?` |
| change_vqa | B | `Describe the change between the first and the second image.` |
| vqa / caption | A | the RSVQA-LR question set — see `reports/kaggle_audit_trail/rsvqa_clean_train.jsonl` for real examples |

`POST /analyze` — multipart form. The task is inferred from your query text plus
the file/modalities/timestamp metadata; the response always includes confidence
and an auditable execution trace.

| field | required | notes |
|---|---|---|
| `query` | yes | natural-language question or caption request |
| `files` | yes | 1 or 2 images (GeoTIFF / PNG / JPG) |
| `modalities` | no | comma-separated per file: `optical`, `multispectral`, or `sar`. Defaults to `optical`. `multispectral` is normalised to `optical`. |
| `timestamps` | no | comma-separated per file, parsed **positionally** (index i = file i) |
| `bands` | no | comma-separated band indices, default `1,2,3`. Applied to **every** uploaded file. Only affects raster (GeoTIFF) reading — PNG/JPG ignore it, and it never enters the prompt. For SAR, band 1 (VV) is used, matching training. Leave the default. |
| `dataset` | no | free-text provenance label, default `operational` |

**Guardrails (these are deliberate 400s, not bugs):**

- 1 or 2 files only.
- **change_vqa** requires 2 optical images with **2 distinct timestamps**.
- **cross_modal** requires **exactly 1 optical + 1 SAR**. Any other mix is a 400.

### Single-image VQA

```bash
curl -X POST http://localhost:8000/analyze \
  -F "query=Is there water visible in this scene?" \
  -F "modalities=optical" \
  -F "files=@scene.tif"
```

### Single-image captioning

```bash
curl -X POST http://localhost:8000/analyze \
  -F "query=Describe this satellite image in detail." \
  -F "modalities=optical" \
  -F "files=@scene.tif"
```

### Bi-temporal change VQA (adapter B)

```bash
curl -X POST http://localhost:8000/analyze \
  -F "query=Has the built-up area changed between the two images?" \
  -F "modalities=optical,optical" \
  -F "timestamps=2019-04-10,2021-08-22" \
  -F "files=@before.tif" -F "files=@after.tif"
```

### Optical + SAR cross-modal fusion (adapter A)

```bash
curl -X POST http://localhost:8000/analyze \
  -F "query=What land cover types are present in this scene?" \
  -F "modalities=optical,sar" \
  -F "bands=1,2,3" \
  -F "files=@s2_rgb.tif" -F "files=@s1_grd.tif"
```

Every response includes `confidence` (mean top-1 token probability over the
generated answer — a real measurement, not a heuristic) and
`auditable_execution_trace` listing input compatibility check, intent
classification, preprocessing/rendering, and the selected adapter.

---

### 4.2 Operator UI, visual evidence and downloadable reports

Three of the problem statement's Expected Solution items were missing entirely
(no visual evidence, no downloadable report, no UI) and are now implemented.
Each one is deliberately narrower than its name suggests, and the payload says
so on every request.

**Operator UI — `GET /`.** One page served by this backend; one process, one
origin, no build step, no CDN, all CSS/JS inline. It posts the real multipart
contract to `/analyze` and renders whatever comes back — **including the 400s**,
because the ambiguous-intent and modality-mix refusals are guardrails worth
showing, and a silent fallback would hide exactly the behaviour a judge should
see. There is no mock data path anywhere in the page (verified by test: exactly
two `fetch(` calls exist, `/analyze` and `/health`).

**Visual evidence — `evidence.py`, only for a bi-temporal optical pair.**
Deterministic radiometric differencing of the two uploaded frames: per-channel
shared pooled-range scaling, per-frame median centring, max over channels, then
a threshold derived from the difference's own robust spread
(`median + 5*1.4826*MAD`, floored at 0.02). It returns changed regions with
pixel bounding boxes, area, fill fraction and share of all change; an overlay
PNG drawn on the exact rendering the model was shown; a pixel-coordinate
GeoJSON; and a model-vs-pixel cross-check with three states — AGREE, DISAGREE,
or **WITHHELD** when the answer's polarity cannot be read at a word boundary
(a withheld check is never shown as a pass).

What it is NOT, stated in every payload and in the UI and the report:
it is **not model grounding** — neither LoRA adapter was ever trained on box or
mask tokens, so prompting them for coordinates would return invented geometry,
and learned grounding is documented as future work instead of being faked; it
is **not georeferenced** — an upload carries no CRS, so geometry is in PIXEL
coordinates and the GeoJSON says so; and it is **not semantic** — illumination,
season, cloud shadow and misregistration all produce radiometric difference,
which the payload's `caveats` list says out loud.

Refusals are clean, never crashes: optical-vs-SAR (that difference measures the
sensor, not the ground), a pair with zero dynamic range, or an unreadable file
all return `status: "not_applicable"` with the reason. Evidence failing never
fails the analysis — the answer still stands and the failure is recorded in the
trace.

**Downloadable report — `GET /report/{id}`.** Every `/analyze` response (and
every guardrail path that returns a payload) carries `report.view_url`,
`report.download_url` and `report.json_url`. The HTML is self-contained —
inline CSS, the overlay embedded as a data URI, no network needed — so a judge
can open it offline and see exactly what the operator saw, including the
un-calibrated-confidence caveat and the evidence caveats. Reports live in
process memory only: capped at 50 with FIFO eviction, not persisted across a
restart, and **not authenticated** — anyone who can reach the service can read a
report given its id. That is stated in the report footer rather than left to be
discovered.

`/analyze` response shape now: `task_intent`, `query`, `answer`, `confidence`,
`confidence_source`, `duration_seconds`, `inputs`, `visual_evidence`,
`auditable_execution_trace`, `report`.

---

## 5. Tests

Run on CPU, no GPU and no model download needed — `stub_env.py` fakes
torch/transformers/peft/rasterio while `app.py` executes its real routing,
validation, guardrail, trace and confidence code over real HTTP.

```bash
./tests/run_tests.sh
# test_backend.py               39 passed
# test_sar_preprocess.py        44 passed
# test_evidence_report_ui.py   140 passed   (evidence vs KNOWN ground truth,
#                                            report store + renderer, UI contract,
#                                            end-to-end HTTP incl. report downloads)
```

`test_evidence_report_ui.py` checks bounding boxes against synthetic pairs where
the true changed region is known exactly, e.g. a 40x40 injected square must come
back as `[60, 60, 100, 100]`. It also pins the designs that were measured and
rejected: independent per-frame stretching (14% false change), Otsu thresholding
(recall collapsing to 16.9% on one pair), greyscale-only differencing (blind to a
luminance-neutral colour change that per-channel localises exactly), and prefix
yes/no parsing ("north-west shows new buildings" read as *no change*).

The tests create `artifacts/adapter_a` and `adapter_b` if missing and never
delete a pre-existing `artifacts/` tree, so they are safe to run against your
real weights.

---

## 6. Upgrading adapter B later (no code change)

Adapter B currently over-predicts change — see §7. When a rebalanced v2 exists,
do not overwrite v1. Put it beside it and switch by env var:

```bash
ADAPTER_B_PATH=./artifacts/adapter_b_v2 ./run.sh
```

Compare both with the probes, keep the winner, delete the loser. `app.py` needs
no edit: the path is read at startup in `lifespan()`.

---

## 7. Known limitation — state this in your report, don't hide it

Measured probe results (`reports/kaggle_audit_trail/probe_results.json`):

| capability | score |
|---|---|
| water hallucination (no-water scenes) | 70% (7/10) |
| cross-modal land cover | 70% (7/10) |
| change detection — annotated-change pairs | **100% (10/10)** |
| change detection — no-change pairs | **40% (4/10)** |

Cause, measured not guessed: LEVIR-CD+ is **89.8% positive** (572 of 637 pairs
have annotated change). At `--max-steps 400 --grad-accum 4` the run consumed
1,600 of 1,911 rows, so adapter B saw roughly **164 negative rows in three
hours** — about one negative per nine positives. It learned the prior.

The fix is a rebalanced negative class (grounded zero-change pairs), not more
steps. Until then: change **recall** is excellent, change **precision** on
unchanged pairs is weak. Suspected contributing factor, not yet confirmed:
`fetch_data.py` resizes 1024→512 change masks with `Image.NEAREST`, which can
drop small change regions entirely and label a genuine positive as "no".

---

## 8a. Grounding (model-produced boxes/masks) is NOT implemented

Stated plainly because the problem statement lists visual evidence as an
expected feature and it is tempting to blur the two. `evidence.py` produces a
**deterministic radiometric difference**, and every payload it returns carries
`is_model_prediction: false`. The adapters were trained on short-answer targets
only — no box or mask tokens ever appeared in any training set here — so asking
the VLM for coordinates would produce plausible-looking geometry with no
validation behind it. That would be worse than nothing for a judging panel that
asks "how do you know that box is right?".

If grounding is wanted later, the honest path is a separate grounding dataset
(e.g. annotated boxes over LEVIR-CD+ change masks) and a third adapter or head,
benchmarked held-out like everything else in §5. Until then the overlay is
evidence about *pixels*, labelled as such.

---

## 8. Grounding rule this backend was built under

Every training label is either **documented** (Esri 11-class LULC table) or
**measured from the actual raster** (SAR dB statistics). Anything undocumented —
SSL4EO `cloud_mask` semantics, the LULC `bands` remap — is stored for inspection
and never used as ground truth. The converters abort rather than emit a partial
or corrupt training file.
