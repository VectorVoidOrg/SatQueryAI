# PRD — SatQuery AI (SIH 26167)
### Agentic Vision-Language Assistant for Remote-Sensing Imagery

| | |
|---|---|
| **Doc owner** | Frontend Team (Nirbhay, Yash) |
| **Status** | Draft v1.0 — for review |
| **Related docs** | TRD, UX-Flow-Wireframes, Component-Tree, API-Contract |

---

## 1. Problem Statement

Analysts working with multi-band satellite imagery (optical + SAR) currently need to
manually load GeoTIFFs into desktop GIS tools (QGIS, ArcGIS) and hand-craft change-detection
or object-detection pipelines to answer simple analytical questions like *"has this
riverbank eroded since 2022?"* or *"count the new structures in this AOI."*

SatQuery AI removes that friction: a user drops a satellite image (or points at an
existing asset) onto a map, asks a question in plain English, and an agentic backend
orchestrates the right vision-language / geospatial models and returns both an answer
and the spatial evidence (GeoJSON masks/polygons) for it, rendered directly on the map.

This document defines **only the frontend (Client Canvas)**. It does not define model
selection, inference orchestration, or geospatial processing — those live in the
Node.js Middleware and Python/FastAPI services per the architecture in the TRD.

## 2. Goals

- G1: Let a user ingest a large (500MB+) multi-band GeoTIFF without the browser or
  Next.js server ever holding the whole file in memory.
- G2: Let a user visually compare Optical / SAR / AI Change Mask layers over the same
  AOI on one map.
- G3: Let a user ask natural-language questions about the imagery and see the model's
  spatial evidence (polygons, masks) overlaid on the map in the same turn.
- G4: Give the user visibility into *how* the AI arrived at an answer (which models ran,
  confidence/IoU metrics) via an Audit Tab — this is a trust requirement for a
  government/defense-adjacent SIH problem statement, not a nice-to-have.
- G5: Let the user export a session (chat + metrics + current map view) as a shareable
  PDF report.

## 3. Non-Goals (explicitly out of scope for frontend)

- NG1: No geospatial computation (reprojection, band math, IoU calculation) happens
  client-side. The frontend renders what the backend returns.
- NG2: No raw GeoTIFF parsing/rendering in-browser. The Python backend returns
  web-friendly tiles (XYZ/COG-via-tiler) or PNG previews + GeoJSON — never raw
  multi-band TIFF bytes to the map layer.
- NG3: No auth/user-management system design (assume it exists or is stubbed).
- NG4: No offline/PWA support in v1.

## 4. Target User & Context

Primary persona: **a remote-sensing analyst or SIH evaluator**, desktop browser,
1440px+ typical, technical but not necessarily a frontend/GIS-software person — the UI
must read as "scientific instrument," not "developer tool."

## 5. Core User Stories

| ID | Story | Priority |
|---|---|---|
| US-1 | As a user, I can drag a `.tif` file onto an upload zone and see upload progress without the page freezing or erroring on large files. | P0 |
| US-2 | As a user, once an asset is ingested, I can see it rendered on the map as the Optical Basemap layer. | P0 |
| US-3 | As a user, I can toggle between Optical / SAR / AI Change Mask layers via a floating control on the map. | P0 |
| US-4 | As a user, I can type a natural-language question in the chat panel and receive a streamed/structured answer. | P0 |
| US-5 | As a user, when the AI response includes spatial evidence, I see it drawn on the map automatically, scoped to the current asset. | P0 |
| US-6 | As a user, I can open an Audit Tab to see which model(s) the backend used and their metrics (e.g., IoU) for the last query. | P0 |
| US-7 | As a user, I can click "Export Report" to generate a PDF containing the chat transcript, the audit metrics, and a snapshot of the current map view. | P1 |
| US-8 | As a user, I can see clearly when the system is busy (uploading / running inference) vs. idle, per-panel. | P0 |
| US-9 | As a user, I can retry a failed upload or failed query without reloading the page or losing chat history. | P1 |

## 6. Functional Requirements

