# SatQuery AI — project summary

Agentic remote-sensing VLM backend built for SIH. Two QLoRA adapters on
Qwen2.5-VL-3B-Instruct, served by FastAPI, trained on a reproducible Kaggle
pipeline with hard data-integrity gates.

---

## 1. SIH capability mapping

| requirement | implementation | status |
|---|---|---|
| RS-adapted VLM (an unadapted VLM is non-compliant) | two LoRA adapters, r=16 / α=32, 4-bit NF4 base | **done, trained** |
| single-image VQA | adapter A, `task=vqa` | **done** — 70% on a 10-item *training-row* probe; held-out number pending (§4) |
| single-image captioning | adapter A, `task=caption` | **done** |
| bi-temporal change VQA | adapter B, `task=change_vqa` | **done** — detects change 100% but only 40% on unchanged pairs; fix built, retrain in progress (§4, §6) |
| optical + SAR cross-modal fusion | adapter A, `task=cross_modal` | **done** — 70% on a 10-item *training-row* probe; held-out number pending (§4) |
| agentic orchestration with auditable trace | 4-stage trace in every response | **done** |
| confidence | mean top-1 token probability, measured not heuristic | **done** |
| visual evidence | `evidence.py`: deterministic radiometric differencing of a bi-temporal optical pair — regions with pixel bboxes, an overlay PNG, pixel-coordinate GeoJSON, and a three-state model-vs-pixel cross-check. Every payload carries `is_model_prediction: false` | **done as differencing**; learned grounding **not** built (§7) |
| downloadable report | `report.py`: `GET /report/{id}` returns a self-contained HTML (overlay embedded, caveats printed) or `?format=json`. In-memory, capped at 50, not authenticated | **done** |
| operator UI | `ui.py`: `GET /` serves one page that posts the real `/analyze` contract and renders refusals verbatim. No CDN, no mock fallback | **done** |

Every response from `POST /analyze` carries: `task_intent`, `query`, `answer`,
`confidence`, `confidence_source`, `duration_seconds`, `inputs`,
`visual_evidence`, `report`, and
`auditable_execution_trace` (input_compatibility_checker →
agentic_intent_classifier → preprocessor → specialist_registry →
visual_evidence_generator for two-image requests).

The visual evidence is deliberately narrow and says so on every request: it is
a radiometric difference in **pixel** coordinates, not model grounding and not
georeferenced (an upload carries no CRS), and it flags radiometric difference —
which includes illumination, season and misregistration — not semantic change.
Illumination offsets are removed by per-frame median centring before
differencing, because subtracting two independently display-stretched frames was
measured to flag 47% of a frame whose true change is 4%.

There is also a **deterministic byte-equality guardrail**: a change_vqa pair
whose two images are byte-identical bypasses the VLM and returns "No changes
detected" with `confidence_source: deterministic_byte_equality_guardrail`. A
model cannot be fooled by, or rewarded for, a trivially identical pair.

---

## 2. Datasets and the grounding rule

| dataset | used for | adapter | volume |
|---|---|---|---|
| **RSVQA-LR** (Kaggle mount) | vqa + caption | A | 772 rasters |
| **LEVIR-CD+** (`blanchon/LEVIR_CDPlus`) | change_vqa | B | 637 pairs, 572 with change |
| **SSL4EO-S12-v1.1** (`embed2scale/SSL4EO-S12-v1.1`) | cross_modal | A | 848 scenes → 1,696 rows |

Combined training gate: **21,481 rows, 0 missing files, 0 bad shapes.**

Rejected after investigation: So2Sat GFM-Bench (no SAR), EarthView (240 GB),
SECOND / S2Looking / QXS-SAROPT (Drive-only or too large), BigEarthNet-S1 v1,
BIFOLD BigEarthNet.txt (text only).

**The grounding rule, enforced in code:** every training label is either
*documented* (the Esri 11-class LULC table) or *measured from the actual raster*
(SAR dB statistics). Undocumented fields — SSL4EO `cloud_mask` semantics, the
LULC `bands` remap — are written to disk for inspection and **never** used as
ground truth. Converters **abort and delete their output** rather than emit a
partial file; a corrupt training file is worse than none.

Multi-class scenes produce share-ordered answers where every class clears
`--min-share` (0.05); dominant-class answers require `--min-purity` (0.95).

---

## 3. Model and training

