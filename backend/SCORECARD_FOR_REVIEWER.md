# SatQuery AI — honest scorecard for external review

Written to be sent back to a reviewer. Deliberately unflattering where the work
is unflattering. Every claim below is either measured, unit-tested, or explicitly
labelled as unbuilt.

**Date of this assessment:** adapter A trained; adapter B v1 trained; adapter B v2
(rebalanced negatives) trained and probed. **No held-out numbers exist yet for
anything** — every figure below is still a 10-row training-split probe.

---

## 0. On the review we received

Five methodological points were raised. **All five were correct and all five are
now implemented:**

| # | the point | status |
|---|---|---|
| 1 | evaluate on a held-out split only, using the dataset authors' splits | **implemented** — `benchmark.py` filters on a `split` stamp and *refuses* rows it cannot prove are held out |
| 2 | 50–100 samples per capability | **implemented** — default n=100, achieved n printed beside every score |
| 3 | per-task metric; per-class precision **and** recall for change detection, never one blended accuracy | **implemented** — per-class P/R/F1 + support + macro-F1; blended accuracy printed only to show how far it overstates |
| 4 | compare adapter vs un-adapted base model on the same rows | **implemented** — `--arms both`; the delta is printed as the SIH-necessity evidence, and the script says so plainly if the adapter *loses* |
| 5 | a reusable script that dumps a results table | **implemented** — `training/benchmark.py`, JSON + table, 46 unit checks |

**One claim in the review was factually wrong.** It stated the delivered zip
ships a `.venv` folder with a full pip vendor tree. It does not.

```
$ unzip -l backend_satquery.zip   →  19 entries, 114.9 KB uncompressed
   no .venv/, no site-packages/, no vendored wheels
```

A `.gitignore` inside the zip *mentions* `.venv/` (so it stays out of the repo);
mentioning a path is not shipping it. This matters because "the deliverable
contains a virtualenv" implies a broken packaging process, and the packaging
process is not broken.

---

## 1. FLAWS — in severity order

### CRITICAL

**F1. Every number we have published came from training rows.**
The probe scores ~10 rows sampled from the *training* file. That measures
memorisation of homework, not generalisation. A 10-item binary probe has a 95%
CI of roughly **±25 points**: the published "70%" is statistically
indistinguishable from 45% or from 95%. Quoting it as an accuracy was wrong.
*Status:* replacement built and tested; **not yet run**. The correct current
statement is *"we have zero generalisation measurements."*

**F2. Adapter B v1 cannot say "no".**
100% recall on annotated-change pairs, **40% on unchanged pairs**. Root cause
was measured, not guessed: LEVIR-CD+ is 89.8% positive (572/637); at 1,600 rows
consumed from 1,911 (0.84 epochs) the model saw ≈**164 negative rows** — one
negative per nine positives. It learned the prior.
*Status:* rebalancing built and **trained**. The v2 probe reads:

| | v1 | v2 | Fisher exact |
|---|---|---|---|
| change_vqa, unchanged pairs (**REAL**) | 40% (4/10) | 60% (6/10) | **p = 0.656** |
| change_vqa, unchanged pairs (**SYNTHETIC**) | n/a | 100% (10/10) | — |
| change_vqa, annotated change | 100% (10/10) | 100% (10/10) | — |
| cross_modal | 70% (7/10) | 60% (6/10) | **p = 1.000** |

**The improvement is not statistically significant.** 95% CIs are [14%, 66%] for
v1 and [34%, 86%] for v2 — they overlap almost entirely. The cross_modal "drop"
is likewise pure noise (p = 1.000); it must not be reported as a regression. At
n=10 this probe cannot detect a 20-point change. **F2 is therefore still open,
and the only way to close it is the held-out benchmark at n=100.**

### HIGH

**F3. "Confidence" is not calibrated.**
It is the mean top-1 token probability — a real measured quantity, but nothing
establishes that 0.8 means 80% correct. No reliability diagram, no ECE, no
temperature scaling. The word "confidence" oversells what is computed.

