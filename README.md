# 🛰️ SatQuery AI — Agentic Remote-Sensing Vision-Language Assistant

> **SIH Problem Statement 26167** | Evaluated by ISRO/SAC

---

## Overview

SatQuery AI is an agentic Vision-Language Model (VLM) system for satellite and aerial imagery analysis. It pairs Gemini 3.6 Flash with **deterministic radiometric evidence** and an **auditable agentic pipeline** to provide grounded, verifiable remote-sensing analysis.

Every inference is cross-verified against pixel-level ground truth — no hallucinated coordinates or fabricated geometry.

---

## Architecture

```
User (Image + Query)
  │
  ▼
┌──────────────────────────────────┐
│  FastAPI Backend + Embedded UI   │
│  GET /  → dark-theme HTML        │
│  POST /analyze → JSON            │
└──────────┬───────────────────────┘
           │
  ┌────────▼────────────────────────────────┐
  │         SatQuery Agentic Pipeline       │
  │                                         │
  │  1. Task Routing (keyword + guardrails) │
  │  2. Computational Tools (YOLO, NDWI)   │
  │  3. VLM Inference (Gemini 3.6 Flash)   │
  │  4. Evidence Engine (deterministic)     │
  │  5. Report Generation (HTML + JSON)     │
  └─────────────────────────────────────────┘
```

### Pipeline Stages

| Stage | Module | What it does |
|-------|--------|-------------|
| 1 | `app.py` | Agentic intent classifier: keyword routing + guardrails (identical file, ambiguous intent, cross-modal validation) |
| 2 | `tools/` | Computational tools: YOLOv8n object detection, NDWI water coverage, urban planning risk |
| 3 | `app.py` | Gemini VLM inference via Google GenAI API with domain-adapted prompts |
| 4 | `evidence.py` | Deterministic pixel differencing, change heatmaps, per-channel shared-pooled-range + median centring + MAD threshold |
| 5 | `report.py` | Self-contained HTML reports with embedded overlay, confidence caveat, auditable execution trace |

---

## Key Features

### 🔍 Single-Image VQA & Captioning
- Land-cover classification using BigEarthNet taxonomy
- Infrastructure identification, vegetation analysis, water body detection
- Structured output with visual evidence and confidence scores

### 📊 Bi-Temporal Change Detection
- Deterministic pixel-differencing (no learned model needed)
- Red/Blue change heatmap (Red = new structures, Blue = water/flooding)
- Quantitative metrics: % area changed, brightened, darkened
- Per-channel shared-pooled-range normalization + MAD threshold

### 🛰️ Optical + SAR Cross-Modal Fusion
- False-color composite (RGB = Opt_R, Opt_G, SAR_B)
- SAR complementarity index (features only radar can detect)
- Cloud/shadow penetration analysis

### 🤖 Agentic Orchestration
- Dynamic task routing based on query keywords + modality/timestamp guardrails
- Computational tools: YOLOv8n (CPU), NDWI water index, urban planning risk
- Domain-adapted prompts (BigEarthNet taxonomy, RS sensor specs)

### 📋 Downloadable Audit Reports
- Self-contained HTML with embedded overlay PNG
- Machine-readable JSON format
- Cross-check: VLM answer vs pixel difference

---

## Quick Start

### Prerequisites
- Python 3.10+
- Gemini API key (free tier: [aistudio.google.com](https://aistudio.google.com))

### Setup

```bash
# Clone and install
cd newproj/backend
pip install -r requirements.txt

# Set your API key
echo "GEMINI_API_KEY=your_key_here" > ../.env

# Launch the backend
python run_backend.py
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Usage

1. Open the web UI at `http://localhost:8000`
2. Enter your remote-sensing query
3. Upload 1 image (VQA/captioning) or 2 images (change detection / cross-modal)
4. Set modality and timestamps for each image
5. Click **Analyse**
6. View results: VLM response, visual evidence overlay, confidence, audit trace
7. Download the report as HTML or JSON

---

## Project Structure

```
newproj/
├── README.md
├── backend/
│   ├── app.py                 # FastAPI server + all endpoints
│   ├── common.py              # Image loading, SAR preprocessing, prompt formatting
│   ├── evidence.py            # Deterministic radiometric evidence engine
│   ├── report.py              # Report store + HTML report renderer
│   ├── ui.py                  # Embedded dark-theme HTML frontend
│   ├── run_backend.py         # uvicorn launcher
│   ├── requirements.txt       # Python dependencies
│   └── tools/
│       ├── __init__.py
│       ├── building_detector.py    # YOLOv8n CPU object detection
│       ├── water_coverage.py       # NDWI / RGB water coverage
│       └── urban_planning_risk.py  # Water proximity risk assessment
```

---

## Domain Adaptation

SatQuery AI satisfies the "adapted using RS data" requirement through **RAG-based prompt injection** — not fine-tuning:

- **BigEarthNet Taxonomy**: 5 super-classes, 19+ sub-classes for land cover classification
- **Sensor Specifications**: Cartosat-2S, RISAT-1/2B, Sentinel-2, Landsat-8 specs
- **RS Vocabulary**: NDVI, backscatter, dB scaling, polarization, double-bounce

---

## Stated Limitations

1. **Pixel-space only**: Without CRS metadata, bounding boxes are in pixel coordinates, not WGS84
2. **Radiometric sensitivity**: Seasonal vegetation, solar angle, and clouds can cause false-positive change signals
3. **Free-tier rate limits**: Gemini free tier has request quotas; production use requires paid API
4. **Heuristic confidence**: Gemini does not expose per-token logits, so confidence is a task-adjusted heuristic
5. **Reports are in-memory**: Not persisted across restarts, not authenticated

---

## License

Apache 2.0