| | |
|---|---|
| base | `Qwen/Qwen2.5-VL-3B-Instruct` |
| quantisation | bitsandbytes 4-bit NF4, double quant, fp16 compute |
| adapters | LoRA r=16, α=32; `visual` and `lm_head` excluded from int8 skip |
| pixel budget | `min_pixels=64*28*28`, `max_pixels=256*28*28` — **identical in trainer and backend**, asserted by test |
| steps | 400 optimizer steps × grad-accum 4 = 1,600 samples |
| lr / schedule | 1e-4, cosine, warmup 0.03 |
| batch | pinned to 1 (avoids `image_grid_thw` concatenation across samples) |
| memory | gradient checkpointing on, `paged_adamw_8bit` |
| GPU | **one** T4, pinned before torch import |

Labels are masked with `labels[:prompt_len] = -100`, so only the answer is
supervised. `--verify-format` compares the trainer's prompt construction against
the backend's `format_messages()` and **aborts on drift** — train/inference
mismatch is caught before GPU time is spent, not after.

---

## 4. Measured results (adapter v1)

> **What these numbers are not.** Every figure below comes from a **10-item
> probe over rows drawn from the training file**. It measures whether the model
> memorised its own homework, not whether it generalises. A 10-item binary probe
> carries a 95% confidence interval of roughly **±25 points**, so "70%" here is
> statistically indistinguishable from 45% or from 95%. They are reported because
> they are the only measurements that exist for v1 — not as accuracy claims.
> §4a is the replacement.

| probe (n=10, **training rows**) | adapter v1 | adapter v2 | v2 95% CI |
|---|---|---|---|
| water hallucination (no-water scenes) | 70% (7/10) | 70% (7/10) | 35–92% |
| cross-modal land cover | 70% (7/10) | 60% (6/10) | 34–86% |
| change detection — annotated-change pairs | **100% (10/10)** | **100% (10/10)** | 72–100% |
| change detection — no-change, **REAL** pairs | **40% (4/10)** | **60% (6/10)** | 34–86% |
| change detection — no-change, **SYNTHETIC** pairs | n/a | **100% (10/10)** | 72–100% |

**Neither movement is statistically significant.** Fisher exact, v1→v2 on real
no-change pairs: **p = 0.656**; cross_modal: **p = 1.000**. The cross-modal
"regression" is noise and must not be reported as one. At n=10 this probe cannot
detect a 20-point change in either direction — which is the whole argument for
§4a.

The v2 probe gate fired correctly and refused to pass the model:

```
!! BELOW 70%: cross_modal land cover, change_vqa NO-change (REAL)
!! That adapter is guessing rather than looking. Do not ship it;
```

Root cause of the 40%, measured not guessed: LEVIR-CD+ is **89.8% positive**
(572/637). At 1,600 samples consumed from 1,911 rows, adapter B saw roughly
**164 negative rows** — about one negative per nine positives. It learned the
prior. Fix built and verified in §6; not yet retrained.

---

## 4a. Held-out benchmark — built, **not yet run**

`training/benchmark.py` replaces the probes above with a real evaluation. It is
written, unit-tested (46 checks) and wired into the training notebook as an
optional STEP 11. **It has produced no numbers yet, because the held-out
evaluation files have not been built.** That is the honest current state.

| design decision | why |
|---|---|
| held-out rows only, filtered on a `split` stamp | `convert.py --split-tag eval` marks rows; anything untagged or tagged `train` is **refused**, never assumed held-out. A file with zero held-out rows aborts with instructions instead of scoring training data. |
| n = 100 per capability (default), **class-stratified** | narrows the CI to ≈±9 points; the achieved n is printed beside every score. Stratification is essential, not cosmetic: drawn uniformly, n=100 on LEVIR's 89.9%-positive test split yields **6** negatives (±30.2% CI) — the exact defect this script exists to remove. Stratified, it captures **all 35** (±15.4%). `--n 0` uses every held-out row; the sample is seed-reproducible |
| the **natural class prior** is printed beside the sample | a stratified sample is deliberately *not* the population, so its blended accuracy must never be quoted as one. Per-class P/R/F1 and macro-F1 are unaffected by rebalancing — a further reason they are the headline |
| **per-class precision / recall / F1 + macro-F1** | a blended accuracy is precisely what hid the change-detection failure. On a 90%-positive set, an adapter answering "yes" unconditionally scores **90% accuracy and macro-F1 0.474, with `no` recall exactly 0.00**. Both classes are reported separately, with support, so an average cannot launder a collapse. |
| **base model vs adapter on identical rows** | the delta is the *evidence* for "an unadapted VLM does not satisfy the SIH requirement". Without it that claim is assertion. The script states plainly if the adapter does **not** beat the base model. |
| caption = token-overlap F1, flagged in output | it is a weak proxy and is labelled as one. It must not be presented as BLEU/ROUGE. The honest hackathon captioning metric is human pass/fail on *"names the dominant land cover, invents nothing"*. |
| Wilson 95% CI printed | so a small-n point estimate is never over-quoted |
| n < 30 labelled a smoke test | the script refuses to present it as a result |

