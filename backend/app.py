# app.py
import os, time, tempfile, logging, threading, uuid
from pathlib import Path
from contextlib import asynccontextmanager
import torch
import rasterio
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from starlette.concurrency import run_in_threadpool
from peft import PeftModel
from transformers import AutoProcessor, BitsAndBytesConfig, Qwen2_5_VLForConditionalGeneration
from common import BASE_MODEL, load_image, format_messages
import evidence
import report as report_lib
from ui import INDEX_HTML


# ---------------------------------------------------------------------------
# [TASK 3] Real per-token sequence confidence.
# Pure helper over what generate() already returns; no new dependencies.
# ---------------------------------------------------------------------------
def compute_sequence_confidence(token_ids, scores, eos_token_id=None):
    """Mean softmax probability the model assigned to the token it actually chose.

    scores     : tuple, one (batch=1, vocab) logit tensor per decode step.
    token_ids  : (T,) tensor of the chosen token ids for those steps.

    Greedy decoding means token_ids[t] == argmax(scores[t]), so this is the mean
    top-1 probability over the generated content tokens. We stop at EOS so the
    terminator token does not inflate the score, and so trailing PADs are ignored.
    Returns a float in [0, 1]; 0.0 if nothing was generated.
    """
    prob_sum = 0.0
    counted = 0
    for step, logits in enumerate(scores):
        if step >= token_ids.shape[0]:
            break
        tok = int(token_ids[step])
        if eos_token_id is not None and tok == int(eos_token_id):
            break
        step_probs = torch.softmax(logits[0].float(), dim=-1)
        prob_sum += float(step_probs[tok])
        counted += 1
    if counted == 0:
        return 0.0
    return round(prob_sum / counted, 4)


class AgenticModelRuntime:
    def __init__(self, adapter_a_path, adapter_b_path):
        self.lock = threading.Lock()
        dtype = torch.float16
        print("[SatQuery AI] Initializing base model Qwen2.5-VL-3B-Instruct in 4-bit...")

        quant = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=dtype,
            llm_int8_skip_modules=["visual", "lm_head"]
        )

        # [TASK 1] Raised the spatial pixel budget.
        #   was: min_pixels=16*28*28, max_pixels=128*28*28
        #   now: min_pixels=64*28*28, max_pixels=256*28*28
        # 256*28*28 = 200704 px -> ~448x448 effective, 256 vision tokens/image.
        self.processor = AutoProcessor.from_pretrained(BASE_MODEL, min_pixels=64*28*28, max_pixels=256*28*28)

        base_model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            BASE_MODEL, quantization_config=quant, torch_dtype=dtype, device_map={"": 0}
        )

        self.model = base_model
        self.has_a = False
        self.has_b = False

        if os.path.exists(adapter_a_path):
            try:
                print(f"[SatQuery AI] Registering Adapter A from {adapter_a_path}...")
                self.model = PeftModel.from_pretrained(base_model, adapter_a_path, adapter_name="adapter_a")
                self.has_a = True
            except Exception as e:
                print(f"[SatQuery AI] Could not load Adapter A ({e}).")

        if os.path.exists(adapter_b_path) and self.has_a:
            try:
                print(f"[SatQuery AI] Registering Adapter B from {adapter_b_path}...")
                self.model.load_adapter(adapter_b_path, adapter_name="adapter_b")
                self.has_b = True
            except Exception as e:
                print(f"[SatQuery AI] Could not load Adapter B ({e}).")

        print("[SatQuery AI] Backend Engine Ready!")

    def predict(self, image_specs, task, query):
        torch.cuda.empty_cache()
        # [TASK 1 - follow-on, SEE HANDOVER FLAG F3] 384 -> 448 for image pairs.
        # The PIL pre-downscale in load_image() was binding BELOW the processor's
        # new 256*28*28 budget for pairs, so Task 1 would not have taken effect
        # on change_vqa / cross_modal at all. 448*448 = 200704 = exactly the new cap.
        max_dim = 448 if len(image_specs) == 2 else 512
        images = [load_image(spec, max_dim=max_dim) for spec in image_specs]

        with self.lock:
            if task == "change_vqa" and self.has_b:
                selected_adapter = "adapter_b"
                self.model.set_adapter("adapter_b")
            elif self.has_a:
                selected_adapter = "adapter_a"
                self.model.set_adapter("adapter_a")
            else:
                selected_adapter = "base_qwen_vlm"

            msgs = format_messages(row={"task": task, "query": query, "images": image_specs})
            prompt = self.processor.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)

            inputs = self.processor(text=[prompt], images=images, return_tensors="pt").to("cuda:0")

            with torch.no_grad():
                # [TASK 3] return_dict_in_generate=True changes generate()'s return
                # value from a bare (batch, seq_len) token tensor into a
                # GenerateDecoderOnlyOutput object; the tokens move to .sequences.
                # output_scores=True makes it also collect .scores (one
                # (batch, vocab) logit tensor per step). Decoding behaviour itself
                # is unchanged: still greedy (do_sample=False), still 128 max tokens.
                gen_out = self.model.generate(
                    **inputs,
                    max_new_tokens=128,
                    do_sample=False,
                    return_dict_in_generate=True,
                    output_scores=True,
                )

            prompt_len = inputs["input_ids"].shape[1]
            new_tokens = gen_out.sequences[:, prompt_len:]
            answer = self.processor.batch_decode(new_tokens, skip_special_tokens=True)[0].strip()

            # [TASK 3] confidence from the model's own distribution, not a constant.
            tokenizer = getattr(self.processor, "tokenizer", None)
            eos_id = getattr(tokenizer, "eos_token_id", None) if tokenizer is not None else None
            confidence = compute_sequence_confidence(new_tokens[0], gen_out.scores, eos_token_id=eos_id)

        torch.cuda.empty_cache()
        return answer, selected_adapter, confidence


