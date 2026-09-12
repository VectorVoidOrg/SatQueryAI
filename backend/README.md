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

`POST /analyze` — multipart form. The task is inferred from your query text plus
the file/modalities/timestamp metadata; the response always includes confidence
and an auditable execution trace.

| field | required | notes |
|---|---|---|
| `query` | yes | natural-language question or caption request |
| `files` | yes | 1 or 2 images (GeoTIFF / PNG / JPG) |
| `modalities` | no | comma-separated per file: `optical`, `multispectral`, or `sar`. Defaults to `optical`. `multispectral` is normalised to `optical`. |
| `timestamps` | no | comma-separated per file, parsed **positionally** (index i = file i) |
| `bands` | no | comma-separated band indices for raster input, default `1,2,3` |
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
  -F "bands=4,3,2" \
  -F "files=@s2_rgb.tif" -F "files=@s1_grd.tif"
```

Every response includes `confidence` (mean top-1 token probability over the
generated answer — a real measurement, not a heuristic) and
`auditable_execution_trace` listing input compatibility check, intent
classification, preprocessing/rendering, and the selected adapter.

---

## 5. Tests

Run on CPU, no GPU and no model download needed — `stub_env.py` fakes
torch/transformers/peft/rasterio while `app.py` executes its real routing,
validation, guardrail, trace and confidence code over real HTTP.

```bash
./tests/run_tests.sh
# test_backend.py         39 passed
# test_sar_preprocess.py  44 passed
```

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

## 8. Grounding rule this backend was built under

Every training label is either **documented** (Esri 11-class LULC table) or
**measured from the actual raster** (SAR dB statistics). Anything undocumented —
SSL4EO `cloud_mask` semantics, the LULC `bands` remap — is stored for inspection
and never used as ground truth. The converters abort rather than emit a partial
or corrupt training file.
