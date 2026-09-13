# SatQuery AI — Held-Out Benchmark Dossier

**Purpose:** this document exists to be *attacked*. It reports a held-out benchmark of a
remote-sensing-adapted VLM against its own un-adapted base model, states plainly which
numbers are trustworthy, which are derived, which are void, and which claims the data
cannot support. Everything here is recomputable from two JSON files that contain every
individual prediction.

**Prepared:** 2026-09-13 · **Run environment:** Kaggle GPU notebook (single pinned GPU)
**Status of the run:** completed, `exit=0`, both arms saved incrementally

---

## 0. How to authenticate this in five minutes

The two results files contain the **complete prediction triple `(query, gold, pred)` for
all 700 scored rows per arm**. No number in this document has to be taken on faith:

| file | size | contents |
|---|---|---|
| `benchmark_change_adapter_b.json` | 337.7 KB | change_vqa, 600 rows × 2 arms, all pairs |
| `benchmark_adapter_a.json` | 295.2 KB | vqa + caption + cross_modal, 100 rows each × 2 arms, all pairs |

Ask for those two files. Then:

1. **Recompute the headline.** Count `pred == gold` (after the canonicalisation rule in
   §6) over `arms.ADAPTER.change_vqa.pairs`. You should get **373 / 600 = 62.17%**.
2. **Recompute the base arm.** The same count over `arms["BASE (un-adapted)"]` gives
   **76 / 600 = 12.67%**, and all 76 are on the `yes` class.
3. **Check the per-class table is internally consistent.** `sum(support) == 600`,
   `sum(tp) == 373`, `sum(fp) == sum(fn) == 227`. All three hold (§4).
4. **Check the code that produced it.** `benchmark.py` md5
   `27a8376955d2136278f14009d32b94e5`, 27,495 bytes (§7 lists the two bugs found *after*
   the run and the md5 of the file that fixes them).
5. **Check the tests.** 12 suites, 635 checks, exit 0 (suite 7 self-skips without
   transformers/torchvision, so its checks are not in that total);
   `tests/test_benchmark.py` alone is 91 checks, 27 of which were written
   *from this run's output* as regressions.

If any of those five disagree with this document, this document is wrong — say so.

---

## 1. Verdict, up front

| SIH capability | measured? | adapter | un-adapted base | honest read |
|---|---|---|---|---|
| **Bi-temporal change VQA** | ✅ yes | **62.2%** ±3.9 (macro-F1 0.469) | **12.7%** (macro-F1 0.084) | Strong, real, and the base arm is *degenerate* — see §4.2 |
| **Optical+SAR cross-modal** | ⚠️ partially | **≈23/100** set-exact (macro-F1 0.124) | **0/100** (macro-F1 0.000) | The delta is real but the metric is dominated by *answer format*, not knowledge — see §5 |
| **Single-image VQA** | ❌ **void** | 0.0% | 0.0% | A sampler bug filled all 100 rows with counting questions. **Not a measurement.** See §7.1 |
| **Captioning** | ❓ not reported | in JSON, not printed | in JSON, not printed | The readout printed `macro-F1=None`; the token-overlap F1 is in the file but was never surfaced |
| **Single-image captioning/VQA inference path** | ✅ exercised | — | — | Ran without error on held-out rows; only the *scoring* of vqa is void |

**What this benchmark does establish:** an un-adapted Qwen2.5-VL-3B cannot perform
bi-temporal change VQA on this data. It answers `yes` essentially unconditionally
(recall 0.99 on `yes`, **0.00 on all ten other target strings**) and produces nothing
that matches any magnitude or description target. The LoRA-adapted model reaches 62.2%.
That is the SIH requirement's evidence that *"a generic VLM will not satisfy the
requirement."*

**What it does not establish:** see §8. The list is short and specific, and one item
(v1 vs v2) cannot be settled by this dataset at all.

---

## 2. Protocol