### 6.1 Geospatial Viewer (Left Panel, 60vw)
- FR-1: Render an interactive Leaflet map filling the left panel.
- FR-2: Support at minimum 3 layer types, togglable independently or mutually exclusive
  (see open question in §9): Optical Basemap, SAR Overlay, AI Change Mask.
- FR-3: Render backend-returned GeoJSON (polygons/points) as a vector overlay layer,
  distinct from the raster layers, always on top.
- FR-4: Floating, non-blocking layer-control widget (glass panel, top-right of map),
  not a traditional Leaflet `L.control.layers` box — must match the visual system.
- FR-5: Map must reflect the `asset_id` currently active in global state — switching
  assets swaps the raster source without a full page reload.
- FR-6: Clicking a rendered GeoJSON feature shows a lightweight popup with whatever
  properties the backend attached (e.g., confidence, area_m2, class).

### 6.2 AI Command Center (Right Panel, 40vw)
- FR-7: Persistent chat thread, newest message at bottom, auto-scroll on new message
  unless user has scrolled up.
- FR-8: Each user message is sent with the current `asset_id` as context.
- FR-9: Assistant messages can contain: plain text, a reference to spatial evidence
  (which triggers a map update), and/or a metrics summary.
- FR-10: Tabs within the right panel: **Chat** (default) and **Audit**. Switching tabs
  does not clear chat state.
- FR-11: Audit Tab shows, per query turn: model(s) invoked, execution time, and metrics
  (IoU, confidence, etc.) as a structured table/list — not free text.
- FR-12: "Export Report" button is always visible (e.g., in the panel header), disabled
  with a tooltip if there is no chat history yet.

### 6.3 Ingestion
- FR-13: Drag-and-drop zone accepts `.tif`/`.tiff`, rejects other types with inline
  error, no alert().
- FR-14: Upload streams directly to the FastAPI endpoint (see TRD §4) with a visible
  progress bar; the Next.js server is never in the data path for the file bytes.
- FR-15: On successful ingestion, the backend returns an `asset_id`; the frontend sets
  this as the active asset and the map auto-navigates to the asset's bounding box.
- FR-16: On failure (network error, backend rejects file), show an inline retry affordance
  scoped to that upload — never a full-page error state.

### 6.4 Export
- FR-17: "Export Report" compiles: full chat transcript, the most recent Audit Tab data,
  and a static image capture of the current map view, into a single PDF, generated
  client-side (see TRD §7 for library choice) — no round-trip to a backend PDF service
  required for v1.

## 7. Success Metrics (qualitative, SIH-context)

- A 500MB `.tif` can be dropped and begins uploading within &lt;1s of drop (progress UI
  appears immediately, doesn't wait for full file read).
- Layer toggling and GeoJSON overlay rendering feel instant (&lt;200ms perceived) since
  they're operating on already-fetched data, not new backend calls.
- A judge/evaluator can, within one query, see both an answer and the evidence for it
  without leaving the screen or interpreting raw JSON.

## 8. Assumptions

- A-1: The Python/FastAPI backend can accept a resumable or at least streamed multipart
  upload directly (CORS-enabled for the frontend origin).
- A-2: The Node.js middleware returns chat responses as structured JSON (not raw LLM
  text) so the frontend can distinguish "text," "evidence," and "metrics" segments
  without parsing prose. See API Contract doc.
- A-3: GeoJSON payload sizes are "reasonable" (tens of features, not tens of thousands)
  for v1 — no vector tiling/clustering strategy is in scope yet.

## 9. Open Questions (flag to backend/PM before build)

1. Are map layers mutually exclusive (radio-style, one raster visible at a time) or
   can Optical + AI Change Mask be shown simultaneously with opacity blending? This
   changes the layer-control UI from radio to checkboxes+opacity sliders.
2. Is chat response delivery streamed (SSE/WebSocket) or single JSON response per turn?
   This materially changes the chat component's state machine (see TRD §5).
3. What is the actual raster delivery format from the Python backend — XYZ tile URL
   template, a single COG URL, or a pre-rendered PNG with bounds? This decides which
   `react-leaflet` layer component wraps it (`TileLayer` vs `ImageOverlay`).

These are called out explicitly rather than assumed, because guessing wrong here means
rewriting the map layer abstraction later.
