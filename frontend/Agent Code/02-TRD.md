# TRD — SatQuery AI Frontend (SIH 26167)
### Technical Requirements & Architecture Constraints — "Client Canvas"

| | |
|---|---|
| **Scope** | Next.js frontend only. Middleware & FastAPI are external systems this doc treats as contracts, not implementation targets. |
| **Status** | Draft v1.0 |

---

## 1. System Architecture

```
┌─────────────────────┐        JSON (chat, layer refs,        ┌───────────────────────┐
│                      │        metadata, small payloads)      │                        │
│   Next.js Frontend   │ ─────────────────────────────────────▶│  Node.js Middleware    │
│   ("Client Canvas")  │◀───────────────────────────────────── │  (Router)              │
│                      │        structured chat response       │                        │
└──────────┬───────────┘                                        └───────────┬────────────┘
           │                                                                 │
           │  direct multipart/stream upload of .tif (500MB+)               │ orchestrates
           │  BYPASSES the Next.js server entirely                          │ model calls,
           ▼                                                                 │ writes results
┌──────────────────────┐        tile URLs / COG refs /                      ▼
│  Python / FastAPI     │        GeoJSON / asset_id            ┌───────────────────────┐
│  (geospatial ingest + │◀─────────────────────────────────────│  Model / Inference     │
│  tiling backend)      │────────────────────────────────────▶ │  layer (opaque to FE)  │
└───────────────────────┘        asset_id, bbox, tile scheme    └───────────────────────┘
```

**Hard rule (per prompt directive):** the frontend never runs heavy geospatial logic
and never proxies the `.tif` bytes through a Next.js API route — Next.js's default
body parser and serverless function memory/time limits make that a guaranteed failure
point at 500MB+. The upload goes **browser → FastAPI**, directly, using the FastAPI
endpoint's own CORS-enabled URL.

## 2. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | Given |
| Map | `react-leaflet` v4 + `leaflet` | Given; mature GeoJSON + tile layer support |
| State | Zustand | Given; no need for Redux ceremony for chat history + asset_id |
| Styling | Tailwind CSS + shadcn/ui | Confirmed direction: clean scientific/lab aesthetic |
| Data fetching (chat) | native `fetch` + a thin API client, or SSE via `EventSource` if middleware streams (open question — PRD §9.2) | Keep dependency-light |
| Large file upload | native `fetch` with a `ReadableStream` body / `XMLHttpRequest` for progress events | `fetch` alone doesn't expose upload progress; XHR does — see §4.3 |
| PDF export | `jspdf` + `html2canvas` (client-side) | No backend PDF service assumed in v1 (PRD FR-17) |
| Icons | `lucide-react` | Pairs with shadcn/ui by convention |

## 3. The Leaflet SSR Problem — Mandatory Handling

Leaflet reads `window`/`document` at **import time**, not just at render time. This
breaks two ways in Next.js if not handled:

1. A plain `import { MapContainer } from 'react-leaflet'` at the top of a Server
   Component (or any file that gets pulled into SSR) crashes the server render.
2. Even inside a Client Component, importing `leaflet`'s CSS/icon assets and
   `L.icon` default marker paths needs to run only in the browser.

**Mandatory pattern:**

```tsx
// components/map/MapCanvas.tsx  — this file is a Client Component boundary
"use client";

import dynamic from "next/dynamic";

// Every react-leaflet primitive that touches the DOM must be dynamically
// imported with ssr:false. We do NOT dynamic-import the whole file's default
// export only — we dynamic-import at the point of use so Next can code-split
// the Leaflet bundle out of the initial server-rendered payload entirely.
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);
// ImageOverlay, if the FastAPI backend returns bounded PNGs instead of tile
// URLs (see PRD open question 9.3) — imported the same way.
const ImageOverlay = dynamic(
  () => import("react-leaflet").then((mod) => mod.ImageOverlay),
  { ssr: false }
);
```