**Held-out sources** (the dataset authors' own splits, not invented ones):

| capability | held-out split | cost |
|---|---|---|
| `vqa` + `caption` | RSVQA-LR `val` — already on the Kaggle mount | **zero download** |
| `change_vqa` | LEVIR-CD+ `test`, 348 pairs, 2 parquet shards | ≈990 MB |
| `cross_modal` | SSL4EO-S12 `val` (the directory is `val/`, not `validation/`) | ≈400 MB |

`--synth-neg-ratio 0.0` is pinned for the benchmark conversion: synthetic
zero-change negatives are a *training* rebalancing device and must never enter a
held-out set, or the score would partly measure a shortcut the converter built.

Each capability is independent — if one download fails the others still
benchmark, and a capability with no held-out rows is reported **NOT EVALUATED**
rather than silently dropped.

**The measurement floor, stated before the number is produced.** LEVIR-CD+'s test
split contains only ~35 no-change pairs. Stratified sampling captures all of
them, so **±15 points is the tightest possible interval on no-change precision
from this dataset** — more compute cannot help, because the negatives do not
exist. Tightening it requires a second change-detection dataset, which is a
data-collection decision. This belongs in the report next to the number, not in a
footnote.

Benchmark **v1, v2 and the base model on the identical rows**. It is
inference-only and cheap, and it is the sole thing that can settle whether v2
improved on v1. **Do not start another retrain before it** — the current evidence
is p = 0.656.

---

## 5. Bugs found and fixed

These are the engineering substance of the project, not footnotes.

**F12 — SAR preprocessing.** Four different SAR conventions handled; invariance
tested (44 checks).

**Task 1–4 (backend).** Pixel budget raised to 256·28·28; change_vqa requires two
*distinct* timestamps (else 400); confidence is a real mean top-1 token
probability; cross_modal requires exactly 1 optical + 1 SAR (else 400).
Timestamps are parsed **positionally** — filtering empties used to shift a
timestamp onto the wrong file.

**ssl4eo false abort (exit 5, 75% "drop rate").** The drop-rate gate was counting
deliberate purity filters as missing-archive corruption. Split into **INTEGRITY**
(missing/corrupt — gated) vs **SELECTION** (quality filters — reported). Real
integrity drop rate: **0.0000**. Yield went from 221 → **848 scenes**, and
`built area` from 8 → 310 rows.

**DataParallel `StopIteration`.** HF Trainer wraps the model in `nn.DataParallel`
when it sees >1 visible CUDA device (Kaggle = T4 ×2). bitsandbytes `Params4bit`
stores uint8, so in the replica `param.is_floating_point()` is False for every
weight and `self.visual.dtype` raises `StopIteration` at step 0. `device_map={"":0}`
does **not** help — Trainer counts visible devices. Fixed by pinning
`CUDA_VISIBLE_DEVICES` before transformers is imported, plus a guard that fails
loudly if DataParallel ever reappears.

**torchao / peft 0.20.** `is_torchao_available()` raises `ImportError` on
torchao < 0.16.0, killing `get_peft_model`. Fixed by uninstalling torchao and
asserting before any model download. Quantisation is bitsandbytes, so this is
loss-free.

**LEVIR mask encoding — the serious one.** `convert_levir` tested `mask > 127`.
LEVIR-CD+ masks store `{0, 1}`, so **every one of 637 pairs was labelled "no
change"** — 1,911 rows, zero positives — while the audit still printed
`OK: conversion clean. Safe to train.` adapter B v1 trained on that answered
"no" unconditionally: 100% on the false-positive probe, and the detection probe
reported `SKIPPED (no matching rows)`.
Fixed to `mask > 0`, added reporting of the pixel values the raster actually
held, and added a **symmetric all-"no" abort** (only the all-"yes" case warned,
which is why this passed silently). The test gap: the fixture wrote `{0, 255}`.
19 checks now pin the real encoding.

**Probe scored correct answers wrong.** `startswith()` marked
`"rangeland and trees"` WRONG against `"trees and rangeland"`. Now compares class
**sets**. cross_modal 60% → 70%.

**A skipped probe passed the gate silently.** `low = [... if v is not None and v < 0.7]`
ignored `None`, so an *untested* capability counted as a pass — exactly how the
all-negative change set got through. Skipped probes and missing adapters are now
reported as failures.

**No checkpoints.** `save_strategy="no"` meant a 3-hour run wrote its adapter
once, at the end; a crash at step 399 lost everything. Now saves every 50 steps
(keeps 2), `--resume` continues from the newest. Two traps handled:
`sorted(glob("checkpoint-*"))` is **lexicographic** and picks `checkpoint-50`
over `checkpoint-150` (now int-keyed, with a test proving the naive sort is
wrong); and the **smoke test used to write to the real `adapter_b/` and produce
the deliverable zip**, so running smoke after training silently replaced hours
of weights with a 3-step adapter.

---

## 6. Rebalanced negatives — trained, and what it actually showed

`--synth-neg-ratio 0.4` adds **grounded zero-change negatives** to fix the 40%:
same scene, same acquisition, translated ≤6 px with edge padding (`np.roll`
would leave a wrap-around seam). "No change" is true **by construction**, so no
annotation is invented.

Safeguards: every synthetic row is stamped `provenance: synthetic_zero_change`;
the probe scores **REAL** and **SYNTHETIC** negatives **separately**, so a
pixel-similarity shortcut cannot hide behind a good average; pairs that come out
pixel-identical (flat tiles) are **dropped**, not emitted — and that drop is
classified SELECTION, not INTEGRITY, because misclassifying it aborted a clean
run at a 41.7% "integrity" rate.

Verified: 16.7% → **41.2%** negatives, all positives kept, 0 pixel-identical
pairs, integrity 0.0000, and `--synth-neg-ratio 0.0` leaves historical behaviour
untouched.

**Then it was trained, and the safeguard earned its keep.** v2 produced 948
synthetic rows (316 pairs × 3 QA rows) and hit the 40.0% negative target exactly.
But scoring REAL and SYNTHETIC separately split the negative class in two:

```
SYNTHETIC no-change   100% (10/10)
REAL      no-change    60% (6/10)   <- was 40% in v1, but p = 0.656, not significant
```

Composition of the v2 negative class: **316 synthetic (82.9%) vs 65 real (17.1%)**.

The diagnosis is a flaw in this fix, not in the grounding rule. Synthetic pairs
are a ±6 px translation of the same image — **>98% pixel-identical**, with no
photometric perturbation of any kind. They teach *"visually near-identical → no
change"*, which is true but trivial. The skill that is actually failing is
*"visibly different acquisitions of the same place, with no annotated built-up
change"* — and only the 65 real pairs cover it. The ratio was fixed; the
**difficulty distribution** was not.

Candidate next step: perturb synthetic pairs photometrically (brightness,
contrast, hue, sensor-like noise) so they *look* different while remaining
provably unchanged. **Not started** — the held-out benchmark in §4a must produce
a real baseline first, because at n=10 we cannot even confirm v2 beat v1.

---

## 7. Known limitations — state these, don't hide them

1. **Change precision on unchanged pairs is 40%.** Recall is 100%. Cause and fix
   are both documented above; the rebalanced retrain has not been run yet.
2. **"Visual evidence" is metadata, not imagery.** The response records which
   rendering was applied and per-image input metadata, but returns no overlay,
   heatmap or bounding box. If judges expect a visual artifact, that is a gap.
3. **Suspected, unconfirmed:** `fetch_data.py` resizes LEVIR masks 1024→512 with
   `Image.NEAREST`, which can drop small change regions entirely and label a
   genuine positive as "no". The original 1024 masks were deleted with the
   parquet shards, so this cannot be verified without a re-download. Note the
   paradox — fixing it would make *more* pairs positive and worsen the imbalance.
4. **Probes run on training-split rows**, not a held-out set. They are a
   hallucination and capability check, not a generalisation benchmark.
5. **Only 65 real negative pairs exist** in LEVIR-CD+, so most rebalancing
   material is synthetic. If SYNTHETIC scores near 100% while REAL stays at 40%,
   the honest conclusion is that LEVIR-CD+ alone cannot teach this and a second
   change dataset is required.
6. **Single-GPU only.** 4-bit quantised PEFT cannot be replicated across GPUs;
   the second T4 on a Kaggle session is unusable for training.
7. **Free hosting is session-bound.** The endpoint dies when the notebook
   session ends. No free *persistent* GPU host exists for this model.

---

## 8. Test coverage

`tests/run_all.sh` → **11 suites, 553 checks, all green.**

| suite | checks |
|---|---|
| backend (real HTTP over the real `app.py`) | 39 |
| SAR preprocessing (4 conventions + invariance) | 44 |
| converter vs real RSVQA/CDVQA schemas | 37 |
| BigEarthNet + contamination guard | 11 |
| LEVIR + SSL4EO converters, mask encodings, rebalancing | 140 |
| training guards (single-GPU pin, checkpoints, resolution lock) | 60 |
| **held-out benchmark** (per-class metrics, stratified sampling, split filtering, refusal paths) | **64** |
| notebook gate — train notebook | 36 |
| notebook gate — FULL notebook (incl. STEP 11 benchmark) | 72 |
| notebook gate — **BENCH notebook** (trains nothing, cannot overwrite weights) | **50** |

The standalone `backend/` drop runs its own 83 checks on CPU with no GPU and no
model download (`tests/stub_env.py` fakes torch/transformers/peft/rasterio while
`app.py` executes its real routing, validation, guardrail, trace and confidence
code).

Notebook gates assert the embedded sources are **byte-identical** to the tested
files on disk, so a notebook can never ship stale code — that check is what
caught a stale `convert.py` earlier.

---

## 9. Deliverables

| file | what |
|---|---|
| `backend/` | standalone runnable backend + tests + README |
| `backend_satquery.zip` | the same, zipped |
| `SatQuery_FULL_v2_UPGRADE.ipynb` | full pipeline: download → convert → train → probe → package, with every fix |
| `host_on_kaggle.ipynb` | serves the trained adapters as a public HTTPS endpoint for free |
| `satquery/training/benchmark.py` | held-out evaluator: class-stratified sampling, per-class P/R/F1, macro-F1, base-vs-adapter delta, Wilson CI (§4a) |
| `satquery/training/kaggle_satquery_BENCH.ipynb` | **benchmark-only** notebook — reaches §4a without re-running three hours of training; benchmarks every adapter B it finds against the base model |
| `satquery/training/kaggle_satquery_train.ipynb` | RSVQA-only variant, no downloads |
| `satquery/HANDOVER.md` | 954 lines: per-fix diffs, decisions, runbook |
| `backend/evidence.py` | visual evidence: per-channel shared-scale + median-centred differencing, MAD threshold, regions, overlay, pixel GeoJSON, cross-check |
| `backend/report.py` | self-contained downloadable per-analysis report (HTML with embedded overlay, or JSON) |
| `backend/ui.py` | single-page operator frontend served at `GET /` |
| `backend/tests/test_evidence_report_ui.py` | 140 checks incl. bboxes vs KNOWN ground truth |

Adapter weights are **not** in git. They come from Kaggle STEP 10:
`satquery_adapter_a_clean.zip` (154.5 MB) and `satquery_adapter_b_clean.zip`
(154.3 MB), unzipped into `backend/artifacts/adapter_a/` and `adapter_b/`.

Swap adapters without a code change — `app.py` reads
`ADAPTER_A_PATH` / `ADAPTER_B_PATH`, so v1 and v2 can sit side by side:

```bash
ADAPTER_B_PATH=./artifacts/adapter_b_v2 ./run.sh
```

---

## 10a. Grounding is future work, and the honest path to it

Learned grounding (model-produced boxes or masks) is **not implemented**. Neither
LoRA adapter ever saw a box or mask token in training, so prompting them for
coordinates would return plausible geometry with no validation behind it — worse
than nothing in front of a judge who asks "how do you know that box is right?".
The shipped substitute is deterministic radiometric differencing, labelled
`is_model_prediction: false` in every payload. The honest route to real grounding
is a grounded dataset (boxes derived from LEVIR-CD+ change masks are the obvious
source), a third adapter or detection head, and a held-out benchmark of its own —
none of which exists yet.

---

## 10. Immediate next steps

1. **Retrain adapter B on the rebalanced set** (`SatQuery_FULL_v2_UPGRADE.ipynb`)
   and compare `NO-change (REAL)` against v1's 40%. Keep v1 unless v2 wins.
2. **Smoke-test checkpointing before the long run** — cell 32 forces
   `save_steps=1`, so ~2 minutes proves the save-and-resume path instead of hour
   three discovering it.
3. **Frontend** against the tunnel URL from `host_on_kaggle.ipynb`.
4. Optional: decide whether "visual evidence" needs a returned image artifact,
   and whether a held-out evaluation split is worth building before judging.
