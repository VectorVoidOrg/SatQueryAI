# app.py — SatQuery AI FastAPI backend (Gemini VLM)
import os, time, tempfile, logging, threading, uuid, re, io, base64
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env from project root (one level up from backend/)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
import rasterio
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from starlette.concurrency import run_in_threadpool
import json, requests as _requests
from PIL import Image
import numpy as np

from common import BASE_MODEL, load_image
import evidence
import report as report_lib
from ui import INDEX_HTML
from tools.building_detector import detect as detect_objects
from tools.water_coverage import compute as compute_water
from tools.urban_planning_risk import assess as assess_urban_planning_risk


def _gemini_raw_call(api_key, model, parts):
    """Single raw HTTP call to Gemini API — no SDK tenacity retries burning quota."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {"contents": [{"role": "user", "parts": parts}]}
    resp = _requests.post(url, json=payload, timeout=120)
    if resp.status_code == 429:
        # Parse retry delay from the error
        try:
            retry_after = resp.json().get("error", {}).get("details", [{}])
            for d in retry_after:
                if d.get("@type", "").endswith("RetryInfo"):
                    wait = float(d.get("retryDelay", "30").rstrip("s"))
                    logging.info(f"[SatQuery] Rate limited. Waiting {wait:.0f}s...")
                    time.sleep(wait)
                    resp = _requests.post(url, json=payload, timeout=120)
                    break
        except Exception:
            pass
    resp.raise_for_status()
    return resp.json()


class AgenticModelRuntime:
    def __init__(self):
        self.lock = threading.Lock()
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY not set in environment or .env")
        self.model = BASE_MODEL

        # Load computational tools (zero GPU)
        self.has_yolo = True
        try:
            from tools.building_detector import get_detector_model
            get_detector_model()
            logging.info("[SatQuery AI] YOLOv8n detector loaded on CPU")
        except Exception as e:
            logging.warning(f"[SatQuery AI] YOLOv8n unavailable: {e}")
            self.has_yolo = False

        logging.info(f"[SatQuery AI] Gemini VLM Ready (model={self.model})")

    def predict(self, image_specs, task, query):
        q_lower = query.lower()

        # 1. Computational Tools (zero GPU VRAM usage) - BYPASSED: All queries sent directly to Gemini API
        BYPASS_COMPUTATIONAL_TOOLS = True

        counting_keywords = ["how many", "count", "number of", "amount of", "building count"]
        risk_keywords = ["overflow", "risk", "danger", "precaution", "too close", "setback", "flood risk", "planning"]
        water_keywords = ["flood", "water", "submerge", "inundat", "water body", "river", "lake", "ocean"]

        if not BYPASS_COMPUTATIONAL_TOOLS:
            if any(kw in q_lower for kw in risk_keywords) and any(kw in q_lower for kw in water_keywords) and len(image_specs) >= 1:
                target_image = image_specs[0]["path"]
                risk_result = assess_urban_planning_risk(target_image)
                status = risk_result.get("status")

                if status == "success":
                    flagged = risk_result.get("flagged_buildings", [])
                    total = risk_result.get("total_buildings_detected", 0)
                    pct = risk_result.get("water_percentage", 0.0)
                    if flagged:
                        answer = (
                            f"Water body detected covering {pct}% of the scene. Of {total} detected structure(s), "
                            f"{len(flagged)} fall within the {risk_result['buffer_px']}px precautionary buffer of the "
                            f"water edge and are flagged as at-risk:\n\n"
                            + "\n".join(
                                f"- {b['class']} at {b['bbox']}, {b['distance_to_water_px']}px from water"
                                for b in flagged
                            )
                        )
                    else:
                        answer = (
                            f"Water body detected covering {pct}% of the scene. {total} structure(s) detected, "
                            f"none fall within the {risk_result['buffer_px']}px precautionary buffer — current "
                            f"placement does not show immediate proximity risk."
                        )
                    answer += f"\n\nNote: {risk_result.get('caveat', '')}"
                    confidence = 0.80
                elif status == "no_water_detected":
                    answer = risk_result.get("reason", "No water body detected in this image.")
                    confidence = 0.85
                else:
                    answer = f"Urban planning risk assessment unavailable: {risk_result.get('reason', 'unknown error')}."
                    confidence = 0.0
                return answer, "computational_urban_planning_risk", confidence

            if any(kw in q_lower for kw in counting_keywords) and len(image_specs) >= 1:
                target_image = image_specs[0]["path"]
                det_result = detect_objects(target_image)
                if det_result.get("status") == "success":
                    total = det_result.get("total_detections", 0)
                    counts = det_result.get("class_counts", {})
                    caveat = det_result.get("caveat", "")
                    if total > 0:
                        details = ", ".join(f"{v} {k}{'s' if v > 1 else ''}" for k, v in counts.items())
                        answer = (
                            f"Automated object detector (YOLOv8n CPU) identified a total of {total} object(s) "
                            f"in the scene ({details}).\n\n"
                            f"Note: {caveat}"
                        )
                        confidence = 0.85
                    else:
                        answer = (
                            f"Automated object detector (YOLOv8n CPU) did not identify high-confidence structural objects "
                            f"in this scene (0 detections at confidence threshold >= 0.25).\n\n"
                            f"Note: {caveat}"
                        )
                        confidence = 0.70
                else:
                    answer = f"Object detection unavailable: {det_result.get('reason', 'unknown error')}. Note: {det_result.get('caveat', '')}"
                    confidence = 0.0
                return answer, "computational_building_detector", confidence

            if any(kw in q_lower for kw in water_keywords) and len(image_specs) >= 1:
                target_image = image_specs[0]["path"]
                water_result = compute_water(target_image)
                if water_result.get("status") == "success":
                    pct = water_result.get("water_percentage", 0.0)
                    method = water_result.get("method", "rgb_blue_dominance_heuristic")
                    caveat = water_result.get("caveat")
                    total_px = water_result.get("total_pixels", 0)
                    water_px = water_result.get("water_pixels", 0)
                    method_name = "Normalized Difference Water Index (NDWI)" if method == "ndwi" else "Adaptive RGB Spectral Ratio Analysis"
                    answer = (
                        f"Surface water coverage analysis via {method_name} computed {pct}% water surface extent "
                        f"({water_px:,} of {total_px:,} pixels identified as water surface)."
                    )
                    if caveat:
                        answer += f"\n\nNote: {caveat}"
                    confidence = 0.95 if method == "ndwi" else 0.85
                else:
                    answer = f"Water coverage analysis unavailable: {water_result.get('reason', 'unknown error')}."
                    confidence = 0.0
                return answer, "computational_water_index", confidence

        # 2. VLM Generation via Gemini API
        max_dim = 448 if len(image_specs) == 2 else 512
        images = [load_image(spec, max_dim=max_dim) for spec in image_specs]

        # Build system prompt with domain knowledge
        system_prompt = (
            "You are SatQuery AI, a specialist remote sensing visual language model evaluated by ISRO/SAC standards.\n\n"
            "DOMAIN KNOWLEDGE:\n"
            "BigEarthNet Land Cover Categories:\n"
            "1. Urban / Built-up: Continuous/discontinuous urban fabric, industrial units, transport, airports.\n"
            "2. Agricultural: Arable land, permanent crops, pastures, complex cultivation.\n"
            "3. Forests & Natural Vegetation: Broad-leaved, coniferous, mixed forest, grasslands, moors.\n"
            "4. Bare & Sparsely Vegetated: Beaches, dunes, bare rocks, burnt areas.\n"
            "5. Wetlands & Water Bodies: Marshes, peat bogs, water courses, coastal lagoons, sea/ocean.\n\n"
            "Sensor Specs:\n"
            "- Cartosat-2S: High-res optical (Pan 0.6m, MS 1.6m). Building footprints, road networks.\n"
            "- RISAT-1/2B: C/X-band SAR Radar (VV/VH). Cloud/night insensitive. Surface roughness, soil moisture.\n"
            "- Sentinel-2 / Landsat-8: Multispectral (10-30m). NIR/SWIR for NDVI and water mapping.\n\n"
            "RULES:\n"
            "1. Base your answer on what is visible in the imagery.\n"
            "2. For change detection, compare the BEFORE and AFTER images carefully.\n"
            "3. For cross-modal queries, integrate information from both optical and SAR inputs.\n"
            "4. Be concise and factual.\n"
        )

        # Build raw parts for HTTP API
        raw_parts = [{"text": system_prompt}]

        for idx, img_spec in enumerate(image_specs):
            mod = img_spec.get("modality", "optical").upper()
            date_str = f" ({img_spec['timestamp']})" if img_spec.get("timestamp") else ""

            if task == "cross_modal":
                label = f"Image {idx+1} [{mod}{date_str}]:"
            elif task == "change_vqa":
                label = f"Image {idx+1} [{'BEFORE' if idx==0 else 'AFTER'}{date_str}]:"
            else:
                label = f"Satellite Image [{mod}{date_str}]:"

            raw_parts.append({"text": label})
            # Encode PIL Image as base64 for HTTP API
            buf = io.BytesIO()
            img_rgb = images[idx].convert("RGB") if hasattr(images[idx], "convert") else Image.fromarray(np.array(images[idx])).convert("RGB")
            img_rgb.save(buf, format="PNG")
            raw_parts.append({
                "inline_data": {
                    "mime_type": "image/png",
                    "data": base64.b64encode(buf.getvalue()).decode()
                }
            })

        raw_parts.append({"text": f"Question: {query}"})

        with self.lock:
            result = _gemini_raw_call(self.api_key, self.model, raw_parts)
            answer = result["candidates"][0]["content"]["parts"][0]["text"].strip()

        # Gemini doesn't provide per-token logits, so we estimate confidence heuristically
        confidence = self._estimate_confidence(answer, task)

        chosen_adapter = "gemini_vlm"
        return answer, chosen_adapter, confidence

    def _estimate_confidence(self, answer, task):
        """Heuristic confidence estimate since Gemini doesn't expose logits."""
        if not answer:
            return 0.0
        # Longer, more detailed answers tend to be more confident
        words = len(answer.split())
        base = min(0.92, 0.65 + words * 0.005)
        # Change detection and cross-modal are harder tasks
        if task in ("change_vqa", "cross_modal"):
            base *= 0.90
        return round(min(base, 0.95), 4)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.runtime = AgenticModelRuntime()
    app.state.reports = REPORTS
    yield

