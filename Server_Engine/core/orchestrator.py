"""
The agentic controller: interprets the query, validates inputs, routes to
the right adapter, and — where it genuinely helps — chains a second tool
call to verify its own answer before returning it. This chaining is what
makes the controller actually agentic rather than a single-dispatch
lookup table wearing agent language.
"""

import time
from core.schemas import (
    EngineRequest, EngineResponse, TaskIntent, TaskType, Evidence,
)
from core.router import route
from core.intent_parser import parse_intent
from core.vectorizer import mask_to_geojson, bbox_to_geojson


class Engine:
    def __init__(self, adapter_a, adapter_b):
        """
        adapter_a / adapter_b must expose:
            .generate(prompt: str, images: list[ImageInput]) -> ModelOutput
        where ModelOutput has .text (str), .mask (np.ndarray | None),
        .bbox (tuple | None), .logit_confidence (float, 0-1).

        Injected as dependencies (not hardcoded) so tests can pass in
        stub adapters without loading real weights.
        """
        self.adapter_a = adapter_a
        self.adapter_b = adapter_b

    def _validate(self, request: EngineRequest, intent: TaskIntent) -> None:
        if intent.task_type == TaskType.CROSS_MODAL_FUSION:
            modalities = {img.modality for img in request.images}
            if modalities != {"optical", "sar"}:
                raise ValueError("Cross-modal fusion requires one optical + one SAR image")
        if intent.task_type == TaskType.CHANGE_VQA:
            timestamps = [img.timestamp for img in request.images]
            if len(request.images) != 2 or None in timestamps or timestamps[0] == timestamps[1]:
                raise ValueError("Change-VQA requires two images with distinct timestamps")

    def run(self, request: EngineRequest) -> EngineResponse:
        trace: list[str] = []

        intent = parse_intent(request.query)
        trace.append(f"intent classified as {intent.task_type.value}")

        self._validate(request, intent)
        trace.append("input validation passed")

        adapter_name = route(request, intent)
        adapter = self.adapter_a if adapter_name == "adapter_a" else self.adapter_b
        trace.append(f"routed to {adapter_name}")

        t0 = time.time()
        prompt = self._build_prompt(request, intent)
        output = adapter.generate(prompt, request.images)
        inference_ms = (time.time() - t0) * 1000
        trace.append(f"inference completed in {inference_ms:.1f}ms")

        confidence = output.logit_confidence

        # --- Verification chaining ---
        # For VQA answers about a specific object, cross-check with a
        # grounding call. If grounding finds nothing, report the
        # mismatch and lower confidence rather than hiding it.
        if intent.task_type == TaskType.VQA and intent.target_class:
            ground_prompt = self._build_prompt(
                request, TaskIntent(task_type=TaskType.GROUNDING, target_class=intent.target_class)
            )
            ground_output = self.adapter_a.generate(ground_prompt, request.images)
            if ground_output.bbox is None:
                confidence *= 0.5
                trace.append("verification: grounding found no matching region, confidence reduced")
            else:
                trace.append("verification: grounding confirmed the referenced region")

        evidence = None
        transform_coeffs = request.images[0].transform
        if transform_coeffs is not None:
            if output.mask is not None:
                geojson = mask_to_geojson(output.mask, transform_coeffs, request.images[0].crs)
                evidence = Evidence(geojson=geojson, confidence=confidence)
            elif output.bbox is not None:
                geojson = bbox_to_geojson(output.bbox, transform_coeffs, request.images[0].crs)
                evidence = Evidence(geojson=geojson, confidence=confidence)

        return EngineResponse(
            answer=output.text,
            task_intent=intent,
            adapter_used=adapter_name,
            evidence=evidence,
            inference_ms=inference_ms,
            trace=trace,
        )

    @staticmethod
    def _build_prompt(request: EngineRequest, intent: TaskIntent) -> str:
        if intent.task_type == TaskType.CROSS_MODAL_FUSION:
            return f"Using the optical and SAR images together, {request.query}"
        if intent.task_type == TaskType.CHANGE_VQA:
            return f"Comparing the two images over time, {request.query}"
        if intent.task_type == TaskType.GROUNDING:
            target = intent.target_class or request.query
            return f"Locate and return a bounding box for: {target}"
        return request.query