| item | value |
|---|---|
| Base model | `Qwen/Qwen2.5-VL-3B-Instruct` |
| Adaptation | 4-bit QLoRA LoRA adapters, two separate adapters routed by task |
| Adapter A | serves `vqa`, `caption`, `cross_modal` |
| Adapter B | serves `change_vqa` — **version 2, retrained with rebalanced synthetic zero-change negatives** (attribution: §3) |
| Pixel budget | `min_pixels = 64·28·28 = 50,176`, `max_pixels = 256·28·28 = 200,704` (identical in training, serving and benchmarking) |
| Arms | `--arms both`: **BASE (un-adapted)** and **ADAPTER**, scored on the *same sampled rows* |
| Sampling | class-stratified on the gold answer, fixed seed, budget per capability |
| Budgets | change_vqa `--n 600`; vqa / caption / cross_modal `--n 100` each |
| Metric | exact match after canonicalisation; **per-class precision / recall / F1 + macro-F1**; Wilson 95% CI on accuracy |
| Captioning metric | token-overlap F1 — a **weak proxy**, explicitly *not* BLEU/ROUGE |
| GPU pinning | `CUDA_VISIBLE_DEVICES=0` set before torch import (4-bit PEFT + DataParallel dies with `StopIteration`) |
| Persistence | results written to disk **after every arm**, so a later failure cannot discard finished inference |

### 2.1 Held-out data — authors' splits only, no invented splits

