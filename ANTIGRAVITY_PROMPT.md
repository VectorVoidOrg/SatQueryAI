# PASTE THIS INTO ANTIGRAVITY (new session, opened on the SatQueryAI repo)

You are working on **SatQuery AI**, a Smart India Hackathon submission: an agentic
remote-sensing vision-language assistant. The repo contains a **complete, tested,
FROZEN FastAPI backend** in `backend/` (verified by 775 automated checks) and a
**Next.js frontend** in `frontend/` whose API client does NOT match the backend
contract and may contain mock/fallback paths. Your job is the frontend and the
integration glue. The backend is not your job.

## Ground rules — violating any of these is a failed task

1. **Never edit** `backend/app.py`, `backend/common.py`, `backend/evidence.py`,
   `backend/report.py`, `backend/ui.py`, or anything under `backend/tests/`.
   If you believe a backend change is required, STOP and ask me first.
2. **No mock data anywhere in `frontend/`.** No hardcoded answers, no canned
   responses, no localStorage/sessionStorage caching of results, no
   `setTimeout` fake latency, no silent fallback when a request fails. Every
   rendered value must come from a backend response. On failure, render the
   server's `detail` string verbatim.
3. **Do not train, fine-tune, or download model weights.** Do not commit
   `*.safetensors`, `*.bin`, or adapter zips (each adapter is ~157 MB, over
   GitHub's 100 MB per-file limit). Do not configure Git LFS without asking.
4. **Do not add backend endpoints.** The contract below is fixed.
5. Keep every honesty string below visible in the UI exactly where the
   corresponding data is shown. Deleting a caveat to make the UI cleaner is a bug.

## Read these first, in this order

1. `backend/README.md` — sections 4 (API), 4.1 (trained query phrasings), 4.2 (UI/evidence/report)
2. `STATUS_SUMMARY.md` — what is complete, what is deliberately not built
3. `backend/app.py` — the `analyze()` route: routing rules, the HTTP 400 guardrails, the response shape
4. `BENCHMARK_RESULTS_FOR_REVIEW.md` — section 12 (what the evidence is and is not)

## The fixed backend contract

`POST /analyze` — multipart/form-data:
- `files`: 1 or 2 images (GeoTIFF/TIFF/PNG/JPEG)
- `query`: natural-language question (use the trained phrasings from README 4.1 for best results)
- `modalities`: comma list, one per file, from `optical|multispectral|sar`
- `timestamps`: comma list `YYYY-MM-DD` (or empty), one per file
- `bands`: comma list of 1-based band indices, default `1,2,3`
- `dataset`: free string, default `operational`

`200` response JSON:
```
task_intent, query, answer, confidence, confidence_source, duration_seconds,
inputs[{filename, modality, timestamp}],
visual_evidence: null | {status, source, is_model_prediction, georeferenced,
    coordinate_space, changed_pixel_fraction, region_count,
    regions[{bbox_pixels, area_pixels, fill_fraction, share_of_all_change}],
    overlay_png_base64, geojson, caveats[],
    model_agreement: null | {agree: true|false|null, parsed_polarity,
                             overlay_shows_change, parse_basis, note}},
auditable_execution_trace[{tool, ...}],
report{report_id, view_url, download_url, json_url}
```
`400` with `{"detail": "..."}` for: 3+ files; two same-modality images with
missing or identical timestamps (ambiguous intent); a cross-modal request whose
modality mix is not exactly one optical + one sar. A byte-identical pair returns
`200` with `confidence_source: "deterministic_byte_equality_guardrail"`.
Also: `GET /health`, `GET /report/{id}` (HTML download; `?download=0` inline;
`?format=json`), and `GET /` (a minimal fallback UI — do not delete it).

## Honesty invariants (render these, never drop them)

- Confidence is always shown with: "mean top-1 token probability — the model's
  own token-level certainty, NOT a calibrated probability of being correct."
- Evidence is always shown with: not a model prediction; pixel coordinates, not
  georeferenced; plus the full `caveats[]` list rendered as bullets.
- `model_agreement.agree === null` renders as **WITHHELD**. Never as AGREE or
  DISAGREE. `true` → AGREE (green), `false` → DISAGREE (amber).
- A `400` renders as "Refused by the backend" with `detail` verbatim. Never
  auto-retried, never substituted with cached or invented content.

## Tasks, in priority order

**T1 — Replace the API client.** Rewrite `frontend/lib/api/*` into a typed
client that matches the contract above exactly; put the TypeScript interfaces in
`frontend/lib/types/`. Delete every mock/fallback path you find and list each
deletion in your final summary.

**T2 — Analysis page.** Upload 1–2 images with per-image modality select and
timestamp field, plus the query box. Call the backend through a Next.js API
route that proxies server-side (env `BACKEND_URL`, default
`http://127.0.0.1:8000`) so the browser never needs the backend's origin.
Render: answer; confidence bar + caveat; trace table; inputs table; evidence
overlay (base64 data URI) + region table + cross-check chip + caveats; report
links (open / download HTML / download JSON).

**T3 — Report page.** `/analysis/[id]` fetches `/report/{id}?format=json` via
the proxy and renders the same components, keeping the download links.

**T4 — Refusal UX.** On `400`, show `detail` verbatim plus three hint chips
naming the valid configurations: one image · two optical images with DIFFERENT
timestamps · one optical + one SAR.

**T5 — Dev ergonomics.** Document in `frontend/README.md` how to run against
(a) the no-GPU stub server below and (b) a live Kaggle tunnel URL via
`BACKEND_URL`.

**T6 — Repo hygiene.** Merge `backend/.gitignore`'s weight patterns into the
root `.gitignore`. Verify `git status` never shows `*.safetensors`.

## No-GPU stub server for frontend development (backend stays real; only the model is faked)

```python
# dev_stub_server.py at repo root — delete before submission
import os, sys
sys.path.insert(0, "backend/tests"); import stub_env; stub_env.install()
sys.path.insert(0, "backend"); os.chdir("backend")
os.environ["FAKE_ANSWER"] = ("Yes, the built-up area expanded: new rooftops in the "
                             "east. [STUB MODEL - no GPU in this environment]")
os.environ["FAKE_PROBS"] = "0.91,0.87,0.94,0.83"
import uvicorn, app
uvicorn.run(app.app, host="0.0.0.0", port=8000)
```
The stub fakes ONLY the model weights. Evidence, regions, overlay, cross-check,
report and all guardrails are the real code. Test images with known ground
truth: `demo_images/before_2019.png` + `demo_images/after_2023.png` (true change
7.84%, bbox x[355,494] y[150,299]).

## Definition of done — run these and paste the output in your summary

1. `npm run build` and `npm run lint` pass.
2. `grep -rin "mock\|fallback" frontend/lib frontend/app frontend/components`
   returns nothing except the refusal-rendering code; list any survivor and why.
3. With the stub server running: uploading the demo pair shows the overlay, an
   AGREE chip and working report links; removing the timestamps shows the 400
   card with the verbatim `detail`.
4. `git status` shows no binary weight files; no new file exceeds 100 MB.
