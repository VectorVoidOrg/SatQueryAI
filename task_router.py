import json
from typing import Dict, Any, List
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = "gemini-3.6-flash"


def classify_task(query: str, pair_type: str, image_metadata: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Classifies user query and image metadata into a specific task type.
    """
    # Deterministic overrides based on input structure if obvious
    query_lower = query.lower().strip()

    system_prompt = """You are an expert remote sensing task routing agent for SatQuery AI.
Given a user query and image input metadata, classify the request into EXACTLY ONE task category.

Available categories:
1. "vqa": Visual question answering for single or multi image (answering specific questions like count, type, color, condition).
2. "captioning": Detailed scene description, summary, or general analysis request (e.g., "describe this image", "summarize what is visible").
3. "grounding": Object detection or location request requiring spatial bounding box coordinates or location pointers (e.g., "locate all solar panels", "where are the ships").
4. "change_analysis": Bi-temporal change detection across two timestamps (e.g., "what changed?", "find new construction", "flooded areas since T1").
5. "cross_modal_fusion": Complementary Optical + SAR imagery analysis (e.g., "use SAR to see through clouds", "combine radar and optical to assess land cover").

Respond in valid JSON with this exact structure:
{
  "task_type": "<vqa|captioning|grounding|change_analysis|cross_modal_fusion>",
  "reasoning": "<1-2 sentence explanation>",
  "requires_evidence_engine": <true|false>,
  "target_objects": ["list of key targets or features mentioned"]
}
"""

    user_input = f"""Query: "{query}"
Input Pair Type: {pair_type}
Image Metadata: {json.dumps(image_metadata)}
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[system_prompt, user_input],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        result = json.loads(response.text)
        return result
    except Exception as e:
        # Fallback heuristic router if API call fails
        if pair_type == "bi_temporal" or "change" in query_lower or "difference" in query_lower:
            task_type = "change_analysis"
            req_engine = True
        elif pair_type == "cross_modal" or "sar" in query_lower:
            task_type = "cross_modal_fusion"
            req_engine = True
        elif any(w in query_lower for w in ["locate", "where", "find", "bbox", "bounding box"]):
            task_type = "grounding"
            req_engine = False
        elif any(w in query_lower for w in ["describe", "caption", "summary", "overview"]):
            task_type = "captioning"
            req_engine = False
        else:
            task_type = "vqa"
            req_engine = False

        return {
            "task_type": task_type,
            "reasoning": f"Fallback heuristic classification due to router error: {str(e)}",
            "requires_evidence_engine": req_engine,
            "target_objects": []
        }


if __name__ == "__main__":
    test_queries = [
        ("Describe the urban density in this satellite photo.", "single"),
        ("What changes occurred between T1 and T2?", "bi_temporal"),
        ("Locate all aircraft on the runway with bounding boxes.", "single"),
        ("Use radar and optical to detect flooded zones under cloud cover.", "cross_modal")
    ]

    print("--- Testing Task Router ---")
    for q, p in test_queries:
        res = classify_task(q, p, [{"modality": "optical"}])
        print(f"Query: '{q}' ({p}) => {res['task_type'].upper()} | Engine: {res['requires_evidence_engine']}")