Rules that follow from this:

- `MapCanvas.tsx` itself is wrapped by its **parent** with `next/dynamic({ ssr: false })`
  as well, as a second safety layer — belt and suspenders, because a stray
  server-evaluated import elsewhere in the tree (e.g. a barrel file) can still pull
  Leaflet's core (non-react) package into SSR.
- Leaflet's default marker icon fix (the classic broken-marker-image issue) is done
  inside a `useEffect`, never at module scope, so it only runs client-side:
  ```tsx
  useEffect(() => {
    // deletes the broken default icon URL getter and re-sets paths — must run
    // after L is loaded client-side, not at import time
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({ /* ...cdn icon URLs... */ });
  }, []);
  ```
- Leaflet's CSS (`leaflet/dist/leaflet.css`) is imported once, in the root layout or
  the dynamic map component — never in a file that could be server-evaluated for a
  non-map route, to avoid shipping map CSS to pages that don't need it.
- A `Skeleton`/loading state is passed as the `loading` option to `dynamic()` so the
  left panel doesn't pop/flash on first paint — matches the glassmorphism aesthetic
  (blurred placeholder, not a spinner-on-white-box).

## 4. File Upload — Bypassing Next.js Memory Limits

### 4.1 Constraint
Next.js API routes (and the Node server generally) buffer request bodies in memory by
default unless you go out of your way to stream them, and even then you're adding an
unnecessary hop. A 500MB file through that path risks OOM on serverless targets and is
simply slower. **The frontend must upload directly to the FastAPI origin.**

### 4.2 Required FastAPI contract (frontend's assumption — confirm with backend team)
- `POST {FASTAPI_ORIGIN}/ingest` accepts `multipart/form-data` or a raw stream with
  `Content-Type: application/octet-stream` + filename header.
- CORS headers on the FastAPI service allow the Next.js app's origin.
- Response: `{ asset_id: string, bbox: [minLon, minLat, maxLon, maxLat], status: "processing" | "ready" }`.
- If `status: "processing"`, frontend polls `GET /assets/{asset_id}/status` or the
  middleware relays a completion event — **flagged as an open question**, same class
  as PRD §9.2.

### 4.3 Progress reporting
`fetch()` cannot report upload progress (only download, via `ReadableStream` on the
response). For a 500MB upload with a visible progress bar, use `XMLHttpRequest` with
`upload.onprogress`, wrapped in a small promise-based helper — or, if targeting very
modern browsers only, a `fetch` with a `ReadableStream` request body plus the
[Upload Streams] API, which is less broadly supported. **Default to XHR for
compatibility.**

### 4.4 Client-side guardrails (still not "heavy geospatial logic")
- File-type check by extension AND magic-byte sniff of the first few bytes (`II*\0` /
  `MM\0*` for TIFF) before upload starts — cheap, prevents an obviously-wrong file from
  occupying the upload slot.
- No client-side re-encoding, reprojection, or tiling of the TIFF. Ever.

## 5. State Management (Zustand)

Two stores, kept separate so a chat-history change doesn't re-render map consumers and
vice versa:

```ts
// store/useAssetStore.ts
interface AssetState {
  assetId: string | null;
  bbox: LatLngBoundsLiteral | null;
  activeLayers: {
    optical: boolean;
    sar: boolean;
    aiChangeMask: boolean;
  };
  layerSources: {
    optical?: { type: "tile" | "image"; url: string; bounds?: LatLngBoundsExpression };
    sar?: { type: "tile" | "image"; url: string; bounds?: LatLngBoundsExpression };
    aiChangeMask?: { type: "geojson"; data: GeoJSON.FeatureCollection };
  };
  setAsset: (payload: { assetId: string; bbox: ...; sources: ... }) => void;
  toggleLayer: (layer: keyof AssetState["activeLayers"]) => void;
  setEvidence: (geojson: GeoJSON.FeatureCollection) => void; // called when a chat
    // turn returns spatial evidence — this is the seam between chat and map
}

// store/useChatStore.ts
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  evidenceRef?: string;     // links to a geojson payload set on useAssetStore
  metrics?: AuditRecord;    // see API Contract
  status: "pending" | "complete" | "error";
  createdAt: number;
}
interface ChatState {
  messages: ChatMessage[];
  activeTab: "chat" | "audit";
  isSending: boolean;
  sendMessage: (text: string) => Promise<void>;
  retryMessage: (id: string) => Promise<void>;
  setActiveTab: (tab: "chat" | "audit") => void;
}
```