@asynccontextmanager
async def lifespan(app: FastAPI):
    adapter_a = os.environ.get("ADAPTER_A_PATH", "./artifacts/adapter_a")
    adapter_b = os.environ.get("ADAPTER_B_PATH", "./artifacts/adapter_b")
    app.state.runtime = AgenticModelRuntime(adapter_a, adapter_b)
    app.state.reports = REPORTS
    yield

app = FastAPI(title="SatQuery AI Agentic Backend", lifespan=lifespan)

# Module-level rather than app.state so the report store exists even when a test
# client drives /analyze without running the lifespan startup.
REPORTS = report_lib.ReportStore()

def _with_report(payload):
    """Attach a downloadable per-analysis report to a response payload.

    Every /analyze answer gets one, including the guardrail refusals that never
    reach the model -- an operator should be able to hand a reviewer the exact
    record of what was asked and what happened. URLs are relative so they keep
    working behind a reverse proxy or tunnel on a different hostname.
    """
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
    """The operator UI. Served by the backend itself: one process, one origin.

    No mock data and no fallback path -- it calls the real POST /analyze and
    renders whatever comes back, including the 400s, because those guardrail
    refusals are part of what the system is supposed to demonstrate.
    """
    return HTMLResponse(INDEX_HTML)


@app.get("/report/{report_id}")
def get_report(report_id: str, format: str = "html", download: int = 1):
    """A per-analysis downloadable report.

    `format=json` returns the machine-readable record; `download=0` renders the
    HTML inline so the UI can open it in a tab instead of saving it.
    """
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

        # [TASK 2] Positional parse, NO empty-filtering (was `if t.strip()`).
        # Filtering shifted timestamps out of alignment with their file: ",2024-06-15"
        # used to land on file 0. Parsed positionally and padded, exactly like
        # bands / modalities, so index i always refers to file i.
        timestamp_list = [t.strip() for t in timestamps.split(",")]

        while len(modality_list) < len(files):
            modality_list.append("optical")
        while len(timestamp_list) < len(files):
            timestamp_list.append("")

        # [TASK 2 - SEE HANDOVER FLAG F4] Normalise "multispectral" -> "optical".
        # The problem statement's input scope is "optical/multispectral or SAR".
        # Without this, a valid multispectral pair would fall through to a 400.
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
                # [TASK 4] Validate the fusion modality combination explicitly.
                if n_optical != 1 or n_sar != 1:
                    raise HTTPException(
                        400,
                        f"Cross-modal fusion requires exactly one optical and one SAR image "
                        f"(received {n_optical} optical, {n_sar} sar)."
                    )
                # [TASK 2] SAR-detection branch itself is unchanged (was already correct);
                # only the evidence string is new.
                intent_basis = (f"2 images, modalities={modality_list} -> "
                                "exactly one optical + one SAR co-registered pair")
            elif n_sar >= 1:
                # [TASK 4] was HTTP 422; Task 4 specifies HTTP 400 with this message.
                raise HTTPException(
                    400,
                    f"Cross-modal fusion requires exactly one optical and one SAR image "
                    f"(received {n_optical} optical, {n_sar} sar)."
                )
            else:
                # [TASK 2] change_vqa now REQUIRES two present, DIFFERENT timestamps.
                # No silent defaulting to change_vqa for an arbitrary 2-image upload.
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
                    # [TASK 2] Ask the client to disambiguate instead of guessing.
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

            # ---- [GAP 1] visual evidence ------------------------------------
            # Computed INSIDE the TemporaryDirectory block on purpose: the frames
            # are deleted the instant it exits, and the overlay needs real pixels.
            # Only a two-image request can carry evidence -- a single frame has
            # nothing to be differenced against. change_evidence() itself refuses
            # an optical-vs-SAR pair, because that difference measures the sensor
            # rather than the ground, and says so in the payload instead of
            # drawing a misleading overlay.
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
                # Evidence is a bonus, never a dependency: if it fails the answer
                # still stands, and the failure is recorded rather than swallowed.
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

        trace = [
            {"tool": "input_compatibility_checker", "status": "passed", "num_images": len(files), "modalities": modality_list, "timestamps": timestamp_list},
            {"tool": "agentic_intent_classifier", "classified_task": task, "basis": intent_basis},
            {"tool": "preprocessor", "rendering": "multisensor_sar_db_stretch" if "sar" in modality_list else "percentile_stretched_rgb"},
            {"tool": "specialist_registry", "selected_model": "Qwen2.5-VL-3B-Instruct", "active_adapter": chosen_adapter},
        ]
        if evidence_trace is not None:
            trace.append(evidence_trace)

        # ---- [GAP 2] downloadable per-analysis report ------------------------
        # Same payload, wrapped: the response now names the visual evidence and
        # carries a link to a self-contained HTML report a judge can open offline.
        return _with_report({
            "task_intent": task,
            "query": query,
            "answer": answer,
            "confidence": confidence,
            "confidence_source": "mean_top1_token_probability",
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