**F4. Captioning quality is effectively unmeasured.**
Token-overlap F1 is a weak lexical proxy. No human evaluation was run. The
honest metric at hackathon scale is human pass/fail on *"names the dominant land
cover, invents nothing"* — and we have not collected it.

**F5. No ablation, no seed variance.**
One run per adapter. We cannot separate the adapter's effect from seed noise, and
we cannot attribute the cross-modal result to SAR specifically (no
optical-only baseline at the same n).

**F6. `visual evidence` is partial and arguably mislabelled.**
We return input image metadata and record the preprocessing stage in the trace.
There are **no bounding boxes, heatmaps, or attention localisations**. Calling
metadata "visual evidence" is a stretch against the SIH wording.

### MEDIUM

**F7. A downscale may be silently dropping small change regions.**
`fetch_data.py` resizes LEVIR masks 1024→512 with `NEAREST`. NEAREST can skip
thin/small change polygons. **Unverifiable** — the originals were deleted from
the Kaggle working directory. If it does drop them, it worsens the 89.8%
imbalance that caused F2.

**F8. Synthetic negatives are too easy — CONFIRMED, and this is the most
important finding in the v2 run.**

The mitigation worked: scoring REAL and SYNTHETIC negatives separately exposed
something a blended negative score would have hidden. v2 scores **100% on
synthetic and 60% on real negatives**.

The cause is in the converter, and it is a design flaw in the fix itself:

```
synth_shift_px = 6        # +/-6 px translation on a 512 px image = ~1.2% displacement
pad = np.pad(arr, mode="edge")
                          # NO photometric perturbation of any kind:
                          # no brightness, contrast, hue, noise or seasonal simulation
```

Synthetic pairs are **>98% pixel-identical**. Real negatives are two separate
satellite acquisitions of the same place — genuinely different illumination,
season, atmosphere and vegetation, with no *annotated built-up* change. So:

* synthetic negatives teach *"visually near-identical → no change"* — a true rule,
  but the trivial half, and one the base model likely already had;
* the skill actually required is *"visibly different, but the built-up area did
  not change"* — covered only by the **65 real** negative pairs.

Composition of the v2 negative class:

```
positive pairs (annotated change)          572
REAL negative pairs (hard)                  65
SYNTHETIC negative pairs (easy)            316
negative fraction of all pairs           40.0%   <- hit the target exactly
SHARE OF NEGATIVES THAT ARE SYNTHETIC     82.9%   <- and filled it with the easy kind
```

The rebalancing fixed the **ratio** and missed the **difficulty distribution**.
The grounding rule is still sound — zero-change is true by construction, and I
would defend that — but *provably unchanged* is not the same as *representative
of the negative class*. I optimised for label correctness and missed
distributional realism. That is my error, not the reviewer's catch.

The candidate fix is photometric perturbation of the same-scene pair (brightness,
contrast, hue jitter, sensor-like noise) so synthetic negatives *look* different
while remaining provably unchanged. **Do not run it yet** — at n=10 we cannot
even confirm v2 beat v1, so a further 3-hour retrain would be spent on an
unmeasured hypothesis. Benchmark first, then decide.

**F9. cross_modal rests on ~900 pairs from one source.**
SSL4EO-S12, Esri 11-class taxonomy, LULC purity gate 0.95. Single sensor
combination, single taxonomy, single region distribution. Generalisation to other
sensors or regions is untested.

**F10. Adapter B was under-trained by construction.**
0.84 epochs. The run length was chosen by time budget, not by convergence.

**F11. Hosting is not a deployment.**
The free endpoint is a Kaggle GPU session (≈12 h cap) behind a Cloudflare quick
tunnel. The URL **dies with the session** and is **public and unauthenticated**.
Fine for a demo; it is not a production claim and should never be presented as
one.

**F12. No latency or throughput figures** for the served endpoint.

---

## 2. WHAT GENUINELY HOLDS UP

**G1. No label in the training data was invented.**
Change labels come from counting pixels in the **expert-annotated** LEVIR mask.
Cross-modal labels come from Esri LULC behind a 0.95 purity gate, with no-data
excluded. RSVQA captions are synthesised from **each image's own** ground-truth
answers. The converter structurally cannot teach the model to confabulate a
change nobody annotated — which is exactly why F2 is a *class-balance* bug and
not a *hallucination* bug.

