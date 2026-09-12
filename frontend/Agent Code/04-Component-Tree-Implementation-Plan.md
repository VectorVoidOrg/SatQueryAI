# Implementation Plan — Component Tree & Build Order
### SatQuery AI Frontend

This is the plan the original prompt asked to pause on before coding. Reproduced here
as a standalone doc so it can be approved independently of the PRD/TRD/UX docs.

---

## 1. Component Tree

```
app/
├── layout.tsx                        # root layout — imports leaflet.css ONCE here
├── page.tsx                          # renders <DashboardShell />
│
components/
├── dashboard/
│   └── DashboardShell.tsx            # "use client" — the 60/40 flex split, top bar
│
├── map/
│   ├── MapCanvasLoader.tsx           # next/dynamic({ssr:false}) wrapper — THE outer boundary
│   ├── MapCanvas.tsx                 # "use client" — actual MapContainer + layers
│   │                                   (inner dynamic imports per TRD §3)
│   ├── LayerControlGlass.tsx         # floating glass panel, toggles + opacity slider
│   ├── EvidenceLayer.tsx             # wraps <GeoJSON>, reads useAssetStore evidence
│   ├── RasterLayer.tsx               # wraps <TileLayer> | <ImageOverlay> based on
│   │                                   layerSources[x].type (TRD §3, open Q 9.3)
│   └── FeaturePopup.tsx              # popup content renderer for clicked GeoJSON features
│
├── ingestion/
│   ├── UploadDropzone.tsx            # drag/drop + click-to-browse, XHR upload (TRD §4)
│   ├── UploadProgress.tsx            # progress bar + filename + cancel
│   └── uploadClient.ts               # non-component: XHR wrapper, magic-byte sniff
│
├── command-center/
│   ├── CommandCenterPanel.tsx        # right panel shell: header, tabs, export button
│   ├── chat/
│   │   ├── ChatThread.tsx            # message list, auto-scroll logic
│   │   ├── ChatMessageBubble.tsx     # renders text/evidence-ref/metrics per message
│   │   ├── ChatInput.tsx             # textarea + send, Enter/Shift+Enter handling
│   │   └── ThinkingIndicator.tsx     # 3-dot pulse
│   └── audit/
│       ├── AuditTab.tsx              # shell for the audit view
│       ├── AuditModelList.tsx        # "models invoked" rows
│       └── AuditMetricsTable.tsx     # IoU/confidence/area table
│
├── export/
│   ├── ExportReportButton.tsx        # orchestrates the 3-step export (TRD §7)
│   └── exportPdf.ts                  # non-component: html2canvas + jsPDF logic
│
├── ui/                                # shadcn/ui primitives (generated, not hand-written)
│   └── (button, switch, tabs, sheet, tooltip, skeleton, ...)
│
store/
├── useAssetStore.ts                  # Zustand — asset_id, bbox, layers, evidence
└── useChatStore.ts                   # Zustand — messages, activeTab, isSending

lib/
├── api/
│   ├── middlewareClient.ts           # POST /chat, typed per API-Contract doc
│   └── ingestClient.ts               # direct-to-FastAPI upload, typed
├── types/
│   ├── chat.ts                       # ChatMessage, AuditRecord types
│   └── geo.ts                        # LayerSource, AssetMeta types
└── config.ts                          # reads NEXT_PUBLIC_* env vars, one place
```

---

## 2. The `react-leaflet` Dynamic Import Strategy (as requested, isolated)

Two-layer defense, per TRD §3:

**Layer 1 — route/page level.** `DashboardShell.tsx` imports the map boundary
component via `next/dynamic` with `ssr: false` and a skeleton `loading` state:

```tsx
// components/dashboard/DashboardShell.tsx
const MapCanvasLoader = dynamic(() => import("../map/MapCanvasLoader"), {
  ssr: false,
  loading: () => <MapSkeleton />,   // blurred placeholder, not a bare spinner
});
```

**Layer 2 — inside the map module itself.** `MapCanvasLoader.tsx` is a thin
`"use client"` file whose only job is to exist as a stable dynamic-import target
(Next.js dynamic imports work more predictably against a named default export in its
own file than against a component defined inline). It renders `MapCanvas.tsx`, and
`MapCanvas.tsx` is where the actual `react-leaflet` primitives get dynamically
imported **individually** (`MapContainer`, `TileLayer`, `GeoJSON`, `ImageOverlay`,
`useMap`), as shown in TRD §3 — not one blanket dynamic import of the whole
`react-leaflet` package, because we need some of its hooks (`useMap`,
`useMapEvents`) called correctly inside already-client-side children, and
over-wrapping makes composition (e.g., `LayerControlGlass` needing `useMap()`)
awkward.

