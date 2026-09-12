"""
Parses a natural-language query into a structured TaskIntent.

Primary path: an LLM call constrained via `instructor` + Pydantic, so the
output is guaranteed to match the TaskIntent schema instead of relying on
free-text parsing / hallucination-prone regex on model output.

Fallback path: a keyword classifier, so the engine is fully testable
offline with no API key or network access required.
"""

import os
from core.schemas import TaskIntent, TaskType

_CHANGE_WORDS = [
    "changed", "change", "before and after", "increased", "decreased", "difference between",
]
_GROUNDING_WORDS = [
    "highlight", "locate", "where is", "show me the", "point to", "mark the",
]
_FUSION_WORDS = [
    "combine", "using both", "optical and sar", "sar and optical", "together",
]


def keyword_fallback_intent(query: str) -> TaskIntent:
    q = query.lower()
    if any(w in q for w in _CHANGE_WORDS):
        return TaskIntent(task_type=TaskType.CHANGE_VQA)
    if any(w in q for w in _FUSION_WORDS):
        return TaskIntent(task_type=TaskType.CROSS_MODAL_FUSION)
    if any(w in q for w in _GROUNDING_WORDS):
        return TaskIntent(task_type=TaskType.GROUNDING)
    return TaskIntent(task_type=TaskType.VQA)


def parse_intent(query: str, use_llm: bool = True) -> TaskIntent:
    """
    Set SATQUERY_LLM_API_KEY to use the constrained-LLM path; otherwise
    (or on any failure) falls back to the keyword classifier so a flaky
    LLM call never breaks the pipeline.
    """
    if not use_llm or not os.environ.get("SATQUERY_LLM_API_KEY"):
        return keyword_fallback_intent(query)

    try:
        import instructor
        from openai import OpenAI

        client = instructor.from_openai(OpenAI(api_key=os.environ["SATQUERY_LLM_API_KEY"]))
        intent = client.chat.completions.create(
            model="gpt-4o-mini",
            response_model=TaskIntent,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Classify the remote-sensing query into a TaskIntent. "
                        "task_type must be one of: vqa, grounding, "
                        "cross_modal_fusion, change_vqa."
                    ),
                },
                {"role": "user", "content": query},
            ],
        )
        return intent
    except Exception:
        return keyword_fallback_intent(query)
