"""
Deterministic, rule-based routing from (request, intent) -> adapter name.

Kept intentionally simple and inspectable: every branch here is a line
you can show a judge and justify. Do not replace this with an opaque
learned router — the problem statement is explicit that the *observable*
execution trace is what gets evaluated.
"""

from core.schemas import EngineRequest, TaskIntent


def route(request: EngineRequest, intent: TaskIntent) -> str:
    n = len(request.images)
    modalities = {img.modality for img in request.images}
    timestamps = {img.timestamp for img in request.images}

    if n == 1:
        return "adapter_a"          # single-image VQA / grounding

    if n == 2 and len(modalities) == 2 and len(timestamps) == 1:
        return "adapter_a"          # cross-modal fusion: same adapter, fusion prompt

    if n == 2 and len(timestamps) == 2 and None not in timestamps:
        return "adapter_b"          # bi-temporal change-VQA

    raise ValueError(
        f"Unsupported input configuration: {n} image(s), "
        f"modalities={modalities}, timestamps={timestamps}"
    )