The **seam** between the two stores is intentional and important: a chat message
doesn't hold the GeoJSON itself, it holds a reference; `useAssetStore.setEvidence()` is
the single function that updates what the map renders. This keeps "what's on the map"
as one source of truth regardless of whether it got there via chat, via a manual layer
toggle, or (later) via a direct asset-browser feature.

## 6. Data Flow — One Query Turn (Sequence)

```
User types question → sendMessage(text)
  1. Optimistically push {role:'user', text, status:'complete'} to messages[]
  2. Push {role:'assistant', status:'pending'} placeholder
  3. POST to Middleware /chat with { text, asset_id, session_id }
  4. Middleware responds (or streams) structured payload:
     { text, evidence?: GeoJSON, audit?: { models: [...], metrics: {...} } }
  5. On receipt:
     - update the pending assistant message → status:'complete', text set
     - if evidence present → useAssetStore.setEvidence(evidence)
       → GeoJSON layer re-renders on map automatically (React state → props)
     - if audit present → stored on that message AND surfaced as "latest" in
       the Audit tab
  6. On error → message status:'error', inline retry button on that bubble
     (US-9) — chat history is never cleared on error
```

## 7. PDF Export Implementation Notes

- `html2canvas` captures the map `div` (react-leaflet renders to a real DOM node, so
  this works) — must be called **after** all tile/geojson layers have painted; naive
  capture can race the network. Use Leaflet's `whenReady` + a short idle wait, or
  capture on-demand only (button click), never automatically.
- Chat transcript and audit metrics are rendered to an off-screen or hidden
  print-styled DOM node (not the live scrollable chat panel) so pagination in the PDF
  doesn't depend on the visible scroll position.
- `jspdf` assembles: page 1 = map snapshot + query context, page 2+ = chat transcript,
  final page = audit metrics table.
- This entire operation is client-side and synchronous-ish (a few seconds for large
  exports) — show a loading state on the Export button itself, don't block the rest of
  the UI.

## 8. Performance Constraints

- Map layer swaps (toggling Optical/SAR/AI Mask) must not re-fetch already-loaded tile
  layers — keep mounted layers in the DOM and toggle opacity/visibility rather than
  mount/unmount, where the layer type allows it (tile layers especially — remounting
  a `TileLayer` re-requests every visible tile).
- GeoJSON layer re-renders should key off a stable identity (e.g., a hash or the
  query turn id) so React doesn't do a full remove/re-add of every feature when
  unrelated state changes.
- Chat panel virtualizes message list only if it becomes a demonstrated problem —
  not built preemptively for v1 (avoid premature complexity per SIH build timeline).

## 9. Environment / Config

```
NEXT_PUBLIC_MIDDLEWARE_URL=https://.../api      # Node.js middleware, JSON chat traffic
NEXT_PUBLIC_FASTAPI_INGEST_URL=https://.../ingest  # Python backend, direct upload target
```
Both must be public (`NEXT_PUBLIC_`) since the upload happens directly from the
browser — there is no server-side secret in the upload path by design.

## 10. Explicitly Deferred (v2+)

- Vector tiling / clustering for very large GeoJSON responses.
- WebSocket-based multi-user session sync.
- Offline asset caching.
- Auth/session persistence beyond a single browser session.
