# API Contract — Frontend ⇄ Middleware ⇄ FastAPI
### SatQuery AI — draft, for backend team confirmation

This is the frontend's assumed contract, written so mocks (Implementation Plan §4) are
built against something concrete. Anything marked **(ASSUMED)** must be confirmed or
corrected by the backend team before Phase 8 — flagged the same way as PRD §9.

---

## 1. Ingestion — Frontend → FastAPI (direct, bypasses Node middleware)

### `POST {FASTAPI_ORIGIN}/ingest`

Request: `multipart/form-data`, field name `file`, streamed — not buffered client-side.

Response `200`:
```json
{
  "asset_id": "ast_8f2c1a",
  "status": "ready",
  "bbox": [88.021, 21.678, 88.412, 21.983],
  "layers": {
    "optical": { "type": "tile", "url_template": "https://.../tiles/ast_8f2c1a/optical/{z}/{x}/{y}.png" },
    "sar":     { "type": "tile", "url_template": "https://.../tiles/ast_8f2c1a/sar/{z}/{x}/{y}.png" }
  }
}
```
**(ASSUMED)** `status` may instead come back `"processing"` for large files, requiring
a poll — see §1.1. **(ASSUMED)** raster delivery is XYZ tiles rather than a single COG
URL or bounded PNG (PRD open question 9.3) — `layers[x].type` is designed to
accommodate `"tile" | "image"` either way so the frontend's `RasterLayer` component
doesn't need to change if this differs.

Response `4xx/5xx`:
```json
{ "error": { "code": "INVALID_FILE_TYPE" | "FILE_TOO_LARGE" | "PROCESSING_FAILED", "message": "human-readable string" } }
```

### 1.1 Status polling **(ASSUMED, only if async ingestion)**

`GET {FASTAPI_ORIGIN}/assets/{asset_id}/status`
```json
{ "status": "processing" | "ready" | "failed", "progress": 0.62 }
```
Frontend polls every 2s while `"processing"`, same UI state as upload (progress bar
continues, now representing processing rather than transfer).

---

## 2. Chat — Frontend → Node Middleware

### `POST {MIDDLEWARE_URL}/chat`

Request:
```json
{
  "session_id": "sess_abc123",
  "asset_id": "ast_8f2c1a",
  "message": "Has this riverbank eroded since last quarter?",
  "map_context": {
    "visible_bounds": [88.05, 21.70, 88.30, 21.90],
    "active_layers": ["optical", "sar"]
  }
}
```
`map_context` is included because the agentic backend may want to scope analysis to
what's currently visible rather than the whole asset — **(ASSUMED)** this is useful to
the backend; if not needed, frontend omits it without any component changes since it's
assembled from Zustand state at call time, not hardcoded into the UI.

Response `200` (single JSON — see §2.1 for the streaming alternative):
```json
{
  "message_id": "msg_9d21",
  "text": "Yes — 3 segments show more than 2m of retreat, highlighted in amber on the map.",
  "evidence": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Polygon", "coordinates": [ [[88.10,21.75], [88.11,21.75], [88.11,21.76], [88.10,21.76], [88.10,21.75]] ] },
        "properties": { "class": "erosion", "confidence": 0.87, "area_m2": 4230 }
      }
    ]
  },
  "audit": {
    "models": [
      { "name": "SAR-ChangeNet", "version": "v2", "duration_ms": 142 },
      { "name": "VLM-Reasoner", "version": "base", "duration_ms": 890 }
    ],
    "metrics": {
      "iou": 0.81,
      "confidence": 0.87,
      "area_affected_m2": 4230
    }
  }
}
```
`evidence` and `audit` are both **optional** — a purely conversational answer (e.g.
"what layers are currently loaded?") returns `text` only. `ChatMessageBubble` and
`useAssetStore.setEvidence()` both treat absence as "no map update this turn," never
as an error.

Response `4xx/5xx`:
```json
{ "error": { "code": "MODEL_TIMEOUT" | "INVALID_ASSET" | "INTERNAL_ERROR", "message": "..." } }
```

### 2.1 Streaming alternative **(OPEN QUESTION — PRD §9.2)**

If the middleware streams via SSE instead of returning single JSON, the *shape* above
is unchanged but delivered incrementally, e.g.:
```
event: text_delta
data: {"delta": "Yes — 3 segments show"}

event: evidence
data: { ...FeatureCollection... }

event: audit
data: { ...audit object... }

event: done
data: {}
```
Frontend impact if this is the actual mechanism: `useChatStore.sendMessage()` becomes
an `EventSource`/fetch-stream consumer instead of a single `await fetch()` — isolated
to that one function per TRD §5, no component changes required either way, since
components only ever read from the Zustand store, not from the network call directly.
**This must be confirmed before Phase 8**, though Phases 1–7 can mock either shape
trivially.

---

## 3. Shared TypeScript Types (frontend source of truth)

```ts
// lib/types/geo.ts
export interface LayerSource {
  type: "tile" | "image";
  url: string;                          // tile template or single image URL
  bounds?: [number, number, number, number]; // required if type === "image"
}

export interface AssetIngestResponse {
  asset_id: string;
  status: "ready" | "processing" | "failed";
  bbox: [number, number, number, number];
  layers?: { optical?: LayerSource; sar?: LayerSource };
}

// lib/types/chat.ts
export interface AuditModelRecord {
  name: string;
  version: string;
  duration_ms: number;
}

export interface AuditRecord {
  models: AuditModelRecord[];
  metrics: Record<string, number>;      // deliberately open — IoU/confidence/area
                                         // today, other metrics later, without a
                                         // type change
}

export interface ChatResponse {
  message_id: string;
  text: string;
  evidence?: GeoJSON.FeatureCollection;
  audit?: AuditRecord;
}
```

---

## 4. Confirmation Checklist for Backend Team

- [ ] Confirm ingestion is synchronous (`status: "ready"` immediately) or async
      (requires polling, §1.1).
- [ ] Confirm raster delivery mechanism: XYZ tile template vs. single COG URL vs.
      bounded PNG (affects `LayerSource.type`).
- [ ] Confirm chat delivery: single JSON response vs. SSE stream (§2.1).
- [ ] Confirm CORS is enabled on the FastAPI origin for the Next.js app's domain(s),
      including for large multipart uploads specifically (some CORS/proxy configs cap
      body size independently of the app logic).
- [ ] Confirm `audit.metrics` keys are stable enough for `AuditMetricsTable` to label
      them meaningfully (e.g., is it always `iou`/`confidence`/`area_affected_m2`, or
      does the key set vary by query type?).