Why both layers: Layer 1 guarantees the map's *route* never attempts SSR at all
(good for perceived load — skeleton renders instantly). Layer 2 guarantees that even
if some future refactor imports `MapCanvas.tsx` from a server-evaluated context by
mistake, Leaflet's DOM-touching code still can't execute during that render.

`leaflet/dist/leaflet.css` is imported exactly once, in `app/layout.tsx` — global CSS
imports are only permitted in the root layout under App Router, and this keeps map
styling from being duplicated or ordered incorrectly by a dynamic import.

---

## 3. Build Order (proposed sequencing for Nirbhay/Yash)

Structured so there's a demoable increment at the end of each phase — useful for SIH
progress checkpoints.

### Phase 1 — Shell & Map (no backend needed, can start immediately)
1. `DashboardShell` with the static 60/40 layout + top bar (hardcoded title/AOI text).
2. `MapCanvasLoader` → `MapCanvas` with just a `TileLayer` pointed at a public OSM tile
   URL (throwaway, replaced in Phase 3) — proves the SSR strategy works end to end.
3. `LayerControlGlass` UI only, toggles wired to local `useState`, not yet to Zustand.
4. **Checkpoint:** map renders, no console errors, no SSR crash on hard refresh.

### Phase 2 — State Layer
5. `useAssetStore` and `useChatStore` per TRD §5, with mock/seed data.
6. Wire `LayerControlGlass` to `useAssetStore.activeLayers` instead of local state.
7. **Checkpoint:** toggling a layer in the control updates Zustand state (visible via
   Redux devtools / Zustand devtools middleware), map doesn't need real layers yet.

### Phase 3 — Ingestion
8. `UploadDropzone` + `uploadClient.ts` against a **stubbed** FastAPI endpoint (can be
   a local Express/FastAPI mock returning a canned `asset_id`/`bbox`) — do not block
   this phase on the real backend being ready.
9. On successful mock upload, confirm `useAssetStore.setAsset()` correctly flies the
   map to the returned bbox.
10. **Checkpoint:** drag a file in, see progress, see map fly to a bbox. This is the
    first true vertical slice.

### Phase 4 — Command Center (Chat)
11. `CommandCenterPanel` shell + `Tabs` (Chat/Audit) using shadcn.
12. `ChatThread`, `ChatMessageBubble`, `ChatInput`, `ThinkingIndicator` — wire to
    `useChatStore.sendMessage()` against a **stubbed** middleware response (structured
    JSON matching the API contract, hardcoded).
13. **Checkpoint:** full mock conversation flow works, including the pending state.

### Phase 5 — The Seam (Evidence on Map)
14. `EvidenceLayer` component + `useAssetStore.setEvidence()`.
15. Update the mocked chat response to include a sample GeoJSON payload; confirm it
    renders as amber polygons and triggers the fit-bounds-if-outside-viewport logic.
16. **Checkpoint:** this is the core product moment — a chat answer visibly draws on
    the map. Good point for a stakeholder demo even with 100% mocked data.

### Phase 6 — Audit Tab
17. `AuditTab`, `AuditModelList`, `AuditMetricsTable` — reads `audit` off the latest
    message per TRD §5/§6.

### Phase 7 — Export
18. `exportPdf.ts` + `ExportReportButton`, per TRD §7.

### Phase 8 — Real Backend Integration
19. Swap `uploadClient.ts` and `middlewareClient.ts` from mocks to real
    `NEXT_PUBLIC_*` endpoints (TRD §9). Because every prior phase was built against a
    typed contract (API-Contract doc) rather than ad hoc mock shapes, this phase
    should be a config change plus error-handling hardening, not a rewrite.
20. Responsive pass (≥1024px stacking, per UX doc §3).
21. Accessibility + `prefers-reduced-motion` pass.

---

## 4. Why Mocks-First

Every phase through Phase 7 is buildable and demoable without the Node middleware or
FastAPI service existing yet, as long as the **API Contract doc is agreed first** —
that's the actual dependency, not the running backend. This matters for a hackathon
timeline (SIH) where frontend and backend teams are working in parallel: the contract
is the interface; mocks satisfy it on the frontend side until Phase 8.

---

## 5. Requesting Approval

This plan intentionally stops short of writing `MapCanvas.tsx` or the chat components
themselves. Confirming before I proceed to code:

- Component tree and file boundaries above (§1) — anything you want split/merged?
- Build order (§3) — matches how you want to split work between Nirbhay and Yash, or
  do you want the phases divided differently (e.g., one owns map+ingestion, the other
  owns command-center+export)?
- Once confirmed, next step is either (a) scaffold the actual repo structure, or
  (b) go straight to coding `MapCanvasLoader.tsx` + `MapCanvas.tsx` as the first real
  files, per Phase 1.