| dataset | split used | rows in eval file | scorable rows | capability |
|---|---|---|---|---|
| RSVQA-LR | `val` (authors' split, from the Kaggle mount) | 3,194 | 2,400 vqa + 794 caption | vqa, caption |
| LEVIR-CD+ | `test` (authors' split, 348 pairs) | 1,044 | 1,044 | change_vqa |
| SSL4EO-S12 v1.1 | `val` (900 samples) | 1,800 | **900** | cross_modal |

LEVIR-CD+ emits **three QA rows per image pair** (changed? / how much? / describe), hence
348 × 3 = 1,044. SSL4EO emits two `cross_modal` rows per sample; **900 of the 1,800 were
excluded before sampling** — see §2.2.

No row without a `split` stamp accepted by the loader (`load_heldout` refuses it
outright), and every image path is verified to exist on disk before the row is scored.

### 2.2 The excluded cross_modal rows — a decision a reviewer should challenge

The SSL4EO converter emits two variants per sample:

* **short** — a class list, e.g. `trees and rangeland and water`. This is the target the
  adapter was trained and probed on.
* **long** — a descriptive sentence embedding dB values read off the SAR raster, e.g.
  `"...averages -14.2 db in vv and -23.4 db in vh."`

The long variant was **excluded from scoring** (900 rows). Justification: those figures
are raster-derived constants that no model can reproduce from the image pair, so the row
can only ever score 0 — it measures nothing, and it inflated the answer space to ~800
unique strings. This is a *scoping* decision, not a data-quality filter, and it is
reported rather than silent: the benchmark prints how many rows it excluded.

**Challenge this if you think excluding them flatters the result.** The counter-argument
is that a descriptive answer should be scored with a descriptive metric (token overlap or
human judgement), not exact match — which is what the caption task uses.

### 2.3 The rebalanced-sample caveat (stated in the code, restated here)

Stratified sampling deliberately over-represents scarce answer classes. **The blended
accuracy is therefore computed on an artificially rebalanced sample and must never be
quoted as a population accuracy.** Per-class P/R/F1 and macro-F1 are unaffected by
rebalancing, which is why they are the headline. The natural class prior of the full
held-out pool is recorded alongside every result.

---

## 3. Provenance of the adapters — including its weak link

**Stated plainly: the results JSON does not record which adapter directory was scored.**
`config` holds the base model, budgets, seed, pixel limits and row counts — but not the
adapter path and no weight fingerprint.

The attribution *"Adapter B = version 2"* therefore rests on:

1. the operator's statement that the attached Kaggle input was the v2 adapter, and
2. the run's adapter manifest (`bench_adapters.json`), which mapped exactly one
   candidate, labelled `adapter_b`.

**This is the weakest link in the chain and a reviewer is right to push on it.** It is
closeable with a two-line change (record the adapter path and a hash of
`adapter_model.safetensors` into `config`), which has *not* been applied retroactively —
it cannot be, without re-running.

What *is* independently verifiable: the base arm. It loads no adapter at all, so its
12.7% is attributable with certainty. The delta is therefore only as trustworthy as the
adapter attribution above.

**To fingerprint the adapter that was used**, run against the attached input directory:

```bash
ls -la <adapter_b_dir>
md5sum <adapter_b_dir>/adapter_model.safetensors
python -c "import json;print(json.load(open('<adapter_b_dir>/adapter_config.json')))"
```

`adapter_config.json` records the base model, rank, alpha and target modules — enough to
confirm it is a Qwen2.5-VL-3B LoRA and to distinguish two training runs by their
`revision`/timestamps.

---

## 4. Result — bi-temporal change VQA (adapter B v2 vs base), n = 600

### 4.1 Adapter arm, verbatim per-class table

| target string | P | R | F1 | tp | fp | fn | support |
|---|---|---|---|---|---|---|---|
| `a large part of the scene` | 0.00 | 0.00 | 0.00 | 0 | 0 | 10 | 10 |
| `a moderate part of the scene` | 0.62 | 0.75 | 0.68 | 57 | 35 | 19 | 76 |
| `a small part of the scene` | 0.49 | 0.53 | 0.51 | 41 | 42 | 36 | 77 |
| `a very small part of the scene` | 0.69 | 0.58 | 0.63 | 45 | 20 | 32 | 77 |
| `buildings … across a large part of the scene.` | 0.00 | 0.00 | 0.00 | 0 | 0 | 10 | 10 |
| `buildings … across a moderate part of the scene.` | 0.69 | 0.69 | 0.69 | 53 | 24 | 24 | 77 |
| `buildings … across a small part of the scene.` | 0.49 | 0.65 | 0.56 | 50 | 52 | 27 | 77 |
| `buildings … across a very small part of the scene.` | 0.68 | 0.55 | 0.60 | 42 | 20 | 35 | 77 |
| `no` ⚠️ | 0.41 | 0.32 | 0.36 | 9 | 13 | 19 | **28** |
| `there is no annotated change … between the two dates.` ⚠️ | 0.21 | 0.21 | 0.21 | 3 | 11 | 11 | 14 |
| `yes` | 0.88 | 0.95 | 0.91 | 73 | 10 | 4 | 77 |

**accuracy 62.2% ± 3.9% (Wilson 95%) · macro-F1 0.4694**

Internal consistency, all verified: `Σ support = 600` · `Σ tp = 373 → 373/600 = 0.6217` ·
`Σ fp = Σ fn = 227` · macro-F1 recomputed from the rounded per-class F1s = 0.4689 vs
0.4694 reported (rounding).

### 4.2 Base arm — the important one

| target string | P | R | F1 | support |
|---|---|---|---|---|
| `yes` | 0.86 | 0.99 | 0.92 | 77 |
| **all ten other classes** | **0.00** | **0.00** | **0.00** | 523 |

**accuracy 12.7% · macro-F1 0.0837** (= 0.92 / 11 — the entire macro-F1 comes from one class)

The base arm's whole 12.7% is **76 of the 77 sampled `yes` rows**. It answered `yes`
unconditionally. On a test split that is 96% positive (334 of 348 pairs), "always say
yes" is a strong degenerate strategy — and it scores **0.00 on every other target
string**, because it never produces the magnitude vocabulary or the templated
descriptions at all.

**This is the adaptation evidence, and it is stronger than the blended delta suggests.**
Read the delta as: *the base model cannot express the required answers; the adapted model
can, and is right on them 62% of the time.*

**Do not read +49.5 points as "49.5 points better at detecting change."** Most of it is
vocabulary acquisition (Q2/Q3), not discrimination. See §4.4.

### 4.3 ⚠️ The `no` row is two different things fused together

The converter asks three questions per image pair:

| # | question | gold answer space |
|---|---|---|
| Q1 | "Has the built-up area changed between the two images?" | `yes` / `no` |
| Q2 | "How much of the scene changed between the two dates?" | six **magnitude** phrases, including `no change` |
| Q3 | "Describe the change between the first and the second image." | templated sentences |

The canonicalisation rule decided a `change_vqa` label by looking for a leading
`yes`/`no`. Q2's answer for an unchanged pair is the magnitude phrase **`no change`** —
which *starts with "no"* — so it was folded into the yes/no class. That is why:

* the `no` row shows **support 28** while the matching Q3 row (`there is no annotated
  change…`) shows **support 14**;
* 28 = 14 real Q1 `no` answers + 14 Q2 `no change` magnitudes.

**Consequences, stated without softening:**

1. **The LEVIR-CD+ test split contains 14 negative pairs and 334 positive pairs.** Not 28,
   and not the 35 that was assumed when the sampling budget was sized.
2. The blended 62.2% is **mildly flattered**: a `no` prediction scored as correct against
   a `no change` gold.
3. **`R = 0.32` on that row is not the negative-class recall.** The 9 correct predictions
   are spread over 14 Q1 rows and 14 Q2 rows, so the true Q1 negative recall lies in
   **[0/14, 9/14] = [0%, 64.3%]**. The exact split is recoverable from the JSON's
   `pairs` array by grouping on `query` — it does not require re-running anything.

This is a genuine defect in the scoring code, found by reading this run's output. It is
fixed (§7.2) but **the fix postdates the run**, so the numbers above are the run's
numbers, defect included.

### 4.4 What the three questions score separately (derived, pending confirmation)

Because the fused `no` row hides the per-question picture, the honest decomposition is:

| question | base | adapter | note |
|---|---|---|---|
| Q1 changed? (n≈91) | ~85% — **by always answering yes**, negative recall **0/14** | higher; negative recall **between 0/14 and 9/14** | the discrimination question |
| Q2 how much? (n≈254) | **0%** | ≈56% | pure vocabulary acquisition |
| Q3 describe (n≈255) | **0%** | ≈58% | pure vocabulary acquisition |

A reconstruction of this run's table (matching all 11 published rows exactly on
tp/fp/fn/support) yields Q1 84.6% → 90.1%, Q2 0% → 56.3%, Q3 0% → 58.0%, and Q1 negative
recall 0/14 → 9/14. **Those specific figures are from the reconstruction, not from the
run**; the reconstruction's miss-routing was arbitrary, so the true split may differ
slightly. The qualitative claim — *base is 0% on Q2/Q3 and degenerate on Q1* — is read
directly from the run and is certain.

### 4.5 Statistical power on the negative class

| quantity | value | Wilson 95% |
|---|---|---|
| adapter recall on `no` (upper bound, 9/14) | 64.3% | ±22.4% → [42%, 87%] |
| base recall on `no` (0/14) | 0.0% | ±10.8% → [0%, 11%] |
| adapter recall on `yes` (73/77) | 94.8% | ±5.3% |
| blended change_vqa accuracy (373/600) | 62.2% | ±3.9% |

**14 negative pairs is the entire negative class of LEVIR-CD+ test.** No sampling budget
can tighten that interval; it is a property of the dataset. Any claim about negative-class
recall from this benchmark carries a ±22-point interval and must be reported with its n.

### 4.6 Two systematic gaps worth investigating

* **`a large part of the scene` — 0/10, and its Q3 counterpart 0/10.** The model never
  predicts the largest magnitude bucket. Consistent with a training distribution in which
  large-change pairs are rare.
* **`no change` as a Q2 magnitude — 0 correct.** It can answer Q1 `no`, but never emits
  the magnitude phrase for an unchanged scene. Format/vocabulary gap, not necessarily a
  perception failure.

---

## 5. Result — optical + SAR cross-modal (adapter A vs base), n = 100

| | set-exact accuracy | macro-F1 over 35 class combinations |
|---|---|---|
| **base** | **0 / 100** | **0.0000** — every one of the 35 combinations P=R=F1=0.00 |
| **adapter** | **≈23 / 100** (derived: Σ recall×support over the 9 nonzero classes) | **0.1235** |

Adapter's nonzero combinations, verbatim: `crops` P0.60 R1.00 · `rangeland` P0.50 R1.00 ·
`crops|trees` P0.50 R1.00 · `bare ground|rangeland` P0.43 R1.00 · `rangeland|trees`
P0.14 R1.00 · `water` P0.33 R0.67 · `built area|crops` P0.11 R1.00 · `crops|rangeland`
P0.17 R0.50 · `trees` P1.00 R0.33. Supports are 1–4 rows each.

### 5.1 Why the base arm's 0.000 is not "the base knows nothing"

The base model scored **tp = 0 on all 35 target combinations**, and precision is 0.00 for
all 35 as well. A model that understood the scene but answered in free-form prose
(*"a rural landscape with fields and scattered trees"*) produces exactly this signature:
it never emits the terse `X and Y and Z` class-list format, so exact set matching scores
zero.

**Caveat on the evidence:** the readout prints P/R/F1 but not tp/fp, so `P = 0.00` cannot
by itself distinguish *"never emitted the format"* (fp = 0) from *"emitted the format but
always the wrong set"* (fp > 0). The distinction matters — the first is a format failure,
the second a knowledge failure. It is settled instantly by reading five `pred` strings
from `arms["BASE (un-adapted)"].cross_modal.pairs` in the JSON. **That has not been done
yet, and this document does not claim the answer.**

Either way the comparison is not useless — the SIH requirement is that the *system*
produce machine-usable land-cover from fused optical+SAR input, and a model that will not
produce it in the required form does not satisfy the requirement. But it must not be
presented as "0% knowledge vs 23% knowledge" until those predictions are read.

### 5.2 The metric is too harsh to be informative at this granularity

Set-exact matching over 35 combinations with supports of 1–4 rows each means one row
moves a class from 0.00 to 1.00. The informative question — *can it find the water? the
built-up area?* — is a **multi-label per-primitive-class** metric over the seven DynamicWorld
labels present (`water`, `trees`, `rangeland`, `crops`, `built area`, `bare ground`,
`flooded vegetation`), which is computable from the same `pairs` array without re-running.
**That number is not in this document yet** and should be before any cross-modal claim is
made to a judge.

### 5.3 Honest assessment

Cross-modal fusion is the **weakest** of the four capabilities on this evidence: ≈23%
set-exact, macro-F1 0.124, with most classes at zero. The delta over base is large but
the absolute level is low and the metric conflates format with knowledge. Report it as
*demonstrated but weak*, not as a strength.

---

## 6. Canonicalisation rule used by the run

```
cross_modal : sorted set-equality on classes split by " and "   (order-insensitive)
change_vqa  : leading "yes"/"no" detection, else exact normalised string   ⚠ see §4.3
vqa         : exact normalised string
caption     : token-overlap F1, threshold 0.34 for the pass/fail column
normalisation: lowercase, collapse whitespace
```

Accuracy and per-class metrics are computed from **one** canonical label, so they cannot
disagree. (An earlier version matched accuracy leniently and per-class exactly, which
produced `accuracy 12.5%` beside `macro-F1 0.000` in the same run — both true of
different things. That is fixed and regression-tested.)

---

## 7. Defects found by this run, and their status

This run was produced by `benchmark.py` md5 **`27a8376955d2136278f14009d32b94e5`**
(27,495 bytes). Reading its output exposed two further defects. Both are fixed in md5
**`2f46fd70de56c05c892ee71203500a1d`** (29,492 bytes), **which postdates the run**. The
numbers in §4 and §5 are therefore the *pre-fix* numbers.

### 7.1 vqa sampler — the measurement is void

`_stratum_key` returned the raw normalised answer for `vqa`. RSVQA counting questions each
have a **unique integer** answer, so every one became its own stratum with support 1. The
sampler allocates scarcest-first, so at `--n 100` it spent the **entire budget on 100
unique integers** and never drew a single `yes` / `no` / `rural` / `urban` row.

Observed in the run: the vqa per-class table is 100 rows, all numeric, all `support=1`,
all `P=R=F1=0.00`, both arms. **Accuracy 0.0% for adapter and base alike.**

*Fix:* numeric answers collapse to one sampling stratum (`__numeric_count__`). At
`--n 100` the sample is now 20 each of `yes` / `no` / `rural` / `urban` / counting.
Counting questions remain *represented* rather than silently dropped, and are reported
separately, because exact match on a free integer is not something any model can be
credited with here.
*Status:* fixed, regression-tested, **not re-run**. The vqa capability currently has no
valid measurement.

### 7.2 `canon()` fused a magnitude phrase into the yes/no class

Described fully in §4.3. *Fix:* the six magnitude phrases are matched exactly and
returned before the leading-yes/no rule is applied; the phrase list is test-locked against
the converter's `CHANGE_BUCKETS` so the two cannot drift.
*Status:* fixed, regression-tested, **not re-run**. The published `no` row stands as
printed, with the interpretation given in §4.3.

### 7.3 Defects fixed *before* this run (context — an earlier run produced nothing)

A prior attempt burned ~2.5 h of GPU and wrote no output. Four defects, all fixed and all
verified in this run:

1. `del v[0]` on the tuple returned by `build_runtime()` raised `TypeError` **during
   cleanup, after both arms had finished inferring** — discarding the whole run. Now
   `loaded.clear()`, and results are written **after every arm**.
2. The stratified sampler kept allocating one row per stratum after its budget reached
   zero (`max(1, …)`), sampling 927 rows at `--n 100`. Now stops when the budget is spent.
3. The long-form `cross_modal` variant (§2.2) was in the scoring pool; ~800 unique strings.
   Now excluded at load, with the count printed.
4. Accuracy and per-class used different matching rules. Now one canonical label feeds both.

The per-arm save in (1) is why this run's results survived to be read at all.

---

## 8. What is **not** established — do not let this document be read past its evidence

1. **v1 vs v2 adapter B.** The retrain that produced v2 added rebalanced synthetic
   zero-change negatives specifically to fix negative-class recall. **This benchmark
   contains no held-out v1 numbers**, so it cannot say whether v2 improved anything. The
   earlier "40% → 60%" comparison was **n = 10 on training rows** (memorisation, not
   generalisation) and Fisher's exact gave **p = 0.656** — indistinguishable from noise.
   With only **14 negative pairs** in LEVIR-CD+ test, *no* run on this split can settle it
   at useful confidence (§4.5).
2. **Single-image VQA.** Void (§7.1). Currently no number.
3. **Captioning quality.** The run scored it, but the readout surfaced
   `macro-F1 = None` (caption has no per-class table) and the mean token-overlap F1 was
   never printed. The value is in `benchmark_adapter_a.json`. Token overlap is a weak
   proxy in any case: a human pass/fail on *"names the dominant land cover, invents
   nothing"* is more defensible to a judge than any automatic score here.
4. **Cross-modal per-primitive-class performance.** Not computed (§5.2).
5. **Adapter attribution.** Not embedded in the results file (§3).
6. **Exact Q1/Q2/Q3 decomposition.** Bounded and reconstructed (§4.4) but not read
   directly from the run.
7. **Agentic orchestration, confidence calibration, visual-evidence grounding.** These
   are SIH requirements and are implemented and unit-tested in the backend (Tasks 1–4:
   pixel budget, bi-temporal validation with HTTP 400, real confidence from mean top-1
   token probability, cross-modal modality validation with HTTP 400) — **but they were not
   part of this benchmark.** This document evidences model capability, not the serving
   layer. Do not conflate them. Note on grounding specifically: since this paragraph was
   written, `backend/evidence.py` added *visual evidence*, but as deterministic radiometric
   differencing carrying `is_model_prediction: false` in pixel coordinates — **learned
   grounding (model-produced boxes/masks) remains unimplemented and unbuilt** (§12).
8. **Nothing here is a population accuracy.** The sample is deliberately rebalanced
   (§2.3).

---

## 9. Reproduction

```bash
# the benchmark itself (no training, no weight writes)
python training/benchmark.py \
    --eval rsvqa_eval.jsonl ssl4eo_eval.jsonl --adapter-a <A> \
    --arms both --n 100 --out benchmark_adapter_a.json

python training/benchmark.py \
    --eval levir_eval.jsonl --adapter-b <B_v2> \
    --arms both --n 600 --out benchmark_change_adapter_b.json

# the whole local verification surface (no GPU, no torch, no weights needed)
bash tests/run_all.sh          # 13 suites, 775 checks, exit 0
                               # (suite 7 self-skips without transformers/torchvision;
                               #  suite 13 = evidence/report/UI, 140 checks)
python tests/test_benchmark.py #  91 checks, 27 written from this run's output
python tests/verify_bench.py   #  59 checks on the benchmark notebook
```

Eval files are built by `training/convert.py` from the authors' splits with
`--split-tag eval`; `training/fetch_data.py` retrieves LEVIR-CD+ `test` and SSL4EO `val`.
Dataset licences: RSVQA-LR (as distributed), LEVIR-CD+ (as distributed on Hugging Face),
SSL4EO-S12 v1.1 **CC-BY-4.0**.

---

## 10. File inventory

| path | what |
|---|---|
| `training/benchmark.py` | the evaluator (md5s in §7) |
| `training/convert.py` | dataset → JSONL converters, 1:1 strict, split-tagged, audited |
| `training/fetch_data.py` | held-out split retrieval, split-aware completeness check |
| `training/kaggle_satquery_BENCH.ipynb` | the benchmark notebook (30 cells, trains nothing, writes no weights) |
| `tests/test_benchmark.py` | 91 checks on scoring, sampling, split filtering, refusal paths |
| `tests/verify_bench.py` | 59 checks that the notebook is safe to run beside trained weights |
| `tests/run_all.sh` | all 13 suites |
| `tests/test_evidence_report_ui.py` | 140 checks: evidence vs KNOWN ground truth, report store/renderer, UI contract, end-to-end HTTP |
| `backend/app.py`, `backend/common.py` | the serving layer (Tasks 1–4) — **not** benchmarked here |
| `backend/evidence.py` | deterministic visual evidence (radiometric differencing) — **not** model grounding, §12 |
| `backend/report.py`, `backend/ui.py` | self-contained downloadable report; single-page operator UI |
| `backend/SUMMARY.md`, `backend/SCORECARD_FOR_REVIEWER.md` | SIH summary and honest flaws/good-things scorecard |

---

## 11. If you are the reviewer: the questions worth asking

1. *"Your base arm scored 12.7% — is that a real base model or a strawman?"* — Real, and
   it is **not** a strawman in the direction that matters: it scores 0.00 on ten of eleven
   target strings because it never produces them. But note it *does* score ~85% on the
   binary question by always answering yes, so the binary delta alone is small. The
   adaptation evidence is the vocabulary, not the discrimination.
2. *"62.2% on what distribution?"* — A deliberately rebalanced sample (§2.3). Population
   accuracy would be higher and is not reported, because per-class is the point.
3. *"14 negatives?"* — Yes. That is LEVIR-CD+ test. The interval is ±22 points and no
   budget fixes it (§4.5).
4. *"Which adapter?"* — v2 by operator attribution; not embedded in the results file. This
   is the weakest link (§3).
5. *"Why are 900 cross-modal rows excluded?"* — §2.2. Challenge it if you think it
   flatters the result.
6. *"Is the vqa 0.0% real?"* — No. It is a sampler bug and the capability is unmeasured
   (§7.1). Anyone quoting 0.0% as a VQA result is quoting a defect.
7. *"Does this prove the synthetic-negative retrain worked?"* — **No.** Nothing here does
   (§8.1).

---

## 12. Status of the review-list gaps — added 2026-09-13

The critique that triggered this round listed seven gaps. Each was verified
against the workspace before any code was written. Two of the seven premises were
wrong and are corrected here, because a reviewer who inherits them will chase
files that do not exist:

| # | claim as received | verified verdict |
|---|---|---|
| 1 | no visual evidence; a `vectorizer.py` computes embeddings nothing consumes | gap **REAL**, premise **FALSE**: no `vectorizer.py` exists anywhere in the workspace (zero files matching `*vector*` or `*geojson*`), and `/analyze` returned exactly 8 fields with no bbox, mask or region |
| 2 | single-image VQA is void | confirmed (§7.1) |
| 3 | no downloadable report | confirmed |
| 4 | cross-modal is weak and rides adapter A | confirmed (`TASK_ADAPTER` routing) |
| 5 | grounding was never attempted | confirmed |
| 6 | adapter attribution not locked | confirmed |
| 7 | "the frontend silently falls back to mock data when `/analyze` errors" | **UNVERIFIABLE**: no frontend existed in this workspace at all (zero `.ts/.tsx/.js/.jsx/.html` files, zero `asset_id`/`tile_url` hits). If such a frontend exists it lives in another session and is not part of this deliverable |

### 12.1 What was built in response

All of it is inside the 13-suite gate; suite 13 adds 140 checks, of which the
evidence ones compare against **known ground truth** (a 40×40 injected square
must come back as bbox `[60, 60, 100, 100]`, and it does).

1. **Visual evidence** — `backend/evidence.py`, computed only for a bi-temporal
   optical pair. Deterministic radiometric differencing: per-channel shared
   pooled-range scaling, per-frame median centring, max over channels, threshold
   `median + 5·1.4826·MAD` floored at 0.02. Returns regions (pixel bbox, area,
   fill, share), an overlay PNG drawn on the exact rendering the model was shown,
   a pixel-coordinate GeoJSON, and a three-state model-vs-pixel cross-check
   (AGREE / DISAGREE / **WITHHELD**). Every payload carries
   `is_model_prediction: false`, `georeferenced: false`,
   `coordinate_space: "pixel"` and a `caveats` list.
   Designs that were tried, measured and rejected, in order:

   | design | measured failure |
   |---|---|
   | per-frame independent percentile stretch (what `common.load_image` does) | 47.3% of a frame falsely flagged on a pair whose true change is 4.0%; recall 10.8% of a 1.6% change in a 900×700 pair |
   | shared percentile stretch + Otsu | Otsu returned 0.7988 on a 900×700 pair whose pooled 2/98 window had collapsed to 5 grey levels → recall 16.9%; the same scene at native resolution gave 0.08. A threshold that moves 10× with interpolation is not quotable |
   | luminance (greyscale) differencing | blind to a luminance-neutral colour change (green field L=98.21 → grey L=98.00): 0.0000% flagged; per-channel localises it to exactly `[110, 20, 190, 90]` |
   | prefix-based yes/no parsing of the answer | "north-west quadrant shows new buildings" read as the model *denying* change; same bug class as §7.2, replaced by word-boundary phrase matching with an explicit WITHHELD state |

   The shipped rule scores, on the same fixtures: 100% recall / 0.27% false on the
   1.6% change pair; 100% / 0.00% on a subtle +22-grey-level change; and on a
   zero-change pair carrying ±4 levels of noise it raises its own threshold
   (0.02 → 0.37) and flags nothing.

2. **Downloadable report** — `backend/report.py`, `GET /report/{id}`
   (`?download=0` inline, `?format=json`). Self-contained HTML: inline CSS, the
   overlay embedded as a data URI, the confidence printed with its meaning and
   its non-calibration, the evidence caveats, and the normalisation parameters.
   Held in process memory, capped at 50 with FIFO eviction, not persisted, not
   authenticated — all four stated in the report footer and in the payload's
   `limitations`.

3. **Minimal frontend** — `backend/ui.py`, served at `GET /` by the backend
   itself. One page, inline CSS/JS, no CDN, no build. Exactly two `fetch(` calls
   (`/analyze`, `/health`) and no fallback path — pinned by tests, because the
   critique's gap 7 could not have been observed in this codebase and the new
   page must not introduce it. Server refusals are rendered verbatim.

4. **Valid VQA number** — the re-run is in the operator's hands on Kaggle (fixed
   `benchmark.py` md5 `2f46fd70…`). **No number exists yet and none is quoted
   here.** §7.1 stands until that run completes.

### 12.2 Still not done, deliberately

- **Learned grounding.** Neither LoRA adapter ever saw a box or mask token, so
  prompting them for coordinates would emit invented geometry. The honest path is
  a grounding dataset (e.g. boxes derived from LEVIR-CD+ change masks) plus a
  held-out benchmark; until then the overlay is evidence about pixels and says so.
- **Georeferencing.** An upload carries no CRS and no geo-transform. Producing
  WGS84 geometry from it is impossible, not merely unimplemented; the GeoJSON is
  therefore pixel-coordinate with an explicit do-not-load-as-WGS84 warning.
- **Semantic change.** The overlay flags radiometric difference. Illumination,
  season, cloud shadow and sub-pixel misregistration all produce difference, and
  no threshold fixes that. Stated in every payload's `caveats`.
