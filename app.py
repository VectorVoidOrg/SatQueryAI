import streamlit as st
import os
import time
import json
from pathlib import Path
from PIL import Image
import numpy as np

from backend.input_validator import validate_input_pair, inspect_image
from backend.evidence_engine import load_as_rgb, compute_pixel_difference, compute_cross_modal_composite
from backend.satquery_core import process_satquery

st.set_page_config(
    page_title="SatQuery AI — Remote Sensing Vision Assistant",
    page_icon="🛰️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for dark/light themes and sleek UI
st.markdown("""
<style>
    .main-title {
        font-size: 2.2rem;
        font-weight: 700;
        color: #1E88E5;
        margin-bottom: 0px;
    }
    .sub-title {
        font-size: 1.0rem;
        color: #666;
        margin-bottom: 20px;
    }
    .badge {
        background-color: #00E676;
        color: #000;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 0.8rem;
    }
    .metric-card {
        background-color: #f0f4f8;
        padding: 12px;
        border-radius: 8px;
        border-left: 4px solid #1E88E5;
        margin-bottom: 10px;
    }
</style>
""", unsafe_allow_html=True)

# Header Section
st.markdown('<div class="main-title">🛰️ SatQuery AI</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-title">Agentic Vision-Language Assistant for Remote Sensing Imagery | <b>SIH PS 26167 (ISRO/SAC Evaluation)</b></div>', unsafe_allow_html=True)

# Sidebar Controls
st.sidebar.header("🕹️ Control Panel & Upload")

mode = st.sidebar.radio(
    "Analysis Mode",
    options=["Single Image VQA & Captioning", "Bi-temporal Change Detection", "Optical + SAR Cross-Modal Fusion"],
    index=0
)

uploaded_files = []

if mode == "Single Image VQA & Captioning":
    f1 = st.sidebar.file_uploader("Upload Image (GeoTIFF / PNG / JPG)", type=["tif", "tiff", "png", "jpg", "jpeg"], key="single")
    if f1:
        uploaded_files = [f1]
elif mode == "Bi-temporal Change Detection":
    col_u1, col_u2 = st.sidebar.columns(2)
    with col_u1:
        f1 = st.sidebar.file_uploader("Image T1 (Before)", type=["tif", "tiff", "png", "jpg", "jpeg"], key="t1")
    with col_u2:
        f2 = st.sidebar.file_uploader("Image T2 (After)", type=["tif", "tiff", "png", "jpg", "jpeg"], key="t2")
    if f1 and f2:
        uploaded_files = [f1, f2]
else:
    col_u1, col_u2 = st.sidebar.columns(2)
    with col_u1:
        f1 = st.sidebar.file_uploader("Optical Image", type=["tif", "tiff", "png", "jpg", "jpeg"], key="opt")
    with col_u2:
        f2 = st.sidebar.file_uploader("SAR Radar Image", type=["tif", "tiff", "png", "jpg", "jpeg"], key="sar")
    if f1 and f2:
        uploaded_files = [f1, f2]

st.sidebar.markdown("---")
st.sidebar.subheader("⚙️ Agent Settings")
domain_rag = st.sidebar.checkbox("Inject BigEarthNet Taxonomy RAG", value=True)
sar_stretch = st.sidebar.checkbox("Auto SAR dB Percentile Stretch", value=True)

# Main UI Layout
temp_dir = Path("temp_uploads")
temp_dir.mkdir(exist_ok=True)

saved_paths = []
if uploaded_files:
    for f in uploaded_files:
        save_path = temp_dir / f.name
        with open(save_path, "wb") as w:
            w.write(f.getbuffer())
        saved_paths.append(str(save_path))

# Inspect Metadata & Display Previews
if saved_paths:
    st.subheader("🖼️ Image Inputs & Spatial Previews")
    val_res = validate_input_pair(saved_paths)

    if not val_res["valid"]:
        st.error(f"Input Error: {val_res['error']}")
    else:
        metas = val_res["metadata"]
        pair_type = val_res["pair_type"]

        if len(saved_paths) == 1:
            cols = st.columns([1, 2])
            with cols[0]:
                img_arr = load_as_rgb(saved_paths[0], is_sar=(metas[0].modality == "sar"))
                st.image(img_arr, caption=f"Uploaded Image: {metas[0].filename}", use_container_width=True)
            with cols[1]:
                st.markdown(f"**Format:** `{metas[0].format.upper()}` | **Modality:** `{metas[0].modality.upper()}`")
                st.markdown(f"**Dimensions:** `{metas[0].shape[1]} x {metas[0].shape[0]}` | **Bands:** `{metas[0].bands}`")
                if metas[0].crs:
                    st.markdown(f"**CRS:** `{metas[0].crs}`")
                if metas[0].bounds:
                    st.json(metas[0].bounds)

        elif len(saved_paths) == 2:
            cols = st.columns(3)
            with cols[0]:
                img1_arr = load_as_rgb(saved_paths[0], is_sar=(metas[0].modality == "sar"))
                st.image(img1_arr, caption=f"Image 1: {metas[0].filename} ({metas[0].modality.upper()})", use_container_width=True)
            with cols[1]:
                img2_arr = load_as_rgb(saved_paths[2 if len(saved_paths)>2 else 1], is_sar=(metas[1].modality == "sar"))
                st.image(img2_arr, caption=f"Image 2: {metas[1].filename} ({metas[1].modality.upper()})", use_container_width=True)

            with cols[2]:
                st.markdown("##### 🔬 Evidence Engine Composite")
                if pair_type == "bi_temporal" or mode == "Bi-temporal Change Detection":
                    heatmap, summary = compute_pixel_difference(saved_paths[0], saved_paths[1])
                    st.image(heatmap, caption="Pixel Difference Heatmap (Red=New, Blue=Water/Loss)", use_container_width=True)
                    st.caption(f"Area Changed: **{summary['pct_area_changed']}%** | Brightened: **{summary['pct_brightened_new_structures']}%**")
                else:
                    composite, summary = compute_cross_modal_composite(saved_paths[0], saved_paths[1])
                    st.image(composite, caption="False-Color Composite (RGB=Opt_R, Opt_G, SAR_B)", use_container_width=True)
                    st.caption(f"SAR Unique Features: **{summary['pct_sar_unique_features']}%**")

        st.markdown("---")

        # Query & Execution Section
        st.subheader("💬 Ask SatQuery AI")

        # Example prompt selector
        example_prompts = {
            "Single Image VQA & Captioning": [
                "Provide a detailed scene description using BigEarthNet land cover taxonomy.",
                "Identify all urban structures, vegetation, and water bodies.",
                "Assess the land-use density and natural feature distribution."
            ],
            "Bi-temporal Change Detection": [
                "What major infrastructure or land-cover changes occurred between Image T1 and Image T2?",
                "Identify new construction or land clearing between the two timestamps.",
                "Detect flooded regions or water body expansion between T1 and T2."
            ],
            "Optical + SAR Cross-Modal Fusion": [
                "Analyze the complementary insights from Optical and SAR imagery.",
                "Identify structures or features detected by SAR radar that are obscured in Optical.",
                "Compare surface roughness from SAR with optical color and texture."
            ]
        }

        selected_prompt = st.selectbox("Quick Prompt Suggestions:", ["Custom Query..."] + example_prompts[mode])
        default_query_text = "" if selected_prompt == "Custom Query..." else selected_prompt

        user_query = st.text_area("Enter your remote-sensing query:", value=default_query_text, height=90, placeholder="e.g. Describe the urban expansion and vegetation changes in this pair.")

        if st.button("🚀 Run SatQuery Agent Analysis", type="primary", use_container_width=True):
            if not user_query.strip():
                st.warning("Please enter a query or select a prompt suggestion.")
            else:
                with st.spinner("🤖 SatQuery Agent: Routing task -> Preprocessing evidence -> Querying Gemini VLM..."):
                    start_time = time.time()
                    results = process_satquery(saved_paths, user_query)
                    elapsed = round(time.time() - start_time, 2)

                if results["success"]:
                    st.success(f"Analysis Complete in {elapsed}s!")

                    # Routing Badge
                    st.markdown(f"**Task Classification:** `<span class='badge'>{results['task_type'].upper()}</span>` &nbsp;|&nbsp; **Reasoning:** *{results['reasoning']}*", unsafe_allow_html=True)
                    st.markdown("<br>", unsafe_allow_html=True)

                    # Display Evidence Engine Metrics if present
                    if results.get("evidence_summary"):
                        with st.expander("📊 Deterministic Evidence Engine Metrics", expanded=True):
                            st.json(results["evidence_summary"])

                    # Display VLM Analysis
                    st.markdown("### 📝 SatQuery AI Response")
                    st.markdown(results["response"])

                    # Audit Log
                    with st.expander("🔍 Audit Log & Model Trace"):
                        audit_data = {
                            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                            "model_used": "Gemini 3.6 Flash (google.genai)",
                            "execution_time_seconds": elapsed,
                            "task_type": results["task_type"],
                            "pair_type": results["pair_type"],
                            "target_objects": results.get("target_objects", []),
                            "image_metadata": metas
                        }
                        st.json(audit_data)
                else:
                    st.error(f"Analysis failed: {results.get('error')}")

else:
    st.info("👈 Please upload satellite imagery in the sidebar to begin analysis.")
    st.markdown("""
    ### 🌟 SatQuery AI Capabilities
    - **Single-Image VQA & Captioning:** Detailed land-cover classification based on BigEarthNet taxonomy.
    - **Bi-Temporal Change Analysis:** Quantitative pixel-difference engine with automatic heatmap generation.
    - **Optical + SAR Fusion:** Cross-modal analysis leveraging radar penetration + optical visual resolution.
    - **Agentic Orchestration:** Dynamic task routing, specialist preprocessing, and structured reasoning.
    """)