app = FastAPI(title="SatQuery AI Agentic Backend", lifespan=lifespan)

REPORTS = report_lib.ReportStore()

def _with_report(payload):
    rid = uuid.uuid4().hex[:16]
    rec = report_lib.build_record(payload, report_id=rid)
    REPORTS.put(rec, rid=rid)
    links = {
        "report_id": rid,
        "view_url": f"/report/{rid}?download=0",
        "download_url": f"/report/{rid}",
        "json_url": f"/report/{rid}?format=json",
    }
    payload["report"] = links
    rec["report"] = links
    return payload


@app.get("/", response_class=HTMLResponse)
def index():
    return HTMLResponse(INDEX_HTML)


@app.get("/report/{report_id}")
def get_report(report_id: str, format: str = "html", download: int = 1):
    rec = REPORTS.get(report_id)
    if rec is None:
        raise HTTPException(
            404,
            f"No report '{report_id}'. Reports live in process memory only: they are "
            f"not persisted, they do not survive a restart, and at most "
            f"{REPORTS.max_entries} are retained."
        )
    if format == "json":
        return JSONResponse(rec)
    body = report_lib.render_html(rec)
    headers = {}
    if download:
        headers["Content-Disposition"] = (
            f'attachment; filename="satquery_report_{report_id}.html"')
    return HTMLResponse(body, headers=headers)