**G2. Synthetic data obeys a stated grounding rule.**
Built only from same-scene, same-acquisition pairs → zero-change is true by
construction, not assumed. Every such row is stamped
`provenance=synthetic_zero_change`, and evaluation separates REAL from SYNTHETIC
negatives so a shortcut cannot hide behind an average.

**G10. The probe gate did its job on the v2 run.**
It printed `!! BELOW 70%: cross_modal land cover, change_vqa NO-change (REAL)`
and `!! Do not ship it` — on a run where the headline detection score was 100%
and the synthetic-negative score was 100%. A gate that refuses to pass a model
with two perfect scores, because a third number is bad, is worth more than the
scores. Separating REAL from SYNTHETIC negatives is what turned a comfortable
result into a diagnosable one.

**G3. The failure was found, measured, root-caused numerically, and published.**
The 40% is limitation #1 in the summary, with its cause quantified (89.8%, 164
negatives). It was never blended into a single accuracy. The per-class collapse
was reported *before* an external reviewer had to find it.

**G4. The pipeline fails loudly instead of degrading silently.**
A conversion whose answers are all `"no"` **aborts and deletes its own output**.
A missing adapter → `exit 1`. `torchao` present → `exit 1` (it breaks PEFT).
A skipped probe counts as a failure, not a silent pass. 485 checks over 10 suites,
all green.

**G5. Bad input is rejected, not guessed at.**
`change_vqa` without two *distinct* timestamps → HTTP 400. `cross_modal` without
exactly one optical + one SAR → HTTP 400. Identical pair to `change_vqa` is
caught by a byte-equality guardrail.

**G6. Serving and evaluation are the same code path.**
`benchmark.py` reuses `common.py`'s `load_image()` and `format_messages()`, so
what is benchmarked is byte-for-byte the prompt and preprocessing the deployed
backend uses. It also pins one GPU before torch is imported — the multi-GPU
DataParallel + 4-bit PEFT crash was diagnosed and fixed, not worked around.

**G7. Adapters are swappable without a code change.**
`ADAPTER_A_PATH` / `ADAPTER_B_PATH`, so v1 and v2 sit side by side and the
working v1 stays as fallback. Trained weights are never deleted or regenerated
without asking.

**G8. A 3-hour unattended run is protected.**
Checkpointing every 50 steps with `save_total_limit=2`, and the save path was
smoke-tested *before* the long run — because the failure mode that mattered was
"crashes at hour 2 with nothing saved."

**G9. It is reproducible from one file.**
The training notebook is self-contained, needs no credentials, checks before it
downloads, and is gated by a 72-check verifier so a syntax error cannot reach a
2 AM unattended run.

---

## 3. THE BENCHMARK ANSWER (point by point)

Run on Kaggle after training. Held-out sources are **the dataset authors' own
splits**, not invented ones:

| capability | held-out split | download |
|---|---|---|
| `vqa` + `caption` | RSVQA-LR `val` — already on the mount | **0 MB** |
| `change_vqa` | LEVIR-CD+ `test` — 348 pairs, 2 parquet shards | ≈990 MB |
| `cross_modal` | SSL4EO-S12 `val` — the directory is `val/`, not `validation/` (which 404s) | ≈400 MB |

`--synth-neg-ratio 0.0` is pinned for benchmark conversions: synthetic negatives
are a *training* rebalancing device and must never enter a held-out set.

**Why per-class is non-negotiable — demonstrated, not asserted.** Simulating
adapter B v1's behaviour (answers "yes" unconditionally) on a 90%-positive set:

```
blended accuracy : 90.0%    <- looks fine
macro-F1         : 0.474    <- collapse visible
  no    P=0.00 R=0.00 F1=0.00 support=10
  yes   P=0.90 R=1.00 F1=0.95 support=90
```

That single blended 90% is the number that would have gone to a judge.

**Why n matters — Wilson 95% CI half-width at a 70% point estimate:**

```
n=10    +/-24.8%      n=50   +/-12.3%
n=100   +/- 8.8%      n=348  +/- 4.8%
```

