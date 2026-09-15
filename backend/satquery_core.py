import os
import json
from typing import Dict, Any, List, Optional
from pathlib import Path
from PIL import Image
import numpy as np
from dotenv import load_dotenv

from google import genai
from google.genai import types

from backend.input_validator import validate_input_pair, inspect_image
from backend.task_router import classify_task
from backend.evidence_engine import load_as_rgb, compute_pixel_difference, compute_cross_modal_composite

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = "gemini-3.6-flash"

# Domain adaptation knowledge base (BigEarthNet + ISRO Sensor Taxonomy)
BIGEARTHNET_TAXONOMY = """
BigEarthNet Land Cover Categories (adapted for Remote Sensing VQA):
1. Urban / Built-up: Continuous urban fabric, Discontinuous urban fabric, Industrial or commercial units, Transport units, Airports, Port areas.
2. Agricultural: Arable land, Permanent crops, Pastures, Complex cultivation patterns.
3. Forests & Natural Vegetation: Broad-leaved forest, Coniferous forest, Mixed forest, Natural grasslands, Moors/heathland, Transitional woodland/shrub.
4. Bare & Sparsely Vegetated: Beaches, dunes, sands, Bare rocks, Sparsely vegetated areas, Burnt areas.
5. Wetlands & Water Bodies: Inland marshes, Peat bogs, Salt marshes, Water courses, Water bodies, Coastal lagoons, Estuaries, Sea/ocean.
"""

SENSOR_SPECS = """
Sensor Specifications (ISRO/SAC & Open RS benchmarks):
- Cartosat-2S: High-resolution optical (Pan 0.6m, MS 1.6m). Detects color, texture, building footprints, road networks.
- RISAT-1/2B: C-band / X-band SAR Radar (VV, VH polarization). Insensitive to clouds/night. Detects surface roughness, soil moisture, metallic/urban double-bounce.
- Sentinel-2 / Landsat-8: Multispectral (10m-30m). Includes NIR/SWIR for vegetation (NDVI) and water body mapping.
"""


def format_domain_prompt(task_type: str, query: str, metadata: List[Dict[str, Any]], evidence_summary: Optional[Dict[str, Any]] = None) -> str:
    prompt = f"""You are **SatQuery AI** — an elite Remote-Sensing Vision-Language Assistant evaluated by ISRO/SAC standards.

### SYSTEM CONTEXT & DOMAIN KNOWLEDGE
{BIGEARTHNET_TAXONOMY}
{SENSOR_SPECS}

### USER QUERY
"{query}"

### INPUT METADATA
Task Type: {task_type.upper()}
Image Metadata: {json.dumps(metadata, indent=2)}
"""

    if evidence_summary:
        prompt += f"\n### DETERMINISTIC EVIDENCE ENGINE METRICS\n{json.dumps(evidence_summary, indent=2)}\n"

    prompt += "\n### OUTPUT REQUIREMENTS\n"

    if task_type == "vqa":
        prompt += """Provide a direct, precise answer supported by visual evidence.
Format your output as:
1. **Direct Answer:** (Concise answer in 1-2 sentences)
2. **Visual Evidence:** (Specific features, spectral characteristics, or spatial patterns observed)
3. **Domain Classification:** (Match with BigEarthNet land cover class if relevant)
4. **Confidence Score:** (High / Medium / Low with reasoning)
"""
    elif task_type == "captioning":
        prompt += """Provide a comprehensive remote-sensing scene description.
Format your output as:
1. **Executive Summary:** (Overview of the scene)
2. **Primary Land Cover Classes:** (List using BigEarthNet taxonomy)
3. **Infrastructure & Objects Identified:** (Roads, buildings, water bodies, vegetation, etc.)
4. **Environmental & Spatial Context:** (Density, terrain, optical/SAR characteristics)
"""
    elif task_type == "grounding":
        prompt += """Identify and locate requested targets in the image.
Format your output as:
1. **Target Identification:** (Summary of targets detected)
2. **Bounding Box Locations [ymin, xmin, ymax, xmax] (normalized 0-1000 scale):**
   - Provide coordinate bounding boxes for key detected objects in format [ymin, xmin, ymax, xmax] with label.
3. **Count & Spatial Distribution:** (Total count and arrangement)
"""
    elif task_type == "change_analysis":
        prompt += """Analyze bi-temporal changes between Image 1 (T1) and Image 2 (T2) using the provided Pixel Difference Heatmap and metrics.
Format your output as:
1. **Change Overview:** (Summary of primary changes detected between T1 and T2)
2. **Quantitative Evidence:** (Reference the exact % area changed, brightened/new structure %, and darkened/flooding % from the evidence engine)
3. **Spatial Distribution of Changes:** (Where changes are concentrated — e.g. North, South, along coast)
4. **Change Classification:** (Categorize changes — e.g., Urban expansion, Land clearing, Deforestation, Water accumulation)
"""
    elif task_type == "cross_modal_fusion":
        prompt += """Analyze the complementary information from Optical + SAR radar imagery.
Format your output as:
1. **Optical Insights:** (Color, texture, visual land cover features)
2. **SAR Radar Insights:** (Surface roughness, dielectric properties, metallic double-bounce, cloud/shadow penetration)
3. **Cross-Modal Synergy:** (How SAR complements Optical — e.g., identifying structures hidden under canopy or cloud cover)
4. **Fused Feature Summary Table:** (Markdown table comparing Optical vs SAR observations for key regions)
"""

    return prompt


