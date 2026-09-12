"""
Tests the orchestrator's logic (routing, validation, verification
chaining, trace correctness) using stub adapters — no GPU or trained
weights required.

Run with: pytest tests/test_engine.py
"""

from dataclasses import dataclass
from typing import Optional, Any
import pytest

from core.schemas import EngineRequest, ImageInput
from core.orchestrator import Engine


@dataclass
class StubOutput:
    text: str
    mask: Optional[Any] = None
    bbox: Optional[tuple] = None
    logit_confidence: float = 0.9


class StubAdapter:
    def __init__(self, answer="a stub answer", bbox=None):
        self.answer = answer
        self.bbox = bbox

    def generate(self, prompt, images):
        return StubOutput(text=self.answer, bbox=self.bbox)


def make_image(modality="optical", timestamp=None):
    return ImageInput(
        path="fake.tif", modality=modality, timestamp=timestamp,
        crs="EPSG:4326", bounds=(0, 0, 1, 1),
    )


def test_single_image_routes_to_adapter_a():
    engine = Engine(adapter_a=StubAdapter(), adapter_b=StubAdapter())
    request = EngineRequest(query="Describe this image.", images=[make_image()])
    response = engine.run(request)
    assert response.adapter_used == "adapter_a"
    assert "intent classified as vqa" in response.trace[0]


def test_change_query_routes_to_adapter_b():
    engine = Engine(adapter_a=StubAdapter(), adapter_b=StubAdapter())
    request = EngineRequest(
        query="What changed between these two dates?",
        images=[make_image(timestamp="2024-01-01"), make_image(timestamp="2025-01-01")],
    )
    response = engine.run(request)
    assert response.adapter_used == "adapter_b"


def test_fusion_query_requires_both_modalities():
    engine = Engine(adapter_a=StubAdapter(), adapter_b=StubAdapter())
    request = EngineRequest(
        query="Using both optical and SAR, identify built-up area.",
        images=[make_image("optical"), make_image("optical")],  # missing SAR
    )
    with pytest.raises(ValueError):
        engine.run(request)


def test_fusion_query_succeeds_with_correct_modalities():
    engine = Engine(adapter_a=StubAdapter(), adapter_b=StubAdapter())
    request = EngineRequest(
        query="Using both optical and SAR, identify built-up area.",
        images=[make_image("optical"), make_image("sar")],
    )
    response = engine.run(request)
    assert response.adapter_used == "adapter_a"


def test_trace_is_populated():
    engine = Engine(adapter_a=StubAdapter(), adapter_b=StubAdapter())
    request = EngineRequest(query="Describe this image.", images=[make_image()])
    response = engine.run(request)
    assert len(response.trace) >= 3