This is why the published 70% should never have been quoted bare.

**Why sampling must be stratified — a bug found and fixed in the evaluator
itself.** Its first version drew rows uniformly at random. On the LEVIR-CD+ test
split (348 pairs, 89.9% positive) that produces:

```
uniform n=100      support: no=6    yes=94    -> CI on no-change recall +/-30.2%
stratified n=100   support: no=35   yes=65    -> CI on no-change recall +/-15.4%
```

Uniform sampling would have reproduced the exact defect the evaluator was written
to eliminate: starving the only class that is failing. Sampling is now
class-stratified (cross_modal stratifies on the order-insensitive class *set*;
caption is a single stratum because its score is continuous), `--n 0` uses every
held-out row, the sample is seed-reproducible, and the **natural class prior is
printed next to the rebalanced sample** so a balanced sample is never mistaken
for a population accuracy. 18 checks cover this.

**The structural ceiling, stated up front.** LEVIR-CD+ contains only ~35 held-out
no-change pairs. Stratified sampling captures all of them, so **±15 points is the
floor for no-change precision from this dataset alone** — no amount of extra
compute tightens it, because the negatives do not exist. Getting a tighter
interval on the metric that matters most requires a second change-detection
dataset, which is a data-collection decision, not a modelling one. That is a
limitation of the benchmark and it belongs in the report next to the number.

---

## 4. WHAT TO TELL A JUDGE

The version that survives one follow-up question:

> "Our change detector has **100% recall on annotated change but only 60% on
> unchanged pairs** — it still over-predicts change. The cause is measured:
> LEVIR-CD+ is 89.8% positive, so the first version saw ~164 negative examples.
> We rebalanced the negative class to 40% using grounded zero-change negatives
> built from same-scene pairs, and retrained. That moved the probe from 40% to
> 60% — but at n=10 that is **p = 0.656, not significant**, so we are not
> claiming a fix. It also exposed a flaw in our own rebalancing: 83% of the new
> negatives were pixel-near-identical pairs, which the model aces at 100% while
> real no-change pairs — different acquisitions of the same place — sit at 60%.
> We have built a held-out benchmark on the **dataset authors' own test splits**
> with **class-stratified sampling**, **per-class precision and recall**, and a
> **base-model comparison**, because our probes ran on training rows and were not
> a benchmark. LEVIR's test split holds only ~35 no-change pairs, so ±15 points
> is the measurement floor from this dataset — we are stating that rather than
> quoting a tight number we cannot support."

The version that does not survive one follow-up:

> "Change detection: 100%."

It also does not survive:

> "Our negatives are balanced now, and we score 100% on them."

---

## 5. OPEN ITEMS, in the order they should be done

1. **Run STEP 11** and get the first real held-out numbers. Until then every
   accuracy statement in this project is provisional. **Benchmark v1, v2 and the
   base model on the identical rows** — that is a cheap inference-only run and it
   is the only thing that can settle whether v2 beat v1.
   **Do not start another 3-hour retrain before this.** The v2 evidence is
   p = 0.656; retraining again on an unmeasured hypothesis is how a project
   loses a week.
2. Read the retrained adapter B's `no`-class recall on **held-out REAL** rows,
   with its support and CI. That single number decides whether F2 is fixed.
   Ignore the synthetic-negative score when judging it (see item 3).
3. ~~Confirm SYNTHETIC negatives do not score materially better than REAL ones.~~
   **Done — they do: 100% vs 60% (F8 confirmed).** Next: decide whether to add
   photometric perturbation to synthetic negatives, and re-benchmark. Only after
   item 1 has produced a real baseline.
4. Report the **base-vs-adapter delta**. It is the evidence for the SIH line
   "an unadapted VLM is non-compliant."
5. Collect ~20 human pass/fail caption judgements (F4). Cheap, and it is the only
   honest captioning metric available at this scale.
6. Calibrate or rename `confidence` (F3). Renaming is one line; calibrating needs
   the held-out predictions from step 1.
7. Re-fetch a few LEVIR originals and check the NEAREST downscale against
   full-resolution masks (F7). Currently unfalsifiable, which is its own problem.