def process_satquery(image_paths: List[str], query: str) -> Dict[str, Any]:
    """
    Main pipeline orchestrator for SatQuery AI.
    1. Validates inputs
    2. Classifies task
    3. Runs evidence engine (if dual image or change analysis)
    4. Sends enriched prompt + images to Gemini 3.6 Flash
    5. Formats response + metadata
    """
    # 1. Validate inputs
    val_res = validate_input_pair(image_paths)
    if not val_res["valid"]:
        return {
            "success": False,
            "error": val_res["error"],
            "response": "Input validation failed."
        }

    pair_type = val_res["pair_type"]
    meta_list = [m.__dict__ if hasattr(m, "__dict__") else m for m in val_res["metadata"]]

    # 2. Classify task
    routing = classify_task(query, pair_type, meta_list)
    task_type = routing.get("task_type", "vqa")

    # 3. Evidence Engine execution
    evidence_summary = None
    processed_images = []
    temp_files = []

    try:
        if pair_type == "bi_temporal" or task_type == "change_analysis":
            heatmap, summary = compute_pixel_difference(image_paths[0], image_paths[1])
            evidence_summary = summary

            # Convert numpy arrays to PIL Images for Gemini
            img1 = Image.fromarray(load_as_rgb(image_paths[0]))
            img2 = Image.fromarray(load_as_rgb(image_paths[1]))
            img_heat = Image.fromarray(heatmap)

            processed_images = [img1, img2, img_heat]
            evidence_summary["images_analyzed"] = ["Image 1 (T1)", "Image 2 (T2)", "Pixel Difference Heatmap (Red=New/Brightened, Blue=Darkened/Water)"]

        elif pair_type == "cross_modal" or task_type == "cross_modal_fusion":
            # Determine which is optical and which is SAR
            is_m0_sar = meta_list[0].get("modality") == "sar"
            opt_path = image_paths[1] if is_m0_sar else image_paths[0]
            sar_path = image_paths[0] if is_m0_sar else image_paths[1]

            composite, summary = compute_cross_modal_composite(opt_path, sar_path)
            evidence_summary = summary

            opt_img = Image.fromarray(load_as_rgb(opt_path, is_sar=False))
            sar_img = Image.fromarray(load_as_rgb(sar_path, is_sar=True))
            comp_img = Image.fromarray(composite)

            processed_images = [opt_img, sar_img, comp_img]
            evidence_summary["images_analyzed"] = ["Optical Image", "SAR Radar Image", "False-Color Composite (RGB=Opt_R, Opt_G, SAR_B)"]

        else:
            # Single image
            img_rgb = Image.fromarray(load_as_rgb(image_paths[0], is_sar=(meta_list[0].get("modality") == "sar")))
            processed_images = [img_rgb]

        # 4. Enriched domain prompt construction
        enriched_prompt = format_domain_prompt(task_type, query, meta_list, evidence_summary)

        # 5. Gemini 3.6 Flash VLM call
        contents = [enriched_prompt] + processed_images

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents
        )

        return {
            "success": True,
            "task_type": task_type,
            "pair_type": pair_type,
            "reasoning": routing.get("reasoning", ""),
            "target_objects": routing.get("target_objects", []),
            "evidence_summary": evidence_summary,
            "response": response.text,
            "processed_image_count": len(processed_images)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "response": f"An error occurred during analysis: {str(e)}"
        }


if __name__ == "__main__":
    print("--- Testing SatQuery AI Pipeline ---")
    # Quick dummy test
    t1_img = Image.new("RGB", (128, 128), color="green")
    t1_img.save("test_run1.png")

    res = process_satquery(["test_run1.png"], "What land cover features are present in this satellite image?")
    print("Task Type:", res.get("task_type"))
    print("Response Preview:\n", res.get("response", "")[:300])

    Path("test_run1.png").unlink()
