# SatQuery AI — completeness status

**Date:** 2026-09-13 · **Verification:** 13 test suites, 775 checks, exit 0 · **Serving layer:** `backend/`

## Verdict in one paragraph

The backend is **feature-complete against the SIH expected solution** and every
capability below is either measured on held-out data or explicitly labelled as
not measured. What is *not* complete is a short, deliberate list: learned
grounding (never built, documented as future work), two pending measurements
(single-image VQA held-out number, caption score surfacing), and an unaudited
contract between this backend and the Next.js frontend that lives in the project
repo. None of the three blocks a demo or a submission; all three must be stated
to a judge rather than discovered by one.

## Requirement-by-requirement

| SIH requirement | status | evidence | open item |
|---|---|---|---|
| RS-adapted VLM (unadapted VLM non-compliant) | **done, trained** | Qwen2.5-VL-3B-Instruct + 2 LoRA adapters (r=16, α=32, 4-bit NF4); base arm benchmarked alongside | — |
| Single-image VQA | **served; measurement pending** | routing + adapter A live; held-out run was VOID (sampler bug, fixed in `benchmark.py` md5 `2f46fd70…`); re-run in progress on Kaggle | paste the new number; dossier §7.1 stands until then |
| Single-image captioning | **served; score unsurfaced** | works end-to-end; mean token-overlap F1 is inside `benchmark_adapter_a.json` but the readout printed `macro-F1=None` | surface it, or do a human pass/fail ("names dominant cover, invents nothing") |
| Bi-temporal change VQA | **done, benchmarked** | n=600 LEVIR-CD+ test: adapter 62.2% ±3.9 (Wilson), macro-F1 0.469 vs base 12.7% (always-yes degenerate); per-class table published | negative-class recall bounded [0%, 64.3%] by 14 negative pairs — unfixable at this budget, say so |
| Optical + SAR cross-modal fusion | **done, benchmarked with caveats** | n=100 SSL4EO val; base 0.000 is a FORMAT artifact (never emits the class-set syntax), not "knows nothing"; adapter set-exact macro-F1 0.1235 | per-primitive-class scoring not computed |
| Agentic orchestration + auditable trace | **done** | 5-stage trace in every response (compatibility → intent → preprocessor → specialist → evidence) | — |
| Confidence | **done, honestly labelled** | mean top-1 token probability, measured not heuristic; payload + report both state it is NOT a calibrated correctness probability | calibration study not done (not claimed) |
| Visual evidence | **done as deterministic differencing** | regions w/ pixel bboxes, overlay PNG, pixel GeoJSON, 3-state model-vs-pixel cross-check; bboxes verified against known ground truth | **learned grounding NOT built** (future work, §below) |
| Downloadable report | **done** | `GET /report/{id}` self-contained HTML (overlay embedded) or JSON; in-memory, ≤50, unauthenticated — stated in the footer | — |
| Operator UI | **done (minimal)** | `GET /` single page, no CDN, no mock fallback, refusals rendered verbatim | the project's Next.js frontend is separate and its fetch contract is unaudited |
| Free public endpoint | **done, session-bound** | Kaggle GPU session + Cloudflare quick tunnel (`host_on_kaggle.ipynb`) | no free *persistent* GPU host exists; tunnel URL dies with the session |

## Deliberately NOT built (state these, don't hide them)

1. **Learned grounding.** Neither adapter ever saw a box/mask token; prompting for
   coordinates would emit invented geometry. Path forward: grounding dataset
   (boxes from LEVIR-CD+ masks) + dedicated head + its own held-out benchmark.
2. **Georeferenced evidence.** Uploads carry no CRS/geo-transform; WGS84 geometry
   is impossible, not merely missing. GeoJSON is pixel-space with a do-not-load-as-WGS84 warning.
3. **Semantic change.** The overlay flags radiometric difference; illumination,
   season, cloud shadow and misregistration also produce difference. Stated in every payload's `caveats`.
4. **Auth / CORS hardening** on `/analyze` and `/report`. Flagged as a risk, not built (not requested).
5. **v1-vs-v2 adapter B superiority.** Not established and not claimable: 14 held-out
   negatives give ±22-point intervals. The 62.2% figure is v2 vs *base*, which is valid.

## Verification surface (what a reviewer can run, CPU-only)

```
bash satquery/tests/run_all.sh     # 13 suites, 775 checks, exit 0
bash backend/tests/run_tests.sh    # the 3 backend suites, 223 checks
```

Suite 13 checks evidence bounding boxes against synthetic pairs whose true change
is known exactly (injected 40×40 square → bbox `[60, 60, 100, 100]`), pins the four
designs that were measured and rejected (independent stretch, Otsu, greyscale-only,
prefix yes/no parsing), and drives the report + UI over real HTTP.

## Pre-judging checklist

1. [ ] VQA re-run numbers pasted in → update `BENCHMARK_RESULTS_FOR_REVIEW.md` §4/§7.1
2. [ ] Caption score surfaced or human pass/fail recorded
3. [ ] Frontend fetch wrapper audited for mock fallback (`frontend/lib/api/…`)
4. [ ] Weights distribution decided: GitHub **Release assets** (recommended) or LFS — never plain git (157 MB > 100 MB limit)
5. [ ] Demo pair ready: `demo_images/before_2019.png` + `after_2023.png` (true change 7.84%, overlay verified by eye)

## Run it

```bash
cd backend && pip install -r requirements.txt
# put adapter zips' contents in artifacts/adapter_{a,b}/  (or set ADAPTER_A_PATH / ADAPTER_B_PATH)
./run.sh                       # then open http://localhost:8000/
```