@app.get("/health")
def health():
    return {"status": "ready", "base_model": BASE_MODEL}

@app.post("/analyze")
async def analyze(
    query: str = Form(...),
    dataset: str = Form("operational"),
    modalities: str = Form("optical"),
    timestamps: str = Form(""),
    bands: str = Form("1,2,3"),
    files: list[UploadFile] = File(...)
):
    try:
        if len(files) < 1 or len(files) > 2:
            raise HTTPException(400, "SatQuery AI accepts either 1 image or 2 images.")

        band_indices = [int(x.strip()) for x in bands.split(",")]
        modality_list = [m.strip().lower() for m in modalities.split(",")]

        timestamp_list = [t.strip() for t in timestamps.split(",")]

        while len(modality_list) < len(files):
            modality_list.append("optical")
        while len(timestamp_list) < len(files):
            timestamp_list.append("")

        modality_list = ["sar" if m == "sar" else "optical" for m in modality_list]

        start_time = time.time()
        q_lower = query.lower()
        intent_basis = None

        # Guardrails & Routing
        if len(files) == 2:
            n_optical = sum(1 for m in modality_list if m == "optical")
            n_sar = sum(1 for m in modality_list if m == "sar")

            if n_optical >= 1 and n_sar >= 1:
                task = "cross_modal"
                if n_optical != 1 or n_sar != 1:
                    raise HTTPException(
                        400,
                        f"Cross-modal fusion requires exactly one optical and one SAR image "
                        f"(received {n_optical} optical, {n_sar} sar)."
                    )
                intent_basis = (f"2 images, modalities={modality_list} -> "
                                "exactly one optical + one SAR co-registered pair")
            elif n_sar >= 1:
                raise HTTPException(
                    400,
                    f"Cross-modal fusion requires exactly one optical and one SAR image "
                    f"(received {n_optical} optical, {n_sar} sar)."
                )
            else:
                t1, t2 = timestamp_list[0], timestamp_list[1]
                if t1 and t2 and t1 != t2:
                    task = "change_vqa"
                    intent_basis = f"distinct timestamps provided ({t1} -> {t2})"

                    # Check if identical files were uploaded
                    f1_bytes = await files[0].read()
                    f2_bytes = await files[1].read()
                    await files[0].seek(0)
                    await files[1].seek(0)

                    if f1_bytes == f2_bytes:
                        return _with_report({
                            "task_intent": "change_vqa",
                            "query": query,
                            "answer": "No changes detected. The two input images are identical.",
                            "confidence": 1.0,
                            "confidence_source": "deterministic_byte_equality_guardrail",
                            "duration_seconds": round(time.time() - start_time, 3),
                            "inputs": [
                                {"filename": f.filename, "modality": m, "timestamp": t}
                                for f, m, t in zip(files, modality_list, timestamp_list)
                            ],
                            "visual_evidence": {
                                "status": "not_applicable",
                                "source": "deterministic_radiometric_differencing",
                                "is_model_prediction": False,
                                "georeferenced": False,
                                "reason": "the two uploads are byte-identical, so a radiometric "
                                          "difference would be empty by construction; the "
                                          "guardrail answered without invoking the model",
                            },
                            "auditable_execution_trace": [
                                {"tool": "guardrail_checker", "status": "identical_inputs_detected", "action": "bypassed_vlm"},
                                {"tool": "agentic_intent_classifier", "classified_task": "change_vqa", "basis": intent_basis},
                            ]
                        })
                else:
                    reason = ("no timestamps supplied" if not (t1 and t2)
                              else f"both timestamps identical ({t1})")
                    raise HTTPException(
                        400,
                        "Ambiguous two-image intent: cannot distinguish a bi-temporal "
                        f"change pair from an unrelated image pair ({reason}). "
                        "To run change analysis, send `timestamps` with two DIFFERENT "
                        "acquisition dates (e.g. '2023-01-01,2024-06-15'). "
                        "To run cross-modal fusion, send `modalities=optical,sar`. "
                        "To analyse one scene, send a single image."
                    )

        else:
            if any(k in q_lower for k in ["describe", "caption", "scene description"]):
                task = "caption"
                intent_basis = "1 image, query matched caption keyword"
            else:
                task = "vqa"
                intent_basis = "1 image, no caption keyword -> default VQA"

        visual_evidence = None
        evidence_trace = None

        with tempfile.TemporaryDirectory() as temp_dir:
            image_specs = []
            image_metadata = []

            for idx, file in enumerate(files):
                ext = Path(file.filename or "").suffix.lower()
                temp_path = Path(temp_dir) / f"input_{idx}{ext}"
                content = await file.read()
                temp_path.write_bytes(content)

                ts = timestamp_list[idx] if idx < len(timestamp_list) else None
                ts = ts or None
                mod = modality_list[idx]

                spec = {"path": str(temp_path), "modality": mod, "bands": band_indices, "timestamp": ts}
                image_specs.append(spec)

                meta = {"filename": file.filename, "modality": mod, "timestamp": ts}
                image_metadata.append(meta)

            answer, chosen_adapter, confidence = await run_in_threadpool(
                app.state.runtime.predict,
                image_specs, task, query
            )

            if len(image_specs) == 2:
                try:
                    visual_evidence = await run_in_threadpool(
                        evidence.change_evidence, image_specs[0], image_specs[1], answer
                    )
                except Exception as e:
                    logging.exception("Visual evidence failed")
                    visual_evidence = {
                        "status": "failed",
                        "source": "deterministic_radiometric_differencing",
                        "is_model_prediction": False,
                        "reason": f"{type(e).__name__}: {e}",
                    }
                evidence_trace = {
                    "tool": "visual_evidence_generator",
                    "status": visual_evidence.get("status"),
                    "method": visual_evidence.get("source"),
                    "is_model_prediction": visual_evidence.get("is_model_prediction", False),
                    "regions": visual_evidence.get("region_count", 0),
                    "georeferenced": visual_evidence.get("georeferenced", False),
                }
                if visual_evidence.get("reason"):
                    evidence_trace["reason"] = visual_evidence["reason"]

        duration = round(time.time() - start_time, 3)

        if chosen_adapter.startswith("computational_"):
            specialist_trace = {
                "tool": "specialist_registry",
                "tool_type": "computational",
                "method": chosen_adapter,
            }
        else:
            specialist_trace = {
                "tool": "specialist_registry",
                "tool_type": "cloud_api",
                "provider": "gemini",
                "selected_model": BASE_MODEL,
                "active_adapter": chosen_adapter,
            }

        trace = [
            {"tool": "input_compatibility_checker", "status": "passed", "num_images": len(files), "modalities": modality_list, "timestamps": timestamp_list},
            {"tool": "agentic_intent_classifier", "classified_task": task, "basis": intent_basis},
            {"tool": "preprocessor", "rendering": "multisensor_sar_db_stretch" if "sar" in modality_list else "percentile_stretched_rgb"},
            specialist_trace,
        ]
        if evidence_trace is not None:
            trace.append(evidence_trace)

        return _with_report({
            "task_intent": task,
            "query": query,
            "answer": answer,
            "confidence": confidence,
            "confidence_source": "deterministic_tool_metric" if chosen_adapter.startswith("computational_") else "heuristic_estimate",
            "duration_seconds": duration,
            "inputs": image_metadata,
            "visual_evidence": visual_evidence,
            "auditable_execution_trace": trace,
        })
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Analysis failed")
        raise HTTPException(500, str(e))
